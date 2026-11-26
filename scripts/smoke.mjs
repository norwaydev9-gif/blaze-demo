/**
 * Verificação rápida sem dependências: catálogo, marca, rotas e build.
 * Uso: npm run check
 */
import { existsSync, readFileSync, readdirSync } from 'node:fs'

const root = new URL('..', import.meta.url)
const read = (file) => readFileSync(new URL(file, root), 'utf8')
const readJson = (file) => JSON.parse(read(file))

const errors = []
const check = (ok, message) => {
  if (!ok) errors.push(message)
}

/* ------------------------------- catálogo -------------------------------- */

const catalog = readJson('src/data/games.json')
const games = catalog.games
const ids = games.map((g) => g.id)
check(games.length === catalog.count, `games.json: count=${catalog.count} mas há ${games.length} jogos`)
check(new Set(ids).size === ids.length, 'games.json: existem IDs duplicados')

const types = read('src/lib/types.ts')
const categoryBlock = types.match(/export type GameCategory =([\s\S]*?)\n\n/)?.[1] ?? ''
const categories = [...categoryBlock.matchAll(/'([^']+)'/g)].map((m) => m[1])
check(categories.length > 0, 'types.ts: não foi possível ler as categorias')
games.forEach((g) => check(categories.includes(g.category), `Jogo ${g.id}: categoria desconhecida (${g.category})`))

const registry = read('src/games/registry.tsx')
const engines = [...registry.matchAll(/^  ([A-Za-z]\w*):\s*\w+,$/gm)].map((m) => m[1])
check(engines.length > 0, 'registry.tsx: não foi possível ler os motores')
games.forEach((g) => check(engines.includes(g.engine), `Jogo ${g.id}: motor ${g.engine} não está registado`))

const gamesLib = read('src/lib/games.ts')
for (const name of ['FEATURED_IDS', 'POPULAR_IDS']) {
  const block = gamesLib.match(new RegExp(`export const ${name} = \\[([\\s\\S]*?)\\]`))?.[1]
  check(Boolean(block), `games.ts: não foi possível ler ${name}`)
  const list = [...(block ?? '').matchAll(/'([^']+)'/g)].map((m) => m[1])
  list.forEach((id) => check(ids.includes(id), `${name}: o jogo ${id} não existe no catálogo`))
}

/* -------------------------------- imagens --------------------------------- */

const imageNames = [
  'hero.jpg',
  'cards.jpg',
  'crash.jpg',
  'limbo.jpg',
  'slots.jpg',
  'roulette.jpg',
  'mines.png',
  'plinko.jpg',
  'dice.jpg',
  'wheel.jpg',
  'keno.jpg',
  'balloon.jpg',
  'scratch.jpg',
  'tower.jpg',
  'arcade.jpg',
]
imageNames.forEach((name) => {
  check(existsSync(new URL(`public/images/${name}`, root)), `Falta a imagem public/images/${name}`)
})
check(gamesLib.includes('gameImage'), 'games.ts: falta o helper gameImage para as capas')
check(existsSync(new URL('docs/IMAGE_CREDITS.md', root)), 'Falta docs/IMAGE_CREDITS.md com os créditos das imagens')

/* -------------------------------- vectors / acções ------------------------ */

check(existsSync(new URL('src/components/GameArt.tsx', root)), 'Falta src/components/GameArt.tsx com os vectores dos jogos')
check(existsSync(new URL('src/lib/autoPlay.ts', root)), 'Falta src/lib/autoPlay.ts com os hooks de auto aposta/retirada')
const gameUi = read('src/components/GameUI.tsx')
for (const component of ['ActionButton', 'AutoControl', 'AutoBetControl']) {
  check(gameUi.includes(`export function ${component}`), `GameUI.tsx: falta o componente ${component}`)
}
check(read('src/index.css').includes('.app-immersive'), 'index.css: falta o modo jogo em ecrã inteiro')
check(read('src/pages/GamePage.tsx').includes('game-immersive-engine'), 'GamePage.tsx: falta o palco imersivo')
check(read('src/pages/GamePage.tsx').includes('<GameEngine key={game.id}'), 'GamePage.tsx: o motor deve ser remontado ao trocar de jogo')
check(gameUi.includes('saldo insuficiente'), 'GameUI.tsx: falta a guarda de saldo insuficiente no BetInput')
check(gameUi.includes("tone === 'placed'"), 'GameUI.tsx: falta o estado visual de aposta activa')
check(gameUi.includes('Progresso ·'), 'GameUI.tsx: falta o painel de progresso da sessão')
check(gameUi.includes('currentLabel'), 'GameUI.tsx: falta o progresso até ao alvo no auto-retirar')
check(read('src/index.css').includes('.bet-bar'), 'index.css: falta a barra de aposta com contraste alto')
check(existsSync(new URL('docs/UI_REFERENCES.md', root)), 'Falta docs/UI_REFERENCES.md com as referências visuais')

