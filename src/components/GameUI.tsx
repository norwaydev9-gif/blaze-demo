import { useState } from 'react'
import type { ReactNode } from 'react'
import { clamp, fmt } from '../lib/format'
import { useWallet } from '../lib/wallet'
import { useSound } from '../lib/sound'
import { Icon } from './Icon'

export function GameLayout({
  stage,
  side,
  wide = false,
  dock = true,
}: {
  stage: ReactNode
  side: ReactNode
  wide?: boolean
  /** Desativa a dock móvel quando os controlos já vivem dentro do tabuleiro. */
  dock?: boolean
}) {
  const [open, setOpen] = useState(false)

  return (
    <div
      className={`game-layout ${dock ? '' : 'game-layout-no-dock'} grid gap-4 ${
        wide ? 'lg:grid-cols-[1fr_300px]' : 'lg:grid-cols-[1fr_320px]'
      }`}
    >
      <div className="game-stage-wrap min-w-0">{stage}</div>
      <div className={`game-side min-w-0 ${open ? 'is-open' : ''}`}>
        {dock && (
          <button
            type="button"
            className="game-dock-handle lg:hidden"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            <span className="game-dock-grip" />
            <Icon name="wallet" size={15} className="shrink-0 text-brand" />
            <span className="text-[11px] font-bold uppercase tracking-[.12em] text-white/70">Controlos de aposta</span>
            <Icon
              name="chevron"
              size={16}
              className={`ml-auto shrink-0 text-white/40 transition-transform duration-200 ${open ? 'rotate-90' : '-rotate-90'}`}
            />
          </button>
        )}
        <div className="game-side-content">{side}</div>
      </div>
    </div>
  )
}

export function Stage({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`game-stage ${className}`}>{children}</div>
}

export function SidePanel({ children, title, icon = 'wallet' }: { children: ReactNode; title?: string; icon?: 'wallet' | 'info' }) {
  return (
    <div className="panel overflow-hidden">
      {title && (
        <div className="flex items-center gap-2 border-b border-line/70 px-4 py-3">
          <Icon name={icon} size={14} className="text-white/30" />
          <span className="text-[11px] font-bold uppercase tracking-[.14em] text-white/40">{title}</span>
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  )
}

export function BetInput({
  value,
  onChange,
  min,
  max,
  disabled = false,
  label = 'Valor da aposta',
}: {
  value: number
  onChange: (n: number) => void
  min: number
  max: number
  disabled?: boolean
  label?: string
}) {
  const { balance } = useWallet()
  const { play } = useSound()
  const set = (n: number) => {
    play('tick')
    onChange(clamp(Math.round(n * 100) / 100, min, Math.min(max, Math.max(min, balance))))
  }
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="label">{label}</span>
        <span className="text-[10px] tabular text-white/30">máx. {fmt(Math.min(max, balance))}</span>
      </div>
      <div className="flex items-stretch overflow-hidden rounded-xl border border-line bg-black/30 focus-within:border-brand/50">
        <button type="button" disabled={disabled} className="w-10 shrink-0 text-lg text-white/40 transition hover:bg-white/5 hover:text-white" onClick={() => set(value - 10)}>
          −
        </button>
        <div className="relative flex-1">
          <input
            type="number"
            inputMode="decimal"
            value={value}
            disabled={disabled}
            min={min}
            max={max}
            onChange={(e) => onChange(Number(e.target.value))}
            onBlur={() => set(Number.isFinite(value) ? value : min)}
            className="w-full bg-transparent py-2.5 text-center text-base font-bold tabular text-white outline-none disabled:opacity-50"
          />
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-white/25">B$</span>
        </div>
        <button type="button" disabled={disabled} className="w-10 shrink-0 text-lg text-white/40 transition hover:bg-white/5 hover:text-white" onClick={() => set(value + 10)}>
          +
        </button>
      </div>
      <div className="mt-2 grid grid-cols-4 gap-1.5">
        {[min, 100, 500, Math.max(min, Math.min(max, Math.floor(balance / 2)))].map((n, i) => (
          <button
            key={`${n}-${i}`}
            type="button"
            disabled={disabled}
            onClick={() => set(n)}
            className="rounded-lg border border-line bg-white/[.02] py-1.5 text-[10px] font-semibold text-white/50 transition hover:border-white/20 hover:text-white disabled:opacity-40"
          >
            {i === 3 ? '½ saldo' : fmt(n).replace(',00', '')}
          </button>
        ))}
      </div>
    </div>
  )
}

export function ResultBanner({
  state,
  win,
  text,
  sub,
}: {
  state: 'idle' | 'win' | 'lose' | 'push'
  win?: number
  text: string
  sub?: string
}) {
  if (state === 'idle') return null
  const good = state === 'win'
  return (
    <div
      className={`mt-3 flex items-center gap-3 rounded-xl border px-3 py-2.5 animate-popIn ${
        good ? 'border-good/30 bg-good/10' : state === 'push' ? 'border-line bg-white/[.04]' : 'border-brand/30 bg-brand/10'
      }`}
    >
      <span className={`grid h-8 w-8 shrink-0 place-items-center rounded-lg ${good ? 'bg-good/20 text-good' : state === 'push' ? 'bg-white/10 text-white/60' : 'bg-brand/20 text-brand'}`}>
        <Icon name={good ? 'trophy' : state === 'push' ? 'info' : 'close'} size={15} />
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-xs font-bold ${good ? 'text-good' : state === 'push' ? 'text-white/70' : 'text-brand'}`}>{text}</p>
        {sub && <p className="truncate text-[10px] text-white/40">{sub}</p>}
      </div>
      {win !== undefined && win > 0 && <span className="shrink-0 text-sm font-extrabold tabular text-good">+{fmt(win)}</span>}
    </div>
  )
}

export function RecentStrip({
  items,
  label = 'Últimos resultados',
  colorFor,
}: {
  items: (string | number)[]
  label?: string
  colorFor?: (item: string | number) => string
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between">
        <span className="label">{label}</span>
        <span className="text-[10px] text-white/25">ao vivo</span>
      </div>
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto">
        {items.length === 0 && <span className="text-[11px] text-white/25">Ainda sem rondas.</span>}
        {items.map((it, i) => (
          <span
            key={`${it}-${i}`}
            className={`shrink-0 rounded-md border border-line/70 bg-white/[.03] px-2 py-1 text-[10px] font-bold tabular ${colorFor ? colorFor(it) : 'text-white/60'}`}
          >
            {it}
          </span>
        ))}
      </div>
    </div>
  )
}

export function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-xl border border-line/60 bg-black/20 px-3 py-2">
      <p className="text-[9px] font-semibold uppercase tracking-wider text-white/30">{label}</p>
      <p className={`mt-0.5 text-sm font-bold tabular ${accent ? 'text-gold' : 'text-white'}`}>{value}</p>
    </div>
  )
}

export function BigButton({
  onClick,
  disabled,
  children,
  tone = 'brand',
  className = '',
}: {
  onClick: () => void
  disabled?: boolean
  children: ReactNode
  tone?: 'brand' | 'good' | 'gold' | 'ghost'
  className?: string
}) {
  const cls =
    tone === 'good' ? 'btn-good' : tone === 'gold' ? 'btn-gold' : tone === 'ghost' ? 'btn-ghost' : 'btn-primary'
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`${cls} w-full py-3 text-sm ${className}`}>
      {children}
    </button>
  )
}

export function Payout({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-black/20 px-3 py-2">
      <span className="text-[11px] text-white/40">{label}</span>
      <span className="text-xs font-bold tabular text-white/80">{value}</span>
    </div>
  )
}
