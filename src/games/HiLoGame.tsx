import { useMemo, useState } from 'react'
import type { Game } from '../lib/types'
import { fmt, fmtMult, clamp } from '../lib/format'
import { makeDeck } from '../lib/cards'
import type { Card } from '../lib/cards'
import { useWallet } from '../lib/wallet'
import { useSound } from '../lib/sound'
import { ActionButton, AutoBetControl, AutoControl, BetInput, GameLayout, Payout, RecentStrip, ResultBanner, SidePanel, Stage } from '../components/GameUI'
import { useAutoCashout, useAutoReplay } from '../lib/autoPlay'
import { PlayingCard } from '../components/PlayingCard'
import { cardText } from '../lib/cards'
import { configNum } from './helpers'

export function HiLoGame({ game }: { game: Game }) {
  const decks = Math.max(1, Math.floor(configNum(game, 'deck', 6)))
  const { balance, placeBet, payout } = useWallet()
  const { play } = useSound()
  const [amount, setAmount] = useState(game.minBet)
  const [deck, setDeck] = useState<Card[]>(() => makeDeck(decks))
  const [current, setCurrent] = useState<Card>(() => deck[0])
  const [rest, setRest] = useState<Card[]>(() => deck.slice(1))
  const [mult, setMult] = useState(1)
  const [active, setActive] = useState(false)
  const [last, setLast] = useState<Card | null>(null)
  const [history, setHistory] = useState<string[]>([])
  const [autoReplay, setAutoReplay] = useState(false)
  const [autoCash, setAutoCash] = useState(false)
  const [autoTarget, setAutoTarget] = useState(2)

  const stats = useMemo(() => {
    const higher = rest.filter((c) => c.r > current.r).length
    const lower = rest.filter((c) => c.r < current.r).length
    const total = Math.max(1, rest.length)
    return {
      higher: higher / total,
      lower: lower / total,
      higherPay: higher > 0 ? 0.99 / (higher / total) : 0,
      lowerPay: lower > 0 ? 0.99 / (lower / total) : 0,
    }
  }, [rest, current])

  const start = () => {
    if (!placeBet(amount, game.name, game.id, 'Hi-Lo')) return
    const d = makeDeck(decks)
    setDeck(d)
    setCurrent(d[0])
    setRest(d.slice(1))
    setMult(1)
    setLast(null)
    setActive(true)
    play('click')
  }

  const guess = (higher: boolean) => {
    if (!active || rest.length === 0) return
    const next = rest[0]
    const remaining = rest.length
    const chance = higher
      ? rest.filter((c) => c.r > current.r).length / remaining
      : rest.filter((c) => c.r < current.r).length / remaining
    if (chance <= 0) return
    const pay = 0.99 / chance
    setLast(next)
    if ((higher && next.r > current.r) || (!higher && next.r < current.r)) {
      const newMult = mult * pay
      setMult(newMult)
      setCurrent(next)
      const nextRest = rest.slice(1)
      if (nextRest.length < 8) {
        const repeated = (c: Card) => (c.r === current.r && c.s === current.s) || (c.r === next.r && c.s === next.s)
        const fresh = makeDeck(decks).filter((c) => !repeated(c))
        setRest(fresh)
        setCurrent(next)
      } else setRest(nextRest)
      play('win')
    } else {
      setActive(false)
      setHistory((h) => [`${cardText(current)} → ${cardText(next)}`, ...h].slice(0, 14))
      play('lose')
    }
  }

  const cashout = () => {
    if (!active || mult <= 1) return
    payout(amount * mult, game.name, game.id, `Retirada ${fmtMult(mult)}`)
    setHistory((h) => [fmtMult(mult), ...h].slice(0, 14))
    setActive(false)
    setMult(1)
    play('cashout')
  }

  const roundLost = !active && last !== null && String(history[0] ?? '').includes('→')

  useAutoCashout({ active, value: mult, target: autoTarget, enabled: autoCash, onCashout: cashout })
  useAutoReplay({ idle: !active, enabled: autoReplay, onStart: start })

  return (
    <GameLayout
      stage={
        <Stage>
          <div className="relative flex min-h-[400px] flex-col items-center justify-center px-4 py-8">
            <div className="pointer-events-none absolute inset-0 bg-grid opacity-20" />
            <div className="relative flex items-center gap-6">
              <div className="text-center">
                <p className="label mb-2">Carta atual</p>
                <PlayingCard card={current} size="lg" />
              </div>
              <div className="text-center">
                <p className="label mb-2">Seguinte</p>
                {last && !active ? <PlayingCard card={last} size="lg" highlight /> : <PlayingCard size="lg" />}
              </div>
            </div>
            <div className="relative mt-6 text-center">
              <p className="label">Multiplicador acumulado</p>
              <p className={`font-display text-4xl font-extrabold tabular ${mult > 1 ? 'text-gold' : 'text-white/50'}`}>{fmtMult(mult)}</p>
              {!active && (
                <p className="mt-1 text-[11px] text-white/35">
                  {last ? 'Ronda terminada. Inicia uma nova.' : 'Faz uma aposta para começar.'}
                </p>
              )}
            </div>
            <div className="relative mt-6 grid w-full max-w-[360px] grid-cols-2 gap-2">
              <ActionButton
                tone="ghost"
                size="half"
                disabled={!active || stats.higherPay === 0}
                onClick={() => guess(true)}
                className="border-good/40 bg-good/10 text-left text-good hover:bg-good/15"
              >
                <span>
                  <span className="block text-xs font-bold text-good">↑ Maior</span>
                  <span className="block text-[10px] text-white/35">{(stats.higher * 100).toFixed(1)}% · paga {stats.higherPay.toFixed(2)}×</span>
                </span>
              </ActionButton>
              <ActionButton
                tone="ghost"
                size="half"
                disabled={!active || stats.lowerPay === 0}
                onClick={() => guess(false)}
                className="border-brand/40 bg-brand/10 text-left text-brand hover:bg-brand/15"
              >
                <span>
                  <span className="block text-xs font-bold text-brand">↓ Menor</span>
                  <span className="block text-[10px] text-white/35">{(stats.lower * 100).toFixed(1)}% · paga {stats.lowerPay.toFixed(2)}×</span>
                </span>
              </ActionButton>
            </div>
            <ResultBanner
              state={!active && last ? (roundLost ? 'lose' : 'win') : 'idle'}
              text={last ? (roundLost ? 'Ronda terminada.' : `+${fmt(amount * (parseFloat(String(history[0] ?? '1')) || 1))} B$`) : ''}
            />
            <div className="relative z-10 mt-3 w-full rounded-2xl border border-white/10 bet-bar bg-[#05060a]/95 p-3 shadow-[0_-8px_30px_rgba(0,0,0,.45)]">
              <BetInput value={amount} onChange={setAmount} min={game.minBet} max={game.maxBet} disabled={active} />
              {!active ? (
                <ActionButton tone={active ? 'placed' : 'bet'} icon="bolt" onClick={start} className="mt-3">
                  {last ? 'Nova ronda' : `Jogar · ${fmt(amount)} B$`}
                </ActionButton>
              ) : (
                <ActionButton tone="cashout" icon="check" onClick={cashout} disabled={mult <= 1} className="mt-3">
                  Retirar {fmt(amount * mult)} B$
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
              <Payout label="Prémio atual" value={`${fmt(amount * mult)} B$`} />
              <Payout label="Cartas restantes" value={String(rest.length)} />
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
            <RecentStrip items={history} colorFor={(v) => (String(v).includes('→') ? 'text-brand border-brand/30' : 'text-gold border-gold/30')} />
          </SidePanel>
        </div>
      }
    />
  )
}
