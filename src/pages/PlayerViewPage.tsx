import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';
import { effectiveStatus, useGame, useRemaining } from '../lib/useGame';
import { GameStage } from '../components/GameStage';
import { useFullscreen, useHotkeys } from '../components/GameControls';
import { ConnectionNotice, LoadingScreen } from '../components/ScreenBits';

/** Read-only live view for logged-in players. No game controls. */
export default function PlayerViewPage() {
  const { state, connection, error, offsetRef } = useGame();
  const remaining = useRemaining(state, offsetRef);
  const status = effectiveStatus(state, remaining);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const fullscreen = useFullscreen();
  useHotkeys(useMemo(() => ({ f: () => void fullscreen.toggle() }), [fullscreen]));

  if (!state || !status) return <LoadingScreen error={error} />;
  return (
    <div className="fixed inset-0 overflow-hidden">
      <GameStage state={state} status={status} remaining={remaining} />
      <ConnectionNotice connection={connection} />
      <div className="absolute bottom-2 right-2 flex gap-2 text-xs opacity-50 hover:opacity-100">
        {fullscreen.supported && (
          <button type="button" className="rounded border border-line px-2 py-1" onClick={() => void fullscreen.toggle()}>
            Full screen
          </button>
        )}
        <button
          type="button"
          className="rounded border border-line px-2 py-1"
          onClick={async () => {
            await logout();
            navigate('/login');
          }}
        >
          Log out
        </button>
      </div>
    </div>
  );
}
