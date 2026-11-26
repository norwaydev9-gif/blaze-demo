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
// ".crash-history-strip" substitui o antigo ".crash-history"; ambos são aceites para
// preservar o check original.
const crashSelectors = [
  '.crash-bots', '.crash-history-strip, .crash-history', '.crash-timer', '.crash-mult',
  '.crash-status', '.crash-fx',
]
const crashStageSelectors = [
  '.crash-history-strip', '.crash-main', '.crash-live', '.crash-activity',
  '.crash-bet-panel', '.crash-slot',
]
const crashSideForbidden = ['.crash-bots', '.crash-history-strip', '.crash-activity', '.bet-bar', '.crash-slot']
const crashQuickAmounts = [50, 100, 200, 500]
const crashTiers = ['low', 'mid', 'high']
const hasText = (text, label) => (text || '').toLowerCase().includes(label.toLowerCase())

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

// Contrato das quatro zonas dentro de .game-stage:
// histórico de rondas, apostas ao vivo, registo de cashouts e minhas apostas.
const readCrashContract = (stage, side) => {
  const missing = []
  if (!stage) {
    return { missing: ['palco .game-stage'], bots: 0, playerBots: 0, sideHits: [], slotCount: 0, quickMissing: [...crashQuickAmounts] }
  }

  crashStageSelectors.forEach((sel) => {
    if (!stage.querySelector(sel)) missing.push(`palco ${sel}`)
  })

  const main = stage.querySelector('.crash-main')
  if (main) {
    for (const sel of ['canvas', '.crash-mult', '.crash-status', '.crash-timer', '.crash-fx']) {
      if (!main.querySelector(sel)) missing.push(`.crash-main > ${sel}`)
    }
  }

  const history = stage.querySelector('.crash-history-strip')
  if (history) {
    const tiers = [...history.querySelectorAll('.crash-history-item')].map((item) => item.getAttribute('data-tier'))
    const bad = tiers.filter((tier) => !crashTiers.includes(tier))
    if (bad.length) missing.push(`.crash-history-item[data-tier] inválido (${[...new Set(bad)].join(', ')})`)
  }

  const live = stage.querySelector('.crash-live')
  if (live) {
    for (const label of ['LIVE PLAYERS', 'ALL BETS', 'DEMONSTRAÇÃO']) {
      if (!hasText(live.textContent, label)) missing.push(`rótulo "${label}" em .crash-live`)
    }
  }
  const activity = stage.querySelector('.crash-activity')
  if (activity && !hasText(activity.textContent, 'CASH OUT ACTIVITY')) {
    missing.push('rótulo "CASH OUT ACTIVITY" em .crash-activity')
  }

  const sideHits = side ? crashSideForbidden.filter((sel) => side.querySelector(sel)) : []
  const bots = [...stage.querySelectorAll('.crash-bot[data-kind]')]
  if (!bots.some((bot) => bot.getAttribute('data-kind') === 'bot')) {
    missing.push('.crash-bot[data-kind="bot"]')
  }

  const slots = [...stage.querySelectorAll('.crash-slot')]
  slots.forEach((slot, index) => {
    const label = `.crash-slot #${index + 1}`
    const slotButtons = [...slot.querySelectorAll('button')]
    const slotText = slot.textContent || ''
    if (!slot.querySelector('input')) missing.push(`${label} sem input`)
    if (!slotButtons.some((button) => /apostar|cashout|retirar/i.test(button.textContent || ''))) {
      missing.push(`${label} sem APOSTAR/CASHOUT`)
    }
    if (!/auto/i.test(slotText)) missing.push(`${label} sem auto cashout`)
    const hasStatus = slot.querySelector('[data-status], [data-state], .crash-slot-status')
      || /em jogo|retirad|perdido|resultado|aguard|pendente|confirmad|ganh/i.test(slotText)
    if (!hasStatus) missing.push(`${label} sem estado/resultado`)
  })

  // Os valores rápidos podem estar ausentes quando o jogo os substitui por um clamp
  // equivalente nos atributos min/max/value dos inputs de aposta.
  const quickTexts = [...stage.querySelectorAll('button')].map((button) => (button.textContent || '').trim())
  const clamps = [...stage.querySelectorAll('input[type="number"]')].flatMap((input) => [input.min, input.max, input.value])
  const quickMissing = crashQuickAmounts.filter((amount) =>
    !quickTexts.some((text) => new RegExp(`\\b${amount}\\b`).test(text))
    && !clamps.some((value) => Number(value) === amount))
  if (quickMissing.length) missing.push(`rápidos/clamps ausentes: ${quickMissing.join('/')}`)

  return {
    missing,
    bots: bots.length,
    playerBots: bots.filter((bot) => bot.getAttribute('data-kind') === 'player').length,
    sideHits,
    slotCount: slots.length,
    quickMissing,
  }
}
const mergeCrashContract = (a, b) => ({
  // Um elemento pode existir só depois dos cliques; falta apenas se faltar nos dois estados.
  missing: a.missing.filter((m) => b.missing.includes(m)),
  bots: Math.max(a.bots, b.bots),
  playerBots: Math.max(a.playerBots, b.playerBots),
  // Zonas proibidas nos controlos são falha em qualquer dos estados.
  sideHits: [...new Set([...a.sideHits, ...b.sideHits])],
  slotCount: Math.max(a.slotCount, b.slotCount),
  quickMissing: a.quickMissing.filter((m) => b.quickMissing.includes(m)),
})

