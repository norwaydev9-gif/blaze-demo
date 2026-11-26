import type { Card } from '../lib/cards'
import { isRed, rankLabel } from '../lib/cards'

export function PlayingCard({
  card,
  size = 'md',
  dim = false,
  highlight = false,
}: {
  card?: Card
  size?: 'sm' | 'md' | 'lg'
  dim?: boolean
  highlight?: boolean
}) {
  const dims =
    size === 'sm' ? 'w-10 text-[10px] p-1' : size === 'lg' ? 'w-24 text-base p-2' : 'w-16 text-xs p-1.5'
  if (!card) {
    return <div className={`card-back ${dims} ${dim ? 'opacity-50' : ''}`} />
  }
  const red = isRed(card)
  return (
    <div
      className={`playing-card ${dims} ${red ? 'red' : ''} ${dim ? 'opacity-50' : ''} ${
        highlight ? 'ring-2 ring-gold shadow-[0_0_22px_rgba(255,200,87,.35)]' : ''
      }`}
    >
      <div className="flex items-start justify-between leading-none">
        <span className="font-bold">{rankLabel(card.r)}</span>
        <span>{card.s}</span>
      </div>
      <div className={`text-center ${size === 'lg' ? 'text-3xl' : size === 'sm' ? 'text-base' : 'text-xl'}`}>{card.s}</div>
      <div className="flex rotate-180 items-start justify-between leading-none">
        <span className="font-bold">{rankLabel(card.r)}</span>
        <span>{card.s}</span>
      </div>
    </div>
  )
}

export function CardHand({ cards, size = 'md', highlight = [] }: { cards: Card[]; size?: 'sm' | 'md' | 'lg'; highlight?: number[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {cards.map((c, i) => (
        <PlayingCard key={`${c.r}-${c.s}-${i}`} card={c} size={size} highlight={highlight.includes(i)} />
      ))}
    </div>
  )
}
