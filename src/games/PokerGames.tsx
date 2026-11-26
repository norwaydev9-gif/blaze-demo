import { useRef, useState } from 'react'
import type { Game } from '../lib/types'
import { fmt } from '../lib/format'
import { bestHand, makeDeck, pokerScore, threeCardScore } from '../lib/cards'
import type { Card } from '../lib/cards'
import { useWallet } from '../lib/wallet'
import { useSound } from '../lib/sound'
import { ActionButton, BetInput, GameLayout, Payout, RecentStrip, ResultBanner, SidePanel, Stage } from '../components/GameUI'
import { CardHand, PlayingCard } from '../components/PlayingCard'

const HAND_PT: Record<string, string> = {
  'Royal Flush': 'Royal Flush',
  'Straight Flush': 'Straight Flush',
  'Four of a Kind': 'Quadra',
  'Full House': 'Full House',
  Flush: 'Flush',
  Straight: 'Sequência',
  'Three of a Kind': 'Trio',
  'Two Pair': 'Dois pares',
  'One Pair': 'Par',
  'High Card': 'Carta alta',
}

function isRoyal(cards: Card[]): boolean {
  return pokerScore(cards).name === 'Straight Flush' && cards.every((c) => c.r >= 10 || c.r === 14) && new Set(cards.map((c) => c.r)).size === 5
}

