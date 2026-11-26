import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Tx } from './types'
import { load, save } from './storage'
import { uid } from './rng'
import { GAMES, getGame } from './games'

const START_BALANCE = 5000
const BONUS_AMOUNT = 500
const BONUS_COOLDOWN = 1000 * 60 * 60 * 4 // demo: 4 horas
const MAX_CENTS = Math.floor(Number.MAX_SAFE_INTEGER / 100)
const MAX_TX = 400

interface WalletState {
  balance: number
  tx: Tx[]
  wagered: number
  won: number
  bonusAt: number
  resetAt: number
}

interface WalletApi extends WalletState {
  placeBet: (amount: number, game: string, gameId?: string, detail?: string) => boolean
  payout: (amount: number, game: string, gameId?: string, detail?: string) => void
  bonus: () => boolean
  bonusReady: boolean
  reset: () => void
  historyFor: (gameId: string) => Tx[]
}

const WalletCtx = createContext<WalletApi | null>(null)
const KEY = 'blaze.wallet.v1'

/** Dinheiro demo (B$): sempre em centavos, nunca negativo e dentro de Number.MAX_SAFE_INTEGER. */
function clampMoney(n: number): number {
  if (!Number.isFinite(n)) return 0
  const cents = Math.round(n * 100)
  if (!Number.isSafeInteger(cents)) return 0
  return Math.min(MAX_CENTS, Math.max(0, cents / 100))
}

function signedMoney(n: unknown): number | null {
  if (typeof n !== 'number' || !Number.isFinite(n)) return null
  const cents = Math.round(n * 100)
  if (!Number.isSafeInteger(cents)) return null
  const value = cents / 100
  return value === 0 ? null : value
}

function positiveMoney(n: unknown): number | null {
  const value = signedMoney(n)
  return value !== null && value > 0 && value <= MAX_CENTS ? value : null
}

function addMoney(a: number, b: number): number {
  return clampMoney(clampMoney(a) + b)
}

