import type { CSSProperties, ReactNode } from 'react';
import type { GameState, GameStatus } from '../../shared/types';
import { formatTime } from '../../shared/timer';
import { Keyboard } from './Keyboard';
import { WordTiles } from './WordTiles';
import { TimerDisplay } from './TimerDisplay';
import { StatusBadge } from './StatusBadge';

interface GameStageProps {
  state: GameState;
  status: GameStatus;
  remaining: number;
  /** 'full' fills the viewport (projector / player). 'preview' fits inside a card. */
  variant?: 'full' | 'preview';
}

/*
 * Every size is in container units (cqw / cqh = 1% of this screen's width / height),
 * so the word and keyboard fill the available area on any projector, laptop or preview box,
 * and grow further when the projector's control bar is hidden.
 *
 * Height budget: top bar ~15% · word tiles ~23% · keyboard ~51%.
 * Width: the top keyboard row is 10.9 keys wide → 8.7cqw per key leaves a small side margin.
 */
const SIZES = {
  key: 'min(8.7cqw, 16cqh)',
  tile: 'min(10.5cqw, 21cqh)',
  timer: 'min(8cqw, 12cqh)',
};

/**
 * The projected game screen: round, status, timer, target word and keyboard,
 * with READY and GAME OVER screens. Contains no controls.
 */
export function GameStage({ state, status, remaining, variant = 'full' }: GameStageProps) {
  const preview = variant === 'preview';
  const container: CSSProperties = { containerType: 'size' };

  return (
    <div
      className={`arcade-grid relative h-full w-full overflow-hidden ${preview ? 'rounded-xl border border-line' : ''}`}
      style={container}
      data-testid="game-stage"
    >
      <div className="flex h-full w-full flex-col">
        {/* Top bar */}
        <div className="flex items-center justify-between" style={{ padding: '1.6cqh 2.5cqw 0' }}>
          <div className="flex w-[30cqw] flex-col" style={{ gap: '0.6cqh' }}>
            <span className="truncate font-display font-bold uppercase tracking-[0.2em] text-neon-pink" style={{ fontSize: '2.6cqh' }}>
              {state.eventName}
            </span>
            <span className="font-display font-bold text-slate-200" style={{ fontSize: '4.2cqh' }} data-testid="round">
              ROUND <span className="text-neon-yellow">{state.round > 0 ? state.round : '–'}</span>
            </span>
          </div>
          <TimerDisplay ms={remaining} status={status} fontSize={SIZES.timer} />
          <div className="flex w-[30cqw] justify-end">
            <StatusBadge status={status} fontSize="3cqh" />
          </div>
        </div>

        {/* Word + keyboard fill the rest */}
        <div className="flex min-h-0 flex-1 flex-col items-center justify-evenly">
          <WordTiles word={status === 'READY' ? null : state.currentWord} tileSize={SIZES.tile} />
          <Keyboard keySize={SIZES.key} />
        </div>
      </div>

      {status === 'READY' && (
        <Overlay preview={preview}>
          <div className="font-display font-black text-neon-cyan text-glow-cyan" style={{ fontSize: 'min(16cqw, 24cqh)' }}>
            READY
          </div>
          <div className="font-display text-slate-300" style={{ fontSize: '4cqh', marginTop: '1cqh' }}>
            {formatTime(state.durationMs)} on the clock · waiting for START
          </div>
        </Overlay>
      )}
      {status === 'OVER' && (
        <Overlay preview={preview}>
          <div className="font-display font-black text-neon-red text-glow-red" style={{ fontSize: 'min(13cqw, 20cqh)' }}>
            GAME OVER
          </div>
          <div className="font-display text-slate-300" style={{ fontSize: '4cqh', marginTop: '1cqh' }}>
            Time is up · words shown: {state.round}
          </div>
        </Overlay>
      )}
    </div>
  );
}

function Overlay({ children, preview }: { children: ReactNode; preview: boolean }) {
  return (
    <div
      className={`fade-up absolute inset-0 flex flex-col items-center justify-center bg-ink/85 text-center backdrop-blur-sm ${preview ? 'rounded-xl' : ''}`}
    >
      {children}
    </div>
  );
}
