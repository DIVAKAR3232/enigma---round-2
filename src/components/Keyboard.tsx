export const KEY_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'] as const;

interface KeyboardProps {
  /** Letters to light up (the letters of the current target word). */
  highlight?: ReadonlySet<string>;
  /** CSS length for one key's width; height follows. */
  keySize?: string;
}

/** Visual reference of the physical QWERTY target. Purely a display, it records nothing. */
export function Keyboard({ highlight, keySize = 'min(8.2vw, 10.5vh)' }: KeyboardProps) {
  return (
    <div
      className="flex select-none flex-col items-center"
      style={{ gap: `calc(${keySize} * 0.12)` }}
      role="img"
      aria-label="QWERTY keyboard layout"
    >
      {KEY_ROWS.map((row, r) => (
        <div
          key={row}
          className="flex"
          style={{ gap: `calc(${keySize} * 0.12)`, marginLeft: `calc(${keySize} * ${r * 0.5})` }}
        >
          {row.split('').map((letter) => {
            const lit = highlight?.has(letter) ?? false;
            return (
              <div
                key={letter}
                data-testid={`key-${letter}`}
                data-lit={lit || undefined}
                className={[
                  'flex items-center justify-center rounded-[14%] border-2 font-display font-black transition-colors duration-300',
                  lit
                    ? 'border-neon-yellow bg-neon-yellow text-ink shadow-[0_0_28px_rgb(250_204_21/0.55)]'
                    : 'border-neon-cyan/70 bg-panel-2 text-white shadow-[inset_0_-6px_0_rgb(0_0_0/0.35),0_0_14px_rgb(34_211_238/0.18)]',
                ].join(' ')}
                style={{ width: keySize, height: keySize, fontSize: `calc(${keySize} * 0.5)` }}
              >
                {letter}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
