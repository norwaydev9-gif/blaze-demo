import { useId } from 'react'
import type { Game } from '../lib/types'

type ArtProps = { p: string }

function Defs({ p }: ArtProps) {
  return (
    <defs>
      <linearGradient id={`${p}-red`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#ff7a6b" />
        <stop offset="45%" stopColor="#ff2d3f" />
        <stop offset="100%" stopColor="#b50b22" />
      </linearGradient>
      <linearGradient id={`${p}-gold`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#fff1b8" />
        <stop offset="50%" stopColor="#ffc857" />
        <stop offset="100%" stopColor="#e29212" />
      </linearGradient>
      <linearGradient id={`${p}-green`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#7dffd0" />
        <stop offset="100%" stopColor="#0fa87a" />
      </linearGradient>
      <linearGradient id={`${p}-blue`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#9ad8ff" />
        <stop offset="100%" stopColor="#4361ee" />
      </linearGradient>
      <radialGradient id={`${p}-glow`} cx="50%" cy="45%" r="55%">
        <stop offset="0%" stopColor="#ff2d3f" stopOpacity=".55" />
        <stop offset="100%" stopColor="#ff2d3f" stopOpacity="0" />
      </radialGradient>
    </defs>
  )
}

function Plane({ p }: ArtProps) {
  return (
    <g>
      <circle cx="108" cy="66" r="66" fill={`url(#${p}-glow)`} />
      <path d="M14 122 C54 114 84 92 108 58 C130 27 158 16 190 18" fill="none" stroke={`url(#${p}-red)`} strokeWidth="7" strokeLinecap="round" opacity=".9" />
      <path d="M24 132 C64 124 96 102 120 68" fill="none" stroke="#ffc857" strokeWidth="2" strokeDasharray="5 7" opacity=".7" />
      <g transform="translate(128 26) rotate(-20)">
        <path d="M0 20 L52 0 L43 19 L60 23 L49 32 L29 27 L12 44 L4 37 L17 23 Z" fill={`url(#${p}-red)`} stroke="#fff" strokeOpacity=".35" strokeWidth="1.5" />
        <path d="M27 21 L49 16" stroke="#fff" strokeWidth="3" strokeLinecap="round" opacity=".75" />
        <circle cx="10" cy="27" r="3.2" fill="#ffc857" />
      </g>
      <path d="M18 104 q12-8 24 0 q12 8 24 0" fill="none" stroke="#fff" strokeOpacity=".18" strokeWidth="3" strokeLinecap="round" />
    </g>
  )
}

function Rocket({ p }: ArtProps) {
  return (
    <g>
      <circle cx="100" cy="70" r="62" fill={`url(#${p}-glow)`} />
      <g transform="translate(100 68) rotate(22)">
        <path d="M0-42 C18-30 24-8 20 22 L-20 22 C-24-8-18-30 0-42Z" fill="#f4f7ff" stroke="#cfd8ea" strokeWidth="2" />
        <path d="M0-42 C8-33 12-24 14-14 L-14-14 C-12-24-8-33 0-42Z" fill={`url(#${p}-red)`} />
        <circle cy="-8" r="9" fill={`url(#${p}-blue)`} stroke="#fff" strokeWidth="2" />
        <path d="M-20 8 L-34 28 L-20 24Z" fill={`url(#${p}-gold)`} />
        <path d="M20 8 L34 28 L20 24Z" fill={`url(#${p}-gold)`} />
        <path d="M-12 24 Q0 62 12 24 L0 32Z" fill="#ff9a3d" />
        <path d="M-7 24 Q0 48 7 24 L0 29Z" fill="#fff1b8" />
      </g>
      {[[34, 30], [166, 40], [48, 112], [160, 116]].map(([x, y], i) => (
        <path key={i} d={`M${x} ${y} l3-7 l3 7 l7 3 l-7 3 l-3 7 l-3-7 l-7-3Z`} fill="#ffc857" opacity=".8" />
      ))}
    </g>
  )
}

function Mine({ p }: ArtProps) {
  return (
    <g>
      <circle cx="100" cy="70" r="64" fill={`url(#${p}-glow)`} opacity=".7" />
      <rect x="34" y="18" width="132" height="104" rx="18" fill="#111826" stroke="#2b3446" strokeWidth="2" />
      {[0, 1, 2].map((r) =>
        [0, 1, 2, 3].map((c) => (
          <rect key={`${r}-${c}`} x={46 + c * 28} y={30 + r * 28} width="22" height="22" rx="6" fill="#1b2333" stroke="#39435a" strokeOpacity=".7" />
        )),
      )}
      <g transform="translate(100 70)">
        {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
          <path key={a} d="M0-34 L6-16 L-6-16Z" fill="#ff5b6b" transform={`rotate(${a})`} />
        ))}
        <circle r="24" fill={`url(#${p}-red)`} />
        <circle r="9" fill="#2a0d12" opacity=".55" />
        <circle cx="-8" cy="-9" r="5" fill="#fff" opacity=".35" />
      </g>
      <path d="M150 34 l10 10 l-10 10 l-10-10Z" fill={`url(#${p}-gold)`} />
      <path d="M48 96 l8 8 l-8 8 l-8-8Z" fill={`url(#${p}-green)`} />
    </g>
  )
}

function Slots({ p }: ArtProps) {
  return (
    <g>
      <circle cx="100" cy="70" r="64" fill={`url(#${p}-glow)`} opacity=".55" />
      <rect x="44" y="12" width="112" height="116" rx="18" fill={`url(#${p}-red)`} stroke="#ff9a3d" strokeWidth="2" />
      <rect x="56" y="26" width="88" height="66" rx="10" fill="#0a0d14" stroke="#ffc857" strokeOpacity=".5" />
      {[0, 1, 2].map((i) => (
        <rect key={i} x={60 + i * 28} y="30" width="24" height="58" rx="5" fill="#f7f5ef" />
      ))}
      <circle cx="72" cy="48" r="7" fill="#ff2d3f" />
      <circle cx="66" cy="58" r="5" fill="#22e3a0" />
      <path d="M100 40 l8 14 l-8 14 l-8-14Z" fill="#ffc857" />
      <path d="M128 42 l10 10 l-10 10 l-10-10Z" fill="#4361ee" />
      <circle cx="72" cy="76" r="5" fill="#ffc857" />
      <circle cx="128" cy="76" r="5" fill="#ff2d3f" />
      <rect x="80" y="100" width="40" height="14" rx="7" fill={`url(#${p}-gold)`} />
      <rect x="38" y="4" width="124" height="10" rx="5" fill="#ffc857" opacity=".8" />
    </g>
  )
}

function Cards({ p }: ArtProps) {
  return (
    <g>
      <circle cx="100" cy="70" r="64" fill={`url(#${p}-glow)`} opacity=".45" />
      <ellipse cx="100" cy="112" rx="74" ry="22" fill="#0a2b22" />
      <g transform="translate(58 42) rotate(-16)">
        <rect width="42" height="60" rx="6" fill="#f7f5ef" stroke="#d21d33" strokeWidth="2" />
        <path d="M21 18 C10 8 4 20 21 32 C38 20 32 8 21 18Z" fill="#d21d33" />
      </g>
      <g transform="translate(100 34) rotate(4)">
        <rect width="42" height="60" rx="6" fill="#f7f5ef" stroke="#151922" strokeWidth="2" />
        <path d="M21 16 L31 34 L21 46 L11 34Z" fill="#151922" />
      </g>
      <g transform="translate(142 42) rotate(16)">
        <rect width="42" height="60" rx="6" fill="#f7f5ef" stroke="#151922" strokeWidth="2" />
        <path d="M21 18 C10 8 4 20 21 32 C38 20 32 8 21 18Z" fill="#151922" />
      </g>
      <g transform="translate(100 112)">
        <ellipse cy="10" rx="34" ry="12" fill={`url(#${p}-gold)`} />
        <ellipse cy="6" rx="34" ry="12" fill="#ffd47a" stroke="#fff1b8" strokeWidth="2" />
        <path d="M-20 6 h40 M-12 0 v12 M12 0 v12" stroke="#b5760c" strokeWidth="3" opacity=".7" />
      </g>
    </g>
  )
}

function Roulette({ p, wheel }: ArtProps & { wheel?: boolean }) {
  const colors = wheel
    ? ['#ff2d3f', '#ffc857', '#4361ee', '#22e3a0', '#a855f7', '#ff8a3d']
    : ['#e11d2e', '#151922', '#e11d2e', '#151922', '#e11d2e', '#151922', '#e11d2e', '#151922', '#e11d2e', '#151922', '#e11d2e', '#151922']
  const count = colors.length
  return (
    <g>
      <circle cx="100" cy="70" r="66" fill={`url(#${p}-glow)`} opacity=".6" />
      <circle cx="100" cy="70" r="54" fill="#0a0d14" stroke="#ffc857" strokeOpacity=".5" strokeWidth="3" />
      {colors.map((color, i) => {
        const a0 = (i * 2 * Math.PI) / count - Math.PI / 2
        const a1 = ((i + 1) * 2 * Math.PI) / count - Math.PI / 2
        const x0 = 100 + 48 * Math.cos(a0)
        const y0 = 70 + 48 * Math.sin(a0)
        const x1 = 100 + 48 * Math.cos(a1)
        const y1 = 70 + 48 * Math.sin(a1)
        return <path key={i} d={`M100 70 L${x0} ${y0} A48 48 0 0 1 ${x1} ${y1} Z`} fill={color} opacity=".95" />
      })}
      <circle cx="100" cy="70" r="24" fill={`url(#${p}-gold)`} />
      <circle cx="100" cy="70" r="13" fill="#0a0d14" stroke="#fff" strokeOpacity=".3" />
      <circle cx="128" cy="42" r="7" fill="#fff" stroke="#ffc857" strokeWidth="2" />
      {wheel && <path d="M100 6 l8 18 l-8 8 l-8-8Z" fill="#fff" stroke="#ffc857" strokeWidth="2" />}
    </g>
  )
}

function Plinko({ p }: ArtProps) {
  return (
    <g>
      <path d="M32 124 L100 12 L168 124Z" fill="#0d1420" stroke="#ffc857" strokeOpacity=".35" strokeWidth="2" />
      {[0, 1, 2, 3, 4].map((row) =>
        Array.from({ length: row + 1 }, (_, i) => {
          const x = 100 + (i - row / 2) * 24
          const y = 34 + row * 17
          return <circle key={`${row}-${i}`} cx={x} cy={y} r="3.4" fill={row % 2 ? '#ffc857' : '#ff5b6b'} opacity=".9" />
        }),
      )}
      <circle cx="88" cy="66" r="7" fill="#fff" stroke="#ff2d3f" strokeWidth="2" />
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <rect key={i} x={40 + i * 22} y="112" width="18" height="12" rx="3" fill={i % 2 ? '#22e3a0' : '#ffc857'} opacity=".85" />
      ))}
      <circle cx="100" cy="70" r="64" fill={`url(#${p}-glow)`} opacity=".25" />
    </g>
  )
}

