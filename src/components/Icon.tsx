import type { SVGProps } from 'react'

export type IconName =
  | 'home'
  | 'grid'
  | 'crash'
  | 'mines'
  | 'slots'
  | 'bolt'
  | 'cards'
  | 'arcade'
  | 'crown'
  | 'gift'
  | 'wallet'
  | 'clock'
  | 'trophy'
  | 'heart'
  | 'search'
  | 'bell'
  | 'plus'
  | 'menu'
  | 'close'
  | 'sound'
  | 'mute'
  | 'chevron'
  | 'back'
  | 'shield'
  | 'info'
  | 'check'
  | 'spark'
  | 'user'
  | 'logout'

const paths: Record<IconName, string> = {
  home: 'M3 10.5 12 3l9 7.5V21a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z',
  grid: 'M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z',
  crash: 'M3 17l5-5 3 3 7-8M14 7h4v4',
  mines: 'M12 3v3m0 12v3M3 12h3m12 0h3M6 6l2 2m8 8 2 2m0-12-2 2M8 16l-2 2M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
  slots: 'M4 5h16v14H4zM8 9h.01M12 9h.01M16 9h.01M8 13h.01M12 13h.01M16 13h.01',
  bolt: 'M13 2 4 14h6l-1 8 9-12h-6z',
  cards: 'M7 4h9a2 2 0 0 1 2 2v11M4 7h9a2 2 0 0 1 2 2v11H4z',
  arcade: 'M6 11h4m-2-2v4m6-1h.01M18 12h.01M7 6h10a4 4 0 0 1 4 4v6a2 2 0 0 1-3.5 1.3L16 15H8l-1.5 2.3A2 2 0 0 1 3 16v-6a4 4 0 0 1 4-4z',
  crown: 'M3 8l4 3 5-6 5 6 4-3-2 11H5z',
  gift: 'M4 9h16v4H4zM5 13h14v8H5zM12 9v12M12 9C9 9 7 8 7 6a2 2 0 0 1 4 0c0 1 1 3 1 3zm0 0c3 0 5-1 5-3a2 2 0 0 0-4 0c0 1-1 3-1 3z',
  wallet: 'M4 7h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM4 7V5a2 2 0 0 1 2-2h9v4m3 5h.01',
  clock: 'M12 7v5l3 2M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
  trophy: 'M8 4h8v5a4 4 0 0 1-8 0zM8 5H4v2a4 4 0 0 0 4 4m8-6h4v2a4 4 0 0 1-4 4m-4 5v4m-3 2h6',
  heart: 'M12 20s-7-4.5-7-9.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 7 3.5C19 15.5 12 20 12 20z',
  search: 'M10 17a7 7 0 1 0 0-14 7 7 0 0 0 0 14zm5-2 5 5',
  bell: 'M18 9a6 6 0 1 0-12 0c0 5-2 6-2 6h16s-2-1-2-6M10 20a2 2 0 0 0 4 0',
  plus: 'M12 5v14M5 12h14',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6 6 18',
  sound: 'M4 9h4l5-4v14l-5-4H4zM17 8a5 5 0 0 1 0 8M19.5 5.5a8.5 8.5 0 0 1 0 13',
  mute: 'M4 9h4l5-4v14l-5-4H4zM17 9l4 6m0-6-4 6',
  chevron: 'M9 6l6 6-6 6',
  back: 'M15 6l-6 6 6 6',
  shield: 'M12 3l8 3v6c0 5-4 8-8 9-4-1-8-4-8-9V6z',
  info: 'M12 11v6M12 7h.01M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z',
  check: 'M4 12l5 5L20 6',
  spark: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8zm-8 9a8 8 0 0 1 16 0',
  logout: 'M15 4h4a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-4M10 8l-4 4 4 4M6 12h10',
}

interface Props extends SVGProps<SVGSVGElement> {
  name: IconName
  size?: number
}

export function Icon({ name, size = 20, ...rest }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      <path d={paths[name]} />
    </svg>
  )
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5 select-none">
      <span className="relative grid h-9 w-9 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-[#ff2d3f] to-[#b3061a] shadow-[0_8px_24px_rgba(255,45,63,.35)]">
        <span className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,.35),transparent_60%)]" />
        <svg viewBox="0 0 24 24" className="relative h-5 w-5" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
        </svg>
      </span>
      {!compact && (
        <span className="leading-none">
          <span className="block font-display text-[19px] font-extrabold tracking-[.18em] text-white">BLAZE</span>
          <span className="mt-1 block text-[8.5px] font-semibold tracking-[.38em] text-white/35">CASINO</span>
        </span>
      )}
    </span>
  )
}
