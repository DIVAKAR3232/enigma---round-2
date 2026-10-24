import type { GameStatus } from '../../shared/types';

const STYLES: Record<GameStatus, { label: string; cls: string }> = {
  READY: { label: 'READY', cls: 'border-neon-cyan text-neon-cyan' },
  RUNNING: { label: 'LIVE', cls: 'border-neon-green text-neon-green' },
  PAUSED: { label: 'PAUSED', cls: 'border-neon-yellow text-neon-yellow' },
  OVER: { label: 'GAME OVER', cls: 'border-neon-red text-neon-red' },
};

export function StatusBadge({ status, size = 'md' }: { status: GameStatus; size?: 'md' | 'lg' }) {
  const s = STYLES[status];
  return (
    <span
      data-testid="status"
      className={[
        'inline-flex items-center gap-2 rounded-full border-2 font-display font-bold tracking-widest',
        size === 'lg' ? 'px-[1.2vw] py-[0.6vh] text-[min(2.2vw,3.2vh)]' : 'px-3 py-1 text-xs',
        s.cls,
      ].join(' ')}
    >
      {status === 'RUNNING' && <span className="h-[0.6em] w-[0.6em] animate-pulse rounded-full bg-neon-green" />}
      {s.label}
    </span>
  );
}
