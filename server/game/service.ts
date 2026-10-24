import type { Response } from 'express';
import type { Game, Settings } from '@prisma/client';
import { prisma } from '../db';
import { DEFAULT_WORDS } from '../words/defaultWords';
import type { GameAction, GameState } from '../../shared/types';
import { applyAction, type EngineState, initialState, normalize, withDuration } from './engine';

// ---------- live subscribers (Server-Sent Events) ----------

const subscribers = new Map<string, Set<Response>>();
const expiryTimers = new Map<string, NodeJS.Timeout>();

export function subscribe(ownerId: string, res: Response): () => void {
  let set = subscribers.get(ownerId);
  if (!set) subscribers.set(ownerId, (set = new Set()));
  set.add(res);
  return () => {
    set!.delete(res);
    if (set!.size === 0) subscribers.delete(ownerId);
  };
}

export function sendEvent(res: Response, state: GameState): void {
  res.write(`event: state\ndata: ${JSON.stringify(state)}\n\n`);
}

function broadcast(ownerId: string, state: GameState): void {
  for (const res of subscribers.get(ownerId) ?? []) sendEvent(res, state);
}

// ---------- per-organizer lock so rapid clicks are applied one at a time ----------

const locks = new Map<string, Promise<unknown>>();

function withLock<T>(key: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(key) ?? Promise.resolve();
  const run = prev.catch(() => undefined).then(fn);
  locks.set(key, run);
  void run.finally(() => {
    if (locks.get(key) === run) locks.delete(key);
  }).catch(() => undefined);
  return run;
}

// ---------- persistence helpers ----------

export async function getSettings(ownerId: string): Promise<Settings> {
  return prisma.settings.upsert({ where: { userId: ownerId }, update: {}, create: { userId: ownerId } });
}

async function activeWords(settings: Settings): Promise<readonly string[]> {
  if (!settings.activeWordListId) return DEFAULT_WORDS;
  const list = await prisma.wordList.findFirst({
    where: { id: settings.activeWordListId, ownerId: settings.userId },
  });
  return list && list.words.length > 0 ? list.words : DEFAULT_WORDS;
}

function toEngine(game: Game): EngineState {
  return {
    status: game.status,
    durationMs: game.durationMs,
    remainingMs: game.remainingMs,
    endsAt: game.endsAt ? game.endsAt.getTime() : null,
    currentWord: game.currentWord,
    round: game.round,
    recentWords: game.recentWords,
  };
}

function fromEngine(s: EngineState) {
  return {
    status: s.status,
    durationMs: s.durationMs,
    remainingMs: s.remainingMs,
    endsAt: s.endsAt != null ? new Date(s.endsAt) : null,
    currentWord: s.currentWord,
    round: s.round,
    recentWords: s.recentWords,
  };
}

function toPublic(game: Game, settings: Settings): GameState {
  return {
    status: game.status,
    durationMs: game.durationMs,
    remainingMs: game.remainingMs,
    endsAt: game.endsAt ? game.endsAt.getTime() : null,
    currentWord: game.currentWord,
    round: game.round,
    version: game.version,
    serverNow: Date.now(),
    eventName: settings.eventName,
  };
}

async function save(ownerId: string, next: EngineState): Promise<Game> {
  return prisma.game.update({
    where: { ownerId },
    data: { ...fromEngine(next), version: { increment: 1 } },
  });
}

async function loadGame(ownerId: string, settings: Settings): Promise<Game> {
  const existing = await prisma.game.findUnique({ where: { ownerId } });
  if (existing) return existing;
  const init = initialState(settings.durationSec * 1000);
  return prisma.game.upsert({
    where: { ownerId },
    update: {},
    create: { ownerId, ...fromEngine(init) },
  });
}

/** Loads the game, ending it first if its time ran out (e.g. while the server was asleep). */
async function loadNormalized(ownerId: string): Promise<{ game: Game; settings: Settings }> {
  const settings = await getSettings(ownerId);
  let game = await loadGame(ownerId, settings);
  const state = toEngine(game);
  const normalized = normalize(state, Date.now());
  if (normalized !== state) game = await save(ownerId, normalized);
  return { game, settings };
}

function scheduleExpiry(ownerId: string, game: Game): void {
  const existing = expiryTimers.get(ownerId);
  if (existing) clearTimeout(existing);
  expiryTimers.delete(ownerId);
  if (game.status !== 'RUNNING' || !game.endsAt) return;
  const delay = Math.max(0, game.endsAt.getTime() - Date.now()) + 25;
  const timer = setTimeout(() => {
    expiryTimers.delete(ownerId);
    void withLock(ownerId, async () => {
      const { game: g, settings } = await loadNormalized(ownerId);
      broadcast(ownerId, toPublic(g, settings));
    }).catch((err) => console.error('Failed to end game on timeout', err));
  }, delay);
  timer.unref?.();
  expiryTimers.set(ownerId, timer);
}

// ---------- public API ----------

export function getSnapshot(ownerId: string): Promise<GameState> {
  return withLock(ownerId, async () => {
    const { game, settings } = await loadNormalized(ownerId);
    scheduleExpiry(ownerId, game);
    return toPublic(game, settings);
  });
}

export function performAction(ownerId: string, action: GameAction): Promise<GameState> {
  return withLock(ownerId, async () => {
    const { game, settings } = await loadNormalized(ownerId);
    const words = await activeWords(settings);
    const next = applyAction(toEngine(game), action, {
      now: Date.now(),
      words,
      avoidRecent: settings.avoidRecent,
    });
    const saved = await save(ownerId, next);
    scheduleExpiry(ownerId, saved);
    const state = toPublic(saved, settings);
    broadcast(ownerId, state);
    return state;
  });
}

/** Called after settings change so durations and display options reach every screen. */
export function applySettings(ownerId: string): Promise<GameState> {
  return withLock(ownerId, async () => {
    const { game, settings } = await loadNormalized(ownerId);
    const durationMs = settings.durationSec * 1000;
    let saved = game;
    if (game.durationMs !== durationMs) {
      saved = await save(ownerId, withDuration(toEngine(game), durationMs));
    } else {
      saved = await prisma.game.update({ where: { ownerId }, data: { version: { increment: 1 } } });
    }
    const state = toPublic(saved, settings);
    broadcast(ownerId, state);
    return state;
  });
}

export function closeAllStreams(): void {
  for (const timer of expiryTimers.values()) clearTimeout(timer);
  expiryTimers.clear();
  for (const set of subscribers.values()) for (const res of set) res.end();
  subscribers.clear();
}
