import { useCallback, useEffect, useRef, useState } from 'react';
import type { GameAction, GameState } from '../../shared/types';
import { remainingAt } from '../../shared/timer';
import { api } from './api';

export type Connection = 'connecting' | 'live' | 'reconnecting';

/**
 * Subscribes to the organizer's game over Server-Sent Events. The server owns the timer
 * (it stores the end time), so every screen shows the same countdown even after reloads.
 */
export function useGame() {
  const [state, setState] = useState<GameState | null>(null);
  const [connection, setConnection] = useState<Connection>('connecting');
  const [error, setError] = useState<string | null>(null);
  const offsetRef = useRef(0); // serverClock - localClock
  const versionRef = useRef(-1);

  const accept = useCallback((next: GameState) => {
    if (next.version < versionRef.current) return; // ignore stale snapshots
    versionRef.current = next.version;
    offsetRef.current = next.serverNow - Date.now();
    setState(next);
  }, []);

  useEffect(() => {
    const source = new EventSource('/api/game/stream');
    source.addEventListener('state', (e) => {
      setConnection('live');
      setError(null);
      accept(JSON.parse((e as MessageEvent).data) as GameState);
    });
    source.onerror = () => {
      setConnection('reconnecting');
      // EventSource retries on its own; a 401/403 closes it, so fall back to polling once.
      if (source.readyState === EventSource.CLOSED) {
        api
          .get<{ state: GameState }>('/api/game')
          .then(({ state }) => accept(state))
          .catch((err) => setError(err.message));
      }
    };
    return () => source.close();
  }, [accept]);

  const act = useCallback(
    async (action: GameAction) => {
      try {
        const { state } = await api.post<{ state: GameState }>('/api/game/action', { action });
        accept(state);
        setError(null);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Action failed');
        return false;
      }
    },
    [accept],
  );

  return { state, connection, error, setError, act, accept, offsetRef };
}

/** Remaining milliseconds, re-rendered ~10× a second while the countdown runs. */
export function useRemaining(state: GameState | null, offsetRef: { current: number }): number {
  const [, setTick] = useState(0);
  const running = state?.status === 'RUNNING';
  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setTick((t) => t + 1), 100);
    return () => window.clearInterval(id);
  }, [running]);
  if (!state) return 0;
  return remainingAt(state, Date.now() + offsetRef.current);
}

/** Status shown on screen; flips to OVER locally the moment the countdown reaches zero. */
export function effectiveStatus(state: GameState | null, remaining: number) {
  if (!state) return null;
  if (state.status === 'RUNNING' && remaining <= 0) return 'OVER' as const;
  return state.status;
}
