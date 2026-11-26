# Auditoria da BLAZE

**Data:** 26 de novembro de 2026  
**Âmbito:** aplicação React/Vite em `/root/AI-Projects/blaze` (antigo `blase`)  
**Método:** revisão do código, catálogo de jogos, rotas, build de produção e smoke test HTTP.

## Resumo

A base estava funcional: `tsc` passava, o build produzia `dist/` e os 66 jogos
referenciam 27 motores existentes. Os problemas encontrados eram sobretudo de
**marca**, **navegação**, **ligações mortas** e **inconsistência na prova do Crash**.

## O que estava errado e foi corrigido

| # | Problema | Correção |
|---|----------|----------|
| 1 | A marca aparecia como **BLASE** em todo o lado (logo, HTML, manifest, README, package, cache). | Tudo passou a **BLAZE**: UI, `<title>`, meta description, manifest, `package.json`, service worker e README. |
| 2 | Chaves de `localStorage` usavam `blase.*`. | Passaram a `blaze.*`, com **migração automática** das chaves antigas em `src/lib/storage.ts`. O saldo e favoritos existentes não se perdem. |
| 3 | Várias entradas do menu abriam a página **404**: `/apostas`, `/perfil`, `/suporte`, `/desporto`, `/live` e `/casino`. | Todas passaram a ter rota. `/apostas` reutiliza o histórico, `/perfil` e `/suporte` são páginas novas, `/desporto` e `/live` mostram um estado honesto de integração necessária e `/casino` abre o catálogo. |
| 4 | Páginas existentes mas inalcançáveis: Favoritos, Rankings e Histórico. | Foram adicionadas ao menu lateral (`/favoritos`, `/rankings`, `/apostas`). |
| 5 | “Termos” e “Privacidade” no rodapé eram texto sem link. | Foram criadas as páginas `/termos` e `/privacidade` com conteúdo de demonstração. |
| 6 | O Crash mostrava uma “prova” que **não era usada** para calcular o crash (`crashPoint()` aleatório independente). | O crash passou a ser derivado da semente da ronda (`crashFromSeed`). Durante o voo mostra-se o hash; no crash revela-se a semente, permitindo verificar o resultado. |
| 7 | Pesquisa: premir Enter ia para `/jogos` e **perdia o texto pesquisado**. | A pesquisa passou a navegar para `/jogos?q=…`; o catálogo lê o parâmetro e há “Ver todos os resultados”. |
| 8 | Botão de notificações não fazia nada e o ponto vermelho estava sempre visível. | Passou a mostrar um toast e o ponto só aparece quando há bónus disponível. |
| 9 | Código morto: `pages/Misc.tsx` duplicava páginas já existentes e `games/engines.tsx` não era usado. | As duplicações foram removidas e as páginas úteis (perfil, suporte, aviso de provider) foram reescritas em `pages/Account.tsx`. O `GameEngine` passou a ser o ponto único de entrada dos motores. |
| 10 | Service worker continuava a usar o cache `blase-demo-v1`. | Passou para `blaze-demo-v2`, forçando a substituição do cache antigo no próximo carregamento. |
| 11 | Página de perfil tinha “limites de jogo responsável” que não eram aplicados. | Foram substituídos por informação honesta, estatísticas reais, exportação e apagamento dos dados locais. |
| 12 | O título do documento ficava sempre “BLAZE — Casino demo”, mesmo dentro de um jogo. | O router atualiza o `<title>` por rota (jogo, carteira, rankings, etc.). |
| 13 | O ícone/logo era um glifo abstrato que não comunicava “BLAZE”. | O logo e o `public/icon.svg` passaram a usar uma chama, alinhada com a marca. |
| 14 | `fmt()` forçava valores negativos a zero, pelo que todas as apostas apareciam como **0,00 B$** no histórico. | `fmt()` passou a formatar negativos; histórico, carteira e página de jogo mostram `−valor` corretamente. |
| 15 | Metadados PWA/SEO incompletos (língua `pt`, sem Open Graph, sem `apple-mobile-web-app-title`). | `lang="pt-PT"`, Open Graph, `application-name` e títulos por rota. |
| 16 | Estado carregado do `localStorage` podia estar corrompido/incompleto e gerar `NaN` ou erros. | Carteira, favoritos e recentes validam e normalizam os dados ao carregar. |
| 17 | O bónus aparecia como “diário” mas era concedido a cada 4 horas. | Textos corrigidos para “Bónus de 4 horas”. |
| 18 | PWA só com ícone SVG e sem `apple-touch-icon`. | Ícones PNG 192/512, `apple-touch-icon` e service worker atualizado. |
| 19 | Não havia verificação automática de consistência. | `npm run check` (`scripts/smoke.mjs`) valida catálogo, motores, rotas, marca e build sem dependências. |
| 20 | A dock móvel podia tapar o fim do tabuleiro quando havia `safe-area-inset-bottom`; toasts também ficavam sobre os controlos. | Variáveis `--mobile-nav-h`/`--dock-handle-h` passaram a incluir a nav de 48px + safe-area; dock e toasts usam essas variáveis e o `<main>` reserva o espaço correcto. |
| 21 | Canvas de Crash/Plinko e sobretudo Arcade eram achatados em 360–430px (`h-[360px]` com memória 640×420). | Todos passaram a `aspect-ratio` (4/3, quadrado, 640/420), com `max-height: 52vh` em telemóvel. |
| 22 | Keno tinha botões de ~24×28px e exigia scroll dentro do tabuleiro. | Grelha passou a 5 colunas em mobile (44px por botão) e 10 colunas em `sm`. |
| 23 | Vários controlos tinham 25–40px de altura (aposta, favoritos, navegação, roleta, torre, poker). | Regra global `min-height: 44px` em mobile + ajustes específicos; slider com thumb de 26px. |
| 24 | Jogos de cartas podiam sair do tabuleiro em 360px. | Cartas responsivas (`w-16` em mobile, `w-24` em `sm`), `flex-wrap` nas mãos e `min-height` maior para mesas grandes. |
| 25 | Catálogo e palcos eram só gradientes/emoji, sem identidade visual. | 15 imagens licenciadas (Wikimedia Commons) ligadas por motor/categoria em cartões, capa do jogo, palco e hero; créditos documentados. |
| 26 | Service worker ainda usava `blaze-demo-v2` e não cacheava arte. | Passou a `blaze-demo-v3` e pré-cacheia as capas principais. |