function Dice({ p }: ArtProps) {
  const pips = (cx: number, cy: number, list: [number, number][]) =>
    list.map(([dx, dy], i) => <circle key={i} cx={cx + dx} cy={cy + dy} r="4" fill="#151922" />)
  return (
    <g>
      <circle cx="100" cy="70" r="64" fill={`url(#${p}-glow)`} opacity=".45" />
      <g transform="translate(24 24) rotate(-14)">
        <rect width="78" height="78" rx="16" fill="#f7f5ef" stroke="#fff" strokeWidth="2" />
        {pips(39, 39, [[-18, -18], [18, 18], [0, 0]])}
      </g>
      <g transform="translate(104 42) rotate(16)">
        <rect width="70" height="70" rx="15" fill={`url(#${p}-red)`} stroke="#ff9a3d" strokeWidth="2" />
        <g fill="#fff">
          <circle cx="21" cy="21" r="4" />
          <circle cx="49" cy="21" r="4" />
          <circle cx="35" cy="35" r="4" />
          <circle cx="21" cy="49" r="4" />
          <circle cx="49" cy="49" r="4" />
        </g>
      </g>
    </g>
  )
}

function Keno({ p }: ArtProps) {
  return (
    <g>
      <circle cx="100" cy="70" r="64" fill={`url(#${p}-glow)`} opacity=".45" />
      <circle cx="100" cy="70" r="52" fill="#101725" stroke="#ffc857" strokeOpacity=".5" strokeWidth="3" />
      <path d="M52 46 Q100 20 148 46" fill="none" stroke="#ffc857" strokeWidth="3" opacity=".6" />
      {[[74, 54], [104, 42], [132, 56], [84, 84], [116, 88], [98, 108]].map(([x, y], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r="13" fill={i % 3 === 0 ? '#ff2d3f' : i % 3 === 1 ? '#22e3a0' : '#4361ee'} stroke="#fff" strokeOpacity=".6" strokeWidth="2" />
          <circle cx={x - 4} cy={y - 4} r="3" fill="#fff" opacity=".5" />
        </g>
      ))}
    </g>
  )
}

