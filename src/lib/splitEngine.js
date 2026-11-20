/**
 * splitEngine.js - motor de cálculo de divisão de despesas.
 *
 * 100% desacoplado da UI e do dataService: recebe dados puros, devolve dados puros.
 * Todos os valores monetários são tratados em CENTAVOS (inteiros) para evitar
 * erros de ponto flutuante.
 *
 * Convenção de sinal dos saldos:
 *   saldo > 0  => a pessoa tem a RECEBER
 *   saldo < 0  => a pessoa DEVE
 */

export const SPLIT_TYPES = {
  EQUAL: 'equal',     // dividido igualmente entre os participantes
  FIXED: 'fixed',     // valores fixos por participante (em centavos)
  PERCENT: 'percent', // percentuais por participante (soma = 100)
};

/**
 * Calcula quanto cada participante deve numa despesa, em centavos.
 * Retorna um objeto { [memberId]: shareEmCentavos }.
 * A soma das partes SEMPRE bate com o total (sobras de arredondamento são
 * distribuídas centavo a centavo entre os primeiros participantes).
 */
export function computeShares(expense) {
  const { amount, splitType = SPLIT_TYPES.EQUAL, participants = [], shares = {} } = expense;
  const result = {};

  if (splitType === SPLIT_TYPES.EQUAL) {
    const n = participants.length;
    if (n === 0) return result;
    const base = Math.floor(amount / n);
    let remainder = amount - base * n;
    participants.forEach((id) => {
      result[id] = base + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder -= 1;
    });
    return result;
  }

  if (splitType === SPLIT_TYPES.FIXED) {
    participants.forEach((id) => {
      result[id] = Math.round(shares[id] ?? 0);
    });
    return result;
  }

  if (splitType === SPLIT_TYPES.PERCENT) {
    // maiores restos: cada um recebe o piso do valor exato e os centavos que
    // sobram vão, um a um, para quem tem a maior fração. Percentuais iguais
    // resultam em valores iguais (diferença máxima de 1 centavo).
    const exact = participants.map((id) => (amount * (shares[id] ?? 0)) / 100);
    const floors = exact.map((v) => Math.floor(v + 1e-9));
    let leftover = amount - floors.reduce((s, v) => s + v, 0);
    const order = exact
      .map((v, i) => ({ i, frac: v - floors[i] }))
      .sort((x, y) => y.frac - x.frac || x.i - y.i);
    for (let k = 0; leftover > 0 && participants.length > 0; k++, leftover--) {
      floors[order[k % order.length].i] += 1;
    }
    participants.forEach((id, i) => {
      result[id] = floors[i];
    });
    return result;
  }

  throw new Error(`Tipo de divisão desconhecido: ${splitType}`);
}

/**
 * Valida uma despesa antes de salvar.
 * Retorna { valid: boolean, error?: string }.
 */
/**
 * Completa uma divisão por valores ou por percentual: quem ficou sem valor
 * (ausente em `filled`) divide igualmente o que sobrou do total.
 * Valores em centavos (FIXED): os centavos que sobram vão um a um, então a
 * soma fecha. Em % (PERCENT), todos em branco recebem o mesmo percentual.
 * Se o que foi preenchido já passa do total, os em branco ficam com 0 e a
 * validação acusa a diferença.
 *
 * @returns {Object} { [participantId]: valor } para todos os participantes
 */
export function fillRemainder(splitType, amount, participants, filled) {
  const blanks = participants.filter((id) => filled[id] == null);
  const total = splitType === SPLIT_TYPES.PERCENT ? 100 : amount;
  const used = participants.reduce((acc, id) => acc + (filled[id] ?? 0), 0);
  const result = Object.fromEntries(participants.map((id) => [id, filled[id] ?? 0]));
  const rest = total - used;
  if (blanks.length === 0 || rest <= 0) return result;

  // %: todos em branco recebem o mesmo percentual (6 casas); os centavos
  // são repartidos por computeShares
  if (splitType === SPLIT_TYPES.PERCENT) {
    const each = Math.round((rest / blanks.length) * 1e6) / 1e6;
    blanks.forEach((id) => {
      result[id] = each;
    });
    return result;
  }

  const base = Math.floor(rest / blanks.length);
  let remainder = rest - base * blanks.length;
  blanks.forEach((id) => {
    result[id] = base + (remainder > 0 ? 1 : 0);
    if (remainder > 0) remainder -= 1;
  });
  return result;
}

export function validateExpense(expense) {
  const { amount, splitType = SPLIT_TYPES.EQUAL, participants = [], shares = {}, paidBy } = expense;

  if (!Number.isInteger(amount) || amount <= 0) {
    return { valid: false, error: 'O valor da despesa deve ser maior que zero.' };
  }
  if (!paidBy) {
    return { valid: false, error: 'Informe quem pagou a despesa.' };
  }
  if (participants.length === 0) {
    return { valid: false, error: 'Selecione ao menos um participante.' };
  }

  if (splitType === SPLIT_TYPES.FIXED) {
    const sum = participants.reduce((acc, id) => acc + Math.round(shares[id] ?? 0), 0);
    if (sum !== amount) {
      return {
        valid: false,
        error: `A soma das partes (${sum}) não bate com o total da despesa (${amount}).`,
      };
    }
  }

  if (splitType === SPLIT_TYPES.PERCENT) {
    const sum = participants.reduce((acc, id) => acc + (shares[id] ?? 0), 0);
    if (Math.abs(sum - 100) > 0.01) {
      return { valid: false, error: `Os percentuais somam ${sum}%, mas precisam somar 100%.` };
    }
  }

  return { valid: true };
}