## Segunda passagem — visual e Android

- Gerador de imagens indisponível (`Invalid credential`); foram usadas imagens com
  licença livre da Wikimedia Commons, com inventário em `docs/IMAGE_CREDITS.md`.
- Nenhuma imagem é carregada de domínios externos em runtime: todas estão em
  `public/images/` e usam `import.meta.env.BASE_URL`, funcionando também no
  GitHub Pages (base relativa `./`).
- O fundo do palco usa `--game-bg`, definido pela página do jogo e removido ao
  sair, para não contaminar outras rotas.

## Terceira passagem — vectores e acções

- Cada motor passou a ter desenho vectorial próprio em `src/components/GameArt.tsx`
  (Aviator = avião, Limbo = foguetão, Mines = mina, Slots = máquina, Roleta,
  Plinko, Dados, Keno, Balão, Raspadinha, Torre, Arcade, cartas, moeda).
  Os vectores aparecem nos cartões, no cabeçalho do jogo, no hero e como marca
  d'água no palco, sem depender de emojis.
- `ActionButton` unifica aposta/retirada/dobrar/sair com tons, ícones e estados
  (`loading`, `disabled`, `active`) mantendo a lógica de cada motor intacta.
- `AutoControl` + `useAutoCashout` e `AutoBetControl` + `useAutoReplay` dão
  auto-retirada e auto-aposta reais aos jogos aplicáveis (Crash, Mines, HiLo,
  Tower, Balloon).
- `ResultBanner` ganhou confetti e brilho (`animate-winFlash`) para realçar
  visualmente os ganhos; o Slots mantém o confetti próprio.
- Os cartões passaram a usar ilustração vectorial em primeiro plano (por motor
  e com variações por `id`). A fotografia licenciada deixou de ser sobreposta
  no cartão, no hero e no palco: há **uma arte principal por jogo**, sem
  empilhamento de fundos, marcas d'água gigantes e confetti ao mesmo tempo.
