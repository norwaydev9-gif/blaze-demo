# QA — BLAZE

## Comandos

```bash
npm run build                 # gera dist/ (pré-requisito do check estático)
npm run check                 # smoke estático
npm run check:runtime         # jsdom: 66 jogos, cliques e UI
node --check scripts/smoke.mjs && node --check scripts/runtime-smoke.mjs
```

`npm run check:runtime` guarda o detalhe por jogo em `/tmp/opencode/blaze-runtime-results.json`.

Estes checks são **estáticos ou jsdom**: não usam browser real, Android/WebView nem servidor/backend.

## Matriz de cobertura automática

| Área | Verificado | Onde | Fora de alcance |
| --- | --- | --- | --- |
| Catálogo | 66 jogos, `count`, IDs únicos, categorias válidas, 27 motores registados, listas `FEATURED_IDS`/`POPULAR_IDS` | `npm run check` | Regras de negócio de cada jogo |
| Rotas e assets | 16 rotas do `App.tsx` (menu e `navigate`), 15 imagens e créditos | `npm run check` | Navegação real em browser |
| Fundos Crash | Os 9 ids (`crash`, `aviator`, `space-flight`, `rocket-rush`, `sky-multiplier`, `cosmic-crash`, `turbo-crash`, `jet-rush`, `crash-deluxe`) existem como selectores `.game-stage[data-game='...']` em `src/index.css` e são jogos com motor `crash` | `npm run check` | Aparência/fundos reais; só se verifica a presença do selector |
| Marca e PWA | Identidade BLAZE em `index.html`, `package.json`, `README.md`, manifesto, `start.sh`, `src/`, `public/` e `dist/`; ausência da grafia antiga; cache SW `blaze-demo-v6` | `npm run check` | Instalação/offline reais da PWA |
| Build | `dist/index.html`, título, manifesto e todos os assets locais referenciados | `npm run check` (após `npm run build`) | Erros de compilação em produção fora do `tsc -b` |
| UI comum | Vectores `GameArt`, `autoPlay`, componentes de `GameUI`, barra de aposta no palco e ausência nos controlos, progresso de sessão, guarda de saldo | `npm run check` + `npm run check:runtime` | Contraste, spacing e responsividade reais (CSS do browser) |
| Apostas e estabilidade | Aposta registada após cliques nos 66 jogos, montagem imersiva, zero erros de render/console/jsdom | `npm run check:runtime` | Montantes/fluxo económico real; sessões longas |
| Crash (marcadores antigos) | `.crash-bots`, `.crash-bot` com `data-status`, `.crash-history`/`.crash-history-strip`, `.crash-timer`, `.crash-mult`, bots com texto `demo`/`simulad` | `npm run check` (marcadores no `CrashGame.tsx`) + `npm run check:runtime` (DOM) | Aspecto visual dos bots e significado semântico dos estados |
| Contrato DOM do Crash (estático) | No `CrashGame.tsx`: `.crash-history-strip`, `.crash-history-item`/`data-tier` (`low`/`mid`/`high`), `.crash-main` (`.crash-mult`, `.crash-status`, `.crash-timer`, `.crash-fx`), `.crash-live`, `.crash-activity`, `.crash-bet-panel`, `.crash-slot`, `data-kind`, rótulos `LIVE PLAYERS / ALL BETS`, `CASH OUT ACTIVITY`, `DEMONSTRAÇÃO`, valores rápidos/clamps 50/100/200/500 (presença textual; o runtime confirma botões/clamps) e uso de `verifyCrash`; zonas do palco antes de `side={` e ausentes depois | `npm run check` | A análise do JSX é por texto: assume um único `side={` e pode dar falsos positivos com helpers depois do JSX; o DOM no runtime é a prova definitiva |
| Contrato DOM do Crash (runtime) | Para os 9 jogos com motor `crash`, dentro de `.game-stage`: **histórico de rondas** (`.crash-history-strip` com níveis válidos), **apostas ao vivo** (`.crash-live` com `LIVE PLAYERS`, `ALL BETS`, `DEMONSTRAÇÃO` e bots via `data-kind`), **registo de cashouts** (`.crash-activity` com `CASH OUT ACTIVITY`) e **minhas apostas** (`.crash-bet-panel`/`.crash-slot` com input, rápidos, APOSTAR/CASHOUT, auto cashout e estado/resultado); `.crash-bot[data-kind="bot"]` sempre e `[data-kind="player"]` quando há aposta; `side` sem `.crash-bots`, `.crash-history-strip`, `.crash-activity`, `.bet-bar` ou `.crash-slot` | `npm run check:runtime` | jsdom não valida pintura real; rótulos são procurados por texto e os estados por `data-*`/texto aproximado; os rápidos são aceites como valores ou clamps `min`/`max`/`value` |
| Tons de botão | Nenhum botão com `tone="gold"` (apenas `bet`/`placed`/`cashout`/`auto`/`ghost`), incluindo classes `action-gold`/`btn-gold` nos jogos | `npm run check` + `npm run check:runtime` (DOM calculado) | `tone` vindos de variáveis não literais (só o DOM os apanha) |

