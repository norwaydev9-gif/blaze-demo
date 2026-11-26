import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { Game } from '../lib/types'
import { clamp, fmt, fmtMult } from '../lib/format'
import { pick, rand, randInt } from '../lib/rng'
import { useSound } from '../lib/sound'
import {
  BetInput, GameLayout, Payout, RecentStrip, ResultBanner, SidePanel, Stage,
} from '../components/GameUI'
import { configList, configNum, Fairness, newSeed, useStake, type Stake } from './helpers'

type Status = 'idle' | 'win' | 'lose' | 'push'

interface QuickShellProps {
  game: Game
  bet: Stake
  display: string
  caption: string
  status: Status
  message: string
  history: string[]
  controls: ReactNode
  onPlay: () => void
  busy: boolean
  label: string
  stage?: ReactNode
  extra?: ReactNode
  seed: string
}

function QuickShell({
  game, bet, display, caption, status, message, history, controls, onPlay, busy, label, stage, extra, seed,
}: QuickShellProps) {
  return (
    <GameLayout
      stage={
        <Stage>
          <div className="relative w-full px-4 py-6 text-center sm:px-8 sm:py-8">
            <div className="pointer-events-none absolute inset-0 bg-grid opacity-25" />
            <div className="relative">
              <p className="label">{caption}</p>
              <p
                className={`font-display text-[clamp(42px,9vw,76px)] font-extrabold leading-none tabular transition-colors ${
                  status === 'win' ? 'text-good' : status === 'lose' ? 'text-brand' : status === 'push' ? 'text-gold' : 'text-white'
                }`}
              >
                {display}
              </p>
            </div>
            {stage && <div className="relative mx-auto mt-6 w-full max-w-[620px]">{stage}</div>}
            <div className="relative mx-auto mt-6 max-w-[620px]">
              <ResultBanner state={status} text={message} />
            </div>
          </div>
        </Stage>
      }
      side={
        <div className="space-y-4">
          <SidePanel title="Aposta">
            <BetInput value={bet.amount} onChange={bet.setAmount} min={bet.min} max={bet.max} disabled={busy} />
            <div className="mt-3 space-y-1.5">
              {extra}
              <Payout label="Saldo" value={`${fmt(bet.balance)} B$`} />
            </div>
            <div className="mt-3">{controls}</div>
            <button type="button" onClick={onPlay} disabled={busy} className="btn-primary mt-4 w-full py-3 text-sm">
              {busy ? 'A processar…' : `${label} · ${fmt(bet.amount)} B$`}
            </button>
          </SidePanel>
          <SidePanel title="Histórico">
            <RecentStrip items={history} />
            <div className="mt-4">
              <Fairness seed={seed} compact />
            </div>
            <p className="mt-3 text-[10px] leading-relaxed text-white/30">{game.rules}</p>
          </SidePanel>
        </div>
      }
    />
  )
}

/* ------------------------------------------------------------------ PLINKO */

