# BLAZE — Motor, carteira e persistência (demo)

## Fronteira motor / UI
- `src/lib/rng.ts` — motor aleatório. `rand*` usa WebCrypto quando disponível; `seedRoll`/`crashFromSeed` são puros: o mesmo seed, `edge` e `max` dão sempre o mesmo resultado, verificável por qualquer cliente (`verifyCrash`). A UI não escolhe o resultado arbitrariamente: o seed vem de entropia local e o ponto é função determinística dele. Um cliente modificado poderia alterá-lo — por isso isto não é fairness de operador.
- `src/lib/wallet.tsx` — banca em B$. `placeBet`/`payout` rejeitam valores `<= 0`, `NaN`, infinito, acima do saldo e fora de `minBet`/`maxBet` do catálogo quando o jogo é identificável; arredondam a centavos e registam `gameId`, tipo e quantia no histórico. Payout nunca é negativo. Toda a mutação passa por um único ponto de escrita.
- `src/lib/storage.ts` — persistência local com validação da forma do valor e migração das chaves legadas para `blaze.*`.

Os jogos e a `GameUI` consomem estas funções; nenhuma regra de aposta vive na apresentação.

## Créditos fictícios
B$ são créditos de demonstração. Não há dinheiro real, depósitos, levantamentos, contas, pagamentos nem prémios. Saldo, bónus e histórico ficam no navegador e podem ser repostos ou apagados.

## O que exigiria um backend licenciado
Validação no servidor (saldo, limites e odds antes da ronda), seed do servidor publicado como hash e revelado depois, registo de auditoria imutável, KYC/AML, limites e gestão de risco, e pagamentos regulados. Esta demo não faz nada disso: corre inteiramente no frontend e nenhuma operação é uma transação financeira.
