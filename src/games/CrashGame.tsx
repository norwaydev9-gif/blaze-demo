import { useCallback, useEffect, useRef, useState } from 'react'
import type { Game } from '../lib/types'
import { fmt, fmtMult, clamp } from '../lib/format'
import { crashFromSeed, hashHex, uid } from '../lib/rng'
import { useWallet } from '../lib/wallet'
import { useSound } from '../lib/sound'
import { BetInput, GameLayout, RecentStrip, SidePanel, Stage } from '../components/GameUI'
import { Icon } from '../components/Icon'

type Phase = 'betting' | 'flying' | 'crashed'

interface Slot {
  amount: number
  autoCash: number
  active: boolean
  cashedAt: number | null
  auto: boolean
}

const EMPTY_SLOT = (min: number): Slot => ({ amount: min, autoCash: 2, active: false, cashedAt: null, auto: false })

export function CrashGame({ game }: { game: Game }) {
  const min = game.minBet
  const max = game.maxBet
  const growth = Number(game.config.growth ?? 0.09)
  const maxMult = Number(game.config.maxMult ?? 5000)
  const { balance, placeBet, payout } = useWallet()
  const { play } = useSound()

  const [phase, setPhase] = useState<Phase>('betting')
  const [countdown, setCountdown] = useState(7)
  const [mult, setMult] = useState(1)
  const [slots, setSlots] = useState<Slot[]>([EMPTY_SLOT(min), EMPTY_SLOT(min)])
  const [history, setHistory] = useState<number[]>([])
  const [seed, setSeed] = useState(() => hashHex(uid()))
  const seedRef = useRef(seed)

  const phaseRef = useRef<Phase>('betting')
  const multRef = useRef(1)
  const crashRef = useRef(1)
  const startRef = useRef(0)
  const slotsRef = useRef(slots)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const tickRef = useRef(1)
  const endRef = useRef<() => void>(() => {})
  const resetRef = useRef<() => void>(() => {})
  const paidRef = useRef<Set<number>>(new Set())

  slotsRef.current = slots
  seedRef.current = seed

  const draw = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const w = canvas.clientWidth
    const h = canvas.clientHeight
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, w, h)

    const padL = 46
    const padR = 26
    const padT = 26
    const padB = 34
    const plotW = w - padL - padR
    const plotH = h - padT - padB
    const crashed = phaseRef.current === 'crashed'
    const flying = phaseRef.current === 'flying'
    const elapsed = flying ? (performance.now() - startRef.current) / 1000 : 0
    const target = crashed ? crashRef.current : flying ? multRef.current : Math.max(2, multRef.current)
    const yMax = Math.max(2, Math.log(target) / Math.log(Math.E))
    const yScale = (m: number) => Math.log(Math.max(1, m)) / Math.max(0.6, yMax)

    // grid
    ctx.strokeStyle = 'rgba(255,255,255,.055)'
    ctx.lineWidth = 1
    for (let i = 1; i <= 4; i++) {
      const y = padT + plotH - (plotH * i) / 4
      ctx.beginPath()
      ctx.moveTo(padL, y)
      ctx.lineTo(w - padR, y)
      ctx.stroke()
    }
    for (let i = 1; i <= 5; i++) {
      const x = padL + (plotW * i) / 5
      ctx.beginPath()
      ctx.moveTo(x, padT)
      ctx.lineTo(x, padT + plotH)
      ctx.stroke()
    }

    // axis labels
    ctx.fillStyle = 'rgba(255,255,255,.28)'
    ctx.font = '10px Inter, system-ui, sans-serif'
    ctx.textAlign = 'right'
    for (let i = 0; i <= 4; i++) {
      const m = Math.exp((yMax * i) / 4)
      const y = padT + plotH - (plotH * i) / 4
      ctx.fillText(`${m < 10 ? m.toFixed(1) : Math.round(m)}×`, padL - 8, y + 3)
    }
    ctx.textAlign = 'center'
    for (let i = 0; i <= 5; i++) {
      ctx.fillText(`${((i * 20) / 5).toFixed(0)}s`, padL + (plotW * i) / 5, h - 12)
    }

    // curve
    const tMax = Math.max(flying ? elapsed : crashed ? 20 : 1, 4)
    const points = 90
    const color = crashed ? '#ff2d3f' : '#ff6b3d'
    ctx.beginPath()
    for (let i = 0; i <= points; i++) {
      const t = (i / points) * Math.max(tMax, 0.001)
      const m = Math.exp(growth * t)
      const x = padL + (plotW * t) / Math.max(6, tMax)
      const y = padT + plotH - plotH * Math.min(1, yScale(Math.min(m, target)))
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.lineWidth = 3
    ctx.strokeStyle = color
    ctx.shadowColor = color
    ctx.shadowBlur = 16
    ctx.stroke()
    ctx.shadowBlur = 0

    // fill under curve
    ctx.lineTo(padL + (plotW * Math.min(1, tMax / Math.max(6, tMax))), padT + plotH)
    ctx.lineTo(padL, padT + plotH)
    ctx.closePath()
    const grad = ctx.createLinearGradient(0, padT, 0, padT + plotH)
    grad.addColorStop(0, crashed ? 'rgba(255,45,63,.22)' : 'rgba(255,107,61,.20)')
    grad.addColorStop(1, 'rgba(255,45,63,0)')
    ctx.fillStyle = grad
    ctx.fill()

    // plane at tip
    if (flying || crashed) {
      const t = crashed ? Math.max(4, 20) : elapsed
      const m = crashed ? crashRef.current : multRef.current
      const x = padL + (plotW * Math.min(1, t / Math.max(6, tMax)))
      const y = padT + plotH - plotH * Math.min(1, yScale(m))
      ctx.font = '26px serif'
      ctx.textAlign = 'center'
      ctx.fillText(crashed ? '💥' : '✈️', x, y - 10)
    }

    // idle hint
    if (!flying && !crashed) {
      ctx.fillStyle = 'rgba(255,255,255,.22)'
      ctx.font = '600 12px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('Aguardando próxima ronda…', w / 2, padT + plotH / 2)
    }
  }, [growth])

  const reset = useCallback(() => {
    setPhase('betting')
    phaseRef.current = 'betting'
    setCountdown(7)
    setMult(1)
    multRef.current = 1
    tickRef.current = 1
    const nextSeed = hashHex(uid())
    seedRef.current = nextSeed
    setSeed(nextSeed)
    setSlots((prev) => prev.map((s) => ({ ...s, active: false, cashedAt: null })))
    paidRef.current = new Set()
    play('click')
  }, [play])

  const end = useCallback(() => {
    if (phaseRef.current !== 'flying') return
    const crash = crashRef.current
    phaseRef.current = 'crashed'
    setPhase('crashed')
    multRef.current = crash
    setMult(crash)
    play('crash')
    setHistory((h) => [crash, ...h].slice(0, 18))
    setSlots((prev) => prev.map((s) => (s.active ? { ...s, active: false, cashedAt: null } : s)))
    window.setTimeout(() => resetRef.current(), 3600)
  }, [play])

  endRef.current = end
  resetRef.current = reset

  // main loop
  useEffect(() => {
    let raf = 0
    let last = 0
    const loop = (now: number) => {
      if (phaseRef.current === 'flying') {
        const t = (now - startRef.current) / 1000
        const m = Math.exp(growth * t)
        multRef.current = m
        if (now - last > 40) {
          last = now
          setMult(m)
          if (m >= tickRef.current + 1) {
            tickRef.current = Math.floor(m)
            play('tick')
          }
          // auto cash-out
          const current = slotsRef.current
          current.forEach((s, idx) => {
            if (s.active && s.autoCash > 0 && m >= s.autoCash && !paidRef.current.has(idx)) {
              paidRef.current.add(idx)
              payout(s.amount * s.autoCash, game.name, game.id, `Auto-retirada ${fmtMult(s.autoCash)}`)
              setSlots((prev) => prev.map((x, i) => (i === idx ? { ...x, active: false, cashedAt: s.autoCash } : x)))
            }
          })
        }
        if (m >= crashRef.current) {
          endRef.current()
        }
      }
      draw()
      raf = requestAnimationFrame(loop)
    }
    raf = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(raf)
  }, [draw, growth, play, payout, game.name, game.id])

  // betting countdown
  useEffect(() => {
    if (phase !== 'betting') return
    setCountdown(7)
    let remaining = 7
    const t = setInterval(() => {
      remaining -= 1
      setCountdown(remaining)
      if (remaining <= 0) {
        clearInterval(t)
        crashRef.current = crashFromSeed(seedRef.current, 0.03, maxMult)
        startRef.current = performance.now()
        tickRef.current = 1
        multRef.current = 1
        paidRef.current = new Set()
        phaseRef.current = 'flying'
        setPhase('flying')
        setMult(1)
        play('click')
      }
    }, 1000)
    return () => clearInterval(t)
  }, [phase, maxMult, play])

  // auto-bet when a new betting round opens
  useEffect(() => {
    if (phase !== 'betting') return
    slotsRef.current.forEach((s, idx) => {
      if (s.auto && !s.active) {
        if (placeBet(s.amount, game.name, game.id, 'Auto-aposta')) {
          setSlots((prev) => prev.map((x, i) => (i === idx ? { ...x, active: true, cashedAt: null } : x)))
        }
      }
    })
  }, [phase, placeBet, game.name, game.id])

  const bet = (idx: number) => {
    const s = slots[idx]
    if (phase !== 'betting') return
    if (s.active) return
    if (placeBet(s.amount, game.name, game.id, 'Aposta crash')) {
      paidRef.current.delete(idx)
      setSlots((prev) => prev.map((x, i) => (i === idx ? { ...x, active: true, cashedAt: null } : x)))
      play('click')
    }
  }

  const cashout = (idx: number) => {
    const s = slots[idx]
    if (phase !== 'flying' || !s.active) return
    const at = multRef.current
    if (paidRef.current.has(idx)) return
    paidRef.current.add(idx)
    payout(s.amount * at, game.name, game.id, `Retirada ${fmtMult(at)}`)
    setSlots((prev) => prev.map((x, i) => (i === idx ? { ...x, active: false, cashedAt: at } : x)))
    play('cashout')
  }

  const setSlot = (idx: number, patch: Partial<Slot>) => {
    setSlots((prev) => prev.map((x, i) => (i === idx ? { ...x, ...patch } : x)))
  }

  const proof = phase === 'crashed' ? seed : hashHex(seed)
  const statusColor = phase === 'crashed' ? 'text-brand' : phase === 'flying' ? 'text-good' : 'text-gold'

  return (
    <GameLayout
      stage={
        <Stage className="overflow-hidden">
          <div className="relative">
            <canvas ref={canvasRef} className="block aspect-[4/3] w-full sm:aspect-[16/9]" />
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="text-center">
                <p className={`font-display text-[clamp(38px,8vw,72px)] font-extrabold leading-none tabular ${statusColor} drop-shadow-[0_4px_24px_rgba(0,0,0,.7)]`}>
                  {phase === 'betting' ? `${countdown}s` : fmtMult(phase === 'crashed' ? crashRef.current : mult)}
                </p>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-[.22em] text-white/40">
                  {phase === 'betting' ? 'A ronda começa' : phase === 'flying' ? 'Multiplicador atual' : 'Crash!'}
                </p>
              </div>
            </div>
            <div className="absolute left-3 top-3 flex items-center gap-2">
              <span className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                phase === 'betting' ? 'border-gold/30 bg-gold/10 text-gold' : phase === 'flying' ? 'border-good/30 bg-good/10 text-good' : 'border-brand/30 bg-brand/10 text-brand'
              }`}>
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                {phase === 'betting' ? 'Apostas abertas' : phase === 'flying' ? 'Em voo' : 'Caiu'}
              </span>
              <span className="rounded-full border border-line bg-black/40 px-2.5 py-1 text-[10px] font-semibold text-white/40">
                Prova: {proof.slice(0, 10)}…
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 border-t border-line/70 p-3">
            {slots.map((s, i) => (
              <div key={i} className={`rounded-xl border p-3 transition ${s.active ? 'border-brand/40 bg-brand/[.06]' : 'border-line/70 bg-white/[.02]'}`}>
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-white/35">Aposta {i + 1}</span>
                  {s.cashedAt !== null && <span className="text-[10px] font-bold text-good">Retirado {fmtMult(s.cashedAt)}</span>}
                  {s.active && <span className="text-[10px] font-bold text-good">Em jogo</span>}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    value={s.amount}
                    min={min}
                    max={max}
                    disabled={s.active || phase !== 'betting'}
                    onChange={(e) => setSlot(i, { amount: clamp(Number(e.target.value), min, max) })}
                    className="input py-2 text-center text-sm tabular"
                  />
                  <button
                    type="button"
                    onClick={() => (phase === 'flying' ? cashout(i) : bet(i))}
                    disabled={phase === 'crashed' || (phase === 'flying' && !s.active) || (phase === 'betting' && s.active)}
                    className={`flex-1 rounded-xl py-2.5 text-xs font-bold transition disabled:opacity-40 ${
                      phase === 'flying' && s.active
                        ? 'bg-good text-[#03140e] hover:brightness-105'
                        : 'bg-gradient-to-br from-[#ff3b4d] to-[#c50b20] text-white hover:brightness-110'
                    }`}
                  >
                    {phase === 'flying'
                      ? s.active
                        ? `Retirar ${fmtMult(mult)}`
                        : 'Em voo'
                      : s.active
                        ? 'Apostado'
                        : 'Apostar'}
                  </button>
                </div>
                <div className="mt-2 grid grid-cols-[1fr_auto] items-center gap-2">
                  <label className="flex min-w-0 items-center gap-1.5 text-[10px] text-white/35">
                    Auto-retirar
                    <input
                      type="number"
                      step="0.1"
                      min="1.01"
                      value={s.autoCash}
                      onChange={(e) => setSlot(i, { autoCash: Number(e.target.value) })}
                      className="h-11 w-full min-w-0 rounded-md border border-line bg-black/30 px-1.5 text-center text-[10px] font-bold text-white outline-none focus:border-brand/50"
                    />
                    ×
                  </label>
                  <button
                    type="button"
                    onClick={() => setSlot(i, { auto: !s.auto })}
                    className={`h-11 rounded-md border px-3 text-[10px] font-bold transition ${s.auto ? 'border-good/40 bg-good/15 text-good' : 'border-line text-white/30'}`}
                  >
                    AUTO
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Stage>
      }
      side={
        <div className="space-y-4">
          <SidePanel title="Sessão de crash" icon="info">
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg bg-black/25 p-2.5">
                <p className="text-[9px] uppercase tracking-wider text-white/30">Saldo</p>
                <p className="text-sm font-bold tabular">{fmt(balance)} B$</p>
              </div>
              <div className="rounded-lg bg-black/25 p-2.5">
                <p className="text-[9px] uppercase tracking-wider text-white/30">Crescimento</p>
                <p className="text-sm font-bold tabular text-gold">{(growth * 100).toFixed(1)}%/s</p>
              </div>
            </div>
            <div className="mt-3">
              <RecentStrip
                items={history.map((h) => fmtMult(h))}
                colorFor={(v) => {
                  const n = parseFloat(String(v))
                  return n >= 10 ? 'text-gold border-gold/30' : n >= 2 ? 'text-good border-good/30' : 'text-brand border-brand/30'
                }}
              />
            </div>
            <div className="mt-4 rounded-xl border border-line/60 bg-black/20 p-3">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white/40">
                <Icon name="shield" size={12} /> Prova da ronda
              </p>
              <p className="mt-1.5 break-all font-mono text-[10px] leading-relaxed text-white/35">{proof}</p>
              <p className="mt-2 text-[10px] leading-snug text-white/30">
                O ponto de crash é derivado da semente da ronda. O hash é mostrado antes do voo e a semente é revelada no crash, para que possas verificar o resultado.
              </p>
            </div>
          </SidePanel>
          <SidePanel title="Como jogar">
            <p className="text-[11px] leading-relaxed text-white/40">{game.rules}</p>
            <ul className="mt-2 space-y-1 text-[10px] text-white/30">
              <li>• Aposta mínima de {min} B$ e máxima de {fmt(max)} B$.</li>
              <li>• Retira antes do crash para garantir o multiplicador.</li>
              <li>• Duas apostas independentes por ronda.</li>
            </ul>
          </SidePanel>
        </div>
      }
    />
  )
}
