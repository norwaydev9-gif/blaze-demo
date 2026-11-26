import { useMemo, useRef, useState } from 'react'
import type { Game } from '../lib/types'
import { fmt, clamp } from '../lib/format'
import { randInt, pick } from '../lib/rng'
import { useWallet } from '../lib/wallet'
import { useSound } from '../lib/sound'
import { ActionButton, BetInput, GameLayout, Payout, RecentStrip, ResultBanner, SidePanel, Stage } from '../components/GameUI'

const LINE_PATTERNS: number[][] = [
  [1, 1, 1],
  [0, 0, 0],
  [2, 2, 2],
  [0, 1, 2],
  [2, 1, 0],
  [0, 0, 1],
  [2, 2, 1],
  [1, 0, 0],
  [1, 2, 2],
]

function payFor(index: number): number {
  return [3, 4, 6, 9, 14, 25, 60][Math.min(index, 6)]
}

export function SlotsGame({ game }: { game: Game }) {
  const symbols = (game.config.symbols as string[] | undefined) ?? ['🍒', '🍋', '🍊', '🍇', '🔔', '⭐', '7️⃣']
  const linesCount = Number(game.config.lines ?? 5)
  const rows = 3
  const lines = LINE_PATTERNS.slice(0, linesCount)
  const min = game.minBet
  const max = game.maxBet
  const { balance, placeBet, payout } = useWallet()
  const { play } = useSound()

  const [amount, setAmount] = useState(min)
  const [grid, setGrid] = useState<string[][]>(() => Array.from({ length: 3 }, () => Array.from({ length: rows }, () => pick(symbols))))
  const [spinning, setSpinning] = useState(false)
  const [win, setWin] = useState(0)
  const [winLines, setWinLines] = useState<number[]>([])
  const [history, setHistory] = useState<string[]>([])
  const [showPay, setShowPay] = useState(false)
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const stopped = useRef<Set<number>>(new Set())

  const betPerLine = amount / linesCount

  const spin = () => {
    if (spinning) return
    if (!placeBet(amount, game.name, game.id, `${linesCount} linhas`)) return
    setSpinning(true)
    setWin(0)
    setWinLines([])
    play('spin')

    const result = Array.from({ length: 3 }, () => Array.from({ length: rows }, () => pick(symbols)))
    stopped.current = new Set()
    const rolling = setInterval(() => {
      setGrid((prev) => prev.map((col, c) => (stopped.current.has(c) ? col : col.map(() => pick(symbols)))))
    }, 70)

    timers.current.forEach(clearTimeout)
    timers.current = []
    ;[450, 750, 1050].forEach((delay, c) => {
      timers.current.push(
        setTimeout(() => {
          stopped.current.add(c)
          setGrid((prev) => prev.map((col, i) => (i === c ? result[c] : col)))
          play('tick')
        }, delay),
      )
    })

    timers.current.push(
      setTimeout(() => {
        clearInterval(rolling)
        setGrid(result)
        const hits: number[] = []
        let total = 0
        lines.forEach((pattern, li) => {
          const row = pattern[0]
          const sym = result[0][row]
          if (result[1][pattern[1]] === sym && result[2][pattern[2]] === sym) {
            hits.push(li)
            total += betPerLine * payFor(symbols.indexOf(sym))
          }
        })
        setSpinning(false)
        setWinLines(hits)
        if (total > 0) {
          setWin(total)
          payout(total, game.name, game.id, `${hits.length} linha(s)`)
          setHistory((h) => [`+${fmt(total)}`, ...h].slice(0, 12))
          play('win')
        } else {
          setHistory((h) => ['—', ...h].slice(0, 12))
          play('lose')
        }
      }, 1150),
    )
  }

  const paytable = useMemo(
    () =>
      symbols
        .map((s, i) => ({ s, p: payFor(i) }))
        .slice()
        .reverse(),
    [symbols],
  )

  return (
    <GameLayout
      stage={
        <Stage>
          <div className="relative overflow-hidden px-4 py-6 sm:px-8 sm:py-8">
            <div className="pointer-events-none absolute inset-0 bg-grid opacity-30" />
            <div className="relative mx-auto max-w-[560px]">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="rounded-md border border-gold/25 bg-gold/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gold">
                    {linesCount} linhas
                  </span>
                  <span className="rounded-md border border-line bg-black/30 px-2 py-1 text-[10px] font-semibold text-white/40">
                    {String(game.config.volatility ?? 'medium') === 'high' ? 'Alta volatilidade' : String(game.config.volatility ?? 'medium') === 'low' ? 'Baixa volatilidade' : 'Média volatilidade'}
                  </span>
                </div>
                <div className="flex gap-1">
                  {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
                    <span key={i} className={`h-1.5 w-1.5 rounded-full ${spinning ? 'animate-pulse bg-gold' : 'bg-white/15'}`} style={{ animationDelay: `${i * 90}ms` }} />
                  ))}
                </div>
              </div>

              <div className="relative rounded-2xl border-2 border-[#2a2010] bg-gradient-to-b from-[#1c1508] to-[#0c0904] p-2.5 shadow-[inset_0_0_40px_rgba(0,0,0,.8),0_20px_50px_rgba(0,0,0,.5)]">
                <div className="grid grid-cols-3 gap-2">
                  {grid.map((col, c) => (
                    <div key={c} className="grid grid-rows-3 gap-2">
                      {col.map((sym, r) => {
                        const isWin = winLines.some((li) => lines[li][c] === r)
                        return (
                          <div
                            key={r}
                            className={`reel ${isWin ? 'animate-winFlash border-gold/60 bg-gold/10 shadow-[0_0_22px_rgba(255,200,87,.28)]' : ''} ${spinning ? '' : 'animate-popIn'}`}
                            style={spinning ? undefined : { animationDelay: `${(c * 3 + r) * 45}ms` }}
                          >
                            {sym}
                          </div>
                        )
                      })}
                    </div>
                  ))}
                </div>
                {win > 0 && (
                  <div className="pointer-events-none absolute inset-0 grid place-items-center">
                    <div className="animate-winFlash rounded-xl border border-gold/40 bg-black/80 px-5 py-3 text-center shadow-2xl">
                      <p className="text-[10px] font-bold uppercase tracking-[.2em] text-gold">Ganhaste</p>
                      <p className="font-display text-2xl font-extrabold text-white">{fmt(win)} B$</p>
                    </div>
                    {Array.from({ length: 18 }, (_, i) => (
                      <span
                        key={i}
                        className="confetti"
                        style={{
                          left: `${10 + Math.random() * 80}%`,
                          top: `${20 + Math.random() * 40}%`,
                          background: ['#ffc857', '#ff2d3f', '#22e3a0', '#5ee7ff'][i % 4],
                          animationDelay: `${Math.random() * 0.5}s`,
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <ActionButton tone="ghost" size="compact" onClick={() => setShowPay((v) => !v)}>
                  Tabela de prémios
                </ActionButton>
                <div className="text-right">
                  <p className="text-[9px] uppercase tracking-wider text-white/30">Ganho</p>
                  <p className={`text-lg font-extrabold tabular ${win > 0 ? 'text-gold' : 'text-white/40'}`}>{fmt(win)} B$</p>
                </div>
              </div>
              {showPay && (
                <div className="mt-3 grid grid-cols-4 gap-1.5 rounded-xl border border-line/70 bg-black/30 p-2 sm:grid-cols-7">
                  {paytable.map(({ s, p }) => (
                    <div key={s} className="rounded-lg bg-white/[.03] p-2 text-center">
                      <p className="text-lg">{s}</p>
                      <p className="text-[9px] font-bold text-gold">×{p}</p>
                    </div>
                  ))}
                </div>
              )}
              <ResultBanner
                state={win > 0 ? 'win' : history.length > 0 ? 'lose' : 'idle'}
                text={win > 0 ? `+${fmt(win)} B$` : 'Sem ganho neste giro.'}
              />
            </div>
          </div>
        </Stage>
      }
      side={
        <div className="space-y-4">
          <SidePanel title="Aposta">
            <BetInput value={amount} onChange={setAmount} min={min} max={max} disabled={spinning} />
            <div className="mt-3 space-y-1.5">
              <Payout label="Por linha" value={`${fmt(betPerLine)} B$`} />
              <Payout label="Linhas ativas" value={String(linesCount)} />
              <Payout label="Saldo" value={`${fmt(balance)} B$`} />
            </div>
            <ActionButton tone="gold" icon="gift" loading={spinning} onClick={spin} disabled={spinning} className="mt-3">
              {spinning ? 'A girar…' : `Girar · ${fmt(amount)} B$`}
            </ActionButton>
          </SidePanel>
          <SidePanel title="Últimos giros">
            <RecentStrip
              items={history}
              colorFor={(v) => (String(v).startsWith('+') ? 'text-gold border-gold/30' : 'text-white/30')}
            />
          </SidePanel>
        </div>
      }
    />
  )
}
