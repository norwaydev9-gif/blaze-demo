import { useCallback, useEffect, useRef, useState } from 'react'
import type { Game } from '../lib/types'
import { fmt, clamp } from '../lib/format'
import { rand } from '../lib/rng'
import { useWallet } from '../lib/wallet'
import { useSound } from '../lib/sound'
import { ActionButton, BetInput, GameLayout, Payout, RecentStrip, ResultBanner, SidePanel, Stage } from '../components/GameUI'

function comb(n: number, k: number): number {
  if (k < 0 || k > n) return 0
  let r = 1
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i
  return r
}

function multipliers(rows: number, risk: 'low' | 'medium' | 'high'): number[] {
  const alpha = risk === 'low' ? 0.42 : risk === 'medium' ? 0.62 : 0.84
  const cap = risk === 'low' ? 25 : risk === 'medium' ? 150 : 1000
  const raw: number[] = []
  let ev = 0
  for (let k = 0; k <= rows; k++) {
    const p = comb(rows, k) / Math.pow(2, rows)
    const v = Math.pow(0.99 / p, alpha)
    raw.push(v)
    ev += p * v
  }
  const scale = 0.97 / ev
  return raw.map((v) => Math.max(0.2, Math.min(cap, Math.round(v * scale * 100) / 100)))
}

interface Ball {
  points: { x: number; y: number }[]
  start: number
  duration: number
  bucket: number
  amount: number
  table: number[]
  settled: boolean
}

