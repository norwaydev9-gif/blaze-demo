import { useState } from 'react'
import type { Game } from '../lib/types'
import { fmt, fmtMult } from '../lib/format'
import { randInt } from '../lib/rng'
import { useWallet } from '../lib/wallet'
import { useSound } from '../lib/sound'
import { BetInput, GameLayout, Payout, RecentStrip, SidePanel, Stage } from '../components/GameUI'

export function TowerGame({ game }: { game: Game }) {
  const rows = Number(game.config.rows ?? 8)
  const cols = Number(game.config.columns ?? 3)
  const { balance, placeBet, payout } = useWallet()
  const { play } = useSound()
  const [amount, setAmount] = useState(game.minBet)
  const [active, setActive] = useState(false)
  const [level, setLevel] = useState(0)
  const [mult, setMult] = useState(1)
  const [traps, setTraps] = useState<number[]>([])
  const [picks, setPicks] = useState<number[]>([])
  const [lost, setLost] = useState(false)
  const [cashed, setCashed] = useState<number | null>(null)
  const [history, setHistory] = useState<string[]>([])
  const step = (cols / (cols - 1)) * 0.99

  const start = () => {
    if (!placeBet(amount, game.name, game.id, `Torre ${rows}`)) return
    setTraps(Array.from({ length: rows }, () => randInt(0, cols - 1)))
    setPicks([])
    setLevel(0)
    setMult(1)
    setActive(true)
    setLost(false)
    setCashed(null)
    play('click')
  }

  const choose = (col: number) => {
    if (!active) return
    if (col === traps[level]) {
      setActive(false)
      setLost(true)
      setHistory((h) => [`${fmtMult(mult)} · armadilha`, ...h].slice(0, 12))
      play('lose')
      return
    }
    const nextMult = mult * step
    setPicks((p) => [...p, col])
    setLevel((l) => l + 1)
    setMult(nextMult)
    play('tick')
    if (level + 1 >= rows) {
      payout(amount * nextMult, game.name, game.id, `Torre completa ${fmtMult(nextMult)}`)
      setActive(false)
      setCashed(nextMult)
      setHistory((h) => [fmtMult(nextMult), ...h].slice(0, 12))
      play('win')
    }
  }

  const cashout = () => {
    if (!active || level === 0) return
    payout(amount * mult, game.name, game.id, `Retirada ${fmtMult(mult)}`)
    setCashed(mult)
    setActive(false)
    setHistory((h) => [fmtMult(mult), ...h].slice(0, 12))
    play('cashout')
  }

  const reset = () => {
    setActive(false)
    setLevel(0)
    setPicks([])
    setTraps([])
    setLost(false)
    setCashed(null)
  }

  return (
    <GameLayout
      stage={
        <Stage>
          <div className="border-b border-line/70 px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="label">Multiplicador</p>
                <p className={`font-display text-2xl font-extrabold tabular ${cashed ? 'text-good' : 'text-white'}`}>{fmtMult(cashed ?? mult)}</p>
              </div>
              <div className="text-right">
                <p className="label">Andar</p>
                <p className="text-sm font-bold tabular text-white/80">
                  {level}/{rows}
                </p>
              </div>
            </div>
          </div>
          <div className="max-h-[520px] overflow-y-auto p-3">
            <div className="space-y-1.5">
              {Array.from({ length: rows }, (_, i) => rows - 1 - i).map((row) => {
                const isCurrent = active && row === level
                const isPast = row < level
                const isFuture = row > level
                const revealed = lost && row >= level
                return (
                  <div key={row} className={`flex items-center gap-2 rounded-lg p-1 transition ${isCurrent ? 'bg-brand/[.06]' : ''}`}>
                    <span className={`w-5 text-center text-[9px] font-bold tabular ${isCurrent ? 'text-brand' : 'text-white/20'}`}>{row + 1}</span>
                    <div className="grid flex-1 gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))` }}>
                      {Array.from({ length: cols }, (_, col) => {
                        const picked = isPast && picks[row] === col
                        const trap = (revealed || (lost && row < level && false)) && traps[row] === col
                        return (
                          <button
                            key={col}
                            type="button"
                            disabled={!isCurrent}
                            onClick={() => choose(col)}
                            className={`grid h-10 place-items-center rounded-lg border text-sm transition ${
                              picked
                                ? 'border-good/50 bg-good/15 text-good'
                                : trap
                                  ? 'border-brand/50 bg-brand/15 text-brand'
                                  : isCurrent
                                    ? 'border-white/15 bg-white/[.05] text-white/30 hover:-translate-y-0.5 hover:border-white/40 hover:bg-white/10 hover:text-white'
                                    : isFuture
                                      ? 'border-line/50 bg-black/20 text-white/10'
                                      : 'border-line/50 bg-black/20 text-white/10'
                            }`}
                          >
                            {picked ? '★' : trap ? '💣' : isCurrent ? '?' : '·'}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
          <div className="border-t border-line/70 px-4 py-2.5 text-center text-[10px] text-white/30">
            {lost ? 'Armadilha ativada. A torre caiu.' : cashed ? `Retiraste com ${fmtMult(cashed)} — ${fmt(amount * cashed)} B$` : active ? 'Escolhe um caminho seguro para subir.' : 'Inicia a subida escolhendo a aposta.'}
          </div>
        </Stage>
      }
      side={
        <div className="space-y-4">
          <SidePanel title="Aposta">
            <BetInput value={amount} onChange={setAmount} min={game.minBet} max={game.maxBet} disabled={active} />
            <div className="mt-3 space-y-1.5">
              <Payout label="Multiplicador por andar" value={`${step.toFixed(2)}×`} />
              <Payout label="Prémio atual" value={`${fmt(amount * mult)} B$`} />
              <Payout label="Saldo" value={`${fmt(balance)} B$`} />
            </div>
            {!active ? (
              <button type="button" onClick={lost || cashed !== null ? reset : start} className="btn-primary mt-3 w-full py-3 text-sm">
                {lost || cashed !== null ? 'Limpar torre' : `Subir · ${fmt(amount)} B$`}
              </button>
            ) : (
              <button type="button" onClick={cashout} disabled={level === 0} className="btn-good mt-3 w-full py-3 text-sm">
                Retirar {fmt(amount * mult)} B$
              </button>
            )}
            {(lost || cashed !== null) && (
              <button type="button" onClick={start} className="btn-ghost mt-2 w-full py-2 text-xs">
                Jogar novamente
              </button>
            )}
          </SidePanel>
          <SidePanel title="Histórico">
            <RecentStrip items={history} colorFor={(v) => (String(v).includes('armadilha') ? 'text-brand border-brand/30' : 'text-good border-good/30')} />
          </SidePanel>
        </div>
      }
    />
  )
}
