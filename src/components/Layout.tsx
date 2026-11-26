import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Icon, Logo } from './Icon'
import type { IconName } from './Icon'
import { navigate, useRoute } from '../lib/router'
import { useWallet } from '../lib/wallet'
import { useSound } from '../lib/sound'
import { useToast } from '../lib/toast'
import { GAMES, searchGames, CATEGORIES, categoryLabel } from '../lib/games'
import { fmt } from '../lib/format'

const MAIN_NAV: { to: string; label: string; icon: IconName; match?: (p: string) => boolean }[] = [
  { to: '/', label: 'Início', icon: 'home', match: (p) => p === '/' },
  { to: '/desporto', label: 'Sports', icon: 'trophy' },
  { to: '/live', label: 'Live Betting', icon: 'bolt' },
  { to: '/casino', label: 'Casino', icon: 'crown', match: (p) => p === '/casino' },
  { to: '/jogos', label: 'Todos os jogos', icon: 'grid', match: (p) => p.startsWith('/jogos') || p.startsWith('/jogo/') },
  { to: '/favoritos', label: 'Favoritos', icon: 'heart', match: (p) => p === '/favoritos' },
  { to: '/promocoes', label: 'Promoções', icon: 'gift' },
  { to: '/apostas', label: 'As minhas apostas', icon: 'clock', match: (p) => p === '/apostas' || p === '/historico' },
  { to: '/rankings', label: 'Rankings', icon: 'trophy', match: (p) => p === '/rankings' },
  { to: '/carteira', label: 'Carteira', icon: 'wallet' },
  { to: '/perfil', label: 'Perfil', icon: 'user' },
  { to: '/suporte', label: 'Suporte', icon: 'shield' },
]

