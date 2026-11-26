import { useState } from 'react'
import { fmt } from '../lib/format'
import { navigate } from '../lib/router'
import { useWallet } from '../lib/wallet'
import { Icon } from '../components/Icon'

const PLAYERS = [
  { name: 'Tiago_M', pts: 18420, wins: 62, prize: 2500 },
  { name: 'Rita99', pts: 15980, wins: 55, prize: 1500 },
  { name: 'JoaoPT', pts: 14110, wins: 49, prize: 1000 },
  { name: 'Sofia_L', pts: 12840, wins: 44, prize: 500 },
  { name: 'MiguelX', pts: 11250, wins: 41, prize: 300 },
  { name: 'Ines.C', pts: 9870, wins: 38, prize: 200 },
  { name: 'Bruno_88', pts: 8420, wins: 31, prize: 100 },
  { name: 'CarlaS', pts: 7610, wins: 28, prize: 100 },
  { name: 'AndrePT', pts: 6890, wins: 25, prize: 50 },
  { name: 'Marta.F', pts: 6120, wins: 22, prize: 50 },
]

export function RankingsPage() {
  const [tab, setTab] = useState<'week' | 'all'>('week')
  const { won } = useWallet()
  const me = { name: 'Tu (demo)', pts: Math.round(won), wins: Math.max(0, Math.floor(won / 250)), prize: 0 }
  const rows = [...PLAYERS, me].sort((a, b) => b.pts - a.pts)

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold tracking-tight sm:text-3xl">Rankings</h1>
          <p className="mt-1 text-sm text-white/40">Classificação de demonstração baseada em ganhos virtuais.</p>
        </div>
        <div className="flex gap-1 rounded-xl border border-line bg-white/[.02] p-1">
          {([['week', 'Semana'], ['all', 'Geral']] as const).map(([t, label]) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition ${tab === t ? 'bg-white/10 text-white' : 'text-white/35 hover:text-white'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-line/70 bg-gradient-to-r from-[#101522] to-[#080a11] p-5 sm:p-6">
        <div className="absolute -right-10 -top-14 h-48 w-48 rounded-full bg-gold/10 blur-3xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-gold/10 text-2xl">🏆</span>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[.2em] text-gold">Torneio semanal</p>
              <h2 className="font-display text-xl font-bold">Corrida BLAZE · 10.000 B$ em prémios</h2>
              <p className="mt-1 text-xs text-white/40">Termina domingo às 23:59 · participação automática.</p>
            </div>
          </div>
          <button type="button" onClick={() => navigate('/jogos')} className="btn-gold px-5 py-2.5 text-xs">Participar</button>
        </div>
      </div>

      <div className="panel overflow-hidden">
        <div className="grid grid-cols-[48px_1fr_90px_90px] gap-2 border-b border-line/70 px-4 py-2.5 text-[9px] font-bold uppercase tracking-wider text-white/30 sm:grid-cols-[48px_1fr_120px_120px]">
          <span>#</span>
          <span>Jogador</span>
          <span className="text-right">Pontos</span>
          <span className="text-right">Prémio</span>
        </div>
        <div className="divide-y divide-line/40">
          {rows.map((p, i) => {
            const isMe = p.name.startsWith('Tu')
            return (
              <div key={p.name} className={`grid grid-cols-[48px_1fr_90px_90px] items-center gap-2 px-4 py-3 sm:grid-cols-[48px_1fr_120px_120px] ${isMe ? 'bg-brand/[.06]' : ''}`}>
                <span className={`grid h-7 w-7 place-items-center rounded-lg text-[10px] font-bold ${i === 0 ? 'bg-gold/20 text-gold' : i === 1 ? 'bg-white/15 text-white/80' : i === 2 ? 'bg-[#b87333]/20 text-[#e0a06a]' : 'bg-white/[.04] text-white/35'}`}>
                  {i + 1}
                </span>
                <div className="flex min-w-0 items-center gap-2">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br from-[#2a3142] to-[#141925] text-[10px] font-bold text-white/60">
                    {p.name[0]}
                  </span>
                  <span className={`truncate text-xs font-semibold ${isMe ? 'text-white' : 'text-white/70'}`}>
                    {p.name} {isMe && <span className="ml-1 rounded bg-brand/20 px-1 py-0.5 text-[8px] font-bold text-brand">TU</span>}
                  </span>
                </div>
                <span className="text-right text-xs font-bold tabular text-white/70">{fmt(p.pts)}</span>
                <span className={`text-right text-xs font-bold tabular ${p.prize > 0 ? 'text-gold' : 'text-white/20'}`}>
                  {p.prize > 0 ? `${fmt(p.prize)} B$` : '—'}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="panel p-4">
          <p className="label">A tua posição</p>
          <p className="mt-1 font-display text-2xl font-bold">#{rows.findIndex((r) => r.name.startsWith('Tu')) + 1}</p>
        </div>
        <div className="panel p-4">
          <p className="label">Pontos</p>
          <p className="mt-1 font-display text-2xl font-bold tabular text-good">{fmt(me.pts)}</p>
        </div>
        <div className="panel p-4">
          <p className="label">Prémios</p>
          <p className="mt-1 font-display text-2xl font-bold tabular">{me.wins}</p>
        </div>
      </div>

      <p className="flex items-center gap-2 text-[10px] text-white/25">
        <Icon name="info" size={12} /> Classificação ilustrativa para demonstração. Os prémios não são reais.
      </p>
    </div>
  )
}
