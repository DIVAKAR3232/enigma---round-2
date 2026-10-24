import { describe, expect, it } from 'vitest';
import { applyAction, GameActionError, initialState, normalize, pickWord, withDuration } from '../server/game/engine';

const WORDS = ['APPLE', 'BRAIN', 'CHAIR', 'DREAM', 'EAGLE'];
const ctx = (now: number, extra: Partial<{ avoidRecent: number; random: () => number; words: string[] }> = {}) => ({
  now,
  words: WORDS,
  avoidRecent: 100,
  ...extra,
});

describe('game engine', () => {
  it('starts in READY with no word and full time', () => {
    const s = initialState(60_000);
    expect(s).toMatchObject({ status: 'READY', remainingMs: 60_000, currentWord: null, round: 0, endsAt: null });
  });

  it('START picks a word, sets round 1 and an end time', () => {
    const s = applyAction(initialState(60_000), 'start', ctx(1_000));
    expect(s.status).toBe('RUNNING');
    expect(s.round).toBe(1);
    expect(WORDS).toContain(s.currentWord);
    expect(s.endsAt).toBe(61_000);
  });

  it('PAUSE freezes the remaining time and RESUME continues from it', () => {
    let s = applyAction(initialState(60_000), 'start', ctx(0));
    s = applyAction(s, 'pause', ctx(15_000));
    expect(s).toMatchObject({ status: 'PAUSED', remainingMs: 45_000, endsAt: null });
    // Time passing while paused changes nothing.
    expect(normalize(s, 999_999)).toBe(s);
    s = applyAction(s, 'resume', ctx(100_000));
    expect(s).toMatchObject({ status: 'RUNNING', endsAt: 145_000 });
  });

  it('becomes OVER once the end time passes', () => {
    const s = applyAction(initialState(10_000), 'start', ctx(0));
    expect(normalize(s, 9_999).status).toBe('RUNNING');
    expect(normalize(s, 10_000)).toMatchObject({ status: 'OVER', remainingMs: 0, endsAt: null });
  });

  it('NEXT WORD changes the word and increments the round, keeping the timer', () => {
    let s = applyAction(initialState(60_000), 'start', ctx(0, { random: () => 0 }));
    const first = s.currentWord;
    s = applyAction(s, 'next-word', ctx(5_000, { random: () => 0 }));
    expect(s.currentWord).not.toBe(first);
    expect(s.round).toBe(2);
    expect(s.endsAt).toBe(60_000);
  });

  it('NEXT WORD also works while paused but not when READY or OVER', () => {
    let s = applyAction(initialState(60_000), 'start', ctx(0));
    s = applyAction(s, 'pause', ctx(1_000));
    expect(applyAction(s, 'next-word', ctx(2_000)).round).toBe(2);
    expect(() => applyAction(initialState(60_000), 'next-word', ctx(0))).toThrow(GameActionError);
    const over = applyAction(initialState(1_000), 'start', ctx(0));
    expect(() => applyAction(over, 'next-word', ctx(5_000))).toThrow(/GAME|OVER/);
  });

  it('rejects actions that do not apply to the current status', () => {
    const ready = initialState(60_000);
    expect(() => applyAction(ready, 'pause', ctx(0))).toThrow(GameActionError);
    expect(() => applyAction(ready, 'resume', ctx(0))).toThrow(GameActionError);
    const running = applyAction(ready, 'start', ctx(0));
    expect(() => applyAction(running, 'start', ctx(1))).toThrow(GameActionError);
    expect(() => applyAction(running, 'resume', ctx(1))).toThrow(GameActionError);
  });

  it('RESTART resets the timer and round and starts immediately', () => {
    let s = applyAction(initialState(60_000), 'start', ctx(0));
    s = applyAction(s, 'next-word', ctx(1_000));
    s = applyAction(s, 'next-word', ctx(2_000));
    s = applyAction(s, 'restart', ctx(30_000));
    expect(s).toMatchObject({ status: 'RUNNING', round: 1, endsAt: 90_000, remainingMs: 60_000 });
  });

  it('RESTART works from GAME OVER for the next participant', () => {
    const over = applyAction(initialState(1_000), 'start', ctx(0));
    const s = applyAction(over, 'restart', ctx(10_000));
    expect(s).toMatchObject({ status: 'RUNNING', endsAt: 11_000 });
  });

  it('RESET returns to READY and hides the word, keeping word history', () => {
    let s = applyAction(initialState(60_000), 'start', ctx(0));
    s = applyAction(s, 'reset', ctx(5_000));
    expect(s).toMatchObject({ status: 'READY', currentWord: null, round: 0, remainingMs: 60_000, endsAt: null });
    expect(s.recentWords.length).toBe(1);
  });

  it('a new duration applies immediately only when READY', () => {
    expect(withDuration(initialState(60_000), 30_000)).toMatchObject({ durationMs: 30_000, remainingMs: 30_000 });
    const running = applyAction(initialState(60_000), 'start', ctx(0));
    const changed = withDuration(running, 30_000);
    expect(changed.endsAt).toBe(60_000);
    expect(applyAction(changed, 'restart', ctx(0)).endsAt).toBe(30_000);
  });
});

describe('pickWord', () => {
  it('never repeats a word until the list is exhausted', () => {
    let recent: string[] = [];
    const seen = new Set<string>();
    for (let i = 0; i < WORDS.length; i++) {
      const r = pickWord(WORDS, recent, 100);
      expect(seen.has(r.word)).toBe(false);
      seen.add(r.word);
      recent = r.recent;
    }
    expect(seen.size).toBe(WORDS.length);
    // After exhausting, it still avoids the most recent words it can.
    const next = pickWord(WORDS, recent, 100);
    expect(next.word).toBe(recent[0]);
  });

  it('with avoidRecent 0 any word may come up', () => {
    const r = pickWord(WORDS, ['APPLE'], 0, () => 0);
    expect(r.word).toBe('APPLE');
  });

  it('works with a single-word list', () => {
    expect(pickWord(['SOLAR'], ['SOLAR'], 100).word).toBe('SOLAR');
  });

  it('throws on an empty list', () => {
    expect(() => pickWord([], [], 10)).toThrow(GameActionError);
  });
});
