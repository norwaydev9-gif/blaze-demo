import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Game } from '../lib/types'
import { fmt, fmtMult, clamp } from '../lib/format'
import { crashFromSeed, hashHex, uid, verifyCrash } from '../lib/rng'
import { BOT_STYLE_LABEL, botCashout, botStatus, crashVariant, makeBotRound } from '../lib/crashBots'
import type { BotStatus } from '../lib/crashBots'
import { useWallet } from '../lib/wallet'
import { useSound } from '../lib/sound'
import { playCrashCue } from '../lib/crashSound'
import { ActionButton, AutoBetControl, AutoControl, GameLayout, ResultBanner, SidePanel, Stage } from '../components/GameUI'
import { useAutoCashout, useAutoReplay } from '../lib/autoPlay'
import { load, save } from '../lib/storage'
import { Icon } from '../components/Icon'

type Phase = 'betting' | 'flying' | 'crashed'
type Tier = 'low' | 'mid' | 'high'

interface Slot {
  amount: number
  autoCash: number
  active: boolean
  cashedAt: number | null
  auto: boolean
}

/** Aposta real do utilizador na ronda actual (os bots nunca entram aqui). */
interface PlayerBet {
  idx: number
  amount: number
  cashedAt: number | null
}

/** Registo de saídas para a ZONA D — bots são demonstração, «Tu» usa a carteira. */
interface CashoutEntry {
  id: string
  name: string
  kind: 'bot' | 'player'
  mult: number
  bet: number
  won: number
  round: number
}

interface FxState {
  kind: 'cashout' | 'crash'
  key: string
  mult: number
  amount: number
}

const EMPTY_SLOT = (min: number): Slot => ({ amount: min, autoCash: 2, active: false, cashedAt: null, auto: false })
const EDGE = 0.03

/** fmtMult é a fonte; a vírgula garante a leitura pt-PT (1,24×) também quando fmtMult usa ponto. */
const fmtCrash = (n: number) => fmtMult(n).replace('.', ',')
const tierOf = (m: number): Tier => (m < 2 ? 'low' : m < 10 ? 'mid' : 'high')
const TIER_CLASS: Record<Tier, string> = {
  low: 'border-brand/35 bg-brand/10 text-[#ff8a5c]',
  mid: 'border-[#6f9bff]/40 bg-[#6f9bff]/10 text-[#9bb4ff]',
  high: 'border-good/40 bg-gradient-to-br from-good/15 to-gold/10 text-good',
}