function Balloon({ p }: ArtProps) {
  return (
    <g>
      <circle cx="100" cy="70" r="64" fill={`url(#${p}-glow)`} opacity=".35" />
      {([[62, 56, '#ff2d3f'], [104, 38, '#ffc857'], [142, 64, '#4361ee']] as const).map(([x, y, color], i) => (
        <g key={i}>
          <path d={`M${x} ${y - 26} C${x - 24} ${y - 20} ${x - 24} ${y + 14} ${x} ${y + 22} C${x + 24} ${y + 14} ${x + 24} ${y - 20} ${x} ${y - 26}Z`} fill={color as string} stroke="#fff" strokeOpacity=".45" strokeWidth="2" />
          <path d={`M${x} ${y + 22} l-5 8 l10 0Z`} fill={color as string} />
          <path d={`M${x} ${y + 30} q-8 18 2 34`} fill="none" stroke="#fff" strokeOpacity=".35" strokeWidth="2" />
        </g>
      ))}
      <path d="M28 120 q20-12 40 0 q20 12 40 0 q20-12 40 0 q20 12 40 0" fill="none" stroke="#22e3a0" strokeOpacity=".4" strokeWidth="3" />
    </g>
  )
}

function Scratch({ p }: ArtProps) {
  return (
    <g>
      <circle cx="100" cy="70" r="64" fill={`url(#${p}-glow)`} opacity=".45" />
      <g transform="rotate(-7 100 70)">
        <rect x="38" y="32" width="124" height="78" rx="12" fill={`url(#${p}-gold)`} stroke="#fff1b8" strokeWidth="2" />
        <rect x="48" y="42" width="104" height="58" rx="8" fill="#c8ced8" />
        <path d="M52 88 L92 46 M72 98 L118 46 M98 98 L146 52" stroke="#fff" strokeOpacity=".55" strokeWidth="4" strokeLinecap="round" />
        <circle cx="100" cy="70" r="17" fill="#ffc857" stroke="#fff" strokeWidth="2" />
        <path d="M100 58 l3 9 l9 3 l-9 3 l-3 9 l-3-9 l-9-3 l9-3Z" fill="#fff" />
      </g>
    </g>
  )
}

