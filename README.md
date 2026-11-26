# BLAZE — casino demo

Casa de jogos de demonstração com **66 jogos**, carteira de créditos virtuais e
interface responsiva. Feito em **React + TypeScript + Vite + Tailwind CSS**, sem
backend e sem dinheiro real.

> **Demo recreativa.** Não existem depósitos, compras, prémios em dinheiro ou
> levantamentos. Todos os créditos são virtuais e ficam no `localStorage` do
> navegador.

**Demo publicada:** <https://norwaydev9-gif.github.io/blaze-demo/>

## Como correr

```bash
cd /root/AI-Projects/blaze
npm install
npm run dev
```

Abre <http://localhost:5173>.

Para produção:

```bash
npm run build
npm run preview
```

Para verificar consistência (catálogo, rotas, marca e build):

```bash
npm run check
```

## Funcionalidades

- **Carteira única** (`5.000 B$` iniciais), bónus de `500 B$` a cada 4 horas,
  histórico de movimentos e reinício da demo.
- **Catálogo de 66 jogos** em 7 categorias: Crash, Mines, Slots, Instantâneos,
  Mesa, Arcade e Deluxe.
- **27 motores de jogo** implementados localmente:
  - Crash com duas apostas independentes, auto-retirada, auto-aposta, gráfico em
    canvas e prova de ronda por hash.
  - Mines com grelha configurável, multiplicadores progressivos e retirada.
  - Slots 3×3 com 3, 5 ou 9 linhas, tabela de prémios e animação de rolos.
  - Dice, Plinko, Limbo, Wheel, Coin Flip, Lucky Number, Color Prediction, Keno,
    Hi-Lo, Tower, Balloon e Scratch Cards.
  - Blackjack, Roleta europeia/americana, Baccarat, Video Poker, Caribbean Poker,
    Three Card Poker e Texas Hold'em.
  - Arcade: runner, shooter, catcher, quest e race com canvas, teclado e toque.
- **Interface completa**: lobby com destaques, pesquisa global, filtros,
  favoritos, promoções, carteira, histórico de apostas, rankings, perfil,
  suporte, páginas legais e página de cada jogo.
- **Responsiva**: sidebar em desktop, menu deslizante e navegação inferior em
  telemóvel/tablet. Em Android/iOS a dock de controlos respeita a navegação e a
  `safe-area`, os canvas mantêm a proporção e os botões têm no mínimo 44px.
- **Arte original/licenciada**: 15 imagens com capas por motor/categoria no
  catálogo, na página do jogo e no palco; créditos em `docs/IMAGE_CREDITS.md`.
- **Vectores por jogo**: avião no Aviator/Crash, foguetão no Limbo, mina no
  Mines, máquina no Slots, roleta, dados, cartas, balões, torre, arcade, etc.
  (`src/components/GameArt.tsx`), com marca d'água no palco.
- **Acções consistentes**: botões de aposta/retirada com ícones e estados
  (`ActionButton`), auto-aposta e auto-retirada (`AutoControl`/`AutoBetControl`),
  banners de ganho com confetti e brilho animado.
- **Jogo em ecrã inteiro**: ao entrar num jogo a navegação desaparece e o tabuleiro
  ocupa a janela toda. A barra discreta (aparece ao tocar/mover o rato) esconde
  o botão de saída; `Esc` também volta ao catálogo. O botão `i` abre regras,
  histórico e jogos semelhantes.
- **Referências de UI por tipo de jogo** em `docs/UI_REFERENCES.md`: padrões de
  Crash, Mines, Slots, Plinko, Roleta, Blackjack/Poker, Keno e Arcade adaptados
  à marca BLAZE, sem copiar artes de terceiros.
- **Uma arte principal por jogo**: removida a sobreposição de fotografia,
  marca d'água gigante e confetti simultâneos. O vector próprio manda.
- **Teste de runtime dos 66 jogos** (`npm run check:runtime`): renderiza cada
  motor em jsdom, clica nos controlos e confirma que não há erros e que a
  aposta é registada na carteira.
- **Sons** gerados por WebAudio (com mute) e notificações toast.
- **Persistência local** de carteira, favoritos, jogos recentes e preferência de
  som, com exportação/apagamento dos dados no perfil.
- **Navegação sem becos sem saída**: todas as entradas do menu têm página;
  Sports e Live mostram um estado honesto de “integração necessária”.

## Estrutura

```
blaze/
├── index.html
├── src/
│   ├── main.tsx / App.tsx
│   ├── index.css                 # design system, animações, componentes
│   ├── components/               # layout, cartões, UI de jogo, cartas, ícones
│   ├── games/                    # motores de jogo + registry
│   ├── lib/                      # carteira, router, RNG, cartas, som, toasts
│   ├── pages/                    # lobby, catálogo, jogo, carteira, etc.
│   └── data/games.json           # catálogo dos 66 jogos
├── public/
│   ├── images/                   # 15 capas dos jogos (Wikimedia Commons)
│   └── icon*.png, icon.svg, manifest, sw.js
├── docs/AUDIT.md                 # relatório da auditoria
├── docs/IMAGE_CREDITS.md         # créditos/licenças das imagens
├── docs/UI_REFERENCES.md         # referências visuais por tipo de jogo
├── scripts/smoke.mjs             # verificação rápida (npm run check)
├── scripts/runtime-smoke.mjs     # render + cliques nos 66 jogos (npm run check:runtime)
└── server/                       # reservado para uma API futura
```

## Notas técnicas

- Resultados gerados no navegador com `crypto.getRandomValues` (fallback para
  `Math.random`). No Crash, o ponto de crash é derivado da semente da ronda:
  o hash é publicado antes do voo e a semente é revelada no crash.
- Estado guardado em `localStorage` (`blaze.*`, com migração automática de
  `blase.*`); não há telemetria nem chamadas a serviços externos.
- A fonte Inter/Sora é carregada do Google Fonts; sem rede é usado o fallback do
  sistema.
