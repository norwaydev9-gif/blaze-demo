import { useMemo, useRef, useState } from 'react'
import type { Game } from '../lib/types'
import { fmt, clamp } from '../lib/format'
import { rand } from '../lib/rng'
import { useWallet } from '../lib/wallet'
import { useSound } from '../lib/sound'
import { BetInput, GameLayout, Payout, RecentStrip, SidePanel, Stage } from '../components/GameUI'

export function DiceGame({ game }: { game: Game }) {
  const min = game.minBet
  const max = game.maxBet
  const step = Number(game.config.step ?? 1)
  const { balance, placeBet, payout } = useWallet()
  const { play } = useSound()

  const [amount, setAmount] = useState(min)
  const [target, setTarget] = useState(50)
  const [over, setOver] = useState(true)
  const [result, setResult] = useState<number | null>(null)
  const [display, setDisplay] = useState(50)
  const [rolling, setRolling] = useState(false)
  const [history, setHistory] = useState<number[]>([])
  const [lastWin, setLastWin] = useState<boolean | null>(null)
  const interval = useRef<ReturnType<typeof setInterval> | null>(null)

  const chance = over ? 100 - target : target
  const payoutMult = chance > 0 ? 99 / chance : 0
  const profit = amount * payoutMult - amount

  const roll = () => {
    if (rolling) return
    if (!placeBet(amount, game.name, game.id, `${over ? 'Acima' : 'Abaixo'} de ${target}`)) return
    setRolling(true)
    setLastWin(null)
    play('spin')
    const final = Math.round(rand() * 10000) / 100
    interval.current = setInterval(() => setDisplay(Math.round(rand() * 10000) / 100), 55)
    setTimeout(() => {
      if (interval.current) clearInterval(interval.current)
      setDisplay(final)
      setResult(final)
      setRolling(false)
      setHistory((h) => [final, ...h].slice(0, 16))
      const won = over ? final > target : final < target
      setLastWin(won)
      if (won) {
        payout(amount * payoutMult, game.name, game.id, `Acima de ${target}`)
        play('win')
      } else {
        play('lose')
      }
    }, 850)
  }

  const pct = clamp(display, 0, 100)
  const targetPct = target

  const recentColor = (n: number) => (over ? (n > target ? 'text-good border-good/30' : 'text-brand border-brand/30') : n < target ? 'text-good border-good/30' : 'text-brand border-brand/30')

  return (
    <GameLayout
      stage={
        <Stage>
          <div className="relative px-4 py-8 sm:px-8">
            <div className="mx-auto max-w-[560px]">
              <div className="text-center">
                <p className="label">Resultado do dado</p>
                <p
                  className={`font-display text-[clamp(52px,10vw,84px)] font-extrabold leading-none tabular transition-colors ${
                    rolling ? 'text-white/70' : lastWin === true ? 'text-good' : lastWin === false ? 'text-brand' : 'text-white'
                  }`}
                >
                  {display.toFixed(2)}
                </p>
                <p className="mt-1 text-[11px] font-semibold text-white/35">
                  {over ? `Acima de ${target}` : `Abaixo de ${target}`} · {chance.toFixed(2)}% de chance
                </p>
              </div>

              <div className="relative mt-10 px-3">
                <div className="relative h-3 overflow-hidden rounded-full bg-gradient-to-r from-[#ff2d3f] via-[#ffc857] to-[#22e3a0] opacity-70">
                  <div className="absolute inset-y-0 bg-black/50" style={{ left: `${targetPct}%`, right: 0 }} />
                </div>
                <div className="absolute -top-1 h-5 w-1 -translate-x-1/2 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,.8)]" style={{ left: `calc(${targetPct}% + 12px)` }} />
                <div
                  className="absolute -top-2.5 h-8 w-1.5 -translate-x-1/2 rounded-full bg-white shadow-[0_0_16px_rgba(255,255,255,.9)] transition-all duration-150"
                  style={{ left: `calc(${pct}% + 12px)` }}
                />
                <div className="mt-2 flex justify-between text-[10px] tabular text-white/25">
                  <span>0</span>
                  <span>25</span>
                  <span>50</span>
                  <span>75</span>
                  <span>100</span>
                </div>
              </div>

              <div className="mt-8 grid grid-cols-3 gap-2">
                <div className="rounded-xl border border-line/60 bg-black/25 p-3 text-center">
                  <p className="text-[9px] uppercase tracking-wider text-white/30">Chance</p>
                  <p className="text-sm font-bold tabular text-white">{chance.toFixed(2)}%</p>
                </div>
                <div className="rounded-xl border border-line/60 bg-black/25 p-3 text-center">
                  <p className="text-[9px] uppercase tracking-wider text-white/30">Multiplicador</p>
                  <p className="text-sm font-bold tabular text-gold">{payoutMult.toFixed(2)}×</p>
                </div>
                <div className="rounded-xl border border-line/60 bg-black/25 p-3 text-center">
                  <p className="text-[9px] uppercase tracking-wider text-white/30">Lucro</p>
                  <p className="text-sm font-bold tabular text-good">+{fmt(profit)}</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setOver(true)}
                  className={`rounded-xl border py-3 text-sm font-bold transition ${over ? 'border-good/50 bg-good/15 text-good' : 'border-line text-white/40 hover:text-white'}`}
                >
                  ↑ Acima
                </button>
                <button
                  type="button"
                  onClick={() => setOver(false)}
                  className={`rounded-xl border py-3 text-sm font-bold transition ${!over ? 'border-brand/50 bg-brand/15 text-brand' : 'border-line text-white/40 hover:text-white'}`}
                >
                  ↓ Abaixo
                </button>
              </div>
            </div>
          </div>
        </Stage>
      }
      side={
        <div className="space-y-4">
          <SidePanel title="Aposta">
            <BetInput value={amount} onChange={setAmount} min={min} max={max} disabled={rolling} />
            <div className="mt-3">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="label">Alvo</span>
                <span className="text-sm font-bold tabular text-white">{target}</span>
              </div>
              <input
                type="range"
                min={2}
                max={98}
                step={step}
                value={target}
                disabled={rolling}
                onChange={(e) => setTarget(Number(e.target.value))}
                className="w-full"
              />
              <div className="mt-1 flex justify-between text-[10px] text-white/25">
                <span>2</span>
                <span>50</span>
                <span>98</span>
              </div>
            </div>
            <div className="mt-3 space-y-1.5">
              <Payout label="Ganho potencial" value={`${fmt(amount * payoutMult)} B$`} />
              <Payout label="Saldo" value={`${fmt(balance)} B$`} />
            </div>
            <button type="button" onClick={roll} disabled={rolling} className="btn-primary mt-3 w-full py-3 text-sm">
              {rolling ? 'A rolar…' : `Jogar · ${fmt(amount)} B$`}
            </button>
          </SidePanel>
          <SidePanel title="Últimos dados">
            <RecentStrip items={history.map((n) => n.toFixed(2))} colorFor={(v) => recentColor(Number(v))} />
          </SidePanel>
        </div>
      }
    />
  )
}
