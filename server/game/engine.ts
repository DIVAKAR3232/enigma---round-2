import type { GameAction, GameStatus } from '../../shared/types';

/** Pure game state machine. No I/O, so it is easy to test and reason about. */
export interface EngineState {
  status: GameStatus;
  durationMs: number;
  remainingMs: number;
  endsAt: number | null;
  currentWord: string | null;
  round: number;
  recentWords: string[];
}

export interface EngineContext {
  now: number;
  words: readonly string[];
  avoidRecent: number;
  random?: () => number;
}

export class GameActionError extends Error {
  constructor(
    message: string,
    public readonly status = 409,
  ) {
    super(message);
  }
}

const RECENT_CAP = 1000;

export function initialState(durationMs: number): EngineState {
  return {
    status: 'READY',
    durationMs,
    remainingMs: durationMs,
    endsAt: null,
    currentWord: null,
    round: 0,
    recentWords: [],
  };
}

/** Turns a RUNNING game whose time has passed into OVER. */
export function normalize(state: EngineState, now: number): EngineState {
  if (state.status === 'RUNNING' && state.endsAt != null && state.endsAt <= now) {
    return { ...state, status: 'OVER', remainingMs: 0, endsAt: null };
  }
  return state;
}

/**
 * Picks a random word, skipping the most recently shown ones where possible.
 * `recent` is ordered oldest first.
 */
export function pickWord(
  words: readonly string[],
  recent: readonly string[],
  avoidRecent: number,
  random: () => number = Math.random,
): { word: string; recent: string[] } {
  if (words.length === 0) throw new GameActionError('The active word list is empty.', 400);
  const window = Math.max(0, Math.min(avoidRecent, words.length - 1));
  let pool: readonly string[] = words;
  if (window > 0) {
    const blocked = new Set(recent.slice(-window));
    const filtered = words.filter((w) => !blocked.has(w));
    if (filtered.length > 0) pool = filtered;
  }
  const index = Math.min(pool.length - 1, Math.floor(random() * pool.length));
  const word = pool[index];
  const nextRecent = [...recent.filter((w) => w !== word), word].slice(-RECENT_CAP);
  return { word, recent: nextRecent };
}

function invalid(action: GameAction, status: GameStatus): never {
  const label = action.toUpperCase().replace('-', ' ');
  throw new GameActionError(`${label} is not available while the game is ${status}.`);
}

export function applyAction(state: EngineState, action: GameAction, ctx: EngineContext): EngineState {
  const s = normalize(state, ctx.now);
  const random = ctx.random ?? Math.random;

  switch (action) {
    case 'start': {
      if (s.status !== 'READY') invalid(action, s.status);
      const { word, recent } = pickWord(ctx.words, s.recentWords, ctx.avoidRecent, random);
      return {
        ...s,
        status: 'RUNNING',
        remainingMs: s.durationMs,
        endsAt: ctx.now + s.durationMs,
        currentWord: word,
        round: 1,
        recentWords: recent,
      };
    }
    case 'pause': {
      if (s.status !== 'RUNNING' || s.endsAt == null) invalid(action, s.status);
      return { ...s, status: 'PAUSED', remainingMs: Math.max(0, s.endsAt - ctx.now), endsAt: null };
    }
    case 'resume': {
      if (s.status !== 'PAUSED') invalid(action, s.status);
      return { ...s, status: 'RUNNING', endsAt: ctx.now + s.remainingMs };
    }
    case 'restart': {
      const { word, recent } = pickWord(ctx.words, s.recentWords, ctx.avoidRecent, random);
      return {
        ...s,
        status: 'RUNNING',
        remainingMs: s.durationMs,
        endsAt: ctx.now + s.durationMs,
        currentWord: word,
        round: 1,
        recentWords: recent,
      };
    }
    case 'next-word': {
      if (s.status !== 'RUNNING' && s.status !== 'PAUSED') invalid(action, s.status);
      const { word, recent } = pickWord(ctx.words, s.recentWords, ctx.avoidRecent, random);
      return { ...s, currentWord: word, round: s.round + 1, recentWords: recent };
    }
    case 'reset': {
      return {
        ...s,
        status: 'READY',
        remainingMs: s.durationMs,
        endsAt: null,
        currentWord: null,
        round: 0,
      };
    }
  }
}

/** New duration applies right away when READY; otherwise on the next RESTART or RESET. */
export function withDuration(state: EngineState, durationMs: number): EngineState {
  if (state.status === 'READY') return { ...state, durationMs, remainingMs: durationMs };
  return { ...state, durationMs };
}
