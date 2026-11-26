import { useMemo } from 'react'
import { GAMES } from '../lib/games'
import { navigate } from '../lib/router'
import { useWallet } from '../lib/wallet'
import { useSound } from '../lib/sound'
import { useToast } from '../lib/toast'
import { fmt, fmtShort } from '../lib/format'
import { Icon } from '../components/Icon'

function PageHead({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">{title}</h1>
      {subtitle && <p className="mt-1 text-sm text-white/40">{subtitle}</p>}
    </div>
  )
}

function Notice({ title, text, icon = 'shield' }: { title: string; text: string; icon?: 'shield' | 'info' | 'gift' }) {
  return (
    <div className="panel flex items-start gap-3 p-4">
      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-gold/10 text-gold">
        <Icon name={icon} size={17} />
      </span>
      <div>
        <p className="text-sm font-bold">{title}</p>
        <p className="mt-1 text-[11px] leading-relaxed text-white/45">{text}</p>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ PROFILE */

export function ProfilePage() {
  const { tx, wagered, won, balance, reset } = useWallet()
  const { enabled, toggle } = useSound()
  const { push } = useToast()

  const stats = useMemo(
    () => ({
      bets: tx.filter((t) => t.type === 'bet').length,
      wins: tx.filter((t) => t.type === 'win').length,
      games: new Set(tx.map((t) => t.gameId).filter(Boolean)).size,
    }),
    [tx],
  )

  const exportData = () => {
    const data: Record<string, unknown> = {}
    Object.keys(localStorage)
      .filter((key) => key.startsWith('blaze.'))
      .forEach((key) => {
        try {
          data[key] = JSON.parse(localStorage.getItem(key) ?? 'null')
        } catch {
          data[key] = localStorage.getItem(key)
        }
      })
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), data }, null, 2)], {
      type: 'application/json',
    })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'blaze-dados-demo.json'
    link.click()
    URL.revokeObjectURL(url)
    push('success', 'Dados exportados', 'Ficheiro blaze-dados-demo.json gerado.')
  }

  const eraseData = () => {
    if (!window.confirm('Apagar todos os dados locais da demo? O saldo, favoritos e histórico serão eliminados.')) return
    Object.keys(localStorage)
      .filter((key) => key.startsWith('blaze.') || key.startsWith('blase.'))
      .forEach((key) => localStorage.removeItem(key))
    reset()
    push('info', 'Dados apagados', 'A conta demo foi reiniciada.')
    navigate('/')
  }

  return (
    <div className="space-y-5">
      <PageHead title="Perfil" subtitle="Conta demo local · sem autenticação real" />

      <div className="panel flex flex-wrap items-center gap-4 p-5">
        <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-brand to-[#b3061a] font-display text-2xl font-black">
          B
        </span>
        <div className="min-w-0 flex-1">
          <p className="font-display text-lg font-bold">Jogador demo</p>
          <p className="text-[11px] text-white/35">
            Identidade local · {stats.games} {stats.games === 1 ? 'jogo experimentado' : 'jogos experimentados'}
          </p>
        </div>
        <span className="rounded-lg border border-line px-2.5 py-1.5 text-[10px] font-bold text-white/40">+18</span>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="panel p-4">
          <p className="label">Saldo</p>
          <p className="mt-1 font-display text-xl font-bold tabular text-gold">{fmt(balance)}</p>
        </div>
        <div className="panel p-4">
          <p className="label">Apostado</p>
          <p className="mt-1 font-display text-xl font-bold tabular">{fmtShort(wagered)}</p>
        </div>
        <div className="panel p-4">
          <p className="label">Ganho</p>
          <p className="mt-1 font-display text-xl font-bold tabular text-good">{fmtShort(won)}</p>
        </div>
        <div className="panel p-4">
          <p className="label">Movimentos</p>
          <p className="mt-1 font-display text-xl font-bold tabular">{tx.length}</p>
        </div>
      </div>

      <section className="panel space-y-3 p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold">Efeitos sonoros</p>
            <p className="mt-0.5 text-[11px] text-white/35">Sons gerados no navegador com WebAudio.</p>
          </div>
          <button
            type="button"
            onClick={toggle}
            className={`rounded-lg px-3 py-1.5 text-[10px] font-bold ${enabled ? 'bg-good/15 text-good' : 'bg-white/10 text-white/40'}`}
          >
            {enabled ? 'Ativados' : 'Desativados'}
          </button>
        </div>
        <div className="divider" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold">Dados neste dispositivo</p>
            <p className="mt-0.5 text-[11px] text-white/35">{stats.bets} apostas · {stats.wins} prémios · guardados em localStorage</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={exportData} className="btn-ghost px-3 py-2 text-xs">
              Exportar dados
            </button>
            <button type="button" onClick={eraseData} className="btn-ghost px-3 py-2 text-xs text-brand/80 hover:text-brand">
              Apagar dados
            </button>
          </div>
        </div>
      </section>

      <section className="panel space-y-2 p-5">
        <p className="text-sm font-bold">Jogo responsável</p>
        <ul className="space-y-2 text-[11px] text-white/45">
          <li className="flex gap-2"><span className="text-good">✓</span> Todos os créditos são virtuais e não têm valor monetário.</li>
          <li className="flex gap-2"><span className="text-good">✓</span> Não existem depósitos, compras, prémios reais ou levantamentos.</li>
          <li className="flex gap-2"><span className="text-good">✓</span> Podes reiniciar a conta e apagar os dados a qualquer momento.</li>
          <li className="flex gap-2"><span className="text-good">✓</span> Faz pausas e joga com moderação. Apenas para maiores de 18 anos.</li>
        </ul>
        <p className="pt-1 text-[10px] leading-relaxed text-white/30">
          Num operador licenciado, os limites de depósito, perda e sessão devem ser impostos no servidor. Nesta demo
          não há dinheiro real nem contas de utilizador.
        </p>
      </section>

      <Notice
        title="Precisas de ajuda?"
        text="Se o jogo está a afetar a tua vida, procura apoio junto de serviços oficiais de jogo responsável do teu país. O jogo é proibido para menores de 18 anos."
      />

      <button
        type="button"
        onClick={() => {
          if (!window.confirm('Reiniciar a conta demo? O saldo volta a 5.000 B$ e o histórico é apagado.')) return
          reset()
          push('info', 'Conta reiniciada', 'O saldo voltou a 5.000 B$.')
        }}
        className="btn-ghost w-full py-3 text-xs"
      >
        Reiniciar conta demo
      </button>
    </div>
  )
}

