const PREFIX = 'blaze.'
// Prefixo legado (grafia antiga), mantido apenas para migrar dados já guardados.
const LEGACY_PREFIX = 'blase.'

/** Aceita apenas valores com a mesma forma do fallback, evitando lixo persistido. */
function matchesShape(value: unknown, fallback: unknown): boolean {
  if (Array.isArray(fallback)) return Array.isArray(value)
  if (fallback !== null && typeof fallback === 'object') {
    return value !== null && typeof value === 'object' && !Array.isArray(value)
  }
  return typeof value === typeof fallback
}

export function load<T>(key: string, fallback: T): T {
  try {
    let raw = localStorage.getItem(key)
    // Migra dados guardados antes da correção da marca (blase.* → blaze.*).
    if (!raw && key.startsWith(PREFIX)) {
      const legacyKey = LEGACY_PREFIX + key.slice(PREFIX.length)
      const legacyRaw = localStorage.getItem(legacyKey)
      if (legacyRaw) {
        raw = legacyRaw
        localStorage.setItem(key, legacyRaw)
      }
    }
    if (!raw) return fallback
    const parsed: unknown = JSON.parse(raw)
    return matchesShape(parsed, fallback) ? (parsed as T) : fallback
  } catch {
    return fallback
  }
}

export function save(key: string, value: unknown): void {
  try {
    // undefined não é JSON válido: não sobrescreve um valor bom com lixo.
    if (value === undefined) return
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage full or blocked — demo keeps running in memory */
  }
}
