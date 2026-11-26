import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Game } from '../lib/types'
import { fmt, fmtMult, clamp } from '../lib/format'
import { crashFromSeed, hashHex, uid } from '../lib/rng'
import { BOT_STYLE_LABEL, botCashout, botStatus, crashVariant, makeBotRound } from '../lib/crashBots'
import { useWallet } from '../lib/wallet'
import { useSound } from '../lib/sound'
import { ActionButton, AutoBetControl, AutoControl, BetInput, GameLayout, RecentStrip, ResultBanner, SidePanel, Stage } from '../components/GameUI'
import { useAutoCashout, useAutoReplay } from '../lib/autoPlay'
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
  const configuredSlots = Number(game.config.slots)
  const slotCount = Number.isFinite(configuredSlots) ? clamp(Math.floor(configuredSlots), 1, 3) : 2
  const variant = useMemo(() => crashVariant(game.id), [game.id])
  const { balance, placeBet, payout } = useWallet()
  const { play } = useSound()

  const [phase, setPhase] = useState<Phase>('betting')
  const [countdown, setCountdown] = useState(7)
  const [mult, setMult] = useState(1)
  const [slots, setSlots] = useState<Slot[]>(() => Array.from({ length: slotCount }, () => EMPTY_SLOT(min)))
  const [history, setHistory] = useState<number[]>([])
  const [autoReplay, setAutoReplay] = useState(false)
  const [seed, setSeed] = useState(() => hashHex(uid()))
  const [botSeed, setBotSeed] = useState(seed)
  const [nextIn, setNextIn] = useState(7)
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
  const rafRef = useRef(0)
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const nextTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const nextAtRef = useRef(performance.now() + 7000)
  const nextTotalRef = useRef(7)

  slotsRef.current = slots
  seedRef.current = seed

  // Visual bots only: deterministic per round, derived from the round seed.
  const bots = useMemo(() => makeBotRound(botSeed, min, max, variant), [botSeed, min, max, variant])
  const botViews = bots.map((bot) => {
    const status = botStatus(bot, phase, mult, crashRef.current)
    return { ...bot, status, simulatedPayout: botCashout(bot, status) }
  })
  const cashedBots = botViews.filter((bot) => bot.status === 'cashed')
  const simulatedCashouts = cashedBots.reduce((sum, bot) => sum + bot.simulatedPayout, 0)

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
    const wash = ctx.createLinearGradient(0, 0, w, h)
    wash.addColorStop(0, variant.wash)
    wash.addColorStop(1, 'rgba(5,6,10,0)')
    ctx.fillStyle = wash
    ctx.fillRect(0, 0, w, h)

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

    // curve — the multiplier math is identical for every variant; only the styling changes
    const tMax = Math.max(flying ? elapsed : crashed ? 20 : 1, 4)
    const points = 90
    const color = crashed ? '#ff2d3f' : variant.line
    ctx.beginPath()
    for (let i = 0; i <= points; i++) {
      const t = (i / points) * Math.max(tMax, 0.001)
      const m = Math.exp(growth * t)
      const x = padL + (plotW * t) / Math.max(6, tMax)
      const y = padT + plotH - plotH * Math.min(1, yScale(Math.min(m, target)))
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    const stroke = ctx.createLinearGradient(padL, padT + plotH, w - padR, padT)
    stroke.addColorStop(0, color)
    stroke.addColorStop(1, crashed ? '#ff2d3f' : variant.accent)
    ctx.lineWidth = variant.mechanic === 'jet' ? 4 : 3
    ctx.setLineDash(variant.dash)
    ctx.strokeStyle = stroke
    ctx.shadowColor = color
    ctx.shadowBlur = 16
    ctx.stroke()
    ctx.setLineDash([])
    ctx.shadowBlur = 0

    // fill under curve
    ctx.lineTo(padL + (plotW * Math.min(1, tMax / Math.max(6, tMax))), padT + plotH)
    ctx.lineTo(padL, padT + plotH)
    ctx.closePath()
    const grad = ctx.createLinearGradient(0, padT, 0, padT + plotH)
    grad.addColorStop(0, crashed ? 'rgba(255,45,63,.22)' : variant.wash)
    grad.addColorStop(1, 'rgba(255,45,63,0)')
    ctx.fillStyle = grad
    ctx.fill()

    // vehicle + variant flourish at tip (purely visual — no effect on the multiplier)
    if (flying || crashed) {
      const t = crashed ? Math.max(4, 20) : elapsed
      const m = crashed ? crashRef.current : multRef.current
      const x = padL + (plotW * Math.min(1, t / Math.max(6, tMax)))
      const y = padT + plotH - plotH * Math.min(1, yScale(m))
      const now = performance.now()
      const trail = (dx: number, dy: number, alpha: number) => {
        ctx.globalAlpha = alpha
        ctx.fillStyle = variant.accent
        for (let i = 1; i <= 3; i++) {
          ctx.beginPath()
          ctx.arc(x - i * dx, y + i * dy, Math.max(1.5, 3 - i * 0.5), 0, Math.PI * 2)
          ctx.fill()
        }
        ctx.globalAlpha = 1
      }
      switch (variant.mechanic) {
        case 'trail':
          trail(9, 6, 0.55)
          break
        case 'jet':
          trail(13, 3, 0.7)
          trail(13, -3, 0.35)
          break
        case 'turbo':
          ctx.strokeStyle = variant.accent
          ctx.globalAlpha = 0.5
          ctx.lineWidth = 1.5
          for (let i = 0; i < 4; i++) {
            const yy = y + (i - 1.5) * 7
            ctx.beginPath()
            ctx.moveTo(x - 12 - i * 6, yy)
            ctx.lineTo(x - 30 - i * 10, yy)
            ctx.stroke()
          }
          ctx.globalAlpha = 1
          break
        case 'wind':
          ctx.strokeStyle = variant.accent
          ctx.globalAlpha = 0.35
          for (let i = 0; i < 4; i++) {
            const yy = padT + 18 + i * 22
            const xx = padL + ((now / 45 + i * 70) % Math.max(1, plotW))
            ctx.beginPath()
            ctx.moveTo(xx, yy)
            ctx.lineTo(xx + 26, yy - 3)
            ctx.stroke()
          }
          ctx.globalAlpha = 1
          break
        case 'orbit':
          ctx.strokeStyle = variant.accent
          ctx.globalAlpha = 0.35
          ctx.beginPath()
          ctx.arc(x, y, 16, 0, Math.PI * 2)
          ctx.stroke()
          for (let i = 0; i < 3; i++) {
            const a = now / 500 + i * 2.1
            ctx.beginPath()
            ctx.arc(x + Math.cos(a) * 16, y + Math.sin(a) * 16, 2.5, 0, Math.PI * 2)
            ctx.fillStyle = variant.accent
            ctx.fill()
          }
          ctx.globalAlpha = 1
          break
        case 'boost':
          if (elapsed > 3) {
            ctx.fillStyle = variant.accent
            ctx.font = '12px Inter, system-ui, sans-serif'
            ctx.textAlign = 'center'
            ctx.fillText('BOOST', x, y - 28)
          }
          for (let i = 0; i < 3; i++) {
            ctx.fillStyle = i % 2 ? variant.line : variant.accent
            ctx.beginPath()
            ctx.moveTo(x - 8 - i * 7, y + 6)
            ctx.lineTo(x - 14 - i * 7, y + 12)
            ctx.lineTo(x - 2 - i * 7, y + 11)
            ctx.closePath()
            ctx.fill()
          }
          break
        case 'jump':
          ctx.strokeStyle = variant.accent
          ctx.globalAlpha = 0.45
          ctx.beginPath()
          ctx.moveTo(x - 26, y + 16)
          ctx.quadraticCurveTo(x - 12, y + 2, x, y)
          ctx.stroke()
          ctx.globalAlpha = 1
          break
        case 'tower': {
          ctx.strokeStyle = variant.accent
          ctx.globalAlpha = 0.55
          const levels = Math.min(6, Math.max(1, Math.floor(Math.log(Math.max(1, m)) * 2)))
          for (let i = 1; i <= levels; i++) {
            const yy = padT + plotH - (plotH * i) / 6
            ctx.beginPath()
            ctx.moveTo(padL, yy)
            ctx.lineTo(w - padR, yy)
            ctx.stroke()
          }
          ctx.globalAlpha = 1
          break
        }
        default:
          trail(6, 5, 0.35)
      }
      ctx.font = '26px serif'
      ctx.textAlign = 'center'
      ctx.fillText(crashed ? '💥' : variant.glyph, x, y - 10)
    }

    // idle hint
    if (!flying && !crashed) {
      ctx.fillStyle = 'rgba(255,255,255,.22)'
      ctx.font = '600 12px Inter, system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('Aguardando próxima ronda…', w / 2, padT + plotH / 2)
      ctx.fillStyle = 'rgba(255,255,255,.28)'
      ctx.font = '10px Inter, system-ui, sans-serif'
      ctx.fillText(variant.mechanicLabel, w / 2, padT + plotH / 2 + 16)
    }
  }, [growth, variant])

  const reset = useCallback(() => {
    if (resetTimerRef.current) {
      window.clearTimeout(resetTimerRef.current)
      resetTimerRef.current = null
    }
    setPhase('betting')
    phaseRef.current = 'betting'
    setCountdown(7)
    setMult(1)
    multRef.current = 1
    tickRef.current = 1
    const nextSeed = hashHex(uid())
    seedRef.current = nextSeed
    setSeed(nextSeed)
    setBotSeed(nextSeed)
    nextAtRef.current = performance.now() + 7000
    nextTotalRef.current = 7
    setNextIn(7)
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
    nextAtRef.current = performance.now() + 3600
    nextTotalRef.current = 3.6
    if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current)
    resetTimerRef.current = window.setTimeout(() => {
      resetTimerRef.current = null
      resetRef.current()
    }, 3600)
  }, [play])

  endRef.current = end
  resetRef.current = reset

  useEffect(() => () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current)
    if (countdownRef.current) {
      clearInterval(countdownRef.current)
      countdownRef.current = null
    }
    if (resetTimerRef.current) {
      window.clearTimeout(resetTimerRef.current)
      resetTimerRef.current = null
    }
    if (nextTimerRef.current) {
      clearInterval(nextTimerRef.current)
      nextTimerRef.current = null
    }
  }, [])

  // next-round clock keeps ticking through betting, flight and crash
  useEffect(() => {
    const tick = () => setNextIn(Math.max(0, (nextAtRef.current - performance.now()) / 1000))
    tick()
    nextTimerRef.current = window.setInterval(tick, 250)
    return () => {
      if (nextTimerRef.current) {
        window.clearInterval(nextTimerRef.current)
        nextTimerRef.current = null
      }
    }
  }, [])

  // main loop
  useEffect(() => {
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
        }
        if (m >= crashRef.current) {
          endRef.current()
        }
      }
      draw()
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [draw, growth, play])

  // betting countdown
  useEffect(() => {
    if (phase !== 'betting') return
    setCountdown(7)
    let remaining = 7
    countdownRef.current = setInterval(() => {
      remaining -= 1
      setCountdown(remaining)
      if (remaining <= 0) {
        if (countdownRef.current !== null) clearInterval(countdownRef.current)
        countdownRef.current = null
        crashRef.current = crashFromSeed(seedRef.current, 0.03, maxMult)
        const flightSeconds = Math.max(0.2, Math.log(Math.max(1.01, crashRef.current)) / growth)
        nextAtRef.current = performance.now() + (flightSeconds + 3.6) * 1000
        nextTotalRef.current = flightSeconds + 3.6
        setBotSeed(seedRef.current)
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
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current)
      countdownRef.current = null
    }
  }, [phase, maxMult, growth, play])

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
    if (!s || phase !== 'betting') return
    if (s.active) return
    if (placeBet(s.amount, game.name, game.id, 'Aposta crash')) {
      paidRef.current.delete(idx)
      setSlots((prev) => prev.map((x, i) => (i === idx ? { ...x, active: true, cashedAt: null } : x)))
      play('click')
    }
  }

  const cashout = (idx: number) => {
    const s = slots[idx]
    if (!s || phase !== 'flying' || !s.active) return
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

  const autoSlots = [0, 1, 2].map((i) => slots[i] ?? EMPTY_SLOT(min))
  useAutoCashout({ active: slotCount > 0 && autoSlots[0].active, value: mult, target: autoSlots[0].autoCash, enabled: slotCount > 0 && autoSlots[0].auto, onCashout: () => cashout(0) })
  useAutoCashout({ active: slotCount > 1 && autoSlots[1].active, value: mult, target: autoSlots[1].autoCash, enabled: slotCount > 1 && autoSlots[1].auto, onCashout: () => cashout(1) })
  useAutoCashout({ active: slotCount > 2 && autoSlots[2].active, value: mult, target: autoSlots[2].autoCash, enabled: slotCount > 2 && autoSlots[2].auto, onCashout: () => cashout(2) })
  useAutoReplay({
    idle: phase === 'betting',
    enabled: autoReplay,
    onStart: () => {
      slotsRef.current.forEach((s, idx) => {
        if (!s.active) bet(idx)
      })
    },
  })

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
                <p className={`crash-mult font-display text-[clamp(38px,8vw,72px)] font-extrabold leading-none tabular ${statusColor} ${phase === 'flying' ? 'animate-pulseGlow' : ''} drop-shadow-[0_4px_24px_rgba(0,0,0,.7)]`}>
                  {phase === 'betting' ? `${countdown}s` : fmtMult(phase === 'crashed' ? crashRef.current : mult)}
                </p>
                <p className="mt-1 text-[11px] font-semibold uppercase tracking-[.22em] text-white/40">
                  {phase === 'betting' ? 'A ronda começa' : phase === 'flying' ? 'Multiplicador atual' : 'Crash!'}
                </p>
              </div>
            </div>
            {(phase === 'flying' || phase === 'crashed') && (
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className={`absolute left-[16%] top-[42%] ${phase === 'flying' ? 'game-float' : ''}`}>
                  <span
                    className={`block text-4xl leading-none ${phase === 'crashed' ? 'opacity-40' : ''}`}
                    style={{ filter: `drop-shadow(0 0 14px ${variant.accent})` }}
                  >
                    {phase === 'crashed' ? '💥' : variant.glyph}
                  </span>
                  <div className="absolute -left-6 top-7 flex gap-1">
                    {[0, 1, 2].map((p) => (
                      <span
                        key={p}
                        className="animate-floaty h-1.5 w-1.5 rounded-full"
                        style={{ background: variant.accent, animationDelay: `${p * 180}ms` }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div className="crash-timer pointer-events-none absolute bottom-2 left-3 right-3 z-10 flex items-center gap-2 rounded-lg border border-white/10 bg-black/55 px-2.5 py-1.5 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full" style={{ background: variant.accent }} />
              <span className="min-w-0 flex-1 truncate text-[10px] font-bold uppercase tracking-wider text-white/60">
                {phase === 'flying' ? 'Próxima ronda estimada' : 'Próxima ronda em'}{' '}
                <span className="tabular text-white">{Math.ceil(nextIn)}s</span>
              </span>
              <span className="h-1 w-14 shrink-0 overflow-hidden rounded-full bg-white/10">
                <span
                  className="block h-full rounded-full transition-all duration-200"
                  style={{
                    width: `${clamp((1 - nextIn / Math.max(0.1, nextTotalRef.current)) * 100, 0, 100)}%`,
                    background: `linear-gradient(90deg, ${variant.line}, ${variant.accent})`,
                  }}
                />
              </span>
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
          <div className="px-3">
            <ResultBanner
              state={phase !== 'crashed' ? 'idle' : slots.some((s) => s.cashedAt !== null) ? 'win' : 'lose'}
              text={
                phase === 'crashed'
                  ? slots.some((s) => s.cashedAt !== null)
                    ? `+${fmt(slots.reduce((sum, s) => sum + (s.cashedAt !== null ? s.amount * s.cashedAt : 0), 0))} B$`
                    : 'O voo caiu antes da retirada.'
                  : ''
              }
            />
          </div>
          <div className="bet-bar relative z-10 mt-3 rounded-2xl border border-white/10 bg-[#05060a]/95 p-3 shadow-[0_-8px_30px_rgba(0,0,0,.45)]">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
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
                      className="input w-full py-2 text-center text-sm tabular"
                    />
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2">
                    <ActionButton
                      tone={s.active ? 'placed' : 'bet'}
                      icon={s.active ? 'check' : 'bolt'}
                      size="compact"
                      onClick={() => bet(i)}
                      disabled={phase !== 'betting' || s.active}
                      className="w-full"
                    >
                      {s.active ? 'Apostado' : 'Apostar'}
                    </ActionButton>
                    <ActionButton
                      tone="cashout"
                      icon="check"
                      size="compact"
                      onClick={() => cashout(i)}
                      disabled={phase !== 'flying' || !s.active}
                      className="w-full"
                    >
                      {phase === 'flying' && s.active ? `Retirar ${fmtMult(mult)}` : 'Retirar'}
                    </ActionButton>
                  </div>
                  <AutoControl
                    value={s.autoCash}
                    onValueChange={(n) => setSlot(i, { autoCash: n })}
                    active={s.auto}
                    onToggle={() => setSlot(i, { auto: !s.auto })}
                    current={phase === 'flying' ? mult : phase === 'crashed' ? crashRef.current : 1}
                    currentLabel="Multiplicador do voo"
                  />
                </div>
              ))}
            </div>
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
            <div className="crash-history mt-3">
              <RecentStrip
                items={history.map((h) => fmtMult(h))}
                colorFor={(v) => {
                  const n = parseFloat(String(v))
                  return n >= 10 ? 'text-gold border-gold/30' : n >= 2 ? 'text-good border-good/30' : 'text-brand border-brand/30'
                }}
              />
            </div>
            <AutoBetControl active={autoReplay} onToggle={() => setAutoReplay((v) => !v)} />
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
          <SidePanel title={`Mecânica · ${variant.name}`} icon="info">
            <div className="flex items-center gap-2">
              <span
                className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-xl"
                style={{ background: variant.wash }}
              >
                {variant.glyph}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[11px] font-bold text-white/85">{variant.mechanicLabel}</p>
                <p className="truncate text-[9px] uppercase tracking-wider text-white/35">
                  {(growth * 100).toFixed(1)}%/s · teto {fmtMult(maxMult)}
                </p>
              </div>
            </div>
            <div className="mt-2.5 space-y-1.5 text-[10px] leading-snug">
              <p className="rounded-lg border border-good/25 bg-good/[.06] px-2.5 py-2 text-good">
                <span className="font-bold">Vantagem:</span> {variant.perk}
              </p>
              <p className="rounded-lg border border-brand/25 bg-brand/[.06] px-2.5 py-2 text-brand/90">
                <span className="font-bold">Desvantagem:</span> {variant.drawback}
              </p>
            </div>
          </SidePanel>
          <SidePanel title="Participantes · DEMONSTRAÇÃO" icon="info">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-gold">Simulação · sem carteira real</span>
              <span className="text-[10px] tabular text-white/40">
                {cashedBots.length}/{bots.length} retiradas · {fmt(simulatedCashouts)} B$ simulado
              </span>
            </div>
            <div className="crash-bots space-y-1.5">
              {botViews.map((bot) => (
                <div
                  key={bot.id}
                  className="crash-bot flex min-w-0 items-center gap-2 rounded-lg border border-line/60 bg-black/25 px-2.5 py-1.5"
                  data-status={bot.status}
                >
                  <span
                    className="grid h-6 w-6 shrink-0 place-items-center rounded-md text-[11px] font-extrabold text-ink"
                    style={{ background: `linear-gradient(135deg, ${variant.line}, ${variant.accent})` }}
                  >
                    {bot.name.slice(4, 5)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-bold text-white/85">{bot.name}</p>
                    <p className="truncate text-[9px] uppercase tracking-wider text-white/35">
                      {BOT_STYLE_LABEL[bot.style]} · aposta {fmt(bot.bet)} B$ · alvo {fmtMult(bot.target)}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-right text-[10px] font-bold ${
                      bot.status === 'cashed' ? 'text-good' : bot.status === 'crashed' ? 'text-brand' : 'text-white/45'
                    }`}
                  >
                    {bot.status === 'waiting'
                      ? 'à espera'
                      : bot.status === 'flying'
                        ? 'a voar'
                        : bot.status === 'cashed'
                          ? `retirado ${fmtMult(bot.target)}`
                          : 'quebrou'}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[9px] leading-snug text-white/30">
              Bots visuais de demonstração: apostas e retiradas simuladas, sem ligação à tua carteira BLAZE.
            </p>
          </SidePanel>
          <SidePanel title="Como jogar">
            <p className="text-[11px] leading-relaxed text-white/40">{game.rules}</p>
            <ul className="mt-2 space-y-1 text-[10px] text-white/30">
              <li>• Aposta mínima de {min} B$ e máxima de {fmt(max)} B$.</li>
              <li>• Retira antes do crash para garantir o multiplicador.</li>
              <li>• {slotCount} aposta{slotCount === 1 ? '' : 's'} independente{slotCount === 1 ? '' : 's'} por ronda.</li>
            </ul>
          </SidePanel>
        </div>
      }
    />
  )
}