export function PlinkoGame({ game }: { game: Game }) {
  const rows = Number(game.config.rows ?? 12)
  const defaultRisk = (String(game.config.risk ?? 'medium') as 'low' | 'medium' | 'high') || 'medium'
  const min = game.minBet
  const max = game.maxBet
  const { balance, placeBet, payout } = useWallet()
  const { play } = useSound()

  const [amount, setAmount] = useState(min)
  const [risk, setRisk] = useState<'low' | 'medium' | 'high'>(defaultRisk)
  const [history, setHistory] = useState<number[]>([])
  const [dropping, setDropping] = useState(0)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const ballsRef = useRef<Ball[]>([])
  const rafRef = useRef(0)
  const table = multipliers(rows, risk)
  const tableRef = useRef(table)
  tableRef.current = table

  const settle = useCallback(
    (ball: Ball) => {
      const m = ball.table[ball.bucket] ?? 0
      setHistory((h) => [m, ...h].slice(0, 18))
      if (m > 0) {
        payout(ball.amount * m, game.name, game.id, `Caiu em ${m}×`)
        play('win')
      } else {
        play('lose')
      }
      setDropping((d) => Math.max(0, d - 1))
    },
    [game.name, game.id, payout, play],
  )

  const draw = useCallback(() => {
    const now = performance.now()
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

    const topY = h * 0.07
    const bottomY = h * 0.84
    const spanX = Math.min(w * 0.86, 640)
    const xAt = (k: number, r: number) => w / 2 + ((k - r / 2) / rows) * spanX
    const yAt = (r: number) => topY + (r / rows) * (bottomY - topY)

    // pegs
    for (let r = 0; r < rows; r++) {
      for (let k = 0; k <= r; k++) {
        const x = xAt(k, r)
        const y = yAt(r)
        const pulse = 0.28 + Math.sin(now / 520 + r * 0.7 + k) * 0.1
        ctx.beginPath()
        ctx.arc(x, y, 2.6, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,255,255,${pulse.toFixed(2)})`
        ctx.fill()
        ctx.beginPath()
        ctx.arc(x, y, 6.5, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(255,200,87,${(pulse * 0.22).toFixed(2)})`
        ctx.fill()
      }
    }

    // buckets
    const bucketW = spanX / (rows + 1)
    const bucketY = h * 0.88
    for (let k = 0; k <= rows; k++) {
      const m = tableRef.current[k]
      const x = w / 2 + ((k - rows / 2) / rows) * spanX - bucketW / 2 + bucketW / 2
      const color = m >= 10 ? '#ffc857' : m >= 2 ? '#ff6b3d' : m >= 1 ? '#22e3a0' : 'rgba(255,255,255,.18)'
      const bw = Math.max(14, bucketW - 4)
      const bx = x - bw / 2
      const by = bucketY
      const bh = h * 0.09
      ctx.beginPath()
      if (typeof ctx.roundRect === 'function') ctx.roundRect(bx, by, bw, bh, 5)
      else ctx.rect(bx, by, bw, bh)
      ctx.fillStyle = `${color}22`
      ctx.fill()
      ctx.strokeStyle = `${color}88`
      ctx.lineWidth = 1
      ctx.stroke()
      ctx.fillStyle = color
      ctx.font = `700 ${rows > 13 ? 8 : 10}px Inter, system-ui, sans-serif`
      ctx.textAlign = 'center'
      ctx.fillText(`${m}×`, x, by + bh / 2 + 3)
    }

    // balls
    ballsRef.current = ballsRef.current.filter((ball) => {
      const t = clamp((now - ball.start) / ball.duration, 0, 1)
      const eased = t
      const segs = ball.points.length - 1
      const pos = eased * segs
      const idx = Math.min(segs - 1, Math.floor(pos))
      const local = pos - idx
      const p0 = ball.points[idx]
      const p1 = ball.points[idx + 1]
      const x = (p0.x + (p1.x - p0.x) * local) * w
      const y = (p0.y + (p1.y - p0.y) * local) * h + Math.sin(local * Math.PI) * 2
      ctx.beginPath()
      ctx.arc(x, y, 6, 0, Math.PI * 2)
      const g = ctx.createRadialGradient(x - 2, y - 2, 1, x, y, 7)
      g.addColorStop(0, '#fff')
      g.addColorStop(0.4, '#ff6b6b')
      g.addColorStop(1, '#ff2d3f')
      ctx.fillStyle = g
      ctx.shadowColor = '#ff2d3f'
      ctx.shadowBlur = 14
      ctx.fill()
      ctx.shadowBlur = 0
      if (t >= 1 && !ball.settled) {
        ball.settled = true
        settle(ball)
        return false
      }
      return true
    })
  }, [rows, settle])

  useEffect(() => {
    const loop = () => {
      draw()
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(rafRef.current)
  }, [draw])

  useEffect(() => () => {
    ballsRef.current = []
  }, [])

  const drop = () => {
    if (!placeBet(amount, game.name, game.id, `Plinko ${risk}`)) return
    let rights = 0
    const path: { x: number; y: number }[] = []
    const spanX = 0.86
    path.push({ x: 0.5, y: 0.02 })
    for (let r = 1; r <= rows; r++) {
      if (rand() < 0.5) rights++
      const k = rights
      path.push({ x: 0.5 + ((k - r / 2) / rows) * spanX, y: 0.07 + (r / rows) * 0.77 })
    }
    const bucket = rights
    path.push({ x: 0.5 + ((bucket - rows / 2) / rows) * spanX, y: 0.9 })
    ballsRef.current.push({
      points: path,
      start: performance.now(),
      duration: 1100 + rows * 28,
      bucket,
      amount,
      table: tableRef.current.slice(),
      settled: false,
    })
    setDropping((d) => d + 1)
    play('click')
  }

  return (
    <GameLayout
      stage={
        <Stage>
          <div className="relative">
            <canvas ref={canvasRef} className="block aspect-square w-full sm:aspect-[4/3]" />
            {dropping > 0 && (
              <span className="absolute right-3 top-3 rounded-full border border-brand/30 bg-brand/10 px-2.5 py-1 text-[10px] font-bold text-brand">
                {dropping} bola(s) em jogo
              </span>
            )}
          </div>
          <div className="px-3">
            <ResultBanner
              state={history.length === 0 ? 'idle' : parseFloat(String(history[0])) > 1 ? 'win' : 'lose'}
              text={history.length > 0 && parseFloat(String(history[0])) > 1 ? `+${fmt(amount * parseFloat(String(history[0])))} B$` : 'Sem ganho neste lançamento.'}
            />
          </div>
          <div className="bet-bar relative z-10 mt-3 rounded-2xl border border-white/10 bg-[#05060a]/95 p-3 shadow-[0_-8px_30px_rgba(0,0,0,.45)]">
            <div className="grid gap-3 sm:grid-cols-2">
              <BetInput value={amount} onChange={setAmount} min={min} max={max} />
              <div className="min-w-0">
                <span className="label">Risco</span>
                <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                  {(['low', 'medium', 'high'] as const).map((r) => (
                    <ActionButton
                      key={r}
                      tone="ghost"
                      size="compact"
                      onClick={() => setRisk(r)}
                      disabled={dropping > 0}
                      className={risk === r ? 'border-brand/50 bg-brand/15 text-white' : ''}
                    >
                      {r === 'low' ? 'Baixo' : r === 'medium' ? 'Médio' : 'Alto'}
                    </ActionButton>
                  ))}
                </div>
              </div>
            </div>
            <ActionButton tone={dropping > 0 ? 'placed' : 'bet'} icon="bolt" onClick={drop} className="mt-3">
              Largar bola · {fmt(amount)} B$
            </ActionButton>
          </div>
        </Stage>
      }
      side={
        <div className="space-y-4">
          <SidePanel title="Detalhes da aposta">
            <div className="space-y-1.5">
              <Payout label="Linhas" value={String(rows)} />
              <Payout label="Multiplicador máx." value={`${Math.max(...table)}×`} />
              <Payout label="Saldo" value={`${fmt(balance)} B$`} />
            </div>
          </SidePanel>
          <SidePanel title="Últimos prémios">
            <RecentStrip
              items={history.map((m) => `${m}×`)}
              colorFor={(v) => (parseFloat(String(v)) >= 2 ? 'text-gold border-gold/30' : 'text-white/35')}
            />
          </SidePanel>
        </div>
      }
    />
  )
}
