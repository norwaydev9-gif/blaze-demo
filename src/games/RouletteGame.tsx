import { useEffect, useMemo, useRef, useState } from 'react'
import type { Game } from '../lib/types'
import { fmt } from '../lib/format'
import { randInt, uid } from '../lib/rng'
import { useWallet } from '../lib/wallet'
import { useSound } from '../lib/sound'
import { ActionButton, GameLayout, Payout, RecentStrip, ResultBanner, SidePanel, Stage } from '../components/GameUI'

const RED = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36])

interface Bet {
  id: string
  label: string
  numbers: number[]
  payout: number
  amount: number
}

function colorOf(n: number): 'red' | 'black' | 'green' {
  if (n === 0 || n === 37) return 'green'
  return RED.has(n) ? 'red' : 'black'
}

function labelOf(n: number): string {
  return n === 37 ? '00' : String(n)
}

export function RouletteGame({ game }: { game: Game }) {
  const american = String(game.config.type ?? 'european') === 'american'
  const pool = american ? 38 : 37
  const { balance, placeBet, payout } = useWallet()
  const { play } = useSound()
  const [chip, setChip] = useState(50)
  const [bets, setBets] = useState<Bet[]>([])
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<number | null>(null)
  const [rotation, setRotation] = useState(0)
  const [history, setHistory] = useState<number[]>([])
  const [lastWin, setLastWin] = useState(0)
  const settleTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => () => {
    if (settleTimer.current) clearTimeout(settleTimer.current)
  }, [])

  const total = bets.reduce((s, b) => s + b.amount, 0)

  const order = useMemo(
    () => (american ? [0, ...Array.from({ length: 36 }, (_, i) => i + 1), 37] : [0, ...Array.from({ length: 36 }, (_, i) => i + 1)]),
    [american],
  )
  const segment = 360 / pool
  const wheelGradient = useMemo(
    () =>
      `conic-gradient(from ${-segment / 2}deg, ${order
        .map((n, i) => {
          const c = colorOf(n) === 'red' ? '#c31226' : colorOf(n) === 'green' ? '#22a06b' : '#15181f'
          return `${c} ${(i * segment).toFixed(3)}deg ${((i + 1) * segment).toFixed(3)}deg`
        })
        .join(', ')})`,
    [order, segment],
  )

  const addBet = (label: string, numbers: number[], pay: number) => {
    if (spinning) return
    setBets((prev) => {
      const found = prev.find((b) => b.label === label)
      if (found) return prev.map((b) => (b.id === found.id ? { ...b, amount: b.amount + chip } : b))
      return [...prev, { id: uid(), label, numbers, payout: pay, amount: chip }]
    })
    play('tick')
  }

  const clear = () => {
    if (!spinning) setBets([])
  }

  const spin = () => {
    if (spinning || total === 0) return
    if (!placeBet(total, game.name, game.id, `${bets.length} apostas`)) return
    setSpinning(true)
    setResult(null)
    setLastWin(0)
    const outcome = randInt(0, pool - 1) // 37 = 00 on american
    const landingIndex = outcome === 37 ? pool - 1 : outcome
    const jitter = randInt(-Math.round(segment * 0.22), Math.round(segment * 0.22))
    setRotation((r) => r + 360 * 6 + (360 - ((r + landingIndex * segment) % 360)) % 360 + jitter)
    play('spin')
    settleTimer.current = setTimeout(() => {
      settleTimer.current = null
      setResult(outcome)
      setSpinning(false)
      setHistory((h) => [outcome, ...h].slice(0, 16))
      let win = 0
      bets.forEach((b) => {
        if (b.numbers.includes(outcome)) win += b.amount * b.payout
      })
      setLastWin(win)
      if (win > 0) {
        payout(win, game.name, game.id, `Saiu ${labelOf(outcome)}`)
        play('win')
      } else play('lose')
    }, 3500)
  }

  const outside: { label: string; numbers: number[]; pay: number; color?: string }[] = [
    { label: 'Vermelho', numbers: [...RED], pay: 2, color: 'bg-[#c31226]' },
    { label: 'Preto', numbers: Array.from({ length: 36 }, (_, i) => i + 1).filter((n) => !RED.has(n)), pay: 2, color: 'bg-[#15181f]' },
    { label: 'Par', numbers: Array.from({ length: 36 }, (_, i) => i + 1).filter((n) => n % 2 === 0), pay: 2 },
    { label: 'Ímpar', numbers: Array.from({ length: 36 }, (_, i) => i + 1).filter((n) => n % 2 === 1), pay: 2 },
    { label: '1–18', numbers: Array.from({ length: 18 }, (_, i) => i + 1), pay: 2 },
    { label: '19–36', numbers: Array.from({ length: 18 }, (_, i) => i + 19), pay: 2 },
  ]

  const numbers = useMemo(() => {
    const base = Array.from({ length: 36 }, (_, i) => i + 1)
    return base
  }, [])

  return (
    <GameLayout
      stage={
        <Stage>
          <div className="p-3 sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="relative h-24 w-24 shrink-0 sm:h-32 sm:w-32">
                <div
                  className={`absolute inset-0 rounded-full border-4 border-[#221a10] shadow-[0_10px_30px_rgba(0,0,0,.5)] ${spinning ? 'wheel-spin' : ''}`}
                  style={{
                    background: wheelGradient,
                    transform: `rotate(${rotation}deg)`,
                    transitionDuration: spinning ? '3.4s' : undefined,
                  }}
                >
                  <div className="absolute inset-[18%] rounded-full border border-white/20 bg-gradient-to-b from-[#141822] to-[#080a10] shadow-[inset_0_0_18px_rgba(0,0,0,.8)]" />
                  <div className="absolute left-1/2 top-1/2 grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-[#221a10] bg-[#0b0e15] text-[9px] font-bold text-white/50">
                    {american ? '00' : '0'}
                  </div>
                </div>
                <div className="absolute left-1/2 top-[-4px] h-0 w-0 -translate-x-1/2 border-x-[6px] border-t-[10px] border-x-transparent border-t-white game-pulse" />
              </div>
              <div className="min-w-0 flex-1 text-right">
                <p className="label">Resultado</p>
                <p
                  className={`font-display text-3xl font-extrabold tabular sm:text-4xl ${
                    result === null ? 'text-white/25' : colorOf(result) === 'red' ? 'text-brand' : colorOf(result) === 'green' ? 'text-good animate-pulseGlow' : 'text-white'
                  } ${result !== null && !spinning ? 'animate-popIn' : ''}`}
                >
                  {result === null ? '—' : labelOf(result)}
                </p>
                {result !== null && !spinning && (
                  <p className={`text-[11px] font-bold ${lastWin > 0 ? 'text-good' : 'text-white/35'}`}>
                    {lastWin > 0 ? `+${fmt(lastWin)} B$` : 'Sem prémio'}
                  </p>
                )}
              </div>
            </div>

            {bets.length > 0 && (
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                {bets.map((b) => (
                  <span key={b.id} className="chip chip-active px-2 py-1 text-[10px]">
                    {b.label} · {fmt(b.amount)} <span className="font-bold text-gold">×{b.payout}</span>
                  </span>
                ))}
                <span className="ml-auto text-[10px] font-bold tabular text-white/50">Total {fmt(total)} B$</span>
              </div>
            )}
            <div className="mb-2 flex items-center gap-2">
              <span className="shrink-0 text-[9px] font-bold uppercase tracking-wider text-white/30">Últimos</span>
              <div className="no-scrollbar flex min-w-0 flex-1 gap-1 overflow-x-auto">
                {history.length === 0 ? (
                  <span className="text-[10px] text-white/20">sem resultados</span>
                ) : (
                  history.slice(0, 14).map((n, i) => (
                    <span
                      key={i}
                      className={`grid h-7 min-w-7 shrink-0 place-items-center rounded-full border px-1 text-[10px] font-bold tabular ${
                        colorOf(n) === 'red'
                          ? 'border-brand/40 bg-brand/10 text-brand'
                          : colorOf(n) === 'green'
                            ? 'border-white/25 bg-white/10 text-white'
                            : 'border-white/15 bg-white/[.03] text-white/55'
                      }`}
                    >
                      {labelOf(n)}
                    </span>
                  ))
                )}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1 sm:grid-cols-6">
              <ActionButton
                tone="ghost"
                size="compact"
                onClick={() => addBet('0', [0], 36)}
                className="relative text-white/80 hover:border-white/30 hover:bg-white/10"
              >
                <span className="absolute left-1 top-1 h-1.5 w-1.5 rounded-full bg-[#22a06b]" />
                0
                {bets.find((b) => b.label === '0') && <span className="absolute -right-1 -top-1 rounded-full bg-white/90 px-1 text-[8px] font-bold text-black">{bets.find((b) => b.label === '0')!.amount}</span>}
              </ActionButton>
              {numbers.map((n) => {
                const c = colorOf(n)
                const bet = bets.find((b) => b.label === String(n))
                return (
                  <ActionButton
                    key={n}
                    tone="ghost"
                    size="compact"
                    onClick={() => addBet(String(n), [n], 36)}
                    className="relative text-xs text-white/80 hover:border-white/30 hover:bg-white/10"
                  >
                    <span className={`absolute left-1 top-1 h-1.5 w-1.5 rounded-full ${c === 'red' ? 'bg-[#c31226]' : 'bg-white/25'}`} />
                    {n}
                    {bet && <span className="absolute -right-1 -top-1 rounded-full bg-white/90 px-1 text-[8px] font-bold text-black">{bet.amount}</span>}
                  </ActionButton>
                )
              })}
              {american && (
                <ActionButton
                  tone="ghost"
                  size="compact"
                  onClick={() => addBet('00', [37], 36)}
                  className="relative text-white/80 hover:border-white/30 hover:bg-white/10"
                >
                  <span className="absolute left-1 top-1 h-1.5 w-1.5 rounded-full bg-[#22a06b]" />
                  00
                  {bets.find((b) => b.label === '00') && <span className="absolute -right-1 -top-1 rounded-full bg-white/90 px-1 text-[8px] font-bold text-black">{bets.find((b) => b.label === '00')!.amount}</span>}
                </ActionButton>
              )}
            </div>

            <div className="mt-2 grid grid-cols-3 gap-1 sm:grid-cols-6">
              {outside.map((o) => (
                <ActionButton
                  key={o.label}
                  tone="ghost"
                  size="compact"
                  onClick={() => addBet(o.label, o.numbers, o.pay)}
                  className="relative border-white/10 bg-white/[.04] text-[11px] text-white/80 hover:border-white/30 hover:bg-white/10"
                >
                  {o.label}
                  {bets.find((b) => b.label === o.label) && (
                    <span className="absolute -right-1 -top-1 rounded-full bg-white/90 px-1 text-[8px] font-bold text-black">
                      {bets.find((b) => b.label === o.label)!.amount}
                    </span>
                  )}
                </ActionButton>
              ))}
            </div>
            <ResultBanner
              state={result === null || spinning ? 'idle' : lastWin > 0 ? 'win' : 'lose'}
              text={lastWin > 0 ? `+${fmt(lastWin)} B$` : 'Sem prémio nesta ronda.'}
            />
          </div>
          <div className="relative z-10 mt-3 rounded-2xl border border-white/10 bet-bar bg-[#05060a]/95 p-3 shadow-[0_-8px_30px_rgba(0,0,0,.45)]">
            <div>
              <span className="label">Ficha</span>
              <div className="mt-1.5 grid grid-cols-4 gap-1.5">
                {[10, 50, 100, 500].map((c) => (
                  <ActionButton
                    key={c}
                    tone="ghost"
                    size="compact"
                    onClick={() => setChip(c)}
                    className={chip === c ? 'border-white/50 bg-white/10 text-white' : ''}
                  >
                    {c}
                  </ActionButton>
                ))}
              </div>
            </div>
            <ActionButton
              tone={spinning ? 'placed' : 'bet'}
              icon="bolt"
              loading={spinning}
              onClick={spin}
              disabled={spinning || total === 0 || total > balance}
              className="mt-3"
            >
              {spinning ? 'A girar…' : total === 0 ? 'Coloca fichas' : `Girar · ${fmt(total)} B$`}
            </ActionButton>
            {bets.length > 0 && (
              <ActionButton tone="ghost" size="compact" onClick={clear} disabled={spinning} className="mt-2">
                Limpar apostas
              </ActionButton>
            )}
          </div>
        </Stage>
      }
      side={
        <div className="space-y-4">
          <SidePanel title="Aposta">
            <div className="space-y-1.5">
              <Payout label="Total apostado" value={`${fmt(total)} B$`} />
              <Payout label="Apostas" value={String(bets.length)} />
              <Payout label="Saldo" value={`${fmt(balance)} B$`} />
            </div>
          </SidePanel>
          <SidePanel title="Últimos números">
            <RecentStrip
              items={history.map((n) => labelOf(n))}
              colorFor={(v) => {
                const n = v === '00' ? 37 : Number(v)
                return colorOf(n) === 'red' ? 'text-brand border-brand/30' : colorOf(n) === 'green' ? 'text-good border-good/30' : 'text-white/50'
              }}
            />
            <p className="mt-3 text-[10px] leading-relaxed text-white/30">
              Roda {american ? 'americana' : 'europeia'} · {pool} números. Os pagamentos incluem a aposta.
            </p>
          </SidePanel>
        </div>
      }
    />
  )
}
