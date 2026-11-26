import { useEffect, useMemo, useRef, useState } from 'react'
import type { Game } from '../lib/types'
import { fmt, clamp } from '../lib/format'
import { rand, pick } from '../lib/rng'
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

const DEFAULT_SYMBOLS = ['🍒', '🍋', '🍊', '🍇', '🔔', '⭐', '7️⃣']
const WILD = '⭐'
const JACKPOT = '7️⃣'

function payFor(index: number): number {
  return [3, 4, 6, 9, 14, 25, 60][Math.max(0, Math.min(index, 6))]
}

export function SlotsGame({ game }: { game: Game }) {
  const configuredSymbols = (game.config.symbols as string[] | undefined) ?? []
  const symbols = configuredSymbols.length > 0 ? Array.from(new Set(configuredSymbols)) : DEFAULT_SYMBOLS
  const rawLines = Number(game.config.lines ?? 5)
  const linesCount = clamp(Number.isFinite(rawLines) ? Math.round(rawLines) : 5, 1, LINE_PATTERNS.length)
  const rows = 3
  const min = game.minBet
  const max = game.maxBet
  const { balance, placeBet, payout } = useWallet()
  const { play } = useSound()

  const [amount, setAmount] = useState(min)
  const [activeLines, setActiveLines] = useState(linesCount)
  const [grid, setGrid] = useState<string[][]>(() => Array.from({ length: 3 }, () => Array.from({ length: rows }, () => pick(symbols))))
  const [spinning, setSpinning] = useState(false)
  const [stoppedCols, setStoppedCols] = useState<number[]>([])
  const [win, setWin] = useState(0)
  const [winLines, setWinLines] = useState<number[]>([])
  const [history, setHistory] = useState<string[]>([])
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])
  const rollingRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const stopped = useRef<Set<number>>(new Set())

  useEffect(() => () => {
    if (rollingRef.current) clearInterval(rollingRef.current)
    timers.current.forEach(clearTimeout)
    timers.current = []
  }, [])

  const lines = LINE_PATTERNS.slice(0, activeLines)
  const betPerLine = amount / activeLines
  const hasWild = symbols.includes(WILD)

  const spin = () => {
    if (spinning) return
    if (!placeBet(amount, game.name, game.id, `${activeLines} linhas`)) return
    setSpinning(true)
    setWin(0)
    setWinLines([])
    setStoppedCols([])
    play('spin')

    const result = Array.from({ length: 3 }, () => Array.from({ length: rows }, () => pick(symbols)))
    stopped.current = new Set()
    if (rollingRef.current) clearInterval(rollingRef.current)
    rollingRef.current = setInterval(() => {
      setGrid((prev) => prev.map((col, c) => (stopped.current.has(c) ? col : col.map(() => pick(symbols)))))
    }, 70)

    timers.current.forEach(clearTimeout)
    timers.current = []
    ;[450, 750, 1050].forEach((delay, c) => {
      timers.current.push(
        setTimeout(() => {
          stopped.current.add(c)
          setStoppedCols((prev) => [...prev, c])
          setGrid((prev) => prev.map((col, i) => (i === c ? result[c] : col)))
          play('tick')
        }, delay),
      )
    })

    timers.current.push(
      setTimeout(() => {
        if (rollingRef.current) clearInterval(rollingRef.current)
        rollingRef.current = null
        setGrid(result)
        const hits: number[] = []
        let total = 0
        lines.forEach((pattern, li) => {
          const visible = pattern.map((row, c) => result[c][row])
          const base = visible.find((s) => !hasWild || s !== WILD) ?? visible[0]
          const matches = visible.every((s) => s === base || (hasWild && s === WILD))
          if (!matches) return
          const idx = symbols.indexOf(base)
          if (idx < 0) return
          hits.push(li)
          total += betPerLine * payFor(idx)
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
        .map((s, i) => ({
          s,
          p: payFor(i),
          tag: s === WILD ? 'Curinga' : s === JACKPOT ? 'Jackpot' : '',
        }))
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
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="rounded-md border border-gold/25 bg-gold/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-gold">
                    {activeLines} linhas
                  </span>
                  <span className="rounded-md border border-line bg-black/30 px-2 py-1 text-[10px] font-semibold text-white/40">
                    {String(game.config.volatility ?? 'medium') === 'high' ? 'Alta volatilidade' : String(game.config.volatility ?? 'medium') === 'low' ? 'Baixa volatilidade' : 'Média volatilidade'}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider text-white/35">Linhas</span>
                  <button
                    type="button"
                    aria-label="Menos linhas"
                    disabled={spinning || activeLines <= 1}
                    onClick={() => setActiveLines((v) => Math.max(1, v - 1))}
                    className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-white/[.04] text-lg text-white/70 transition hover:border-white/30 hover:text-white disabled:opacity-35"
                  >
                    −
                  </button>
                  <span className="w-7 text-center text-sm font-extrabold tabular text-white">{activeLines}</span>
                  <button
                    type="button"
                    aria-label="Mais linhas"
                    disabled={spinning || activeLines >= linesCount}
                    onClick={() => setActiveLines((v) => Math.min(linesCount, v + 1))}
                    className="grid h-11 w-11 place-items-center rounded-xl border border-line bg-white/[.04] text-lg text-white/70 transition hover:border-white/30 hover:text-white disabled:opacity-35"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="relative rounded-2xl border-2 border-[#2a2010] bg-gradient-to-b from-[#1c1508] to-[#0c0904] p-2.5 shadow-[inset_0_0_40px_rgba(0,0,0,.8),0_20px_50px_rgba(0,0,0,.5)]">
                <div className="relative">
                  <div className="grid grid-cols-3 gap-2">
                    {grid.map((col, c) => (
                      <div key={c} className="grid grid-rows-3 gap-2">
                        {col.map((sym, r) => {
                          const isWin = winLines.some((li) => lines[li][c] === r)
                          const rolling = spinning && !stoppedCols.includes(c)
                          const anim = rolling ? 'animate-pulse blur-[1px]' : isWin ? 'animate-winFlash' : 'animate-popIn'
                          return (
                            <div
                              key={r}
                              className={`reel ${anim} ${isWin ? 'border-gold/60 bg-gold/10 shadow-[0_0_22px_rgba(255,200,87,.28)]' : ''}`}
                              style={rolling ? { transition: 'filter .18s ease' } : { animationDelay: `${(c * 3 + r) * 45}ms` }}
                            >
                              {sym}
                            </div>
                          )
                        })}
                      </div>
                    ))}
                  </div>
                  <div className="pointer-events-none absolute inset-0" aria-hidden="true">
                    <svg viewBox="0 0 300 300" preserveAspectRatio="none" className="h-full w-full">
                      {lines.map((pattern, li) => {
                        const winning = winLines.includes(li)
                        return (
                          <polyline
                            key={li}
                            points={pattern.map((r, c) => `${(c + 0.5) * 100},${(r + 0.5) * 100}`).join(' ')}
                            fill="none"
                            stroke={winning ? '#ffc857' : 'rgba(255,200,87,.18)'}
                            strokeWidth={winning ? 2.5 : 1}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            vectorEffect="non-scaling-stroke"
                            opacity={spinning ? 0.25 : 1}
                          />
                        )
                      })}
                    </svg>
                  </div>
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
                          left: `${10 + rand() * 80}%`,
                          top: `${20 + rand() * 40}%`,
                          background: ['#ffc857', '#ff2d3f', '#22e3a0', '#5ee7ff'][i % 4],
                          animationDelay: `${rand() * 0.5}s`,
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-4 flex items-end justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-[.14em] text-white/40">Tabela de prémios · 3 iguais</p>
                  <p className="mt-0.5 truncate text-[10px] text-white/30">
                    {hasWild ? '⭐ substitui qualquer símbolo · ' : ''}7️⃣ jackpot ×60
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-[9px] uppercase tracking-wider text-white/30">Ganho</p>
                  <p className={`text-lg font-extrabold tabular ${win > 0 ? 'text-gold' : 'text-white/40'}`}>{fmt(win)} B$</p>
                </div>
              </div>
              <div className="mt-2 grid grid-cols-4 gap-1.5 rounded-xl border border-line/70 bg-black/30 p-2 sm:grid-cols-7">
                {paytable.map(({ s, p, tag }) => (
                  <div key={s} className="min-w-0 rounded-lg bg-white/[.03] px-1 py-1.5 text-center">
                    <p className="text-base leading-none sm:text-lg">{s}</p>
                    <p className="mt-1 text-[10px] font-bold text-gold">×{p}</p>
                    {tag && <p className="truncate text-[8px] uppercase tracking-wide text-white/35">{tag}</p>}
                  </div>
                ))}
              </div>
              <ResultBanner
                state={win > 0 ? 'win' : history.length > 0 ? 'lose' : 'idle'}
                text={win > 0 ? `+${fmt(win)} B$` : 'Sem ganho neste giro.'}
              />
            </div>
          </div>
          <div className="bet-bar relative z-10 mt-3 rounded-2xl border border-white/10 bg-[#05060a]/95 p-3 shadow-[0_-8px_30px_rgba(0,0,0,.45)]">
            <BetInput value={amount} onChange={setAmount} min={min} max={max} disabled={spinning} />
            <ActionButton
              tone={spinning ? 'placed' : 'bet'}
              icon="gift"
              loading={spinning}
              onClick={spin}
              disabled={spinning}
              className="mt-3"
            >
              {spinning ? 'A girar…' : `Girar · ${fmt(amount)} B$`}
            </ActionButton>
          </div>
        </Stage>
      }
      side={
        <div className="space-y-4">
          <SidePanel title="Detalhes da aposta">
            <div className="space-y-1.5">
              <Payout label="Por linha" value={`${fmt(betPerLine)} B$`} />
              <Payout label="Linhas ativas" value={String(activeLines)} />
              <Payout label="Saldo" value={`${fmt(balance)} B$`} />
            </div>
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
