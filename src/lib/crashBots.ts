import { hashHex } from './rng'

/** Visual-only bots. Nothing here reads or writes the player's wallet. */
export type BotStatus = 'waiting' | 'flying' | 'cashed' | 'crashed'
export type BotStyle = 'conservador' | 'medio' | 'agressivo'
export type BotPhase = 'betting' | 'flying' | 'crashed'
export type Mechanic = 'classic' | 'trail' | 'jump' | 'boost' | 'wind' | 'orbit' | 'turbo' | 'jet' | 'tower'

export interface CrashVariant {
  id: string
  name: string
  glyph: string
  line: string
  accent: string
  wash: string
  mechanic: Mechanic
  mechanicLabel: string
  /** Etiqueta curta da identidade BLAZE da variante (glifo/cor/efeito próprios). */
  signature: string
  perk: string
  drawback: string
  dash: number[]
  /** Small visual-only bias applied to simulated bot exit targets. */
  goalBias: number
}

export interface BotProfile {
  id: string
  name: string
  style: BotStyle
}

export interface BotRound extends BotProfile {
  bet: number
  target: number
}

export const BOT_STYLE_LABEL: Record<BotStyle, string> = {
  conservador: 'Conservador',
  medio: 'Médio',
  agressivo: 'Agressivo',
}

const VARIANTS: Record<string, CrashVariant> = {
  crash: {
    id: 'crash',
    name: 'Crash',
    glyph: '✈️',
    line: '#ff6b3d',
    accent: '#ffc857',
    wash: 'rgba(255,107,61,.12)',
    mechanic: 'classic',
    mechanicLabel: 'Curva clássica, sem extras',
    signature: 'CLÁSSICO',
    perk: 'Subida equilibrada e teto elevado.',
    drawback: 'Sem mecânica de proteção extra.',
    dash: [],
    goalBias: 1,
  },
  aviator: {
    id: 'aviator',
    name: 'Aviator',
    glyph: '🛩️',
    line: '#ff4d6d',
    accent: '#ffc0d0',
    wash: 'rgba(255,77,109,.13)',
    mechanic: 'trail',
    mechanicLabel: 'Rastro duplo atrás do avião',
    signature: 'RASTRO',
    perk: 'O rastro duplo ajuda a ler a trajetória.',
    drawback: 'O rastro não abranda a queda.',
    dash: [],
    goalBias: 1.02,
  },
  'space-flight': {
    id: 'space-flight',
    name: 'Space Flight',
    glyph: '🚀',
    line: '#5b8cff',
    accent: '#9ad4ff',
    wash: 'rgba(91,140,255,.14)',
    mechanic: 'jump',
    mechanicLabel: 'Salto visual orbital',
    signature: 'SALTO',
    perk: 'O salto destaca bem cada trecho da subida.',
    drawback: 'O salto é estético: o risco é o mesmo.',
    dash: [11, 5],
    goalBias: 0.97,
  },
  'rocket-rush': {
    id: 'rocket-rush',
    name: 'Rocket Rush',
    glyph: '🚀',
    line: '#ff8a2b',
    accent: '#ffd27a',
    wash: 'rgba(255,138,43,.14)',
    mechanic: 'boost',
    mechanicLabel: 'Boost visual extra após 3 s',
    signature: 'BOOST',
    perk: 'Sobe depressa e o boost é muito visível.',
    drawback: 'Crescer rápido também significa quebrar cedo.',
    dash: [],
    goalBias: 1.08,
  },
  'sky-multiplier': {
    id: 'sky-multiplier',
    name: 'Sky Multiplier',
    glyph: '☁️',
    line: '#4fd1ff',
    accent: '#d0f4ff',
    wash: 'rgba(79,209,255,.12)',
    mechanic: 'wind',
    mechanicLabel: 'Vento lateral no céu',
    signature: 'VENTO',
    perk: 'Curva suave e vento a dar contexto ao voo.',
    drawback: 'Crescimento lento exige mais paciência.',
    dash: [],
    goalBias: 0.94,
  },
  'cosmic-crash': {
    id: 'cosmic-crash',
    name: 'Cosmic Crash',
    glyph: '🛸',
    line: '#a76bff',
    accent: '#e6cdff',
    wash: 'rgba(167,107,255,.14)',
    mechanic: 'orbit',
    mechanicLabel: 'Órbita instável em torno do disco',
    signature: 'ÓRBITA',
    perk: 'Órbita vistosa e teto generoso.',
    drawback: 'Quedas bruscas podem apanhar-te desprevenido.',
    dash: [8, 4],
    goalBias: 1.04,
  },
  'turbo-crash': {
    id: 'turbo-crash',
    name: 'Turbo Crash',
    glyph: '🏎️',
    line: '#ff3d4d',
    accent: '#ffb199',
    wash: 'rgba(255,61,77,.14)',
    mechanic: 'turbo',
    mechanicLabel: 'Turbo: raios de velocidade',
    signature: 'TURBO',
    perk: 'Rondas rápidas, decisões rápidas.',
    drawback: 'Teto baixo e risco elevado.',
    dash: [],
    goalBias: 0.92,
  },
  'jet-rush': {
    id: 'jet-rush',
    name: 'Jet Rush',
    glyph: '🛫',
    line: '#ffb347',
    accent: '#ffe2a8',
    wash: 'rgba(255,179,71,.13)',
    mechanic: 'jet',
    mechanicLabel: 'Jato com escapes gémeos',
    signature: 'JATO',
    perk: 'Dois slots independentes para jogar.',
    drawback: 'Aceleração média, sem proteção adicional.',
    dash: [],
    goalBias: 1,
  },
  'crash-deluxe': {
    id: 'crash-deluxe',
    name: 'Crash Deluxe',
    glyph: '🗼',
    line: '#ffd76a',
    accent: '#ff9ad5',
    wash: 'rgba(255,215,106,.13)',
    mechanic: 'tower',
    mechanicLabel: 'Torre de níveis no enquadramento',
    signature: 'TORRE',
    perk: 'Teto muito elevado e subida constante.',
    drawback: 'O crescimento lento pede retiradas cedo.',
    dash: [],
    goalBias: 0.98,
  },
}

