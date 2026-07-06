/**
 * SplashScreen - animação de abertura do app.
 *
 * Linha do tempo:
 *  0.00s  ícone (quadrado rosa com carteira + "R.") dá um "pop" no centro
 *  0.80s  o "R." sai de dentro da carteira e vira o início do wordmark;
 *         as letras "acha." entram em cascata ao lado - o ícone vira a logo completa
 *  2.00s  a logo inteira expande (zoom) e o overlay some, revelando o app
 *
 * O componente se auto-remove chamando onDone() ao final.
 */
import { useEffect, useState } from 'react';

const LETTERS = ['R', 'a', 'c', 'h', 'a'];

export default function SplashScreen({ onDone }) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setLeaving(true), 2000);
    const t2 = setTimeout(onDone, 2600);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [onDone]);

  return (
    <div
      className={`fixed inset-0 z-[100] flex items-center justify-center bg-ink pointer-events-none ${
        leaving ? 'splash-leave' : ''
      }`}
      aria-hidden="true"
    >
      <div className="splash-lockup flex items-center gap-4">
        {/* ícone: mesmo desenho do public/icon.svg, com o "R." em grupo animável */}
        <div className="splash-icon w-20 h-20 shrink-0">
          <svg viewBox="0 0 512 512" className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="splash-g" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="#FF2D7A" />
                <stop offset="1" stopColor="#F0146B" />
              </linearGradient>
            </defs>
            <rect x="16" y="16" width="480" height="480" rx="120" fill="url(#splash-g)" />
            <path
              d="M 132 172 L 344 120 Q 366 115 368 138 L 370 168"
              fill="none"
              stroke="#fff"
              strokeWidth="26"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <rect x="118" y="164" width="270" height="222" rx="46" fill="none" stroke="#fff" strokeWidth="26" />
            <rect x="360" y="234" width="102" height="88" rx="30" fill="url(#splash-g)" stroke="#fff" strokeWidth="22" />
            <circle cx="404" cy="278" r="17" fill="#fff" />
            {/* o "R." que sai da carteira e "vira" o wordmark */}
            <g className="splash-icon-r">
              <text
                x="160"
                y="342"
                fontFamily="Inter, ui-sans-serif, system-ui, sans-serif"
                fontWeight="800"
                fontSize="150"
                fill="#fff"
              >
                R
              </text>
              <circle cx="290" cy="330" r="15" fill="#FF7AA8" />
            </g>
          </svg>
        </div>

        {/* wordmark "Racha." - expande a partir do ícone */}
        <div className="splash-word flex text-5xl font-extrabold tracking-tight text-white">
          {LETTERS.map((letter, i) => (
            <span key={i} className="splash-letter" style={{ animationDelay: `${0.9 + i * 0.06}s` }}>
              {letter}
            </span>
          ))}
          <span className="splash-letter text-accent" style={{ animationDelay: `${0.9 + LETTERS.length * 0.06}s` }}>
            .
          </span>
        </div>
      </div>
    </div>
  );
}
