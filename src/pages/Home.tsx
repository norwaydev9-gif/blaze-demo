import { useMemo } from 'react'
import { GAMES, FEATURED_IDS, POPULAR_IDS, getGame } from '../lib/games'
import { navigate } from '../lib/router'
import { useWallet } from '../lib/wallet'
import { useRecent } from '../lib/favorites'
import { fmt } from '../lib/format'
import { GameCard, SectionHead } from '../components/GameCard'
import { Icon } from '../components/Icon'
import { GameArt } from '../components/GameArt'
import { useToast } from '../lib/toast'

const LIVE_WINS = [
  { name: 'Tiago_M', game: 'Crash', mult: '12.4×', amount: 2480 },
  { name: 'Rita99', game: 'Mines', mult: '8.1×', amount: 810 },
  { name: 'JoaoPT', game: 'Fortune Spin', mult: '25×', amount: 1250 },
  { name: 'Sofia_L', game: 'Plinko', mult: '18×', amount: 3600 },
  { name: 'MiguelX', game: 'Blackjack', mult: '2×', amount: 400 },
  { name: 'Ines.C', game: 'Wheel', mult: '10×', amount: 1000 },
]

export function HomePage() {
  const { balance, bonus, bonusReady } = useWallet()
  const { ids: recentIds } = useRecent()
  const { push } = useToast()

  const featured = useMemo(() => FEATURED_IDS.map(getGame).filter(Boolean) as typeof GAMES, [])
  const popular = useMemo(() => POPULAR_IDS.map(getGame).filter(Boolean) as typeof GAMES, [])
  const recent = useMemo(() => recentIds.map(getGame).filter(Boolean) as typeof GAMES, [recentIds])

  return (
    <div className="space-y-8">
      {/* hero */}
      <section className="tone-crash cat-surface cat-card-shell relative overflow-hidden rounded-3xl border">
        <div className="absolute inset-0 bg-[radial-gradient(900px_420px_at_20%_-20%,rgba(255,45,63,.18),transparent_60%),radial-gradient(700px_420px_at_95%_10%,rgba(120,60,255,.12),transparent_60%)]" />
        <div className="absolute inset-0 bg-grid opacity-25" />
        <div className="relative grid gap-6 p-5 sm:p-10 lg:grid-cols-[1.1fr_.9fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-brand/25 bg-brand/10 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.18em] text-brand">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand" />
              Plataforma demo · créditos virtuais
            </span>
            <h1 className="mt-5 font-display text-[clamp(38px,6vw,62px)] font-extrabold leading-[.95] tracking-tight">
              A tua sorte
              <br />
              <span className="text-gradient">começa aqui.</span>
            </h1>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-white/70 sm:text-base">
              Crash, Mines, Slots, Roleta, Blackjack e muito mais. {GAMES.length} jogos num só lugar, com
              créditos virtuais e sem dinheiro real.
            </p>
            <div className="mt-6 flex flex-wrap gap-2.5">
              <button type="button" className="btn-primary px-5 py-3 text-sm" onClick={() => navigate('/jogo/crash')}>
                <Icon name="crash" size={17} /> Jogar Crash
              </button>
              <button type="button" className="btn-ghost px-5 py-3 text-sm" onClick={() => navigate('/jogos')}>
                Explorar jogos <Icon name="chevron" size={15} />
              </button>
              <button
                type="button"
                className="btn-gold px-5 py-3 text-sm"
                onClick={() => {
                  if (bonus()) push('success', 'Bónus recebido!', '+500 B$ na tua carteira.')
                  else push('info', 'Bónus indisponível', 'Já recebeste o bónus desta janela.')
                }}
              >
                <Icon name="gift" size={16} /> {bonusReady ? 'Receber 500 B$' : 'Bónus'}
              </button>
            </div>
            <div className="mt-7 flex flex-wrap gap-6">
              <div>
                <p className="font-display text-xl font-bold">{GAMES.length}</p>
                <p className="text-[10px] uppercase tracking-wider text-white/60">Jogos</p>
              </div>
              <div>
                <p className="font-display text-xl font-bold">24/7</p>
                <p className="text-[10px] uppercase tracking-wider text-white/60">Disponível</p>
              </div>
              <div>
                <p className="font-display text-xl font-bold text-good">{fmt(balance)}</p>
                <p className="text-[10px] uppercase tracking-wider text-white/60">Saldo B$</p>
              </div>
            </div>
          </div>

          <div className="relative mx-auto hidden w-full max-w-[420px] lg:block">
            <div className="absolute -left-4 top-8 z-20 animate-floaty rounded-xl border border-white/15 bg-[#1a2231]/95 px-3 py-2 shadow-2xl backdrop-blur">
              <p className="text-[10px] uppercase tracking-wider text-white/60">Ganho agora</p>
              <p className="text-sm font-extrabold text-good">+2.480 B$</p>
            </div>
            <div className="absolute -right-2 top-24 z-20 animate-floaty rounded-xl border border-gold/25 bg-[#2a210b]/95 px-3 py-2 shadow-2xl backdrop-blur" style={{ animationDelay: '1.2s' }}>
              <p className="text-[10px] uppercase tracking-wider text-white/60">Multiplicador</p>
              <p className="text-sm font-extrabold text-gold">18.4×</p>
            </div>
            <div className="tone-crash cat-surface cat-card-shell relative overflow-hidden rounded-2xl border p-4 shadow-[0_30px_80px_rgba(3,6,13,.55)]">
              <div className="flex items-center justify-between">
                <span className="rounded-md bg-white/15 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white/80">Crash · ao vivo</span>
                <span className="text-[10px] font-semibold tracking-wider text-white/55">BLAZE</span>
              </div>
              <div className="relative mt-4 h-40">
                <svg viewBox="0 0 320 160" className="h-full w-full" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="heroCurve" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ff2d3f" stopOpacity=".35" />
                      <stop offset="100%" stopColor="#ff2d3f" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {[0, 1, 2, 3].map((i) => (
                    <line key={i} x1="0" y1={20 + i * 35} x2="320" y2={20 + i * 35} stroke="rgba(255,255,255,.06)" strokeWidth="1" />
                  ))}
                  <path d="M0 150 C 80 145, 140 120, 190 80 S 260 25, 310 12 L 310 160 L 0 160 Z" fill="url(#heroCurve)" />
                  <path d="M0 150 C 80 145, 140 120, 190 80 S 260 25, 310 12" fill="none" stroke="#ff3b4d" strokeWidth="3" strokeLinecap="round" />
                  <circle cx="310" cy="12" r="5" fill="#fff" />
                </svg>
                <GameArt game={getGame('crash')!} className="absolute right-0 top-0 h-12 w-20 -translate-y-1/2" />
              </div>
              <div className="mt-2 flex items-end justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-white/60">Multiplicador atual</p>
                  <p className="font-display text-3xl font-extrabold text-white">8.42×</p>
                </div>
                <div className="flex gap-1">
                  {['1.2×', '2.4×', '5.1×', '1.8×'].map((m, i) => (
                    <span key={i} className="rounded bg-white/10 px-1.5 py-1 text-[10px] font-bold text-white/75">{m}</span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* live wins */}
      <section className="no-scrollbar flex items-center gap-3 overflow-x-auto rounded-2xl border border-white/10 bg-[#182030]/80 px-4 py-3">
        <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-good">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-good" /> Ao vivo
        </span>
        <span className="h-4 w-px shrink-0 bg-line" />
        {LIVE_WINS.map((w, i) => (
          <div key={i} className="flex shrink-0 items-center gap-2 rounded-lg bg-white/[.06] px-2.5 py-1.5">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-[#354059] to-[#1b2333] text-[10px] font-bold text-white/85">
              {w.name[0]}
            </span>
            <span className="text-[11px] text-white/75">{w.name}</span>
            <span className="text-[11px] text-white/45">·</span>
            <span className="text-[11px] text-white/65">{w.game}</span>
            <span className="text-[11px] font-bold text-gold">{w.mult}</span>
            <span className="text-[11px] font-bold text-good">+{fmt(w.amount)}</span>
          </div>
        ))}
      </section>

      {recent.length > 0 && (
        <section>
          <SectionHead title="Continuar a jogar" subtitle="Os teus jogos recentes" action="Ver todos" onAction={() => navigate('/jogos')} />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {recent.slice(0, 6).map((g) => (
              <GameCard key={g.id} game={g} compact />
            ))}
          </div>
        </section>
      )}

      <section>
        <SectionHead title="Jogos em destaque" subtitle="Escolhidos pela comunidade BLAZE" action="Ver todos" onAction={() => navigate('/jogos')} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {featured.map((g) => (
            <GameCard key={g.id} game={g} />
          ))}
        </div>
      </section>

      <section className="relative overflow-hidden rounded-2xl border border-gold/20 bg-gradient-to-r from-[#2a210b] via-[#1a1405] to-[#141b2a] p-5 sm:p-7">
        <div className="absolute -right-10 -top-10 h-48 w-48 rounded-full bg-gold/10 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gold/15 text-gold">
              <Icon name="gift" size={28} />
            </span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.2em] text-gold">Bónus de boas-vindas</p>
              <h3 className="font-display text-xl font-bold sm:text-2xl">Começa com 5.000 B$ virtuais</h3>
              <p className="mt-1 text-xs text-white/65">Mais 500 B$ de bónus a cada 4 horas. Sem depósitos, sem risco.</p>
            </div>
          </div>
          <button
            type="button"
            className="btn-gold px-5 py-3 text-sm"
            onClick={() => {
              if (bonus()) push('success', 'Bónus recebido!', '+500 B$ adicionados à carteira.')
              else push('info', 'Já recebeste', 'O próximo bónus fica disponível mais tarde.')
            }}
          >
            {bonusReady ? 'Receber bónus' : 'Ver promoções'}
          </button>
        </div>
      </section>

      <section>
        <SectionHead title="Populares esta semana" subtitle="Os favoritos de quem joga" action="Explorar" onAction={() => navigate('/jogos')} />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {popular.map((g) => (
            <GameCard key={g.id} game={g} compact />
          ))}
        </div>
      </section>

      <footer className="rounded-2xl border border-white/10 bg-white/[.04] px-5 py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-[11px] text-white/60">
            BLAZE é uma demonstração recreativa. Não há dinheiro real, depósitos, compras ou levantamentos.
          </p>
          <div className="flex flex-wrap items-center gap-3 text-[11px] font-semibold text-white/60">
            <span className="flex items-center gap-1"><Icon name="shield" size={12} /> +18</span>
            <button type="button" onClick={() => navigate('/perfil')} className="transition hover:text-white">Jogo responsável</button>
            <button type="button" onClick={() => navigate('/termos')} className="transition hover:text-white">Termos</button>
            <button type="button" onClick={() => navigate('/privacidade')} className="transition hover:text-white">Privacidade</button>
          </div>
        </div>
      </footer>
    </div>
  )
}
