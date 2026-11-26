/**
 * Random helpers. Uses WebCrypto when available, with a safe fallback.
 * Contrato demo: `rand*` alimenta o jogo; `seedRoll`/`crashFromSeed` são puros e
 * verificáveis a partir do seed. Nenhum valor pode ser imposto pelo frontend sem
 * alterar o código — e, mesmo assim, isso não teria validade num operador licenciado.
 */

function cryptoObj(): Crypto | null {
  if (typeof globalThis !== 'undefined' && typeof globalThis.crypto?.getRandomValues === 'function') {
    return globalThis.crypto
  }
  return null
}

export function rand(): number {
  const c = cryptoObj()
  if (c) {
    const buf = new Uint32Array(1)
    c.getRandomValues(buf)
    return buf[0] / 4294967296
  }
  return Math.random()
}

export function randInt(min: number, max: number): number {
  return Math.floor(rand() * (max - min + 1)) + min
}

export function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(rand() * arr.length)]
}

export function shuffle<T>(arr: readonly T[]): T[] {
  const out = arr.slice()
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

export function uid(): string {
  return `${Date.now().toString(36)}-${Math.floor(rand() * 1e9).toString(36)}`
}

/** Crash point with a house edge. Mirrors the classic 1/(1-u) curve. */
export function crashPoint(edge = 0.03, max = 5000): number {
  const u = rand()
  if (u < edge) return 1
  return Math.min(max, Math.max(1, (1 - edge) / (1 - u)))
}

/** Roll em [0,1) derivado apenas do seed — mesma entrada, sempre o mesmo valor. */
export function seedRoll(seed: string): number {
  let h = 2166136261
  for (let i = 0; i < seed.length; i++) {
    h ^= seed.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) / 4294967296
}

/**
 * Deterministic crash from a hex seed (provably-fair demo).
 * O resultado depende apenas de `seed`, `edge` e `max`: qualquer cliente pode
 * recalculá-lo. O seed vem de `uid()`/`rand()` (WebCrypto quando disponível),
 * não de uma escolha livre do utilizador. Isto é demonstração local, não autoridade de servidor.
 */
export function crashFromSeed(seed: string, edge = 0.03, max = 5000): number {
  const u = seedRoll(seed)
  if (u < edge) return 1
  return Math.min(max, Math.max(1, (1 - edge) / (1 - u)))
}

/** Verificação local: confirma que o ponto apresentado resulta do seed publicado. */
export function verifyCrash(seed: string, point: number, edge = 0.03, max = 5000): boolean {
  return Number.isFinite(point) && Math.abs(crashFromSeed(seed, edge, max) - point) < 1e-9
}

/** Simple FNV-1a hash, hex encoded (demo only). */
export function hashHex(input: string): string {
  let h1 = 0x811c9dc5
  let h2 = 0x01000193
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i)
    h1 ^= c
    h1 = Math.imul(h1, 16777619)
    h2 ^= c + i
    h2 = Math.imul(h2, 2246822519)
  }
  return (
    (h1 >>> 0).toString(16).padStart(8, '0') +
    (h2 >>> 0).toString(16).padStart(8, '0')
  )
}
