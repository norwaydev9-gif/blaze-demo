import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Tx } from './types'
import { load, save } from './storage'
import { uid } from './rng'

const START_BALANCE = 5000
const BONUS_AMOUNT = 500
const BONUS_COOLDOWN = 1000 * 60 * 60 * 4 // demo: 4 horas

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
    const s = load<WalletState>(KEY, fallback)
    if (!s || typeof s.balance !== 'number' || !Array.isArray(s.tx)) return fallback
    return {
      ...fallback,
      ...s,
      balance: Math.max(0, s.balance),
      wagered: Number.isFinite(s.wagered) ? s.wagered : 0,
      won: Number.isFinite(s.won) ? s.won : 0,
      bonusAt: Number.isFinite(s.bonusAt) ? s.bonusAt : 0,
      resetAt: Number.isFinite(s.resetAt) ? s.resetAt : fallback.resetAt,
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

  const push = useCallback(
    (prev: WalletState, tx: Omit<Tx, 'id' | 'ts' | 'balanceAfter'>): WalletState => {
      const entry: Tx = {
        ...tx,
        id: uid(),
        ts: Date.now(),
        balanceAfter: Math.max(0, prev.balance + tx.amount),
      }
      return {
        ...prev,
        balance: entry.balanceAfter,
        tx: [entry, ...prev.tx].slice(0, 400),
      }
    },
    [],
  )

  const placeBet = useCallback(
    (amount: number, game: string, gameId?: string, detail?: string) => {
      const prev = stateRef.current
      if (!Number.isFinite(amount) || amount <= 0 || amount > prev.balance) return false
      const next = push(
        { ...prev, wagered: prev.wagered + amount },
        { game, gameId, type: 'bet', amount: -amount, detail },
      )
      stateRef.current = next
      setState(next)
      return true
    },
    [push],
  )

  const payout = useCallback(
    (amount: number, game: string, gameId?: string, detail?: string) => {
      if (!Number.isFinite(amount) || amount <= 0) return
      const prev = stateRef.current
      const next = push(
        { ...prev, won: prev.won + amount },
        { game, gameId, type: 'win', amount, detail },
      )
      stateRef.current = next
      setState(next)
    },
    [push],
  )

  const bonus = useCallback(() => {
    const prev = stateRef.current
    if (Date.now() - prev.bonusAt < BONUS_COOLDOWN) return false
    const next = push({ ...prev, bonusAt: Date.now() }, { game: 'Bónus de 4 horas', type: 'bonus', amount: BONUS_AMOUNT })
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