/** Returns the visual identity for a crash variant; unknown ids fall back to classic. */
export function crashVariant(id: string): CrashVariant {
  return VARIANTS[id] ?? VARIANTS.crash
}

const PROFILES: BotProfile[] = [
  { id: 'bot-alfa', name: 'BOT_Alfa', style: 'conservador' },
  { id: 'bot-bravo', name: 'BOT_Bravo', style: 'conservador' },
  { id: 'bot-nova', name: 'BOT_Nova', style: 'medio' },
  { id: 'bot-vega', name: 'BOT_Vega', style: 'agressivo' },
  { id: 'bot-orbita', name: 'BOT_Órbita', style: 'agressivo' },
]

const RANGE: Record<BotStyle, [number, number]> = {
  conservador: [1.3, 1.8],
  medio: [2, 4],
  agressivo: [5, 20],
}

const BET_FACTOR: Record<BotStyle, number> = {
  conservador: 2.5,
  medio: 7,
  agressivo: 16,
}

function fraction(seed: string): number {
  return parseInt(hashHex(seed).slice(0, 8), 16) / 4294967296
}

/**
 * Deterministic simulated participants for one round. Bets and exit targets come from the
 * round seed, never from the wallet; the crash point itself stays in crashFromSeed().
 */
export function makeBotRound(seed: string, minBet: number, maxBet: number, variant: CrashVariant): BotRound[] {
  return PROFILES.map((profile) => {
    const betRoll = fraction(`${seed}:${profile.id}:bet`)
    const exitRoll = fraction(`${seed}:${profile.id}:exit`)
    const min = Number.isFinite(minBet) && minBet > 0 ? minBet : 10
    const max = Number.isFinite(maxBet) && maxBet > min ? maxBet : min * 1000
    const bet = Math.min(max, Math.max(min, Math.round(min * BET_FACTOR[profile.style] * (0.4 + betRoll * 1.2) * 100) / 100))
    const [lo, hi] = RANGE[profile.style]
    const biased = (lo + (hi - lo) * exitRoll) * variant.goalBias
    const target = Math.round(Math.min(hi, Math.max(lo, biased)) * 100) / 100
    return { ...profile, bet, target }
  })
}

/** Derived, per-frame state for a visual bot. No side effects. */
export function botStatus(bot: BotRound, phase: BotPhase, mult: number, crashAt: number): BotStatus {
  if (phase === 'betting') return 'waiting'
  if (phase === 'flying') return mult >= bot.target ? 'cashed' : 'flying'
  return bot.target <= crashAt ? 'cashed' : 'crashed'
}

/** Simulated payout, displayed as DEMONSTRAÇÃO only. */
export function botCashout(bot: BotRound, status: BotStatus): number {
  return status === 'cashed' ? bot.bet * bot.target : 0
}
