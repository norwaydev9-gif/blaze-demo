import { useMemo, useState } from 'react'
import { CATEGORIES, GAMES, gamesByCategory, searchGames, categoryLabel } from '../lib/games'
import type { GameCategory } from '../lib/types'
import { navigate, useRoute } from '../lib/router'
import { useFavorites } from '../lib/favorites'
import { GameCard, EmptyState, SectionHead } from '../components/GameCard'
import { CategoryPills } from '../components/Layout'
import { Icon } from '../components/Icon'

type Sort = 'popular' | 'az' | 'min'

export function CatalogPage() {
  const route = useRoute()
  const raw = route.segments[1] ?? 'all'
  const cat = CATEGORIES.some((c) => c.id === raw) ? (raw as GameCategory | 'all') : 'all'
  const [q, setQ] = useState(() => route.query.get('q') ?? '')
  const [sort, setSort] = useState<Sort>('popular')

  const games = useMemo(() => {
    let list = cat === 'all' ? GAMES : gamesByCategory(cat)
    list = searchGames(q, list)
    if (sort === 'az') list = [...list].sort((a, b) => a.name.localeCompare(b.name))
    if (sort === 'min') list = [...list].sort((a, b) => a.minBet - b.minBet)
    return list
  }, [cat, q, sort])

  const counts = useMemo(() => {
    const map: Record<string, number> = { all: GAMES.length }
    CATEGORIES.forEach((c) => {
      if (c.id !== 'all') map[c.id] = GAMES.filter((g) => g.category === c.id).length
    })
    return map
  }, [])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-[11px] font-semibold text-white/30">
            <button type="button" onClick={() => navigate('/')} className="hover:text-white">Início</button>
            <Icon name="chevron" size={11} />
            <span className="text-white/60">Jogos</span>
            {cat !== 'all' && (
              <>
                <Icon name="chevron" size={11} />
                <span className="text-white/60">{categoryLabel(cat as GameCategory)}</span>
              </>
            )}
          </p>
          <h1 className="mt-2 font-display text-2xl font-extrabold tracking-tight sm:text-3xl">
            {cat === 'all' ? 'Todos os jogos' : categoryLabel(cat as GameCategory)}
          </h1>
          <p className="mt-1 text-sm text-white/40">
            {games.length} {games.length === 1 ? 'jogo disponível' : 'jogos disponíveis'} · créditos virtuais
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Icon name="search" size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Filtrar…"
              className="h-9 w-40 rounded-xl border border-line bg-white/[.03] pl-8 pr-3 text-xs text-white outline-none focus:border-brand/50 sm:w-56"
            />
          </div>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="h-9 rounded-xl border border-line bg-[#0b0e15] px-2 text-xs font-semibold text-white/60 outline-none focus:border-brand/50"
          >
            <option value="popular">Populares</option>
            <option value="az">A–Z</option>
            <option value="min">Aposta mínima</option>
          </select>
        </div>
      </div>

      <CategoryPills active={cat} onChange={(c) => navigate(c === 'all' ? '/jogos' : `/jogos/${c}`)} counts={counts} />

      {games.length === 0 ? (
        <EmptyState title="Sem jogos para mostrar" text="Tenta outra categoria ou limpa o filtro de pesquisa." icon="search" />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {games.map((g) => (
            <GameCard key={g.id} game={g} />
          ))}
        </div>
      )}

      <div className="panel flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <p className="text-[11px] text-white/30">
          Todos os jogos são de demonstração. Os resultados são gerados localmente no teu navegador.
        </p>
        <button type="button" onClick={() => navigate('/promocoes')} className="text-[11px] font-semibold text-gold">
          Ver promoções →
        </button>
      </div>
    </div>
  )
}

export function FavoritesPage() {
  const { ids, toggle } = useFavorites()
  const games = GAMES.filter((g) => ids.includes(g.id))
  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">Favoritos</h1>
        <p className="mt-1 text-sm text-white/40">{games.length} jogos guardados</p>
      </div>
      {games.length === 0 ? (
        <EmptyState title="Ainda sem favoritos" text="Toca no coração de qualquer jogo para o guardares aqui." icon="heart" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {games.map((g) => (
              <GameCard key={g.id} game={g} />
            ))}
          </div>
          <button type="button" onClick={() => games.forEach((g) => toggle(g.id))} className="text-[11px] font-semibold text-white/30 hover:text-white">
            Limpar favoritos
          </button>
        </>
      )}
      <SectionHead title="Sugestões" subtitle="Jogos que combinam contigo" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {GAMES.slice(0, 4).map((g) => (
          <GameCard key={g.id} game={g} compact />
        ))}
      </div>
    </div>
  )
}
