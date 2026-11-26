import { shuffle } from './rng'

export type Suit = '♠' | '♥' | '♦' | '♣'

export interface Card {
  r: number // 2..14 (14 = ás)
  s: Suit
}

const SUITS: Suit[] = ['♠', '♥', '♦', '♣']

export function makeDeck(decks = 1): Card[] {
  const cards: Card[] = []
  for (let d = 0; d < decks; d++) {
    for (const s of SUITS) {
      for (let r = 2; r <= 14; r++) cards.push({ r, s })
    }
  }
  return shuffle(cards)
}

export function isRed(c: Card): boolean {
  return c.s === '♥' || c.s === '♦'
}

export function rankLabel(r: number): string {
  if (r === 14) return 'A'
  if (r === 13) return 'K'
  if (r === 12) return 'Q'
  if (r === 11) return 'J'
  return String(r)
}

export function cardText(c: Card): string {
  return `${rankLabel(c.r)}${c.s}`
}

/** Blackjack value of a single card (ace = 11). */
export function cardValue(c: Card): number {
  return Math.min(10, c.r)
}

/** Best blackjack total for a hand. */
export function handValue(cards: Card[]): number {
  let total = 0
  let aces = 0
  for (const c of cards) {
    if (c.r === 14) {
      aces++
      total += 11
    } else total += cardValue(c)
  }
  while (total > 21 && aces > 0) {
    total -= 10
    aces--
  }
  return total
}

export function isBlackjack(cards: Card[]): boolean {
  return cards.length === 2 && handValue(cards) === 21
}

/** Poker hand ranking for 5 cards. Higher is better. */
export function pokerScore(cards: Card[]): { score: number; name: string } {
  const ranks = cards.map((c) => c.r).sort((a, b) => b - a)
  const counts = new Map<number, number>()
  ranks.forEach((r) => counts.set(r, (counts.get(r) ?? 0) + 1))
  const groups = [...counts.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])
  const flush = cards.every((c) => c.s === cards[0].s)
  const unique = [...new Set(ranks)]
  let straight = false
  let straightHigh = 0
  if (unique.length === 5) {
    if (unique[0] - unique[4] === 4) {
      straight = true
      straightHigh = unique[0]
    } else if (unique[0] === 14 && unique[1] === 5 && unique[1] - unique[4] === 3) {
      straight = true
      straightHigh = 5
    }
  }
  if (straight && flush) return { score: 800 + straightHigh, name: 'Straight Flush' }
  if (groups[0][1] === 4) return { score: 700 + groups[0][0], name: 'Four of a Kind' }
  if (groups[0][1] === 3 && groups[1]?.[1] === 2) return { score: 600 + groups[0][0], name: 'Full House' }
  if (flush) return { score: 500 + ranks[0], name: 'Flush' }
  if (straight) return { score: 400 + straightHigh, name: 'Straight' }
  if (groups[0][1] === 3) return { score: 300 + groups[0][0], name: 'Three of a Kind' }
  if (groups[0][1] === 2 && groups[1]?.[1] === 2) return { score: 200 + groups[0][0] * 16 + groups[1][0], name: 'Two Pair' }
  if (groups[0][1] === 2) return { score: 100 + groups[0][0], name: 'One Pair' }
  return { score: ranks[0], name: 'High Card' }
}

/** Three-card poker ranking. */
export function threeCardScore(cards: Card[]): { score: number; name: string } {
  const ranks = cards.map((c) => c.r).sort((a, b) => b - a)
  const flush = cards.every((c) => c.s === cards[0].s)
  const unique = [...new Set(ranks)]
  const straight = unique.length === 3 && (ranks[0] - ranks[2] === 2 || (ranks[0] === 14 && ranks[1] === 3 && ranks[2] === 2))
  const trips = unique.length === 1
  const pair = unique.length === 2
  if (straight && flush) return { score: 600 + ranks[0], name: 'Straight Flush' }
  if (trips) return { score: 500 + ranks[0], name: 'Three of a Kind' }
  if (straight) return { score: 400 + ranks[0], name: 'Straight' }
  if (flush) return { score: 300 + ranks[0], name: 'Flush' }
  if (pair) {
    const pairRank = ranks.find((r, i) => ranks.indexOf(r) !== i) ?? ranks[0]
    return { score: 200 + pairRank, name: 'Pair' }
  }
  return { score: 100 + ranks[0], name: 'High Card' }
}

export function bestHand(cards: Card[]): { score: number; name: string; cards: Card[] } {
  let best = { score: -1, name: '', cards: [] as Card[] }
  const n = cards.length
  for (let a = 0; a < n; a++)
    for (let b = a + 1; b < n; b++)
      for (let c = b + 1; c < n; c++)
        for (let d = c + 1; d < n; d++)
          for (let e = d + 1; e < n; e++) {
            const hand = [cards[a], cards[b], cards[c], cards[d], cards[e]]
            const s = pokerScore(hand)
            if (s.score > best.score) best = { ...s, cards: hand }
          }
  return best
}
