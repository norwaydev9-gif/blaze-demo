import { useWallet } from '../lib/wallet'
import { useToast } from '../lib/toast'
import { fmt } from '../lib/format'
import { navigate } from '../lib/router'
import { Icon } from '../components/Icon'
import { GameCard } from '../components/GameCard'
import { GAMES } from '../lib/games'

const PROMOS = [
  { id: 'welcome', icon: '🎁', title: 'Bónus de boas-vindas', text: '5.000 B$ virtuais para explorares todos os jogos.', tag: 'Sempre ativo', tone: 'gold' },
  { id: 'daily', icon: '⏰', title: 'Bónus a cada 4 horas', text: 'Recebe 500 B$ grátis para continuares a jogar.', tag: 'Recorrente', tone: 'brand' },
  { id: 'race', icon: '🏆', title: 'Corrida semanal', text: 'Sobe no ranking com os teus ganhos e entra no top 10.', tag: 'Segunda a domingo', tone: 'good' },
  { id: 'cashback', icon: '💸', title: 'Cashback de 5%', text: 'Devolução virtual nas apostas dos jogos selecionados.', tag: 'Jogos deluxe', tone: 'brand' },
]

export function PromotionsPage() {
  const { bonus, bonusReady, balance } = useWallet()
  const { push } = useToast()

  const claim = () => {
    if (bonus()) push('success', 'Bónus recebido!', '+500 B$ adicionados à tua carteira.')
    else push('info', 'Bónus indisponível', 'Já recebeste o bónus desta janela de 4 horas.')
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">Promoções</h1>
        <p className="mt-1 text-sm text-white/40">Bónus e eventos de demonstração — sem dinheiro real.</p>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-gold/25 bg-gradient-to-br from-[#241b06] via-[#140f04] to-[#080a11] p-5 sm:p-7">
        <div className="absolute -right-10 -top-16 h-64 w-64 rounded-full bg-gold/15 blur-3xl" />
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="relative flex flex-wrap items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-gold/15 text-3xl shadow-[0_0_40px_rgba(255,200,87,.15)]">🎁</span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.22em] text-gold">Oferta da casa</p>
              <h2 className="font-display text-2xl font-extrabold sm:text-3xl">+500 B$ agora</h2>
              <p className="mt-1 max-w-md text-xs text-white/45">
                Um bónus de 500 créditos virtuais a cada 4 horas. Sem depósitos, sem compras, sem levantamentos.
              </p>
            </div>
          </div>
          <div className="text-right">
            <button type="button" onClick={claim} className="btn-gold px-6 py-3 text-sm">
              {bonusReady ? 'Receber bónus' : 'Já recebido'}
            </button>
            <p className="mt-2 text-[10px] text-white/30">Saldo demo · não convertível</p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {PROMOS.map((p) => (
          <div key={p.id} className="panel flex items-start gap-4 p-4">
            <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl text-xl ${
              p.tone === 'gold' ? 'bg-gold/10' : p.tone === 'good' ? 'bg-good/10' : 'bg-brand/10'
            }`}>
              {p.icon}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold">{p.title}</h3>
                <span className={`rounded px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider ${
                  p.tone === 'gold' ? 'bg-gold/15 text-gold' : p.tone === 'good' ? 'bg-good/15 text-good' : 'bg-brand/15 text-brand'
                }`}>
                  {p.tag}
                </span>
              </div>
              <p className="mt-1 text-[11px] leading-relaxed text-white/40">{p.text}</p>
              <button
                type="button"
                onClick={() => {
                  if (p.id === 'daily') claim()
                  else push('info', 'Promoção demo', 'Esta promoção é ilustrativa e não atribui créditos adicionais.')
                }}
                className="mt-2 text-[11px] font-bold text-white/60 hover:text-white"
              >
                {p.id === 'daily' ? 'Receber agora →' : 'Saber mais →'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_.8fr]">
        <div className="panel p-4 sm:p-5">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Jogos da semana</h2>
            <button type="button" onClick={() => navigate('/jogos/deluxe')} className="text-[11px] font-semibold text-white/40 hover:text-white">Ver deluxe →</button>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {GAMES.filter((g) => g.category === 'deluxe').slice(0, 3).map((g) => (
              <GameCard key={g.id} game={g} compact />
            ))}
          </div>
        </div>
        <div className="panel p-4 sm:p-5">
          <h2 className="flex items-center gap-2 font-display text-sm font-bold"><Icon name="shield" size={15} className="text-white/30" /> Jogo responsável</h2>
          <ul className="mt-3 space-y-2 text-[11px] text-white/40">
            <li className="flex gap-2"><span className="text-good">✓</span> Todos os créditos são virtuais.</li>
            <li className="flex gap-2"><span className="text-good">✓</span> Não há dinheiro real nem prémios.</li>
            <li className="flex gap-2"><span className="text-good">✓</span> Podes reiniciar a demo a qualquer momento.</li>
            <li className="flex gap-2"><span className="text-good">✓</span> Faz pausas e joga com moderação.</li>
          </ul>
          <div className="mt-4 rounded-xl border border-line/60 bg-black/20 p-3">
            <p className="text-[10px] leading-relaxed text-white/30">
              Se o jogo deixar de ser divertido, para. Esta plataforma existe apenas para demonstração técnica e recreativa.
            </p>
          </div>
        </div>
      </div>

      <div className="panel flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="text-[11px] text-white/30">O teu saldo atual é de <span className="font-bold text-white">{fmt(balance)} B$</span>.</p>
        <button type="button" onClick={() => navigate('/carteira')} className="text-[11px] font-semibold text-gold">Abrir carteira →</button>
      </div>
    </div>
  )
}
