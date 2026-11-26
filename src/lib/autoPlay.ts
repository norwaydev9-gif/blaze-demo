import { useEffect, useRef } from 'react'

/**
 * Retira automaticamente quando o multiplicador/coeficiente atinge o alvo.
 * O callback é guardado num ref para não reiniciar o efeito a cada render.
 */
export function useAutoCashout({
  active,
  value,
  target,
  enabled,
  onCashout,
}: {
  active: boolean
  value: number
  target: number
  enabled: boolean
  onCashout: () => void
}) {
  const cb = useRef(onCashout)
  cb.current = onCashout

  useEffect(() => {
    if (!enabled || !active) return
    if (!Number.isFinite(target) || target <= 1) return
    if (value >= target) cb.current()
  }, [active, value, target, enabled])
}

/** Volta a apostar automaticamente depois de uma ronda terminar. */
export function useAutoReplay({
  idle,
  enabled,
  delay = 420,
  onStart,
}: {
  idle: boolean
  enabled: boolean
  delay?: number
  onStart: () => void
}) {
  const cb = useRef(onStart)
  cb.current = onStart

  useEffect(() => {
    if (!enabled || !idle) return
    const timer = window.setTimeout(() => cb.current(), delay)
    return () => window.clearTimeout(timer)
  }, [idle, enabled, delay])
}
