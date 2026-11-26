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

## Verificações feitas

- `npx tsc --noEmit` — sem erros.
- `npm run build` — build de produção concluído.
- `vite preview` + `curl` — `/`, JS, ícones PNG, manifest e service worker respondem `200`; título `BLAZE — Casino demo`.
- Catálogo: 66 jogos, 0 IDs duplicados, 27 engines, todos os `FEATURED_IDS` e `POPULAR_IDS` existem.
- Rotas: todos os destinos de `navigate()` e do menu têm tratamento no router.
- Título do documento atualizado por rota.
- `npm run check` — catálogo (66 jogos/27 motores), rotas, marca e build verificados.

## Limitações conhecidas (não “corrigidas” de propósito)

1. **Sem backend.** Carteira, resultados e histórico vivem no navegador. Não há autenticação, depósitos, pagamentos ou KYC/AML.
2. **Jogo responsável no cliente.** Limites de perda/depósito/sessão só seriam válidos num operador licenciado, impostos pelo servidor.
3. **Sports e Live Betting** continuam indisponíveis: exigem fornecedor de dados licenciado.
4. **Prova do Crash é simplificada.** A verificação é local e não substitui um sistema provably-fair auditado.
5. **Smoke check, não testes de UI.** `npm run check` valida catálogo, motores, rotas, marca e build. Recomenda-se Playwright para os fluxos críticos (apostar, retirar, bónus, navegação) e testes unitários para `wallet`, `rng` e `cards`.
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