// Visibilidade real (dentro do que jsdom consegue observar): classes que escondem
// o painel, clipping no Stage, ordem das zonas C/D e botões utilizáveis na fase
// de apostas. Problemas em qualquer um dos estados observados são acumulados.
const hidingClasses = ['hidden', 'sr-only', 'invisible', 'overflow-hidden']
const classTokens = (el) => new Set(String(el?.className || '').split(/\s+/).filter(Boolean))
const topLevelIndex = (stage, el) => {
  if (!stage || !el) return -1
  let node = el
  while (node && node.parentElement && node.parentElement !== stage) node = node.parentElement
  return node?.parentElement === stage ? [...stage.children].indexOf(node) : -1
}
const readCrashVisibility = (stage) => {
  const issues = []
  if (!stage) {
    return { issues: ['palco .game-stage ausente'], apostar: false, cashout: false, buttons: 0, enabled: 0, bettingSeen: false, bettingEnabled: 0, orderOk: false }
  }
  const panel = stage.querySelector('.crash-bet-panel')
  if (!panel) issues.push('.crash-bet-panel ausente no palco')
  const badPanelClasses = hidingClasses.filter((cls) => classTokens(panel).has(cls))
  if (badPanelClasses.length) issues.push(`.crash-bet-panel com classe que esconde conteúdo (${badPanelClasses.join(', ')})`)
  if (classTokens(stage).has('overflow-hidden')) issues.push('.game-stage com overflow-hidden (clippa o painel de aposta)')

  const panelIndex = topLevelIndex(stage, panel)
  const cIndex = topLevelIndex(stage, stage.querySelector('.crash-live'))
  const dIndex = topLevelIndex(stage, stage.querySelector('.crash-activity'))
  const orderOk = panelIndex >= 0 && cIndex >= 0 && dIndex >= 0 && panelIndex < cIndex && panelIndex < dIndex
  if (!orderOk) {
    if (panelIndex < 0) issues.push('.crash-bet-panel não é filho/descendente directo do Stage')
    else if (cIndex < 0 && dIndex < 0) issues.push('zonas C/D (.crash-live / .crash-activity) ausentes do Stage')
    else issues.push(`.crash-bet-panel depois das zonas C/D na ordem de filhos do Stage (painel=${panelIndex}, C=${cIndex}, D=${dIndex})`)
  }

  const actions = [...(panel?.querySelectorAll('button') || [])]
    .filter((button) => /apostar|cashout|retirar/i.test(button.textContent || ''))
  const enabled = actions.filter((button) => !button.disabled).length
  const bettingSeen = /apostas abertas|a ronda começa|\bbetting\b/i.test(stage.textContent || '')
  return {
    issues,
    apostar: actions.some((button) => /apostar/i.test(button.textContent || '')),
    cashout: actions.some((button) => /cashout/i.test(button.textContent || '')),
    buttons: actions.length,
    enabled,
    bettingSeen,
    bettingEnabled: bettingSeen ? enabled : 0,
    orderOk,
  }
}
const mergeCrashVisibility = (a, b) => ({
  issues: [...new Set([...a.issues, ...b.issues])],
  apostar: a.apostar || b.apostar,
  cashout: a.cashout || b.cashout,
  buttons: Math.max(a.buttons, b.buttons),
  enabled: Math.max(a.enabled, b.enabled),
  bettingSeen: a.bettingSeen || b.bettingSeen,
  bettingEnabled: Math.max(a.bettingEnabled, b.bettingEnabled),
  orderOk: a.orderOk || b.orderOk,
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
    const stage = container.querySelector('.game-stage') || scope
    const side = container.querySelector('.game-side-content')
    const isCrash = game.engine === 'crash'
    const crashInitial = isCrash ? readCrashUi(stage) : null
    const crashContractInitial = isCrash ? readCrashContract(stage, side) : null
    const crashVisibilityInitial = isCrash ? readCrashVisibility(stage) : null
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
    const txDelta = readTx().length - txBefore
    const stageAfter = container.querySelector('.game-stage') || scope
    const sideAfter = container.querySelector('.game-side-content') || side
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
      txDelta,
      crash: crashInitial ? mergeCrashUi(crashInitial, readCrashUi(stageAfter)) : null,
      crashContract: crashContractInitial
        ? mergeCrashContract(crashContractInitial, readCrashContract(stageAfter, sideAfter))
        : null,
      crashVisibility: crashVisibilityInitial
        ? mergeCrashVisibility(crashVisibilityInitial, readCrashVisibility(stageAfter))
        : null,
      goldButtons: scope.querySelectorAll('button.action-gold, button.btn-gold').length,
    })
  } catch (e) {
    results.push({
      id: game.id,
      engine: game.engine,
      fatal: String(e?.stack || e),
      errors: [...errors],
      crash: null,
      crashContract: null,
      crashVisibility: null,
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

// Checks finais: UI de crash, contrato das quatro zonas e ausência de botões gold.
// Correm depois de todos os jogos, para que nenhuma falha parcial esconda os restantes resultados.
const crashGames = results.filter((r) => r.engine === 'crash' || r.id === 'crash')
const crashProblems = []
if (!crashGames.some((r) => r.id === 'crash')) crashProblems.push('crash: o jogo "crash" não foi testado')
if (crashGames.length !== 9) crashProblems.push(`crash: esperados 9 jogos com motor crash; encontrados ${crashGames.length}`)
for (const r of crashGames) {
  if (r.fatal || r.boundary) {
    crashProblems.push(`${r.id}: render falhou`)
    continue
  }
  if (!r.crash) {
    crashProblems.push(`${r.id}: não foi possível inspecionar a UI de crash`)
  } else {
    if (r.crash.missing.length) crashProblems.push(`${r.id}: faltam ${r.crash.missing.join(', ')}`)
    if (!r.crash.demoLabeled) crashProblems.push(`${r.id}: bots sem marcação de demonstração (demo/simulad)`)
  }
  // Contrato DOM: histórico de rondas, apostas ao vivo, registo de cashouts e minhas apostas.
  const contract = r.crashContract
  if (!contract) {
    crashProblems.push(`${r.id}: não foi possível inspecionar o contrato DOM das quatro zonas`)
    continue
  }
  if (contract.missing.length) crashProblems.push(`${r.id}: contrato DOM incompleto — ${contract.missing.join(', ')}`)
  if (contract.sideHits.length) {
    crashProblems.push(`${r.id}: controlos contêm zonas exclusivas do palco (${contract.sideHits.join(', ')})`)
  }
  if (r.txDelta > 0 && !contract.playerBots) {
    crashProblems.push(`${r.id}: falta .crash-bot[data-kind="player"] apesar de haver aposta registada`)
  }
}
if (!crashGames.some((r) => r.txDelta > 0)) {
  crashProblems.push('crash: nenhum jogo registou aposta; não foi possível validar .crash-bot[data-kind="player"]')
}
// Problemas de visibilidade: classes que escondem o painel, clipping no Stage,
// ordem C/D e ausência de botão habilitado na fase de apostas.
const visibilityProblems = (r) => {
  const vis = r.crashVisibility
  if (!vis) return ['não foi possível inspecionar a visibilidade do painel de aposta']
  const problems = [...vis.issues]
  if (!vis.apostar) problems.push('nenhum botão APOSTAR encontrado no painel de aposta')
  if (!vis.cashout) problems.push('nenhum botão CASHOUT encontrado no painel de aposta')
  if (!vis.bettingEnabled) {
    problems.push(`nenhum botão APOSTAR/CASHOUT habilitado na fase de apostas (fase ${vis.bettingSeen ? 'detectada' : 'não detectada no DOM'})`)
  }
  return problems
}
for (const r of crashGames) {
  if (r.fatal || r.boundary) continue
  visibilityProblems(r).forEach((problem) => crashProblems.push(`${r.id}: ${problem}`))
}
const goldGames = results.filter((r) => r.goldButtons > 0)
const contractOk = crashGames.filter((r) => r.crashContract
  && !r.crashContract.missing.length
  && !r.crashContract.sideHits.length
  && (!r.txDelta || r.crashContract.playerBots)).length
const visibilityOk = crashGames.filter((r) => !r.fatal && !r.boundary && !visibilityProblems(r).length).length
console.log(`\nJogos com motor crash: ${crashGames.length}; contrato DOM completo: ${contractOk}; painel visível/operável: ${visibilityOk}; problemas na UI: ${crashProblems.length}`)
crashProblems.forEach((problem) => console.log(` - ${problem}`))
console.log(`Botões gold no DOM: ${goldGames.length ? goldGames.map((r) => `${r.id} (${r.goldButtons})`).join(', ') : 'nenhum'}`)
process.exit(crashProblems.length || goldGames.length ? 1 : 0)
