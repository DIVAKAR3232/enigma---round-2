import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { WordListSummary } from '../../shared/types';
import { api, ApiError } from '../lib/api';
import { AdminLayout, Alert, Button, Card, ConfirmDialog } from '../components/ui';

interface UploadResult {
  accepted: number;
  rejected: { word: string; reason: string }[];
  rejectedCount: number;
  duplicates: number;
}

export default function WordsPage() {
  const [lists, setLists] = useState<WordListSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [allowUnknown, setAllowUnknown] = useState(false);
  const [activate, setActivate] = useState(true);
  const [result, setResult] = useState<UploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [viewing, setViewing] = useState<{ name: string; words: string[] } | null>(null);
  const [deleting, setDeleting] = useState<WordListSummary | null>(null);

  const load = useCallback(async () => {
    const res = await api.get<{ lists: WordListSummary[]; activeWordListId: string | null }>('/api/words/lists');
    setLists(res.lists);
    setActiveId(res.activeWordListId);
  }, []);

  useEffect(() => {
    load().catch((e) => setError(e.message));
  }, [load]);

  const onFile = async (file: File | undefined) => {
    if (!file) return;
    if (file.size > 2_000_000) {
      setError('That file is too large (max 2 MB).');
      return;
    }
    setText(await file.text());
    if (!name) setName(file.name.replace(/\.[^.]+$/, '').slice(0, 60));
  };

  const upload = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.post<UploadResult>('/api/words/lists', { name, text, allowUnknown, activate });
      setResult(res);
      setText('');
      setName('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
      if (err instanceof ApiError && err.body && typeof err.body === 'object' && 'rejected' in err.body) {
        setResult({ accepted: 0, duplicates: 0, ...(err.body as Pick<UploadResult, 'rejected'>), rejectedCount: (err.body as UploadResult).rejected.length });
      }
    } finally {
      setBusy(false);
    }
  };

  const setActive = async (id: string | null) => {
    try {
      await api.put('/api/settings', { activeWordListId: id });
      setActiveId(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not change list');
    }
  };

  const view = async (l: WordListSummary) => {
    try {
      setViewing(await api.get<{ name: string; words: string[] }>(`/api/words/lists/${l.id ?? 'builtin'}`));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load list');
    }
  };

  return (
    <AdminLayout title="Word Lists">
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <h2 className="font-display text-lg font-bold text-neon-yellow">Available lists</h2>
          <p className="mt-1 text-sm text-slate-400">The projector only ever shows the current word, never the list.</p>
          <ul className="mt-4 divide-y divide-line">
            {lists.map((l) => {
              const active = (l.id ?? null) === activeId;
              return (
                <li key={l.id ?? 'builtin'} className="flex flex-wrap items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">
                      {l.name} {active && <span className="ml-2 rounded bg-neon-green/20 px-2 py-0.5 text-xs text-neon-green">ACTIVE</span>}
                    </div>
                    <div className="text-xs text-slate-500">{l.count} words{l.builtIn ? ' · validated built-in dictionary' : ''}</div>
                  </div>
                  <Button size="sm" tone="slate" onClick={() => void view(l)}>VIEW</Button>
                  {!active && <Button size="sm" tone="green" onClick={() => void setActive(l.id)}>USE</Button>}
                  {!l.builtIn && <Button size="sm" tone="red" onClick={() => setDeleting(l)}>DELETE</Button>}
                </li>
              );
            })}
          </ul>
        </Card>

        <Card>
          <h2 className="font-display text-lg font-bold text-neon-cyan">Upload a custom list</h2>
          <p className="mt-1 text-sm text-slate-400">
            A .txt or .csv file, words separated by new lines, commas or spaces. Only five-letter A–Z words are kept;
            duplicates are removed.
          </p>
          <form onSubmit={upload} className="mt-4 space-y-4">
            <div>
              <label className="label" htmlFor="wl-file">File</label>
              <input id="wl-file" type="file" accept=".txt,.csv,text/plain,text/csv" className="field file:mr-3 file:rounded file:border-0 file:bg-neon-cyan/20 file:px-3 file:py-1 file:text-neon-cyan" onChange={(e) => void onFile(e.target.files?.[0])} />
            </div>
            <div>
              <label className="label" htmlFor="wl-text">…or paste words</label>
              <textarea id="wl-text" rows={6} className="field font-mono" value={text} onChange={(e) => setText(e.target.value)} placeholder="APPLE, BRAIN, CHAIR…" />
            </div>
            <div>
              <label className="label" htmlFor="wl-name">List name</label>
              <input id="wl-name" className="field" maxLength={60} value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <label className="flex items-center gap-3 text-sm">
              <input type="checkbox" className="h-4 w-4" checked={activate} onChange={(e) => setActivate(e.target.checked)} />
              Use this list right away
            </label>
            <label className="flex items-center gap-3 text-sm">
              <input type="checkbox" className="h-4 w-4" checked={allowUnknown} onChange={(e) => setAllowUnknown(e.target.checked)} />
              Allow words not found in the English dictionary (names, slang, event terms)
            </label>
            {error && <Alert>{error}</Alert>}
            {result && (
              <Alert tone={result.accepted > 0 ? 'green' : 'yellow'}>
                {result.accepted} words added
                {result.duplicates > 0 && ` · ${result.duplicates} duplicates skipped`}
                {result.rejectedCount > 0 && ` · ${result.rejectedCount} rejected`}
                {result.rejected.length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer">Show rejected words</summary>
                    <ul className="mt-2 max-h-40 overflow-auto font-mono text-xs">
                      {result.rejected.map((r, i) => (
                        <li key={i}>{r.word} — {r.reason}</li>
                      ))}
                    </ul>
                  </details>
                )}
              </Alert>
            )}
            <Button type="submit" size="lg" disabled={busy || !text.trim()}>{busy ? 'UPLOADING…' : 'UPLOAD LIST'}</Button>
          </form>
        </Card>
      </div>

      {viewing && (
        <Card className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">{viewing.name} · {viewing.words.length} words</h2>
            <Button size="sm" tone="slate" onClick={() => setViewing(null)}>CLOSE</Button>
          </div>
          <div className="mt-4 max-h-80 overflow-auto font-mono text-sm leading-7 text-slate-300">{viewing.words.join('  ')}</div>
        </Card>
      )}

      <ConfirmDialog
        open={deleting !== null}
        title="Delete word list?"
        message={`"${deleting?.name}" will be removed. If it is active, the built-in dictionary is used instead.`}
        confirmLabel="DELETE"
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          const l = deleting;
          setDeleting(null);
          if (!l?.id) return;
          try {
            await api.del(`/api/words/lists/${l.id}`);
            await load();
          } catch (err) {
            setError(err instanceof Error ? err.message : 'Delete failed');
          }
        }}
      />
    </AdminLayout>
  );
}