function Tower({ p }: ArtProps) {
  return (
    <g>
      <circle cx="100" cy="70" r="64" fill={`url(#${p}-glow)`} opacity=".4" />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect
          key={i}
          x={72 - i * 4}
          y={108 - i * 20}
          width={56 + i * 8}
          height="16"
          rx="4"
          fill={i % 2 ? '#ff2d3f' : '#ffc857'}
          stroke="#fff"
          strokeOpacity=".35"
        />
      ))}
      <path d="M100 4 l5 12 l12 5 l-12 5 l-5 12 l-5-12 l-12-5 l12-5Z" fill="#22e3a0" />
    </g>
  )
}

function Arcade({ p }: ArtProps) {
  return (
    <g>
      <circle cx="100" cy="70" r="64" fill={`url(#${p}-glow)`} opacity=".45" />
      <path d="M100 116 L34 132 M100 116 L166 132 M100 116 L100 134" stroke="#22e3a0" strokeOpacity=".5" strokeWidth="2" />
      {[0, 1, 2].map((i) => (
        <path key={i} d={`M${36 + i * 20} ${126 - i * 4} L${164 - i * 20} ${126 - i * 4}`} stroke="#4361ee" strokeOpacity=".4" strokeWidth="1.5" />
      ))}
      <g transform="translate(100 66)">
        <path d="M0-28 L26 18 L10 12 L0 26 L-10 12 L-26 18Z" fill={`url(#${p}-red)`} stroke="#ff9a3d" strokeWidth="2" />
        <circle cy="-2" r="8" fill={`url(#${p}-blue)`} stroke="#fff" strokeWidth="2" />
        <path d="M-6 24 L0 40 L6 24Z" fill="#ffc857" />
      </g>
      {[[30, 28], [168, 24], [46, 100], [158, 96]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.5" fill="#fff" opacity=".7" />
      ))}
    </g>
  )
}

