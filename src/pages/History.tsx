import { useMemo, useState } from 'react'
import { useWallet } from '../lib/wallet'
import { fmt, timeAgo } from '../lib/format'
import { navigate } from '../lib/router'
import { Icon } from '../components/Icon'
import { getGame } from '../lib/games'

type Filter = 'all' | 'bet' | 'win' | 'bonus'

export function HistoryPage() {
  const { tx, wagered, won } = useWallet()
  const [filter, setFilter] = useState<Filter>('all')

  const list = useMemo(() => (filter === 'all' ? tx : tx.filter((t) => t.type === filter)), [tx, filter])

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">Histórico</h1>
          <p className="mt-1 text-sm text-white/40">Todos os movimentos da tua conta demo.</p>
        </div>
        <div className="flex gap-2">
          <div className="rounded-xl border border-line bg-white/[.03] px-3 py-2">
            <p className="text-[9px] uppercase tracking-wider text-white/30">Apostado</p>
            <p className="text-sm font-bold tabular">{fmt(wagered)} B$</p>
          </div>
          <div className="rounded-xl border border-line bg-white/[.03] px-3 py-2">
            <p className="text-[9px] uppercase tracking-wider text-white/30">Ganho</p>
            <p className="text-sm font-bold tabular text-good">{fmt(won)} B$</p>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {([
          ['all', 'Tudo'],
          ['bet', 'Apostas'],
          ['win', 'Prémios'],
          ['bonus', 'Bónus'],
        ] as [Filter, string][]).map(([f, label]) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={`rounded-full border px-3.5 py-1.5 text-[11px] font-semibold transition ${
              filter === f ? 'border-brand/50 bg-brand/15 text-white' : 'border-line text-white/40 hover:text-white'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="panel overflow-hidden">
        {list.length === 0 ? (
          <div className="grid place-items-center px-6 py-16 text-center">
            <span className="text-4xl">🧾</span>
            <p className="mt-3 text-sm font-semibold">Sem movimentos</p>
            <p className="mt-1 text-xs text-white/35">Joga alguns jogos para começares a construir o teu histórico.</p>
            <button type="button" className="btn-primary mt-4" onClick={() => navigate('/jogos')}>Explorar jogos</button>
          </div>
        ) : (
          <div className="divide-y divide-line/50">
            {list.map((t) => {
              const game = t.gameId ? getGame(t.gameId) : undefined
              return (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                  <span
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-base"
                    style={{ background: game ? `linear-gradient(135deg,${game.theme.from},${game.theme.to})` : 'rgba(255,255,255,.06)' }}
                  >
                    {game ? game.theme.icon : t.type === 'bonus' ? '🎁' : '💳'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-white/85">{t.game}</p>
                    <p className="truncate text-[10px] text-white/30">
                      {t.detail ?? (t.type === 'bet' ? 'Aposta' : t.type === 'win' ? 'Prémio' : t.type === 'bonus' ? 'Bónus de 4 horas' : 'Reinício')} · {timeAgo(t.ts)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className={`text-xs font-bold tabular ${t.amount > 0 ? 'text-good' : 'text-white/60'}`}>
                      {t.amount > 0 ? '+' : t.amount < 0 ? '−' : ''}{fmt(Math.abs(t.amount))} B$
                    </p>
                    <p className="text-[9px] tabular text-white/25">saldo {fmt(t.balanceAfter)}</p>
                  </div>
                  {t.gameId && (
                    <button type="button" onClick={() => navigate(`/jogo/${t.gameId}`)} className="ml-1 hidden h-8 w-8 place-items-center rounded-lg border border-line text-white/30 hover:text-white sm:grid" aria-label="Abrir jogo">
                      <Icon name="chevron" size={14} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="panel flex items-center justify-between gap-3 p-4">
        <p className="text-[11px] text-white/30">O histórico fica guardado neste navegador e pode ser apagado ao reiniciar a demo.</p>
        <button type="button" onClick={() => navigate('/carteira')} className="shrink-0 text-[11px] font-semibold text-gold">Carteira →</button>
      </div>
    </div>
  )
}
