# Referências visuais por tipo de jogo

Pesquisa feita a 26 de novembro de 2026 para **inspirar estrutura e legibilidade**,
não para copiar arte ou marcas de terceiros. A BLAZE usa vectores próprios em
`src/components/GameArt.tsx`, paleta BLAZE e arte gerada localmente.

| Tipo de jogo | Referência | Padrão aproveitado na BLAZE |
|---|---|---|
| Crash / Aviator | [Aviator — Mobile Crash Game (Dribbble)](https://dribbble.com/shots/21504269-Aviator-Mobile-Crash-Game) · [UI/UX for Mobile Game Aviator (Behance)](https://www.behance.net/gallery/187895387/UIUX-FOR-MOBILE-GAME-AVIATOR) | Curva de multiplicador grande, duas apostas independentes, botão de retirada em verde com contraste alto e histórico em faixa. |
| Mines | [Mines — Casino game design (Behance)](https://www.behance.net/gallery/190076827/Mines-Casino-game-design) · [Mines Game tags (Dribbble)](https://dribbble.com/tags/mines-game) | Grelha quadrada com alvos grandes, contador de minas acima do tabuleiro e multiplicador sempre visível. |
| Slots | [Slot Machine UI Design 2016–2020 (Behance)](https://www.behance.net/gallery/97783323/Slot-Machine-UI-Design-2016-2020) · [Casino slot game art (Dribbble)](https://dribbble.com/) | Três/tambores com símbolo central dominante, moldura dourada, tabela de prémios colapsável e confetti no ganho. |
| Plinko | [Plinko master — UI casino game (Behance)](https://www.behance.net/gallery/187047809/Plinko-master-UI-casino-game) · [Plinko (ArtStation)](https://www.artstation.com/artwork/YBnB1b) | Triângulo de pinos com caixos de prémio coloridos na base; bola com rasto e escolha de risco em botões compactos. |
| Roleta | [Roulette UI (Dribbble)](https://dribbble.com/search/roulette%20ui) · [Casino Roulette UI (Dribbble/Pinterest)](https://www.pinterest.com/pin/980588518874549648/) | Roda/grade com vermelho-preto dourado, fichas por valor e botão de girar com estado de ocupação. |
| Blackjack / Poker | [BLACKJACK Game App UI (Behance)](https://www.behance.net/gallery/171385863/BLACKJACK-Game-App-UI) · [Blackjack Game UI (Behance)](https://www.behance.net/search/projects/blackjack%20game%20ui) | Mesa em leque, cartas com animação de entrada, ações Pedir/Ficar/Dobrar lado a lado e total do jogador realçado. |
| Keno / bingo | [Casino website mobile design examples (Subframe)](https://www.subframe.com/tips/casino-website-design-examples) | Grelha de números com alvos grandes, seleção com cor por estado e resumo de acertos abaixo. |
| Arcade / retro | [Mobile game UI (Dribbble)](https://dribbble.com/tags/mobile-game-ui) · [Plinko casual style (ArtStation)](https://www.artstation.com/artwork/YBnB1b) | Fundo com linhas de perspectiva e partículas, nave/objeto central com brilho e HUD mínimo dentro do canvas. |

## Regras adoptadas

1. **Um tema por jogo, uma arte por jogo.** A ilustração vectorial é o elemento principal; não
   sobrepomos fotografia, marca d'água gigante e confetti ao mesmo tempo.
2. **Contrato de cor consistente:** vermelho = aposta/acerto de risco, verde = retirar/ganho,
   dourado = prémio/bónus, violeta = automação.
3. **Alvos de toque ≥44px**, com botão principal de 52px, em qualquer motor.
4. **Espaçamento previsível:** painéis com `space-y-4`, blocos internos com `mt-3`, grelhas
   com `gap-1.5`–`gap-2`; nunca cartas ou botões a ultrapassar o tabuleiro em 360px.
5. **Feedback de ganho único:** `ResultBanner` com confetti/brilho; o Slots mantém o seu próprio
   efeito de tambores, sem duplicar banners.
