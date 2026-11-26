const PREFIX = 'blaze.'
const LEGACY_PREFIX = 'blase.'

export function load<T>(key: string, fallback: T): T {
  try {
    let raw = localStorage.getItem(key)
    // Migra dados guardados antes da correção da marca (blase.* → blaze.*).
    if (!raw && key.startsWith(PREFIX)) {
      const legacyKey = LEGACY_PREFIX + key.slice(PREFIX.length)
      raw = localStorage.getItem(legacyKey)
      if (raw) localStorage.setItem(key, raw)
    }
    if (!raw) return fallback
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

export function save(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    /* storage full or blocked — demo keeps running in memory */
  }
}