export function CrashGame({ game }: { game: Game }) {
  const min = game.minBet
  const max = game.maxBet
  const growth = Number(game.config.growth ?? 0.09)
  const maxMult = Number(game.config.maxMult ?? 5000)
  const configuredSlots = Number(game.config.slots)
  const slotCount = Number.isFinite(configuredSlots) ? clamp(Math.floor(configuredSlots), 1, 3) : 2
  const variant = useMemo(() => crashVariant(game.id), [game.id])
  const { balance, placeBet, payout } = useWallet()
  const { play, enabled: soundEnabled } = useSound()
  const soundRef = useRef(soundEnabled)
  soundRef.current = soundEnabled

  const [phase, setPhase] = useState<Phase>('betting')
  const [countdown, setCountdown] = useState(7)
  const [mult, setMult] = useState(1)
  const [slots, setSlots] = useState<Slot[]>(() => Array.from({ length: slotCount }, () => EMPTY_SLOT(min)))
  const historyKey = `blaze.crash.history.${game.id}`
  const [history, setHistory] = useState<number[]>(() => {
    // Só números finitos e positivos: nada de resultados inventados vindos do storage.
    const stored = load<unknown>(historyKey, [])
    if (!Array.isArray(stored)) return []
    return stored
      .filter((v): v is number => typeof v === 'number' && Number.isFinite(v) && v > 0)
      .slice(0, 200)
  })
  const [playerBets, setPlayerBets] = useState<PlayerBet[]>([])
  const [cashouts, setCashouts] = useState<CashoutEntry[]>([])
  const [fx, setFx] = useState<FxState | null>(null)
  const [betAmount, setBetAmount] = useState(() => clamp(Math.max(min, 100), min, max))
  const [lastCrash, setLastCrash] = useState<number | null>(null)
  const [autoReplay, setAutoReplay] = useState(false)
  const [seed, setSeed] = useState(() => hashHex(uid()))
  const [botSeed, setBotSeed] = useState(seed)
  const [nextIn, setNextIn] = useState(7)
  const seedRef = useRef(seed)
  const roundRef = useRef(0)
  const betRef = useRef<(idx: number) => void>(() => {})

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

  const addCashouts = useCallback((entries: CashoutEntry[]) => {
    if (entries.length === 0) return
    setCashouts((prev) => [...entries, ...prev].slice(0, 60))
  }, [])

  /** Só a carteira real paga; cada índice tem o seu próprio guarda contra retirada dupla. */
  const bet = useCallback((idx: number) => {
    const s = slotsRef.current[idx]
    if (!s || phaseRef.current !== 'betting' || s.active) return
    if (placeBet(s.amount, game.name, game.id, 'Aposta crash')) {
      paidRef.current.delete(idx)
      setSlots((prev) => prev.map((x, i) => (i === idx ? { ...x, active: true, cashedAt: null } : x)))
      setPlayerBets((prev) =>
        prev.some((p) => p.idx === idx) ? prev : [...prev, { idx, amount: s.amount, cashedAt: null }],
      )
      play('click')
    }
  }, [placeBet, game.name, game.id, play])

  const cashout = useCallback((idx: number) => {
    const s = slotsRef.current[idx]
    if (!s || phaseRef.current !== 'flying' || !s.active) return
    if (paidRef.current.has(idx)) return
    const at = multRef.current
    paidRef.current.add(idx)
    const won = s.amount * at
    payout(won, game.name, game.id, `Retirada ${fmtCrash(at)}`)
    setSlots((prev) => prev.map((x, i) => (i === idx ? { ...x, active: false, cashedAt: at } : x)))
    setPlayerBets((prev) => prev.map((p) => (p.idx === idx ? { ...p, cashedAt: at } : p)))
    addCashouts([{ id: uid(), name: 'Tu', kind: 'player', mult: at, bet: s.amount, won, round: roundRef.current }])
    setFx({ kind: 'cashout', key: uid(), mult: at, amount: won })
    play('cashout')
    playCrashCue(game.id, 'cashout', soundRef.current)
  }, [addCashouts, payout, game.name, game.id, play])

  betRef.current = bet

  const setSlot = (idx: number, patch: Partial<Slot>) => {
    setSlots((prev) => prev.map((x, i) => (i === idx ? { ...x, ...patch } : x)))
  }

  /** Valor partilhado pelos slots ainda por colocar; quick picks sempre dentro de min/max. */
  const setAmount = (n: number) => {
    const value = clamp(Math.round(n * 100) / 100, min, max)
    setBetAmount(value)
    setSlots((prev) => prev.map((s) => (s.active ? s : { ...s, amount: value })))
  }

  const betAll = () => {
    slotsRef.current.forEach((s, idx) => {
      if (!s.active) betRef.current(idx)
    })
  }

  const cashoutAll = () => {
    slotsRef.current.forEach((s, idx) => {
      if (s.active) cashout(idx)
    })
  }

  const cancelAuto = () => {
    setAutoReplay(false)
    setSlots((prev) => prev.map((s) => ({ ...s, auto: false })))
    play('tick')
  }

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
    setPlayerBets([])
    setFx(null)
    setLastCrash(null)
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
    setLastCrash(crash)
    play('crash')
    playCrashCue(game.id, 'crash', soundRef.current)
    setHistory((h) => [crash, ...h].slice(0, 200))
    setSlots((prev) => prev.map((s) => (s.active ? { ...s, active: false, cashedAt: null } : s)))
    // Cashouts de bots são apenas registo visual: derivados da semente, nunca da carteira.
    const roundBots = makeBotRound(seedRef.current, min, max, variant)
    addCashouts(
      roundBots
        .filter((bot) => botStatus(bot, 'crashed', crash, crash) === 'cashed')
        .map((bot) => ({
          id: uid(),
          name: bot.name,
          kind: 'bot' as const,
          mult: bot.target,
          bet: bot.bet,
          won: botCashout(bot, 'cashed'),
          round: roundRef.current,
        })),
    )
    setFx({ kind: 'crash', key: uid(), mult: crash, amount: 0 })
    nextAtRef.current = performance.now() + 3600
    nextTotalRef.current = 3.6
    if (resetTimerRef.current) window.clearTimeout(resetTimerRef.current)
    resetTimerRef.current = window.setTimeout(() => {
      resetTimerRef.current = null
      resetRef.current()
    }, 3600)
  }, [play, min, max, variant, addCashouts, game.id])

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

  // histórico por jogo: carregado no mount e gravado a cada ronda concluída
  useEffect(() => {
    save(historyKey, history.slice(0, 200))
  }, [historyKey, history])

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
        crashRef.current = crashFromSeed(seedRef.current, EDGE, maxMult)
        roundRef.current += 1
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
        playCrashCue(game.id, 'launch', soundRef.current)
      }
    }, 1000)
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current)
      countdownRef.current = null
    }
  }, [phase, maxMult, growth, play, game.id])

  // auto-bet when a new betting round opens (via ref: o efeito não se repete a cada render)
  useEffect(() => {
    if (phase !== 'betting') return
    slotsRef.current.forEach((s, idx) => {
      if (s.auto && !s.active) betRef.current(idx)
    })
  }, [phase])

  const autoSlots = [0, 1, 2].map((i) => slots[i] ?? EMPTY_SLOT(min))
  useAutoCashout({ active: slotCount > 0 && autoSlots[0].active, value: mult, target: autoSlots[0].autoCash, enabled: slotCount > 0 && autoSlots[0].auto, onCashout: () => cashout(0) })
  useAutoCashout({ active: slotCount > 1 && autoSlots[1].active, value: mult, target: autoSlots[1].autoCash, enabled: slotCount > 1 && autoSlots[1].auto, onCashout: () => cashout(1) })
  useAutoCashout({ active: slotCount > 2 && autoSlots[2].active, value: mult, target: autoSlots[2].autoCash, enabled: slotCount > 2 && autoSlots[2].auto, onCashout: () => cashout(2) })
  useAutoReplay({
    idle: phase === 'betting',
    enabled: autoReplay,
    onStart: betAll,
  })

  const proof = phase === 'crashed' ? seed : hashHex(seed)
  const verified = phase === 'crashed' && verifyCrash(seed, lastCrash ?? crashRef.current, EDGE, maxMult)
  const statusColor = phase === 'crashed' ? 'text-brand' : phase === 'flying' ? 'text-good' : 'text-gold'
  const anyActive = slots.some((s) => s.active)
  const anyCashed = slots.some((s) => s.cashedAt !== null) || playerBets.some((p) => p.cashedAt !== null)
  const primaryLabel =
    phase === 'crashed'
      ? anyCashed
        ? 'GANHO CONFIRMADO'
        : playerBets.length > 0
          ? 'APOSTA PERDIDA'
          : 'APOSTAR'
      : phase === 'flying' && anyActive
        ? 'CASHOUT'
        : 'APOSTAR'
  const primaryTone = primaryLabel === 'CASHOUT' || primaryLabel === 'GANHO CONFIRMADO' ? 'cashout' : 'bet'
  const primaryDisabled =
    primaryLabel === 'CASHOUT'
      ? !anyActive
      : primaryLabel === 'APOSTAR'
        ? phase !== 'betting' || slots.every((s) => s.active)
        : true

  return (
    <GameLayout
      dock={false}
      stage={
        <Stage className="overflow-x-hidden">
          {/* ZONA A — uma entrada por ronda concluída, mais recente primeiro; nunca apostas individuais */}
          <div className="crash-history-strip no-scrollbar flex items-center gap-1.5 overflow-x-auto border-b border-line/70 bg-black/35 px-3 py-2">
            <span className="shrink-0 pr-1 text-[9px] font-bold uppercase tracking-[.16em] text-white/35">Histórico</span>
            {history.length === 0 && <span className="shrink-0 text-[10px] text-white/30">Sem rondas concluídas</span>}
            {history.map((h, i) => {
              const tier = tierOf(h)
              return (
                <span
                  key={`${i}-${h}`}
                  className={`crash-history-item shrink-0 animate-riseIn rounded-md border px-2 py-1 text-[10px] font-extrabold tabular ${TIER_CLASS[tier]}`}
                  data-tier={tier}
                >
                  {fmtCrash(h)}
                </span>
              )
            })}
          </div>

          {/* ZONA B — palco dominante: canvas grande e leituras, sem botões nem listas sobrepostas */}
          <div className="crash-main">
          <div className="relative">
            <canvas ref={canvasRef} className="block aspect-[4/3] w-full min-h-[220px] sm:aspect-[16/9] sm:min-h-[320px]" />
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="text-center">
                <p className={`crash-mult font-display text-[clamp(38px,8vw,72px)] font-extrabold leading-none tabular ${statusColor} ${phase === 'flying' ? 'animate-pulseGlow' : ''} drop-shadow-[0_4px_24px_rgba(0,0,0,.7)]`}>
                  {phase === 'betting' ? `${countdown}s` : fmtCrash(phase === 'crashed' ? crashRef.current : mult)}
                </p>
                <p className="crash-status mt-1 text-[11px] font-semibold uppercase tracking-[.22em] text-white/45">
                  {phase === 'betting' ? 'A ronda começa' : phase === 'flying' ? 'Multiplicador atual' : 'Crash confirmado'}
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
            {/* animação de crash / cashout, sem controlos dentro do palco */}
            <div className="crash-fx pointer-events-none absolute inset-0 z-20 grid place-items-center overflow-hidden" aria-live="polite">
              {fx && (
                <span
                  key={fx.key}
                  className={`animate-popIn rounded-xl border px-4 py-2 text-center font-display text-sm font-extrabold tabular drop-shadow-[0_4px_18px_rgba(0,0,0,.8)] ${
                    fx.kind === 'cashout' ? 'border-good/50 bg-good/15 text-good' : 'border-brand/50 bg-brand/15 text-brand'
                  }`}
                >
                  {fx.kind === 'cashout'
                    ? `+${fmt(fx.amount)} B$ · ${fmtCrash(fx.mult)} ${variant.glyph}`
                    : `CRASH ${fmtCrash(fx.mult)} 💥`}
                </span>
              )}
            </div>
            <div className="absolute left-3 top-3 z-10 flex items-center gap-2">
              <span className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
                phase === 'betting' ? 'border-gold/30 bg-gold/10 text-gold' : phase === 'flying' ? 'border-good/30 bg-good/10 text-good' : 'border-brand/30 bg-brand/10 text-brand'
              }`}>
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
                {phase === 'betting' ? 'Apostas abertas' : phase === 'flying' ? 'Em voo' : 'Caiu'}
              </span>
              <span className="rounded-full border border-white/10 bg-black/45 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider" style={{ color: variant.accent }}>
                {variant.glyph} BLAZE {variant.signature}
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
          </div>

          {/* PAINEL DE APOSTAS — apenas controlos de aposta, sempre dentro do Stage */}
          <div className="crash-bet-panel bet-bar relative z-10 mt-2 p-2 sm:mt-3 sm:p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[.14em] text-white/75">Painel de aposta</p>
                <p className="text-[9px] uppercase tracking-wider text-white/35">
                  Limites {fmt(min)}–{fmt(max)} B$ · saldo {fmt(balance)} B$ · {slotCount} aposta{slotCount === 1 ? '' : 's'}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {phase === 'betting' && (autoReplay || slots.some((s) => s.auto)) && (
                  <ActionButton tone="ghost" size="compact" onClick={cancelAuto}>Cancelar auto</ActionButton>
                )}
                <span className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-[9px] font-bold uppercase tracking-wider" style={{ color: variant.accent }}>
                  {variant.glyph} {variant.signature}
                </span>
              </div>
            </div>

            <div className="grid gap-2 lg:grid-cols-[minmax(0,1fr)_320px]">
              <div>
                <div className="flex items-stretch overflow-hidden rounded-xl border border-line bg-black/40 focus-within:border-brand/50">
                  <button type="button" aria-label="Diminuir valor da aposta" onClick={() => setAmount(betAmount - 10)} className="h-11 w-11 shrink-0 text-lg text-white/60 transition hover:bg-white/5 hover:text-white">−</button>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={betAmount}
                    min={min}
                    max={max}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    className="w-full bg-transparent py-2.5 text-center text-base font-bold tabular text-white outline-none"
                  />
                  <button type="button" aria-label="Aumentar valor da aposta" onClick={() => setAmount(betAmount + 10)} className="h-11 w-11 shrink-0 text-lg text-white/60 transition hover:bg-white/5 hover:text-white">+</button>
                </div>
                <div className="mt-2 grid grid-cols-4 gap-1.5">
                  {[50, 100, 200, 500].map((n) => {
                    const value = clamp(n, min, max)
                    return (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setAmount(n)}
                        className={`h-10 rounded-lg border px-1 text-[11px] font-bold tabular transition ${
                          betAmount === value
                            ? 'border-brand/50 bg-brand/10 text-white'
                            : 'border-line bg-white/[.02] text-white/50 hover:border-white/25 hover:text-white'
                        }`}
                      >
                        {fmt(n).replace(',00', '')}
                      </button>
                    )
                  })}
                </div>
                <ActionButton
                  tone={primaryTone}
                  onClick={() => (primaryLabel === 'CASHOUT' ? cashoutAll() : betAll())}
                  disabled={primaryDisabled}
                  className="mt-2 min-h-[48px]"
                >
                  {primaryLabel}
                </ActionButton>
              </div>
              <AutoBetControl active={autoReplay} onToggle={() => setAutoReplay((v) => !v)} />
            </div>

            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {slots.map((s, i) => {
                const p = playerBets.find((b) => b.idx === i)
                const wonAt = s.cashedAt ?? p?.cashedAt ?? null
                const lost = phase === 'crashed' && !!p && wonAt === null
                const slotState = wonAt !== null ? 'win' : lost ? 'lose' : s.active ? (phase === 'betting' ? 'placed' : 'flying') : 'idle'
                const stateLabel = wonAt !== null
                  ? `Ganho ${fmtCrash(wonAt)}`
                  : lost
                    ? 'Aposta perdida'
                    : s.active
                      ? phase === 'betting' ? 'Apostado' : 'Em voo'
                      : 'Pronta'
                return (
                  <div
                    key={i}
                    className={`crash-slot rounded-xl border p-2 transition-colors duration-300 sm:p-2.5 ${
                      wonAt !== null
                        ? 'border-good/40 bg-good/[.06]'
                        : lost
                          ? 'border-brand/30 bg-brand/[.05]'
                          : s.active
                            ? 'border-brand/40 bg-brand/[.06]'
                            : 'border-line/70 bg-white/[.02]'
                    }`}
                    data-state={slotState}
                  >
                    <div className="mb-1.5 flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-white/40">Aposta {i + 1}</span>
                      <span className={`text-[10px] font-bold ${wonAt !== null ? 'text-good' : lost ? 'text-brand' : s.active ? 'text-good' : 'text-white/35'}`}>{stateLabel}</span>
                    </div>
                    <input
                      type="number"
                      value={s.amount}
                      min={min}
                      max={max}
                      disabled={s.active || phase !== 'betting'}
                      onChange={(e) => setSlot(i, { amount: clamp(Number(e.target.value), min, max) })}
                      className="input w-full py-1.5 text-center text-sm tabular"
                    />
                    {/* rápidos por slot, sempre dentro de min/max */}
                    <div className="mt-1.5 grid grid-cols-4 gap-1">
                      {[50, 100, 200, 500].map((n) => {
                        const value = clamp(n, min, max)
                        return (
                          <button
                            key={n}
                            type="button"
                            disabled={s.active || phase !== 'betting'}
                            onClick={() => setSlot(i, { amount: value })}
                            className={`h-8 rounded-md border px-0.5 text-[9px] font-bold tabular transition disabled:opacity-40 ${
                              s.amount === value
                                ? 'border-brand/50 bg-brand/10 text-white'
                                : 'border-line bg-white/[.02] text-white/45 hover:border-white/25 hover:text-white'
                            }`}
                          >
                            {fmt(n).replace(',00', '')}
                          </button>
                        )
                      })}
                    </div>
                    <div className="mt-1.5 grid grid-cols-2 gap-1.5">
                      <ActionButton tone={s.active ? 'placed' : 'bet'} size="compact" onClick={() => bet(i)} disabled={phase !== 'betting' || s.active} className="w-full">
                        {s.active ? 'APOSTADO' : 'APOSTAR'}
                      </ActionButton>
                      <ActionButton tone="cashout" size="compact" onClick={() => cashout(i)} disabled={phase !== 'flying' || !s.active} className="w-full">
                        {phase === 'flying' && s.active ? `CASHOUT ${fmtCrash(mult)}` : 'CASHOUT'}
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
                    {wonAt !== null && <p className="mt-1.5 text-[10px] font-bold tabular text-good">Recebido {fmt(s.amount * wonAt)} B$</p>}
                  </div>
                )
              })}
            </div>
          </div>
          {/* ZONA C — jogadores e todas as apostas, dentro do Stage; bots sempre DEMONSTRAÇÃO */}
          <div className="crash-live mt-3 rounded-2xl border border-line/70 bg-[#05060a]/80 p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
              <h3 className="text-[11px] font-bold uppercase tracking-[.16em] text-white/75">LIVE PLAYERS / ALL BETS</h3>
              <span className="text-[9px] font-bold uppercase tracking-wider text-gold/80">DEMONSTRAÇÃO · bots sem carteira real</span>
            </div>
            <div className="crash-bots no-scrollbar max-h-[212px] space-y-1.5 overflow-y-auto pr-1">
              {playerBets.length === 0 && bots.length === 0 && (
                <p className="text-[10px] text-white/30">Sem participantes nesta ronda.</p>
              )}
              {playerBets.map((p) => {
                const status: BotStatus = p.cashedAt !== null
                  ? 'cashed'
                  : phase === 'betting'
                    ? 'waiting'
                    : phase === 'flying'
                      ? 'flying'
                      : 'crashed'
                return (
                  <div
                    key={`player-${p.idx}-${status}`}
                    className="crash-bot flex min-w-0 animate-riseIn items-center gap-2 rounded-lg border border-good/25 bg-good/[.05] px-2.5 py-1.5 transition-colors duration-300"
                    data-kind="player"
                    data-status={status}
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-[11px] font-extrabold text-ink" style={{ background: `linear-gradient(135deg, ${variant.line}, #22e3a0)` }}>T</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[11px] font-bold text-good">Tu <span className="font-medium text-white/40">· aposta {p.idx + 1}</span></p>
                      <p className="truncate text-[9px] uppercase tracking-wider text-white/35">Carteira real B$ · {fmt(p.amount)} B$</p>
                    </div>
                    <span className={`shrink-0 text-right text-[10px] font-bold ${status === 'cashed' ? 'text-good' : status === 'crashed' ? 'text-brand' : 'text-white/50'}`}>
                      <span className="block">{status === 'waiting' ? 'à espera' : status === 'flying' ? 'a voar' : status === 'cashed' ? `saída ${fmtCrash(p.cashedAt ?? 1)}` : 'perdeu'}</span>
                      {status === 'cashed' && <span className="block tabular text-good">+{fmt(p.amount * (p.cashedAt ?? 1))} B$</span>}
                    </span>
                  </div>
                )
              })}
              {botViews.map((bot) => (
                <div
                  key={`${bot.id}-${bot.status}`}
                  className="crash-bot flex min-w-0 animate-riseIn items-center gap-2 rounded-lg border border-line/60 bg-black/25 px-2.5 py-1.5 transition-colors duration-300"
                  data-kind="bot"
                  data-status={bot.status}
                >
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-[11px] font-extrabold text-ink" style={{ background: `linear-gradient(135deg, ${variant.line}, ${variant.accent})` }}>
                    {bot.name.slice(4, 5)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-bold text-white/85">
                      {bot.name} <span className="ml-1 rounded bg-white/10 px-1 text-[8px] font-bold uppercase tracking-wider text-white/45">DEMO</span>
                    </p>
                    <p className="truncate text-[9px] uppercase tracking-wider text-white/35">
                      {BOT_STYLE_LABEL[bot.style]} · aposta {fmt(bot.bet)} B$ · alvo {fmtCrash(bot.target)}
                    </p>
                  </div>
                  <span className={`shrink-0 text-right text-[10px] font-bold ${
                    bot.status === 'cashed' ? 'text-good' : bot.status === 'crashed' ? 'text-brand' : 'text-white/45'
                  }`}>
                    <span className="block">{bot.status === 'waiting' ? 'à espera' : bot.status === 'flying' ? 'a voar' : bot.status === 'cashed' ? `retirado ${fmtCrash(bot.target)}` : 'quebrou'}</span>
                    {bot.status === 'cashed' && <span className="block tabular text-good">+{fmt(bot.simulatedPayout)} B$ simulado</span>}
                  </span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[9px] leading-snug text-white/30">
              {cashedBots.length}/{bots.length} retiradas simuladas · {fmt(simulatedCashouts)} B$ de demonstração, sem ligação à carteira BLAZE.
            </p>
          </div>

          {/* ZONA D — registo de cashouts, separado do histórico (A) e da lista ao vivo (C) */}
          <div className="crash-activity mt-3 rounded-2xl border border-line/70 bg-[#05060a]/80 p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-[11px] font-bold uppercase tracking-[.16em] text-white/75">CASH OUT ACTIVITY</h3>
              <span className="text-[9px] font-bold uppercase tracking-wider text-gold/80">DEMONSTRAÇÃO para bots</span>
            </div>
            <div className="no-scrollbar max-h-[190px] space-y-1 overflow-y-auto pr-1">
              {cashouts.length === 0 && <p className="text-[10px] text-white/30">Ainda sem cashouts nesta sessão.</p>}
              {cashouts.map((c) => (
                <div key={c.id} className="crash-cashout-item flex animate-riseIn items-center gap-2 rounded-lg border border-line/60 bg-white/[.02] px-2 py-1.5" data-kind={c.kind}>
                  <span className={`grid h-6 w-6 shrink-0 place-items-center rounded-md text-[10px] font-extrabold ${c.kind === 'player' ? 'bg-good/20 text-good' : 'bg-white/10 text-white/60'}`}>
                    {c.kind === 'player' ? 'T' : 'B'}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[10px] font-bold text-white/80">
                    {c.name}
                    {c.kind === 'bot' && <span className="ml-1 rounded bg-white/10 px-1 text-[8px] font-bold uppercase text-white/40">demo</span>}
                  </span>
                  <span className="shrink-0 text-[10px] font-extrabold tabular text-good">{fmtCrash(c.mult)}</span>
                  <span className="shrink-0 text-[9px] tabular text-white/35">{fmt(c.bet)} B$</span>
                  <span className="shrink-0 text-[10px] font-bold tabular text-good">+{fmt(c.won)} B$</span>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[9px] text-white/30">Saídas de bots são simuladas; só as linhas «Tu» usam saldo real B$ (créditos fictícios).</p>
          </div>
        </Stage>
      }
      side={
        <div className="space-y-4">
          <SidePanel title="Prova verificável" icon="info">
            <div className="rounded-xl border border-line/60 bg-black/25 p-3">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white/40">
                <Icon name="shield" size={12} />
                {phase === 'crashed' ? 'Semente revelada' : 'Compromisso (hash) antes do voo'}
              </p>
              <p className="mt-1.5 break-all font-mono text-[10px] leading-relaxed text-white/60">{proof}</p>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className={`text-[10px] font-bold ${verified ? 'text-good' : 'text-brand'}`}>
                  {phase === 'crashed' ? (verified ? 'Verificado' : 'Falha na verificação') : 'Aguardando crash'}
                </span>
                {phase === 'crashed' && lastCrash !== null && (
                  <span className="text-[10px] font-bold tabular text-white/60">crash {fmtCrash(lastCrash)}</span>
                )}
              </div>
            </div>
            <p className="mt-2 text-[10px] leading-snug text-white/35">
              O ponto vem apenas de <code>crashFromSeed(semente, 0.03, teto)</code>. Recalcula localmente e compara: prova sem servidor nem autoridade de operador.
            </p>
            <p className="mt-2 text-[9px] leading-snug text-white/25">B$ são créditos fictícios de demonstração — nunca dinheiro real.</p>
          </SidePanel>
          <SidePanel title={`Regras · BLAZE ${variant.name}`} icon="info">
            <div className="flex items-center gap-2">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-xl" style={{ background: variant.wash, color: variant.accent }}>
                {variant.glyph}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[11px] font-bold text-white/85">{variant.mechanicLabel}</p>
                <p className="truncate text-[9px] uppercase tracking-wider text-white/35">
                  {variant.signature} · {(growth * 100).toFixed(1)}%/s · teto {fmtCrash(maxMult)}
                </p>
              </div>
            </div>
            <p className="mt-2 text-[10px] leading-relaxed text-white/40">{game.rules}</p>
            <ul className="mt-2 space-y-1.5 text-[10px] leading-snug">
              <li className="rounded-lg border border-good/25 bg-good/[.06] px-2.5 py-2 text-good">
                <span className="font-bold">Vantagem:</span> {variant.perk}
              </li>
              <li className="rounded-lg border border-brand/25 bg-brand/[.06] px-2.5 py-2 text-brand/90">
                <span className="font-bold">Desvantagem:</span> {variant.drawback}
              </li>
              <li className="text-white/35">• Mín. {fmt(min)} B$ / máx. {fmt(max)} B$ · {slotCount} aposta{slotCount === 1 ? '' : 's'} independente{slotCount === 1 ? '' : 's'}.</li>
              <li className="text-white/35">• Retira antes do crash para garantir o multiplicador.</li>
            </ul>
          </SidePanel>
        </div>
      }
    />
  )
}
