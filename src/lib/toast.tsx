import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { uid } from './rng'

type Kind = 'success' | 'error' | 'info'
interface Toast {
  id: string
  kind: Kind
  title: string
  text?: string
}

interface ToastApi {
  toasts: Toast[]
  push: (kind: Kind, title: string, text?: string) => void
  dismiss: (id: string) => void
}

const Ctx = createContext<ToastApi | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const timers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  const dismiss = useCallback((id: string) => {
    setToasts((t) => t.filter((x) => x.id !== id))
    const timer = timers.current[id]
    if (timer) clearTimeout(timer)
    delete timers.current[id]
  }, [])

  const push = useCallback(
    (kind: Kind, title: string, text?: string) => {
      const id = uid()
      setToasts((t) => [...t.slice(-3), { id, kind, title, text }])
      timers.current[id] = setTimeout(() => dismiss(id), 4200)
    },
    [dismiss],
  )

  const value = useMemo(() => ({ toasts, push, dismiss }), [toasts, push, dismiss])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useToast(): ToastApi {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useToast must be used inside ToastProvider')
  return ctx
}