/* -------------------------------- marca ---------------------------------- */

const walk = (dir) =>
  readdirSync(new URL(dir, root), { withFileTypes: true }).flatMap((entry) => {
    const path = `${dir}/${entry.name}`
    return entry.isDirectory() ? walk(path) : [path]
  })

const brandFiles = [
  'index.html',
  'package.json',
  'README.md',
  'public/manifest.webmanifest',
  'start.sh',
  ...walk('src'),
  ...walk('public'),
]
brandFiles.forEach((file) => {
  check(!/BLASE/.test(read(file)), `${file}: ainda contém a marca antiga BLASE`)
})

const packageJson = readJson('package.json')
check(packageJson.name === 'blaze', `package.json: nome é ${packageJson.name}, esperado blaze`)

/* ------------------------- UI de crash / tons ---------------------------- */

// Elementos estáveis prometidos pelo componente CrashGame (mesmo que a introdução
// ainda esteja em curso, todos os problemas são acumulados — não abortamos aqui).
const crashSource = read('src/games/CrashGame.tsx')
const crashMarkers = [
  [/\bcrash-bots\b/, '.crash-bots'],
  [/\bcrash-bot\b/, '.crash-bot'],
  [/\bcrash-history\b/, '.crash-history'],
  [/\bcrash-timer\b/, '.crash-timer'],
  [/\bcrash-mult\b/, '.crash-mult'],
  [/\bdata-status\b/, 'data-status'],
]
crashMarkers.forEach(([pattern, label]) => {
  check(pattern.test(crashSource), `CrashGame.tsx: falta o marcador ${label} da UI de crash`)
})
check(/demo|simulad/i.test(crashSource), 'CrashGame.tsx: os bots não estão identificados como demonstração (demo/simulad)')

