import { useEffect, useMemo, useRef, useState } from 'react'
import type { Game } from '../lib/types'
import { fmt } from '../lib/format'
import { randInt, shuffle } from '../lib/rng'
import { useWallet } from '../lib/wallet'
import { useSound } from '../lib/sound'
import { ActionButton, BetInput, GameLayout, Payout, RecentStrip, ResultBanner, SidePanel, Stage } from '../components/GameUI'
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
  const drawTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => () => {
    if (drawTimer.current) clearInterval(drawTimer.current)
  }, [])

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
    drawTimer.current = setInterval(() => {
      setDrawn((prev) => new Set([...prev, numbers[i]]))
      play('tick')
      i++
      if (i >= numbers.length) {
        if (drawTimer.current !== null) clearInterval(drawTimer.current)
        drawTimer.current = null
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
                <ActionButton tone="ghost" size="compact" icon="spark" onClick={randomPick} disabled={drawing}>
                  Aleatório
                </ActionButton>
                <ActionButton
                  tone="ghost"
                  size="compact"
                  onClick={() => {
                    setPicked(new Set())
                    setDrawn(new Set())
                    setSettled(false)
                  }}
                  disabled={drawing}
                >
                  Limpar
                </ActionButton>
              </div>
            </div>
            <div className="no-scrollbar grid max-h-[264px] grid-cols-5 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-10 sm:gap-1.5">
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
                    className={`h-11 rounded-md border text-[11px] font-bold tabular transition-transform duration-200 sm:aspect-square sm:h-auto sm:text-[11px] ${
                      both
                        ? 'animate-popIn border-good/70 bg-good/30 text-good shadow-[0_0_18px_rgba(34,227,160,.5)] game-pulse'
                        : isDrawn
                          ? 'animate-popIn border-white/40 bg-white/15 text-white shadow-[0_0_12px_rgba(255,255,255,.2)]'
                          : isPicked
                            ? 'border-gold/60 bg-gold/15 text-gold shadow-[0_0_10px_rgba(255,200,87,.2)] hover:scale-105'
                            : 'border-line/60 bg-white/[.02] text-white/35 hover:scale-105 hover:border-white/20 hover:text-white'
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
            <ResultBanner
              state={!settled ? 'idle' : lastWin > 0 ? 'win' : 'lose'}
              text={lastWin > 0 ? `+${fmt(lastWin)} B$` : 'Sem prémio neste sorteio.'}
            />
            <div className="relative z-10 mt-3 rounded-2xl border border-white/10 bet-bar bg-[#05060a]/95 p-3 shadow-[0_-8px_30px_rgba(0,0,0,.45)]">
              <BetInput value={amount} onChange={setAmount} min={game.minBet} max={game.maxBet} disabled={drawing} />
              <ActionButton
                tone={drawing ? 'placed' : 'bet'}
                icon="bolt"
                loading={drawing}
                onClick={start}
                disabled={drawing || picked.size !== pickCount}
                className="mt-3"
              >
                {drawing ? 'A sortear…' : picked.size !== pickCount ? `Faltam ${pickCount - picked.size} números` : `Jogar · ${fmt(amount)} B$`}
              </ActionButton>
            </div>
          </div>
        </Stage>
      }
      side={
        <div className="space-y-4">
          <SidePanel title="Detalhes da aposta">
            <div className="space-y-1.5">
              <Payout label="Sorteia" value={`${drawCount} de ${pool}`} />
              <Payout label="3 acertos" value={`${table[3]}×`} />
              <Payout label={`${pickCount} acertos`} value={`${table[pickCount]}×`} />
              <Payout label="Saldo" value={`${fmt(balance)} B$`} />
            </div>
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
