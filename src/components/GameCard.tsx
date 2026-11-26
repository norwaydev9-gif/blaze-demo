import { useMemo, useState } from 'react'
import type { Game } from '../lib/types'
import { navigate } from '../lib/router'
import { useFavorites } from '../lib/favorites'
import { Icon } from './Icon'
import type { IconName } from './Icon'
import { categoryLabel, gameImage } from '../lib/games'

export function GameCard({ game, compact = false }: { game: Game; compact?: boolean }) {
  const { isFav, toggle } = useFavorites()
  const fav = isFav(game.id)
  const [hover, setHover] = useState(false)

  return (
    <div
      className="group relative cursor-pointer overflow-hidden rounded-2xl border border-line/70 bg-panel transition-all duration-200 hover:-translate-y-1 hover:border-white/20 hover:shadow-[0_18px_40px_rgba(0,0,0,.45)]"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={() => navigate(`/jogo/${game.id}`)}
      role="link"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') navigate(`/jogo/${game.id}`)
      }}
    >
      <div
        className={`relative overflow-hidden ${compact ? 'aspect-[16/10]' : 'aspect-[4/3]'}`}
        style={{
          backgroundColor: '#080a10',
          backgroundImage: `linear-gradient(160deg, ${game.theme.from}99, rgba(5,6,10,.35) 45%, rgba(5,6,10,.94) 100%), url(${gameImage(game)})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-grid opacity-40" />
        <div
          className="absolute -bottom-10 left-1/2 h-40 w-40 -translate-x-1/2 rounded-full blur-2xl transition-opacity duration-300"
          style={{ background: game.theme.to, opacity: hover ? 0.35 : 0.18 }}
        />
        <div
          className={`absolute inset-0 grid place-items-center transition-transform duration-300 ${hover ? 'scale-110 -rotate-3' : ''}`}
        >
          <span
            className={`drop-shadow-[0_12px_24px_rgba(0,0,0,.55)] ${compact ? 'text-4xl' : 'text-5xl'}`}
            style={{ filter: 'saturate(1.1)' }}
          >
            {game.theme.icon}
          </span>
        </div>
        <div className="absolute left-2.5 top-2.5 flex items-center gap-1.5">
          <span className="rounded-md bg-black/45 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white/75 backdrop-blur">
            {categoryLabel(game.category)}
          </span>
          {game.category === 'deluxe' && (
            <span className="rounded-md bg-gold/20 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gold">
              Deluxe
            </span>
          )}
        </div>
        <button
          type="button"
          aria-label={fav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          onClick={(e) => {
            e.stopPropagation()
            toggle(game.id)
          }}
          className={`absolute right-2.5 top-2.5 grid h-11 w-11 place-items-center rounded-lg border backdrop-blur transition ${
            fav
              ? 'border-brand/50 bg-brand/20 text-brand'
              : 'border-white/10 bg-black/30 text-white/50 hover:text-white'
          }`}
        >
          <Icon name="heart" size={15} />
        </button>
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-2 bg-gradient-to-t from-black/85 via-black/30 to-transparent p-3 pt-10">
          <div className="min-w-0">
            <h3 className="truncate font-display text-[15px] font-bold leading-tight text-white">{game.name}</h3>
            {!compact && <p className="mt-0.5 truncate text-[11px] text-white/45">{game.tagline}</p>}
          </div>
          <span className="shrink-0 rounded-lg bg-white/10 px-2 py-1 text-[10px] font-bold text-white/80">
            {game.minBet}–{game.maxBet >= 1000 ? `${game.maxBet / 1000}k` : game.maxBet}
          </span>
        </div>
        <div
          className={`pointer-events-none absolute inset-0 grid place-items-center bg-black/35 transition-opacity duration-200 ${hover ? 'opacity-100' : 'opacity-0'}`}
        >
          <span className="rounded-full bg-white px-4 py-2 text-xs font-bold text-black shadow-xl">▶ Jogar agora</span>
        </div>
      </div>
    </div>
  )
}

export function GameRow({ games }: { games: Game[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {games.map((g) => (
        <GameCard key={g.id} game={g} />
      ))}
    </div>
  )
}

export function SectionHead({
  title,
  subtitle,
  action,
  onAction,
}: {
  title: string
  subtitle?: string
  action?: string
  onAction?: () => void
}) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        <h2 className="font-display text-xl font-bold tracking-tight text-white sm:text-2xl">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-white/40">{subtitle}</p>}
      </div>
      {action && (
        <button
          type="button"
          onClick={onAction}
          className="flex shrink-0 items-center gap-1 text-xs font-semibold text-white/50 transition hover:text-white"
        >
          {action}
          <Icon name="chevron" size={14} />
        </button>
      )}
    </div>
  )
}

export function EmptyState({ title, text, icon = 'grid' }: { title: string; text?: string; icon?: IconName }) {
  return (
    <div className="panel grid place-items-center px-6 py-16 text-center">
      <div className="grid h-14 w-14 place-items-center rounded-2xl border border-line bg-white/[.03] text-white/30">
        <Icon name={icon} size={24} />
      </div>
      <h3 className="mt-4 font-display text-lg font-bold">{title}</h3>
      {text && <p className="mt-1 max-w-sm text-sm text-white/40">{text}</p>}
      <button type="button" className="btn-primary mt-5" onClick={() => navigate('/jogos')}>
        Explorar jogos
      </button>
    </div>
  )
}

export function useFiltered(games: Game[], cat: string, q: string): Game[] {
  return useMemo(() => {
    const query = q.trim().toLowerCase()
    return games.filter((g) => {
      const catOk = cat === 'all' || g.category === cat
      const qOk =
        !query ||
        g.name.toLowerCase().includes(query) ||
        g.tagline.toLowerCase().includes(query) ||
        g.engine.toLowerCase().includes(query)
      return catOk && qOk
    })
  }, [games, cat, q])
}