- Cada jogo abre em modo imersivo: `app-immersive` esconde sidebar, topbar e
  navegação inferior; o tabuleiro ocupa toda a altura da viewport com aurora
  animada. A barra de controlo só aparece ao tocar/mover o ponteiro, mantendo
  uma saída discreta e acessível (`Esc` também funciona). Informações,
  desempenho e jogos semelhantes passaram para um painel `i`.

## Quarta passagem — jogos que não funcionavam e limpeza visual

- **Remontagem ao trocar de jogo:** `<GameEngine key={game.id}>` evita que duas
  entradas com o mesmo motor (ex.: `crash` → `aviator`, ou os 14 slots) partilhem
  apostas, timers e histórico da ronda anterior.
- **Crash:** removido o auto-cashout duplicado dentro do `requestAnimationFrame`.
  Ficou apenas `useAutoCashout`, que respeita o interruptor AUTO e paga o
  multiplicador real (`multRef.current`), não o alvo configurado.
- **Plinko:** a tabela de prémios é congelada no momento da queda (`Ball.table`);
  mudar o risco com a bola no ar já não altera o pagamento. Botões de risco
  bloqueados durante a queda e fallback para browsers sem `ctx.roundRect`.
- **Timers/RAF:** Dice, Slots, Wheel, Roulette, Keno, Limbo, CoinFlip, Crash e
  Plinko limpam intervalos/timeouts/RAF ao sair. Não há prémios creditados sem
  o utilizador ver o resultado, nem animações órfãs depois do unmount.
- **Regras:** ás do Baccarat vale 1 (antes valia 0); Dice congela direcção,
  alvo e multiplicador durante a rolagem e bloqueia os botões ↑/↓; Hi-Lo usa o
  baralho configurado e não repete cartas ao reiniciar; Scratch paga o prémio
  gerado, não um recálculo; qualificações de Caribbean/Three Card Poker alinhadas
  com os rótulos.
- **Guardas de configuração:** baralhos vazios, `columns <= 1`, `mineOptions`
  vazio, símbolos/linhas inválidos nos Slots — todos com fallback seguro.
- **BetInput:** quando o saldo é inferior ao mínimo, a aposta fica bloqueada e
  aparece “saldo insuficiente” em vez de um valor impossível.
- **Espaçamentos:** Keno em 5 colunas com alvos de 44px em telemóvel; cartões
  sem overlay central a tapar a arte; grelhas com `gap` consistente.
- **`docs/UI_REFERENCES.md`:** referências reais de layout por tipo de jogo
  (Aviator/Crash, Mines, Slots, Plinko, Roleta, Blackjack/Poker, Keno, Arcade),
  usadas como inspiração de estrutura — nunca para copiar arte de terceiros.

## Quinta passagem — aposta no tabuleiro, progresso e duas cores

- **Valor e botões no palco:** os 66 jogos passaram a ter uma `bet-bar` escura dentro do
  `Stage`, com input de valor, fichas/opções e botão de apostar/retirar. O painel
  «Controlos de aposta» ficou apenas com automação, estatísticas, histórico e regras.
- **Progresso útil:** `AutoBetControl` mostra voltas jogadas vs. meta (10/25/50),
  taxa de acerto, retorno observado e saldo da sessão, com barra de progresso.
  `AutoControl` mostra o valor atual vs. alvo e quanto falta para a retirada automática.
- **Duas cores só:** vermelho = apostar (o estado activo é o mesmo vermelho com
  contorno branco/brilho), verde = retirar. AUTO é neutro e fica verde quando ligado.
  O dourado ficou limitado a realces de texto/prémios, sem botões dourados.
- **Contraste:** fundo escuro sólido atrás dos controlos, labels/inputs com mais brilho
  e gradiente escuro na base do tabuleiro — a aposta deixa de se confundir com a arte.

## Sexta passagem — auditoria multi-agente (Fase 1)

**Stack confirmada:** React 18, TypeScript 5.6, Vite 5.4, Tailwind 3.4, React Query e
Framer Motion. Sem backend: carteira, histórico e resultados vivem no navegador, com
créditos fictícios **B$** — a demo não aceita dinheiro real nem simula depósitos/levantamentos.