function Coin({ p }: ArtProps) {
  return (
    <g>
      <circle cx="100" cy="70" r="64" fill={`url(#${p}-glow)`} opacity=".4" />
      <circle cx="100" cy="70" r="44" fill={`url(#${p}-gold)`} stroke="#fff1b8" strokeWidth="3" />
      <circle cx="100" cy="70" r="33" fill="none" stroke="#b5760c" strokeOpacity=".6" strokeWidth="3" />
      <path d="M100 45 l7 17 l18 1 l-14 11 l5 18 l-16-10 l-16 10 l5-18 l-14-11 l18-1Z" fill="#fff" opacity=".85" />
    </g>
  )
}

function Fallback({ p }: ArtProps) {
  return (
    <g>
      <circle cx="100" cy="70" r="64" fill={`url(#${p}-glow)`} opacity=".4" />
      <rect x="42" y="30" width="82" height="82" rx="14" fill="#f7f5ef" transform="rotate(-10 83 71)" />
      <rect x="76" y="32" width="82" height="82" rx="14" fill={`url(#${p}-red)`} transform="rotate(12 117 73)" />
      <circle cx="102" cy="70" r="18" fill={`url(#${p}-gold)`} stroke="#fff" strokeWidth="3" />
    </g>
  )
}

/** Número estável por id: cada arte recebe decoração e ritmo diferentes. */
function seedFor(id: string): number {
  let h = 7
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0
  return Math.abs(h)
}

