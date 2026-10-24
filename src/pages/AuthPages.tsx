import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import type { PublicUser } from '../../shared/types';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Alert, Button } from '../components/ui';

function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="arcade-grid flex min-h-full items-center justify-center px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-line bg-panel/95 p-7 shadow-[0_0_60px_rgb(34_211_238/0.12)]">
        <div className="mb-6 text-center">
          <div className="font-display text-xs font-bold tracking-[0.35em] text-neon-pink">KEYBOARD BALL</div>
          <h1 className="mt-2 font-display text-3xl font-black text-white">{title}</h1>
          <p className="mt-2 text-sm text-slate-400">{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  );
}

export function homePath(user: PublicUser): string {
  if (user.mustChangePassword) return '/account';
  return user.role === 'ORGANIZER' ? '/dashboard' : '/play';
}

export function LoginPage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [needsSetup, setNeedsSetup] = useState(false);

  useEffect(() => {
    api
      .get<{ needsSetup: boolean }>('/api/setup/status')
      .then((s) => setNeedsSetup(s.needsSetup))
      .catch(() => undefined);
  }, []);

  if (user) return <Navigate to={homePath(user)} replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<{ user: PublicUser }>('/api/auth/login', { username, password });
      setUser(res.user);
      navigate(homePath(res.user), { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell title="Log in" subtitle="Organizers and registered players">
      {needsSetup && (
        <div className="mb-4">
          <Alert tone="yellow">
            No organizer account exists yet. <Link className="font-bold underline" to="/setup">Create the administrator</Link>.
          </Alert>
        </div>
      )}
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="username">Username</label>
          <input id="username" className="field" autoComplete="username" autoFocus value={username} onChange={(e) => setUsername(e.target.value)} required />
        </div>
        <div>
          <label className="label" htmlFor="password">Password</label>
          <input id="password" type="password" className="field" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <Alert>{error}</Alert>}
        <Button type="submit" size="lg" className="w-full" disabled={busy}>
          {busy ? 'LOGGING IN…' : 'LOG IN'}
        </Button>
      </form>
    </AuthShell>
  );
}

interface SetupStatus {
  needsSetup: boolean;
  tokenRequired: boolean;
  enabled: boolean;
}

export function SetupPage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [status, setStatus] = useState<SetupStatus | null>(null);
  const [form, setForm] = useState({ username: '', displayName: '', password: '', confirm: '', setupToken: '' });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get<SetupStatus>('/api/setup/status').then(setStatus).catch((e) => setError(e.message));
  }, []);

  if (user) return <Navigate to={homePath(user)} replace />;

  const update = (k: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setError('The two passwords do not match.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<{ user: PublicUser }>('/api/setup', {
        username: form.username,
        displayName: form.displayName || undefined,
        password: form.password,
        setupToken: form.setupToken || undefined,
      });
      setUser(res.user);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Setup failed');
    } finally {
      setBusy(false);
    }
  };

  if (status && !status.needsSetup) {
    return (
      <AuthShell title="Already set up" subtitle="An organizer account exists.">
        <Link to="/login"><Button size="lg" className="w-full">GO TO LOGIN</Button></Link>
      </AuthShell>
    );
  }
  if (status && !status.enabled) {
    return (
      <AuthShell title="Setup locked" subtitle="Web setup is disabled on this server.">
        <Alert tone="yellow">
          Set <code>SETUP_TOKEN</code> (or <code>ADMIN_USERNAME</code> and <code>ADMIN_PASSWORD</code>) in the server
          environment, or run <code>npm run admin:create -- &lt;username&gt; &lt;password&gt;</code> from the server shell.
        </Alert>
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Create administrator" subtitle="One-time setup of the first organizer account">
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="label" htmlFor="su-username">Username</label>
          <input id="su-username" className="field" autoComplete="username" value={form.username} onChange={update('username')} required minLength={3} maxLength={32} pattern="[A-Za-z0-9._\-]+" />
        </div>
        <div>
          <label className="label" htmlFor="su-name">Display name (optional)</label>
          <input id="su-name" className="field" value={form.displayName} onChange={update('displayName')} maxLength={60} />
        </div>
        <div>
          <label className="label" htmlFor="su-password">Password (min 8 characters)</label>
          <input id="su-password" type="password" className="field" autoComplete="new-password" value={form.password} onChange={update('password')} required minLength={8} />
        </div>
        <div>
          <label className="label" htmlFor="su-confirm">Confirm password</label>
          <input id="su-confirm" type="password" className="field" autoComplete="new-password" value={form.confirm} onChange={update('confirm')} required minLength={8} />
        </div>
        {status?.tokenRequired && (
          <div>
            <label className="label" htmlFor="su-token">Setup token</label>
            <input id="su-token" type="password" className="field" value={form.setupToken} onChange={update('setupToken')} required />
            <p className="mt-1 text-xs text-slate-500">The SETUP_TOKEN value from the server's environment variables.</p>
          </div>
        )}
        {error && <Alert>{error}</Alert>}
        <Button type="submit" size="lg" className="w-full" disabled={busy || !status}>
          {busy ? 'CREATING…' : 'CREATE ADMINISTRATOR'}
        </Button>
      </form>
    </AuthShell>
  );
}