**Estado dos jogos:** 66 jogos, 27 motores, 16 rotas. Os 9 jogos Crash
(`crash`, `aviator`, `space-flight`, `rocket-rush`, `sky-multiplier`, `cosmic-crash`,
`turbo-crash`, `jet-rush`, `crash-deluxe`) partilhavam **o mesmo componente**, com o mesmo
gráfico e as mesmas animações — sem identidade própria, sem participantes simulados e sem
lista de apostas/cashouts. As rondas já eram contínuas (contagem de 7s), mas sem bots
não havia actividade visível quando o utilizador não apostava.

**Problemas visuais:** `--ink: #05060a`, painéis `#0b0e15` e palco `#070910` — três
superfícies escuras demasiado próximas, com gradientes fracos. Hierarquia fundo → painel
→ tabuleiro insuficiente, sobretudo em Android 360–412px.

**Distribuição (agentes reais, ficheiros exclusivos):** UI/UX (`index.css`, `Layout`,
`GameCard`, `Home`), Crash (`CrashGame.tsx`, `crashBots.ts`), Casino (6 jogos de mesa),
Motor (`rng.ts`, `wallet.ts`, `storage.ts`, `ENGINE.md`), Mobile (`GamePage`, `GameArt`),
QA (`scripts/*.mjs`, `QA.md`). Integração, `GameUI.tsx` e checkpoints ficam com o agente principal.
`Stage` passou a expor `data-category`/`data-game` para fundos próprios por categoria.

## Verificações feitas

- `npx tsc --noEmit` — sem erros.
- `npm run build` — build de produção concluído.
- `vite preview` + `curl` — `/`, JS, ícones PNG, manifest e service worker respondem `200`; título `BLAZE — Casino demo`.
- Catálogo: 66 jogos, 0 IDs duplicados, 27 engines, todos os `FEATURED_IDS` e `POPULAR_IDS` existem.
- Rotas: todos os destinos de `navigate()` e do menu têm tratamento no router.
- Título do documento atualizado por rota.
- `npm run check` — catálogo (66 jogos/27 motores), rotas, 15 imagens, marca e build verificados.
- Segunda passagem: `npm run typecheck`, `npm run build` e `npm run check` repetidos após as
  alterações visuais/mobile; todos passaram.
- Demo publicada em <https://norwaydev9-gif.github.io/blaze-demo/>; `/`, JS, CSS,
  imagens, manifest e service worker respondem `200`.

## Limitações conhecidas (não “corrigidas” de propósito)

1. **Sem backend.** Carteira, resultados e histórico vivem no navegador. Não há autenticação, depósitos, pagamentos ou KYC/AML.
2. **Jogo responsável no cliente.** Limites de perda/depósito/sessão só seriam válidos num operador licenciado, impostos pelo servidor.
3. **Sports e Live Betting** continuam indisponíveis: exigem fornecedor de dados licenciado.
4. **Prova do Crash é simplificada.** A verificação é local e não substitui um sistema provably-fair auditado.
5. **Sem browser real nos testes.** `npm run check` valida catálogo, motores, rotas, marca e build; `npm run check:runtime` renderiza os 66 jogos em jsdom, clica nos controlos e confirma que a aposta é registada sem erros de render. Ainda assim, recomenda-se Playwright num Android real para fluxos críticos (apostar, retirar, bónus, navegação) e testes unitários para `wallet`, `rng` e `cards`.
6. **Apenas português (pt-PT).** Não há i18n.

## Estrutura alterada

```
src/pages/Account.tsx   # novo: perfil, suporte, aviso sports/live e páginas legais
src/pages/Misc.tsx      # removido (páginas duplicadas/legado)
src/lib/storage.ts      # migração blase.* → blaze.*
src/lib/router.ts       # suporte a query string (?q=)
src/App.tsx             # rotas completas
src/components/Layout.tsx # menu, pesquisa, notificações
src/games/CrashGame.tsx # prova do crash coerente
src/pages/GamePage.tsx  # usa GameEngine
README.md               # marca e documentação atualizadas
scripts/smoke.mjs       # verificação rápida sem dependências (npm run check)
```
