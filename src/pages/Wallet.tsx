import { useMemo } from 'react'
import { useWallet } from '../lib/wallet'
import { useToast } from '../lib/toast'
import { fmt, timeAgo } from '../lib/format'
import { navigate } from '../lib/router'
import { Icon } from '../components/Icon'

export function WalletPage() {
  const { balance, tx, wagered, won, bonus, bonusReady, reset } = useWallet()
  const { push } = useToast()
  const net = won - wagered

  const counts = useMemo(
    () => ({
      bets: tx.filter((t) => t.type === 'bet').length,
      wins: tx.filter((t) => t.type === 'win').length,
    }),
    [tx],
  )

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">Carteira</h1>
        <p className="mt-1 text-sm text-white/40">Créditos virtuais guardados apenas neste navegador.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_.85fr]">
        <div className="relative overflow-hidden rounded-2xl border border-brand/20 bg-gradient-to-br from-[#2a0a10] via-[#14070b] to-[#080a11] p-5 sm:p-6">
          <div className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-brand/15 blur-3xl" />
          <div className="absolute inset-0 bg-grid opacity-20" />
          <div className="relative">
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[.18em] text-white/40">
                <Icon name="wallet" size={14} /> Saldo disponível
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-white/40">Demo</span>
            </div>
            <p className="mt-4 font-display text-[clamp(34px,7vw,52px)] font-extrabold leading-none tabular">
              {fmt(balance)} <span className="text-xl font-bold text-white/40">B$</span>
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button
                type="button"
                className="btn-gold px-4 py-2.5 text-xs"
                onClick={() => {
                  if (bonus()) push('success', 'Bónus recebido!', '+500 B$ adicionados à carteira.')
                  else push('info', 'Bónus indisponível', 'Já recebeste o bónus desta janela de 4 horas.')
                }}
              >
                <Icon name="gift" size={14} /> {bonusReady ? 'Receber bónus +500' : 'Bónus já recebido'}
              </button>
              <button type="button" className="btn-ghost px-4 py-2.5 text-xs" onClick={() => navigate('/jogos')}>
                Jogar agora <Icon name="chevron" size={13} />
              </button>
              <button
                type="button"
                className="btn-ghost px-4 py-2.5 text-xs text-white/40"
                onClick={() => {
                  if (window.confirm('Reiniciar a demo? O saldo volta a 5.000 B$ e o histórico é apagado.')) {
                    reset()
                    push('info', 'Demo reiniciada', 'Saldo reposto em 5.000 B$.')
                  }
                }}
              >
                Reiniciar demo
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="panel p-4">
            <p className="label">Total apostado</p>
            <p className="mt-1 font-display text-xl font-bold tabular">{fmt(wagered)}</p>
            <p className="text-[10px] text-white/30">em {counts.bets} apostas</p>
          </div>
          <div className="panel p-4">
            <p className="label">Total ganho</p>
            <p className="mt-1 font-display text-xl font-bold tabular text-good">{fmt(won)}</p>
            <p className="text-[10px] text-white/30">{counts.wins} prémios</p>
          </div>
          <div className="panel p-4">
            <p className="label">Resultado líquido</p>
            <p className={`mt-1 font-display text-xl font-bold tabular ${net >= 0 ? 'text-good' : 'text-brand'}`}>
              {net >= 0 ? '+' : '−'}{fmt(Math.abs(net))}
            </p>
            <p className="text-[10px] text-white/30">nesta sessão</p>
          </div>
          <div className="panel p-4">
            <p className="label">Movimentos</p>
            <p className="mt-1 font-display text-xl font-bold tabular">{tx.length}</p>
            <p className="text-[10px] text-white/30">registos locais</p>
          </div>
        </div>
      </div>

      <div className="panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-line/70 px-4 py-3">
          <h2 className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[.14em] text-white/40">
            <Icon name="clock" size={14} /> Movimentos recentes
          </h2>
          <button type="button" onClick={() => navigate('/historico')} className="text-[11px] font-semibold text-white/40 hover:text-white">
            Ver tudo →
          </button>
        </div>
        {tx.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="text-sm text-white/35">Ainda não há movimentos.</p>
            <button type="button" className="btn-primary mt-3" onClick={() => navigate('/jogos')}>Começar a jogar</button>
          </div>
        ) : (
          <div className="divide-y divide-line/50">
            {tx.slice(0, 12).map((t) => (
              <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                  t.type === 'win' ? 'bg-good/10 text-good' : t.type === 'bonus' ? 'bg-gold/10 text-gold' : t.type === 'reset' ? 'bg-white/5 text-white/40' : 'bg-brand/10 text-brand'
                }`}>
                  <Icon name={t.type === 'win' ? 'trophy' : t.type === 'bonus' ? 'gift' : t.type === 'reset' ? 'back' : 'crash'} size={15} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold text-white/80">{t.game}</p>
                  <p className="truncate text-[10px] text-white/30">{t.detail ?? (t.type === 'bet' ? 'Aposta' : t.type === 'win' ? 'Prémio' : 'Bónus')} · {timeAgo(t.ts)}</p>
                </div>
                <div className="text-right">
                  <p className={`text-xs font-bold tabular ${t.amount > 0 ? 'text-good' : 'text-white/60'}`}>
                    {t.amount > 0 ? '+' : t.amount < 0 ? '−' : ''}{fmt(Math.abs(t.amount))} B$
                  </p>
                  <p className="text-[9px] tabular text-white/25">saldo {fmt(t.balanceAfter)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="panel p-4">
        <h3 className="flex items-center gap-2 text-xs font-bold text-white/70"><Icon name="info" size={14} className="text-white/30" /> Como funciona a carteira</h3>
        <p className="mt-2 text-[11px] leading-relaxed text-white/35">
          Todos os créditos são virtuais e ficam guardados no <code className="rounded bg-white/5 px-1">localStorage</code> do teu navegador.
          Não existem depósitos, compras, prémios em dinheiro ou levantamentos. Podes reiniciar a demo a qualquer momento.
        </p>
      </div>
    </div>
  )
}