As quatro zonas do Crash são verificadas como zonas **distintas**, todas dentro do palco: histórico de rondas, apostas ao vivo, registo de cashouts e minhas apostas. A barra de aposta e os slots devem estar no palco e nunca nos controlos (`side`).

Os checks de crash acumulam falhas e reportam-nas no fim: uma implementação ainda parcial não impede os restantes jogos/checks de correrem. O `npm run check:runtime` termina com código de saída 1 se faltarem elementos/rótulos do contrato, se zonas do palco aparecerem no `side`, se faltar um bot `player` quando há aposta registada ou se aparecerem botões gold.

## O que NÃO é testado automaticamente

- Browser real (Chrome/Firefox/Safari) e Android/WebView: toque, viewport, teclado virtual, `@media`, scrolling e gestos.
- Servidor/backend (`server/`, APIs, persistência remota, rede): nenhum servidor é iniciado e não são feitos pedidos reais; a carteira é simulada em `localStorage` dentro do jsdom.
- PWA instalada, service worker em condições reais de offline/actualização e notificações.
- Áudio, animações e canvas com pintura real: o jsdom usa stubs para `getContext`/`requestAnimationFrame`.
- Layout visual, contraste e legibilidade; o CSS global é verificado apenas por presença de selectores.
- Equidade/estatística dos RNG e comportamento de jogos com configuração inválida.
- Fluxos multi-sessão, persistência entre dispositivos e recuperação após falha de rede.
- Testes com dinheiro real: a aplicação é demonstração (B$ virtuais).

## Limitação documentada: isolated do `side` no check estático

O check estático separa o ficheiro em `antes de side={` / `depois de side={` e exige que `.crash-bots`, `.crash-history-strip`, `.crash-activity`, `.bet-bar` e `.crash-slot` apareçam só no primeiro segmento. É uma análise de texto simples: parte do princípio de que existe uma única prop `side={` e de que tudo o que vem depois pertence aos controlos. Se o componente tiver helpers/funções definidos depois do JSX que mencionem essas classes, podem ocorrer falsos positivos. A verificação definitiva é a inspecção do DOM no `npm run check:runtime`, que consulta directamente `.game-stage` e `.game-side-content`.

## Limitação documentada: bots vs. `placeBet`/`payout`

Não existe um check estático fiável que prove que a lógica dos bots não chama `placeBet` ou `payout`: essas funções são legitimamente usadas pelo fluxo de aposta humano no mesmo ficheiro (`src/games/CrashGame.tsx`) e os bots podem ser gerados inline no JSX, sem uma função delimitável por padrão de texto. Uma regex sobre o ficheiro inteiro produziria falsos positivos, por isso **não foi criado** um check frágil.

Em substituição, a verificação automática confirma que os bots existem, expõem `data-status` e estão rotulados como demonstração (`demo`/`simulad`). A revisão manual deve confirmar que os bots são apenas visuais: nenhum handler de bot chama `placeBet`, `payout`, `useWallet` ou qualquer efeito que altere saldo/transacções.
