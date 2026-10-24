import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PublicUser } from '../../shared/types';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { AdminLayout, Alert, Button, Card } from '../components/ui';
import { homePath } from './AuthPages';

export default function AccountPage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [msg, setMsg] = useState<{ tone: 'green' | 'red'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const forced = user?.mustChangePassword ?? false;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (next !== confirm) {
      setMsg({ tone: 'red', text: 'The new passwords do not match.' });
      return;
    }
    setBusy(true);
    setMsg(null);
    try {
      const res = await api.post<{ user: PublicUser }>('/api/auth/change-password', { currentPassword: current, newPassword: next });
      setUser(res.user);
      setCurrent('');
      setNext('');
      setConfirm('');
      if (forced) navigate(homePath(res.user), { replace: true });
      else setMsg({ tone: 'green', text: 'Password changed. Other devices have been logged out.' });
    } catch (err) {
      setMsg({ tone: 'red', text: err instanceof Error ? err.message : 'Could not change password' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminLayout title="My Account">
      <Card className="max-w-lg">
        <div className="mb-4 text-sm text-slate-400">
          Signed in as <span className="font-mono text-white">{user?.username}</span> ({user?.role.toLowerCase()})
        </div>
        {forced && (
          <div className="mb-4">
            <Alert tone="yellow">You are using a temporary password. Choose a new one to continue.</Alert>
          </div>
        )}
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="label" htmlFor="cur">Current {forced ? 'temporary ' : ''}password</label>
            <input id="cur" type="password" className="field" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
          </div>
          <div>
            <label className="label" htmlFor="new">New password (min 8 characters)</label>
            <input id="new" type="password" className="field" autoComplete="new-password" minLength={8} value={next} onChange={(e) => setNext(e.target.value)} required />
          </div>
          <div>
            <label className="label" htmlFor="confirm">Confirm new password</label>
            <input id="confirm" type="password" className="field" autoComplete="new-password" minLength={8} value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
          </div>
          {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
          <Button type="submit" size="lg" disabled={busy}>{busy ? 'SAVING…' : 'CHANGE PASSWORD'}</Button>
        </form>
      </Card>
    </AdminLayout>
  );
}
