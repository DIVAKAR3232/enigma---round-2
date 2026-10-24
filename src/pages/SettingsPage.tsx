import { useEffect, useState, type FormEvent } from 'react';
import type { SettingsDto, WordListSummary } from '../../shared/types';
import { api } from '../lib/api';
import { AdminLayout, Alert, Button, Card } from '../components/ui';

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsDto | null>(null);
  const [lists, setLists] = useState<WordListSummary[]>([]);
  const [minutes, setMinutes] = useState(2);
  const [seconds, setSeconds] = useState(0);
  const [msg, setMsg] = useState<{ tone: 'green' | 'red'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<{ settings: SettingsDto }>('/api/settings'),
      api.get<{ lists: WordListSummary[] }>('/api/words/lists'),
    ])
      .then(([s, l]) => {
        setSettings(s.settings);
        setMinutes(Math.floor(s.settings.durationSec / 60));
        setSeconds(s.settings.durationSec % 60);
        setLists(l.lists);
      })
      .catch((e) => setMsg({ tone: 'red', text: e.message }));
  }, []);

  if (!settings) {
    return (
      <AdminLayout title="Settings">
        {msg ? <Alert>{msg.text}</Alert> : <p className="text-slate-400">Loading…</p>}
      </AdminLayout>
    );
  }

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    try {
      const res = await api.put<{ settings: SettingsDto }>('/api/settings', {
        ...settings,
        durationSec: minutes * 60 + seconds,
      });
      setSettings(res.settings);
      setMsg({ tone: 'green', text: 'Settings saved. Open screens update right away; a new duration applies when the game is READY.' });
    } catch (err) {
      setMsg({ tone: 'red', text: err instanceof Error ? err.message : 'Save failed' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <AdminLayout title="Settings">
      <form onSubmit={save} className="space-y-6">
        <Card className="space-y-5">
          <h2 className="font-display text-lg font-bold text-neon-cyan">Game</h2>
          <div>
            <label className="label" htmlFor="eventName">Event name (shown on the projector)</label>
            <input
              id="eventName"
              className="field"
              maxLength={60}
              value={settings.eventName}
              onChange={(e) => setSettings({ ...settings, eventName: e.target.value })}
              required
            />
          </div>
          <div>
            <span className="label">Game duration per participant</span>
            <div className="flex items-center gap-3">
              <label className="sr-only" htmlFor="minutes">Minutes</label>
              <input id="minutes" type="number" min={0} max={60} className="field w-24" value={minutes} onChange={(e) => setMinutes(Math.max(0, Number(e.target.value) || 0))} />
              <span className="text-slate-400">min</span>
              <label className="sr-only" htmlFor="seconds">Seconds</label>
              <input id="seconds" type="number" min={0} max={59} className="field w-24" value={seconds} onChange={(e) => setSeconds(Math.min(59, Math.max(0, Number(e.target.value) || 0)))} />
              <span className="text-slate-400">sec</span>
            </div>
            <p className="mt-1 text-xs text-slate-500">Between 10 seconds and 60 minutes.</p>
          </div>
        </Card>

        <Card className="space-y-5">
          <h2 className="font-display text-lg font-bold text-neon-yellow">Words</h2>
          <div>
            <label className="label" htmlFor="list">Active word list</label>
            <select
              id="list"
              className="field"
              value={settings.activeWordListId ?? ''}
              onChange={(e) => setSettings({ ...settings, activeWordListId: e.target.value || null })}
            >
              {lists.map((l) => (
                <option key={l.id ?? 'builtin'} value={l.id ?? ''}>
                  {l.name} ({l.count} words)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="avoid">Avoid repeating the last … words</label>
            <input
              id="avoid"
              type="number"
              min={0}
              max={1000}
              className="field w-32"
              value={settings.avoidRecent}
              onChange={(e) => setSettings({ ...settings, avoidRecent: Math.max(0, Math.min(1000, Number(e.target.value) || 0)) })}
            />
            <p className="mt-1 text-xs text-slate-500">Recently shown words are skipped while the list still has others. History carries over between participants.</p>
          </div>
        </Card>

        {msg && <Alert tone={msg.tone}>{msg.text}</Alert>}
        <Button type="submit" size="lg" disabled={busy}>{busy ? 'SAVING…' : 'SAVE SETTINGS'}</Button>
      </form>
    </AdminLayout>
  );
}
