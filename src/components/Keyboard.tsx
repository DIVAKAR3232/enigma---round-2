export const KEY_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'] as const;

interface KeyboardProps {
  /** CSS length for one key's width; height follows. */
  keySize?: string;
}

/**
 * Visual reference of the physical QWERTY target. Every key looks the same:
 * the screen never hints which letters to hit, and it records nothing.
 */
export function Keyboard({ keySize = 'min(8.2vw, 10.5vh)' }: KeyboardProps) {
  const gap = `calc(${keySize} * 0.1)`;
  return (
    <div className="flex select-none flex-col items-center" style={{ gap }} role="img" aria-label="QWERTY keyboard layout">
      {KEY_ROWS.map((row, r) => (
        <div key={row} className="flex" style={{ gap, marginLeft: `calc(${keySize} * ${r * 0.5})` }}>
          {row.split('').map((letter) => (
            <div
              key={letter}
              data-testid={`key-${letter}`}
              className="flex items-center justify-center rounded-[14%] border-[max(2px,0.04em)] border-neon-cyan/80 bg-panel-2 font-display font-black text-white shadow-[inset_0_-0.12em_0_rgb(0_0_0/0.35),0_0_0.35em_rgb(34_211_238/0.22)]"
              style={{ width: keySize, height: keySize, fontSize: `calc(${keySize} * 0.56)` }}
            >
              {letter}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
