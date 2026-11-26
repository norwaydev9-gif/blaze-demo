// Ferramenta de validação temporária: renderiza todos os jogos em jsdom e clica nos botões.
import { createRequire } from 'node:module'
import { writeFileSync } from 'node:fs'
import { createServer } from 'vite'

let JSDOM
let VirtualConsole
try {
  ({ JSDOM, VirtualConsole } = await import('jsdom'))
} catch {
  console.log('jsdom não instalado — teste de runtime ignorado (npm i -D jsdom)')
  process.exit(0)
}

const require = createRequire(import.meta.url)
const React = require('react')
const { act } = React
const { createRoot } = require('react-dom/client')

const errors = []
const virtualConsole = new VirtualConsole()
virtualConsole.on('jsdomError', (e) => {
  if (!/Not implemented/.test(e.message)) errors.push(`jsdom: ${e.message}`)
})
const dom = new JSDOM('<!doctype html><html><body><div id="root"></div></body></html>', {
  url: 'https://blaze.test/#/',
  pretendToBeVisual: true,
  virtualConsole,
})
const { window } = dom
window.scrollTo = () => {}
window.scroll = () => {}
window.matchMedia = window.matchMedia || (() => ({ matches: false, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} }))
window.ResizeObserver = window.ResizeObserver || class { observe() {} unobserve() {} disconnect() {} }

const canvasContext = new Proxy({}, {
  get(target, prop) {
    if (prop === 'canvas') return null
    if (prop === 'measureText') return () => ({ width: 10 })
    if (prop === 'getImageData') return () => ({ data: new Uint8ClampedArray(4) })
    if (prop === 'createLinearGradient' || prop === 'createRadialGradient') return () => ({ addColorStop() {} })
    if (prop in target) return target[prop]
    return () => {}
  },
  set(target, prop, value) { target[prop] = value; return true },
})
window.HTMLCanvasElement.prototype.getContext = () => canvasContext
window.HTMLCanvasElement.prototype.toDataURL = () => 'data:image/png;base64,'

for (const key of [
  'window', 'document', 'navigator', 'location', 'HTMLElement', 'HTMLCanvasElement', 'HTMLInputElement',
  'Element', 'Node', 'Event', 'CustomEvent', 'MouseEvent', 'KeyboardEvent', 'HashChangeEvent',
  'localStorage', 'sessionStorage', 'getComputedStyle', 'requestAnimationFrame', 'cancelAnimationFrame',
  'DOMRect', 'SVGElement', 'Image', 'ResizeObserver', 'matchMedia',
]) {
  if (window[key] !== undefined) Object.defineProperty(globalThis, key, { value: window[key], configurable: true, writable: true })
}
globalThis.self = window
globalThis.IS_REACT_ACT_ENVIRONMENT = true
process.on('uncaughtException', (e) => errors.push(`uncaught: ${e.stack || e.message}`))
process.on('unhandledRejection', (e) => errors.push(`rejection: ${e?.stack || e}`))
const originalError = console.error
console.error = (...args) => {
  const text = args.map((a) => (a && a.stack) || String(a)).join(' ')
  if (!/Warning: An update to .* inside a test was not wrapped in act/.test(text)) errors.push(`console: ${text}`)
  originalError(...args)
}

