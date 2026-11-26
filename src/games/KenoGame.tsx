import { useMemo, useState } from 'react'
import type { Game } from '../lib/types'
import { fmt } from '../lib/format'
import { randInt, shuffle } from '../lib/rng'
import { useWallet } from '../lib/wallet'
import { useSound } from '../lib/sound'
import { BetInput, GameLayout, Payout, RecentStrip, SidePanel, Stage } from '../components/GameUI'
import { Icon } from '../components/Icon'

function paytable(pick: number): number[] {
  const table = new Array(pick + 1).fill(0)
  if (pick >= 15) {
    const vals: Record<number, number> = { 3: 0.5, 4: 1, 5: 2, 6: 5, 7: 10, 8: 25, 9: 50, 10: 100, 11: 250, 12: 500, 13: 1000, 14: 2500, 15: 5000 }
    for (let i = 3; i <= pick; i++) table[i] = vals[i] ?? 5000
  } else {
    const vals: Record<number, number> = { 3: 1, 4: 2, 5: 5, 6: 15, 7: 50, 8: 150, 9: 500, 10: 1000 }
    for (let i = 3; i <= pick; i++) table[i] = vals[i] ?? 1000
  }
  return table
}

export function KenoGame({ game }: { game: Game }) {
  const pool = Number(game.config.pool ?? 80)
  const pickCount = Number(game.config.pick ?? 10)
  const drawCount = Number(game.config.draw ?? 20)
  const table = useMemo(() => paytable(pickCount), [pickCount])
  const { balance, placeBet, payout } = useWallet()
  const { play } = useSound()

  const [amount, setAmount] = useState(game.minBet)
  const [picked, setPicked] = useState<Set<number>>(new Set())
  const [drawn, setDrawn] = useState<Set<number>>(new Set())
  const [drawing, setDrawing] = useState(false)
  const [settled, setSettled] = useState(false)
  const [history, setHistory] = useState<string[]>([])

  const toggle = (n: number) => {
    if (drawing) return
    setSettled(false)
    setDrawn(new Set())
    setPicked((prev) => {
      const next = new Set(prev)
      if (next.has(n)) next.delete(n)
      else if (next.size < pickCount) next.add(n)
      return next
    })
  }

  const randomPick = () => {
    if (drawing) return
    setSettled(false)
    setDrawn(new Set())
    setPicked(new Set(shuffle(Array.from({ length: pool }, (_, i) => i + 1)).slice(0, pickCount)))
  }

  const start = () => {
    if (drawing || picked.size !== pickCount) return
    if (!placeBet(amount, game.name, game.id, `${picked.size} números`)) return
    setDrawing(true)
    setSettled(false)
    setDrawn(new Set())
    const numbers = shuffle(Array.from({ length: pool }, (_, i) => i + 1)).slice(0, drawCount)
    play('spin')
    let i = 0
    const interval = setInterval(() => {
      setDrawn((prev) => new Set([...prev, numbers[i]]))
      play('tick')
      i++
      if (i >= numbers.length) {
        clearInterval(interval)
        setDrawing(false)
        setSettled(true)
        const hits = numbers.filter((n) => picked.has(n)).length
        setHistory((h) => [`${hits} acertos`, ...h].slice(0, 12))
        const win = table[hits] * amount
        if (win > 0) {
          payout(win, game.name, game.id, `${hits} acertos`)
          play('win')
        } else play('lose')
      }
    }, 95)
  }

  const hits = useMemo(() => [...drawn].filter((n) => picked.has(n)).length, [drawn, picked])
  const lastWin = settled ? table[hits] * amount : 0

  return (
    <GameLayout
      stage={
        <Stage>
          <div className="p-4 sm:p-6">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="label">Escolhe {pickCount} números</p>
                <p className="text-sm font-bold text-white">
                  {picked.size}/{pickCount} selecionados
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={randomPick} disabled={drawing} className="chip">
                  <Icon name="spark" size={12} /> Aleatório
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPicked(new Set())
                    setDrawn(new Set())
                    setSettled(false)
                  }}
                  disabled={drawing}
                  className="chip"
                >
                  Limpar
                </button>
              </div>
            </div>
            <div className="grid grid-cols-10 gap-1 sm:gap-1.5">
              {Array.from({ length: pool }, (_, i) => i + 1).map((n) => {
                const isPicked = picked.has(n)
                const isDrawn = drawn.has(n)
                const both = isPicked && isDrawn
                return (
                  <button
                    key={n}
                    type="button"
                    onClick={() => toggle(n)}
                    disabled={drawing}
                    className={`aspect-square rounded-md border text-[9px] font-bold tabular transition sm:text-[11px] ${
                      both
                        ? 'border-good/70 bg-good/30 text-good shadow-[0_0_12px_rgba(34,227,160,.25)]'
                        : isDrawn
                          ? 'border-white/40 bg-white/15 text-white'
                          : isPicked
                            ? 'border-gold/60 bg-gold/15 text-gold'
                            : 'border-line/60 bg-white/[.02] text-white/35 hover:border-white/20 hover:text-white'
                    }`}
                  >
                    {n}
                  </button>
                )
              })}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line/60 bg-black/20 px-3 py-2.5">
              <div className="flex items-center gap-4">
                <span className="text-[10px] text-white/35">
                  Acertos <span className="font-bold text-good">{hits}</span>
                </span>
                <span className="text-[10px] text-white/35">
                  Sorteio <span className="font-bold text-white">{drawn.size}/{drawCount}</span>
                </span>
              </div>
              {settled && (
                <span className={`text-xs font-bold ${lastWin > 0 ? 'text-good' : 'text-brand'}`}>
                  {lastWin > 0 ? `+${fmt(lastWin)} B$` : 'Sem prémio'}
                </span>
              )}
            </div>
          </div>
        </Stage>
      }
      side={
        <div className="space-y-4">
          <SidePanel title="Aposta">
            <BetInput value={amount} onChange={setAmount} min={game.minBet} max={game.maxBet} disabled={drawing} />
            <div className="mt-3 space-y-1.5">
              <Payout label="Sorteia" value={`${drawCount} de ${pool}`} />
              <Payout label="3 acertos" value={`${table[3]}×`} />
              <Payout label={`${pickCount} acertos`} value={`${table[pickCount]}×`} />
              <Payout label="Saldo" value={`${fmt(balance)} B$`} />
            </div>
            <button
              type="button"
              onClick={start}
              disabled={drawing || picked.size !== pickCount}
              className="btn-primary mt-3 w-full py-3 text-sm"
            >
              {drawing ? 'A sortear…' : picked.size !== pickCount ? `Faltam ${pickCount - picked.size} números` : `Jogar · ${fmt(amount)} B$`}
            </button>
          </SidePanel>
          <SidePanel title="Tabela de prémios">
            <div className="grid grid-cols-2 gap-1">
              {table.map((p, i) =>
                i >= 3 ? (
                  <div key={i} className="flex items-center justify-between rounded-md bg-white/[.02] px-2 py-1">
                    <span className="text-[10px] text-white/35">{i} acertos</span>
                    <span className="text-[10px] font-bold text-gold">{p}×</span>
                  </div>
                ) : null,
              )}
            </div>
          </SidePanel>
          <SidePanel title="Últimos sorteios">
            <RecentStrip items={history} colorFor={(v) => (String(v).startsWith('0') ? 'text-brand border-brand/30' : 'text-good border-good/30')} />
          </SidePanel>
        </div>
      }
    />
  )
}
