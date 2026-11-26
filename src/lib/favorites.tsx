import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { load, save } from './storage'

const FAV_KEY = 'blaze.favorites.v1'
const RECENT_KEY = 'blaze.recent.v1'

interface FavApi {
  ids: string[]
  toggle: (id: string) => void
  isFav: (id: string) => boolean
}

const FavCtx = createContext<FavApi | null>(null)

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>(() => {
    const stored = load<unknown>(FAV_KEY, [])
    return Array.isArray(stored) ? stored.filter((x): x is string => typeof x === 'string') : []
  })

  useEffect(() => save(FAV_KEY, ids), [ids])

  const toggle = useCallback((id: string) => {
    setIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }, [])

  const isFav = useCallback((id: string) => ids.includes(id), [ids])

  const value = useMemo(() => ({ ids, toggle, isFav }), [ids, toggle, isFav])
  return <FavCtx.Provider value={value}>{children}</FavCtx.Provider>
}

export function useFavorites(): FavApi {
  const ctx = useContext(FavCtx)
  if (!ctx) throw new Error('useFavorites must be used inside FavoritesProvider')
  return ctx
}

interface RecentApi {
  ids: string[]
  visit: (id: string) => void
}

const RecentCtx = createContext<RecentApi | null>(null)

export function RecentProvider({ children }: { children: ReactNode }) {
  const [ids, setIds] = useState<string[]>(() => {
    const stored = load<unknown>(RECENT_KEY, [])
    return Array.isArray(stored) ? stored.filter((x): x is string => typeof x === 'string') : []
  })

  const visit = useCallback((id: string) => {
    setIds((prev) => {
      if (prev[0] === id) return prev
      const next = [id, ...prev.filter((x) => x !== id)].slice(0, 8)
      save(RECENT_KEY, next)
      return next
    })
  }, [])

  const value = useMemo(() => ({ ids, visit }), [ids, visit])
  return <RecentCtx.Provider value={value}>{children}</RecentCtx.Provider>
}

export function useRecent(): RecentApi {
  const ctx = useContext(RecentCtx)
  if (!ctx) throw new Error('useRecent must be used inside RecentProvider')
  return ctx
}