const vite = await createServer({ root: process.cwd(), server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' })
const load = (p) => vite.ssrLoadModule(p)
const { GAMES } = await load('/src/lib/games.ts')
const { App } = await load('/src/App.tsx')
const { WalletProvider } = await load('/src/lib/wallet.tsx')
const { ToastProvider } = await load('/src/lib/toast.tsx')
const { SoundProvider } = await load('/src/lib/sound.tsx')
const { FavoritesProvider, RecentProvider } = await load('/src/lib/favorites.tsx')

const results = []
const container = window.document.getElementById('root')
const readTx = () => {
  try { return JSON.parse(window.localStorage.getItem('blaze.wallet.v1') || '{}').tx || [] } catch { return [] }
}
const wrap = (Provider, child) => React.createElement(Provider, null, child)
const tree = [App, RecentProvider, FavoritesProvider, SoundProvider, ToastProvider, WalletProvider]
  .reduce((child, Component) => wrap(Component, child), null)

// UI de crash: todos os problemas são reportados no fim, sem interromper os restantes jogos.
const crashSelectors = ['.crash-bots', '.crash-history', '.crash-timer', '.crash-mult']
const readCrashUi = (scope) => {
  const bots = [...scope.querySelectorAll('.crash-bot')]
  const container = scope.querySelector('.crash-bots')
  const missing = crashSelectors.filter((sel) => !scope.querySelector(sel))
  if (!bots.length) missing.push('.crash-bot')
  if (bots.some((b) => !(b.getAttribute('data-status') || '').trim())) missing.push('.crash-bot[data-status]')
  // O rótulo de demonstração vive no cabeçalho do painel, fora do container .crash-bots.
  const text = `${container?.textContent || ''} ${bots.map((b) => b.textContent || '').join(' ')} ${scope.textContent || ''}`
  return { bots: bots.length, missing, demoLabeled: bots.length > 0 && /demo|simulad/i.test(text) }
}
const mergeCrashUi = (a, b) => ({
  bots: Math.max(a.bots, b.bots),
  missing: a.missing.filter((m) => b.missing.includes(m)),
  demoLabeled: a.demoLabeled || b.demoLabeled,
})

for (const game of GAMES) {
  errors.length = 0
  window.localStorage.setItem('blaze.wallet.v1', JSON.stringify({
    balance: 1_000_000, tx: [], wagered: 0, won: 0, bonusAt: Date.now(), resetAt: Date.now(),
  }))
  const txBefore = readTx().length
  window.location.hash = `#/jogo/${game.id}`
  const root = createRoot(container)
  try {
    await act(async () => {
      root.render(tree)
    })
    const text = container.textContent || ''
    const boundary = text.includes('Algo correu mal')
    const scope = container.querySelector('.game-immersive-engine') || container
    const crashInitial = game.engine === 'crash' ? readCrashUi(scope) : null
    const stage = container.querySelector('.game-stage') || scope
    const side = container.querySelector('.game-side-content')
    const stageActions = stage.querySelectorAll('.bet-bar').length
    const sideActions = side ? side.querySelectorAll('.bet-bar').length : 0
    const buttons = [...scope.querySelectorAll('button')]
    const clickable = buttons.filter((b) => !/Voltar|informações|histórico/i.test(b.textContent || ''))
    const priority = /apost|girar|comprar|iniciar|jogar|sortear|lançar|rodar|continuar|pedir|ficar|dobrar|retirar|sacar|trocar|desenhar|riscar|abri|bomb/i
    const clickAll = async (list) => {
      for (const button of list.slice(0, 90)) {
        if (button.disabled) continue
        await act(async () => {
          button.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }))
        })
      }
    }
    await clickAll(clickable.filter((b) => !priority.test(b.textContent || '')))
    const actions = clickable.filter((b) => priority.test(b.textContent || ''))
    await clickAll(actions)
    await clickAll(actions)
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 140))
    })
    const after = container.textContent || ''
    results.push({
      id: game.id,
      engine: game.engine,
      boundary,
      buttons: buttons.length,
      canvas: container.querySelectorAll('canvas').length,
      immersive: !!container.querySelector('.game-immersive-engine'),
      stageActions,
      sideActions,
      errors: [...errors],
      changed: after !== text,
      txDelta: readTx().length - txBefore,
      crash: crashInitial ? mergeCrashUi(crashInitial, readCrashUi(scope)) : null,
      goldButtons: scope.querySelectorAll('button.action-gold, button.btn-gold').length,
    })
  } catch (e) {
    results.push({
      id: game.id,
      engine: game.engine,
      fatal: String(e?.stack || e),
      errors: [...errors],
      crash: null,
      goldButtons: 0,
    })
  }
  await act(async () => { root.unmount() })
  container.innerHTML = ''
}

await vite.close()
writeFileSync('/tmp/opencode/blaze-runtime-results.json', JSON.stringify(results, null, 2))
const bad = results.filter((r) => r.fatal || r.boundary || r.errors.length)
console.log(`Jogos testados: ${results.length}; com erro: ${bad.length}`)
console.log(`Sem aposta registada após cliques: ${results.filter((r) => !r.txDelta).map((r) => r.id).join(', ') || 'nenhum'}`)
console.log(`Sem barra de aposta no tabuleiro: ${results.filter((r) => !r.stageActions).map((r) => r.id).join(', ') || 'nenhum'}`)
console.log(`Com barra de aposta nos controlos: ${results.filter((r) => r.sideActions).map((r) => r.id).join(', ') || 'nenhum'}`)
for (const r of bad) {
  console.log(`\n[${r.id} / ${r.engine}] ${r.fatal || r.boundary ? 'FALHA DE RENDER' : 'ERRO'}`)
  for (const e of (r.errors || []).slice(0, 4)) console.log(`  ${e.slice(0, 500)}`)
}

// Novos checks: elementos/estados da UI de crash e ausência de botões gold.
// Correm depois de todos os jogos, para que nenhuma falha parcial esconda os restantes resultados.
const crashGames = results.filter((r) => r.engine === 'crash' || r.id === 'crash')
const crashProblems = []
if (!crashGames.some((r) => r.id === 'crash')) crashProblems.push('crash: o jogo "crash" não foi testado')
for (const r of crashGames) {
  if (r.fatal || r.boundary) {
    crashProblems.push(`${r.id}: render falhou`)
    continue
  }
  if (!r.crash) {
    crashProblems.push(`${r.id}: não foi possível inspecionar a UI de crash`)
    continue
  }
  if (r.crash.missing.length) crashProblems.push(`${r.id}: faltam ${r.crash.missing.join(', ')}`)
  if (!r.crash.demoLabeled) crashProblems.push(`${r.id}: bots sem marcação de demonstração (demo/simulad)`)
}
const goldGames = results.filter((r) => r.goldButtons > 0)
console.log(`\nJogos com motor crash: ${crashGames.length}; problemas na UI: ${crashProblems.length}`)
crashProblems.forEach((problem) => console.log(` - ${problem}`))
console.log(`Botões gold no DOM: ${goldGames.length ? goldGames.map((r) => `${r.id} (${r.goldButtons})`).join(', ') : 'nenhum'}`)
process.exit(crashProblems.length || goldGames.length ? 1 : 0)