export function PlinkoGame({ game }: { game: Game }) {
  const rows = clamp(configNum(game, 'rows', 12), 6, 16)
  const bet = useStake(game)
  const { play } = useSound()
  const [risk, setRisk] = useState<'low' | 'medium' | 'high'>('medium')
  const [path, setPath] = useState<number[]>([])
  const [slot, setSlot] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('Escolhe o risco e deixa cair a bola.')
  const [history, setHistory] = useState<string[]>([])
  const [seed, setSeed] = useState(() => newSeed())
  const timers = useRef<ReturnType<typeof setTimeout>[]>([])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const multipliers = useMemo(() => {
    const peak = risk === 'low' ? 4 : risk === 'medium' ? 12 : 40
    const step = risk === 'low' ? 0.45 : risk === 'medium' ? 1.6 : 5
    return Array.from({ length: rows + 1 }, (_, i) =>
      Math.max(0.2, Math.round((peak - Math.abs(i - rows / 2) * step) * 100) / 100),
    )
  }, [rows, risk])

  const playRound = () => {
    if (busy || !bet.stake(`Plinko ${risk}`)) return
    const currentSeed = newSeed()
    setSeed(currentSeed)
    setBusy(true)
    setStatus('idle')
    setPath([])
    setSlot(null)
    setMessage('A bola está a cair…')
    play('spin')

    const steps: number[] = []
    let position = 0
    for (let i = 0; i < rows; i++) {
      position += rand() < 0.5 ? 0 : 1
      steps.push(position)
      timers.current.push(setTimeout(() => {
        setPath((prev) => [...prev, position])
        play('tick')
      }, 90 * (i + 1)))
    }
    timers.current.push(setTimeout(() => {
      const multiplier = multipliers[position]
      setSlot(position)
      setBusy(false)
      if (multiplier > 1) {
        const value = bet.win(multiplier, bet.amount, `Plinko ${fmtMult(multiplier)}`)
        setStatus('win')
        setMessage(`Compartimento ${position + 1}: +${fmt(value)} B$.`)
        setHistory((h) => [fmtMult(multiplier), ...h].slice(0, 14))
        play('win')
      } else {
        setStatus('lose')
        setMessage(`Compartimento ${position + 1}. Sem ganho.`)
        setHistory((h) => ['—', ...h].slice(0, 14))
        play('lose')
      }
    }, 90 * (rows + 1)))
  }

  const stage = (
    <div className="rounded-2xl border border-line/70 bg-black/25 p-3">
      <div className="mb-2 flex items-center justify-between text-[10px] text-white/30">
        <span>0</span><span>{rows} linhas</span><span>{rows}</span>
      </div>
      <div className="space-y-1">
        {Array.from({ length: rows }, (_, row) => (
          <div key={row} className="flex justify-center gap-1.5">
            {Array.from({ length: row + 2 }, (_, i) => {
              const active = path.length > row && path[row] === i
              return (
                <span
                  key={i}
                  className={`h-2.5 w-2.5 rounded-full transition-all ${active ? 'bg-gold shadow-[0_0_12px_#ffc857]' : 'bg-white/10'}`}
                />
              )
            })}
          </div>
        ))}
      </div>
      <div className="mt-2 grid gap-1" style={{ gridTemplateColumns: `repeat(${rows + 1}, minmax(0,1fr))` }}>
        {multipliers.map((m, i) => (
          <div
            key={i}
            className={`rounded-md border px-0.5 py-1.5 text-center text-[9px] font-bold tabular transition ${
              slot === i ? 'border-gold bg-gold/20 text-gold' : m > 1 ? 'border-good/20 bg-good/[.06] text-good' : 'border-line/60 bg-white/[.02] text-white/25'
            }`}
          >
            {m.toFixed(1)}
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <QuickShell
      game={game}
      bet={bet}
      display={slot === null ? '×' : fmtMult(multipliers[slot])}
      caption="Multiplicador do compartimento"
      status={status}
      message={message}
      history={history}
      onPlay={playRound}
      busy={busy}
      label="Deixar cair"
      seed={seed}
      stage={stage}
      extra={<Payout label="Prémio máximo" value={fmtMult(Math.max(...multipliers))} />}
      controls={
        <div className="grid grid-cols-3 gap-1.5">
          {(['low', 'medium', 'high'] as const).map((r) => (
            <button
              key={r}
              type="button"
              disabled={busy}
              onClick={() => setRisk(r)}
              className={`rounded-lg border py-2 text-[11px] font-bold capitalize transition ${
                risk === r ? 'border-brand/50 bg-brand/15 text-white' : 'border-line text-white/40 hover:text-white'
              }`}
            >
              {r === 'low' ? 'Baixo' : r === 'medium' ? 'Médio' : 'Alto'}
            </button>
          ))}
        </div>
      }
    />
  )
}

/* ------------------------------------------------------------------- LIMBO */

export function LimboGame({ game }: { game: Game }) {
  const maxMult = configNum(game, 'maxMult', 1000)
  const bet = useStake(game)
  const { play } = useSound()
  const [target, setTarget] = useState(2)
  const [result, setResult] = useState<number | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('Define um alvo e tenta ultrapassá-lo.')
  const [history, setHistory] = useState<string[]>([])
  const [seed, setSeed] = useState(() => newSeed())

  const playRound = () => {
    if (!bet.stake(`Limbo ${fmtMult(target)}`)) return
    const crash = Math.min(maxMult, Math.max(1, 0.99 / (1 - rand() * 0.99)))
    setSeed(newSeed())
    setResult(crash)
    setHistory((h) => [fmtMult(crash), ...h].slice(0, 14))
    if (crash >= target) {
      const value = bet.win(target, bet.amount, `Limbo ${fmtMult(target)}`)
      setStatus('win')
      setMessage(`Alvo atingido: +${fmt(value)} B$.`)
      play('win')
    } else {
      setStatus('lose')
      setMessage(`O resultado parou em ${fmtMult(crash)}.`)
      play('lose')
    }
  }

  return (
    <QuickShell
      game={game}
      bet={bet}
      display={result === null ? fmtMult(target) : fmtMult(Math.min(result, target))}
      caption={result === null ? 'Alvo escolhido' : 'Resultado'}
      status={status}
      message={message}
      history={history}
      onPlay={playRound}
      busy={false}
      label="Jogar"
      seed={seed}
      extra={<Payout label="Teto" value={fmtMult(maxMult)} />}
      controls={
        <label className="block">
          <span className="label">Alvo multiplicador</span>
          <input
            type="number"
            min={1.01}
            step={0.1}
            max={maxMult}
            value={target}
            onChange={(e) => setTarget(clamp(Number(e.target.value) || 1.01, 1.01, maxMult))}
            className="input mt-1.5 text-center text-base font-bold tabular"
          />
        </label>
      }
    />
  )
}

/* -------------------------------------------------------------------- KENO */

export function KenoGame({ game }: { game: Game }) {
  const pool = clamp(configNum(game, 'pool', 80), 20, 100)
  const drawCount = clamp(configNum(game, 'draw', 20), 5, pool)
  const bet = useStake(game)
  const { play } = useSound()
  const [picks, setPicks] = useState<number[]>([])
  const [drawn, setDrawn] = useState<number[]>([])
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('Escolhe até 10 números.')
  const [history, setHistory] = useState<string[]>([])
  const [seed, setSeed] = useState(() => newSeed())

  const hits = drawn.filter((n) => picks.includes(n)).length
  const payout = (() => {
    const table = [0, 1, 2, 4, 9, 24, 70, 220, 900, 4000, 12000]
    return Math.min(12000, (table[Math.min(hits, 10)] ?? 0) * (picks.length / 5))
  })()

  const toggle = (n: number) => {
    setPicks((prev) => prev.includes(n) ? prev.filter((x) => x !== n) : prev.length < 10 ? [...prev, n] : prev)
  }

  const playRound = () => {
    if (picks.length === 0) {
      setMessage('Escolhe pelo menos um número.')
      return
    }
    if (!bet.stake(`Keno ${picks.length} números`)) return
    const numbers: number[] = []
    while (numbers.length < drawCount) {
      const n = randInt(1, pool)
      if (!numbers.includes(n)) numbers.push(n)
    }
    setSeed(newSeed())
    setDrawn(numbers)
    const match = numbers.filter((n) => picks.includes(n)).length
    setHistory((h) => [`${match}/${picks.length}`, ...h].slice(0, 14))
    const mult = Math.min(12000, ([0, 1, 2, 4, 9, 24, 70, 220, 900, 4000, 12000][Math.min(match, 10)] ?? 0) * (picks.length / 5))
    if (mult > 0) {
      const value = bet.win(mult, bet.amount, `Keno ${match} acertos`)
      setStatus('win')
      setMessage(`${match} acerto(s): +${fmt(value)} B$.`)
      play('win')
    } else {
      setStatus('lose')
      setMessage(`${match} acerto(s). Sem prémio nesta ronda.`)
      play('lose')
    }
  }

  const stage = (
    <div className="rounded-2xl border border-line/70 bg-black/25 p-3">
      <div className="mb-2 flex items-center justify-between text-[10px] text-white/30">
        <span>Escolhidos: {picks.length}</span>
        <span>Sorteados: {drawCount}</span>
      </div>
      <div className="no-scrollbar grid max-h-[264px] grid-cols-5 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-10 sm:gap-1">
        {Array.from({ length: pool }, (_, i) => i + 1).map((n) => {
          const chosen = picks.includes(n)
          const drawnNumber = drawn.includes(n)
          return (
            <button
              key={n}
              type="button"
              onClick={() => toggle(n)}
              className={`h-11 rounded-md border text-[11px] font-bold tabular transition sm:h-9 sm:text-[10px] ${
                drawnNumber && chosen ? 'border-gold bg-gold/25 text-gold' : chosen ? 'border-brand bg-brand/20 text-white' : drawnNumber ? 'border-white/20 bg-white/[.06] text-white/60' : 'border-line/60 bg-white/[.02] text-white/30 hover:text-white'
              }`}
            >
              {n}
            </button>
          )
        })}
      </div>
      {drawn.length > 0 && (
        <p className="mt-2 truncate text-center text-[10px] text-white/40">Sorteados: {drawn.slice(0, 24).join(', ')}{drawn.length > 24 ? '…' : ''}</p>
      )}
    </div>
  )

  return (
    <QuickShell
      game={game}
      bet={bet}
      display={`${hits}/${picks.length || '—'}`}
      caption="Acertos"
      status={status}
      message={message}
      history={history}
      onPlay={playRound}
      busy={false}
      label="Sortear"
      seed={seed}
      stage={stage}
      extra={<Payout label="Prémio estimado" value={fmtMult(payout)} />}
      controls={<p className="text-[10px] leading-relaxed text-white/30">Prémios maiores quanto mais acertos. Os números sorteados aparecem dourados.</p>}
    />
  )
}

/* -------------------------------------------------------------------- HI-LO */

const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

export function HiLoGame({ game }: { game: Game }) {
  const bet = useStake(game)
  const { play } = useSound()
  const [current, setCurrent] = useState(randInt(2, 13))
  const [next, setNext] = useState<number | null>(null)
  const [side, setSide] = useState<'higher' | 'lower'>('higher')
  const [streak, setStreak] = useState(0)
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('Maior ou menor do que o cartão atual?')
  const [history, setHistory] = useState<string[]>([])
  const [seed, setSeed] = useState(() => newSeed())

  const multiplier = Math.min(8, Math.pow(1.85, Math.max(1, streak + 1)))

  const playRound = () => {
    if (!bet.stake(side === 'higher' ? 'Maior' : 'Menor')) return
    const value = randInt(2, 13)
    const won = side === 'higher' ? value > current : value < current
    setSeed(newSeed())
    setNext(value)
    setHistory((h) => [`${RANKS[current - 1]}→${RANKS[value - 1]}`, ...h].slice(0, 14))
    if (won) {
      const payout = bet.win(multiplier, bet.amount, `Hi-Lo ${side}`)
      setStatus('win')
      setStreak((s) => s + 1)
      setMessage(`Ganhaste +${fmt(payout)} B$. Próximo multiplicador sobe.`)
      play('win')
    } else {
      setStatus('lose')
      setStreak(0)
      setMessage(`Não ganhaste. O cartão era ${RANKS[value - 1]}.`)
      play('lose')
    }
    setCurrent(value)
  }

  const stage = (
    <div className="flex items-center justify-center gap-4">
      <div className="flex flex-col items-center gap-2">
        <div className="grid h-24 w-16 place-items-center rounded-xl border border-white/25 bg-gradient-to-br from-[#f7f5ef] to-[#d8d2c4] font-display text-2xl font-black text-[#101318] shadow-card">
          {RANKS[current - 1]}
        </div>
        <span className="label">Atual</span>
      </div>
      <span className="font-display text-2xl text-white/25">vs</span>
      <div className="flex flex-col items-center gap-2">
        <div className={`grid h-24 w-16 place-items-center rounded-xl border font-display text-2xl font-black shadow-card ${
          next === null ? 'border-line bg-white/[.03] text-white/20' : 'border-gold/40 bg-gradient-to-br from-[#f7f5ef] to-[#d8d2c4] text-[#101318]'
        }`}>
          {next === null ? '?' : RANKS[next - 1]}
        </div>
        <span className="label">Próximo</span>
      </div>
    </div>
  )

  return (
    <QuickShell
      game={game}
      bet={bet}
      display={fmtMult(multiplier)}
      caption="Multiplicador"
      status={status}
      message={message}
      history={history}
      onPlay={playRound}
      busy={false}
      label="Jogar"
      seed={seed}
      stage={stage}
      extra={<Payout label="Sequência" value={String(streak)} />}
      controls={
        <div className="grid grid-cols-2 gap-1.5">
          <button type="button" onClick={() => setSide('higher')} className={`rounded-lg border py-2.5 text-xs font-bold ${side === 'higher' ? 'border-good/50 bg-good/15 text-good' : 'border-line text-white/40'}`}>↑ Maior</button>
          <button type="button" onClick={() => setSide('lower')} className={`rounded-lg border py-2.5 text-xs font-bold ${side === 'lower' ? 'border-brand/50 bg-brand/15 text-brand' : 'border-line text-white/40'}`}>↓ Menor</button>
        </div>
      }
    />
  )
}

/* ------------------------------------------------------------------- WHEEL */

export function WheelGame({ game }: { game: Game }) {
  const segments = clamp(configNum(game, 'segments', 15), 4, 30)
  const bet = useStake(game)
  const { play } = useSound()
  const [choice, setChoice] = useState<'red' | 'black' | 'green'>('red')
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<number | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('Escolhe vermelho, preto ou verde.')
  const [history, setHistory] = useState<string[]>([])
  const [seed, setSeed] = useState(() => newSeed())

  const colorOf = (i: number): 'red' | 'black' | 'green' => i === 0 ? 'green' : i % 2 === 1 ? 'red' : 'black'

  const playRound = () => {
    if (spinning || !bet.stake(`Roda ${choice}`)) return
    const index = randInt(0, segments - 1)
    const color = colorOf(index)
    setSeed(newSeed())
    setSpinning(true)
    setStatus('idle')
    setMessage('A roda está a girar…')
    play('spin')
    setRotation((r) => r + 1440 + ((segments - index) * 360) / segments)
    window.setTimeout(() => {
      setResult(index)
      setSpinning(false)
      setHistory((h) => [`${index} ${color}`, ...h].slice(0, 14))
      if (color === choice) {
        const mult = color === 'green' ? 12 : 1.95
        const value = bet.win(mult, bet.amount, `Roda ${color}`)
        setStatus('win')
        setMessage(`Resultado ${index} ${color}: +${fmt(value)} B$.`)
        play('win')
      } else {
        setStatus('lose')
        setMessage(`Resultado ${index} ${color}. Não ganhaste.`)
        play('lose')
      }
    }, 2300)
  }

  const gradient = Array.from({ length: segments }, (_, i) => {
    const color = colorOf(i)
    const hex = color === 'red' ? '#ff2d3f' : color === 'green' ? '#22e3a0' : '#151923'
    return `${hex} ${(i * 360) / segments}deg ${((i + 1) * 360) / segments}deg`
  }).join(',')

  const stage = (
    <div className="relative mx-auto h-56 w-56 sm:h-64 sm:w-64">
      <div className="absolute -top-2 left-1/2 z-10 h-5 w-5 -translate-x-1/2 rotate-45 border border-white/40 bg-white" />
      <div
        className="wheel-spin h-full w-full rounded-full border-4 border-[#1c2230] shadow-[0_0_50px_rgba(255,45,63,.25)]"
        style={{ background: `conic-gradient(${gradient})`, transform: `rotate(${rotation}deg)` }}
      />
      <div className="absolute inset-0 grid place-items-center">
        <span className="grid h-16 w-16 place-items-center rounded-full border-4 border-[#1c2230] bg-[#080b12] font-display text-lg font-black text-white">
          {result === null ? 'B' : String(result)}
        </span>
      </div>
    </div>
  )

  return (
    <QuickShell
      game={game}
      bet={bet}
      display={result === null ? '—' : String(result)}
      caption="Segmento sorteado"
      status={status}
      message={message}
      history={history}
      onPlay={playRound}
      busy={spinning}
      label="Girar roda"
      seed={seed}
      stage={stage}
      extra={<Payout label="Verde" value="12,00×" />}
      controls={
        <div className="grid grid-cols-3 gap-1.5">
          {(['red', 'black', 'green'] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setChoice(c)}
              className={`rounded-lg border py-2 text-[11px] font-bold capitalize ${choice === c ? 'border-white/50 bg-white/10 text-white' : 'border-line text-white/40'}`}
            >
              {c === 'red' ? 'Vermelho' : c === 'black' ? 'Preto' : 'Verde'}
            </button>
          ))}
        </div>
      }
    />
  )
}

/* ---------------------------------------------------------------- COIN FLIP */

export function CoinFlipGame({ game }: { game: Game }) {
  const payoutValue = configNum(game, 'payout', 1.98)
  const bet = useStake(game)
  const { play } = useSound()
  const [side, setSide] = useState<'heads' | 'tails'>('heads')
  const [flipping, setFlipping] = useState(false)
  const [result, setResult] = useState<'heads' | 'tails' | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('Cara ou coroa?')
  const [history, setHistory] = useState<string[]>([])
  const [seed, setSeed] = useState(() => newSeed())

  const playRound = () => {
    if (flipping || !bet.stake(side === 'heads' ? 'Cara' : 'Coroa')) return
    const outcome = rand() < 0.5 ? 'heads' : 'tails'
    setSeed(newSeed())
    setFlipping(true)
    setMessage('A moeda está a girar…')
    setStatus('idle')
    play('spin')
    window.setTimeout(() => {
      setResult(outcome)
      setFlipping(false)
      setHistory((h) => [(outcome === 'heads' ? 'Cara' : 'Coroa'), ...h].slice(0, 14))
      if (outcome === side) {
        const value = bet.win(payoutValue, bet.amount, `Moeda ${outcome}`)
        setStatus('win')
        setMessage(`Ganhaste +${fmt(value)} B$.`)
        play('win')
      } else {
        setStatus('lose')
        setMessage(`Saiu ${outcome === 'heads' ? 'cara' : 'coroa'}.`)
        play('lose')
      }
    }, 900)
  }

  const stage = (
    <div
      className={`grid h-40 w-40 place-items-center rounded-full border-4 border-gold/40 bg-gradient-to-br from-[#3a3212] to-[#100d04] font-display text-4xl font-black text-gold shadow-[0_0_60px_rgba(255,200,87,.2)] transition-transform duration-700 ${flipping ? 'rotate-y-180 scale-95 animate-pulseGlow' : ''}`}
    >
      {result === null ? 'B' : result === 'heads' ? 'Cara' : 'Coroa'}
    </div>
  )

  return (
    <QuickShell
      game={game}
      bet={bet}
      display={result === null ? '—' : result === 'heads' ? 'CARA' : 'COROA'}
      caption="Resultado"
      status={status}
      message={message}
      history={history}
      onPlay={playRound}
      busy={flipping}
      label="Lançar"
      seed={seed}
      stage={stage}
      extra={<Payout label="Multiplicador" value={fmtMult(payoutValue)} />}
      controls={
        <div className="grid grid-cols-2 gap-1.5">
          <button type="button" onClick={() => setSide('heads')} className={`rounded-lg border py-2.5 text-xs font-bold ${side === 'heads' ? 'border-gold/50 bg-gold/15 text-gold' : 'border-line text-white/40'}`}>Cara</button>
          <button type="button" onClick={() => setSide('tails')} className={`rounded-lg border py-2.5 text-xs font-bold ${side === 'tails' ? 'border-gold/50 bg-gold/15 text-gold' : 'border-line text-white/40'}`}>Coroa</button>
        </div>
      }
    />
  )
}

/* -------------------------------------------------------------- LUCKY NUMBER */

export function LuckyNumberGame({ game }: { game: Game }) {
  const pool = clamp(configNum(game, 'pool', 50), 10, 200)
  const bet = useStake(game)
  const { play } = useSound()
  const [choice, setChoice] = useState(1)
  const [result, setResult] = useState<number | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState(`Escolhe um número entre 1 e ${pool}.`)
  const [history, setHistory] = useState<string[]>([])
  const [seed, setSeed] = useState(() => newSeed())
  const multiplier = Math.round(pool * 0.9 * 100) / 100

  const playRound = () => {
    if (!bet.stake(`Número ${choice}`)) return
    const drawn = randInt(1, pool)
    setSeed(newSeed())
    setResult(drawn)
    setHistory((h) => [String(drawn), ...h].slice(0, 14))
    if (drawn === choice) {
      const value = bet.win(multiplier, bet.amount, `Número ${drawn}`)
      setStatus('win')
      setMessage(`Acertaste! +${fmt(value)} B$.`)
      play('win')
    } else {
      setStatus('lose')
      setMessage(`Saiu ${drawn}. Tentativa seguinte.`)
      play('lose')
    }
  }

  return (
    <QuickShell
      game={game}
      bet={bet}
      display={result === null ? '?' : String(result)}
      caption="Número sorteado"
      status={status}
      message={message}
      history={history}
      onPlay={playRound}
      busy={false}
      label="Sortear"
      seed={seed}
      extra={<Payout label="Prémio se acertar" value={fmtMult(multiplier)} />}
      controls={
        <label className="block">
          <span className="label">O teu número</span>
          <input type="number" min={1} max={pool} value={choice} onChange={(e) => setChoice(clamp(Math.round(Number(e.target.value) || 1), 1, pool))} className="input mt-1.5 text-center text-base font-bold tabular" />
        </label>
      }
    />
  )
}

/* ----------------------------------------------------------- COLOR PREDICTION */

const COLOR_HEX: Record<string, string> = { red: '#ff2d3f', black: '#151923', white: '#f4f6fb', green: '#22e3a0', gold: '#ffc857', blue: '#4fd1ff' }

export function ColorPredictionGame({ game }: { game: Game }) {
  const colors = configList(game, 'colors', ['red', 'black', 'white'])
  const bet = useStake(game)
  const { play } = useSound()
  const [choice, setChoice] = useState(colors[0] ?? 'red')
  const [result, setResult] = useState<string | null>(null)
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('Prediz a próxima cor.')
  const [history, setHistory] = useState<string[]>([])
  const [seed, setSeed] = useState(() => newSeed())

  const multFor = (color: string) => color === 'white' || color === 'green' ? 7 : color === 'gold' ? 5 : 2

  const playRound = () => {
    if (!bet.stake(`Cor ${choice}`)) return
    const drawn = pick(colors.length ? colors : ['red', 'black'])
    setSeed(newSeed())
    setResult(drawn)
    setHistory((h) => [drawn, ...h].slice(0, 14))
    if (drawn === choice) {
      const value = bet.win(multFor(drawn), bet.amount, `Cor ${drawn}`)
      setStatus('win')
      setMessage(`Acertaste na cor: +${fmt(value)} B$.`)
      play('win')
    } else {
      setStatus('lose')
      setMessage(`Saiu ${drawn}.`)
      play('lose')
    }
  }

  const stage = (
    <div
      className="h-40 w-40 rounded-full border-4 border-white/20 shadow-[0_0_70px_rgba(255,255,255,.12)] transition-all duration-500"
      style={{ background: result ? COLOR_HEX[result] ?? '#334' : 'repeating-conic-gradient(#222 0deg 45deg,#151923 45deg 90deg)' }}
    />
  )

  return (
    <QuickShell
      game={game}
      bet={bet}
      display={result ?? '?'}
      caption="Cor sorteada"
      status={status}
      message={message}
      history={history}
      onPlay={playRound}
      busy={false}
      label="Prever"
      seed={seed}
      stage={stage}
      extra={<Payout label="Multiplicador" value={fmtMult(multFor(choice))} />}
      controls={
        <div className="flex flex-wrap gap-1.5">
          {colors.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setChoice(c)}
              className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-2 text-[11px] font-bold capitalize ${choice === c ? 'border-white/50 bg-white/10 text-white' : 'border-line text-white/40'}`}
            >
              <span className="h-3 w-3 rounded-full border border-white/20" style={{ background: COLOR_HEX[c] ?? '#334' }} />
              {c}
            </button>
          ))}
        </div>
      }
    />
  )
}

/* -------------------------------------------------------------------- TOWER */

export function TowerGame({ game }: { game: Game }) {
  const rows = clamp(configNum(game, 'rows', 8), 3, 12)
  const columns = clamp(configNum(game, 'columns', 3), 2, 5)
  const bet = useStake(game)
  const { play } = useSound()
  const [active, setActive] = useState(false)
  const [safe, setSafe] = useState<number[]>([])
  const [level, setLevel] = useState(0)
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('Sobe a torre escolhendo colunas seguras.')
  const [history, setHistory] = useState<string[]>([])
  const [seed, setSeed] = useState(() => newSeed())
  const settled = useRef(false)

  const multiplier = (n: number) => Math.pow(1.3, n)

  const start = () => {
    if (active || !bet.stake('Torre')) return
    settled.current = false
    setSafe(Array.from({ length: rows }, () => randInt(0, columns - 1)))
    setSeed(newSeed())
    setLevel(0)
    setActive(true)
    setStatus('idle')
    setMessage('Escolhe uma coluna para o primeiro andar.')
    play('click')
  }

  const step = (col: number) => {
    if (!active || settled.current) return
    if (col === safe[level]) {
      const next = level + 1
      setLevel(next)
      play('tick')
      if (next >= rows) {
        settled.current = true
        setActive(false)
        const value = bet.win(multiplier(rows), bet.amount, 'Torre completa')
        setStatus('win')
        setMessage(`Torre concluída! +${fmt(value)} B$.`)
        setHistory((h) => [`${rows}/${rows}`, ...h].slice(0, 14))
        play('win')
      } else {
        setMessage(`Andar ${next} seguro. Continua!`)
      }
    } else {
      settled.current = true
      setActive(false)
      setStatus('lose')
      setMessage(`Armadilha no andar ${level + 1}. Aposta perdida.`)
      setHistory((h) => [`${level}/${rows}`, ...h].slice(0, 14))
      play('lose')
    }
  }

  const cashout = () => {
    if (!active || level === 0 || settled.current) return
    settled.current = true
    setActive(false)
    const value = bet.win(multiplier(level), bet.amount, `Torre ${level}`)
    setStatus('win')
    setMessage(`Retiraste no andar ${level}: +${fmt(value)} B$.`)
    setHistory((h) => [`${level}/${rows}`, ...h].slice(0, 14))
    play('cashout')
  }

  const stage = (
    <div className="mx-auto grid max-w-[420px] gap-1.5" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0,1fr))` }}>
      {Array.from({ length: columns * rows }, (_, i) => {
        const row = Math.floor(i / columns)
        const col = i % columns
        const cleared = row < level && safe[row] === col
        const trap = row === level && active && !cleared
        return (
          <button
            key={i}
            type="button"
            disabled={!active || row !== level}
            onClick={() => step(col)}
            className={`grid aspect-square place-items-center rounded-lg border text-xs font-bold transition ${
              cleared ? 'border-good/50 bg-good/20 text-good' : row === level && active ? 'border-brand/40 bg-brand/10 text-white hover:bg-brand/25' : 'border-line/60 bg-white/[.02] text-white/15'
            }`}
          >
            {cleared ? '✓' : trap ? '?' : '·'}
          </button>
        )
      })}
    </div>
  )

  return (
    <GameLayout
      stage={<Stage><div className="w-full px-4 py-5 text-center">
        <p className="label">Andar atual</p>
        <p className={`font-display text-5xl font-extrabold tabular ${status === 'lose' ? 'text-brand' : 'text-gold'}`}>{level} / {rows}</p>
        <div className="mt-5">{stage}</div>
        <ResultBanner state={status} text={message} />
      </div></Stage>}
      side={
        <div className="space-y-4">
          <SidePanel title="Aposta">
            <BetInput value={bet.amount} onChange={bet.setAmount} min={bet.min} max={bet.max} disabled={active} />
            <div className="mt-3 space-y-1.5">
              <Payout label="Multiplicador" value={fmtMult(multiplier(level))} />
              <Payout label="Prémio potencial" value={`${fmt(bet.amount * multiplier(level))} B$`} />
              <Payout label="Saldo" value={`${fmt(bet.balance)} B$`} />
            </div>
            {!active ? (
              <button type="button" onClick={start} className="btn-primary mt-4 w-full py-3 text-sm">Iniciar torre</button>
            ) : (
              <button type="button" onClick={cashout} disabled={level === 0} className="btn-good mt-4 w-full py-3 text-sm">Retirar {fmt(bet.amount * multiplier(level))} B$</button>
            )}
          </SidePanel>
          <SidePanel title="Rondas">
            <RecentStrip items={history} />
            <div className="mt-4"><Fairness seed={seed} compact /></div>
            <p className="mt-3 text-[10px] leading-relaxed text-white/30">{game.rules}</p>
          </SidePanel>
        </div>
      }
    />
  )
}

