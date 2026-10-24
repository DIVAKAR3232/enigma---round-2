import { Link } from 'react-router-dom';
import { formatTime } from '../../shared/timer';
import { useAuth } from '../lib/auth';
import { effectiveStatus, useGame, useRemaining } from '../lib/useGame';
import { AdminLayout, Button, Card } from '../components/ui';
import { StatusBadge } from '../components/StatusBadge';
import { openProjectorWindow } from './OrganizerPage';

const TILES = [
  { to: '/organizer', title: 'Organizer Mode', body: 'Start, pause, next word and reset. Run the game from here.', tone: 'text-neon-green' },
  { to: '/settings', title: 'Settings', body: 'Game duration, event name, word list and letter highlighting.', tone: 'text-neon-cyan' },
  { to: '/words', title: 'Word Lists', body: 'Use the built-in dictionary or upload your own five-letter words.', tone: 'text-neon-yellow' },
  { to: '/players', title: 'Player Accounts', body: 'Optional. Generate player logins with temporary passwords.', tone: 'text-neon-pink' },
  { to: '/account', title: 'My Account', body: 'Change your organizer password.', tone: 'text-slate-200' },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const { state, offsetRef } = useGame();
  const remaining = useRemaining(state, offsetRef);
  const status = effectiveStatus(state, remaining);

  return (
    <AdminLayout title={`Welcome${user?.displayName ? `, ${user.displayName}` : ''}`}>
      <Card className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          {status && <StatusBadge status={status} />}
          <span className="font-display text-3xl font-black tabular-nums">{formatTime(remaining)}</span>
          {state && state.round > 0 && <span className="text-slate-400">Round {state.round}</span>}
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/organizer"><Button tone="green" size="lg">ORGANIZER MODE</Button></Link>
          <Button tone="cyan" size="lg" onClick={openProjectorWindow}>PROJECTOR MODE</Button>
        </div>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TILES.map((t) => (
          <Link key={t.to} to={t.to} className="group">
            <Card className="h-full transition group-hover:border-neon-cyan/70">
              <h2 className={`font-display text-lg font-bold ${t.tone}`}>{t.title}</h2>
              <p className="mt-2 text-sm text-slate-400">{t.body}</p>
            </Card>
          </Link>
        ))}
      </div>

      <Card className="mt-6">
        <h2 className="font-display text-lg font-bold">Event flow</h2>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-slate-300">
          <li>Set the game duration in <Link className="text-neon-cyan underline" to="/settings">Settings</Link>.</li>
          <li>Click <b>PROJECTOR MODE</b>, drag the window to the projector screen and press <b>FULL SCREEN</b> (or F).</li>
          <li>Keep <b>Organizer Mode</b> open on your laptop. Press <b>START</b> when the participant is ready.</li>
          <li>The participant throws the ball at the physical keyboard. Press <b>NEXT WORD</b> whenever the event rules say so.</li>
          <li>At <b>GAME OVER</b>, press <b>RESET GAME</b> or <b>RESTART</b> for the next participant.</li>
        </ol>
        <p className="mt-3 text-sm text-slate-500">
          The app never judges throws. It only shows the target word, the keyboard reference and the timer.
        </p>
      </Card>
    </AdminLayout>
  );
}
