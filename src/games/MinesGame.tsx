import { useMemo, useState } from 'react'
import type { Game } from '../lib/types'
import { fmt, fmtMult, clamp } from '../lib/format'
import { randInt, shuffle } from '../lib/rng'
import { useWallet } from '../lib/wallet'
import { useSound } from '../lib/sound'
import { ActionButton, AutoBetControl, AutoControl, BetInput, GameLayout, Payout, RecentStrip, ResultBanner, SidePanel, Stage } from '../components/GameUI'
import { useAutoCashout, useAutoReplay } from '../lib/autoPlay'
import { Icon } from '../components/Icon'

function comb(n: number, k: number): number {
  if (k < 0 || k > n) return 0
  let r = 1
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i
  return r
}

export function MinesGame({ game }: { game: Game }) {
  const size = Number(game.config.grid ?? 5)
  const total = size * size
  const mineOptions = (game.config.mineOptions as number[] | undefined) ?? [3, 5, 8, 10]
  const min = game.minBet
  const max = game.maxBet
  const { balance, placeBet, payout } = useWallet()
  const { play } = useSound()

  const [amount, setAmount] = useState(min)
  const [minesCount, setMinesCount] = useState(mineOptions[0])
  const [mines, setMines] = useState<Set<number>>(new Set())
  const [opened, setOpened] = useState<Set<number>>(new Set())
  const [active, setActive] = useState(false)
  const [lost, setLost] = useState(false)
  const [cashed, setCashed] = useState<number | null>(null)
  const [history, setHistory] = useState<string[]>([])
  const [autoReplay, setAutoReplay] = useState(false)
  const [autoCash, setAutoCash] = useState(false)
  const [autoTarget, setAutoTarget] = useState(2)

  const multiplier = useMemo(() => {
    const k = opened.size
    if (k === 0) return 1
    const fair = comb(total, k) / comb(total - minesCount, k)
    return Math.max(1, fair * 0.99)
  }, [opened.size, total, minesCount])

  const start = () => {
    if (!placeBet(amount, game.name, game.id, `${minesCount} minas`)) return
    const pool = shuffle(Array.from({ length: total }, (_, i) => i))
    setMines(new Set(pool.slice(0, minesCount)))
    setOpened(new Set())
    setLost(false)
    setCashed(null)
    setActive(true)
    play('click')
  }

  const open = (i: number) => {
    if (!active || lost || opened.has(i)) return
    if (mines.has(i)) {
      setLost(true)
      setActive(false)
      setOpened((prev) => new Set([...prev, i]))
      setHistory((h) => [`${fmtMult(multiplier)} · mina`, ...h].slice(0, 12))
      play('lose')
      return
    }
    const next = new Set(opened)
    next.add(i)
    setOpened(next)
    play('tick')
    if (next.size === total - minesCount) {
      const k = next.size
      const final = (comb(total, k) / comb(total - minesCount, k)) * 0.99
      payout(amount * final, game.name, game.id, `Grelha limpa ${fmtMult(final)}`)
      setCashed(final)
      setActive(false)
      setHistory((h) => [`${fmtMult(final)} · limpo`, ...h].slice(0, 12))
      play('win')
    }
  }

  const cashout = () => {
    if (!active || opened.size === 0) return
    payout(amount * multiplier, game.name, game.id, `Retirada ${fmtMult(multiplier)}`)
    setCashed(multiplier)
    setActive(false)
    setHistory((h) => [fmtMult(multiplier), ...h].slice(0, 12))
    play('cashout')
  }

  const reset = () => {
    setActive(false)
    setOpened(new Set())
    setMines(new Set())
    setLost(false)
    setCashed(null)
  }

  useAutoCashout({ active, value: multiplier, target: autoTarget, enabled: autoCash, onCashout: cashout })
  useAutoReplay({ idle: !active, enabled: autoReplay, onStart: start })

  const revealAll = lost || cashed !== null
  const nextMult = useMemo(() => {
    const k = opened.size + 1
    if (k > total - minesCount) return multiplier
    return (comb(total, k) / comb(total - minesCount, k)) * 0.99
  }, [opened.size, total, minesCount, multiplier])

  return (
    <GameLayout
      stage={
        <Stage>
          <div className="flex items-center justify-between border-b border-line/70 px-4 py-3">
            <div>
              <p className="label">Multiplicador atual</p>
              <p className={`font-display text-2xl font-extrabold tabular ${cashed ? 'text-good' : 'text-white'}`}>
                {fmtMult(cashed ?? multiplier)}
              </p>
            </div>
            <div className="flex gap-4 text-right">
              <div>
                <p className="label">Campos abertos</p>
                <p className="text-sm font-bold tabular text-white/80">
                  {opened.size}/{total - minesCount}
                </p>
              </div>
              <div>
                <p className="label">Minas</p>
                <p className="text-sm font-bold tabular text-brand">{minesCount}</p>
              </div>
            </div>
          </div>
          <div className="p-3 sm:p-5">
            <div
              className="mx-auto grid max-w-[520px] gap-1.5 sm:gap-2"
              style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
            >
              {Array.from({ length: total }, (_, i) => {
                const isOpen = opened.has(i)
                const isMine = mines.has(i)
                const showMine = isMine && (lost || revealAll)
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={!active || isOpen}
                    onClick={() => open(i)}
                    className={`tile-mines transition-transform active:scale-95 ${isOpen && !isMine ? 'safe animate-popIn drop-shadow-[0_0_12px_rgba(34,227,160,.45)]' : ''} ${showMine ? 'mine game-pulse' : ''} ${
                      !active && !isOpen && !showMine ? 'opacity-60 hover:scale-[1.03]' : ''
                    }`}
                    style={{ fontSize: size >= 6 ? 18 : 22 }}
                  >
                    {isOpen && !isMine && '💎'}
                    {showMine && '💣'}
                    {!isOpen && !showMine && <span className="text-white/15">◇</span>}
                  </button>
                )
              })}
            </div>
            {cashed !== null && (
              <p className="mt-4 text-center text-xs font-semibold text-good">
                Retiraste {fmtMult(cashed)} — prémio de {fmt(amount * cashed)} B$
              </p>
            )}
            {lost && (
              <p className="mt-4 text-center text-xs font-semibold text-brand">
                Pisaste uma mina. Perdeste {fmt(amount)} B$.
              </p>
            )}
            {!active && cashed === null && !lost && (
              <p className="mt-4 text-center text-[11px] text-white/30">
                Define a aposta e o número de minas, depois inicia a ronda.
              </p>
            )}
            <ResultBanner
              state={cashed !== null ? 'win' : lost ? 'lose' : 'idle'}
              text={cashed !== null ? `+${fmt(amount * cashed)} B$` : lost ? `Perdeste ${fmt(amount)} B$.` : ''}
            />
          </div>
        </Stage>
      }
      side={
        <div className="space-y-4">
          <SidePanel title="Aposta">
            <BetInput value={amount} onChange={setAmount} min={min} max={max} disabled={active} />
            <div className="mt-3">
              <div className="mb-1.5 flex items-center justify-between">
                <span className="label">Minas</span>
                <span className="text-[10px] text-white/30">{total} campos</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {mineOptions.map((m) => (
                  <ActionButton
                    key={m}
                    tone="ghost"
                    size="compact"
                    disabled={active}
                    onClick={() => setMinesCount(m)}
                    className={minesCount === m ? 'border-brand/50 bg-brand/15 text-white' : ''}
                  >
                    {m}
                  </ActionButton>
                ))}
              </div>
            </div>
            <div className="mt-3 space-y-1.5">
              <Payout label="Próximo campo" value={fmtMult(nextMult)} />
              <Payout label="Prémio potencial" value={`${fmt(amount * nextMult)} B$`} />
              <Payout label="Saldo" value={`${fmt(balance)} B$`} />
            </div>
            {!active ? (
              <ActionButton tone="bet" icon="bolt" onClick={start} className="mt-3">
                {cashed !== null || lost ? 'Nova ronda' : `Jogar · ${fmt(amount)} B$`}
              </ActionButton>
            ) : (
              <ActionButton tone="cashout" icon="check" onClick={cashout} disabled={opened.size === 0} className="mt-3">
                Retirar {fmt(amount * multiplier)} B$
              </ActionButton>
            )}
            {(cashed !== null || lost) && (
              <ActionButton tone="ghost" size="compact" onClick={reset} className="mt-2">
                Limpar grelha
              </ActionButton>
            )}
            <AutoBetControl active={autoReplay} onToggle={() => setAutoReplay((v) => !v)} />
            <AutoControl
              value={autoTarget}
              onValueChange={setAutoTarget}
              active={autoCash}
              onToggle={() => setAutoCash((v) => !v)}
            />
          </SidePanel>
          <SidePanel title="Histórico">
            <RecentStrip items={history} colorFor={(v) => (String(v).includes('mina') ? 'text-brand border-brand/30' : 'text-good border-good/30')} />
            <div className="mt-4 rounded-xl border border-line/60 bg-black/20 p-3">
              <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-white/40">
                <Icon name="info" size={12} /> Multiplicadores
              </p>
              <p className="mt-1.5 text-[10px] leading-relaxed text-white/30">
                Cada campo seguro aumenta o multiplicador. Quanto mais minas escolheres, maior o risco e o prémio.
                A margem da casa é de 1%.
              </p>
            </div>
          </SidePanel>
        </div>
      }
    />
  )
}
