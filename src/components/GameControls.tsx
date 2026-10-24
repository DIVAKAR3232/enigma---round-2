import { useCallback, useEffect, useState } from 'react';
import type { GameAction, GameStatus } from '../../shared/types';
import { Button, ConfirmDialog } from './ui';

interface GameControlsProps {
  status: GameStatus;
  onAction: (action: GameAction) => Promise<boolean>;
  size?: 'lg' | 'xl';
  /** Organizer Mode adds NEXT WORD; the projector never shows it. */
  showNextWord?: boolean;
  className?: string;
}

/** START / PAUSE / RESUME / RESTART (+ NEXT WORD for organizers). Buttons that don't apply are disabled. */
export function GameControls({ status, onAction, size = 'lg', showNextWord = false, className = '' }: GameControlsProps) {
  const [busy, setBusy] = useState(false);
  const [confirmRestart, setConfirmRestart] = useState(false);

  const run = useCallback(
    async (action: GameAction) => {
      setBusy(true);
      try {
        await onAction(action);
      } finally {
        setBusy(false);
      }
    },
    [onAction],
  );

  const inProgress = status === 'RUNNING' || status === 'PAUSED';
  const restart = () => (inProgress ? setConfirmRestart(true) : void run('restart'));

  return (
    <div className={className}>
      <div className={`grid gap-3 ${showNextWord ? 'grid-cols-2 sm:grid-cols-5' : 'grid-cols-2 sm:grid-cols-4'}`}>
        <Button size={size} tone="green" disabled={busy || status !== 'READY'} onClick={() => run('start')}>
          START
        </Button>
        <Button size={size} tone="yellow" disabled={busy || status !== 'RUNNING'} onClick={() => run('pause')}>
          PAUSE
        </Button>
        <Button size={size} tone="cyan" disabled={busy || status !== 'PAUSED'} onClick={() => run('resume')}>
          RESUME
        </Button>
        <Button size={size} tone="red" disabled={busy || status === 'READY'} onClick={restart}>
          RESTART
        </Button>
        {showNextWord && (
          <Button
            size={size}
            tone="pink"
            className="col-span-2 sm:col-span-1"
            disabled={busy || !inProgress}
            onClick={() => run('next-word')}
          >
            NEXT WORD
          </Button>
        )}
      </div>
      <ConfirmDialog
        open={confirmRestart}
        title="Restart this game?"
        message="The timer goes back to the full duration and a new word is shown, starting immediately."
        confirmLabel="RESTART"
        onCancel={() => setConfirmRestart(false)}
        onConfirm={() => {
          setConfirmRestart(false);
          void run('restart');
        }}
      />
    </div>
  );
}

/** Primary action for the space bar: start, pause or resume depending on state. */
export function primaryAction(status: GameStatus): GameAction | null {
  if (status === 'READY') return 'start';
  if (status === 'RUNNING') return 'pause';
  if (status === 'PAUSED') return 'resume';
  return null;
}

export function useFullscreen() {
  const [isFullscreen, setIsFullscreen] = useState(() => Boolean(document.fullscreenElement));
  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);
  const toggle = useCallback(async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen({ navigationUI: 'hide' });
    } catch {
      /* Browser refused (e.g. not triggered by a user gesture); nothing else to do. */
    }
  }, []);
  return { isFullscreen, toggle, supported: Boolean(document.fullscreenEnabled) };
}

/** Keyboard shortcuts, ignored while typing in a form field or when a dialog is open. */
export function useHotkeys(map: Record<string, () => void>) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.repeat) return;
      const target = e.target as HTMLElement | null;
      if (target && (/^(INPUT|TEXTAREA|SELECT|BUTTON)$/.test(target.tagName) || target.isContentEditable)) return;
      if (document.querySelector('dialog[open]')) return;
      const key = e.key === ' ' ? 'Space' : e.key.length === 1 ? e.key.toLowerCase() : e.key;
      const fn = map[key];
      if (fn) {
        e.preventDefault();
        fn();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [map]);
}
