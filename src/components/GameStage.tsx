import type { ReactNode } from 'react';
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

/**
 * The projected game screen: round, status, timer, target word and keyboard,
 * with READY and GAME OVER screens. Contains no controls.
 */
export function GameStage({ state, status, remaining, variant = 'full' }: GameStageProps) {
  const preview = variant === 'preview';
  const sizes = preview
    ? { tile: 'min(5.2vw, 9vh)', key: 'min(3.1vw, 5vh)', timer: 'min(4.5vw, 8vh)', title: 'text-sm' }
    : { tile: 'min(12vw, 17vh)', key: 'min(7.6vw, 9.2vh)', timer: 'min(10vw, 13vh)', title: 'text-[min(2.4vw,3.6vh)]' };
  const highlight = state.highlightLetters && state.currentWord ? new Set(state.currentWord.split('')) : undefined;

  return (
    <div
      className={`arcade-grid relative flex h-full w-full flex-col overflow-hidden ${preview ? 'rounded-xl border border-line' : ''}`}
      data-testid="game-stage"
    >
      {/* Top bar */}
      <div className={`flex items-center justify-between ${preview ? 'px-3 pt-2' : 'px-[3vw] pt-[2.5vh]'}`}>
        <div className="flex flex-col gap-1">
          <span className={`font-display font-bold uppercase tracking-[0.2em] text-neon-pink ${sizes.title}`}>
            {state.eventName}
          </span>
          <span
            className={`font-display font-bold text-slate-200 ${preview ? 'text-xs' : 'text-[min(2.8vw,4.2vh)]'}`}
            data-testid="round"
          >
            ROUND <span className="text-neon-yellow">{state.round > 0 ? state.round : '–'}</span>
          </span>
        </div>
        <TimerDisplay ms={remaining} status={status} fontSize={sizes.timer} />
        <StatusBadge status={status} size={preview ? 'md' : 'lg'} />
      </div>

      {/* Word + keyboard */}
      <div className={`flex flex-1 flex-col items-center justify-evenly ${preview ? 'gap-2 py-2' : 'gap-[2vh] py-[1vh]'}`}>
        <WordTiles word={status === 'READY' ? null : state.currentWord} tileSize={sizes.tile} />
        <Keyboard highlight={status === 'READY' ? undefined : highlight} keySize={sizes.key} />
      </div>

      {status === 'READY' && (
        <Overlay preview={preview}>
          <div className={`font-display font-black text-neon-cyan text-glow-cyan ${preview ? 'text-4xl' : 'text-[min(14vw,20vh)]'}`}>
            READY
          </div>
          <div className={`mt-[1vh] font-display text-slate-300 ${preview ? 'text-xs' : 'text-[min(2.6vw,4vh)]'}`}>
            {formatTime(state.durationMs)} on the clock · waiting for START
          </div>
        </Overlay>
      )}
      {status === 'OVER' && (
        <Overlay preview={preview}>
          <div className={`font-display font-black text-neon-red text-glow-red ${preview ? 'text-3xl' : 'text-[min(12vw,18vh)]'}`}>
            GAME OVER
          </div>
          <div className={`mt-[1vh] font-display text-slate-300 ${preview ? 'text-xs' : 'text-[min(2.6vw,4vh)]'}`}>
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
