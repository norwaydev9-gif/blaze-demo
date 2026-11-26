import { useState } from 'react'
import type { Game } from '../lib/types'
import { fmt } from '../lib/format'
import { rand, randInt, shuffle } from '../lib/rng'
import { useWallet } from '../lib/wallet'
import { useSound } from '../lib/sound'
import { BetInput, GameLayout, Payout, RecentStrip, SidePanel, Stage } from '../components/GameUI'

interface Cell {
  symbol: string
  prize: number
  revealed: boolean
}

const SYMBOLS = [
  { s: '🍒', p: 1 },
  { s: '🍋', p: 1.5 },
  { s: '🔔', p: 2 },
  { s: '⭐', p: 5 },
  { s: '💎', p: 10 },
  { s: '7️⃣', p: 25 },
]

function makeCard(winChance: number): { cells: Cell[]; win: number } {
  const win = rand() < winChance
  if (win) {
    const prize = SYMBOLS[randInt(0, SYMBOLS.length - 1)]
    const cells: Cell[] = Array.from({ length: 9 }, () => ({
      symbol: SYMBOLS[randInt(0, SYMBOLS.length - 1)].s,
      prize: prize.p,
      revealed: false,
    }))
    const positions = shuffle(Array.from({ length: 9 }, (_, i) => i)).slice(0, 3)
    positions.forEach((p) => {
      cells[p] = { symbol: prize.s, prize: prize.p, revealed: false }
    })
    return { cells, win: prize.p }
  }
  // no three-of-a-kind
  const cells: Cell[] = []
  for (let i = 0; i < 9; i++) {
    let sym = SYMBOLS[randInt(0, SYMBOLS.length - 1)]
    let guard = 0
    while (cells.filter((c) => c.symbol === sym.s).length >= 2 && guard < 20) {
      sym = SYMBOLS[randInt(0, SYMBOLS.length - 1)]
      guard++
    }
    cells.push({ symbol: sym.s, prize: sym.p, revealed: false })
  }
  return { cells, win: 0 }
}

export function ScratchGame({ game }: { game: Game }) {
  const { balance, placeBet, payout } = useWallet()
  const { play } = useSound()
  const [amount, setAmount] = useState(game.minBet)
  const [cells, setCells] = useState<Cell[]>([])
  const [active, setActive] = useState(false)
  const [win, setWin] = useState<number | null>(null)
  const [history, setHistory] = useState<string[]>([])

  const buy = () => {
    if (!placeBet(amount, game.name, game.id, 'Cartão raspado')) return
    const card = makeCard(0.32)
    setCells(card.cells)
    setWin(null)
    setActive(true)
    play('click')
  }

  const reveal = (i: number) => {
    if (!active || cells[i].revealed) return
    const next = cells.map((c, idx) => (idx === i ? { ...c, revealed: true } : c))
    setCells(next)
    play('tick')
    if (next.every((c) => c.revealed)) settle(next)
  }

  const settle = (all: Cell[]) => {
    setActive(false)
    const counts = new Map<string, number>()
    all.forEach((c) => counts.set(c.symbol, (counts.get(c.symbol) ?? 0) + 1))
    let best = 0
    all.forEach((c) => {
      if ((counts.get(c.symbol) ?? 0) >= 3) best = Math.max(best, c.prize)
    })
    if (best > 0) {
      const prize = amount * best
      setWin(prize)
      payout(prize, game.name, game.id, `3 iguais · ${best}×`)
      setHistory((h) => [`+${fmt(prize)}`, ...h].slice(0, 12))
      play('win')
    } else {
      setWin(0)
      setHistory((h) => ['—', ...h].slice(0, 12))
      play('lose')
    }
  }

  const revealAll = () => {
    if (!active) return
    const all = cells.map((c) => ({ ...c, revealed: true }))
    setCells(all)
    settle(all)
  }

  return (
    <GameLayout
      stage={
        <Stage>
          <div className="relative px-4 py-6 sm:px-8">
            <div className="mx-auto max-w-[420px]">
              <div className="mb-4 flex items-center justify-between">
                <span className="rounded-md border border-gold/25 bg-gold/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-gold">Raspa & ganha</span>
                <span className="text-[10px] font-semibold text-white/30">3 símbolos iguais = prémio</span>
              </div>
              <div className="rounded-2xl border-2 border-[#2a2010] bg-gradient-to-b from-[#1c1508] to-[#0c0904] p-3">
                <div className="grid grid-cols-3 gap-2">
                  {(cells.length ? cells : Array.from({ length: 9 }, () => ({ symbol: '', prize: 0, revealed: false }))).map((c, i) => (
                    <button
                      key={i}
                      type="button"
                      disabled={!active || c.revealed}
                      onClick={() => reveal(i)}
                      className={`relative grid aspect-square place-items-center overflow-hidden rounded-xl border text-3xl transition ${
                        c.revealed
                          ? 'border-gold/20 bg-[#f5f0e4] shadow-inner'
                          : cells.length
                            ? 'border-white/10 bg-[linear-gradient(135deg,#3a3f4d,#1c202a)] hover:border-white/30'
                            : 'border-line/50 bg-black/20'
                      }`}
                    >
                      {c.revealed ? (
                        <span className="animate-popIn drop-shadow">{c.symbol}</span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">
                          {cells.length ? 'Raspar' : '—'}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-4 flex items-center justify-between">
                <button type="button" onClick={revealAll} disabled={!active} className="btn-ghost px-3 py-2 text-[11px]">
                  Revelar tudo
                </button>
                <div className="text-right">
                  <p className="text-[9px] uppercase tracking-wider text-white/30">Prémio</p>
                  <p className={`text-lg font-extrabold tabular ${win ? 'text-good' : 'text-white/40'}`}>{win ? `${fmt(win)} B$` : '—'}</p>
                </div>
              </div>
            </div>
          </div>
        </Stage>
      }
      side={
        <div className="space-y-4">
          <SidePanel title="Aposta">
            <BetInput value={amount} onChange={setAmount} min={game.minBet} max={game.maxBet} disabled={active} />
            <div className="mt-3 space-y-1.5">
              <Payout label="Prémio máximo" value={`${fmt(amount * 25)} B$`} />
              <Payout label="Saldo" value={`${fmt(balance)} B$`} />
            </div>
            <button type="button" onClick={buy} disabled={active} className="btn-gold mt-3 w-full py-3 text-sm">
              {active ? 'Raspa os campos…' : `Comprar cartão · ${fmt(amount)} B$`}
            </button>
          </SidePanel>
          <SidePanel title="Histórico">
            <RecentStrip items={history} colorFor={(v) => (String(v).startsWith('+') ? 'text-gold border-gold/30' : 'text-white/30')} />
          </SidePanel>
        </div>
      }
    />
  )
}
