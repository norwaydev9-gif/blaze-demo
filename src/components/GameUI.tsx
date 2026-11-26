import { useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { clamp, fmt, fmtMult } from '../lib/format'
import { useRoute } from '../lib/router'
import { getGame } from '../lib/games'
import { useWallet } from '../lib/wallet'
import { useSound } from '../lib/sound'
import { Icon } from './Icon'
import type { IconName } from './Icon'

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
  const route = useRoute()
  const game = route.segments[0] === 'jogo' ? getGame(route.segments[1]) : undefined
  return (
    <div
      className={`game-stage ${className}`}
      data-category={game?.category ?? 'instant'}
      data-game={game?.id ?? undefined}
    >
      {children}
    </div>
  )
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
  const ceiling = Math.min(max, balance)
  const canBet = ceiling >= min
  const blocked = disabled || !canBet
  const set = (n: number) => {
    if (!canBet) return
    play('tick')
    onChange(clamp(Math.round(n * 100) / 100, min, ceiling))
  }
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className="label">{label}</span>
        <span className={`text-[10px] tabular ${canBet ? 'text-white/30' : 'text-brand'}`}>
          {canBet ? `máx. ${fmt(ceiling)}` : 'saldo insuficiente'}
        </span>
      </div>
      <div className="flex items-stretch overflow-hidden rounded-xl border border-line bg-black/30 focus-within:border-brand/50">
        <button type="button" disabled={blocked} className="h-11 w-11 shrink-0 text-lg text-white/40 transition hover:bg-white/5 hover:text-white" onClick={() => set(value - 10)}>
          −
        </button>
        <div className="relative flex-1">
          <input
            type="number"
            inputMode="decimal"
            value={value}
            disabled={blocked}
            min={min}
            max={ceiling}
            onChange={(e) => {
              const n = Number(e.target.value)
              if (Number.isFinite(n)) onChange(n)
            }}
            onBlur={() => set(Number.isFinite(value) ? value : min)}
            className="w-full bg-transparent py-2.5 text-center text-base font-bold tabular text-white outline-none disabled:opacity-50"
          />
          <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-white/25">B$</span>
        </div>
        <button type="button" disabled={blocked} className="h-11 w-11 shrink-0 text-lg text-white/40 transition hover:bg-white/5 hover:text-white" onClick={() => set(value + 10)}>
          +
        </button>
      </div>
      <div className="mt-2 grid grid-cols-4 gap-1.5">
        {[min, 100, 500, Math.floor(balance / 2)].map((n, i) => (
          <button
            key={`${n}-${i}`}
            type="button"
            disabled={blocked}
            onClick={() => set(n)}
            className="h-11 rounded-lg border border-line bg-white/[.02] px-1 text-[11px] font-semibold text-white/50 transition hover:border-white/20 hover:text-white disabled:opacity-40"
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
      className={`relative mt-3 flex items-center gap-3 overflow-hidden rounded-xl border px-3 py-2.5 animate-popIn ${
        good ? 'border-good/40 bg-gradient-to-r from-good/20 via-good/10 to-gold/10' : state === 'push' ? 'border-line bg-white/[.04]' : 'border-brand/30 bg-brand/10'
      }`}
    >
      {good && <span className="pointer-events-none absolute inset-0 animate-winFlash bg-gradient-to-r from-good/25 via-gold/20 to-good/25" />}
      {good &&
        [6, 18, 30, 42, 54, 66, 78, 90].map((left, i) => (
          <span
            key={left}
            className="confetti"
            style={{ left: `${left}%`, top: '45%', background: i % 2 ? '#ffc857' : '#22e3a0', animationDelay: `${i * 0.08}s` }}
          />
        ))}
      <span className={`relative z-10 grid h-8 w-8 shrink-0 place-items-center rounded-lg ${good ? 'bg-good/20 text-good' : state === 'push' ? 'bg-white/10 text-white/60' : 'bg-brand/20 text-brand'}`}>
        <Icon name={good ? 'trophy' : state === 'push' ? 'info' : 'close'} size={15} />
      </span>
      <div className="relative z-10 min-w-0 flex-1">
        <p className={`text-xs font-bold ${good ? 'text-good' : state === 'push' ? 'text-white/70' : 'text-brand'}`}>{text}</p>
        {sub && <p className="truncate text-[10px] text-white/40">{sub}</p>}
      </div>
      {win !== undefined && win > 0 && <span className="relative z-10 shrink-0 text-sm font-extrabold tabular text-good">+{fmt(win)}</span>}
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

export function ActionButton({
  children,
  onClick,
  disabled,
  loading = false,
  tone = 'bet',
  size = 'full',
  icon,
  active = false,
  className = '',
}: {
  children: ReactNode
  onClick: () => void
  disabled?: boolean
  loading?: boolean
  tone?: 'bet' | 'placed' | 'cashout' | 'gold' | 'ghost' | 'auto'
  size?: 'full' | 'half' | 'compact'
  icon?: IconName
  active?: boolean
  className?: string
}) {
  const toneClass =
    tone === 'placed'
      ? 'action-placed'
      : tone === 'cashout'
        ? 'action-cashout'
        : tone === 'gold'
          ? 'action-gold'
          : tone === 'ghost'
            ? 'action-ghost'
            : tone === 'auto'
              ? `action-auto${active ? ' is-active' : ''}`
              : 'action-bet'
  const sizeClass =
    size === 'compact'
      ? 'w-auto min-h-[44px] rounded-xl px-3 text-xs'
      : size === 'half'
        ? 'w-full sm:w-auto'
        : 'w-full'
  return (
    <button type="button" onClick={onClick} disabled={disabled} className={`${toneClass} ${sizeClass} ${className}`}>
      {loading && <span className="h-4 w-4 shrink-0 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {icon && !loading && (
        <span className="action-icon">
          <Icon name={icon} size={16} />
        </span>
      )}
      <span className="min-w-0 truncate">{children}</span>
    </button>
  )
}

export function AutoControl({
  value,
  onValueChange,
  active,
  onToggle,
  label = 'Auto-retirar',
  min = 1.01,
  step = 0.1,
  suffix = '×',
  disabled = false,
  current,
  currentLabel = 'Multiplicador atual',
}: {
  value: number
  onValueChange: (n: number) => void
  active: boolean
  onToggle: () => void
  label?: string
  min?: number
  step?: number
  suffix?: string
  disabled?: boolean
  /** Valor em tempo real (multiplicador, nível, etc.) para mostrar o progresso até ao alvo. */
  current?: number
  currentLabel?: string
}) {
  const { play } = useSound()
  const target = Number.isFinite(value) && value > min ? value : min
  const progress =
    current !== undefined && Number.isFinite(current)
      ? clamp(((current - 1) / (target - 1)) * 100, 0, 100)
      : 0
  const reached = current !== undefined && current >= target

  return (
    <div>
      <div className="mt-2 grid grid-cols-[1fr_auto] items-center gap-2">
        <label className="flex min-w-0 items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/50">
          <span className="truncate">{label}</span>
          <span className="relative min-w-0 flex-1">
            <input
              type="number"
              inputMode="decimal"
              step={step}
              min={min}
              value={value}
              disabled={disabled}
              onChange={(e) => onValueChange(Number(e.target.value))}
              className="h-11 w-full min-w-0 rounded-lg border border-white/15 bg-black/60 pl-2 pr-6 text-center text-[11px] font-bold tabular text-white outline-none focus:border-good/60"
            />
            <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-bold text-white/50">{suffix}</span>
          </span>
        </label>
        <ActionButton
          tone="auto"
          size="compact"
          active={active}
          disabled={disabled}
          onClick={() => {
            play('tick')
            onToggle()
          }}
          className="w-auto min-w-[74px] px-2"
        >
          AUTO
        </ActionButton>
      </div>
      {active && current !== undefined && (
        <div className="mt-2 rounded-lg border border-good/25 bg-good/[.07] px-2.5 py-2">
          <div className="flex items-center justify-between gap-2 text-[10px] font-bold tabular">
            <span className="truncate text-white/50">{currentLabel}</span>
            <span className={reached ? 'text-good' : 'text-white/80'}>
              {current.toFixed(2)}{suffix} / {target.toFixed(2)}{suffix}
            </span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-black/50">
            <div
              className={`h-full rounded-full transition-all duration-150 ${reached ? 'bg-good' : 'bg-gradient-to-r from-[#ff2d3f] to-[#22e3a0]'}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1 text-[9px] text-white/35">
            {reached ? 'Alvo atingido — a retirar agora.' : `Retirada automática aos ${fmtMult(target)}.`}
          </p>
        </div>
      )}
    </div>
  )
}

export function AutoBetControl({
  active,
  onToggle,
  disabled = false,
  label = 'Auto aposta',
  hint = 'Repete a ronda automaticamente',
  goal: goalProp,
}: {
  active: boolean
  onToggle: () => void
  disabled?: boolean
  label?: string
  hint?: string
  /** Meta de acompanhamento (10, 25 ou 50 voltas). Não interrompe a aposta. */
  goal?: number
}) {
  const { play } = useSound()
  const { tx } = useWallet()
  const route = useRoute()
  const gameId = route.segments[0] === 'jogo' ? route.segments[1] : undefined
  const [ownGoal, setOwnGoal] = useState(10)
  const goal = goalProp ?? ownGoal

  const stats = useMemo(() => {
    const list = tx.filter((t) => t.gameId === gameId && (t.type === 'bet' || t.type === 'win'))
    const bets = list.filter((t) => t.type === 'bet')
    const wins = list.filter((t) => t.type === 'win')
    const wagered = bets.reduce((sum, t) => sum + Math.abs(t.amount), 0)
    const won = wins.reduce((sum, t) => sum + t.amount, 0)
    return { rounds: bets.length, wins: wins.length, wagered, won, net: won - wagered }
  }, [tx, gameId])

  const rate = stats.rounds > 0 ? Math.round((stats.wins / stats.rounds) * 100) : 0
  const roi = stats.wagered > 0 ? Math.round((stats.won / stats.wagered) * 100) : 0
  const progress = clamp((stats.rounds / goal) * 100, 0, 100)

  return (
    <div className="mt-2 overflow-hidden rounded-xl border border-white/10 bg-[#05060a]/80">
      <div className="flex items-center gap-3 px-3 py-2">
        <ActionButton
          tone="auto"
          size="compact"
          active={active}
          disabled={disabled}
          onClick={() => {
            play('tick')
            onToggle()
          }}
          className="w-auto min-w-[74px] px-2"
        >
          AUTO
        </ActionButton>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold text-white/80">{label}</p>
          <p className="truncate text-[10px] text-white/45">
            {active ? 'A repetir a ronda automaticamente' : hint}
          </p>
        </div>
      </div>

      {(stats.rounds > 0 || active) && (
        <div className="border-t border-white/10 px-3 pb-2.5 pt-2">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <span className="truncate text-[10px] font-bold uppercase tracking-wider text-white/50">
              Progresso · {stats.rounds}/{goal} voltas
            </span>
            {goalProp === undefined && (
              <button
                type="button"
                title="Meta de acompanhamento (não para a aposta automaticamente)"
                onClick={() => setOwnGoal((g) => (g === 10 ? 25 : g === 25 ? 50 : 10))}
                className="shrink-0 rounded-md border border-white/15 bg-white/[.06] px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-white/60 transition hover:border-white/30 hover:text-white"
              >
                meta {goal} ↻
              </button>
            )}
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-black/60">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                active ? 'bg-gradient-to-r from-[#ff2d3f] to-[#22e3a0]' : 'bg-gradient-to-r from-[#22e3a0] to-[#6dffd0]'
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1.5 text-center">
            <div className="rounded-lg bg-white/[.04] py-1.5">
              <p className="text-[9px] uppercase tracking-wider text-white/35">Acertos</p>
              <p className="text-xs font-extrabold tabular text-white/85">{rate}%</p>
            </div>
            <div className="rounded-lg bg-white/[.04] py-1.5">
              <p className="text-[9px] uppercase tracking-wider text-white/35">Retorno</p>
              <p className={`text-xs font-extrabold tabular ${roi >= 100 ? 'text-good' : 'text-gold'}`}>{roi}%</p>
            </div>
            <div className="rounded-lg bg-white/[.04] py-1.5">
              <p className="text-[9px] uppercase tracking-wider text-white/35">Sessão</p>
              <p className={`text-xs font-extrabold tabular ${stats.net >= 0 ? 'text-good' : 'text-brand'}`}>
                {stats.net >= 0 ? '+' : '−'}{fmt(Math.abs(stats.net))}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
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
