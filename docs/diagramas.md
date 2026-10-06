# Racha. — Diagramas UML (Checkpoint 5)

Diagramas dos fluxos **como estão implementados** no protótipo. Os nomes de
telas, funções e tabelas são os do código, para dar para seguir cada passo
direto nos arquivos. Os diagramas estão em [Mermaid](https://mermaid.js.org/)
e o GitHub desenha cada um direto nesta página.

- [1. Visão geral da arquitetura](#1-visão-geral-da-arquitetura)
- [2. Diagramas de sequência](#2-diagramas-de-sequência)
  - [2.1 Entrar no modo demonstração](#21-entrar-no-modo-demonstração)
  - [2.2 Login real e controle de acesso](#22-login-real-e-controle-de-acesso)
  - [2.3 Lançar despesa](#23-lançar-despesa)
  - [2.4 Acertar contas e confirmar pagamento](#24-acertar-contas-e-confirmar-pagamento)
  - [2.5 Convite por e-mail e aprovação do admin](#25-convite-por-e-mail-e-aprovação-do-admin)
- [3. Diagramas de atividade](#3-diagramas-de-atividade)
  - [3.1 Fluxo principal: da viagem ao acerto](#31-fluxo-principal-da-viagem-ao-acerto)
  - [3.2 Lançar ou editar despesa](#32-lançar-ou-editar-despesa)
  - [3.3 Registrar e confirmar pagamento](#33-registrar-e-confirmar-pagamento)
  - [3.4 Entrada de um novo membro por convite](#34-entrada-de-um-novo-membro-por-convite)

---

## 1. Visão geral da arquitetura

Toda tela fala com o `AppContext`, que chama o `dataService`. O
`dataService` decide, a cada chamada, se a resposta vem do banco real
(Supabase) ou dos dados fictícios do modo demonstração.

```mermaid
flowchart LR
    subgraph UI["Front-end (React)"]
        P["Telas<br/>src/pages"] --> C["AppContext<br/>estado global"]
        P --> H["useTripSummary"]
        H --> E["splitEngine<br/>cálculo puro"]
        P --> E
    end
    C --> D{"dataService<br/>sessão demo ativa?"}
    D -- "não" --> R["supabaseService"]
    D -- "sim" --> M["mockService"]
    R --> S[("Supabase<br/>Auth + Postgres RLS + Storage")]
    M --> L[("localStorage<br/>cópia do seedData")]
```

---

## 2. Diagramas de sequência

### 2.1 Entrar no modo demonstração

Fluxo usado na avaliação: entra sem cadastro, como admin de um grupo fictício.

```mermaid
sequenceDiagram
    actor V as Visitante
    participant LP as LoginPage
    participant AC as AppContext
    participant DS as dataService
    participant MS as mockService
    participant LS as localStorage

    V->>LP: clica em "Explorar o modo demonstração"
    LP->>AC: enterDemo()
    AC->>DS: enterDemo()
    DS->>MS: enter()
    MS->>LS: grava cópia do seedData (racha.demo.db)
    MS->>LS: marca sessão demo (racha.demo.session)
    MS-->>AC: usuário Pedro (admin, aprovado)
    AC->>DS: refreshAll(): getCurrentUser, getUsers, getTrips, getFriends
    DS->>MS: encaminha (sessão demo ativa)
    MS->>LS: lê os dados
    MS-->>AC: usuários, viagens, amigos
    AC->>DS: getExpenses / getPayments de cada viagem
    DS->>MS: encaminha
    MS-->>AC: despesas e pagamentos
    AC-->>LP: estado carregado
    LP->>V: navega para a Visão Geral com a faixa "Modo demonstração"
```

### 2.2 Login real e controle de acesso

O `Layout` funciona como porteiro: sem sessão vai para o login, convidado sem
cadastro vai para `/bem-vindo` e conta não aprovada fica na tela de espera.

```mermaid
sequenceDiagram
    actor U as Usuário
    participant LP as LoginPage
    participant DS as dataService
    participant SS as supabaseService
    participant SB as Supabase
    participant AC as AppContext
    participant LY as Layout

    U->>LP: informa e-mail e senha
    LP->>LP: valida campos preenchidos
    LP->>DS: login(email, senha)
    DS->>SS: login(email, senha)
    SS->>SB: auth.signInWithPassword
    alt credenciais inválidas
        SB-->>SS: erro "Invalid login credentials"
        SS-->>LP: Error("E-mail ou senha incorretos.")
        LP->>U: mostra a mensagem de erro
    else credenciais válidas
        SB-->>SS: sessão
        SS->>SB: select em profiles (id da sessão)
        SB-->>SS: perfil (role, approved)
        SS-->>LP: usuário atual
        LP->>AC: refreshAll()
        AC->>DS: carrega usuários, viagens, despesas e pagamentos
        DS->>SS: consultas
        SS->>SB: selects filtrados pela RLS
        SB-->>AC: dados que o usuário pode ver
        LP->>LY: navigate("/")
        alt needsOnboarding (convidado sem nome)
            LY->>U: redireciona para /bem-vindo
        else conta não aprovada e não é admin
            LY->>U: tela "Quase lá" (aguardando aprovação)
        else aprovado
            LY->>U: Visão Geral
        end
    end
```

### 2.3 Lançar despesa

A validação acontece no front-end (`splitEngine`) antes de qualquer
gravação. Depois de salvar, o `AppContext` recarrega os dados e os saldos são
recalculados.

```mermaid
sequenceDiagram
    actor M as Membro
    participant OV as OverviewPage
    participant AE as AddExpensePage
    participant SE as splitEngine
    participant AC as AppContext
    participant DS as dataService
    participant BK as supabaseService ou mockService
    participant TS as useTripSummary

    M->>OV: toca no botão "+"
    OV->>AE: navega para /viagem/:tripId/nova-despesa
    M->>AE: descrição, valor, quem pagou, categoria
    M->>AE: tipo de divisão e participantes
    M->>AE: "Adicionar despesa"
    AE->>SE: validateExpense(despesa)
    alt divisão inválida
        SE-->>AE: valid false + motivo
        AE->>M: ex. "Os percentuais somam 90%, mas precisam somar 100%."
    else divisão válida
        SE-->>AE: valid true
        AE->>AC: addExpense(tripId, despesa)
        AC->>DS: addExpense(tripId, despesa)
        DS->>BK: addExpense(tripId, despesa)
        BK-->>DS: despesa criada (createdBy = usuário atual)
        AC->>AC: refreshAll()
        AE->>OV: volta para /viagem/:tripId
        OV->>TS: useTripSummary(tripId)
        TS->>SE: computeBalances + simplifyDebts
        SE-->>TS: saldos e plano de acerto
        TS-->>OV: card de saldo e plano atualizados
        OV->>M: mostra a nova despesa na lista
    end
```

### 2.4 Acertar contas e confirmar pagamento

Quem **recebe** e registra o pagamento já o confirma. Quem **paga** e registra
fica pendente até o recebedor aceitar. Só pagamentos confirmados mexem no
saldo.

```mermaid
sequenceDiagram
    actor PG as Pagador
    participant ST as SettlePage
    participant PM as PaymentModal
    participant AC as AppContext
    participant DS as dataService
    participant BK as supabaseService ou mockService
    participant NT as NotificationsPage
    actor RC as Recebedor

    PG->>ST: abre "Acertar contas"
    ST->>ST: lista o plano simplificado (simplifyDebts)
    PG->>ST: "Marcar como pago" numa transferência
    ST->>PM: abre com de, para, valor e chave Pix do credor
    PG->>PM: (opcional) observação, então confirma
    PM->>AC: settleDebt(tripId, from, to, amount, note)
    AC->>DS: settleDebt(...)
    DS->>BK: settleDebt(...)
    alt quem registra é o recebedor
        BK-->>AC: pagamento com status "confirmed"
    else quem registra é o pagador
        BK-->>AC: pagamento com status "pending"
    end
    AC->>AC: refreshAll() e saldos recalculados (só os confirmados contam)
    RC->>NT: abre Notificações
    NT->>RC: "Fulano diz que te pagou R$ X"
    alt recebedor confirma
        RC->>NT: "Confirmar recebimento"
        NT->>AC: confirmPayment(id)
        AC->>DS: confirmPayment(id)
        DS->>BK: status vira "confirmed"
        AC->>AC: refreshAll() e a dívida sai do plano
    else recebedor recusa (ou pagador cancela)
        RC->>NT: "Recusar"
        NT->>AC: declinePayment(id)
        AC->>DS: declinePayment(id)
        DS->>BK: pagamento removido
    end
```

### 2.5 Convite por e-mail e aprovação do admin

Fluxo do app real (no modo demo o convite só aparece na lista, sem e-mail).

```mermaid
sequenceDiagram
    actor M as Membro
    participant FP as FriendsPage
    participant SS as supabaseService
    participant SB as Supabase
    actor C as Convidado
    participant OB as OnboardingPage
    actor A as Admin
    participant AP as AdminPage

    M->>FP: digita o e-mail do amigo e envia
    FP->>SS: inviteFriend(email)
    SS->>SB: procura o e-mail em profiles
    alt já tem conta
        SS->>SB: upsert em friends
        SS-->>FP: status "friend"
        FP->>M: "Fulano já usa o Racha! Adicionamos na sua lista"
    else não tem conta
        SS->>SB: upsert em invites
        SS->>SB: auth.signInWithOtp (link mágico)
        SB-->>C: e-mail com o link de convite
        SS-->>FP: status "invited"
        FP->>M: "Convite enviado!"
        C->>OB: abre o link e cai em /bem-vindo
        C->>OB: define nome, senha, cor e foto
        OB->>SS: completeOnboarding(...)
        SS->>SB: rpc complete_onboarding (perfil + aceita convite + amizade)
        SS->>SB: auth.updateUser(senha, nome)
        OB->>C: tela "Quase lá" (aguardando aprovação)
        A->>AP: abre Administração
        AP->>SS: getPendingUsers()
        SS-->>AP: lista de pendentes
        A->>AP: aprova o convidado
        AP->>SS: approveUser(id)
        SS->>SB: update profiles set approved = true
        C->>OB: entra de novo e acessa o app
    end
```

---

## 3. Diagramas de atividade

> Notação: `(( ))` = início/fim, losango = decisão, retângulo = ação.
> Nos diagramas com raias (swimlanes), cada bloco é um ator.

### 3.1 Fluxo principal: da viagem ao acerto

É o fluxo mostrado no vídeo de demonstração.

```mermaid
flowchart TD
    I(("Início")) --> A["Abrir o Racha"]
    A --> B{"Tem conta?"}
    B -- "não" --> DM["Explorar o modo demonstração"]
    B -- "sim" --> LG["Entrar com e-mail e senha"]
    DM --> VG["Visão Geral"]
    LG --> VG
    VG --> Q{"A viagem já existe?"}
    Q -- "não" --> NV["Criar viagem: nome, emoji, datas, membros"]
    NV --> VT["Viagem vira o card ativo"]
    Q -- "sim" --> VT
    VT --> LD["Lançar despesa"]
    LD --> MD{"Mais despesas?"}
    MD -- "sim" --> LD
    MD -- "não" --> SD["Ver saldos e plano de acerto simplificado"]
    SD --> AC["Acertar contas: marcar transferências como pagas"]
    AC --> CF["Recebedores confirmam os pagamentos"]
    CF --> ZR{"Todos os saldos zerados?"}
    ZR -- "não" --> AC
    ZR -- "sim" --> F(("Fim: tudo em dia"))
```

### 3.2 Lançar ou editar despesa

```mermaid
flowchart TD
    I(("Início")) --> O{"Nova ou edição?"}
    O -- "nova" --> N["Botão + na viagem"]
    O -- "edição" --> P{"É quem criou ou admin?"}
    P -- "não" --> X(("Fim: botões Editar/Excluir não aparecem"))
    P -- "sim" --> E["Detalhes da despesa → Editar"]
    N --> F["Preencher descrição, valor, quem pagou, categoria"]
    E --> F
    F --> T{"Tipo de divisão"}
    T -- "igual" --> PA["Escolher participantes"]
    T -- "valores fixos" --> VF["Informar o valor de cada participante"]
    T -- "percentual" --> VP["Informar o % de cada participante"]
    PA --> V{"validateExpense ok?"}
    VF --> V
    VP --> V
    V -- "não" --> ER["Mostrar o motivo: soma não bate, sem participante, valor zero"]
    ER --> F
    V -- "sim" --> S{"Nova ou edição?"}
    S -- "nova" --> AD["addExpense"]
    S -- "edição" --> UP["updateExpense + registrar mudanças no histórico"]
    AD --> RC["Recarregar dados e recalcular saldos"]
    UP --> RC
    RC --> FIM(("Fim"))
```

### 3.3 Registrar e confirmar pagamento

```mermaid
flowchart TD
    subgraph QR["Quem registra (pagador ou recebedor)"]
        I(("Início"))
        A["Acertar contas → Marcar como pago"]
        B["Ver valor e chave Pix do credor"]
        C["Fazer o Pix por fora do app"]
        D["Registrar o pagamento"]
    end
    subgraph SIS["Sistema"]
        E{"Quem registrou é o recebedor?"}
        F["Salvar como confirmado"]
        G["Salvar como pendente"]
        H["Recalcular saldos"]
        RM["Remover o pagamento"]
    end
    subgraph RC["Recebedor"]
        J["Notificação: Fulano diz que te pagou"]
        Q{"Recebeu mesmo?"}
        K["Confirmar recebimento"]
        L["Recusar"]
    end
    FIM(("Fim"))

    I --> A --> B --> C --> D --> E
    E -- "sim" --> F --> H
    E -- "não" --> G --> J --> Q
    Q -- "sim" --> K --> H
    Q -- "não" --> L --> RM
    H --> FIM
    RM --> FIM
```

### 3.4 Entrada de um novo membro por convite

Só no app real. No modo demonstração, o passo "Aprovar cadastro" pode ser
testado com o usuário fictício **João Pedro**, que já está na fila.

```mermaid
flowchart TD
    subgraph MB["Membro"]
        I(("Início"))
        A["Amigos → digitar e-mail"]
    end
    subgraph SIS["Sistema"]
        B{"E-mail já cadastrado?"}
        C["Criar amizade na hora"]
        D["Registrar convite e enviar link mágico"]
        H["Criar perfil, aceitar convite e formar amizade"]
        W["Conta fica pendente de aprovação"]
        DEL["Apagar perfil e login"]
    end
    subgraph CV["Convidado"]
        E["Abrir o link do e-mail"]
        G["Definir nome, senha, cor e foto"]
        ESP["Tela 'Quase lá'"]
        USA["Entrar e usar o app"]
    end
    subgraph AD["Admin"]
        R["Administração → cadastros pendentes"]
        Q{"Aprovar?"}
        OK["Aprovar cadastro"]
        NO["Recusar cadastro"]
    end
    FIM(("Fim"))

    I --> A --> B
    B -- "sim" --> C --> FIM
    B -- "não" --> D --> E --> G --> H --> W
    W --> ESP
    W --> R --> Q
    Q -- "sim" --> OK --> USA --> FIM
    Q -- "não" --> NO --> DEL --> FIM
```
