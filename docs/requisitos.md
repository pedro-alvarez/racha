# Racha. — Requisitos (revisão do Checkpoint 5)

Revisão feita a partir do que **de fato está implementado** no código desta
versão. Cada requisito diz onde está no app e como pode ser testado.

**Legenda de status**

| Status | Significado |
|---|---|
| ✅ Implementado | Funciona no modo demonstração e no app real |
| 🔐 Só no app real | Depende de serviço externo (e-mail, senha) e é simulado ou omitido no modo demo |
| 🟡 Parcial | Funciona, mas com limitação conhecida (descrita na linha) |
| ⏳ Fora desta versão | Previsto para depois |

## 1. Atores

| Ator | Descrição |
|---|---|
| **Visitante** | Pessoa sem conta. Pode entrar no modo demonstração ou aceitar um convite. |
| **Membro** | Usuário aprovado. Cria viagens e rolês, lança despesas e acerta contas. |
| **Administrador** | Membro com papel `admin`. Aprova cadastros, remove pessoas, revoga convites e apaga viagens. |
| **Supabase** (sistema externo) | Autenticação, banco Postgres com RLS, envio de e-mails e armazenamento de fotos. |

## 2. Requisitos funcionais

### 2.1 Acesso e contas

| ID | Requisito | Status | Onde |
|---|---|---|---|
| RF01 | Entrar com e-mail e senha | 🔐 Só no app real | `LoginPage` |
| RF02 | Entrar no **modo demonstração** sem cadastro, com dados fictícios, como administrador | ✅ | Login → "Explorar o modo demonstração" |
| RF03 | Restaurar os dados fictícios ao estado inicial | ✅ | Faixa do modo demo → "Restaurar" |
| RF04 | Cadastro **somente por convite**: o convidado recebe um link mágico por e-mail e define nome, senha, cor e foto | 🔐 Só no app real | `OnboardingPage` (`#/bem-vindo`) |
| RF05 | Conta nova fica **aguardando aprovação** do admin antes de acessar o app | 🔐 Só no app real | `Layout` → tela "Quase lá" |
| RF06 | Sair da conta | ✅ | Conta → Sair (ou "Sair" na faixa do demo) |
| RF07 | Trocar a senha | 🔐 Só no app real (no demo a tela aceita, mas não há senha) | Conta → Segurança |

### 2.2 Amigos e perfil

| ID | Requisito | Status | Onde |
|---|---|---|---|
| RF08 | Convidar por e-mail: se a pessoa já usa o Racha, vira amizade na hora; se não, gera convite pendente | ✅ (no demo o e-mail não é enviado de verdade) | Amigos |
| RF09 | Listar e revogar convites pendentes | ✅ | Amigos → convites pendentes |
| RF10 | Ver o saldo com cada amigo, somando todas as viagens | ✅ | Amigos |
| RF11 | Editar o próprio perfil: nome, foto, cor do avatar e **chave Pix** | ✅ | Conta → Dados Pessoais |
| RF12 | Ver o perfil de outra pessoa, com a chave Pix copiável, o saldo entre vocês e o histórico do que ela fez | ✅ | Toque num avatar |

### 2.3 Viagens e rolês

| ID | Requisito | Status | Onde |
|---|---|---|---|
| RF13 | Criar **viagem** ou **rolê** com nome, emoji, datas, hora e descrição opcionais, e membros escolhidos entre os amigos | ✅ | Viagens & Rolês → Novo |
| RF14 | Navegar entre as próprias viagens na Visão Geral (carrossel com gesto de arrastar, setas e chips) | ✅ | Visão Geral |
| RF15 | Listar viagens e rolês com filtro por tipo e saldo resumido em cada card | ✅ | Viagens & Rolês |
| RF16 | Ver e **entrar em rolês abertos** (confirmação de presença) | ✅ | Visão Geral → "Rolê aberto" |
| RF17 | Adicionar membros depois da criação (só o criador ou o admin) | ✅ | Viagem → ícone de membros |
| RF18 | Apagar uma viagem ou rolê (só o admin) | ✅ | Viagem → ícone de lixeira |

### 2.4 Despesas

| ID | Requisito | Status | Onde |
|---|---|---|---|
| RF19 | Lançar despesa com descrição, valor, quem pagou, categoria e participantes | ✅ | Botão **+** da Visão Geral |
| RF20 | Dividir **igualmente**, por **valores fixos** ou por **percentual** | ✅ | Nova despesa |
| RF21 | Validar a divisão antes de salvar (partes ou percentuais precisam fechar com o total) | ✅ | `splitEngine.validateExpense` |
| RF22 | Categorizar: Transporte, Hospedagem, Comida, Lazer, Bebidas, Compras, Outros | ✅ | Nova despesa |
| RF23 | Ver os detalhes de uma despesa, com quanto cada um deve | ✅ | Toque numa despesa |
| RF24 | **Editar** ou **excluir** uma despesa (só quem criou ou o admin) | ✅ | Detalhes → Editar / Excluir |
| RF25 | Registrar o **histórico de alterações** de cada despesa (campo, valor antigo, valor novo, quem e quando) | ✅ | Detalhes → Histórico |

### 2.5 Saldos e acertos

