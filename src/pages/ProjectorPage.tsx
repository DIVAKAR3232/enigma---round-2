import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { effectiveStatus, useGame, useRemaining } from '../lib/useGame';
import { GameStage } from '../components/GameStage';
import { GameControls, primaryAction, useFullscreen, useHotkeys } from '../components/GameControls';
import { Button } from '../components/ui';
import { ConnectionNotice, LoadingScreen } from '../components/ScreenBits';

/**
 * Clean, full-screen display for the projector. Shows START/PAUSE/RESUME/RESTART only;
 * NEXT WORD and admin tools stay in Organizer Mode.
 */
export default function ProjectorPage() {
  const { state, connection, error, setError, act, offsetRef } = useGame();
  const remaining = useRemaining(state, offsetRef);
  const status = effectiveStatus(state, remaining);
  const [controlsHidden, setControlsHidden] = useState(false);
  const fullscreen = useFullscreen();
  const navigate = useNavigate();

  const exit = () => {
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    // Opened from Organizer Mode as its own window: just close it.
    if (window.opener && window.name === 'kbc-projector') window.close();
    else navigate('/dashboard');
  };

  const hotkeys = useMemo(
    () => ({
      Space: () => {
        const a = status && primaryAction(status);
        if (a) void act(a);
      },
      f: () => void fullscreen.toggle(),
      h: () => setControlsHidden((v) => !v),
    }),
    [status, act, fullscreen],
  );
  useHotkeys(hotkeys);

  if (!state || !status) return <LoadingScreen error={error} />;

  return (
    <div className="fixed inset-0 flex flex-col overflow-hidden bg-ink">
      <div className="relative min-h-0 flex-1">
        <GameStage state={state} status={status} remaining={remaining} />
        <ConnectionNotice connection={connection} />
        {error && (
          <button
            type="button"
            onClick={() => setError(null)}
            className="absolute left-1/2 top-3 -translate-x-1/2 rounded-lg border border-neon-red bg-ink/90 px-4 py-2 text-sm text-red-200"
          >
            {error} ✕
          </button>
        )}
      </div>

      {controlsHidden ? (
        <button
          type="button"
          onClick={() => setControlsHidden(false)}
          className="absolute bottom-2 right-2 z-10 rounded-md px-2 py-1 text-xs text-slate-600 opacity-40 hover:opacity-100"
        >
          Show controls (H)
        </button>
      ) : (
        <div className="border-t border-line bg-panel/95 px-[2vw] py-[1.6vh]" data-testid="projector-controls">
          <div className="mx-auto flex max-w-[1800px] flex-wrap items-center gap-3">
            <GameControls status={status} onAction={act} size="lg" className="min-w-[280px] flex-1" />
            <div className="flex gap-2">
              {fullscreen.supported && (
                <Button tone="slate" size="lg" onClick={() => void fullscreen.toggle()} title="Full screen (F)">
                  {fullscreen.isFullscreen ? 'WINDOW' : 'FULL SCREEN'}
                </Button>
              )}
              <Button tone="slate" size="lg" onClick={() => setControlsHidden(true)} title="Hide controls (H)">
                HIDE
              </Button>
              <Button tone="slate" size="lg" onClick={exit}>
                EXIT
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