function Decor({ p, seed }: ArtProps & { seed: number }) {
  const variant = seed % 4
  const count = 4 + (seed % 4)
  return (
    <g opacity=".55">
      {variant === 0 && (
        <>
          <circle cx="100" cy="70" r="58" fill="none" stroke={`url(#${p}-gold)`} strokeWidth="1" strokeDasharray="3 9" opacity=".7" />
          <circle cx="100" cy="70" r="44" fill="none" stroke="#fff" strokeOpacity=".12" strokeWidth="1" />
        </>
      )}
      {variant === 1 && (
        <>
          {[0, 1, 2, 3].map((i) => (
            <path key={i} d={`M${18 + i * 12} 132 L${74 + i * 16} 8`} stroke={`url(#${p}-blue)`} strokeWidth="1.5" opacity=".35" />
          ))}
          <circle cx="100" cy="70" r="54" fill="none" stroke="#ffc857" strokeOpacity=".18" strokeWidth="2" />
        </>
      )}
      {variant === 2 && (
        <>
          {Array.from({ length: count }, (_, i) => (
            <path
              key={i}
              d={`M${100 + Math.cos((i * Math.PI * 2) / count) * 58} ${70 + Math.sin((i * Math.PI * 2) / count) * 48} l4 8 l-9 0Z`}
              fill={i % 2 ? '#ffc857' : '#ff5b6b'}
              opacity=".7"
            />
          ))}
          <rect x="36" y="18" width="128" height="104" rx="24" fill="none" stroke="#fff" strokeOpacity=".1" />
        </>
      )}
      {variant === 3 && (
        <>
          {[0, 1, 2].map((i) => (
            <path
              key={i}
              d={`M18 ${42 + i * 26} q24 -14 48 0 t48 0 t48 0`}
              fill="none"
              stroke={i === 1 ? '#22e3a0' : '#ffc857'}
              strokeOpacity=".22"
              strokeWidth="2"
            />
          ))}
          <circle cx="100" cy="70" r="52" fill="none" stroke="#fff" strokeOpacity=".08" strokeWidth="8" />
        </>
      )}
      {Array.from({ length: 3 + (seed % 3) }, (_, i) => (
        <path
          key={`spark-${i}`}
          d={`M${20 + ((seed + i * 37) % 160)} ${16 + ((seed + i * 53) % 110)} l2 5 l5 2 l-5 2 l-2 5 l-2-5 l-5-2 l5-2Z`}
          fill="#fff"
          opacity=".55"
        />
      ))}
    </g>
  )
}

function artFor(game: Game, p: string) {
  const props = { p }
  switch (game.engine) {
    case 'crash':
      return /rocket|space|cosmic|jet|turbo|sky/i.test(game.id) ? <Rocket {...props} /> : <Plane {...props} />
    case 'limbo':
      return <Rocket {...props} />
    case 'mines':
      return <Mine {...props} />
    case 'slots':
      return <Slots {...props} />
    case 'roulette':
      return <Roulette {...props} />
    case 'plinko':
      return <Plinko {...props} />
    case 'dice':
      return <Dice {...props} />
    case 'wheel':
    case 'colorPrediction':
      return <Roulette {...props} wheel />
    case 'keno':
    case 'luckyNumber':
      return <Keno {...props} />
    case 'balloon':
      return <Balloon {...props} />
    case 'scratch':
      return <Scratch {...props} />
    case 'tower':
      return <Tower {...props} />
    case 'arcadeRunner':
    case 'arcadeShooter':
    case 'arcadeRace':
    case 'arcadeCatcher':
    case 'arcadeQuest':
      return <Arcade {...props} />
    case 'coinFlip':
    case 'hiLo':
      return <Coin {...props} />
    case 'blackjack':
    case 'baccarat':
    case 'videoPoker':
    case 'texasHoldem':
    case 'threeCardPoker':
    case 'caribbeanPoker':
      return <Cards {...props} />
    default:
      return <Fallback {...props} />
  }
}

/** Vector original desenhado especificamente para o motor/jogo. */
export function GameArt({ game, className = '' }: { game: Game; className?: string }) {
  const p = `art${useId().replace(/:/g, '')}`
  return (
    <svg viewBox="0 0 200 140" className={className} role="img" aria-label={`Arte de ${game.name}`} preserveAspectRatio="xMidYMid meet">
      <Defs p={p} />
      <Decor p={p} seed={seedFor(game.id)} />
      {artFor(game, p)}
    </svg>
  )
}

/** Versão grande e suave para fundos de palco/hero. */
export function GameArtWatermark({ game, className = '' }: { game: Game; className?: string }) {
  const p = `wm${useId().replace(/:/g, '')}`
  return (
    <svg viewBox="0 0 200 140" className={className} aria-hidden="true" preserveAspectRatio="xMidYMid meet">
      <Defs p={p} />
      <Decor p={p} seed={seedFor(game.id)} />
      {artFor(game, p)}
    </svg>
  )
}
