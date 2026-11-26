import { useState } from 'react'
import type { Game } from '../lib/types'
import { fmt, fmtMult } from '../lib/format'
import { rand } from '../lib/rng'
import { useWallet } from '../lib/wallet'
import { useSound } from '../lib/sound'
import { BetInput, GameLayout, Payout, RecentStrip, SidePanel, Stage } from '../components/GameUI'

export function BalloonGame({ game }: { game: Game }) {
  const { balance, placeBet, payout } = useWallet()
  const { play } = useSound()
  const [amount, setAmount] = useState(game.minBet)
  const [active, setActive] = useState(false)
  const [pumps, setPumps] = useState(0)
  const [mult, setMult] = useState(1)
  const [popped, setPopped] = useState(false)
  const [cashed, setCashed] = useState<number | null>(null)
  const [history, setHistory] = useState<string[]>([])
  const maxMult = Number(game.config.maxMult ?? 200)

  const start = () => {
    if (!placeBet(amount, game.name, game.id, 'Balão')) return
    setActive(true)
    setPumps(0)
    setMult(1)
    setPopped(false)
    setCashed(null)
    play('click')
  }

  const pump = () => {
    if (!active) return
    const risk = 0.035 + pumps * 0.014
    if (rand() < risk || mult * 1.09 > maxMult) {
      setPopped(true)
      setActive(false)
      setHistory((h) => [`${fmtMult(mult)} · rebentou`, ...h].slice(0, 12))
      play('lose')
      return
    }
    setPumps((p) => p + 1)
    setMult((m) => m * 1.09)
    play('tick')
  }

  const cashout = () => {
    if (!active || pumps === 0) return
    payout(amount * mult, game.name, game.id, `Retirada ${fmtMult(mult)}`)
    setCashed(mult)
    setActive(false)
    setHistory((h) => [fmtMult(mult), ...h].slice(0, 12))
    play('cashout')
  }

  const scale = 1 + Math.min(pumps, 20) * 0.055

  return (
    <GameLayout
      stage={
        <Stage>
          <div className="relative flex min-h-[420px] flex-col items-center justify-center px-6 py-8">
            <div className="pointer-events-none absolute inset-0 bg-grid opacity-20" />
            <div className="relative h-56 w-56">
              <div
                className={`absolute inset-0 grid place-items-center transition-all duration-200 ${popped ? 'animate-ping opacity-0' : ''}`}
                style={{ transform: `scale(${scale})` }}
              >
                <div
                  className="grid h-32 w-32 place-items-center rounded-full text-6xl shadow-[0_20px_60px_rgba(255,45,63,.3)] transition-all duration-200"
                  style={{
                    background: popped
                      ? 'radial-gradient(circle at 35% 30%, #ff8a96, #c31226 60%, #7a0814)'
                      : `radial-gradient(circle at 35% 30%, #ffd0d6, ${pumps > 12 ? '#ff2d3f' : '#ff5b8c'} 45%, ${pumps > 12 ? '#a30d1e' : '#b3124a'} 100%)`,
                    filter: popped ? 'grayscale(1)' : 'saturate(1.1)',
                  }}
                >
                  <span className="drop-shadow-lg">{popped ? '💥' : '🎈'}</span>
                </div>
              </div>
              {!popped && <div className="absolute bottom-0 left-1/2 h-20 w-px -translate-x-1/2 bg-gradient-to-b from-white/30 to-transparent" />}
            </div>
            <div className="relative mt-4 text-center">
              <p className="label">Multiplicador</p>
              <p className={`font-display text-4xl font-extrabold tabular ${popped ? 'text-brand' : cashed ? 'text-good' : 'text-white'}`}>
                {fmtMult(cashed ?? mult)}
              </p>
              <p className="mt-1 text-[11px] text-white/35">
                {popped ? 'O balão rebentou!' : cashed ? `Retiraste ${fmt(amount * cashed)} B$` : active ? `${pumps} bombadas · risco ${(3.5 + pumps * 1.4).toFixed(1)}%` : 'Enche o balão e retira antes de rebentar'}
              </p>
            </div>
          </div>
        </Stage>
      }
      side={
        <div className="space-y-4">
          <SidePanel title="Aposta">
            <BetInput value={amount} onChange={setAmount} min={game.minBet} max={game.maxBet} disabled={active} />
            <div className="mt-3 space-y-1.5">
              <Payout label="Prémio atual" value={`${fmt(amount * mult)} B$`} />
              <Payout label="Próxima bombada" value={`${fmtMult(mult * 1.09)}`} />
              <Payout label="Limite" value={`${maxMult}×`} />
              <Payout label="Saldo" value={`${fmt(balance)} B$`} />
            </div>
            {!active ? (
              <button type="button" onClick={start} className="btn-primary mt-3 w-full py-3 text-sm">
                {popped || cashed !== null ? 'Novo balão' : `Encher · ${fmt(amount)} B$`}
              </button>
            ) : (
              <div className="mt-3 space-y-2">
                <button type="button" onClick={pump} className="btn-primary w-full py-3 text-sm">
                  Bombar · {fmtMult(mult * 1.09)}
                </button>
                <button type="button" onClick={cashout} disabled={pumps === 0} className="btn-good w-full py-2.5 text-xs">
                  Retirar {fmt(amount * mult)} B$
                </button>
              </div>
            )}
          </SidePanel>
          <SidePanel title="Histórico">
            <RecentStrip items={history} colorFor={(v) => (String(v).includes('rebentou') ? 'text-brand border-brand/30' : 'text-good border-good/30')} />
          </SidePanel>
        </div>
      }
    />
  )
}