| ID | Requisito | Status | Onde |
|---|---|---|---|
| RF26 | Calcular o saldo de cada membro por viagem (a receber ou a pagar) | ✅ | Visão Geral → card de saldo |
| RF27 | Gerar o **plano de acerto simplificado**, com o mínimo de transferências | ✅ | Visão Geral → Plano de Acerto |
| RF28 | Alternar para a visão **par a par** (sem simplificação) | ✅ | Plano de Acerto → chave "Simplificado" |
| RF29 | **Marcar uma dívida como paga**, mostrando a chave Pix do credor | ✅ | Acertar contas → Marcar como pago |
| RF30 | Pagamento registrado **por quem paga** fica pendente até o recebedor confirmar; registrado **por quem recebe** entra confirmado | ✅ | Acertar contas / Notificações |
| RF31 | Confirmar ou recusar um pagamento recebido (o pagador pode cancelar o seu) | ✅ | Notificações → Pagamentos para confirmar |
| RF32 | Compartilhar o plano de acerto como texto (compartilhamento nativo ou área de transferência) | ✅ | Acertar contas → ícone de compartilhar |

### 2.6 Acompanhamento

| ID | Requisito | Status | Onde |
|---|---|---|---|
| RF33 | Linha do tempo de atividades agrupada por dia, com filtros por viagem e por tipo (Participei, Paguei, Dívidas, Acertos) | ✅ | Atividade |
| RF34 | Notificações de dívidas pendentes (o que você deve e o que te devem) | 🟡 Parcial: calculadas ao abrir a tela, sem push | Conta → Notificações |

### 2.7 Administração

| ID | Requisito | Status | Onde |
|---|---|---|---|
| RF35 | Aprovar ou recusar cadastros pendentes | ✅ | Conta → Administração |
| RF36 | Remover um membro do app (bloqueado se ele já tiver despesas ou acertos) | ✅ | Administração → Membros |
| RF37 | Ver e revogar **todos** os convites enviados, de qualquer pessoa | ✅ | Administração → Convites |

### 2.8 Fora desta versão (backlog sugerido)

| ID | Requisito | Status |
|---|---|---|
| RF38 | Notificações push e e-mail de lembrete de dívida | ⏳ |
| RF39 | Pagamento Pix integrado (QR Code / confirmação automática pelo banco) | ⏳ |
| RF40 | Múltiplas moedas e conversão de câmbio | ⏳ |
| RF41 | Anexar foto do comprovante na despesa | ⏳ |

## 3. Requisitos não funcionais

| ID | Requisito | Como é atendido |
|---|---|---|
| RNF01 | **Precisão monetária**: nenhum erro de arredondamento | Valores em centavos inteiros, e o resto da divisão é distribuído centavo a centavo (`splitEngine`, coberto por testes) |
| RNF02 | **Segurança dos dados**: cada um só vê e altera o que pode | Row Level Security no Postgres (`supabase/*.sql`). A chave do front-end é pública por design |
| RNF03 | **Mobile-first e responsivo** | Layout pensado para ~390px, com barra inferior; sidebar fixa a partir de 768px |
| RNF04 | **Instalável** (PWA) | `manifest.webmanifest` e ícones em `public/` |
| RNF05 | **Acesso fácil para avaliação** | GitHub Pages com deploy automático e modo demonstração sem cadastro |
| RNF06 | **Idioma** | Interface, mensagens de erro e formatação (moeda, datas) em pt-BR |
| RNF07 | **Manutenibilidade**: troca de backend sem mexer nas telas | Todo I/O passa por `dataService.js`, que encaminha para `supabaseService` ou `mockService` |
| RNF08 | **Testabilidade** | Vitest: 12 testes do motor de cálculo e 6 dos fluxos do modo demo (`npm test`) |
| RNF09 | **Disponibilidade das rotas** em hospedagem estática | HashRouter, então recarregar qualquer tela não dá 404 |

## 4. Regras de negócio

| ID | Regra |
|---|---|
| RN01 | Só pagamentos **confirmados** entram no cálculo de saldo. |
| RN02 | Em despesa com valores fixos, a soma das partes tem que ser igual ao total. Em percentual, a soma tem que dar 100%. |
| RN03 | Uma despesa precisa de valor maior que zero, de quem pagou e de pelo menos um participante. |
| RN04 | Só quem criou a despesa ou o admin pode editá-la ou excluí-la. Toda edição gera um registro no histórico. |
| RN05 | Só quem criou a viagem ou o admin adiciona membros. Só o admin apaga uma viagem. |
| RN06 | Qualquer membro aprovado pode entrar sozinho num **rolê** (evento aberto). Viagens são fechadas. |
| RN07 | A conta criada por convite já nasce amiga de quem convidou. |
| RN08 | Uma pessoa com despesas ou acertos registrados não pode ser removida do app. |

## 5. O que mudou desde a versão anterior do protótipo

- **Login simulado → autenticação real.** O primeiro protótipo simulava um
  usuário fixo com dados no `localStorage`. Hoje o login é real (Supabase), e
  os dados fictícios ficaram como **modo demonstração**, usando as mesmas telas.
- **Entrada só por convite e aprovação do admin.** Não existe "criar conta"
  aberto: a pessoa entra pelo link do convite e espera a aprovação (RF04, RF05, RF35).
- **Edição de despesas com histórico** (RF24, RF25) e **confirmação de
  pagamento em duas etapas** (RF30, RF31), para evitar acerto marcado por engano.
- **Rolês abertos** com confirmação de presença (RF16) e hora/descrição opcionais.
- **Chave Pix no perfil**, mostrada na hora de pagar (RF11, RF29).
