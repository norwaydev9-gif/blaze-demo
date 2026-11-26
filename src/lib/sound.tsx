import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { load, save } from './storage'

type SoundName = 'click' | 'win' | 'lose' | 'tick' | 'spin' | 'crash' | 'cashout'

interface SoundApi {
  enabled: boolean
  toggle: () => void
  play: (name: SoundName) => void
}

const Ctx = createContext<SoundApi | null>(null)

export function SoundProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabled] = useState(() => load('blaze.sound', true))
  const audio = useRef<AudioContext | null>(null)
  const enabledRef = useRef(enabled)
  enabledRef.current = enabled

  useEffect(() => save('blaze.sound', enabled), [enabled])

  const ctx = useCallback(() => {
    if (!audio.current) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AC) return null
      audio.current = new AC()
    }
    if (audio.current.state === 'suspended') void audio.current.resume()
    return audio.current
  }, [])

  const play = useCallback(
    (name: SoundName) => {
      if (!enabledRef.current) return
      const ac = ctx()
      if (!ac) return
      const t = ac.currentTime
      const notes: Record<SoundName, { f: number; f2?: number; d: number; type: OscillatorType; g: number }> = {
        click: { f: 520, d: 0.05, type: 'square', g: 0.03 },
        tick: { f: 880, d: 0.035, type: 'sine', g: 0.025 },
        win: { f: 523, f2: 784, d: 0.22, type: 'sine', g: 0.08 },
        cashout: { f: 659, f2: 988, d: 0.18, type: 'triangle', g: 0.07 },
        lose: { f: 220, f2: 130, d: 0.25, type: 'sawtooth', g: 0.05 },
        spin: { f: 300, f2: 460, d: 0.09, type: 'triangle', g: 0.035 },
        crash: { f: 180, f2: 60, d: 0.4, type: 'sawtooth', g: 0.07 },
      }
      const n = notes[name]
      const osc = ac.createOscillator()
      const gain = ac.createGain()
      osc.type = n.type
      osc.frequency.setValueAtTime(n.f, t)
      if (n.f2) osc.frequency.exponentialRampToValueAtTime(n.f2, t + n.d)
      gain.gain.setValueAtTime(n.g, t)
      gain.gain.exponentialRampToValueAtTime(0.0001, t + n.d)
      osc.connect(gain).connect(ac.destination)
      osc.start(t)
      osc.stop(t + n.d + 0.02)
    },
    [ctx],
  )

  const value = useMemo(
    () => ({ enabled, toggle: () => setEnabled((e) => !e), play }),
    [enabled, play],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useSound(): SoundApi {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('useSound must be used inside SoundProvider')
  return ctx
}
