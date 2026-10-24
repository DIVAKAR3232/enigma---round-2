import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { formatTime } from '../../shared/timer';
import type { GameState, SettingsDto } from '../../shared/types';
import { api } from '../lib/api';
import { effectiveStatus, useGame, useRemaining } from '../lib/useGame';
import { GameStage } from '../components/GameStage';
import { GameControls, primaryAction, useHotkeys } from '../components/GameControls';
import { AdminLayout, Alert, Button, Card, ConfirmDialog } from '../components/ui';
import { StatusBadge } from '../components/StatusBadge';
import { LoadingScreen } from '../components/ScreenBits';

export function openProjectorWindow() {
  const win = window.open('/projector', 'kbc-projector', 'popup=yes,width=1280,height=720');
  if (!win) window.location.assign('/projector'); // popup blocked: open in this tab instead
  else win.focus();
}

const DURATION_PRESETS = [30, 60, 90, 120, 180, 300];

export default function OrganizerPage() {
  const { state, connection, error, setError, act, accept, offsetRef } = useGame();
  const remaining = useRemaining(state, offsetRef);
  const status = effectiveStatus(state, remaining);
  const [confirmReset, setConfirmReset] = useState(false);
  const [durationMsg, setDurationMsg] = useState<string | null>(null);
  const navigate = useNavigate();

  const hotkeys = useMemo(
    () => ({
      Space: () => {
        const a = status && primaryAction(status);
        if (a) void act(a);
      },
      n: () => {
        if (status === 'RUNNING' || status === 'PAUSED') void act('next-word');
      },
      p: openProjectorWindow,
    }),
    [status, act],
  );
  useHotkeys(hotkeys);

  if (!state || !status) return <LoadingScreen error={error} />;

  const setDuration = async (durationSec: number) => {
    try {
      const res = await api.put<{ settings: SettingsDto; state: GameState }>('/api/settings', { durationSec });
      accept(res.state);
      setDurationMsg(
        status === 'READY'
          ? `Duration set to ${formatTime(durationSec * 1000)}.`
          : `Duration set to ${formatTime(durationSec * 1000)}. It applies on the next RESTART or RESET.`,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change duration');
    }
  };

  return (
    <AdminLayout
      title="Organizer Mode"
      actions={
        <div className="flex gap-2">
          <Button tone="cyan" onClick={openProjectorWindow}>PROJECTOR MODE</Button>
          <Button tone="slate" onClick={() => navigate('/dashboard')}>EXIT</Button>
        </div>
      }
    >
      <div className="grid gap-6 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <div className="mb-2 flex items-center justify-between text-xs uppercase tracking-widest text-slate-400">
            <span>Live projector preview</span>
            <span className={connection === 'live' ? 'text-neon-green' : 'text-neon-yellow'}>
              {connection === 'live' ? '● connected' : '● reconnecting'}
            </span>
          </div>
          <div className="aspect-video w-full">
            <GameStage state={state} status={status} remaining={remaining} variant="preview" />
          </div>
        </div>

        <div className="flex flex-col gap-4 lg:col-span-2">
          <Card className="flex items-center justify-between gap-4">
            <div>
              <div className="text-xs uppercase tracking-widest text-slate-400">Time left</div>
              <div className="font-display text-5xl font-black tabular-nums text-white">{formatTime(remaining)}</div>
            </div>
            <div className="text-right">
              <StatusBadge status={status} />
              <div className="mt-2 text-sm text-slate-400">
                Round <span className="font-bold text-neon-yellow">{state.round || '–'}</span>
              </div>
            </div>
          </Card>
          <Card>
            <div className="text-xs uppercase tracking-widest text-slate-400">Current word</div>
            <div className="mt-1 font-display text-5xl font-black tracking-[0.2em] text-neon-yellow" data-testid="organizer-word">
              {state.currentWord && status !== 'READY' ? state.currentWord : '—'}
            </div>
          </Card>
          {error && (
            <button type="button" className="text-left" onClick={() => setError(null)}>
              <Alert>{error} (click to dismiss)</Alert>
            </button>
          )}
        </div>
      </div>

      <Card className="mt-6">
        <GameControls status={status} onAction={act} size="xl" showNextWord />
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-400">
            Shortcuts: <kbd className="text-slate-200">Space</kbd> start/pause/resume ·{' '}
            <kbd className="text-slate-200">N</kbd> next word · <kbd className="text-slate-200">P</kbd> projector
          </p>
          <Button tone="red" size="md" onClick={() => setConfirmReset(true)} disabled={status === 'READY'}>
            RESET GAME
          </Button>
        </div>
      </Card>

      <Card className="mt-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-display text-lg font-bold">Game duration</h2>
            <p className="text-sm text-slate-400">Currently {formatTime(state.durationMs)} per participant.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {DURATION_PRESETS.map((sec) => (
              <Button
                key={sec}
                size="sm"
                tone={state.durationMs === sec * 1000 ? 'cyan' : 'slate'}
                onClick={() => void setDuration(sec)}
              >
                {formatTime(sec * 1000)}
              </Button>
            ))}
            <Button size="sm" tone="slate" onClick={() => navigate('/settings')}>MORE…</Button>
          </div>
        </div>
        {durationMsg && <p className="mt-3 text-sm text-neon-green">{durationMsg}</p>}
      </Card>

      <ConfirmDialog
        open={confirmReset}
        title="Reset the game?"
        message="This stops the timer, clears the word and returns every screen to READY for the next participant."
        confirmLabel="RESET GAME"
        onCancel={() => setConfirmReset(false)}
        onConfirm={() => {
          setConfirmReset(false);
          void act('reset');
        }}
      />
    </AdminLayout>
  );
}