// Contrato DOM estável: quatro zonas distintas no palco, nunca nos controlos.
const crashContractMarkers = [
  [/\bcrash-history-strip\b/, '.crash-history-strip'],
  [/\bcrash-history-item\b/, '.crash-history-item'],
  [/\bcrash-main\b/, '.crash-main'],
  [/\bcrash-status\b/, '.crash-status'],
  [/\bcrash-fx\b/, '.crash-fx'],
  [/\bcrash-live\b/, '.crash-live'],
  [/\bcrash-activity\b/, '.crash-activity'],
  [/\bcrash-bet-panel\b/, '.crash-bet-panel'],
  [/\bcrash-slot\b/, '.crash-slot'],
  [/\bdata-kind\b/, 'data-kind'],
  [/\bdata-tier\b/, 'data-tier'],
  [/\bverifyCrash\s*\(/, 'verifyCrash(...)'],
]
crashContractMarkers.forEach(([pattern, label]) => {
  check(pattern.test(crashSource), `CrashGame.tsx: falta o marcador do contrato ${label}`)
})
for (const tier of ['low', 'mid', 'high']) {
  check(new RegExp(`['"\`]${tier}['"\`]`).test(crashSource), `CrashGame.tsx: falta o nível "${tier}" de data-tier no histórico`)
}
for (const label of ['LIVE PLAYERS', 'ALL BETS', 'CASH OUT ACTIVITY', 'DEMONSTRAÇÃO']) {
  check(crashSource.toLowerCase().includes(label.toLowerCase()), `CrashGame.tsx: falta o rótulo "${label}" da zona de crash`)
}
for (const amount of [50, 100, 200, 500]) {
  check(new RegExp(`\\b${amount}\\b`).test(crashSource), `CrashGame.tsx: falta o valor rápido/clamp ${amount}`)
}

// Análise simples do JSX: tudo o que é específico do palco deve aparecer antes de `side={`.
// Limitação: assume uma única prop `side={` e que todo o texto depois dela pertence aos
// controlos; helpers definidos depois do JSX podem gerar falsos positivos. O DOM no
// runtime-smoke é a verificação definitiva.
const sideMarker = crashSource.indexOf('side={')
check(sideMarker > 0, 'CrashGame.tsx: não foi possível localizar a prop side={ para isolar as zonas')
if (sideMarker > 0) {
  const beforeSide = crashSource.slice(0, sideMarker)
  const afterSide = crashSource.slice(sideMarker)
  for (const className of ['crash-bots', 'crash-history-strip', 'crash-activity', 'bet-bar', 'crash-slot']) {
    const pattern = new RegExp(`\\b${className}\\b`)
    check(pattern.test(beforeSide), `CrashGame.tsx: ${className} deve existir no palco (antes de side={)`)
    check(!pattern.test(afterSide), `CrashGame.tsx: ${className} não pode aparecer depois de side={ (só no palco)`)
  }
}

/* ------------- visibilidade real: painel de aposta e palco ------------------- */

// O painel "sumiu" num layout imersivo de altura fixa porque o Stage tinha
// overflow-hidden. Checks de presença no DOM não apanham clipping: validamos
// a configuração que permite ao palco scrollar e ao painel ocupar a sua altura.
const stageTags = [...crashSource.matchAll(/<Stage\b[^>]*>/g)].map((m) => m[0])
const stageClassValue = (tag) => tag.match(/\bclassName\s*=\s*(?:"([^"]*)"|'([^']*)'|`([^`]*)`|\{([^}]*)\})/)?.slice(1).find(Boolean) ?? ''
// Só a classe exacta overflow-hidden clipa o conteúdo; overflow-x-hidden é permitido.
const clipsOverflow = (value) => /(?:^|[^\w-])overflow-hidden(?:$|[^\w-])/.test(value)
check(stageTags.length > 0, 'CrashGame.tsx: não foi possível localizar o <Stage> do palco de crash')
check(
  stageTags.some((tag) => stageClassValue(tag) && !clipsOverflow(stageClassValue(tag))),
  'CrashGame.tsx: deve existir um <Stage> sem overflow-hidden (use overflow-x-hidden se precisar de cortar apenas em X)',
)
check(
  !stageTags.some((tag) => clipsOverflow(stageClassValue(tag))),
  'CrashGame.tsx: <Stage className="overflow-hidden"> esconde o painel de aposta em ecrãs imersivos de altura fixa — remover overflow-hidden do Stage',
)

const crashCss = read('src/index.css')
const immersiveStageBlocks = [...crashCss.matchAll(/\.game-immersive-engine\s+\.game-stage\s*\{([^}]*)\}/g)].map((m) => m[1])
check(
  immersiveStageBlocks.some((block) => /\boverflow-y\s*:\s*auto\b/.test(block)),
  'index.css: .game-immersive-engine .game-stage precisa de overflow-y:auto para o painel de aposta poder ser scrollado no modo imersivo',
)
check(
  immersiveStageBlocks.some((block) => /\boverscroll-behavior\s*:\s*contain\b/.test(block)),
  'index.css: .game-immersive-engine .game-stage precisa de overscroll-behavior:contain (evita que o scroll do painel mova a página)',
)

const crashMainBlocks = [...crashCss.matchAll(/\.crash-main\s*\{([^}]*)\}/g)].map((m) => m[1])
check(
  !crashMainBlocks.some((block) => /\bflex\s*:\s*1\s+1\s+auto\b/.test(block)),
  'index.css: .crash-main não pode usar flex:1 1 auto — o crescimento do palco empurra o painel de aposta para fora da viewport',
)
check(
  crashMainBlocks.some((block) => /\bflex\s*:\s*0\s+0\s+auto\b/.test(block)),
  'index.css: .crash-main deve usar flex:0 0 auto para não roubar altura ao painel de aposta',
)

