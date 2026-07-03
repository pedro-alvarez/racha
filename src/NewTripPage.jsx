/**
 * splitEngine.js — motor de cálculo de divisão de despesas.
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
    let allocated = 0;
    participants.forEach((id, i) => {
      const pct = shares[id] ?? 0;
      let value;
      if (i === participants.length - 1) {
        value = amount - allocated; // último absorve arredondamento
      } else {
        value = Math.round((amount * pct) / 100);
      }
      allocated += value;
      result[id] = value;
    });
    return result;
  }

  throw new Error(`Tipo de divisão desconhecido: ${splitType}`);
}

/**
 * Valida uma despesa antes de salvar.
 * Retorna { valid: boolean, error?: string }.
 */
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
 * @param {Array} payments  acertos [{ from, to, amount }] — "from" pagou "to"
 * @param {Array} memberIds ids de todos os membros do grupo
 * @returns {Object} { [memberId]: saldoEmCentavos }
 */
export function computeBalances(expenses = [], payments = [], memberIds = []) {
  const balances = {};
  memberIds.forEach((id) => (balances[id] = 0));

  for (const expense of expenses) {
    const shares = computeShares(expense);
    balances[expense.paidBy] = (balances[expense.paidBy] ?? 0) + expense.amount;
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
 * Simplificação de dívidas (algoritmo guloso):
 * quem mais deve paga para quem mais tem a receber, até zerar todo mundo.
 * Minimiza o número de transferências (no máximo n-1).
 *
 * @returns {Array} transferências [{ from, to, amount }]
 */
export function simplifyDebts(balances) {
  const debtors = [];
  const creditors = [];

  for (const [id, balance] of Object.entries(balances)) {
    if (balance < 0) debtors.push({ id, remaining: -balance });
    else if (balance > 0) creditors.push({ id, remaining: balance });
  }

  debtors.sort((a, b) => b.remaining - a.remaining);
  creditors.sort((a, b) => b.remaining - a.remaining);

  const transfers = [];
  let d = 0;
  let c = 0;

  while (d < debtors.length && c < creditors.length) {
    const pay = Math.min(debtors[d].remaining, creditors[c].remaining);
    if (pay > 0) {
      transfers.push({ from: debtors[d].id, to: creditors[c].id, amount: pay });
    }
    debtors[d].remaining -= pay;
    creditors[c].remaining -= pay;
    if (debtors[d].remaining === 0) d += 1;
    if (creditors[c].remaining === 0) c += 1;
  }

  return transfers;
}

/**
 * Dívidas par a par SEM simplificação: para cada dupla (A, B), quanto A deve a B
 * considerando cada despesa individualmente, menos os pagamentos já feitos.
 *
 * @returns {Array} [{ from, to, amount }] com amount > 0
 */
export function pairwiseDebts(expenses = [], payments = []) {
  // matriz: debt[devedor][credor] = centavos
  const debt = {};
  const add = (from, to, amount) => {
    if (from === to || amount === 0) return;
    debt[from] = debt[from] ?? {};
    debt[from][to] = (debt[from][to] ?? 0) + amount;
  };

  for (const expense of expenses) {
    const shares = computeShares(expense);
    for (const [memberId, share] of Object.entries(shares)) {
      add(memberId, expense.paidBy, share);
    }
  }
  for (const p of payments) {
    // pagamento reduz a dívida de from para to
    add(p.from, p.to, -p.amount);
  }

  // compensa dívidas cruzadas (A deve B e B deve A)
  const result = [];
  const seen = new Set();
  for (const from of Object.keys(debt)) {
    for (const to of Object.keys(debt[from])) {
      const key = [from, to].sort().join('|');
      if (seen.has(key)) continue;
      seen.add(key);
      const ab = debt[from]?.[to] ?? 0;
      const ba = debt[to]?.[from] ?? 0;
      const net = ab - ba;
      if (net > 0) result.push({ from, to, amount: net });
      else if (net < 0) result.push({ from: to, to: from, amount: -net });
    }
  }

  return result.sort((a, b) => b.amount - a.amount);
}