const CAT_NAV: { cat: string; label: string; icon: IconName }[] = [
  { cat: 'crash', label: 'Crash', icon: 'crash' },
  { cat: 'mines', label: 'Mines', icon: 'mines' },
  { cat: 'slots', label: 'Slots', icon: 'slots' },
  { cat: 'instant', label: 'Instantâneos', icon: 'bolt' },
  { cat: 'card', label: 'Mesa', icon: 'cards' },
  { cat: 'arcade', label: 'Arcade', icon: 'arcade' },
  { cat: 'deluxe', label: 'Deluxe', icon: 'crown' },
]

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const route = useRoute()
  const { balance, bonus, bonusReady } = useWallet()
  const { push } = useToast()

  const go = (to: string) => {
    navigate(to)
    onNavigate?.()
  }

  return (
    <div className="flex h-full flex-col">
      <button type="button" className="flex h-[72px] items-center px-5 text-left" onClick={() => go('/')}>
        <Logo />
      </button>

      <nav className="no-scrollbar flex-1 overflow-y-auto px-3 pb-4">
        <p className="label px-3 pb-2 pt-2">Menu</p>
        <div className="space-y-0.5">
          {MAIN_NAV.map((item) => {
            const active = item.match ? item.match(route.path) : route.path === item.to
            return (
              <button
                key={item.to}
                type="button"
                onClick={() => go(item.to)}
                className={`group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-[13px] font-semibold transition ${
                  active
                    ? 'bg-gradient-to-r from-brand/20 to-brand/[.03] text-white shadow-[inset_2px_0_0_#ff2d3f]'
                    : 'text-white/55 hover:bg-white/[.04] hover:text-white'
                }`}
              >
                <Icon name={item.icon} size={18} className={active ? 'text-brand' : 'text-white/35 group-hover:text-white/70'} />
                {item.label}
                {item.to === '/promocoes' && (
                  <span className="ml-auto rounded bg-gold/20 px-1.5 py-0.5 text-[9px] font-bold text-gold">BÓNUS</span>
                )}
              </button>
            )
          })}
        </div>

        <p className="label px-3 pb-2 pt-6">Categorias</p>
        <div className="space-y-0.5">
          {CAT_NAV.map((item) => {
            const active = route.path === `/jogos/${item.cat}`
            return (
              <button
                key={item.cat}
                type="button"
                onClick={() => go(`/jogos/${item.cat}`)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2 text-[13px] font-medium transition ${
                  active ? 'bg-white/[.06] text-white' : 'text-white/45 hover:bg-white/[.04] hover:text-white'
                }`}
              >
                <Icon name={item.icon} size={16} className={active ? 'text-brand' : 'text-white/25'} />
                {item.label}
                <span className="ml-auto text-[10px] tabular text-white/25">
                  {GAMES.filter((g) => g.category === item.cat).length}
                </span>
              </button>
            )
          })}
        </div>
      </nav>

      <div className="border-t border-line/70 p-3">
        <div className="relative overflow-hidden rounded-2xl border border-gold/20 bg-gradient-to-br from-[#2a2109] to-[#120d03] p-3.5">
          <div className="absolute -right-4 -top-4 h-16 w-16 rounded-full bg-gold/15 blur-xl" />
          <div className="flex items-center gap-2">
            <span className="grid h-8 w-8 place-items-center rounded-lg bg-gold/15 text-gold">
              <Icon name="gift" size={16} />
            </span>
            <div>
              <p className="text-xs font-bold text-gold">Bónus de 4 horas</p>
              <p className="text-[10px] text-white/40">+500 B$ grátis</p>
            </div>
          </div>
          <button
            type="button"
            disabled={!bonusReady}
            onClick={() => {
              if (bonus()) {
                push('success', 'Bónus recebido!', '+500 B$ na tua carteira.')
              }
            }}
            className={`mt-3 w-full rounded-lg py-2 text-[11px] font-bold transition ${
              bonusReady ? 'bg-gold text-[#1a1203] hover:brightness-110' : 'bg-white/10 text-white/30'
            }`}
          >
            {bonusReady ? 'Receber bónus' : 'Já recebido'}
          </button>
        </div>
        <div className="mt-3 flex items-center justify-between rounded-xl border border-line/60 bg-black/25 px-3 py-2.5">
          <div>
            <p className="text-[9px] font-semibold uppercase tracking-wider text-white/30">Saldo demo</p>
            <p className="text-sm font-bold tabular text-white">{fmt(balance)} B$</p>
          </div>
          <button type="button" className="grid h-7 w-7 place-items-center rounded-lg bg-brand/15 text-brand" onClick={() => go('/carteira')}>
            <Icon name="plus" size={15} />
          </button>
        </div>
        <p className="mt-3 flex items-center justify-center gap-1.5 text-[9px] font-medium text-white/25">
          <Icon name="shield" size={11} /> Jogo responsável · +18
        </p>
      </div>
    </div>
  )
}

function SearchBox() {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const matches = useMemo(() => (q.trim() ? searchGames(q) : []), [q])
  const results = matches.slice(0, 6)

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  return (
    <div ref={ref} className="relative w-full max-w-[340px]">
      <Icon name="search" size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            navigate(`/jogos?q=${encodeURIComponent(q.trim())}`)
            setQ('')
            setOpen(false)
          }
        }}
        placeholder="Procurar jogos…"
        className="h-9 w-full rounded-xl border border-line bg-white/[.03] pl-9 pr-3 text-[13px] text-white outline-none transition placeholder:text-white/30 focus:border-brand/50 focus:bg-black/30"
      />
      {open && q && (
        <div className="absolute left-0 right-0 top-11 z-50 overflow-hidden rounded-xl border border-line bg-[#0c1017] p-1.5 shadow-2xl">
          {results.length === 0 && <p className="px-3 py-4 text-center text-xs text-white/35">Sem resultados para “{q}”.</p>}
          {results.map((g) => (
            <button
              key={g.id}
              type="button"
              className="flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-left transition hover:bg-white/[.06]"
              onClick={() => {
                navigate(`/jogo/${g.id}`)
                setQ('')
                setOpen(false)
              }}
            >
              <span
                className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-base"
                style={{ background: `linear-gradient(135deg,${g.theme.from},${g.theme.to})` }}
              >
                {g.theme.icon}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-semibold">{g.name}</span>
                <span className="block text-[10px] text-white/35">{categoryLabel(g.category)}</span>
              </span>
            </button>
          ))}
          {matches.length > 0 && (
            <button
              type="button"
              className="mt-1 w-full rounded-lg border-t border-line/60 px-3 py-2 text-[11px] font-semibold text-white/45 transition hover:bg-white/[.06] hover:text-white"
              onClick={() => {
                navigate(`/jogos?q=${encodeURIComponent(q.trim())}`)
                setQ('')
                setOpen(false)
              }}
            >
              Ver todos os resultados ({matches.length})
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function Topbar({ onMenu }: { onMenu: () => void }) {
  const { balance, bonus, bonusReady } = useWallet()
  const { enabled, toggle } = useSound()
  const { push } = useToast()

  return (
    <header className="sticky top-0 z-40 border-b border-line/60 bg-[#05060a]/80 backdrop-blur-xl">
      <div className="flex h-14 items-center gap-2.5 px-3 sm:h-16 sm:gap-3 sm:px-6">
        <button type="button" className="grid h-9 w-9 place-items-center rounded-lg border border-line text-white/70 lg:hidden" onClick={onMenu} aria-label="Abrir menu">
          <Icon name="menu" size={18} />
        </button>
        <div className="hidden flex-1 md:block">
          <SearchBox />
        </div>
        <div className="flex flex-1 items-center justify-end gap-2 md:flex-none">
          <button
            type="button"
            onClick={() => {
              if (bonus()) push('success', 'Bónus recebido!', '+500 B$ adicionados.')
              else push('info', 'Bónus indisponível', 'Já recebeste o bónus desta janela de 4 horas.')
            }}
            className="hidden items-center gap-1.5 rounded-xl border border-gold/25 bg-gold/10 px-3 py-2 text-xs font-bold text-gold transition hover:bg-gold/15 sm:flex"
          >
            <Icon name="gift" size={14} />
            {bonusReady ? 'Bónus +500' : 'Bónus'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/carteira')}
            className="flex items-center gap-2 rounded-xl border border-line bg-white/[.04] py-1.5 pl-3 pr-1.5 transition hover:border-white/20"
          >
            <span className="hidden text-[10px] font-semibold uppercase tracking-wider text-white/35 sm:block">Saldo</span>
            <span className="text-[13px] font-bold tabular text-white">{fmt(balance)}</span>
            <span className="rounded-lg bg-gradient-to-br from-brand to-[#b3061a] px-2 py-1 text-[10px] font-extrabold text-white">B$</span>
          </button>
          <button
            type="button"
            onClick={toggle}
            aria-label="Som"
            className="hidden h-9 w-9 place-items-center rounded-lg border border-line text-white/50 transition hover:text-white sm:grid"
          >
            <Icon name={enabled ? 'sound' : 'mute'} size={16} />
          </button>
          <button
            type="button"
            onClick={() =>
              bonusReady
                ? push('info', 'Bónus disponível', 'Tens +500 B$ prontos a receber nas promoções.')
                : push('info', 'Sem notificações novas', 'O próximo bónus fica disponível mais tarde.')
            }
            className="relative hidden h-11 w-11 place-items-center rounded-lg border border-line text-white/50 transition hover:text-white sm:grid"
            aria-label="Notificações"
          >
            <Icon name="bell" size={16} />
            {bonusReady && <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-brand" />}
          </button>
          <button
            type="button"
            onClick={() => navigate('/carteira')}
            className="grid h-11 w-11 place-items-center rounded-full bg-gradient-to-br from-[#2a3142] to-[#141925] text-xs font-bold text-white ring-1 ring-white/10"
            aria-label="Conta demo"
          >
            B
          </button>
        </div>
      </div>
    </header>
  )
}

function MobileNav() {
  const route = useRoute()
  const items: { to: string; label: string; icon: IconName; match: (p: string) => boolean }[] = [
    { to: '/', label: 'Início', icon: 'home', match: (p) => p === '/' },
    { to: '/jogos', label: 'Jogos', icon: 'grid', match: (p) => p.startsWith('/jogos') || p.startsWith('/jogo/') || p === '/casino' },
    { to: '/apostas', label: 'Apostas', icon: 'clock', match: (p) => p === '/apostas' },
    { to: '/carteira', label: 'Carteira', icon: 'wallet', match: (p) => p === '/carteira' },
    { to: '/perfil', label: 'Perfil', icon: 'user', match: (p) => p === '/perfil' },
  ]
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line/70 bg-[#070910]/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl lg:hidden">
      <div className="grid grid-cols-5">
        {items.map((it) => {
          const active = it.match(route.path)
          return (
            <button
              key={it.to}
              type="button"
              onClick={() => navigate(it.to)}
              className={`flex min-h-[48px] flex-col items-center justify-center gap-0.5 py-1.5 text-[10px] font-semibold transition ${active ? 'text-brand' : 'text-white/40'}`}
            >
              <Icon name={it.icon} size={19} />
              {it.label}
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export function Toasts() {
  const { toasts, dismiss } = useToast()
  return (
    <div className="pointer-events-none fixed bottom-[calc(var(--mobile-nav-h)+56px)] right-4 z-[60] flex w-[min(92vw,340px)] flex-col gap-2 lg:bottom-6">
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => dismiss(t.id)}
          className={`pointer-events-auto flex items-start gap-3 rounded-xl border p-3 text-left shadow-2xl backdrop-blur-xl animate-riseIn ${
            t.kind === 'success'
              ? 'border-good/30 bg-[#071a14]/95'
              : t.kind === 'error'
                ? 'border-brand/30 bg-[#1a070a]/95'
                : 'border-line bg-[#0c1017]/95'
          }`}
        >
          <span
            className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg ${
              t.kind === 'success' ? 'bg-good/15 text-good' : t.kind === 'error' ? 'bg-brand/15 text-brand' : 'bg-white/10 text-white/60'
            }`}
          >
            <Icon name={t.kind === 'success' ? 'check' : t.kind === 'error' ? 'close' : 'info'} size={14} />
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-bold text-white">{t.title}</span>
            {t.text && <span className="mt-0.5 block text-[11px] leading-snug text-white/50">{t.text}</span>}
          </span>
        </button>
      ))}
    </div>
  )
}

