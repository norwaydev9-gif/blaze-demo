import { gameComponent } from './registry'
import type { Game } from '../lib/types'

/**
 * Ponto único de entrada para os motores jogáveis.
 * O catálogo e o registo partilham os mesmos identificadores de engine.
 */
export function GameEngine({ game }: { game: Game }) {
  const Component = gameComponent(game.engine)

  if (!Component) {
    return (
      <div className="panel p-6 text-center">
        <p className="font-display text-xl font-bold">Motor indisponível</p>
        <p className="mt-2 text-sm text-white/40">
          O motor “{game.engine}” ainda não foi ligado ao catálogo.
        </p>
      </div>
    )
  }

  return <Component game={game} />
}
