import { Component, useEffect } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { Layout } from './components/Layout'
import { useRoute } from './lib/router'
import { getGame } from './lib/games'
import { HomePage } from './pages/Home'
import { CatalogPage, FavoritesPage } from './pages/Catalog'
import { GamePage } from './pages/GamePage'
import { WalletPage } from './pages/Wallet'
import { PromotionsPage } from './pages/Promotions'
import { HistoryPage } from './pages/History'
import { RankingsPage } from './pages/Rankings'
import { LegalPage, ProfilePage, ProviderNoticePage, SupportPage } from './pages/Account'

class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null }

  static getDerivedStateFromError(error: Error) {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('BLAZE error boundary:', error, info)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="panel grid place-items-center px-6 py-20 text-center">
          <span className="text-5xl">🛠️</span>
          <h1 className="mt-4 font-display text-2xl font-bold">Algo correu mal</h1>
          <p className="mt-1 max-w-md text-sm text-white/40">
            O jogo encontrou um erro inesperado. Podes voltar ao lobby e tentar novamente.
          </p>
          <div className="mt-5 flex gap-2">
            <a href="#/" className="btn-primary" onClick={() => this.setState({ error: null })}>Voltar ao início</a>
            <button type="button" className="btn-ghost" onClick={() => window.location.reload()}>Recarregar</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function NotFound() {
  return (
    <div className="panel grid place-items-center px-6 py-20 text-center">
      <span className="font-display text-5xl font-extrabold text-white/10">404</span>
      <h1 className="mt-3 font-display text-2xl font-bold">Página não encontrada</h1>
      <p className="mt-1 text-sm text-white/40">O caminho que procuras não existe.</p>
      <a href="#/" className="btn-primary mt-5">Voltar ao início</a>
    </div>
  )
}

const TITLES: Record<string, string> = {
  jogos: 'Jogos',
  casino: 'Casino',
  favoritos: 'Favoritos',
  carteira: 'Carteira',
  promocoes: 'Promoções',
  historico: 'Histórico',
  apostas: 'As minhas apostas',
  rankings: 'Rankings',
  perfil: 'Perfil',
  suporte: 'Suporte',
  desporto: 'Sports',
  live: 'Live Betting',
  termos: 'Termos',
  privacidade: 'Privacidade',
}

function Router() {
  const route = useRoute()
  const root = route.segments[0] ?? ''

  useEffect(() => {
    const game = root === 'jogo' ? getGame(route.segments[1]) : undefined
    const label = game?.name ?? TITLES[root]
    document.title = label ? `${label} — BLAZE` : 'BLAZE — Casino demo'
  }, [root, route.path, route.segments])

  let page = <HomePage />
  if (root === '') page = <HomePage />
  else if (root === 'jogos') page = <CatalogPage />
  else if (root === 'casino') page = <CatalogPage />
  else if (root === 'jogo') page = <GamePage />
  else if (root === 'favoritos') page = <FavoritesPage />
  else if (root === 'carteira') page = <WalletPage />
  else if (root === 'promocoes') page = <PromotionsPage />
  else if (root === 'historico' || root === 'apostas') page = <HistoryPage />
  else if (root === 'rankings') page = <RankingsPage />
  else if (root === 'perfil') page = <ProfilePage />
  else if (root === 'suporte') page = <SupportPage />
  else if (root === 'desporto') page = <ProviderNoticePage kind="sports" />
  else if (root === 'live') page = <ProviderNoticePage kind="live" />
  else if (root === 'termos' || root === 'privacidade') page = <LegalPage kind={root} />
  else page = <NotFound />

  return <ErrorBoundary key={`${route.path}?${route.query.toString()}`}>{page}</ErrorBoundary>
}

export function App() {
  return (
    <Layout>
      <Router />
    </Layout>
  )
}
