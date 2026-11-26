import { useState } from 'react'
import type { Game } from '../lib/types'
import { fmt, fmtMult } from '../lib/format'
import { hashHex, uid } from '../lib/rng'
import { useWallet } from '../lib/wallet'
import { Icon } from '../components/Icon'

/** Aposta única com liquidação auditável na carteira demo. */
export function useStake(game: Game) {
  const { balance, placeBet, payout } = useWallet()
  const [amount, setAmount] = useState(() => Math.min(game.minBet, game.maxBet))

  const stake = (detail?: string) => placeBet(amount, game.name, game.id, detail)

  const win = (mult: number, bet = amount, detail?: string) => {
    const value = Math.round(bet * mult * 100) / 100
    if (value > 0) payout(value, game.name, game.id, detail ?? `Ganho ${fmtMult(mult)}`)
    return value
  }

  const push = (bet = amount, detail = 'Aposta devolvida') => {
    if (bet > 0) payout(bet, game.name, game.id, detail)
  }

  return {
    amount,
    setAmount,
    balance,
    min: game.minBet,
    max: game.maxBet,
    stake,
    win,
    push,
  }
}

export type Stake = ReturnType<typeof useStake>

export function newSeed(): string {
  return hashHex(uid())
}

/** Prova simples da ronda demo: hash do seed local. */
export function Fairness({ seed, compact = false }: { seed: string; compact?: boolean }) {
  return (
    <div className={`rounded-xl border border-line/60 bg-black/20 ${compact ? 'p-2.5' : 'p-3'}`}>
      <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white/40">
        <Icon name="shield" size={12} /> Prova da ronda
      </p>
      <p className="mt-1.5 break-all font-mono text-[10px] leading-relaxed text-white/30">{seed}</p>
      {!compact && (
        <p className="mt-2 text-[10px] leading-snug text-white/25">
          Hash FNV-1a do seed local. Num operador licenciado, o servidor publicaria o hash do seed antes da ronda e revelaria o seed depois.
        </p>
      )}
    </div>
  )
}

export function configNum(game: Game, key: string, fallback: number): number {
  const value = game.config[key]
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

export function configList<T = string>(game: Game, key: string, fallback: T[]): T[] {
  const value = game.config[key]
  return Array.isArray(value) ? (value as T[]) : fallback
}

export function money(n: number): string {
  return `${fmt(n)} B$`
}
