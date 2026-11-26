import { useCallback, useEffect, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import type { Game } from '../lib/types'
import { fmt, clamp } from '../lib/format'
import { rand, randInt } from '../lib/rng'
import { useWallet } from '../lib/wallet'
import { useSound } from '../lib/sound'
import { ActionButton, BetInput, GameLayout, Payout, RecentStrip, ResultBanner, SidePanel, Stage } from '../components/GameUI'

const W = 640
const H = 420
const GROUND = H - 52

type Mode = 'runner' | 'shooter' | 'catcher' | 'quest' | 'race'

interface Obj {
  x: number
  y: number
  vx: number
  vy: number
  w: number
  h: number
  kind: string
  scored?: boolean
}

interface ArcadeState {
  px: number
  py: number
  vy: number
  onGround: boolean
  targetX: number
  targetY: number
  objects: Obj[]
  bullets: Obj[]
  score: number
  lives: number
  elapsed: number
  spawn: number
  fire: number
  over: boolean
  jump: boolean
}

function modeFor(engine: string): Mode {
  if (engine === 'arcadeShooter') return 'shooter'
  if (engine === 'arcadeCatcher') return 'catcher'
  if (engine === 'arcadeQuest') return 'quest'
  if (engine === 'arcadeRace') return 'race'
  return 'runner'
}

function fresh(): ArcadeState {
  return {
    px: W / 2,
    py: GROUND - 18,
    vy: 0,
    onGround: true,
    targetX: W / 2,
    targetY: GROUND - 18,
    objects: [],
    bullets: [],
    score: 0,
    lives: 3,
    elapsed: 0,
    spawn: 0,
    fire: 0,
    over: false,
    jump: false,
  }
}

export function ArcadeGame({ game }: { game: Game }) {
  const mode = modeFor(game.engine)
  const timed = mode === 'shooter' || mode === 'catcher' || mode === 'quest'
  const duration = 30
  const { balance, placeBet, payout } = useWallet()
  const { play } = useSound()
  const [amount, setAmount] = useState(game.minBet)
  const [running, setRunning] = useState(false)
  const [score, setScore] = useState(0)
  const [lives, setLives] = useState(3)
  const [timeLeft, setTimeLeft] = useState(duration)
  const [result, setResult] = useState<{ text: string; win: number } | null>(null)
  const [history, setHistory] = useState<string[]>([])
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef<ArcadeState>(fresh())
  const runningRef = useRef(false)
  const keys = useRef<Set<string>>(new Set())
  const raf = useRef(0)
  const last = useRef(0)
  const lastSync = useRef(0)

  const finish = useCallback(() => {
    const s = stateRef.current
    if (s.over) return
    s.over = true
    runningRef.current = false
    setRunning(false)
    const win = s.score >= 3 ? amount * Math.min(20, 0.5 + s.score * 0.25) : 0
    setResult({ text: s.score >= 3 ? `Pontuação ${s.score}` : 'Pontuação insuficiente', win })
    setHistory((h) => [`${s.score} pts`, ...h].slice(0, 12))
    if (win > 0) {
      payout(win, game.name, game.id, `${s.score} pontos`)
      play('win')
    } else play('lose')
  }, [amount, game.name, game.id, payout, play])

  const draw = useCallback(
    (s: ArcadeState) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, W, H)
      // background
      const bg = ctx.createLinearGradient(0, 0, 0, H)
      bg.addColorStop(0, game.theme.from)
      bg.addColorStop(1, '#05060a')
      ctx.fillStyle = bg
      ctx.fillRect(0, 0, W, H)
      ctx.strokeStyle = 'rgba(255,255,255,.055)'
      ctx.lineWidth = 1
      for (let x = 0; x < W; x += 40) {
        ctx.beginPath()
        ctx.moveTo(x, 0)
        ctx.lineTo(x, H)
        ctx.stroke()
      }
      for (let y = 0; y < H; y += 40) {
        ctx.beginPath()
        ctx.moveTo(0, y)
        ctx.lineTo(W, y)
        ctx.stroke()
      }
      ctx.fillStyle = `${game.theme.to}22`
      ctx.fillRect(0, GROUND + 20, W, H - GROUND - 20)
      ctx.strokeStyle = `${game.theme.to}88`
      ctx.beginPath()
      ctx.moveTo(0, GROUND + 20)
      ctx.lineTo(W, GROUND + 20)
      ctx.stroke()

      const glow = (color: string) => {
        ctx.shadowColor = color
        ctx.shadowBlur = 16
      }
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'

      // player
      glow(game.theme.to)
      ctx.font = '34px serif'
      const playerIcon = mode === 'runner' ? '🏃' : mode === 'race' ? '🏎️' : mode === 'shooter' ? '🚀' : mode === 'catcher' ? '🧺' : '🤠'
      ctx.fillText(playerIcon, s.px, s.py)
      ctx.shadowBlur = 0

      // objects
      s.objects.forEach((o) => {
        glow(o.kind === 'bomb' || o.kind === 'enemy' ? '#ff2d3f' : game.theme.to)
        ctx.font = `${o.kind === 'bullet' ? 10 : 26}px serif`
        const icon =
          o.kind === 'obstacle' ? (mode === 'race' ? '🚗' : '🚧') : o.kind === 'bomb' ? '💣' : o.kind === 'enemy' ? '👾' : o.kind === 'coin' ? '🪙' : o.kind === 'fruit' ? '🍎' : '❓'
        ctx.fillText(icon, o.x + o.w / 2, o.y + o.h / 2)
        ctx.shadowBlur = 0
      })

      // bullets
      s.bullets.forEach((b) => {
        glow('#5ee7ff')
        ctx.fillStyle = '#5ee7ff'
        ctx.fillRect(b.x, b.y, b.w, b.h)
        ctx.shadowBlur = 0
      })

      // HUD
      ctx.fillStyle = 'rgba(0,0,0,.45)'
      ctx.fillRect(12, 12, 180, 32)
      ctx.fillStyle = '#fff'
      ctx.font = '700 13px Inter, system-ui, sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText(`Pontos ${s.score}`, 24, 29)
      ctx.textAlign = 'right'
      ctx.fillStyle = '#ffc857'
      ctx.fillText('♥'.repeat(Math.max(0, s.lives)), W - 20, 29)
    },
    [game.theme, mode],
  )

  const loop = useCallback(
    (now: number) => {
      const s = stateRef.current
      if (!runningRef.current) return
      const dt = Math.min(0.05, (now - (last.current || now)) / 1000)
      last.current = now
      s.elapsed += dt

      // movement
      const left = keys.current.has('arrowleft') || keys.current.has('a')
      const right = keys.current.has('arrowright') || keys.current.has('d')
      const up = keys.current.has('arrowup') || keys.current.has('w')
      const down = keys.current.has('arrowdown') || keys.current.has('s')
      if (mode === 'quest') {
        if (left) s.targetX -= 300 * dt
        if (right) s.targetX += 300 * dt
        if (up) s.targetY -= 300 * dt
        if (down) s.targetY += 300 * dt
        s.px += (s.targetX - s.px) * Math.min(1, dt * 10)
        s.py += (s.targetY - s.py) * Math.min(1, dt * 10)
      } else if (mode === 'runner') {
        s.px += (s.targetX - s.px) * Math.min(1, dt * 8)
        if (keys.current.has(' ') || s.jump) {
          if (s.onGround) {
            s.vy = -620
            s.onGround = false
            s.jump = false
          }
        }
        s.vy += 1700 * dt
        s.py += s.vy * dt
        if (s.py >= GROUND - 18) {
          s.py = GROUND - 18
          s.vy = 0
          s.onGround = true
        }
      } else {
        if (left) s.targetX -= 340 * dt
        if (right) s.targetX += 340 * dt
        s.targetX = clamp(s.targetX, 30, W - 30)
        s.px += (s.targetX - s.px) * Math.min(1, dt * 12)
      }

      s.spawn += dt
      s.fire += dt

      if (mode === 'runner') {
        if (s.spawn > Math.max(0.7, 1.25 - s.elapsed * 0.02)) {
          s.spawn = 0
          s.objects.push({ x: W + 30, y: GROUND - 12, vx: -260 - s.elapsed * 8, vy: 0, w: 30, h: 30, kind: 'obstacle' })
        }
        s.objects.forEach((o) => {
          o.x += o.vx * dt
          if (!o.scored && o.x + o.w < 0) {
            o.scored = true
            s.score++
          }
        })
        s.objects = s.objects.filter((o) => o.x > -60)
        const hit = s.objects.some((o) => Math.abs(o.x + 15 - s.px) < 24 && Math.abs(o.y + 15 - s.py) < 26)
        if (hit) finish()
      } else if (mode === 'race') {
        if (s.spawn > Math.max(0.45, 0.9 - s.elapsed * 0.012)) {
          s.spawn = 0
          s.objects.push({ x: randInt(40, W - 60), y: -40, vx: 0, vy: 190 + s.elapsed * 4, w: 34, h: 34, kind: 'obstacle' })
        }
        s.objects.forEach((o) => {
          o.y += o.vy * dt
          if (!o.scored && o.y > H) {
            o.scored = true
            s.score++
          }
        })
        s.objects = s.objects.filter((o) => o.y < H + 60)
        if (s.objects.some((o) => Math.abs(o.x + 17 - s.px) < 26 && Math.abs(o.y + 17 - s.py) < 30)) finish()
      } else if (mode === 'catcher') {
        if (s.spawn > 0.55) {
          s.spawn = 0
          const bomb = rand() < 0.22
          s.objects.push({
            x: randInt(30, W - 50),
            y: -30,
            vx: 0,
            vy: 150 + s.elapsed * 4,
            w: 30,
            h: 30,
            kind: bomb ? 'bomb' : 'fruit',
          })
        }
        s.objects.forEach((o) => {
          o.y += o.vy * dt
          if (!o.scored && o.y > GROUND - 10 && o.y < GROUND + 40 && Math.abs(o.x + 15 - s.px) < 34) {
            o.scored = true
            if (o.kind === 'bomb') {
              s.lives--
              play('lose')
            } else {
              s.score++
              play('tick')
            }
          }
        })
        s.objects = s.objects.filter((o) => o.y < H + 40 && !o.scored)
        if (s.lives <= 0) finish()
      } else if (mode === 'shooter') {
        if (s.spawn > Math.max(0.45, 0.85 - s.elapsed * 0.015)) {
          s.spawn = 0
          s.objects.push({ x: randInt(30, W - 50), y: -30, vx: 0, vy: 95 + s.elapsed * 4, w: 30, h: 30, kind: 'enemy' })
        }
        if (s.fire > 0.28) {
          s.fire = 0
          s.bullets.push({ x: s.px - 2, y: s.py - 20, vx: 0, vy: -420, w: 4, h: 14, kind: 'bullet' })
        }
        s.bullets.forEach((b) => (b.y += b.vy * dt))
        s.bullets = s.bullets.filter((b) => b.y > -20)
        s.objects.forEach((o) => (o.y += o.vy * dt))
        s.bullets.forEach((b) => {
          s.objects.forEach((o) => {
            if (!o.scored && Math.abs(o.x + 15 - b.x) < 20 && Math.abs(o.y + 15 - b.y) < 22) {
              o.scored = true
              b.y = -100
              s.score++
              play('tick')
            }
          })
        })
        s.objects.forEach((o) => {
          if (!o.scored && o.y > GROUND) {
            o.scored = true
            s.lives--
            play('lose')
          }
        })
        s.objects = s.objects.filter((o) => !o.scored)
        if (s.lives <= 0) finish()
      } else {
        // quest
        if (s.spawn > 0.5) {
          s.spawn = 0
          if (rand() < 0.7) {
            s.objects.push({ x: randInt(30, W - 50), y: randInt(50, GROUND - 20), vx: 0, vy: 0, w: 28, h: 28, kind: 'coin' })
          } else {
            s.objects.push({ x: randInt(30, W - 50), y: randInt(50, GROUND - 20), vx: 0, vy: 0, w: 30, h: 30, kind: 'enemy' })
          }
        }
        s.objects.forEach((o) => {
          if (o.kind === 'enemy') {
            const dx = s.px - (o.x + 15)
            const dy = s.py - (o.y + 15)
            const d = Math.hypot(dx, dy) || 1
            o.x += (dx / d) * 70 * dt
            o.y += (dy / d) * 70 * dt
          }
        })
        s.objects.forEach((o) => {
          if (!o.scored && Math.abs(o.x + 15 - s.px) < 28 && Math.abs(o.y + 15 - s.py) < 28) {
            o.scored = true
            if (o.kind === 'coin') {
              s.score++
              play('tick')
            } else {
              s.lives--
              play('lose')
            }
          }
        })
        s.objects = s.objects.filter((o) => !o.scored)
        if (s.lives <= 0) finish()
      }

      if (timed && s.elapsed >= duration) finish()

      if (now - lastSync.current > 100) {
        lastSync.current = now
        setScore(s.score)
        setLives(Math.max(0, s.lives))
        setTimeLeft(Math.max(0, Math.ceil(duration - s.elapsed)))
      }
      draw(s)
      raf.current = requestAnimationFrame(loop)
    },
    [draw, finish, mode, timed],
  )

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase()
      keys.current.add(k)
      if ([' ', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) e.preventDefault()
      if (k === ' ' && mode === 'runner') stateRef.current.jump = true
    }
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase())
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      cancelAnimationFrame(raf.current)
    }
  }, [mode])

  const start = () => {
    if (running) return
    if (!placeBet(amount, game.name, game.id, 'Arcade')) return
    stateRef.current = fresh()
    setScore(0)
    setLives(3)
    setTimeLeft(duration)
    setResult(null)
    setRunning(true)
    runningRef.current = true
    last.current = 0
    lastSync.current = 0
    play('click')
    cancelAnimationFrame(raf.current)
    raf.current = requestAnimationFrame(loop)
  }

  const pointer = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * W
    const y = ((e.clientY - rect.top) / rect.height) * H
    const s = stateRef.current
    s.targetX = clamp(x, 26, W - 26)
    if (mode === 'quest') s.targetY = clamp(y, 40, GROUND + 10)
    if (mode === 'runner' && e.type === 'pointerdown') s.jump = true
  }

  const prize = amount * Math.min(20, 0.5 + score * 0.25)
  const instructions =
    mode === 'runner'
      ? 'Salta os obstáculos. Toca no ecrã ou usa espaço para saltar; arrasta para te moveres.'
      : mode === 'race'
        ? 'Desvia dos carros. Arrasta ou usa as setas para mudar de faixa.'
        : mode === 'shooter'
          ? 'Move a nave e destrói os invasores. Os tiros são automáticos.'
          : mode === 'catcher'
            ? 'Apanha fruta e evita as bombas. Arrasta a cesta.'
            : 'Recolhe moedas e foge dos inimigos. Arrasta para te moveres.'

  return (
    <GameLayout
      stage={
        <Stage>
          <div className="relative">
            <canvas
              ref={canvasRef}
              width={W}
              height={H}
              className="block aspect-[640/420] w-full touch-none drop-shadow-[0_0_22px_rgba(34,227,160,.18)]"
              onPointerMove={pointer}
              onPointerDown={pointer}
            />
            {running && (
              <div className="pointer-events-none absolute inset-0 overflow-hidden">
                {[0, 1, 2, 3, 4, 5].map((s) => (
                  <span
                    key={s}
                    className="animate-floaty absolute h-1 w-1 rounded-full bg-white/70 shadow-[0_0_8px_rgba(255,255,255,.9)]"
                    style={{ left: `${(s * 17 + 8) % 96}%`, top: `${(s * 29 + 12) % 88}%`, animationDelay: `${s * 260}ms` }}
                  />
                ))}
              </div>
            )}
            {!running && (
              <div className="absolute inset-0 grid place-items-center bg-black/55 backdrop-blur-[2px]">
                <div className="max-w-sm px-6 text-center">
                  <span className="text-5xl">{game.theme.icon}</span>
                  <h3 className="mt-3 font-display text-xl font-bold">{result ? (result.win > 0 ? 'Boa corrida!' : 'Fim de jogo') : 'Pronto para jogar?'}</h3>
                  <p className="mt-1 text-[11px] leading-relaxed text-white/45">{result ? `${result.text}${result.win > 0 ? ` · +${fmt(result.win)} B$` : ''}` : instructions}</p>
                  <ActionButton tone="bet" icon="bolt" size="compact" onClick={start} className="mt-4 px-6">
                    {result ? 'Jogar novamente' : `Começar · ${fmt(amount)} B$`}
                  </ActionButton>
                </div>
              </div>
            )}
            {running && (
              <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-between p-3">
                <span className="rounded-lg bg-black/50 px-2.5 py-1 text-[10px] font-bold text-white/70">Pontos {score}</span>
                <span className="rounded-lg bg-black/50 px-2.5 py-1 text-[10px] font-bold text-gold">{timed ? `${timeLeft}s` : `♥ ${lives}`}</span>
              </div>
            )}
          </div>
        </Stage>
      }
      side={
        <div className="space-y-4">
          <SidePanel title="Aposta">
            <BetInput value={amount} onChange={setAmount} min={game.minBet} max={game.maxBet} disabled={running} />
            <div className="mt-3 space-y-1.5">
              <Payout label="Pontos" value={String(score)} />
              <Payout label="Prémio estimado" value={`${fmt(score >= 3 ? prize : 0)} B$`} />
              <Payout label="Saldo" value={`${fmt(balance)} B$`} />
            </div>
            {!running ? (
              <ActionButton tone="bet" icon="bolt" onClick={start} className="mt-3">
                {result ? 'Jogar novamente' : `Começar · ${fmt(amount)} B$`}
              </ActionButton>
            ) : (
              <ActionButton tone="ghost" onClick={finish} className="mt-3">
                Terminar corrida
              </ActionButton>
            )}
            <ResultBanner
              state={!result ? 'idle' : result.win > 0 ? 'win' : 'lose'}
              text={result ? `${result.text}${result.win > 0 ? ` · +${fmt(result.win)} B$` : ''}` : ''}
            />
            <p className="mt-3 text-[10px] leading-relaxed text-white/30">{instructions}</p>
          </SidePanel>
          <SidePanel title="Histórico">
            <RecentStrip items={history} colorFor={(v) => (parseInt(String(v)) >= 10 ? 'text-good border-good/30' : 'text-white/35')} />
          </SidePanel>
        </div>
      }
    />
  )
}
