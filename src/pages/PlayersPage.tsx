import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { GeneratedCredential } from '../../shared/types';
import { api } from '../lib/api';
import { AdminLayout, Alert, Button, Card, ConfirmDialog } from '../components/ui';

interface PlayerRow {
  id: string;
  username: string;
  displayName: string | null;
  mustChangePassword: boolean;
  createdAt: string;
  lastLoginAt: string | null;
}

function credentialsCsv(creds: GeneratedCredential[]): string {
  const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
  return ['username,temporary_password', ...creds.map((c) => `${esc(c.username)},${esc(c.password)}`)].join('\r\n');
}

function download(filename: string, content: string) {
  const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function PlayersPage() {
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [count, setCount] = useState(5);
  const [prefix, setPrefix] = useState('player');
  const [names, setNames] = useState('');
  const [fresh, setFresh] = useState<GeneratedCredential[] | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<PlayerRow | null>(null);

  const load = useCallback(async () => {
    setPlayers((await api.get<{ players: PlayerRow[] }>('/api/players')).players);
  }, []);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  const generate = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const nameList = names.split('\n').map((n) => n.trim()).filter(Boolean);
      const total = nameList.length > 0 ? nameList.length : count;
      const res = await api.post<{ credentials: GeneratedCredential[] }>('/api/players/generate', {
        count: total,
        prefix,
        names: nameList.length > 0 ? nameList : undefined,
      });
      setFresh(res.credentials);
      setCopied(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create accounts');
    } finally {
      setBusy(false);
    }
  };

  const resetPassword = async (p: PlayerRow) => {
    try {
      const res = await api.post<{ credential: GeneratedCredential }>(`/api/players/${p.id}/reset-password`);
      setFresh([res.credential]);
      setCopied(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset failed');
    }
  };

  const copyAll = async () => {
    if (!fresh) return;
    const text = fresh.map((c) => `${c.username}\t${c.password}`).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      setError('Clipboard is not available in this browser. Use DOWNLOAD CSV instead.');
    }
  };

  return (
    <AdminLayout title="Player Accounts">
      <p className="mb-6 max-w-3xl text-slate-400">
        Optional. The game works with only the organizer logged in. Players who log in see a read-only live view of the
        game (word, keyboard and timer). Temporary passwords are shown <b>only once</b> and must be changed at first login.
      </p>

      {fresh && (
        <Card className="mb-6 border-neon-yellow/60">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold text-neon-yellow">New credentials — save them now</h2>
            <div className="flex gap-2">
              <Button size="sm" tone="yellow" onClick={() => void copyAll()}>{copied ? 'COPIED ✓' : 'COPY ALL'}</Button>
              <Button size="sm" tone="cyan" onClick={() => download(`player-credentials-${Date.now()}.csv`, credentialsCsv(fresh))}>DOWNLOAD CSV</Button>
              <Button size="sm" tone="slate" onClick={() => setFresh(null)}>DONE</Button>
            </div>
          </div>
          <p className="mt-2 text-sm text-slate-400">These passwords cannot be shown again. Closing this panel hides them for good.</p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-left font-mono text-sm" data-testid="fresh-credentials">
              <thead className="text-slate-400">
                <tr><th className="py-1 pr-6">Username</th><th className="py-1">Temporary password</th></tr>
              </thead>
              <tbody>
                {fresh.map((c) => (
                  <tr key={c.id} className="border-t border-line">
                    <td className="py-1.5 pr-6">{c.username}</td>
                    <td className="py-1.5 text-neon-yellow">{c.password}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <h2 className="font-display text-lg font-bold text-neon-pink">Generate accounts</h2>
          <form onSubmit={generate} className="mt-4 space-y-4">
            <div>
              <label className="label" htmlFor="prefix">Username prefix</label>
              <input id="prefix" className="field" maxLength={12} value={prefix} onChange={(e) => setPrefix(e.target.value)} />
              <p className="mt-1 text-xs text-slate-500">Usernames look like {prefix.toLowerCase().replace(/[^a-z0-9]/g, '') || 'player'}-k3m9x.</p>
            </div>
            <div>
              <label className="label" htmlFor="count">How many</label>
              <input id="count" type="number" min={1} max={100} className="field w-28" value={count} onChange={(e) => setCount(Math.max(1, Math.min(100, Number(e.target.value) || 1)))} disabled={names.trim().length > 0} />
            </div>
            <div>
              <label className="label" htmlFor="names">…or participant names, one per line (optional)</label>
              <textarea id="names" rows={4} className="field" value={names} onChange={(e) => setNames(e.target.value)} />
            </div>
            {error && <Alert>{error}</Alert>}
            <Button type="submit" size="lg" tone="pink" disabled={busy}>{busy ? 'GENERATING…' : 'GENERATE'}</Button>
          </form>
        </Card>

        <Card className="lg:col-span-3">
          <h2 className="font-display text-lg font-bold">Existing players ({players.length})</h2>
          {players.length === 0 ? (
            <p className="mt-3 text-slate-500">No player accounts yet.</p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {players.map((p) => (
                <li key={p.id} className="flex flex-wrap items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <div className="font-mono">{p.username}</div>
                    <div className="text-xs text-slate-500">
                      {p.displayName && `${p.displayName} · `}
                      {p.mustChangePassword ? 'temporary password' : 'password set'}
                      {p.lastLoginAt && ` · last login ${new Date(p.lastLoginAt).toLocaleString()}`}
                    </div>
                  </div>
                  <Button size="sm" tone="yellow" onClick={() => void resetPassword(p)}>RESET PASSWORD</Button>
                  <Button size="sm" tone="red" onClick={() => setDeleting(p)}>DELETE</Button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <ConfirmDialog
        open={deleting !== null}
        title="Delete player?"
        message={`The account "${deleting?.username}" will be removed.`}
        confirmLabel="DELETE"
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          const p = deleting;
          setDeleting(null);
          if (!p) return;
          try {
            await api.del(`/api/players/${p.id}`);
            await load();
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Delete failed');
          }
        }}
      />
    </AdminLayout>
  );
}
