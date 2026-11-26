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

const img = (name: string) => `${import.meta.env.BASE_URL}images/${name}`

export const HERO_IMAGE = img('hero.jpg')

const IMAGE_BY_ENGINE: Record<string, string> = {
  crash: img('crash.jpg'),
  limbo: img('limbo.jpg'),
  mines: img('mines.png'),
  slots: img('slots.jpg'),
  roulette: img('roulette.jpg'),
  blackjack: img('cards.jpg'),
  baccarat: img('cards.jpg'),
  videoPoker: img('cards.jpg'),
  texasHoldem: img('cards.jpg'),
  threeCardPoker: img('cards.jpg'),
  caribbeanPoker: img('cards.jpg'),
  hiLo: img('cards.jpg'),
  coinFlip: img('cards.jpg'),
  plinko: img('plinko.jpg'),
  dice: img('dice.jpg'),
  wheel: img('wheel.jpg'),
  colorPrediction: img('wheel.jpg'),
  keno: img('keno.jpg'),
  luckyNumber: img('keno.jpg'),
  balloon: img('balloon.jpg'),
  scratch: img('scratch.jpg'),
  tower: img('tower.jpg'),
  arcadeRunner: img('arcade.jpg'),
  arcadeShooter: img('arcade.jpg'),
  arcadeRace: img('arcade.jpg'),
  arcadeCatcher: img('arcade.jpg'),
  arcadeQuest: img('arcade.jpg'),
}

const IMAGE_BY_CATEGORY: Record<GameCategory, string> = {
  crash: img('crash.jpg'),
  mines: img('mines.png'),
  slots: img('slots.jpg'),
  instant: img('hero.jpg'),
  card: img('cards.jpg'),
  arcade: img('arcade.jpg'),
  deluxe: img('cards.jpg'),
}

/** Capa original/licenciada usada em cartões, capas e palco de cada jogo. */
export function gameImage(game: Game): string {
  return IMAGE_BY_ENGINE[game.engine] ?? IMAGE_BY_CATEGORY[game.category] ?? HERO_IMAGE
}
