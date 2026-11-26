import { useState } from 'react'
import type { Game } from '../lib/types'
import { fmt, fmtMult } from '../lib/format'
import { randInt } from '../lib/rng'
import { useWallet } from '../lib/wallet'
import { useSound } from '../lib/sound'
import { ActionButton, AutoBetControl, AutoControl, BetInput, GameLayout, Payout, RecentStrip, ResultBanner, SidePanel, Stage } from '../components/GameUI'
import { useAutoCashout, useAutoReplay } from '../lib/autoPlay'

export function TowerGame({ game }: { game: Game }) {
  const rows = Number(game.config.rows ?? 8)
  const configuredCols = Number(game.config.columns ?? 3)
  const cols = configuredCols > 1 ? configuredCols : 3
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
  const [autoReplay, setAutoReplay] = useState(false)
  const [autoCash, setAutoCash] = useState(false)
  const [autoTarget, setAutoTarget] = useState(2)
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

  useAutoCashout({ active, value: mult, target: autoTarget, enabled: autoCash, onCashout: cashout })
  useAutoReplay({ idle: !active, enabled: autoReplay, onStart: start })

  return (
    <GameLayout
      stage={
        <Stage>
          <div className="border-b border-line/70 px-4 py-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="label">Multiplicador</p>
                <p className={`font-display text-2xl font-extrabold tabular ${cashed ? 'text-good animate-pulseGlow' : 'text-white'}`}>{fmtMult(cashed ?? mult)}</p>
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
                  <div key={row} className={`flex items-center gap-2 rounded-lg p-1 transition-all duration-300 ${isCurrent ? 'game-pulse bg-brand/[.08] shadow-[0_0_18px_rgba(255,45,63,.12)]' : ''}`}>
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
                            className={`grid h-11 place-items-center rounded-lg border text-sm transition ${
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
          <div className="px-3">
            <ResultBanner
              state={cashed !== null ? 'win' : lost ? 'lose' : 'idle'}
              text={cashed !== null ? `+${fmt(amount * cashed)} B$` : lost ? `Perdeste ${fmt(amount)} B$.` : ''}
            />
            <div className="relative z-10 mt-3 rounded-2xl border border-white/10 bet-bar bg-[#05060a]/95 p-3 shadow-[0_-8px_30px_rgba(0,0,0,.45)]">
              <BetInput value={amount} onChange={setAmount} min={game.minBet} max={game.maxBet} disabled={active} />
              {!active ? (
                <ActionButton
                  tone={active ? 'placed' : lost || cashed !== null ? 'ghost' : 'bet'}
                  icon={lost || cashed !== null ? undefined : 'bolt'}
                  onClick={lost || cashed !== null ? reset : start}
                  className="mt-3"
                >
                  {lost || cashed !== null ? 'Limpar torre' : `Subir · ${fmt(amount)} B$`}
                </ActionButton>
              ) : (
                <ActionButton tone="cashout" icon="check" onClick={cashout} disabled={level === 0} className="mt-3">
                  Retirar {fmt(amount * mult)} B$
                </ActionButton>
              )}
              {(lost || cashed !== null) && (
                <ActionButton tone="ghost" size="compact" onClick={start} className="mt-2">
                  Jogar novamente
                </ActionButton>
              )}
            </div>
          </div>
        </Stage>
      }
      side={
        <div className="space-y-4">
          <SidePanel title="Detalhes da aposta">
            <div className="space-y-1.5">
              <Payout label="Multiplicador por andar" value={`${step.toFixed(2)}×`} />
              <Payout label="Prémio atual" value={`${fmt(amount * mult)} B$`} />
              <Payout label="Saldo" value={`${fmt(balance)} B$`} />
            </div>
            <AutoBetControl active={autoReplay} onToggle={() => setAutoReplay((v) => !v)} />
            <AutoControl
              value={autoTarget}
              onValueChange={setAutoTarget}
              active={autoCash}
              onToggle={() => setAutoCash((v) => !v)}
              current={mult}
              currentLabel="Multiplicador atual"
            />
          </SidePanel>
          <SidePanel title="Histórico">
            <RecentStrip items={history} colorFor={(v) => (String(v).includes('armadilha') ? 'text-brand border-brand/30' : 'text-good border-good/30')} />
          </SidePanel>
        </div>
      }
    />
  )
}
