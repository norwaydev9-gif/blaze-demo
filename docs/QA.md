# QA — BLAZE

## Comandos

```bash
npm run build                 # gera dist/ (pré-requisito do check estático)
npm run check                 # smoke estático
npm run check:runtime         # jsdom: 66 jogos, cliques e UI
node --check scripts/smoke.mjs && node --check scripts/runtime-smoke.mjs
```

`npm run check:runtime` guarda o detalhe por jogo em `/tmp/opencode/blaze-runtime-results.json`.

## Matriz de cobertura automática

| Área | Verificado | Onde | Fora de alcance |
| --- | --- | --- | --- |
| Catálogo | 66 jogos, `count`, IDs únicos, categorias válidas, 27 motores registados, listas `FEATURED_IDS`/`POPULAR_IDS` | `npm run check` | Regras de negócio de cada jogo |
| Rotas e assets | 16 rotas do `App.tsx` (menu e `navigate`), 15 imagens e créditos | `npm run check` | Navegação real em browser |
| Marca e PWA | Identidade BLAZE em `index.html`, `package.json`, `README.md`, manifesto, `start.sh`, `src/`, `public/` e `dist/`; ausência da grafia antiga; cache SW `blaze-demo-v5` | `npm run check` | Instalação/offline reais da PWA |
| Build | `dist/index.html`, título, manifesto e todos os assets locais referenciados | `npm run check` (após `npm run build`) | Erros de compilação em produção fora do `tsc -b` |
| UI comum | Vectores `GameArt`, `autoPlay`, componentes de `GameUI`, barra de aposta no palco e ausência nos controlos, progresso de sessão, guarda de saldo | `npm run check` + `npm run check:runtime` | Contraste, spacing e responsividade reais (CSS do browser) |
| Apostas e estabilidade | Aposta registada após cliques nos 66 jogos, montagem imersiva, zero erros de render/console/jsdom | `npm run check:runtime` | Montantes/fluxo económico real; sessões longas |
| Crash | `.crash-bots`, `.crash-bot` com `data-status`, `.crash-history`, `.crash-timer`, `.crash-mult`, bots com texto `demo`/`simulad` | `npm run check` (marcadores no `CrashGame.tsx`) + `npm run check:runtime` (DOM) | Aspecto visual dos bots e significado semântico dos estados |
| Tons de botão | Nenhum botão com `tone="gold"` (apenas `bet`/`placed`/`cashout`/`auto`/`ghost`), incluindo classes `action-gold`/`btn-gold` nos jogos | `npm run check` + `npm run check:runtime` (DOM calculado) | `tone` vindos de variáveis não literais (só o DOM os apanha) |

Os checks de crash acumulam falhas e reportam-nas no fim: uma implementação ainda parcial não impede os restantes jogos/checks de correrem. O `npm run check:runtime` termina com código de saída 1 se faltarem elementos de crash ou aparecerem botões gold.

## O que NÃO é testado automaticamente

- Browser real (Chrome/Firefox/Safari) e Android/WebView: toque, viewport, teclado virtual, `@media`, scrolling e gestos.
- PWA instalada, service worker em condições reais de offline/actualização e notificações.
- Áudio, animações e canvas com pintura real: o jsdom usa stubs para `getContext`/`requestAnimationFrame`.
- Layout visual, contraste e legibilidade; o CSS global é verificado apenas por presença de selectores.
- Equidade/estatística dos RNG e comportamento de jogos com configuração inválida.
- Fluxos multi-sessão, persistência entre dispositivos e recuperação após falha de rede.
- Testes com dinheiro real: a aplicação é demonstração (B$ virtuais).

## Limitação documentada: bots vs. `placeBet`/`payout`

Não existe um check estático fiável que prove que a lógica dos bots não chama `placeBet` ou `payout`: essas funções são legitimamente usadas pelo fluxo de aposta humano no mesmo ficheiro (`src/games/CrashGame.tsx`) e os bots podem ser gerados inline no JSX, sem uma função delimitável por padrão de texto. Uma regex sobre o ficheiro inteiro produziria falsos positivos, por isso **não foi criado** um check frágil.

Em substituição, a verificação automática confirma que os bots existem, expõem `data-status` e estão rotulados como demonstração (`demo`/`simulad`). A revisão manual deve confirmar que os bots são apenas visuais: nenhum handler de bot chama `placeBet`, `payout`, `useWallet` ou qualquer efeito que altere saldo/transacções.
