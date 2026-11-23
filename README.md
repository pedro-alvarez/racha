# Racha. 💸

Carteira compartilhada de grupo: organize viagens e rolês, registre gastos,
veja quem deve para quem e acerte as contas com o mínimo de transferências.

**🔗 Acesse:** https://pedro-alvarez.github.io/racha/ · **🎬 Demonstração em vídeo:** https://youtu.be/me9ZOfMMa7w · **🎤 Apresentação:** https://drive.google.com/file/d/1GrCACl7w7jiLc9UZRRB6zAcQwioFUDMZ/view?usp=drive_link

Para entrar, crie sua conta em **Criar conta**, na tela de login, ou siga o
link de um convite. A conta nova espera a aprovação do admin do grupo.

---

## Sumário

1. [Funcionalidades](#funcionalidades)
2. [Rodando localmente](#rodando-localmente)
3. [Deploy](#deploy)
4. [Arquitetura](#arquitetura)
5. [Documentação do projeto](#documentação-do-projeto)

---

## Funcionalidades

| Fluxo | Onde | O que faz |
|-------|------|-----------|
| **Criar conta** | Login → "Criar conta" | Nome, e-mail e senha, sem depender de e-mail; a conta espera o admin aprovar |
| **Ver saldos** | Visão Geral (arraste os cards ou use os chips) | Saldo seu em cada viagem e o **Plano de Acerto**; toque numa dívida para ver de onde ela vem |
| **Criar viagem** | Visão Geral → "Todas as viagens" → **+ Novo** | Nome, emoji, datas e membros. A viagem vira o card ativo |
| **Lançar despesa** | Botão **+** rosa (canto inferior direito) | Divisão **igual**, **valores fixos** ou **percentual**, validada antes de salvar |
| **Editar despesa** | Toque numa despesa da lista → **Editar** | A alteração entra no **histórico** da despesa |
| **Despesas** | Aba **Despesas** (ou o atalho na Visão Geral) | Só as despesas da viagem, por dia, com total, sua parte, busca e filtro |
| **Acertar contas** | Card de saldo → "Acertar contas" → **Pagar** | Paga tudo, por despesa ou outro valor; mostra a chave Pix de quem recebe |
| **Comprovante** | Janela de pagamento → **Anexar comprovante** (ou depois, no pagamento pendente) | Foto, print ou PDF; quem recebe toca em **Ver comprovante** antes de confirmar |
| **Avisos no celular** | Conta → **Avisos no celular** | Ativa as notificações no aparelho e escolhe o que receber (despesas, edições, pagamentos, confirmações, lembretes) e o silêncio à noite. No iPhone, só com o Racha na tela de início |
| **Esqueci minha senha** | Login → **Esqueci minha senha** | O admin recebe um aviso, cria uma senha provisória em Administração e manda pelo WhatsApp; a pessoa troca em Conta → Segurança |
| **Ranking** | Visão Geral → card **Ranking** | Pódio e tabela de todo mundo (Consumiu / Pagou), média por pessoa, títulos da viagem e compartilhar no WhatsApp |
| **Encerrar viagem** | Bandeira no topo da Visão Geral (quem criou ou admin) | Trava despesas novas, mantém os acertos e abre o ranking final; dá para reabrir |
| **Confirmar pagamento** | Conta → Notificações | Quem recebeu confirma ou recusa o pagamento |
| **Lembrar quem deve** | Acertar contas → **Lembrar** | Quem tem a receber manda uma notificação lembrando quem deve (1 vez por dia para cada pessoa; dá para desligar em Avisos no celular) |
| **Rolê aberto** | Visão Geral → rolê aberto → **Eu vou! Entrar no rolê** | O rolê passa a aparecer entre os seus |
| **Convidar amigo** | Amigos → digite um e-mail | E-mail já cadastrado vira amizade; e-mail novo recebe um convite com link |
| **Administração** | Conta → Administração | Aprovar ou recusar cadastros e revogar convites |
| **Histórico** | Atividade | Linha do tempo com filtros por viagem e por tipo |

Os dados ficam no Supabase (Postgres, Auth e Storage), protegidos por Row
Level Security.

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
npm test           # testes automatizados (vitest): motor de cálculo
npm run build      # build de produção em dist/
npm run preview    # serve o build em http://localhost:4173/racha/
```

Rodando local, o app usa o mesmo projeto Supabase de produção do site. A
chave usada no front-end é a pública ("publishable"), e quem protege os
dados são as políticas de RLS.

## Deploy

Publicação automática no **GitHub Pages** via GitHub Actions
(`.github/workflows/deploy.yml`): a cada push na `main`, o GitHub instala as
dependências, roda `npm run build` e publica a pasta `dist/`.

- `base: '/racha/'` em `vite.config.js` precisa bater com o nome do repositório.
- O roteamento usa **HashRouter** (`/#/viagem/x`) porque o GitHub Pages não
  reescreve rotas no servidor. Assim, recarregar qualquer tela nunca dá 404.

### Banco de dados

O esquema está em `supabase/`. Num projeto Supabase novo, rode no SQL Editor,
nesta ordem: `schema.sql` → `upgrade-v2.sql` → `upgrade-v3.sql` →
`upgrade-v4.sql` → `upgrade-v5.sql` → `upgrade-v6.sql` → `upgrade-v7.sql` → `upgrade-v8.sql` → `upgrade-v9.sql` (comprovantes) → `upgrade-v10.sql` (notificações) → `upgrade-v11.sql` (chaves das notificações, ver o arquivo) → `upgrade-v12.sql` (esqueci minha senha) → `upgrade-v13.sql` (observação e nota na despesa) → `upgrade-v14.sql` (encerrar viagem e ranking) → `upgrade-v15.sql` (lembrete de pagamento). Os modelos de e-mail de convite estão em
`supabase/email-templates.md`. Depois, troque a URL e a chave em
`src/lib/supabaseClient.js`.

A tela **Criar conta** usa a Edge Function `supabase/functions/criar-conta`: ela
cria o login já confirmado, sem depender de e-mail, e a conta espera a aprovação
do admin. Publique com `supabase functions deploy criar-conta --no-verify-jwt`
(a chave publishable do app não é um JWT).

Os **avisos no celular** usam a Edge Function `supabase/functions/notificar`
(Web Push): o app chama a função depois de lançar, editar, pagar, confirmar ou
recusar, e ela avisa quem precisa saber, respeitando as preferências de cada um.
O service worker `public/sw.js` mostra o aviso. Publique com
`supabase functions deploy notificar --no-verify-jwt` (a função confere o token
do usuário por dentro) e guarde as chaves VAPID no Vault (`upgrade-v11.sql`).

## Arquitetura

**Stack:** React 18 + Vite 5 + Tailwind CSS 3 + React Router 6 (front-end),
Supabase (autenticação, Postgres com RLS e storage de fotos), Vitest (testes),
GitHub Actions + GitHub Pages (deploy). É um PWA instalável (`public/manifest.webmanifest`).

```
src/
├── pages/            # uma tela por rota (18 rotas, ver App.jsx)
├── components/       # UI reutilizável (BalanceCard, SettlementPlan, ExpenseModal…)
├── context/          # AppContext: estado global e ações (Context API)
├── hooks/            # useTripSummary: saldos, plano e atividade por viagem
├── lib/
│   ├── dataService.js      # ÚNICO ponto de I/O das telas
│   ├── supabaseService.js  # implementação (Supabase)
│   ├── splitEngine.js      # motor de cálculo (puro, testado, sem UI)
│   ├── format.js           # moeda e datas em pt-BR
│   └── categories.js       # categorias de despesa + ícones
```

```
Telas ──► AppContext ──► dataService ──► supabaseService ──► Supabase
```

Nenhum componente acessa o Supabase direto: tudo passa pelo `dataService`.
Para trocar de backend, basta mexer nele, sem tocar nas telas.

### Motor de cálculo (`lib/splitEngine.js`)

- Valores em **centavos** (inteiros), sem erro de ponto flutuante.
- `computeShares`: divisão igual, por valores fixos ou por percentual. As
  sobras de arredondamento são distribuídas centavo a centavo, então a soma
  sempre bate com o total.
- `validateExpense`: garante que as partes ou percentuais fecham com o total.
- `computeBalances`: saldo líquido de cada membro (despesas + acertos confirmados).
- `pairwiseDebts`: dívidas diretas (cada um paga a quem pagou a despesa dele),
  compensando dívidas cruzadas entre a mesma dupla. Cada dívida traz a
  justificativa: as despesas e pagamentos que formam o valor.

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
