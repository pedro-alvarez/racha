# Racha. 💸

Carteira compartilhada de grupo — organize viagens e rolês, registre gastos,
veja quem deve para quem e acerte as contas com o mínimo de transferências.

Protótipo front-end (React + Vite + Tailwind) pronto para GitHub Pages, com a
arquitetura preparada para receber backend real depois.

## Rodando localmente

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # testes do motor de cálculo (vitest)
npm run build      # build de produção em dist/
```

## Deploy no GitHub Pages

1. Ajuste o `base` em `vite.config.js` para o nome do seu repositório
   (ex.: repositório `racha` → `base: '/racha/'`). Se for usar
   `usuario.github.io` ou domínio próprio, use `base: '/'`.
2. Crie o repositório e envie o código:

   ```bash
   git init && git add -A && git commit -m "Racha MVP"
   git remote add origin git@github.com:SEU_USUARIO/racha.git
   git push -u origin main
   ```

3. Publique com o pacote `gh-pages` (já incluso):

   ```bash
   npm run deploy
   ```

   Depois, em **Settings → Pages**, confirme que a origem é o branch `gh-pages`.
   O app fica em `https://SEU_USUARIO.github.io/racha/`.

   > Alternativa: GitHub Actions com o workflow oficial de deploy estático,
   > publicando a pasta `dist/` após `npm run build`.

O roteamento usa **HashRouter** de propósito: GitHub Pages não reescreve rotas
no servidor, então URLs com hash (`/#/viagem/x`) nunca dão 404.

## Arquitetura

```
src/
├── pages/        # uma tela por rota
├── components/   # UI reutilizável (Avatar, BalanceCard, SettlementPlan…)
├── hooks/        # useTripSummary — agrega saldos/plano/atividade por viagem
├── context/      # AppContext — estado global (Context API)
├── lib/
│   ├── splitEngine.js   # motor de cálculo (puro, testado, sem UI)
│   ├── dataService.js   # ÚNICA camada de I/O (hoje localStorage + mock)
│   ├── format.js        # formatação pt-BR (moeda, datas)
│   └── categories.js    # categorias de despesa + ícones
└── mock/         # dados de demonstração (Ubatuba 2026 etc.)
```

### Trocando o mock por API real

Todo acesso a dados passa por `src/lib/dataService.js` — nenhum componente
toca em `localStorage`. As funções já são assíncronas, então a migração é
trocar o corpo de cada função por `fetch`/`axios` (os pontos estão marcados
com `TODO backend:`), sem alterar componentes:

```js
export async function getTrips() {
  const res = await fetch(`${API_URL}/trips`, { headers: authHeaders() });
  return res.json();
}
```

Autenticação: `LoginPage` e o bloco sinalizado em `AccountPage` são os pontos
de entrada — hoje `dataService.login()` simula um usuário fixo.

### Motor de cálculo (`lib/splitEngine.js`)

- Valores em **centavos** (inteiros) — zero erro de ponto flutuante.
- `computeShares` — divisão igual / valores fixos / percentual, com sobras de
  arredondamento distribuídas centavo a centavo (a soma sempre bate).
- `validateExpense` — garante que partes/percentuais fecham com o total.
- `computeBalances` — saldo líquido por membro (despesas + acertos).
- `simplifyDebts` — algoritmo guloso que minimiza transferências (máx. n-1).
- `pairwiseDebts` — todas as dívidas par a par (modo "não simplificado").

## Design system

Tema escuro "fintech premium": fundo `#0B0710`, cards com gradiente vinho→roxo
(`#3A0E2A → #160A1C`, cantos 24px), accent rosa `#F0146B`/`#FF2D7A`, texto
secundário `#9A93A8`, badge verde de sincronização. Tipografia Inter.
Mobile-first (~390px) com bottom nav; em `md:` vira sidebar fixa + grid.
