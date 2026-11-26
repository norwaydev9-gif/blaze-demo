export type GameCategory =
  | 'crash'
  | 'mines'
  | 'slots'
  | 'instant'
  | 'card'
  | 'arcade'
  | 'deluxe'

export interface GameTheme {
  from: string
  to: string
  icon: string
}

export interface GameConfig {
  [key: string]: unknown
}

export interface Game {
  id: string
  name: string
  category: GameCategory
  engine: string
  tagline: string
  rules: string
  minBet: number
  maxBet: number
  theme: GameTheme
  config: GameConfig
  status: string
}

export interface Catalog {
  version: number
  count: number
  games: Game[]
}

export interface Tx {
  id: string
  ts: number
  game: string
  gameId?: string
  type: 'bet' | 'win' | 'bonus' | 'reset'
  amount: number
  balanceAfter: number
  detail?: string
}
