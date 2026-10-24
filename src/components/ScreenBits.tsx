import type { Connection } from '../lib/useGame';

export function LoadingScreen({ error }: { error?: string | null }) {
  return (
    <div className="flex h-screen items-center justify-center bg-ink">
      <div className="text-center">
        <div className="font-display text-2xl font-black tracking-widest text-neon-cyan text-glow-cyan">LOADING…</div>
        {error && <div className="mt-4 text-red-300">{error}</div>}
      </div>
    </div>
  );
}

export function ConnectionNotice({ connection }: { connection: Connection }) {
  if (connection === 'live') return null;
  return (
    <div className="absolute right-3 top-3 rounded-full border border-neon-yellow/60 bg-ink/90 px-3 py-1 text-xs text-yellow-100">
      {connection === 'connecting' ? 'Connecting…' : 'Reconnecting… the timer keeps running'}
    </div>
  );
}
