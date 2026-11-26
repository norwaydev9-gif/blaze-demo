/**
 * Sons curtos e próprios por variante Crash (demonstração, sem recursos de terceiros).
 * O módulo não toca na carteira nem no resultado da ronda; é apenas feedback sonoro.
 */

export type CrashCue = 'launch' | 'cashout' | 'crash'

interface Signature {
  notes: [number, number, number]
  type: OscillatorType
  gap: number
  length: number
  sweep: number
}

const SIGNATURES: Record<string, Signature> = {
  crash: { notes: [392, 587, 784], type: 'triangle', gap: 0.06, length: 0.12, sweep: 1 },
  aviator: { notes: [440, 660, 990], type: 'sine', gap: 0.07, length: 0.14, sweep: 1.06 },
  'space-flight': { notes: [262, 523, 1046], type: 'sine', gap: 0.09, length: 0.18, sweep: 1.12 },
  'rocket-rush': { notes: [220, 440, 880], type: 'sawtooth', gap: 0.05, length: 0.11, sweep: 1.2 },
  'sky-multiplier': { notes: [523, 659, 988], type: 'sine', gap: 0.1, length: 0.2, sweep: 1.03 },
  'cosmic-crash': { notes: [311, 622, 933], type: 'triangle', gap: 0.08, length: 0.16, sweep: 0.94 },
  'turbo-crash': { notes: [196, 392, 784], type: 'square', gap: 0.04, length: 0.09, sweep: 1.3 },
  'jet-rush': { notes: [349, 698, 1046], type: 'triangle', gap: 0.06, length: 0.13, sweep: 1.15 },
  'crash-deluxe': { notes: [294, 587, 1174], type: 'sine', gap: 0.11, length: 0.22, sweep: 1.01 },
}

let context: AudioContext | null = null

function audio(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const AC = window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AC) return null
  if (!context) context = new AC()
  if (context.state === 'suspended') void context.resume()
  return context
}

/** Toca um gesto sonoro curto; silencioso quando o som está desligado ou sem WebAudio. */
export function playCrashCue(variantId: string, cue: CrashCue, enabled: boolean): void {
  if (!enabled) return
  const ac = audio()
  if (!ac) return
  const sig = SIGNATURES[variantId] ?? SIGNATURES.crash
  const order = cue === 'crash' ? [...sig.notes].reverse() : sig.notes
  const count = cue === 'launch' ? 1 : 3
  const now = ac.currentTime
  for (let i = 0; i < count; i++) {
    const t = now + i * sig.gap
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.type = sig.type
    osc.frequency.setValueAtTime(order[i], t)
    if (cue === 'crash') osc.frequency.exponentialRampToValueAtTime(Math.max(40, order[i] / sig.sweep), t + sig.length)
    else if (cue === 'cashout') osc.frequency.exponentialRampToValueAtTime(order[i] * sig.sweep, t + sig.length)
    gain.gain.setValueAtTime(cue === 'crash' ? 0.045 : 0.03, t)
    gain.gain.exponentialRampToValueAtTime(0.0001, t + sig.length)
    osc.connect(gain).connect(ac.destination)
    osc.start(t)
    osc.stop(t + sig.length + 0.02)
  }
}