export function Layout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  return (
    <div className="min-h-screen lg:pl-[236px]">
      <aside className="fixed inset-y-0 left-0 z-50 hidden w-[236px] border-r border-line/70 bg-[#070910]/95 lg:block">
        <SidebarContent />
      </aside>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[270px] border-r border-line bg-[#070910] animate-riseIn">
            <button type="button" className="absolute right-2 top-3 z-10 grid h-11 w-11 place-items-center rounded-lg text-white/40" onClick={() => setOpen(false)}>
              <Icon name="close" size={18} />
            </button>
            <SidebarContent onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}

      <Topbar onMenu={() => setOpen(true)} />
      <main className="mx-auto w-full max-w-[1400px] px-3 pt-4 pb-[calc(var(--mobile-nav-h)+var(--dock-handle-h)+16px)] sm:px-6 sm:pt-5 lg:pb-10">{children}</main>
      <MobileNav />
      <Toasts />
    </div>
  )
}

export function CategoryPills({ active, onChange, counts }: { active: string; onChange: (c: string) => void; counts?: Record<string, number> }) {
  return (
    <div className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
      {CATEGORIES.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => onChange(c.id)}
          className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-semibold transition ${
            active === c.id
              ? 'border-brand/50 bg-brand/15 text-white shadow-[0_0_20px_rgba(255,45,63,.15)]'
              : 'border-line bg-white/[.02] text-white/50 hover:border-white/20 hover:text-white'
          }`}
        >
          <span className="mr-1.5">{c.icon}</span>
          {c.label}
          {counts && <span className="ml-1.5 text-[10px] text-white/30">{counts[c.id] ?? 0}</span>}
        </button>
      ))}
    </div>
  )
}
