import raw from '../data/games.json'
import type { Catalog, Game, GameCategory } from './types'

const catalog = raw as unknown as Catalog

export const GAMES: Game[] = catalog.games

export const byId = new Map(GAMES.map((g) => [g.id, g]))

export function getGame(id: string | undefined): Game | undefined {
  return id ? byId.get(id) : undefined
}

export const CATEGORIES: { id: GameCategory | 'all'; label: string; icon: string }[] = [
  { id: 'all', label: 'Todos', icon: '✦' },
  { id: 'crash', label: 'Crash', icon: '✈️' },
  { id: 'mines', label: 'Mines', icon: '💣' },
  { id: 'slots', label: 'Slots', icon: '🎰' },
  { id: 'instant', label: 'Instantâneos', icon: '⚡' },
  { id: 'card', label: 'Mesa', icon: '🃏' },
  { id: 'arcade', label: 'Arcade', icon: '🕹️' },
  { id: 'deluxe', label: 'Deluxe', icon: '👑' },
]

export function categoryLabel(id: GameCategory): string {
  return CATEGORIES.find((c) => c.id === id)?.label ?? id
}

export function gamesByCategory(cat: GameCategory | 'all'): Game[] {
  if (cat === 'all') return GAMES
  return GAMES.filter((g) => g.category === cat)
}

export function searchGames(query: string, list: Game[] = GAMES): Game[] {
  const q = query.trim().toLowerCase()
  if (!q) return list
  return list.filter(
    (g) =>
      g.name.toLowerCase().includes(q) ||
      g.tagline.toLowerCase().includes(q) ||
      g.category.includes(q) ||
      g.engine.toLowerCase().includes(q),
  )
}

export const POPULAR_IDS = [
  'crash',
  'mines',
  'fortune-spin',
  'plinko',
  'blackjack',
  'european-roulette',
  'limbo',
  'wheel',
  'dice',
  'neon-runner',
]

export const FEATURED_IDS = ['crash', 'mines', 'fortune-spin', 'blackjack']

export function gameCountByEngine(engine: string): number {
  return GAMES.filter((g) => g.engine === engine).length
}
