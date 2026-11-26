import { useRef, useState } from 'react'
import type { Game } from '../lib/types'
import { fmt } from '../lib/format'
import { handValue, isBlackjack, makeDeck } from '../lib/cards'
import type { Card } from '../lib/cards'
import { useWallet } from '../lib/wallet'
import { useSound } from '../lib/sound'
import { BetInput, GameLayout, Payout, RecentStrip, SidePanel, Stage } from '../components/GameUI'
import { PlayingCard } from '../components/PlayingCard'

type Phase = 'bet' | 'player' | 'done'

export function BlackjackGame({ game }: { game: Game }) {
  const decks = Number(game.config.decks ?? 6)
  const hitSoft17 = Boolean(game.config.dealerHits17)
  const { balance, placeBet, payout } = useWallet()
  const { play } = useSound()
  const [amount, setAmount] = useState(game.minBet)
  const [phase, setPhase] = useState<Phase>('bet')
  const [player, setPlayer] = useState<Card[]>([])
  const [dealer, setDealer] = useState<Card[]>([])
  const [result, setResult] = useState<{ text: string; kind: 'win' | 'lose' | 'push' } | null>(null)
  const [bet, setBet] = useState(0)
  const [history, setHistory] = useState<string[]>([])
  const deck = useRef<Card[]>([])

  const draw = (): Card => {
    if (deck.current.length < 12) deck.current = makeDeck(decks)
    return deck.current.pop()!
  }

  const finish = (p: Card[], d: Card[], currentBet: number) => {
    const pv = handValue(p)
    const dv = handValue(d)
    if (pv > 21) {
      setResult({ text: `Passaste de 21 (${pv}). Perdeste.`, kind: 'lose' })
      setHistory((h) => ['Derrota', ...h].slice(0, 12))
      play('lose')
    } else if (dv > 21) {
      payout(currentBet * 2, game.name, game.id, `Dealer rebentou (${dv})`)
      setResult({ text: `O dealer rebentou com ${dv}. Ganhaste!`, kind: 'win' })
      setHistory((h) => [`+${fmt(currentBet)}`, ...h].slice(0, 12))
      play('win')
    } else if (pv > dv) {
      payout(currentBet * 2, game.name, game.id, `${pv} vs ${dv}`)
      setResult({ text: `${pv} contra ${dv}. Ganhaste!`, kind: 'win' })
      setHistory((h) => [`+${fmt(currentBet)}`, ...h].slice(0, 12))
      play('win')
    } else if (pv === dv) {
      payout(currentBet, game.name, game.id, 'Empate')
      setResult({ text: `${pv} contra ${dv}. Empate — aposta devolvida.`, kind: 'push' })
      setHistory((h) => ['Empate', ...h].slice(0, 12))
      play('click')
    } else {
      setResult({ text: `${pv} contra ${dv}. Perdeste.`, kind: 'lose' })
      setHistory((h) => ['Derrota', ...h].slice(0, 12))
      play('lose')
    }
    setPhase('done')
  }

  const start = () => {
    if (!placeBet(amount, game.name, game.id, 'Blackjack')) return
    deck.current = makeDeck(decks)
    const p = [draw(), draw()]
    const d = [draw(), draw()]
    setPlayer(p)
    setDealer(d)
    setBet(amount)
    setResult(null)
    setPhase('player')
    play('click')
    if (isBlackjack(p)) {
      if (isBlackjack(d)) {
        payout(amount, game.name, game.id, 'Blackjack empatado')
        setResult({ text: 'Blackjack dos dois lados. Empate.', kind: 'push' })
        setHistory((h) => ['Empate', ...h].slice(0, 12))
      } else {
        payout(amount * 2.5, game.name, game.id, 'Blackjack!')
        setResult({ text: 'Blackjack! Pagamento 3:2.', kind: 'win' })
        setHistory((h) => [`+${fmt(amount * 1.5)}`, ...h].slice(0, 12))
        play('win')
      }
      setPhase('done')
    }
  }

  const hit = () => {
    if (phase !== 'player') return
    const p = [...player, draw()]
    setPlayer(p)
    play('tick')
    if (handValue(p) > 21) finish(p, dealer, bet)
  }

  const stand = () => {
    if (phase !== 'player') return
    let d = [...dealer]
    while (handValue(d) < 17 || (hitSoft17 && handValue(d) === 17)) {
      d = [...d, draw()]
    }
    setDealer(d)
    finish(player, d, bet)
  }

  const double = () => {
    if (phase !== 'player' || player.length !== 2) return
    if (!placeBet(bet, game.name, game.id, 'Dobrar')) return
    const total = bet * 2
    setBet(total)
    const p = [...player, draw()]
    setPlayer(p)
    play('tick')
    let d = [...dealer]
    while (handValue(d) < 17 || (hitSoft17 && handValue(d) === 17)) d = [...d, draw()]
    setDealer(d)
    finish(p, d, total)
  }

  const pv = handValue(player)
  const dv = handValue(dealer)

  return (
    <GameLayout
      stage={
        <Stage>
          <div className="relative flex min-h-[440px] flex-col justify-between px-4 py-5 sm:px-7">
            <div className="pointer-events-none absolute inset-0 bg-grid opacity-15" />
            <div className="relative">
              <div className="mb-2 flex items-center gap-2">
                <span className="rounded-md bg-black/50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white/50">Dealer</span>
                {dealer.length > 0 && <span className="text-xs font-bold tabular text-white/70">{phase === 'player' ? handValue([dealer[0]]) : dv}</span>}
              </div>
              <div className="flex min-h-[112px] flex-wrap gap-2">
                {dealer.map((c, i) => (
                  <PlayingCard key={`d-${i}`} card={i === 1 && phase === 'player' ? undefined : c} size="md" />
                ))}
                {dealer.length === 0 && <p className="text-xs text-white/20">Aguardando ronda…</p>}
              </div>
            </div>

            <div className="relative my-4 flex items-center justify-center">
              {result ? (
                <div className={`rounded-xl border px-4 py-2.5 text-center animate-popIn ${result.kind === 'win' ? 'border-good/30 bg-good/10' : result.kind === 'push' ? 'border-line bg-white/5' : 'border-brand/30 bg-brand/10'}`}>
                  <p className={`text-xs font-bold ${result.kind === 'win' ? 'text-good' : result.kind === 'push' ? 'text-white/70' : 'text-brand'}`}>{result.text}</p>
                </div>
              ) : (
                <span className="rounded-full border border-line bg-black/30 px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-white/30">
                  {phase === 'player' ? 'A tua vez' : 'Faz a tua aposta'}
                </span>
              )}
            </div>

            <div className="relative">
              <div className="flex min-h-[112px] flex-wrap gap-2">
                {player.map((c, i) => (
                  <PlayingCard key={`p-${i}`} card={c} size="md" />
                ))}
                {player.length === 0 && <p className="text-xs text-white/20">As tuas cartas aparecem aqui.</p>}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <span className="rounded-md bg-black/50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white/50">Jogador</span>
                {player.length > 0 && <span className="text-xs font-bold tabular text-white/70">{pv}</span>}
              </div>
            </div>
          </div>
        </Stage>
      }
      side={
        <div className="space-y-4">
          <SidePanel title="Mesa">
            <BetInput value={amount} onChange={setAmount} min={game.minBet} max={game.maxBet} disabled={phase === 'player'} />
            <div className="mt-3 space-y-1.5">
              <Payout label="Aposta em jogo" value={`${fmt(bet)} B$`} />
              <Payout label="Blackjack paga" value="3:2" />
              <Payout label="Saldo" value={`${fmt(balance)} B$`} />
            </div>
            {phase === 'bet' && (
              <button type="button" onClick={start} className="btn-primary mt-3 w-full py-3 text-sm">
                Distribuir · {fmt(amount)} B$
              </button>
            )}
            {phase === 'player' && (
              <div className="mt-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <button type="button" onClick={hit} className="btn-primary py-3 text-xs">Pedir</button>
                  <button type="button" onClick={stand} className="btn-ghost py-3 text-xs">Ficar</button>
                </div>
                <button type="button" onClick={double} disabled={player.length !== 2 || balance < bet} className="btn-gold w-full py-2.5 text-xs">
                  Dobrar · {fmt(bet)} B$
                </button>
              </div>
            )}
            {phase === 'done' && (
              <button type="button" onClick={() => setPhase('bet')} className="btn-primary mt-3 w-full py-3 text-sm">
                Nova ronda
              </button>
            )}
          </SidePanel>
          <SidePanel title="Histórico">
            <RecentStrip items={history} colorFor={(v) => (String(v).startsWith('+') ? 'text-good border-good/30' : String(v) === 'Empate' ? 'text-white/50' : 'text-brand border-brand/30')} />
          </SidePanel>
        </div>
      }
    />
  )
}