/**
 * Saldo líquido de cada membro a partir de despesas e pagamentos.
 *
 * @param {Array} expenses  despesas [{ amount, paidBy, participants, splitType, shares }]
 * @param {Array} payments  acertos [{ from, to, amount }] - "from" pagou "to"
 * @param {Array} memberIds ids de todos os membros do grupo
 * @returns {Object} { [memberId]: saldoEmCentavos }
 */
export function computeBalances(expenses = [], payments = [], memberIds = []) {
  const balances = {};
  memberIds.forEach((id) => (balances[id] = 0));

  for (const expense of expenses) {
    const shares = computeShares(expense);
    // o pagador recebe a soma das partes (= o total numa despesa válida); uma
    // despesa sem participantes não gera crédito sem ninguém devendo
    const owed = Object.values(shares).reduce((s, v) => s + v, 0);
    balances[expense.paidBy] = (balances[expense.paidBy] ?? 0) + owed;
    for (const [memberId, share] of Object.entries(shares)) {
      balances[memberId] = (balances[memberId] ?? 0) - share;
    }
  }

  // Um pagamento de A para B quita dívida: A fica menos devedor, B menos credor.
  for (const p of payments) {
    balances[p.from] = (balances[p.from] ?? 0) + p.amount;
    balances[p.to] = (balances[p.to] ?? 0) - p.amount;
  }

  return balances;
}

/**
 * Dívidas diretas: para cada dupla (A, B), quanto A deve a B, considerando
 * cada despesa (a parte de A numa despesa que B pagou) e os pagamentos já
 * feitos. Dívidas cruzadas entre a mesma dupla se compensam.
 *
 * Cada dívida traz em `items` a justificativa: as despesas e pagamentos que
 * formam o valor, com `amount` positivo quando aumenta a dívida de `from`
 * para `to` e negativo quando diminui. A soma de `items` é `amount`.
 *
 * @returns {Array} [{ from, to, amount, items }] com amount > 0
 */
export function pairwiseDebts(expenses = [], payments = []) {
  // por dupla (a < b): saldo "a deve b" e os lançamentos nessa direção
  const pairs = {};
  const add = (from, to, amount, item) => {
    if (from === to || amount === 0) return;
    const [a, b] = from < to ? [from, to] : [to, from];
    const key = `${a}|${b}`;
    pairs[key] = pairs[key] ?? { a, b, net: 0, items: [] };
    const signed = from === a ? amount : -amount;
    pairs[key].net += signed;
    pairs[key].items.push({ ...item, amount: signed });
  };

  for (const expense of expenses) {
    const shares = computeShares(expense);
    for (const [memberId, share] of Object.entries(shares)) {
      add(memberId, expense.paidBy, share, {
        kind: 'expense',
        id: expense.id,
        description: expense.description,
        date: expense.date ?? expense.createdAt,
        owedBy: memberId,
        paidBy: expense.paidBy,
      });
    }
  }
  for (const p of payments) {
    // pagamento de "from" para "to" diminui a dívida de from com to
    add(p.from, p.to, -p.amount, {
      kind: 'payment',
      id: p.id,
      date: p.createdAt,
      from: p.from,
      to: p.to,
      note: p.note ?? '',
      expenseIds: p.expenseIds ?? [],
    });
  }

  const result = [];
  for (const { a, b, net, items } of Object.values(pairs)) {
    if (net === 0) continue;
    const forward = net > 0;
    result.push({
      from: forward ? a : b,
      to: forward ? b : a,
      amount: Math.abs(net),
      items: items
        .map((it) => ({ ...it, amount: forward ? it.amount : -it.amount }))
        .sort((x, y) => String(x.date).localeCompare(String(y.date))),
    });
  }

  return result.sort((x, y) => y.amount - x.amount);
}

/**
 * Quanto de cada despesa de uma dívida já foi pago "por despesa".
 *
 * Considera as despesas que o devedor deve (itens com amount > 0) e reparte
 * cada pagamento do devedor que cite despesas (expenseIds) entre elas, na
 * ordem citada, até a parte de cada uma. Assim um pagamento menor que a parte
 * (por exemplo, quando a despesa foi editada depois) deixa a despesa parcial.
 *
 * @param {Object} debt   uma dívida de pairwiseDebts ({ from, to, items })
 * @param {Array}  extras pagamentos a somar aos da dívida (ex.: os pendentes)
 * @returns {Object} { [expenseId]: { share, paid, left } }
 */
export function expenseCoverage(debt, extras = []) {
  const cov = {};
  for (const it of debt.items ?? []) {
    if (it.kind === 'expense' && it.amount > 0) cov[it.id] = { share: it.amount, paid: 0 };
  }
  const payments = [
    ...(debt.items ?? []).filter((it) => it.kind === 'payment' && it.from === debt.from),
    ...extras.filter((p) => p.from === debt.from),
  ];
  for (const p of payments) {
    let rest = Math.abs(p.amount);
    for (const id of p.expenseIds ?? []) {
      const c = cov[id];
      if (!c || rest <= 0) continue;
      const take = Math.min(rest, c.share - c.paid);
      c.paid += take;
      rest -= take;
    }
  }
  for (const c of Object.values(cov)) c.left = c.share - c.paid;
  return cov;
}
