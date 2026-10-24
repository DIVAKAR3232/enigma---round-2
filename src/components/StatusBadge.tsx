import type { GameStatus } from '../../shared/types';

const STYLES: Record<GameStatus, { label: string; cls: string }> = {
  READY: { label: 'READY', cls: 'border-neon-cyan text-neon-cyan' },
  RUNNING: { label: 'LIVE', cls: 'border-neon-green text-neon-green' },
  PAUSED: { label: 'PAUSED', cls: 'border-neon-yellow text-neon-yellow' },
  OVER: { label: 'GAME OVER', cls: 'border-neon-red text-neon-red' },
};

/** `fontSize` scales the whole badge (padding is in em); without it the badge is small. */
export function StatusBadge({ status, fontSize }: { status: GameStatus; fontSize?: string }) {
  const s = STYLES[status];
  return (
    <span
      data-testid="status"
      className={`inline-flex items-center gap-[0.4em] whitespace-nowrap rounded-full border-2 px-[0.8em] py-[0.25em] font-display font-bold tracking-widest ${fontSize ? '' : 'text-xs'} ${s.cls}`}
      style={fontSize ? { fontSize } : undefined}
    >
      {status === 'RUNNING' && <span className="h-[0.6em] w-[0.6em] animate-pulse rounded-full bg-neon-green" />}
      {s.label}
    </span>
  );
}
