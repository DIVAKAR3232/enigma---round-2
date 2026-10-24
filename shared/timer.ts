import type { GameStatus } from './types';

interface TimerFields {
  status: GameStatus;
  remainingMs: number;
  endsAt: number | null;
}

/** Remaining countdown time at `now` (epoch ms on the server clock). */
export function remainingAt(state: TimerFields, now: number): number {
  if (state.status === 'OVER') return 0;
  if (state.status === 'RUNNING' && state.endsAt != null) return Math.max(0, state.endsAt - now);
  return Math.max(0, state.remainingMs);
}

/** m:ss, rounding up so the display shows 0:00 only when time is really up. */
export function formatTime(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}
