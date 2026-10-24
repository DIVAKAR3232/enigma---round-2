import { formatTime } from '../../shared/timer';
import type { GameStatus } from '../../shared/types';

interface TimerDisplayProps {
  ms: number;
  status: GameStatus;
  fontSize?: string;
}

export function TimerDisplay({ ms, status, fontSize = 'min(11vw, 15vh)' }: TimerDisplayProps) {
  const urgent = status === 'RUNNING' && ms <= 10_000;
  const color =
    status === 'OVER' || urgent
      ? 'text-neon-red text-glow-red'
      : status === 'PAUSED'
        ? 'text-neon-yellow text-glow-yellow'
        : 'text-neon-cyan text-glow-cyan';
  return (
    <div
      className={`font-display font-black leading-none tabular-nums ${color} ${urgent ? 'urgent' : ''}`}
      style={{ fontSize }}
      role="timer"
      aria-live="off"
      data-testid="timer"
    >
      {formatTime(ms)}
    </div>
  );
}