// Layout Android: os dois painéis de aposta ficam lado a lado e o painel é
// ancorado ao fundo, para APOSTAR/CASHOUT não exigirem scrolling na primeira ronda.
check(
  /crash-slot-grid/.test(crashSource),
  'CrashGame.tsx: falta a classe crash-slot-grid na grelha de slots (layout de dois painéis em mobile)',
)
const mobileBetPanelBlocks = [...crashCss.matchAll(/\.crash-bet-panel\.bet-bar\s*\{([^}]*)\}/g)].map((m) => m[1])
check(
  mobileBetPanelBlocks.some((block) => /\bposition\s*:\s*sticky\b/.test(block) && /\bbottom\s*:/.test(block)),
  'index.css: o painel de aposta do crash deve ficar ancorado ao fundo em mobile (position:sticky + bottom)',
)
const crashSlotGridBlocks = [...crashCss.matchAll(/\.crash-slot-grid\s*\{([^}]*)\}/g)].map((m) => m[1])
check(
  crashSlotGridBlocks.some((block) => /repeat\(\s*2\s*,/.test(block)),
  'index.css: .crash-slot-grid deve usar duas colunas em mobile (dois painéis lado a lado)',
)

/* --------------- fundos próprios e som das variantes crash ------------------ */

const crashVariantIds = [
  'crash', 'aviator', 'space-flight', 'rocket-rush', 'sky-multiplier',
  'cosmic-crash', 'turbo-crash', 'jet-rush', 'crash-deluxe',
]
crashVariantIds.forEach((id) => {
  check(
    new RegExp(`\\.game-stage\\[data-game\\s*=\\s*['"]${id}['"]\\]`).test(crashCss),
    `index.css: falta o selector .game-stage[data-game='${id}'] com fundo da variante crash`,
  )
  check(games.some((g) => g.id === id && g.engine === 'crash'), `games.json: ${id} não é um jogo com motor crash`)
})

// Sons próprios por variante: as nove assinaturas e o uso do helper no componente.
const crashSound = read('src/lib/crashSound.ts')
crashVariantIds.forEach((id) => {
  check(
    new RegExp(`^[ \\t]*['"]?${id}['"]?[ \\t]*:`, 'm').test(crashSound),
    `crashSound.ts: falta a assinatura sonora da variante ${id}`,
  )
})
check(/\bplayCrashCue\s*\(/.test(crashSound), 'crashSound.ts: falta a exportação playCrashCue(...)')
check(/\bplayCrashCue\b/.test(crashSource), 'CrashGame.tsx: falta a referência a playCrashCue nos eventos de som')

// Nenhum botão de jogo pode usar o tom "gold"; apenas bet/placed/cashout/auto/ghost.
const goldTone = /\btone\s*=\s*(?:"gold"|'gold'|\{\s*(?:"gold"|'gold'|`gold`)\s*\})/
const goldClass = /\b(?:action-gold|btn-gold)\b/
walk('src/games')
  .filter((file) => /\.(?:t|j)sx$/.test(file))
  .forEach((file) => {
    const source = read(file)
    check(!goldTone.test(source), `${file}: encontrado botão com tone="gold" (usar bet/placed/cashout/auto/ghost)`)
    check(!goldClass.test(source), `${file}: encontrada classe de botão gold (action-gold/btn-gold)`)
  })

/* -------------------------------- rotas ---------------------------------- */

const app = read('src/App.tsx')
const routes = new Set([...app.matchAll(/root === '([^']+)'/g)].map((m) => m[1]))
routes.add('')

const layout = read('src/components/Layout.tsx')
const menuTargets = [...layout.matchAll(/to: '([^']+)'/g)].map((m) => m[1].slice(1))
menuTargets.forEach((target) => check(routes.has(target), `Menu: /${target} não tem rota no App.tsx`))

const pages = [...walk('src')].filter((file) => file.startsWith('src/pages/') || file.startsWith('src/components/'))
pages.forEach((file) => {
  const staticTargets = [...read(file).matchAll(/navigate\('([^']+)'/g)].map((m) => m[1])
  staticTargets.forEach((target) => {
    const section = target.split('/').filter(Boolean)[0] ?? ''
    check(routes.has(section), `${file}: navigate('${target}') não tem rota no App.tsx`)
  })
})

/* -------------------------------- build ---------------------------------- */

check(existsSync(new URL('dist/index.html', root)), 'Falta dist/index.html — corre npm run build primeiro')
if (existsSync(new URL('dist/index.html', root))) {
  const html = read('dist/index.html')
  check(html.includes('<title>BLAZE'), 'dist/index.html: o título não usa BLAZE')
  const assets = [...html.matchAll(/(?:href|src)="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((path) => path.startsWith('./') || path.startsWith('/'))
  assets.forEach((path) => {
    const local = path.replace(/^\.\//, '').replace(/^\//, '')
    check(existsSync(new URL(`dist/${local}`, root)), `dist: falta o ficheiro ${path}`)
  })

  const manifest = readJson('dist/manifest.webmanifest')
  check(manifest.name.includes('BLAZE'), 'dist/manifest.webmanifest: nome não usa BLAZE')
  check(read('dist/sw.js').includes('blaze-demo-v8'), 'dist/sw.js: cache não foi atualizado para blaze-demo-v8')
}

/* -------------------------------- resultado ------------------------------- */

if (errors.length) {
  console.error(`Check falhou com ${errors.length} problema(s):`)
  errors.forEach((error) => console.error(` - ${error}`))
  process.exit(1)
}

console.log(
  `OK — ${games.length} jogos, ${engines.length} motores, ${routes.size} rotas, ${imageNames.length} imagens, vectores/acções, marca BLAZE, build, contrato DOM do crash, visibilidade do painel de aposta, ${crashVariantIds.length} fundos data-game e sons de crash verificados.`,
)
