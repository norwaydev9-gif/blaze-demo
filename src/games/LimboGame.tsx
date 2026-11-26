import { useRef, useState } from 'react'
import type { Game } from '../lib/types'
import { fmt, fmtMult, clamp } from '../lib/format'
import { rand } from '../lib/rng'
import { useWallet } from '../lib/wallet'
import { useSound } from '../lib/sound'
import { ActionButton, BetInput, GameLayout, Payout, RecentStrip, ResultBanner, SidePanel, Stage } from '../components/GameUI'

export function LimboGame({ game }: { game: Game }) {
  const min = game.minBet
  const max = game.maxBet
  const maxMult = Number(game.config.maxMult ?? 1000)
  const { balance, placeBet, payout } = useWallet()
  const { play } = useSound()

  const [amount, setAmount] = useState(min)
  const [target, setTarget] = useState(2)
  const [display, setDisplay] = useState(1)
  const [running, setRunning] = useState(false)
  const [result, setResult] = useState<number | null>(null)
  const [won, setWon] = useState<boolean | null>(null)
  const [history, setHistory] = useState<number[]>([])
  const raf = useRef(0)

  const chance = Math.min(99, 99 / target)
  const playRound = () => {
    if (running) return
    if (!placeBet(amount, game.name, game.id, `Alvo ${fmtMult(target)}`)) return
    setRunning(true)
    setWon(null)
    setResult(null)
    const u = rand()
    const value = Math.min(maxMult, Math.max(1, 0.99 / Math.max(1e-9, u)))
    const start = performance.now()
    const duration = 900
    const tick = (now: number) => {
      const t = clamp((now - start) / duration, 0, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(1 + (Math.min(value, target * 3) - 1) * eased)
      if (t < 1) {
        raf.current = requestAnimationFrame(tick)
      } else {
        setDisplay(value)
        setResult(value)
        setRunning(false)
        const win = value >= target
        setWon(win)
        setHistory((h) => [value, ...h].slice(0, 16))
        if (win) {
          payout(amount * target, game.name, game.id, `Alvo ${fmtMult(target)} atingido`)
          play('win')
        } else {
          play('lose')
        }
      }
    }
    raf.current = requestAnimationFrame(tick)
    play('spin')
  }

  return (
    <GameLayout
      stage={
        <Stage>
          <div className="relative flex min-h-[380px] flex-col items-center justify-center px-6 py-10 sm:min-h-[440px]">
            <div className="pointer-events-none absolute inset-0 bg-grid opacity-20" />
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
              <div className={`absolute left-1/2 top-[18%] -translate-x-1/2 ${running ? 'game-float' : ''}`}>
                <svg viewBox="0 0 48 72" className="h-16 w-12 drop-shadow-[0_0_20px_rgba(255,107,61,.5)]" fill="none">
                  <path d="M24 4c8 7 12 17 12 30l-12 12-12-12C12 21 16 11 24 4Z" fill="#f4f7ff" stroke="#9fb0d0" strokeWidth="2" />
                  <circle cx="24" cy="26" r="6" fill="#22d3ee" stroke="#0e7490" strokeWidth="2" />
                  <path d="M18 48 24 70l6-22Z" fill="#ff6b3d" className="game-pulse" />
                </svg>
              </div>
              {[0, 1, 2, 3].map((p) => (
                <span
                  key={p}
                  className="animate-floaty absolute h-1 w-1 rounded-full bg-gold/70"
                  style={{ left: `${28 + p * 14}%`, top: `${62 + (p % 2) * 12}%`, animationDelay: `${p * 220}ms` }}
                />
              ))}
            </div>
            <div className="relative text-center">
              <p className="label">Resultado</p>
              <p
                className={`font-display text-[clamp(56px,12vw,96px)] font-extrabold leading-none tabular transition-colors ${
                  running ? 'text-white/80' : won === true ? 'text-good' : won === false ? 'text-brand' : 'text-white'
                }`}
              >
                {fmtMult(display)}
              </p>
              <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-line bg-black/30 px-4 py-2">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-white/35">Alvo</span>
                <span className="text-sm font-extrabold tabular text-gold">{fmtMult(target)}</span>
                <span className="h-3 w-px bg-line" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-white/35">Chance</span>
                <span className="text-sm font-extrabold tabular text-white">{chance.toFixed(2)}%</span>
              </div>
              {result !== null && (
                <p className={`mt-4 text-xs font-bold ${won ? 'text-good' : 'text-brand'}`}>
                  {won ? `Atingiste o alvo! +${fmt(amount * target)} B$` : `Ficaste abaixo de ${fmtMult(target)}.`}
                </p>
              )}
              <ResultBanner
                state={result === null ? 'idle' : won ? 'win' : 'lose'}
                text={won ? `+${fmt(amount * target)} B$` : `Ficaste abaixo de ${fmtMult(target)}.`}
              />
            </div>
          </div>
        </Stage>
      }
      side={
        <div className="space-y-4">
          <SidePanel title="Aposta">
            <BetInput value={amount} onChange={setAmount} min={min} max={max} disabled={running} />
            <div className="mt-3">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="label">Multiplicador alvo</span>
                <span className="text-sm font-bold tabular text-gold">{fmtMult(target)}</span>
              </div>
              <input
                type="range"
                min={1.1}
                max={100}
                step={0.1}
                value={Math.min(target, 100)}
                disabled={running}
                onChange={(e) => setTarget(Number(e.target.value))}
                className="w-full"
              />
              <div className="mt-2 grid grid-cols-4 gap-1.5">
                {[1.5, 2, 5, 10].map((v) => (
                  <ActionButton
                    key={v}
                    tone="ghost"
                    size="compact"
                    onClick={() => setTarget(v)}
                    className={target === v ? 'border-gold/50 bg-gold/15 text-gold' : ''}
                  >
                    {v}×
                  </ActionButton>
                ))}
              </div>
              <input
                type="number"
                min={1.01}
                max={maxMult}
                step={0.01}
                value={target}
                onChange={(e) => setTarget(clamp(Number(e.target.value), 1.01, maxMult))}
                className="input mt-2 py-2 text-center text-xs tabular"
              />
            </div>
            <div className="mt-3 space-y-1.5">
              <Payout label="Ganho potencial" value={`${fmt(amount * target)} B$`} />
              <Payout label="Saldo" value={`${fmt(balance)} B$`} />
            </div>
            <ActionButton tone="bet" icon="bolt" loading={running} onClick={playRound} disabled={running} className="mt-3">
              {running ? 'A subir…' : `Jogar · ${fmt(amount)} B$`}
            </ActionButton>
          </SidePanel>
          <SidePanel title="Últimos multiplicadores">
            <RecentStrip
              items={history.map((v) => fmtMult(v))}
              colorFor={(v) => (parseFloat(String(v)) >= target ? 'text-good border-good/30' : 'text-brand border-brand/30')}
            />
          </SidePanel>
        </div>
      }
    />
  )
}
