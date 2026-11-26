import { useRef, useState } from 'react'
import type { Game } from '../lib/types'
import { fmt } from '../lib/format'
import { handValue, isBlackjack, makeDeck } from '../lib/cards'
import type { Card } from '../lib/cards'
import { useWallet } from '../lib/wallet'
import { useSound } from '../lib/sound'
import { ActionButton, AutoBetControl, BetInput, GameLayout, Payout, RecentStrip, ResultBanner, SidePanel, Stage } from '../components/GameUI'
import { useAutoReplay } from '../lib/autoPlay'
import { PlayingCard } from '../components/PlayingCard'

type Phase = 'bet' | 'player' | 'done'

const FALLBACK_CARD: Card = { r: 2, s: '♠' }

/** Ás a valer 11 (mão suave) — a conta final continua em handValue(). */
function isSoft(cards: Card[]): boolean {
  if (!cards.some((c) => c.r === 14)) return false
  const base = cards.reduce((sum, c) => sum + (c.r === 14 ? 1 : Math.min(10, c.r)), 0)
  return handValue(cards) - base === 10
}

function safeDeck(decks: number): Card[] {
  const count = Number.isFinite(decks) && decks >= 1 ? Math.floor(decks) : 1
  const built = makeDeck(count)
  return built.length > 0 ? built : [FALLBACK_CARD]
}

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
  const [autoReplay, setAutoReplay] = useState(false)
  const [remaining, setRemaining] = useState(0)
  const deck = useRef<Card[]>([])

  const draw = (): Card => {
    if (deck.current.length < 12) deck.current = safeDeck(decks)
    const card = deck.current.pop() ?? FALLBACK_CARD
    setRemaining(deck.current.length)
    return card
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
    deck.current = safeDeck(decks)
    setRemaining(deck.current.length)
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
  const playerSoft = isSoft(player)
  const dealerSoft = isSoft(dealer)
  const canDouble = phase === 'player' && player.length === 2 && balance >= bet

  useAutoReplay({ idle: phase === 'done', enabled: autoReplay, onStart: start })

  return (
    <GameLayout
      stage={
        <Stage>
          <div className="relative flex min-h-[440px] flex-col justify-between px-4 py-5 sm:px-7">
            <div className="pointer-events-none absolute inset-0 bg-grid opacity-15" />
            <div className="relative">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-black/50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white/50">Dealer</span>
                {dealer.length > 0 && (
                  <span className={`text-xs font-bold tabular ${phase === 'done' && dv > 21 ? 'text-brand' : 'text-white/70'}`}>
                    {phase === 'player' ? handValue([dealer[0]]) : dv}
                  </span>
                )}
                {phase === 'done' && dealerSoft && (
                  <span className="rounded-md bg-white/[.06] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/40">suave</span>
                )}
                <span className="ml-auto text-[9px] uppercase tracking-wider text-white/25">{remaining} cartas no baralho</span>
              </div>
              <div className="flex min-h-[112px] flex-wrap gap-2">
                {dealer.map((c, i) => (
                  <div key={`d-${i}-${phase}`} className="animate-popIn" style={{ animationDelay: `${i * 110}ms` }}>
                    <PlayingCard card={i === 1 && phase === 'player' ? undefined : c} size="md" />
                  </div>
                ))}
                {dealer.length === 0 && <p className="text-xs text-white/20">Aguardando ronda…</p>}
              </div>
            </div>

            <div className="relative my-4 flex items-center justify-center">
              {result ? (
                <ResultBanner state={result.kind} text={result.text} />
              ) : (
                <span className="rounded-full border border-line bg-black/30 px-3 py-1.5 text-center text-[10px] font-semibold uppercase tracking-wider text-white/30">
                  {phase === 'player'
                    ? canDouble
                      ? 'A tua vez · podes dobrar'
                      : 'A tua vez'
                    : 'Faz a tua aposta'}
                </span>
              )}
            </div>

            <div className="relative">
              <div className="flex min-h-[112px] flex-wrap gap-2">
                {player.map((c, i) => (
                  <div key={`p-${i}`} className="animate-popIn" style={{ animationDelay: `${i * 110}ms` }}>
                    <PlayingCard card={c} size="md" />
                  </div>
                ))}
                {player.length === 0 && <p className="text-xs text-white/20">As tuas cartas aparecem aqui.</p>}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-md bg-black/50 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white/50">Jogador</span>
                {player.length > 0 && (
                  <span className={`text-xs font-bold tabular ${pv > 21 ? 'text-brand' : 'text-white/70'}`}>{pv}</span>
                )}
                {playerSoft && (
                  <span className="rounded-md border border-gold/25 bg-gold/10 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gold">
                    Ás = 11
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="relative z-10 mt-3 rounded-2xl border border-white/10 bet-bar bg-[#05060a]/95 p-3 shadow-[0_-8px_30px_rgba(0,0,0,.45)]">
            <BetInput value={amount} onChange={setAmount} min={game.minBet} max={game.maxBet} disabled={phase === 'player'} />
            {phase === 'bet' && (
              <ActionButton tone="bet" icon="bolt" onClick={start} className="mt-3">
                Distribuir · {fmt(amount)} B$
              </ActionButton>
            )}
            {phase === 'player' && (
              <div className="mt-3 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <ActionButton tone="bet" icon="bolt" size="half" onClick={hit} disabled={pv >= 21} className="w-full">
                    Pedir
                  </ActionButton>
                  <ActionButton tone="cashout" icon="check" size="half" onClick={stand} className="w-full">
                    Ficar
                  </ActionButton>
                </div>
                <ActionButton tone="bet" onClick={double} disabled={!canDouble}>
                  Dobrar · {fmt(bet)} B$
                </ActionButton>
                {!canDouble && (
                  <p className="text-center text-[9px] text-white/25">
                    Dobrar apenas com 2 cartas e saldo para {fmt(bet)} B$
                  </p>
                )}
              </div>
            )}
            {phase === 'done' && (
              <ActionButton tone="ghost" onClick={() => setPhase('bet')} className="mt-3">
                Nova ronda
              </ActionButton>
            )}
          </div>
        </Stage>
      }
      side={
        <div className="space-y-4">
          <SidePanel title="Mesa">
            <div className="space-y-1.5">
              <Payout label="Aposta em jogo" value={`${fmt(bet)} B$`} />
              <Payout label="Blackjack paga" value="3:2" />
              <Payout label="Cartas restantes" value={String(remaining)} />
              <Payout label="Saldo" value={`${fmt(balance)} B$`} />
            </div>
            <AutoBetControl active={autoReplay} onToggle={() => setAutoReplay((v) => !v)} />
          </SidePanel>
          <SidePanel title="Histórico">
            <RecentStrip items={history} colorFor={(v) => (String(v).startsWith('+') ? 'text-good border-good/30' : String(v) === 'Empate' ? 'text-white/50' : 'text-brand border-brand/30')} />
          </SidePanel>
        </div>
      }
    />
  )
}