/* ------------------------------------------------------------------- BALLOON */

export function BalloonGame({ game }: { game: Game }) {
  const maxMult = configNum(game, 'maxMult', 200)
  const bet = useStake(game)
  const { play } = useSound()
  const [value, setValue] = useState(1)
  const [active, setActive] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('Enche o balão e retira antes de rebentar.')
  const [history, setHistory] = useState<string[]>([])
  const [seed, setSeed] = useState(() => newSeed())
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const valueRef = useRef(1)
  const settled = useRef(false)

  useEffect(() => () => { if (timer.current) clearInterval(timer.current) }, [])

  const stop = () => {
    if (timer.current) clearInterval(timer.current)
    timer.current = null
    setActive(false)
  }

  const start = () => {
    if (active || !bet.stake('Balão')) return
    settled.current = false
    valueRef.current = 1
    setValue(1)
    setSeed(newSeed())
    setActive(true)
    setStatus('idle')
    setMessage('A encher… retira quando quiseres!')
    play('click')
    timer.current = setInterval(() => {
      const growth = 0.05 + rand() * 0.16
      const next = valueRef.current + growth
      if (next >= maxMult || rand() < 0.03 + next * 0.0007) {
        valueRef.current = maxMult
        setValue(maxMult)
        stop()
        if (!settled.current) {
          settled.current = true
          setStatus('lose')
          setMessage(`O balão rebentou em ${fmtMult(Math.min(next, maxMult))}.`)
          setHistory((h) => ['💥', ...h].slice(0, 14))
          play('crash')
        }
        return
      }
      valueRef.current = next
      setValue(next)
      if (Math.floor(next) > Math.floor(next - growth)) play('tick')
    }, 180)
  }

  const cashout = () => {
    if (!active || settled.current) return
    settled.current = true
    stop()
    const current = valueRef.current
    const payout = bet.win(current, bet.amount, `Balão ${fmtMult(current)}`)
    setStatus('win')
    setMessage(`Retiraste a ${fmtMult(current)}: +${fmt(payout)} B$.`)
    setHistory((h) => [fmtMult(current), ...h].slice(0, 14))
    play('cashout')
  }

  const stage = (
    <div className="flex flex-col items-center">
      <span className="text-[90px] leading-none drop-shadow-[0_12px_30px_rgba(255,45,63,.35)]" style={{ transform: `scale(${Math.min(1.6, 0.8 + value / 120)})` }}>🎈</span>
      <div className="mt-3 h-2.5 w-64 overflow-hidden rounded-full bg-white/10">
        <div className="h-full rounded-full bg-gradient-to-r from-good via-gold to-brand transition-all" style={{ width: `${Math.min(100, (value / maxMult) * 100)}%` }} />
      </div>
    </div>
  )

  return (
    <GameLayout
      stage={<Stage><div className="w-full px-4 py-6 text-center">
        <p className="label">Multiplicador</p>
        <p className={`font-display text-[clamp(48px,10vw,80px)] font-extrabold leading-none tabular ${status === 'lose' ? 'text-brand' : 'text-good'}`}>{fmtMult(value)}</p>
        <div className="mt-6">{stage}</div>
        <ResultBanner state={status} text={message} />
      </div></Stage>}
      side={
        <div className="space-y-4">
          <SidePanel title="Aposta">
            <BetInput value={bet.amount} onChange={bet.setAmount} min={bet.min} max={bet.max} disabled={active} />
            <div className="mt-3 space-y-1.5">
              <Payout label="Teto" value={fmtMult(maxMult)} />
              <Payout label="Saldo" value={`${fmt(bet.balance)} B$`} />
            </div>
            {!active ? (
              <button type="button" onClick={start} className="btn-primary mt-4 w-full py-3 text-sm">Encher balão</button>
            ) : (
              <button type="button" onClick={cashout} className="btn-good mt-4 w-full py-3 text-sm">Retirar {fmt(bet.amount * value)} B$</button>
            )}
          </SidePanel>
          <SidePanel title="Rondas">
            <RecentStrip items={history} />
            <div className="mt-4"><Fairness seed={seed} compact /></div>
          </SidePanel>
        </div>
      }
    />
  )
}

