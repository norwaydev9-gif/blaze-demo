import { useCallback, useEffect, useMemo, useRef, useState, type FocusEvent } from 'react'
import { categoryLabel, getGame, GAMES } from '../lib/games'
import { navigate, useRoute } from '../lib/router'
import { useFavorites, useRecent } from '../lib/favorites'
import { useWallet } from '../lib/wallet'
import { fmt, timeAgo } from '../lib/format'
import { GameEngine } from '../games/engines'
import { GameCard } from '../components/GameCard'
import { Icon } from '../components/Icon'
import { GameArt } from '../components/GameArt'

export function GamePage() {
  const route = useRoute()
  const id = route.segments[1]
  const game = getGame(id)
  const { isFav, toggle } = useFavorites()
  const { visit } = useRecent()
  const { balance, tx } = useWallet()
  const [chrome, setChrome] = useState(false)
  const [chromeFocus, setChromeFocus] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const chromeTimer = useRef<number | null>(null)
  const chromeFocusRef = useRef(false)

  const revealChrome = useCallback(() => {
    setChrome(true)
    if (chromeTimer.current !== null) window.clearTimeout(chromeTimer.current)
    // Enquanto o teclado estiver na barra, ela não pode desaparecer.
    if (chromeFocusRef.current) {
      chromeTimer.current = null
      return
    }
    chromeTimer.current = window.setTimeout(() => setChrome(false), 2200)
  }, [])

  const onChromeFocus = (e: FocusEvent<HTMLDivElement>) => {
    let keyboardFocus = false
    if (e.target instanceof HTMLElement) {
      try {
        keyboardFocus = e.target.matches(':focus-visible')
      } catch {
        keyboardFocus = true
      }
    }
    chromeFocusRef.current = keyboardFocus
    setChromeFocus(keyboardFocus)
    revealChrome()
  }

  const onChromeBlur = (e: FocusEvent<HTMLDivElement>) => {
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return
    chromeFocusRef.current = false
    setChromeFocus(false)
    revealChrome()
  }

  useEffect(() => {
    if (!game) return
    visit(game.id)
  }, [game, visit])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (showInfo) setShowInfo(false)
      else navigate('/jogos')
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('pointermove', revealChrome)
    window.addEventListener('touchstart', revealChrome, { passive: true })
    return () => {
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('pointermove', revealChrome)
      window.removeEventListener('touchstart', revealChrome)
      if (chromeTimer.current !== null) window.clearTimeout(chromeTimer.current)
    }
  }, [revealChrome, showInfo])

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
  const recent = tx.filter((t) => t.gameId === game.id).slice(0, 4)
  const chromeVisible = chrome || showInfo || chromeFocus

  return (
    <div
      className="game-immersive-page relative isolate flex min-h-[100dvh] w-full max-w-full touch-pan-y flex-col overflow-hidden"
      onPointerMove={revealChrome}
      onTouchStart={revealChrome}
    >
      <div
        className={`game-immersive-chrome ${chromeVisible ? 'is-visible' : ''}`}
        onFocus={onChromeFocus}
        onBlur={onChromeBlur}
      >
        <button
          type="button"
          onClick={() => navigate('/jogos')}
          className="game-chrome-exit grid h-10 w-10 place-items-center"
          aria-label="Voltar aos jogos"
          title="Voltar aos jogos (Esc)"
        >
          <Icon name="back" size={17} />
        </button>
        <div className="flex min-w-0 items-center gap-2">
          <div
            className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-lg border border-white/10 sm:h-9 sm:w-9"
            style={{ background: `linear-gradient(135deg,${game.theme.from},${game.theme.to})` }}
          >
            <GameArt game={game} className="h-full w-full" />
          </div>
          <div className="min-w-0">
            <p className="truncate font-display text-sm font-extrabold leading-tight text-white">{game.name}</p>
            <p className="truncate text-[11px] leading-tight text-white/45">{categoryLabel(game.category)} · demo recreativa</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => toggle(game.id)}
            className={`grid h-10 w-10 place-items-center rounded-full border ${
              fav ? 'border-brand/40 bg-brand/15 text-brand' : 'border-white/10 bg-white/[.05] text-white/50'
            }`}
            aria-label={fav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
          >
            <Icon name="heart" size={16} />
          </button>
          <button
            type="button"
            onClick={() => navigate('/carteira')}
            className="flex h-10 items-center gap-1 rounded-full border border-white/10 bg-white/[.05] px-2 text-[11px] font-bold tabular text-white/80 sm:gap-1.5 sm:px-3"
            aria-label="Ver carteira"
          >
            <span className="text-[10px] font-semibold uppercase text-white/35">B$</span>
            {fmt(balance)}
          </button>
          <button
            type="button"
            onClick={() => setShowInfo((v) => !v)}
            className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-white/[.05] text-white/50"
            aria-label="Informações do jogo"
          >
            <Icon name="info" size={16} />
          </button>
        </div>
      </div>

      <div
        className="game-immersive-engine h-[100dvh] min-w-0 shrink-0 touch-pan-y overflow-y-auto overscroll-contain pb-[calc(48px+env(safe-area-inset-bottom))] lg:overflow-visible lg:pb-0 [&_.game-layout]:!min-h-0 [&_.game-layout]:h-full [&_.game-stage]:!min-h-0 [&_.game-stage]:!overflow-y-auto [&_.game-stage]:overscroll-contain"
      >
        <GameEngine key={game.id} game={game} />
      </div>

      {showInfo && (
        <div className="game-immersive-info" onClick={() => setShowInfo(false)}>
          <div className="mx-auto w-full max-w-3xl space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold">{game.name} · detalhes</h2>
              <button
                type="button"
                onClick={() => setShowInfo(false)}
                className="grid h-11 w-11 place-items-center rounded-full border border-line bg-white/[.05] text-white/50"
                aria-label="Fechar informações"
              >
                <Icon name="close" size={17} />
              </button>
            </div>

            <div className="panel p-4 sm:p-5">
              <h3 className="flex items-center gap-2 font-display text-sm font-bold">
                <Icon name="info" size={15} className="text-white/30" /> Sobre {game.name}
              </h3>
              <p className="mt-2 text-xs leading-relaxed text-white/45">{game.rules}</p>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-black/20 p-2.5">
                  <p className="text-[10px] uppercase tracking-wider text-white/40">Aposta mín.</p>
                  <p className="text-xs font-bold tabular">{fmt(game.minBet)} B$</p>
                </div>
                <div className="rounded-lg bg-black/20 p-2.5">
                  <p className="text-[10px] uppercase tracking-wider text-white/40">Aposta máx.</p>
                  <p className="text-xs font-bold tabular">{fmt(game.maxBet)} B$</p>
                </div>
                <div className="rounded-lg bg-black/20 p-2.5">
                  <p className="text-[10px] uppercase tracking-wider text-white/40">Motor</p>
                  <p className="truncate text-xs font-bold capitalize">{game.engine}</p>
                </div>
              </div>
              <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-white/35">
                <Icon name="shield" size={12} className="mt-0.5 shrink-0" />
                Demonstração recreativa: resultados gerados localmente, sem dinheiro real. Joga com responsabilidade.
              </p>
            </div>

            <div className="panel p-4 sm:p-5">
              <h3 className="flex items-center gap-2 font-display text-sm font-bold">
                <Icon name="wallet" size={15} className="text-white/30" /> O teu desempenho
              </h3>
              <div className="mt-3 grid grid-cols-3 gap-2">
                <div className="rounded-lg bg-black/20 p-2.5">
                  <p className="text-[10px] uppercase tracking-wider text-white/40">Apostado</p>
                  <p className="text-xs font-bold tabular">{fmt(stats.bets)} B$</p>
                </div>
                <div className="rounded-lg bg-black/20 p-2.5">
                  <p className="text-[10px] uppercase tracking-wider text-white/40">Ganho</p>
                  <p className="text-xs font-bold tabular text-good">{fmt(stats.wins)} B$</p>
                </div>
                <div className="rounded-lg bg-black/20 p-2.5">
                  <p className="text-[10px] uppercase tracking-wider text-white/40">Resultado</p>
                  <p className={`text-xs font-bold tabular ${stats.net >= 0 ? 'text-good' : 'text-brand'}`}>
                    {stats.net >= 0 ? '+' : '−'}
                    {fmt(Math.abs(stats.net))} B$
                  </p>
                </div>
              </div>
              <div className="mt-3 space-y-1">
                {recent.map((t) => (
                  <div key={t.id} className="flex items-center justify-between rounded-lg bg-white/[.02] px-2.5 py-1.5">
                    <span className="text-[11px] text-white/45">{t.type === 'bet' ? 'Aposta' : 'Prémio'} · {timeAgo(t.ts)}</span>
                    <span className={`text-[11px] font-bold tabular ${t.amount > 0 ? 'text-good' : 'text-white/50'}`}>
                      {t.amount > 0 ? '+' : t.amount < 0 ? '−' : ''}{fmt(Math.abs(t.amount))} B$
                    </span>
                  </div>
                ))}
                {recent.length === 0 && (
                  <p className="py-2 text-[11px] text-white/35">Ainda não jogaste este jogo nesta sessão.</p>
                )}
              </div>
            </div>

            {related.length > 0 && (
              <section>
                <div className="mb-3 flex items-end justify-between">
                  <div>
                    <h2 className="font-display text-lg font-bold">Jogos semelhantes</h2>
                    <p className="text-xs text-white/35">Mais {categoryLabel(game.category)}</p>
                  </div>
                  <button type="button" onClick={() => navigate(`/jogos/${game.category}`)} className="shrink-0 text-xs font-semibold text-white/50 hover:text-white">
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
        </div>
      )}
    </div>
  )
}
