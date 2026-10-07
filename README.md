# Racha. 💸

Carteira compartilhada de grupo: organize viagens e rolês, registre gastos,
veja quem deve para quem e acerte as contas com o mínimo de transferências.

**🔗 Acesse:** https://pedro-alvarez.github.io/racha/ · **🎬 Demonstração em vídeo:** https://youtu.be/me9ZOfMMa7w · **🎤 Apresentação:** https://drive.google.com/file/d/1GrCACl7w7jiLc9UZRRB6zAcQwioFUDMZ/view?usp=drive_link

> **Professor(a), comece por aqui:** na tela de login, clique em
> **"Explorar o modo demonstração"**. Não precisa de cadastro nem de senha:
> você entra como **Pedro (admin)** num grupo de amigos com viagens, despesas
> e acertos fictícios. Tudo o que você fizer fica salvo só no seu navegador, e
> o botão **Restaurar** na faixa amarela do topo volta os dados ao estado inicial.

---

## Sumário

1. [Roteiro de teste (5 minutos)](#roteiro-de-teste-5-minutos)
2. [Modo demonstração x app real](#modo-demonstração-x-app-real)
3. [Rodando localmente](#rodando-localmente)
4. [Deploy](#deploy)
5. [Arquitetura](#arquitetura)
6. [Documentação do projeto](#documentação-do-projeto)

---

## Roteiro de teste (5 minutos)

Siga esta ordem para passar pelos fluxos principais de ponta a ponta:

| # | Fluxo | Onde | O que observar |
|---|-------|------|----------------|
| 1 | **Entrar** | Login → "Explorar o modo demonstração" | Cai na Visão Geral, com a faixa "Modo demonstração" no topo |
| 2 | **Ver saldos** | Visão Geral (arraste os cards ou use os chips) | Saldo seu em cada viagem e o **Plano de Acerto** simplificado |
| 3 | **Criar viagem** | Visão Geral → "Todas as viagens" → **+ Novo** | Nome, emoji, datas, membros. A viagem vira o card ativo |
| 4 | **Lançar despesa** | Botão **+** rosa (canto inferior direito) | Divisão **igual**, **valores fixos** ou **percentual**, validada antes de salvar |
| 5 | **Editar despesa** | Toque numa despesa da lista → **Editar** | A alteração entra no **histórico** da despesa |
| 6 | **Acertar contas** | Card de saldo → "Acertar contas" → **Marcar como pago** | Chave Pix do credor, e o saldo é recalculado na hora |
| 7 | **Confirmar pagamento** | Conta → Notificações | O Thiago "diz que te pagou R$ 340" → **Confirmar recebimento** |
| 8 | **Rolê aberto** | Visão Geral → "Rolê aberto: Show no Allianz" → **Eu vou! Entrar no rolê** | O rolê passa a aparecer entre os seus |
| 9 | **Convidar amigo** | Amigos → digite um e-mail | E-mail já cadastrado vira amizade; e-mail novo vira convite pendente |
| 10 | **Administração** | Conta → Administração | Aprovar/recusar o cadastro do **João Pedro**, revogar convites |
| 11 | **Histórico** | Atividade | Linha do tempo com filtros por viagem e por tipo |

## Modo demonstração x app real

O Racha tem as **duas** coisas que o checkpoint pede: um protótipo navegável
com dados mockados e, por trás, um backend real já funcionando.

| | Modo demonstração | App real |
|---|---|---|
| Como entra | Botão "Explorar o modo demonstração" | E-mail e senha (conta criada por convite) |
| Dados | Fictícios (`src/mock/seedData.js`), guardados no `localStorage` | Supabase (Postgres + Auth + Storage) |
| Aprovação do admin | Não precisa | Conta nova espera o admin aprovar |
| E-mails de convite | Simulados (o convite só aparece na lista) | Enviados de verdade, com link mágico |
| Regras de permissão | Simuladas no `mockService.js` | Row Level Security no banco |

As duas versões usam **as mesmas telas e a mesma interface de dados**. A
troca acontece só dentro de `src/lib/dataService.js` (detalhes em
[Arquitetura](#arquitetura)).

## Rodando localmente

Pré-requisito: **Node.js 18+** (o deploy usa a versão 20).

```bash
git clone https://github.com/pedro-alvarez/racha.git
cd racha
npm install
npm run dev        # abre em http://localhost:5173/racha/
```

Outros comandos:

```bash
npm test           # testes automatizados (vitest): motor de cálculo + modo demo
npm run build      # build de produção em dist/
npm run preview    # serve o build em http://localhost:4173/racha/
```

Rodando local, use o **modo demonstração** normalmente. O login real
também funciona, porque o app aponta para o projeto Supabase de produção. A
chave usada no front-end é a pública ("publishable"), e quem protege os
dados são as políticas de RLS.

## Deploy

Publicação automática no **GitHub Pages** via GitHub Actions
(`.github/workflows/deploy.yml`): a cada push na `main`, o GitHub instala as
dependências, roda `npm run build` e publica a pasta `dist/`.

- `base: '/racha/'` em `vite.config.js` precisa bater com o nome do repositório.
- O roteamento usa **HashRouter** (`/#/viagem/x`) porque o GitHub Pages não
  reescreve rotas no servidor. Assim, recarregar qualquer tela nunca dá 404.

### Banco de dados (só para o app real)

O esquema está em `supabase/`. Num projeto Supabase novo, rode no SQL Editor,
nesta ordem: `schema.sql` → `upgrade-v2.sql` → `upgrade-v3.sql` →
`upgrade-v4.sql` → `upgrade-v5.sql`. Os modelos de e-mail de convite estão em
`supabase/email-templates.md`. Depois, troque a URL e a chave em
`src/lib/supabaseClient.js`.

## Arquitetura

**Stack:** React 18 + Vite 5 + Tailwind CSS 3 + React Router 6 (front-end),
Supabase (autenticação, Postgres com RLS e storage de fotos), Vitest (testes),
GitHub Actions + GitHub Pages (deploy). É um PWA instalável (`public/manifest.webmanifest`).

```
src/
├── pages/            # uma tela por rota (17 rotas, ver App.jsx)
├── components/       # UI reutilizável (BalanceCard, SettlementPlan, ExpenseModal…)
├── context/          # AppContext: estado global e ações (Context API)
├── hooks/            # useTripSummary: saldos, plano e atividade por viagem
├── lib/
│   ├── dataService.js      # ÚNICO ponto de I/O: escolhe real ou demo
│   ├── supabaseService.js  # implementação real (Supabase)
│   ├── mockService.js      # implementação demo (localStorage + seedData)
│   ├── splitEngine.js      # motor de cálculo (puro, testado, sem UI)
│   ├── format.js           # moeda e datas em pt-BR
│   └── categories.js       # categorias de despesa + ícones
└── mock/seedData.js  # dados fictícios do modo demonstração
```

```
Telas ──► AppContext ──► dataService ──┬──► supabaseService ──► Supabase
                                       └──► mockService ──► localStorage (seedData)
```

Nenhum componente acessa o Supabase ou o `localStorage` direto. O
`dataService` verifica, a cada chamada, se há uma sessão demo ativa e
encaminha para a implementação certa. As duas exportam exatamente as mesmas
funções.

### Motor de cálculo (`lib/splitEngine.js`)

- Valores em **centavos** (inteiros), sem erro de ponto flutuante.
- `computeShares`: divisão igual, por valores fixos ou por percentual. As
  sobras de arredondamento são distribuídas centavo a centavo, então a soma
  sempre bate com o total.
- `validateExpense`: garante que as partes ou percentuais fecham com o total.
- `computeBalances`: saldo líquido de cada membro (despesas + acertos confirmados).
- `simplifyDebts`: algoritmo guloso que minimiza transferências (no máximo n-1).
- `pairwiseDebts`: todas as dívidas par a par (modo "não simplificado").

### Design system

Tema escuro "fintech premium": fundo `#0B0710`, cards com gradiente
vinho→roxo (`#3A0E2A → #160A1C`, cantos de 24px), accent rosa
`#F0146B`/`#FF2D7A` e texto secundário `#9A93A8`. Tipografia Inter.
Mobile-first (~390px) com navegação inferior; a partir de `md:` vira sidebar
fixa.

## Documentação do projeto

- [`docs/requisitos.md`](docs/requisitos.md): requisitos funcionais e não
  funcionais revisados, com o status de implementação de cada um.
- [`docs/diagramas.md`](docs/diagramas.md): diagramas UML de sequência e de
  atividade dos fluxos do protótipo (Mermaid, o GitHub desenha direto na página).
- **Vídeos:**
  - Demonstração do fluxo principal (1min49s): https://youtu.be/me9ZOfMMa7w
  - Apresentação (4 min): https://drive.google.com/file/d/1GrCACl7w7jiLc9UZRRB6zAcQwioFUDMZ/view?usp=drive_link
