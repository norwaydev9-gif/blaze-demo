import { useMemo, useRef, useState } from 'react'
import type { Game } from '../lib/types'
import { fmt } from '../lib/format'
import { shuffle, randInt } from '../lib/rng'
import { useWallet } from '../lib/wallet'
import { useSound } from '../lib/sound'
import { BetInput, GameLayout, Payout, RecentStrip, SidePanel, Stage } from '../components/GameUI'

function buildSegments(n: number): number[] {
  const base =
    n >= 24
      ? [0, 0, 0, 0, 0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1, 1, 1, 1, 1, 1, 1, 1.5, 1.5, 2, 3, 5]
      : [0, 0.5, 0.5, 0.5, 0.5, 0.5, 0.5, 1, 1, 1, 1, 1, 1.5, 2, 3]
  const out = base.slice(0, n)
  while (out.length < n) out.push(0.5)
  return shuffle(out)
}

function colorFor(m: number): string {
  if (m === 0) return '#2a2f3d'
  if (m < 1) return '#7c2d3a'
  if (m < 2) return '#b3202f'
  if (m < 3) return '#d99a2b'
  return '#22a06b'
}

export function WheelGame({ game }: { game: Game }) {
  const n = Number(game.config.segments ?? 15)
  const min = game.minBet
  const max = game.maxBet
  const { balance, placeBet, payout } = useWallet()
  const { play } = useSound()

  const segments = useMemo(() => buildSegments(n), [n])
  const [amount, setAmount] = useState(min)
  const [rotation, setRotation] = useState(0)
  const [spinning, setSpinning] = useState(false)
  const [result, setResult] = useState<number | null>(null)
  const [history, setHistory] = useState<number[]>([])
  const rotRef = useRef(0)
  const segAngle = 360 / n

  const spin = () => {
    if (spinning) return
    if (!placeBet(amount, game.name, game.id, `Roda ${n}`)) return
    setSpinning(true)
    setResult(null)
    const index = randInt(0, n - 1)
    const targetMod = ((-index * segAngle - rotRef.current) % 360 + 360) % 360
    const next = rotRef.current + 360 * 5 + targetMod
    rotRef.current = next
    setRotation(next)
    play('spin')
    setTimeout(() => {
      const mult = segments[index]
      setResult(mult)
      setSpinning(false)
      setHistory((h) => [mult, ...h].slice(0, 16))
      if (mult > 0) {
        payout(amount * mult, game.name, game.id, `Roda ${mult}×`)
        play('win')
      } else {
        play('lose')
      }
    }, 4700)
  }

  const size = 320
  const radius = size / 2
  const wheelBg = useMemo(() => {
    const stops = segments.map((m, i) => {
      const from = i * segAngle
      const to = (i + 1) * segAngle
      return `${colorFor(m)} ${from}deg ${to}deg`
    })
    return `conic-gradient(from -${segAngle / 2}deg, ${stops.join(', ')})`
  }, [segments, segAngle])

  return (
    <GameLayout
      stage={
        <Stage>
          <div className="relative flex flex-col items-center justify-center px-4 py-8">
            <div className="pointer-events-none absolute inset-0 bg-grid opacity-20" />
            <div className="relative" style={{ width: size, height: size }}>
              <div className="absolute left-1/2 top-[-6px] z-20 -translate-x-1/2">
                <div className="h-0 w-0 border-x-[9px] border-t-[14px] border-x-transparent border-t-white drop-shadow-[0_2px_6px_rgba(0,0,0,.8)]" />
              </div>
              <div
                className="absolute inset-0 rounded-full border-[6px] border-[#221a10] shadow-[0_0_0_2px_rgba(255,200,87,.25),0_24px_60px_rgba(0,0,0,.6)]"
                style={{ transform: `rotate(${rotation}deg)`, transition: spinning ? 'transform 4.6s cubic-bezier(.16,.84,.16,1)' : undefined }}
              >
                <div className="absolute inset-0 rounded-full" style={{ background: wheelBg }} />
                {segments.map((m, i) => {
                  const angle = i * segAngle
                  return (
                    <div
                      key={i}
                      className="absolute left-1/2 top-1/2 text-[10px] font-extrabold text-white/90"
                      style={{
                        transform: `translate(-50%,-50%) rotate(${angle}deg) translateY(-${radius - 26}px)`,
                      }}
                    >
                      {m === 0 ? '✕' : `${m}×`}
                    </div>
                  )
                })}
                <div className="absolute left-1/2 top-1/2 grid h-16 w-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-4 border-[#221a10] bg-gradient-to-br from-[#2c3444] to-[#0e121a] text-lg shadow-xl">
                  🎡
                </div>
              </div>
            </div>

            <div className="relative mt-6 text-center">
              {result === null ? (
                <p className="text-xs font-semibold text-white/40">{spinning ? 'A roda está a girar…' : 'Escolhe o valor e gira a roda'}</p>
              ) : (
                <div className="animate-popIn">
                  <p className={`font-display text-2xl font-extrabold ${result > 0 ? 'text-gold' : 'text-brand'}`}>
                    {result > 0 ? `${result}× · +${fmt(amount * result)} B$` : 'Sem prémio'}
                  </p>
                  <p className="mt-1 text-[11px] text-white/35">Segmento sorteado</p>
                </div>
              )}
            </div>
          </div>
        </Stage>
      }
      side={
        <div className="space-y-4">
          <SidePanel title="Aposta">
            <BetInput value={amount} onChange={setAmount} min={min} max={max} disabled={spinning} />
            <div className="mt-3 space-y-1.5">
              <Payout label="Segmentos" value={String(n)} />
              <Payout label="Prémio máximo" value={`${fmt(amount * Math.max(...segments))} B$`} />
              <Payout label="Saldo" value={`${fmt(balance)} B$`} />
            </div>
            <button type="button" onClick={spin} disabled={spinning} className="btn-primary mt-3 w-full py-3 text-sm">
              {spinning ? 'A girar…' : `Girar · ${fmt(amount)} B$`}
            </button>
          </SidePanel>
          <SidePanel title="Últimos resultados">
            <RecentStrip
              items={history.map((m) => (m === 0 ? '✕' : `${m}×`))}
              colorFor={(v) => (String(v) === '✕' ? 'text-brand border-brand/30' : 'text-gold border-gold/30')}
            />
          </SidePanel>
        </div>
      }
    />
  )
}
