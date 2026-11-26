import { useRef, useState } from 'react'
import type { Game } from '../lib/types'
import { fmt } from '../lib/format'
import { makeDeck } from '../lib/cards'
import type { Card } from '../lib/cards'
import { useWallet } from '../lib/wallet'
import { useSound } from '../lib/sound'
import { BetInput, GameLayout, Payout, RecentStrip, SidePanel, Stage } from '../components/GameUI'
import { CardHand } from '../components/PlayingCard'

function baccaratTotal(cards: Card[]): number {
  return cards.reduce((s, c) => s + (c.r >= 10 ? 0 : c.r === 14 ? 1 : c.r), 0) % 10
}

export function BaccaratGame({ game }: { game: Game }) {
  const decks = Number(game.config.decks ?? 8)
  const { balance, placeBet, payout } = useWallet()
  const { play } = useSound()
  const [amount, setAmount] = useState(game.minBet)
  const [choice, setChoice] = useState<'player' | 'banker' | 'tie'>('player')
  const [player, setPlayer] = useState<Card[]>([])
  const [banker, setBanker] = useState<Card[]>([])
  const [phase, setPhase] = useState<'bet' | 'done'>('bet')
  const [message, setMessage] = useState('')
  const [win, setWin] = useState(0)
  const [history, setHistory] = useState<string[]>([])
  const deck = useRef<Card[]>([])

  const draw = (): Card => {
    if (deck.current.length < 10) deck.current = makeDeck(decks)
    return deck.current.pop()!
  }

  const deal = () => {
    if (!placeBet(amount, game.name, game.id, choice)) return
    deck.current = makeDeck(decks)
    const p: Card[] = [draw(), draw()]
    const b: Card[] = [draw(), draw()]
    setWin(0)
    setMessage('')

    const pt0 = baccaratTotal(p)
    const bt0 = baccaratTotal(b)
    let playerThird: number | null = null
    if (pt0 < 8 && bt0 < 8 && pt0 <= 5) {
      const c = draw()
      p.push(c)
      playerThird = c.r >= 10 ? 0 : c.r === 14 ? 1 : c.r
    }
    const pt = baccaratTotal(p)
    const bt = baccaratTotal(b)
    let bankerDraw = false
    if (bt0 < 8 && pt0 < 8) {
      if (playerThird === null) {
        bankerDraw = bt <= 5
      } else {
        if (bt <= 2) bankerDraw = true
        else if (bt === 3) bankerDraw = playerThird !== 8
        else if (bt === 4) bankerDraw = playerThird >= 2 && playerThird <= 7
        else if (bt === 5) bankerDraw = playerThird >= 4 && playerThird <= 7
        else if (bt === 6) bankerDraw = playerThird === 6 || playerThird === 7
      }
    }
    if (bankerDraw) b.push(draw())

    setPlayer(p)
    setBanker(b)
    setPhase('done')
    const finalP = baccaratTotal(p)
    const finalB = baccaratTotal(b)
    const outcome = finalP > finalB ? 'player' : finalB > finalP ? 'banker' : 'tie'
    setMessage(`Jogador ${finalP} · Banqueiro ${finalB}`)
    setHistory((h) => [`${outcome === 'player' ? 'J' : outcome === 'banker' ? 'B' : 'E'} ${finalP}-${finalB}`, ...h].slice(0, 12))
    if (outcome === choice) {
      const mult = choice === 'player' ? 2 : choice === 'banker' ? 1.95 : 9
      payout(amount * mult, game.name, game.id, `${outcome} ${finalP}-${finalB}`)
      setWin(amount * mult)
      play('win')
    } else play('lose')
  }

  return (
    <GameLayout
      stage={
        <Stage>
          <div className="relative flex min-h-[440px] flex-col justify-center gap-6 px-4 py-8 sm:px-8">
            <div className="pointer-events-none absolute inset-0 bg-grid opacity-15" />
            <div className="relative rounded-2xl border border-line/60 bg-black/20 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="rounded-md bg-black/40 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white/50">Banqueiro</span>
                <span className="text-sm font-bold tabular text-gold">{banker.length ? baccaratTotal(banker) : '—'}</span>
              </div>
              <div className="flex min-h-[96px] items-center">
                {banker.length ? <CardHand cards={banker} size="md" /> : <span className="text-xs text-white/20">—</span>}
              </div>
            </div>
            <div className="relative text-center">
              {message ? (
                <p className={`font-display text-lg font-extrabold ${win > 0 ? 'text-good' : 'text-brand'}`}>
                  {win > 0 ? `+${fmt(win)} B$` : 'Sem prémio'}
                </p>
              ) : (
                <span className="rounded-full border border-line bg-black/30 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/30">
                  {phase === 'bet' ? 'Faz a tua aposta' : 'Resultado'}
                </span>
              )}
              {message && <p className="mt-1 text-[11px] text-white/35">{message}</p>}
            </div>
            <div className="relative rounded-2xl border border-line/60 bg-black/20 p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="rounded-md bg-black/40 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white/50">Jogador</span>
                <span className="text-sm font-bold tabular text-white">{player.length ? baccaratTotal(player) : '—'}</span>
              </div>
              <div className="flex min-h-[96px] items-center">
                {player.length ? <CardHand cards={player} size="md" /> : <span className="text-xs text-white/20">—</span>}
              </div>
            </div>
          </div>
        </Stage>
      }
      side={
        <div className="space-y-4">
          <SidePanel title="Aposta">
            <BetInput value={amount} onChange={setAmount} min={game.minBet} max={game.maxBet} disabled={phase === 'done'} />
            <div className="mt-3 grid grid-cols-3 gap-1.5">
              {(['player', 'banker', 'tie'] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setChoice(c)}
                  className={`rounded-lg border py-2.5 text-[10px] font-bold uppercase transition ${
                    choice === c ? 'border-gold/50 bg-gold/15 text-gold' : 'border-line text-white/35 hover:text-white'
                  }`}
                >
                  {c === 'player' ? 'Jogador' : c === 'banker' ? 'Banqueiro' : 'Empate'}
                </button>
              ))}
            </div>
            <div className="mt-3 space-y-1.5">
              <Payout label="Pagamento" value={choice === 'player' ? '2.00×' : choice === 'banker' ? '1.95×' : '9.00×'} />
              <Payout label="Ganho potencial" value={`${fmt(amount * (choice === 'player' ? 2 : choice === 'banker' ? 1.95 : 9))} B$`} />
              <Payout label="Saldo" value={`${fmt(balance)} B$`} />
            </div>
            {phase === 'bet' ? (
              <button type="button" onClick={deal} className="btn-primary mt-3 w-full py-3 text-sm">
                Distribuir · {fmt(amount)} B$
              </button>
            ) : (
              <button type="button" onClick={() => setPhase('bet')} className="btn-primary mt-3 w-full py-3 text-sm">
                Nova ronda
              </button>
            )}
          </SidePanel>
          <SidePanel title="Histórico">
            <RecentStrip items={history} colorFor={(v) => (String(v).startsWith('J') ? 'text-good border-good/30' : String(v).startsWith('B') ? 'text-gold border-gold/30' : 'text-white/50')} />
          </SidePanel>
        </div>
      }
    />
  )
}
