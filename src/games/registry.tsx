import type { ComponentType } from 'react'
import type { Game } from '../lib/types'
import { CrashGame } from './CrashGame'
import { MinesGame } from './MinesGame'
import { SlotsGame } from './SlotsGame'
import { DiceGame } from './DiceGame'
import { PlinkoGame } from './PlinkoGame'
import { LimboGame } from './LimboGame'
import { WheelGame } from './WheelGame'
import { CoinFlipGame, LuckyNumberGame, ColorPredictionGame } from './InstantGames'
import { KenoGame } from './KenoGame'
import { HiLoGame } from './HiLoGame'
import { TowerGame } from './TowerGame'
import { BalloonGame } from './BalloonGame'
import { ScratchGame } from './ScratchGame'
import { BlackjackGame } from './BlackjackGame'
import { RouletteGame } from './RouletteGame'
import { BaccaratGame } from './BaccaratGame'
import { VideoPokerGame, CaribbeanPokerGame, ThreeCardPokerGame, TexasHoldemGame } from './PokerGames'
import { ArcadeGame } from './ArcadeGames'

type GameComponent = ComponentType<{ game: Game }>

const registry: Record<string, GameComponent> = {
  crash: CrashGame,
  mines: MinesGame,
  slots: SlotsGame,
  dice: DiceGame,
  plinko: PlinkoGame,
  limbo: LimboGame,
  wheel: WheelGame,
  coinFlip: CoinFlipGame,
  luckyNumber: LuckyNumberGame,
  colorPrediction: ColorPredictionGame,
  keno: KenoGame,
  hiLo: HiLoGame,
  tower: TowerGame,
  balloon: BalloonGame,
  scratch: ScratchGame,
  blackjack: BlackjackGame,
  roulette: RouletteGame,
  baccarat: BaccaratGame,
  videoPoker: VideoPokerGame,
  caribbeanPoker: CaribbeanPokerGame,
  threeCardPoker: ThreeCardPokerGame,
  texasHoldem: TexasHoldemGame,
  arcadeRunner: ArcadeGame,
  arcadeShooter: ArcadeGame,
  arcadeCatcher: ArcadeGame,
  arcadeQuest: ArcadeGame,
  arcadeRace: ArcadeGame,
}

export function gameComponent(engine: string): GameComponent | null {
  return registry[engine] ?? null
}
