export type GameStatus = 'READY' | 'RUNNING' | 'PAUSED' | 'OVER';

export const GAME_ACTIONS = ['start', 'pause', 'resume', 'restart', 'next-word', 'reset'] as const;
export type GameAction = (typeof GAME_ACTIONS)[number];

/** What every screen (organizer, projector, player) receives. Never contains upcoming words. */
export interface GameState {
  status: GameStatus;
  durationMs: number;
  /** Remaining time while READY or PAUSED. While RUNNING use endsAt. */
  remainingMs: number;
  /** Epoch ms (server clock) when the countdown hits zero; only set while RUNNING. */
  endsAt: number | null;
  currentWord: string | null;
  round: number;
  version: number;
  /** Server clock at the moment this snapshot was made, used to correct client clock drift. */
  serverNow: number;
  eventName: string;
}

export type Role = 'ORGANIZER' | 'PLAYER';

export interface PublicUser {
  id: string;
  username: string;
  role: Role;
  displayName: string | null;
  mustChangePassword: boolean;
}

export interface SettingsDto {
  eventName: string;
  durationSec: number;
  activeWordListId: string | null;
  avoidRecent: number;
}

export interface WordListSummary {
  id: string | null;
  name: string;
  count: number;
  builtIn: boolean;
  createdAt: string | null;
}

export interface GeneratedCredential {
  id: string;
  username: string;
  password: string;
}
