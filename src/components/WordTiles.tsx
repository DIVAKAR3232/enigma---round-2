interface WordTilesProps {
  word: string | null;
  tileSize?: string;
}

/** The target word in very large tiles. Re-keyed on change so each new word animates in. */
export function WordTiles({ word, tileSize = 'min(13vw, 19vh)' }: WordTilesProps) {
  const letters = (word ?? '?????').split('');
  return (
    <div
      key={word ?? 'empty'}
      className="flex justify-center"
      style={{ gap: `calc(${tileSize} * 0.14)`, perspective: '800px' }}
      aria-label={word ? `Target word ${word}` : 'No word yet'}
      data-testid="target-word"
    >
      {letters.map((letter, i) => (
        <div
          key={i}
          className={[
            'tile-in flex items-center justify-center rounded-[16%] border-4 font-display font-black',
            word
              ? 'border-neon-pink bg-gradient-to-b from-[#2a0f2b] to-[#140716] text-neon-yellow text-glow-yellow shadow-[0_0_40px_rgb(244_114_182/0.35)]'
              : 'border-line bg-panel text-slate-600',
          ].join(' ')}
          style={{
            width: tileSize,
            height: `calc(${tileSize} * 1.12)`,
            fontSize: `calc(${tileSize} * 0.72)`,
            animationDelay: `${i * 70}ms`,
          }}
        >
          {letter}
        </div>
      ))}
    </div>
  );
}
