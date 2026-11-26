import { useEffect, useMemo, useRef, useState } from 'react'
import type { Game } from '../lib/types'
import { fmt, clamp } from '../lib/format'
import { rand } from '../lib/rng'
import { useWallet } from '../lib/wallet'
import { useSound } from '../lib/sound'
import { ActionButton, BetInput, GameLayout, Payout, RecentStrip, ResultBanner, SidePanel, Stage } from '../components/GameUI'

const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅']

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
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (interval.current) clearInterval(interval.current)
    if (timeout.current) clearTimeout(timeout.current)
  }, [])

  const chance = over ? 100 - target : target
  const payoutMult = chance > 0 ? 99 / chance : 0
  const profit = amount * payoutMult - amount

  const roll = () => {
    if (rolling) return
    if (!placeBet(amount, game.name, game.id, `${over ? 'Acima' : 'Abaixo'} de ${target}`)) return
    const round = { over, target, payoutMult, amount }
    if (interval.current) clearInterval(interval.current)
    if (timeout.current) clearTimeout(timeout.current)
    setRolling(true)
    setLastWin(null)
    play('spin')
    const final = Math.round(rand() * 10000) / 100
    interval.current = setInterval(() => setDisplay(Math.round(rand() * 10000) / 100), 55)
    timeout.current = setTimeout(() => {
      if (interval.current) clearInterval(interval.current)
      interval.current = null
      timeout.current = null
      setDisplay(final)
      setResult(final)
      setRolling(false)
      setHistory((h) => [final, ...h].slice(0, 16))
      const won = round.over ? final > round.target : final < round.target
      setLastWin(won)
      if (won) {
        payout(round.amount * round.payoutMult, game.name, game.id, `${round.over ? 'Acima' : 'Abaixo'} de ${round.target}`)
        play('win')
      } else {
        play('lose')
      }
    }, 850)
  }

  const pct = clamp(display, 0, 100)
  const targetPct = clamp(target, 0, 100)
  const faceIndex = clamp(Math.floor((pct / 100) * DICE_FACES.length), 0, DICE_FACES.length - 1)

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

              <div className="relative mx-3 mt-10">
                <div className="relative h-3 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="absolute inset-y-0 bg-gradient-to-r from-[#ff2d3f] to-[#ffc857] opacity-70"
                    style={{ left: over ? 0 : `${targetPct}%`, width: over ? `${targetPct}%` : `${100 - targetPct}%` }}
                  />
                  <div
                    className="absolute inset-y-0 bg-good/70"
                    style={{ left: over ? `${targetPct}%` : 0, width: over ? `${100 - targetPct}%` : `${targetPct}%` }}
                  />
                </div>
                <div
                  className="absolute -top-1.5 h-6 w-0.5 -translate-x-1/2 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,.8)]"
                  style={{ left: `${targetPct}%` }}
                />
                <div
                  className={`absolute -top-2 h-7 w-1.5 -translate-x-1/2 rounded-full bg-white shadow-[0_0_16px_rgba(255,255,255,.9)] transition-all duration-150 ${rolling ? '' : 'animate-popIn'}`}
                  style={{ left: `${pct}%` }}
                />
                <div className="mt-2 flex justify-between text-[10px] tabular text-white/25">
                  <span>0</span>
                  <span>25</span>
                  <span>50</span>
                  <span>75</span>
                  <span>100</span>
                </div>
                <p className="mt-1 text-center text-[9px] font-semibold uppercase tracking-wider text-white/30">
                  <span className="text-good">Verde</span> = zona de vitória · branco = resultado
                </p>
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

              <div className="relative mx-auto mt-8 flex h-24 w-24 items-center justify-center">
                <div className={`absolute inset-0 rounded-2xl blur-2xl ${lastWin === true ? 'bg-good/25' : lastWin === false ? 'bg-brand/25' : 'bg-white/10'}`} />
                <div
                  className={`relative grid h-20 w-20 place-items-center rounded-2xl border border-white/20 bg-gradient-to-br from-white/15 to-white/[.02] font-display text-4xl font-black text-white shadow-[0_12px_30px_rgba(0,0,0,.5)] transition-transform duration-200 ${rolling ? 'game-spin' : 'animate-popIn'}`}
                  style={{ transformStyle: 'preserve-3d' }}
                  aria-label={`Face ${faceIndex + 1}`}
                >
                  {DICE_FACES[faceIndex]}
                </div>
              </div>

              <ResultBanner
                state={lastWin === null ? 'idle' : lastWin ? 'win' : 'lose'}
                text={lastWin ? `+${fmt(amount * payoutMult - amount)} B$` : 'Sem ganho nesta ronda.'}
              />
            </div>
          </div>
          <div className="bet-bar relative z-10 mt-3 rounded-2xl border border-white/10 bg-[#05060a]/95 p-3 shadow-[0_-8px_30px_rgba(0,0,0,.45)]">
            <div className="grid gap-3 sm:grid-cols-2">
              <BetInput value={amount} onChange={setAmount} min={min} max={max} disabled={rolling} />
              <div className="min-w-0">
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
                <div className="mt-2 grid grid-cols-5 gap-1">
                  {[10, 25, 50, 75, 90].map((t) => (
                    <ActionButton
                      key={t}
                      tone="ghost"
                      size="compact"
                      disabled={rolling}
                      onClick={() => setTarget(t)}
                      className={`w-full px-1 text-[10px] ${target === t ? 'border-white/50 bg-white/10 text-white' : ''}`}
                    >
                      {t}
                    </ActionButton>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <ActionButton
                tone="ghost"
                size="compact"
                onClick={() => setOver(true)}
                disabled={rolling}
                className={over ? 'border-white/50 bg-white/10 text-white' : 'text-white/45'}
              >
                ↑ Acima
              </ActionButton>
              <ActionButton
                tone="ghost"
                size="compact"
                onClick={() => setOver(false)}
                disabled={rolling}
                className={!over ? 'border-white/50 bg-white/10 text-white' : 'text-white/45'}
              >
                ↓ Abaixo
              </ActionButton>
            </div>
            <ActionButton
              tone={rolling ? 'placed' : 'bet'}
              icon="bolt"
              loading={rolling}
              onClick={roll}
              disabled={rolling}
              className="mt-3"
            >
              {rolling ? 'A rolar…' : `Jogar · ${fmt(amount)} B$`}
            </ActionButton>
          </div>
        </Stage>
      }
      side={
        <div className="space-y-4">
          <SidePanel title="Detalhes da aposta">
            <div className="space-y-1.5">
              <Payout label="Ganho potencial" value={`${fmt(amount * payoutMult)} B$`} />
              <Payout label="Saldo" value={`${fmt(balance)} B$`} />
            </div>
          </SidePanel>
          <SidePanel title="Últimos dados">
            <RecentStrip items={history.map((n) => n.toFixed(2))} colorFor={(v) => recentColor(Number(v))} />
          </SidePanel>
        </div>
      }
    />
  )
}