function finiteOr(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

/** Limites do catálogo, quando o jogo é identificável. Nunca inventa limites. */
function gameLimits(game: string, gameId?: string): { id?: string; min?: number; max?: number } {
  const cfg = (gameId ? getGame(gameId) : undefined) ?? GAMES.find((g) => g.name === game)
  if (!cfg) return { id: gameId }
  const min = positiveMoney(cfg.minBet) ?? undefined
  const max = positiveMoney(cfg.maxBet) ?? undefined
  return {
    id: cfg.id,
    min,
    max: max !== undefined && (min === undefined || max >= min) ? max : undefined,
  }
}

function cleanTx(tx: unknown): tx is Tx {
  if (!tx || typeof tx !== 'object' || Array.isArray(tx)) return false
  const t = tx as Record<string, unknown>
  return (
    typeof t.id === 'string' &&
    typeof t.ts === 'number' && Number.isFinite(t.ts) &&
    typeof t.game === 'string' &&
    (t.gameId === undefined || typeof t.gameId === 'string') &&
    (t.type === 'bet' || t.type === 'win' || t.type === 'bonus' || t.type === 'reset') &&
    typeof t.amount === 'number' && Number.isFinite(t.amount) &&
    typeof t.balanceAfter === 'number' && Number.isFinite(t.balanceAfter) &&
    (t.detail === undefined || typeof t.detail === 'string')
  )
}

function initial(): WalletState {
  return {
    balance: START_BALANCE,
    tx: [],
    wagered: 0,
    won: 0,
    bonusAt: 0,
    resetAt: Date.now(),
  }
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>(() => {
    const fallback = initial()
    const raw = load<unknown>(KEY, fallback)
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return fallback
    const s = raw as Partial<WalletState>
    return {
      ...fallback,
      ...s,
      balance: clampMoney(finiteOr(s.balance, fallback.balance)),
      tx: Array.isArray(s.tx) ? s.tx.filter(cleanTx).slice(0, MAX_TX) : [],
      wagered: clampMoney(finiteOr(s.wagered, 0)),
      won: clampMoney(finiteOr(s.won, 0)),
      bonusAt: finiteOr(s.bonusAt, 0),
      resetAt: finiteOr(s.resetAt, fallback.resetAt),
    }
  })
  const [now, setNow] = useState(Date.now())
  const stateRef = useRef(state)
  stateRef.current = state

  useEffect(() => save(KEY, state), [state])
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(t)
  }, [])

  /** Único ponto que altera saldo: regista sempre id, ts, jogo, tipo, quantia e saldo após. */
  const push = useCallback(
    (prev: WalletState, tx: Omit<Tx, 'id' | 'ts' | 'balanceAfter'>): WalletState => {
      const amount = signedMoney(tx.amount)
      if (amount === null) return prev
      const entry: Tx = {
        ...tx,
        amount,
        id: uid(),
        ts: Date.now(),
        balanceAfter: clampMoney(clampMoney(prev.balance) + amount),
      }
      return {
        ...prev,
        balance: entry.balanceAfter,
        tx: [entry, ...prev.tx].slice(0, MAX_TX),
      }
    },
    [],
  )

  const placeBet = useCallback(
    (amount: number, game: string, gameId?: string, detail?: string) => {
      const value = positiveMoney(amount) // rejeita <=0, NaN, infinito, centavos acima do seguro
      if (value === null) return false
      const prev = stateRef.current
      const balance = clampMoney(prev.balance)
      if (value > balance) return false
      const limits = gameLimits(game, gameId)
      if (limits.min !== undefined && value < limits.min) return false
      if (limits.max !== undefined && value > limits.max) return false
      const next = push(
        { ...prev, balance, wagered: addMoney(prev.wagered, value) },
        { game, gameId: limits.id, type: 'bet', amount: -value, detail },
      )
      stateRef.current = next
      setState(next)
      return true
    },
    [push],
  )

  const payout = useCallback(
    (amount: number, game: string, gameId?: string, detail?: string) => {
      const value = positiveMoney(amount) // payout nunca negativo, zero, NaN ou infinito
      if (value === null) return
      const prev = stateRef.current
      const limits = gameLimits(game, gameId)
      const next = push(
        { ...prev, won: addMoney(prev.won, value) },
        { game, gameId: limits.id, type: 'win', amount: value, detail },
      )
      stateRef.current = next
      setState(next)
    },
    [push],
  )

  const bonus = useCallback(() => {
    const prev = stateRef.current
    const ts = Date.now()
    const value = positiveMoney(BONUS_AMOUNT)
    if (value === null || !Number.isFinite(prev.bonusAt) || ts - prev.bonusAt < BONUS_COOLDOWN) return false
    const next = push(
      { ...prev, bonusAt: ts },
      { game: 'Bónus de 4 horas', type: 'bonus', amount: value },
    )
    stateRef.current = next
    setState(next)
    return true
  }, [push])

  const reset = useCallback(() => {
    const fresh = { ...initial(), resetAt: Date.now() }
    stateRef.current = fresh
    setState(fresh)
  }, [])

  const historyFor = useCallback(
    (gameId: string) => state.tx.filter((t) => t.gameId === gameId).slice(0, 30),
    [state.tx],
  )

  const value = useMemo<WalletApi>(
    () => ({
      ...state,
      placeBet,
      payout,
      bonus,
      bonusReady: now - state.bonusAt >= BONUS_COOLDOWN,
      reset,
      historyFor,
    }),
    [state, placeBet, payout, bonus, now, reset, historyFor],
  )

  return <WalletCtx.Provider value={value}>{children}</WalletCtx.Provider>
}

export function useWallet(): WalletApi {
  const ctx = useContext(WalletCtx)
  if (!ctx) throw new Error('useWallet must be used inside WalletProvider')
  return ctx
}