/* ------------------------------------------------------------------ SUPPORT */

export function SupportPage() {
  const faqs = [
    ['Posso apostar dinheiro real?', 'Não. Esta é uma demonstração técnica com créditos virtuais. Operações reais exigem licença, KYC/AML e integrações de pagamento autorizadas.'],
    ['Os resultados são justos?', 'Os resultados são gerados localmente com aleatoriedade WebCrypto. No Crash, a prova da ronda é derivada de uma semente local revelada após o crash. Num operador licenciado, a prova deve ser verificável no servidor.'],
    ['Como vejo o meu histórico?', 'Em “As minhas apostas” ou “Carteira” podes consultar todas as apostas, ganhos e bónus desta sessão.'],
    ['Posso jogar no telemóvel?', 'Sim. A interface é responsiva, com navegação inferior no telemóvel e barra lateral no desktop.'],
    ['Como apago os meus dados?', 'Vai a “Perfil” e usa “Apagar dados”. Também podes reiniciar a conta demo na carteira.'],
  ]

  return (
    <div className="space-y-5">
      <PageHead title="Suporte" subtitle="Perguntas frequentes sobre a demonstração" />
      <div className="space-y-3">
        {faqs.map(([q, a]) => (
          <details key={q} className="panel group p-4">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold">
              {q}
              <Icon name="chevron" size={16} className="shrink-0 text-white/30 transition group-open:rotate-90" />
            </summary>
            <p className="mt-3 text-xs leading-relaxed text-white/45">{a}</p>
          </details>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => navigate('/jogos')} className="panel flex items-center gap-3 p-4 text-left transition hover:border-white/20">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand/10 text-brand"><Icon name="grid" size={18} /></span>
          <span>
            <span className="block text-sm font-bold">Explorar os {GAMES.length} jogos</span>
            <span className="text-[11px] text-white/35">Crash, mines, slots, mesa e arcade</span>
          </span>
        </button>
        <button type="button" onClick={() => navigate('/carteira')} className="panel flex items-center gap-3 p-4 text-left transition hover:border-white/20">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-gold/10 text-gold"><Icon name="wallet" size={18} /></span>
          <span>
            <span className="block text-sm font-bold">Abrir a carteira</span>
            <span className="text-[11px] text-white/35">Saldo, bónus e movimentos</span>
          </span>
        </button>
      </div>
      <Notice
        title="Canais oficiais"
        text="Não existem contactos de operador licenciado nesta demo. Não partilhes palavras-passe, códigos ou dados pessoais em canais não verificados."
        icon="info"
      />
    </div>
  )
}

/* --------------------------------------------------------- PROVIDER NOTICE */

export function ProviderNoticePage({ kind }: { kind: 'sports' | 'live' }) {
  const isLive = kind === 'live'
  return (
    <div className="space-y-5">
      <PageHead title={isLive ? 'Live Betting' : 'Sports'} subtitle="Secção preparada para integração licenciada" />
      <div className="panel relative overflow-hidden p-8 text-center">
        <div className="absolute inset-0 bg-grid opacity-30" />
        <div className="relative mx-auto max-w-lg">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-gold/25 bg-gold/10 text-gold">
            <Icon name={isLive ? 'bolt' : 'trophy'} size={28} />
          </span>
          <h2 className="mt-5 font-display text-2xl font-bold">
            {isLive ? 'Sem odds ao vivo nesta demo' : 'Sem resultados desportivos nesta demo'}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/45">
            Não inventamos odds, resultados nem eventos. Para ativar estas secções é necessário um fornecedor de dados
            desportivos licenciado, jurisdição autorizada e controlo de apostas em tempo real.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={() => navigate('/jogos')} className="btn-primary">Explorar jogos de casino</button>
            <button type="button" onClick={() => navigate('/suporte')} className="btn-ghost">Saber mais</button>
          </div>
        </div>
      </div>
      <Notice
        title="Requisitos para ativação"
        text="Contrato com fornecedor licenciado, validação de dados, limites de aposta, KYC/AML, gestão de risco e publicação de termos. Nada disto está ativo nesta demonstração."
      />
    </div>
  )
}

/* -------------------------------------------------------------------- LEGAL */

const LEGAL = {
  termos: {
    title: 'Termos de utilização',
    intro: 'Ao utilizares esta demonstração aceitas os termos abaixo. Se não concordares, não utilizes a plataforma.',
    sections: [
      {
        title: '1. Natureza do serviço',
        text: 'A BLAZE é uma demonstração recreativa de casino. Todos os créditos são virtuais, não têm valor monetário e não podem ser comprados, vendidos, convertidos ou levantados.',
      },
      {
        title: '2. Sem dinheiro real',
        text: 'Não existem depósitos, pagamentos, prémios em dinheiro ou levantamentos. Nenhum resultado desta demo representa uma oportunidade de ganho real.',
      },
      {
        title: '3. Elegibilidade',
        text: 'A plataforma destina-se a maiores de 18 anos. O jogo com dinheiro real é proibido a menores e pode ser ilegal na tua jurisdição.',
      },
      {
        title: '4. Disponibilidade e garantias',
        text: 'A demo é fornecida “tal como está”, sem garantias. O progresso fica guardado apenas no teu navegador e pode ser perdido ao limpar os dados, mudar de dispositivo ou atualizar a aplicação.',
      },
      {
        title: '5. Uso aceitável',
        text: 'Não deves tentar explorar falhas, automatizar abusivamente a plataforma ou utilizá-la para fins ilegais. A demo pode ser alterada ou descontinuada sem aviso.',
      },
      {
        title: '6. Jogo responsável',
        text: 'Se o jogo deixar de ser divertido, faz uma pausa e procura apoio junto de serviços oficiais de jogo responsável do teu país.',
      },
    ],
  },
  privacidade: {
    title: 'Política de privacidade',
    intro: 'Esta demo foi desenhada para guardar o mínimo possível de informação. Não existe conta, autenticação, telemetria ou publicidade.',
    sections: [
      {
        title: '1. Dados guardados localmente',
        text: 'Saldo, movimentos, favoritos, jogos recentes e preferência de som são guardados no localStorage do teu navegador, sob o prefixo blaze. Estes dados nunca são enviados para um servidor nosso.',
      },
      {
        title: '2. Como apagar os dados',
        text: 'Em “Perfil” podes exportar ou apagar todos os dados locais. Limpar os dados do site no navegador também remove tudo.',
      },
      {
        title: '3. Serviços externos',
        text: 'As fontes Inter e Sora são carregadas do Google Fonts, o que implica um pedido aos servidores da Google com o teu endereço IP. Sem rede, a aplicação usa as fontes do sistema.',
      },
      {
        title: '4. Cookies e análise',
        text: 'Não usamos cookies de publicidade, análises de tráfego, pixéis de rastreamento ou perfis de utilizador.',
      },
      {
        title: '5. Segurança',
        text: 'Como os dados ficam no cliente, qualquer pessoa com acesso ao teu navegador pode vê-los. Não introduzas dados pessoais ou sensíveis nesta demo.',
      },
      {
        title: '6. Contacto',
        text: 'Esta demonstração não representa um operador licenciado e não disponibiliza canais de apoio ao cliente reais.',
      },
    ],
  },
} as const

export function LegalPage({ kind }: { kind: 'termos' | 'privacidade' }) {
  const doc = LEGAL[kind]
  return (
    <div className="space-y-5">
      <PageHead title={doc.title} subtitle="Demonstração recreativa · atualizado em novembro de 2026" />
      <div className="panel space-y-5 p-5 sm:p-6">
        <p className="text-sm leading-relaxed text-white/55">{doc.intro}</p>
        {doc.sections.map((section) => (
          <section key={section.title}>
            <h2 className="font-display text-sm font-bold text-white/85">{section.title}</h2>
            <p className="mt-1 text-[12px] leading-relaxed text-white/45">{section.text}</p>
          </section>
        ))}
      </div>
      <div className="panel flex flex-wrap items-center justify-between gap-3 p-4">
        <p className="text-[11px] text-white/30">Dúvidas sobre a demo? Consulta as perguntas frequentes.</p>
        <button type="button" onClick={() => navigate('/suporte')} className="text-[11px] font-semibold text-gold">
          Abrir suporte →
        </button>
      </div>
    </div>
  )
}
