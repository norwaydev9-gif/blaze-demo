import { useEffect, useMemo } from 'react'
import { categoryLabel, gameImage, getGame, GAMES } from '../lib/games'
import { navigate, useRoute } from '../lib/router'
import { useFavorites, useRecent } from '../lib/favorites'
import { useWallet } from '../lib/wallet'
import { fmt, timeAgo } from '../lib/format'
import { GameEngine } from '../games/engines'
import { GameCard } from '../components/GameCard'
import { Icon } from '../components/Icon'

export function GamePage() {
  const route = useRoute()
  const id = route.segments[1]
  const game = getGame(id)
  const { isFav, toggle } = useFavorites()
  const { visit } = useRecent()
  const { balance, tx } = useWallet()

  useEffect(() => {
    if (!game) return
    visit(game.id)
    document.documentElement.style.setProperty('--game-bg', `url("${gameImage(game)}")`)
    return () => {
      document.documentElement.style.removeProperty('--game-bg')
    }
  }, [game, visit])

  const stats = useMemo(() => {
    if (!game) return { bets: 0, wins: 0, net: 0 }
    const list = tx.filter((t) => t.gameId === game.id)
    const bets = list.filter((t) => t.type === 'bet').reduce((s, t) => s + Math.abs(t.amount), 0)
    const wins = list.filter((t) => t.type === 'win').reduce((s, t) => s + t.amount, 0)
    return { bets, wins, net: wins - bets }
  }, [tx, game])

  if (!game) {
    return (
      <div className="panel grid place-items-center px-6 py-20 text-center">
        <span className="text-5xl">🎲</span>
        <h1 className="mt-4 font-display text-2xl font-bold">Jogo não encontrado</h1>
        <p className="mt-1 text-sm text-white/40">O jogo que procuras não existe ou foi removido.</p>
        <button type="button" className="btn-primary mt-5" onClick={() => navigate('/jogos')}>
          Ver todos os jogos
        </button>
      </div>
    )
  }

  const related = GAMES.filter((g) => g.category === game.category && g.id !== game.id).slice(0, 4)
  const fav = isFav(game.id)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <button type="button" onClick={() => navigate('/jogos')} className="grid h-11 w-11 shrink-0 place-items-center rounded-lg border border-line text-white/50 transition hover:text-white" aria-label="Voltar">
            <Icon name="back" size={17} />
          </button>
          <div
            className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border border-white/10 bg-cover bg-center text-xl shadow-lg"
            style={{ backgroundImage: `linear-gradient(135deg,${game.theme.from}cc,${game.theme.to}cc), url(${gameImage(game)})` }}
          >
            {game.theme.icon}
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate font-display text-lg font-extrabold tracking-tight sm:text-xl">{game.name}</h1>
              <span className="hidden rounded border border-line bg-white/[.03] px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/35 sm:inline">
                {categoryLabel(game.category)}
              </span>
              {game.category === 'deluxe' && <span className="rounded bg-gold/15 px-1.5 py-0.5 text-[9px] font-bold text-gold">DELUXE</span>}
            </div>
            <p className="hidden truncate text-[11px] text-white/35 sm:block">{game.tagline}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => toggle(game.id)}
            className={`flex min-h-[44px] items-center gap-1.5 rounded-xl border px-3 py-2 text-[11px] font-semibold transition ${
              fav ? 'border-brand/40 bg-brand/10 text-brand' : 'border-line text-white/40 hover:text-white'
            }`}
          >
            <Icon name="heart" size={14} /> {fav ? 'Favorito' : 'Favoritar'}
          </button>
          <button type="button" onClick={() => navigate('/carteira')} className="flex min-h-[44px] items-center gap-2 rounded-xl border border-line bg-white/[.04] px-3 py-2">
            <span className="text-[9px] font-semibold uppercase tracking-wider text-white/30">Saldo</span>
            <span className="text-xs font-bold tabular">{fmt(balance)} B$</span>
          </button>
        </div>
      </div>

      <GameEngine game={game} />

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="panel p-4 sm:p-5">
          <h2 className="flex items-center gap-2 font-display text-sm font-bold">
            <Icon name="info" size={15} className="text-white/30" /> Sobre {game.name}
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-white/45">{game.rules}</p>
          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-black/20 p-2.5">
              <p className="text-[9px] uppercase tracking-wider text-white/30">Aposta mín.</p>
              <p className="text-xs font-bold tabular">{fmt(game.minBet)} B$</p>
            </div>
            <div className="rounded-lg bg-black/20 p-2.5">
              <p className="text-[9px] uppercase tracking-wider text-white/30">Aposta máx.</p>
              <p className="text-xs font-bold tabular">{fmt(game.maxBet)} B$</p>
            </div>
            <div className="rounded-lg bg-black/20 p-2.5">
              <p className="text-[9px] uppercase tracking-wider text-white/30">Motor</p>
              <p className="truncate text-xs font-bold capitalize">{game.engine}</p>
            </div>
          </div>
          <p className="mt-3 flex items-start gap-1.5 text-[10px] leading-relaxed text-white/25">
            <Icon name="shield" size={12} className="mt-0.5 shrink-0" />
            Demonstração recreativa: resultados gerados localmente, sem dinheiro real. Joga com responsabilidade.
          </p>
        </div>

        <div className="panel p-4 sm:p-5">
          <h2 className="flex items-center gap-2 font-display text-sm font-bold">
            <Icon name="wallet" size={15} className="text-white/30" /> O teu desempenho
          </h2>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-lg bg-black/20 p-2.5">
              <p className="text-[9px] uppercase tracking-wider text-white/30">Apostado</p>
              <p className="text-xs font-bold tabular">{fmt(stats.bets)} B$</p>
            </div>
            <div className="rounded-lg bg-black/20 p-2.5">
              <p className="text-[9px] uppercase tracking-wider text-white/30">Ganho</p>
              <p className="text-xs font-bold tabular text-good">{fmt(stats.wins)} B$</p>
            </div>
            <div className="rounded-lg bg-black/20 p-2.5">
              <p className="text-[9px] uppercase tracking-wider text-white/30">Resultado</p>
              <p className={`text-xs font-bold tabular ${stats.net >= 0 ? 'text-good' : 'text-brand'}`}>
                {stats.net >= 0 ? '+' : '−'}
                {fmt(Math.abs(stats.net))} B$
              </p>
            </div>
          </div>
          <div className="mt-3 space-y-1">
            {tx.filter((t) => t.gameId === game.id).slice(0, 4).map((t) => (
              <div key={t.id} className="flex items-center justify-between rounded-lg bg-white/[.02] px-2.5 py-1.5">
                <span className="text-[10px] text-white/35">{t.type === 'bet' ? 'Aposta' : 'Prémio'} · {timeAgo(t.ts)}</span>
                <span className={`text-[10px] font-bold tabular ${t.amount > 0 ? 'text-good' : 'text-white/50'}`}>
                  {t.amount > 0 ? '+' : t.amount < 0 ? '−' : ''}{fmt(Math.abs(t.amount))} B$
                </span>
              </div>
            ))}
            {tx.filter((t) => t.gameId === game.id).length === 0 && (
              <p className="py-2 text-[10px] text-white/25">Ainda não jogaste este jogo nesta sessão.</p>
            )}
          </div>
        </div>
      </div>

      {related.length > 0 && (
        <section>
          <div className="mb-3 flex items-end justify-between">
            <div>
              <h2 className="font-display text-lg font-bold">Jogos semelhantes</h2>
              <p className="text-xs text-white/35">Mais {categoryLabel(game.category)}</p>
            </div>
            <button type="button" onClick={() => navigate(`/jogos/${game.category}`)} className="text-[11px] font-semibold text-white/40 hover:text-white">
              Ver categoria →
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {related.map((g) => (
              <GameCard key={g.id} game={g} compact />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