/* ------------------------------- Video Poker ------------------------------- */
export function VideoPokerGame({ game }: { game: Game }) {
  const { balance, placeBet, payout } = useWallet()
  const { play } = useSound()
  const [amount, setAmount] = useState(game.minBet)
  const [cards, setCards] = useState<Card[]>([])
  const [holds, setHolds] = useState<boolean[]>([false, false, false, false, false])
  const [phase, setPhase] = useState<'bet' | 'draw' | 'done'>('bet')
  const [message, setMessage] = useState('')
  const [win, setWin] = useState(0)
  const [history, setHistory] = useState<string[]>([])
  const deck = useRef<Card[]>([])

  const draw = () => {
    if (deck.current.length < 10) deck.current = makeDeck(1)
    return deck.current.pop()!
  }

  const pay = (name: string, hand: Card[]): number => {
    if (name === 'Straight Flush' && isRoyal(hand)) return 251
    const table: Record<string, number> = {
      'Straight Flush': 51,
      'Four of a Kind': 26,
      'Full House': 10,
      Flush: 7,
      Straight: 5,
      'Three of a Kind': 4,
      'Two Pair': 3,
    }
    if (name === 'One Pair') {
      const pairRank = hand.map((c) => c.r).find((r) => hand.filter((c) => c.r === r).length === 2) ?? 0
      return pairRank >= 11 ? 2 : 0
    }
    return table[name] ?? 0
  }

  const deal = () => {
    if (!placeBet(amount, game.name, game.id, 'Video Poker')) return
    deck.current = makeDeck(1)
    setCards([draw(), draw(), draw(), draw(), draw()])
    setHolds([false, false, false, false, false])
    setPhase('draw')
    setMessage('')
    setWin(0)
    play('click')
  }

  const finalize = (hand: Card[]) => {
    const score = pokerScore(hand)
    const mult = pay(score.name, hand)
    setPhase('done')
    setMessage(HAND_PT[score.name] ?? score.name)
    if (mult > 0) {
      payout(amount * mult, game.name, game.id, `${score.name} ${mult}×`)
      setWin(amount * mult)
      setHistory((h) => [`${HAND_PT[score.name] ?? score.name} +${fmt(amount * mult)}`, ...h].slice(0, 10))
      play('win')
    } else {
      setHistory((h) => [HAND_PT[score.name] ?? score.name, ...h].slice(0, 10))
      play('lose')
    }
  }

  const drawCards = () => {
    if (phase !== 'draw') return
    const next = cards.map((c, i) => (holds[i] ? c : draw()))
    setCards(next)
    play('tick')
    finalize(next)
  }

  return (
    <GameLayout
      stage={
        <Stage>
          <div className="relative flex min-h-[420px] flex-col justify-center px-4 py-8 sm:px-8">
            <div className="pointer-events-none absolute inset-0 bg-grid opacity-15" />
            <div className="relative mx-auto w-full max-w-[640px]">
              <div className="mb-5 text-center">
                <p className="label">Video Poker · Jacks or Better</p>
                <p className={`mt-1 text-sm font-bold ${win > 0 ? 'text-good' : 'text-white/40'}`}>
                  {message || (phase === 'draw' ? 'Escolhe as cartas a manter' : 'Distribui para começar')}
                  {win > 0 && ` · +${fmt(win)} B$`}
                </p>
                <ResultBanner
                  state={phase !== 'done' ? 'idle' : win > 0 ? 'win' : 'lose'}
                  text={win > 0 ? `+${fmt(win)} B$` : 'Sem prémio nesta mão.'}
                />
              </div>
              <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                {Array.from({ length: 5 }, (_, i) => (
                  <div key={i} className="flex flex-col items-center gap-1.5">
                    <div className="relative animate-popIn" style={{ animationDelay: `${i * 90}ms` }}>
                      {cards[i] ? <PlayingCard card={cards[i]} size="lg" highlight={holds[i]} /> : <PlayingCard size="lg" />}
                    </div>
                    <ActionButton
                      tone="ghost"
                      size="compact"
                      disabled={phase !== 'draw'}
                      onClick={() => setHolds((h) => h.map((v, idx) => (idx === i ? !v : v)))}
                      className={holds[i] ? 'border-gold/50 bg-gold/20 text-gold' : ''}
                    >
                      {holds[i] ? 'Manter' : 'Trocar'}
                    </ActionButton>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Stage>
      }
      side={
        <div className="space-y-4">
          <SidePanel title="Aposta">
            <BetInput value={amount} onChange={setAmount} min={game.minBet} max={game.maxBet} disabled={phase === 'draw'} />
            <div className="mt-3 space-y-1.5">
              <Payout label="Par de Valetes+" value="2×" />
              <Payout label="Full House" value="10×" />
              <Payout label="Royal Flush" value="251×" />
              <Payout label="Saldo" value={`${fmt(balance)} B$`} />
            </div>
            {phase === 'bet' && (
              <ActionButton tone="bet" icon="bolt" onClick={deal} className="mt-3">
                Distribuir · {fmt(amount)} B$
              </ActionButton>
            )}
            {phase === 'draw' && (
              <ActionButton tone="bet" icon="bolt" onClick={drawCards} className="mt-3">
                Trocar e revelar
              </ActionButton>
            )}
            {phase === 'done' && (
              <ActionButton tone="ghost" onClick={() => setPhase('bet')} className="mt-3">
                Nova mão
              </ActionButton>
            )}
          </SidePanel>
          <SidePanel title="Histórico">
            <RecentStrip items={history} colorFor={(v) => (String(v).includes('+') ? 'text-good border-good/30' : 'text-white/35')} />
          </SidePanel>
        </div>
      }
    />
  )
}

/* ------------------------------ Caribbean Poker ----------------------------- */
export function CaribbeanPokerGame({ game }: { game: Game }) {
  const { balance, placeBet, payout } = useWallet()
  const { play } = useSound()
  const [amount, setAmount] = useState(game.minBet)
  const [player, setPlayer] = useState<Card[]>([])
  const [dealer, setDealer] = useState<Card[]>([])
  const [phase, setPhase] = useState<'bet' | 'decide' | 'done'>('bet')
  const [message, setMessage] = useState('')
  const [win, setWin] = useState(0)
  const [history, setHistory] = useState<string[]>([])
  const deck = useRef<Card[]>([])

  const draw = (): Card => {
    if (deck.current.length < 12) deck.current = makeDeck(1)
    return deck.current.pop()!
  }

  const multiplierFor = (name: string): number => {
    const table: Record<string, number> = {
      'Royal Flush': 101,
      'Straight Flush': 51,
      'Four of a Kind': 21,
      'Full House': 8,
      Flush: 6,
      Straight: 5,
      'Three of a Kind': 4,
      'Two Pair': 3,
      'One Pair': 2,
      'High Card': 1,
    }
    return table[name] ?? 1
  }

  const deal = () => {
    if (!placeBet(amount, game.name, game.id, 'Caribbean Poker')) return
    deck.current = makeDeck(1)
    setPlayer(Array.from({ length: 5 }, draw))
    setDealer(Array.from({ length: 5 }, draw))
    setPhase('decide')
    setMessage('')
    setWin(0)
    play('click')
  }

  const finish = (raised: boolean) => {
    if (!raised) {
      setPhase('done')
      setMessage('Desististe. Perdeste a aposta.')
      setHistory((h) => ['Desistiu', ...h].slice(0, 10))
      play('lose')
      return
    }
    if (!placeBet(amount, game.name, game.id, 'Raise')) return
    const pScore = pokerScore(player)
    const dScore = pokerScore(dealer)
    const ranks = dealer.map((c) => c.r).sort((a, b) => b - a)
    const qualifies = dScore.score >= 100 || (ranks[0] === 14 && ranks[1] === 13)
    setPhase('done')
    let total = 0
    if (!qualifies) {
      total = amount * 2 + (raised ? amount : 0)
      setMessage(`O dealer não qualifica. ${HAND_PT[pScore.name] ?? pScore.name}.`)
    } else if (pScore.score > dScore.score) {
      const m = multiplierFor(pScore.name)
      total = amount * m + (raised ? amount * m : 0)
      setMessage(`Ganhaste com ${HAND_PT[pScore.name] ?? pScore.name} contra ${HAND_PT[dScore.name] ?? dScore.name}.`)
    } else if (pScore.score === dScore.score) {
      total = amount + (raised ? amount : 0)
      setMessage('Empate — apostas devolvidas.')
    } else {
      setMessage(`O dealer ganha com ${HAND_PT[dScore.name] ?? dScore.name}.`)
    }
    if (total > 0) {
      payout(total, game.name, game.id, pScore.name)
      setWin(total)
      setHistory((h) => [`${HAND_PT[pScore.name] ?? pScore.name} ${total > amount ? '+' : '='}`, ...h].slice(0, 10))
      if (total > amount) play('win')
    } else play('lose')
  }

  return (
    <GameLayout
      stage={
        <Stage>
          <div className="relative flex min-h-[440px] flex-col justify-center gap-5 px-4 py-6 sm:px-8">
            <div className="pointer-events-none absolute inset-0 bg-grid opacity-15" />
            <div className="relative">
              <div className="mb-2 flex items-center justify-between">
                <span className="rounded-md bg-black/40 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white/50">Dealer</span>
                {phase === 'done' && <span className="text-xs font-bold text-white/60">{HAND_PT[pokerScore(dealer).name] ?? pokerScore(dealer).name}</span>}
              </div>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {dealer.map((c, i) => (
                  <PlayingCard key={i} card={phase === 'decide' ? undefined : c} size="sm" />
                ))}
              </div>
            </div>
            <div className="relative text-center">
              <p className={`text-xs font-bold ${win > 0 ? 'text-good' : 'text-white/40'}`}>
                {message || (phase === 'decide' ? 'Decide: desistir ou apostar 2×' : 'Faz a tua aposta')}
              </p>
              {win > 0 && <p className="font-display text-xl font-extrabold text-good">+{fmt(win)} B$</p>}
              <ResultBanner
                state={phase !== 'done' ? 'idle' : win > 0 ? 'win' : 'lose'}
                text={win > 0 ? `+${fmt(win)} B$` : 'Sem prémio nesta mão.'}
              />
            </div>
            <div className="relative">
              <div className="mb-2 flex items-center justify-between">
                <span className="rounded-md bg-black/40 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white/50">Jogador</span>
                {player.length > 0 && <span className="text-xs font-bold text-white/60">{HAND_PT[pokerScore(player).name] ?? pokerScore(player).name}</span>}
              </div>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {player.length ? player.map((c, i) => <PlayingCard key={i} card={c} size="sm" />) : <span className="text-xs text-white/20">—</span>}
              </div>
            </div>
          </div>
        </Stage>
      }
      side={
        <div className="space-y-4">
          <SidePanel title="Aposta">
            <BetInput value={amount} onChange={setAmount} min={game.minBet} max={game.maxBet} disabled={phase !== 'bet'} />
            <div className="mt-3 space-y-1.5">
              <Payout label="Aposta" value={`${fmt(amount)} B$`} />
              <Payout label="Par paga" value="2×" />
              <Payout label="Saldo" value={`${fmt(balance)} B$`} />
            </div>
            {phase === 'bet' && (
              <ActionButton tone="bet" icon="bolt" onClick={deal} className="mt-3">
                Distribuir · {fmt(amount)} B$
              </ActionButton>
            )}
            {phase === 'decide' && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <ActionButton tone="ghost" size="half" onClick={() => finish(false)}>Desistir</ActionButton>
                <ActionButton tone="gold" size="half" onClick={() => finish(true)}>Apostar 2×</ActionButton>
              </div>
            )}
            {phase === 'done' && (
              <ActionButton tone="ghost" onClick={() => setPhase('bet')} className="mt-3">
                Nova mão
              </ActionButton>
            )}
          </SidePanel>
          <SidePanel title="Histórico">
            <RecentStrip items={history} colorFor={(v) => (String(v).includes('+') ? 'text-good border-good/30' : 'text-white/35')} />
          </SidePanel>
        </div>
      }
    />
  )
}

/* ------------------------------ Three Card Poker ----------------------------- */
export function ThreeCardPokerGame({ game }: { game: Game }) {
  const { balance, placeBet, payout } = useWallet()
  const { play } = useSound()
  const [amount, setAmount] = useState(game.minBet)
  const [player, setPlayer] = useState<Card[]>([])
  const [dealer, setDealer] = useState<Card[]>([])
  const [phase, setPhase] = useState<'bet' | 'decide' | 'done'>('bet')
  const [message, setMessage] = useState('')
  const [win, setWin] = useState(0)
  const [history, setHistory] = useState<string[]>([])
  const deck = useRef<Card[]>([])

  const draw = (): Card => {
    if (deck.current.length < 8) deck.current = makeDeck(1)
    return deck.current.pop()!
  }

  const deal = () => {
    if (!placeBet(amount, game.name, game.id, 'Three Card Poker')) return
    deck.current = makeDeck(1)
    setPlayer([draw(), draw(), draw()])
    setDealer([draw(), draw(), draw()])
    setPhase('decide')
    setMessage('')
    setWin(0)
    play('click')
  }

  const finish = (raise: boolean) => {
    if (!raise) {
      setPhase('done')
      setMessage('Desististe. Perdeste a ante.')
      setHistory((h) => ['Desistiu', ...h].slice(0, 10))
      play('lose')
      return
    }
    if (!placeBet(amount, game.name, game.id, 'Play')) return
    const p = threeCardScore(player)
    const d = threeCardScore(dealer)
    const qualifies = d.score >= 212 || (d.name === 'High Card' && d.score >= 112)
    setPhase('done')
    let total = 0
    if (!qualifies) {
      total = amount * 2 + (raise ? amount : 0)
      setMessage(`Dealer não qualifica (${HAND_PT[d.name] ?? d.name}). Ante paga.`)
    } else if (p.score > d.score) {
      total = amount * 2 + amount * 2
      const bonus = p.score >= 600 ? 5 : p.score >= 500 ? 4 : p.score >= 400 ? 1 : 0
      total += amount * bonus
      setMessage(`Ganhaste com ${HAND_PT[p.name] ?? p.name}.`)
    } else if (p.score === d.score) {
      total = amount + (raise ? amount : 0)
      setMessage('Empate — apostas devolvidas.')
    } else {
      setMessage(`Dealer ganha com ${HAND_PT[d.name] ?? d.name}.`)
    }
    if (total > 0) {
      payout(total, game.name, game.id, p.name)
      setWin(total)
      setHistory((h) => [`${HAND_PT[p.name] ?? p.name} ${total > amount ? '+' : '='}`, ...h].slice(0, 10))
      if (total > amount) play('win')
    } else play('lose')
  }

  return (
    <GameLayout
      stage={
        <Stage>
          <div className="relative flex min-h-[420px] flex-col justify-center gap-6 px-4 py-6 sm:px-8">
            <div className="pointer-events-none absolute inset-0 bg-grid opacity-15" />
            <div className="relative">
              <div className="mb-2 flex items-center justify-between">
                <span className="rounded-md bg-black/40 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white/50">Dealer</span>
                {phase === 'done' && <span className="text-xs font-bold text-white/60">{HAND_PT[threeCardScore(dealer).name] ?? threeCardScore(dealer).name}</span>}
              </div>
              <div className="flex flex-wrap gap-2">
                {dealer.map((c, i) => (
                  <PlayingCard key={i} card={phase === 'decide' ? undefined : c} size="md" />
                ))}
              </div>
            </div>
            <div className="relative text-center">
              <p className={`text-xs font-bold ${win > 0 ? 'text-good' : 'text-white/40'}`}>
                {message || (phase === 'decide' ? 'Joga ou desiste' : 'Faz a tua aposta')}
              </p>
              {win > 0 && <p className="font-display text-xl font-extrabold text-good">+{fmt(win)} B$</p>}
              <ResultBanner
                state={phase !== 'done' ? 'idle' : win > 0 ? 'win' : 'lose'}
                text={win > 0 ? `+${fmt(win)} B$` : 'Sem prémio nesta mão.'}
              />
            </div>
            <div className="relative">
              <div className="mb-2 flex items-center justify-between">
                <span className="rounded-md bg-black/40 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white/50">Jogador</span>
                {player.length > 0 && <span className="text-xs font-bold text-white/60">{HAND_PT[threeCardScore(player).name] ?? threeCardScore(player).name}</span>}
              </div>
              <div className="flex flex-wrap gap-2">
                {player.length ? player.map((c, i) => <PlayingCard key={i} card={c} size="md" />) : <span className="text-xs text-white/20">—</span>}
              </div>
            </div>
          </div>
        </Stage>
      }
      side={
        <div className="space-y-4">
          <SidePanel title="Aposta">
            <BetInput value={amount} onChange={setAmount} min={game.minBet} max={game.maxBet} disabled={phase !== 'bet'} />
            <div className="mt-3 space-y-1.5">
              <Payout label="Ante" value={`${fmt(amount)} B$`} />
              <Payout label="Dealer qualifica" value="Dama high+" />
              <Payout label="Saldo" value={`${fmt(balance)} B$`} />
            </div>
            {phase === 'bet' && (
              <ActionButton tone="bet" icon="bolt" onClick={deal} className="mt-3">
                Distribuir · {fmt(amount)} B$
              </ActionButton>
            )}
            {phase === 'decide' && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <ActionButton tone="ghost" size="half" onClick={() => finish(false)}>Desistir</ActionButton>
                <ActionButton tone="gold" size="half" onClick={() => finish(true)}>Jogar 2×</ActionButton>
              </div>
            )}
            {phase === 'done' && (
              <ActionButton tone="ghost" onClick={() => setPhase('bet')} className="mt-3">
                Nova mão
              </ActionButton>
            )}
          </SidePanel>
          <SidePanel title="Histórico">
            <RecentStrip items={history} colorFor={(v) => (String(v).includes('+') ? 'text-good border-good/30' : 'text-white/35')} />
          </SidePanel>
        </div>
      }
    />
  )
}

/* -------------------------------- Texas Hold'em ------------------------------- */
export function TexasHoldemGame({ game }: { game: Game }) {
  const { balance, placeBet, payout } = useWallet()
  const { play } = useSound()
  const [amount, setAmount] = useState(game.minBet)
  const [player, setPlayer] = useState<Card[]>([])
  const [dealer, setDealer] = useState<Card[]>([])
  const [board, setBoard] = useState<Card[]>([])
  const [reveal, setReveal] = useState(0)
  const [phase, setPhase] = useState<'bet' | 'play' | 'done'>('bet')
  const [message, setMessage] = useState('')
  const [win, setWin] = useState(0)
  const [history, setHistory] = useState<string[]>([])
  const deck = useRef<Card[]>([])

  const draw = (): Card => {
    if (deck.current.length < 10) deck.current = makeDeck(1)
    return deck.current.pop()!
  }

  const deal = () => {
    if (!placeBet(amount, game.name, game.id, "Texas Hold'em")) return
    deck.current = makeDeck(1)
    setPlayer([draw(), draw()])
    setDealer([draw(), draw()])
    setBoard([draw(), draw(), draw(), draw(), draw()])
    setReveal(0)
    setPhase('play')
    setMessage('')
    setWin(0)
    play('click')
  }

  const advance = () => {
    if (reveal === 0) {
      setReveal(3)
      play('tick')
    } else if (reveal === 3) {
      setReveal(4)
      play('tick')
    } else if (reveal === 4) {
      setReveal(5)
      play('tick')
    } else {
      showdown()
    }
  }

  const showdown = () => {
    const p = bestHand([...player, ...board])
    const d = bestHand([...dealer, ...board])
    setPhase('done')
    if (p.score > d.score) {
      payout(amount * 2, game.name, game.id, p.name)
      setWin(amount * 2)
      setMessage(`Ganhaste com ${HAND_PT[p.name] ?? p.name} contra ${HAND_PT[d.name] ?? d.name}.`)
      setHistory((h) => [`${HAND_PT[p.name] ?? p.name} +${fmt(amount)}`, ...h].slice(0, 10))
      play('win')
    } else if (p.score === d.score) {
      payout(amount, game.name, game.id, 'Empate')
      setWin(amount)
      setMessage(`Empate com ${HAND_PT[p.name] ?? p.name}.`)
      setHistory((h) => ['Empate', ...h].slice(0, 10))
      play('click')
    } else {
      setMessage(`Dealer ganha com ${HAND_PT[d.name] ?? d.name}.`)
      setHistory((h) => ['Derrota', ...h].slice(0, 10))
      play('lose')
    }
  }

  const fold = () => {
    setPhase('done')
    setMessage('Desististe. Perdeste a aposta.')
    setHistory((h) => ['Desistiu', ...h].slice(0, 10))
    play('lose')
  }

  const pBest = player.length && board.length ? bestHand([...player, ...board]) : null
  const dBest = dealer.length && board.length ? bestHand([...dealer, ...board]) : null

  return (
    <GameLayout
      stage={
        <Stage>
          <div className="relative flex min-h-[460px] flex-col justify-center gap-4 px-3 py-5 sm:px-7">
            <div className="pointer-events-none absolute inset-0 bg-grid opacity-15" />
            <div className="relative">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="rounded-md bg-black/40 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white/50">Dealer</span>
                {phase === 'done' && dBest && <span className="text-[10px] font-bold text-white/50">{HAND_PT[dBest.name] ?? dBest.name}</span>}
              </div>
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {dealer.map((c, i) => (
                  <PlayingCard key={i} card={phase === 'done' ? c : undefined} size="sm" />
                ))}
              </div>
            </div>
            <div className="relative rounded-xl border border-line/60 bg-black/20 p-2">
              <p className="mb-1 text-center text-[9px] uppercase tracking-wider text-white/25">Mesa</p>
              <div className="flex flex-wrap justify-center gap-1.5">
                {Array.from({ length: 5 }, (_, i) =>
                  i < reveal ? <PlayingCard key={i} card={board[i]} size="sm" /> : <PlayingCard key={i} size="sm" dim />,
                )}
              </div>
            </div>
            <div className="relative">
              <div className="flex flex-wrap gap-1.5 sm:gap-2">
                {player.map((c, i) => (
                  <PlayingCard key={i} card={c} size="sm" highlight={phase === 'done' && pBest ? pBest.cards.includes(c) : false} />
                ))}
              </div>
              <div className="mt-1.5 flex items-center justify-between">
                <span className="rounded-md bg-black/40 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white/50">Jogador</span>
                {pBest && <span className="text-[10px] font-bold text-white/50">{HAND_PT[pBest.name] ?? pBest.name}</span>}
              </div>
            </div>
            <div className="relative text-center">
              <p className={`text-xs font-bold ${win > 0 ? 'text-good' : 'text-white/40'}`}>{message || (phase === 'play' ? 'Continua ou desiste' : 'Faz a tua aposta')}</p>
              {win > 0 && <p className="font-display text-lg font-extrabold text-good">+{fmt(win)} B$</p>}
              <ResultBanner
                state={phase !== 'done' ? 'idle' : win > 0 ? 'win' : 'lose'}
                text={win > 0 ? `+${fmt(win)} B$` : 'Sem prémio nesta mão.'}
              />
            </div>
          </div>
        </Stage>
      }
      side={
        <div className="space-y-4">
          <SidePanel title="Aposta">
            <BetInput value={amount} onChange={setAmount} min={game.minBet} max={game.maxBet} disabled={phase === 'play'} />
            <div className="mt-3 space-y-1.5">
              <Payout label="Aposta" value={`${fmt(amount)} B$`} />
              <Payout label="Prémio" value={`${fmt(amount * 2)} B$`} />
              <Payout label="Saldo" value={`${fmt(balance)} B$`} />
            </div>
            {phase === 'bet' && (
              <ActionButton tone="bet" icon="bolt" onClick={deal} className="mt-3">
                Distribuir · {fmt(amount)} B$
              </ActionButton>
            )}
            {phase === 'play' && (
              <div className="mt-3 space-y-2">
                <ActionButton tone="bet" icon="bolt" onClick={advance}>
                  {reveal === 0 ? 'Ver flop' : reveal === 3 ? 'Ver turn' : reveal === 4 ? 'Ver river' : 'Mostrar cartas'}
                </ActionButton>
                <ActionButton tone="ghost" size="compact" onClick={fold}>Desistir</ActionButton>
              </div>
            )}
            {phase === 'done' && (
              <ActionButton tone="ghost" onClick={() => setPhase('bet')} className="mt-3">
                Nova mão
              </ActionButton>
            )}
          </SidePanel>
          <SidePanel title="Histórico">
            <RecentStrip items={history} colorFor={(v) => (String(v).includes('+') ? 'text-good border-good/30' : 'text-white/35')} />
          </SidePanel>
        </div>
      }
    />
  )
}