/* ------------------------------------------------------------------- SCRATCH */

const SCRATCH_SYMBOLS = ['🍒', '💎', '⭐', '7️⃣', '🍋', '🍇']

export function ScratchGame({ game }: { game: Game }) {
  const size = clamp(configNum(game, 'grid', 9), 6, 16)
  const bet = useStake(game)
  const { play } = useSound()
  const [cells, setCells] = useState<string[]>([])
  const [revealed, setRevealed] = useState<number[]>([])
  const [active, setActive] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('Revela os quadrados para encontrar prémios.')
  const [history, setHistory] = useState<string[]>([])
  const [seed, setSeed] = useState(() => newSeed())
  const settled = useRef(false)

  const prizes = cells.filter((c) => c === '💎' || c === '7️⃣' || c === '⭐').length
  const multiplier = 1 + prizes * 0.65

  const start = () => {
    if (active || !bet.stake('Raspa e ganha')) return
    settled.current = false
    setCells(Array.from({ length: size }, () => pick(SCRATCH_SYMBOLS)))
    setRevealed([])
    setSeed(newSeed())
    setActive(true)
    setStatus('idle')
    setMessage('Toca nos quadrados para os revelar.')
    play('click')
  }

  const settle = () => {
    if (settled.current) return
    settled.current = true
    setActive(false)
    if (multiplier > 1) {
      const value = bet.win(multiplier, bet.amount, `${prizes} prémios`)
      setStatus('win')
      setMessage(`Encontraste ${prizes} prémio(s): +${fmt(value)} B$.`)
      setHistory((h) => [fmtMult(multiplier), ...h].slice(0, 14))
      play('win')
    } else {
      setStatus('lose')
      setMessage('Sem prémios nesta cartão.')
      setHistory((h) => ['—', ...h].slice(0, 14))
      play('lose')
    }
  }

  const reveal = (i: number) => {
    if (!active || revealed.includes(i)) return
    const next = [...revealed, i]
    setRevealed(next)
    play('tick')
    if (next.length === size) window.setTimeout(settle, 250)
  }

  const cashout = () => {
    if (!active || revealed.length === 0) return
    settle()
  }

  const stage = (
    <div className="mx-auto grid max-w-[420px] grid-cols-3 gap-2">
      {cells.length === 0
        ? Array.from({ length: size }, (_, i) => <div key={i} className="grid aspect-square place-items-center rounded-xl border border-line/60 bg-white/[.03] text-white/15">?</div>)
        : cells.map((symbol, i) => (
          <button
            key={i}
            type="button"
            disabled={revealed.includes(i)}
            onClick={() => reveal(i)}
            className={`grid aspect-square place-items-center rounded-xl border text-3xl transition ${revealed.includes(i) ? 'border-gold/40 bg-gold/10' : 'border-line/60 bg-gradient-to-br from-[#22283a] to-[#11151f] text-white/20 hover:border-white/30'}`}
          >
            {revealed.includes(i) ? symbol : '?'}
          </button>
        ))}
    </div>
  )

  return (
    <GameLayout
      stage={<Stage><div className="w-full px-4 py-5 text-center">
        <p className="label">Prémios encontrados</p>
        <p className="font-display text-5xl font-extrabold tabular text-gold">{prizes}</p>
        <div className="mt-5">{stage}</div>
        <ResultBanner state={status} text={message} />
      </div></Stage>}
      side={
        <div className="space-y-4">
          <SidePanel title="Aposta">
            <BetInput value={bet.amount} onChange={bet.setAmount} min={bet.min} max={bet.max} disabled={active} />
            <div className="mt-3 space-y-1.5">
              <Payout label="Multiplicador" value={fmtMult(multiplier)} />
              <Payout label="Saldo" value={`${fmt(bet.balance)} B$`} />
            </div>
            {!active ? (
              <button type="button" onClick={start} className="btn-gold mt-4 w-full py-3 text-sm">Comprar cartão</button>
            ) : (
              <button type="button" onClick={cashout} disabled={revealed.length === 0} className="btn-good mt-4 w-full py-3 text-sm">Retirar agora</button>
            )}
          </SidePanel>
          <SidePanel title="Tabela">
            <div className="space-y-1.5 text-[11px]">
              <Payout label="💎 / 7️⃣ / ⭐" value="+0,65× cada" />
              <Payout label="🍒 / 🍋 / 🍇" value="sem prémio" />
            </div>
            <div className="mt-4"><Fairness seed={seed} compact /></div>
          </SidePanel>
        </div>
      }
    />
  )
}
