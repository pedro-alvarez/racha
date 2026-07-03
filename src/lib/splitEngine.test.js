import { describe, expect, it } from 'vitest';
import {
  computeShares,
  computeBalances,
  simplifyDebts,
  pairwiseDebts,
  validateExpense,
  SPLIT_TYPES,
} from './splitEngine';

const members = ['a', 'b', 'c'];

describe('computeShares', () => {
  it('divide igualmente e distribui o resto de arredondamento', () => {
    const shares = computeShares({ amount: 100, splitType: SPLIT_TYPES.EQUAL, participants: members });
    expect(Object.values(shares).reduce((s, v) => s + v, 0)).toBe(100);
    expect(shares.a).toBe(34); // 100 / 3 => 34, 33, 33
    expect(shares.b).toBe(33);
  });

  it('respeita valores fixos', () => {
    const shares = computeShares({
      amount: 100,
      splitType: SPLIT_TYPES.FIXED,
      participants: ['a', 'b'],
      shares: { a: 70, b: 30 },
    });
    expect(shares).toEqual({ a: 70, b: 30 });
  });

  it('percentual fecha exatamente no total', () => {
    const shares = computeShares({
      amount: 1001,
      splitType: SPLIT_TYPES.PERCENT,
      participants: members,
      shares: { a: 33.33, b: 33.33, c: 33.34 },
    });
    expect(Object.values(shares).reduce((s, v) => s + v, 0)).toBe(1001);
  });
});

describe('validateExpense', () => {
  it('rejeita soma fixa que não bate', () => {
    const { valid } = validateExpense({
      amount: 100,
      paidBy: 'a',
      splitType: SPLIT_TYPES.FIXED,
      participants: ['a', 'b'],
      shares: { a: 50, b: 40 },
    });
    expect(valid).toBe(false);
  });

  it('rejeita percentuais que não somam 100', () => {
    const { valid } = validateExpense({
      amount: 100,
      paidBy: 'a',
      splitType: SPLIT_TYPES.PERCENT,
      participants: ['a', 'b'],
      shares: { a: 60, b: 30 },
    });
    expect(valid).toBe(false);
  });

  it('aceita despesa válida', () => {
    const { valid } = validateExpense({
      amount: 100,
      paidBy: 'a',
      splitType: SPLIT_TYPES.EQUAL,
      participants: members,
    });
    expect(valid).toBe(true);
  });
});

describe('computeBalances', () => {
  it('soma zero e reflete pagador/participantes', () => {
    const expenses = [
      { amount: 300, paidBy: 'a', splitType: SPLIT_TYPES.EQUAL, participants: members },
    ];
    const balances = computeBalances(expenses, [], members);
    expect(balances.a).toBe(200);
    expect(balances.b).toBe(-100);
    expect(balances.c).toBe(-100);
    expect(Object.values(balances).reduce((s, v) => s + v, 0)).toBe(0);
  });

  it('pagamento quita dívida', () => {
    const expenses = [
      { amount: 200, paidBy: 'a', splitType: SPLIT_TYPES.EQUAL, participants: ['a', 'b'] },
    ];
    const payments = [{ from: 'b', to: 'a', amount: 100 }];
    const balances = computeBalances(expenses, payments, ['a', 'b']);
    expect(balances.a).toBe(0);
    expect(balances.b).toBe(0);
  });
});

describe('simplifyDebts', () => {
  it('gera no máximo n-1 transferências e zera todo mundo', () => {
    const balances = { a: 500, b: -200, c: -300 };
    const transfers = simplifyDebts(balances);
    expect(transfers.length).toBeLessThanOrEqual(2);
    const net = { a: 0, b: 0, c: 0 };
    transfers.forEach((t) => {
      net[t.from] += t.amount;
      net[t.to] -= t.amount;
    });
    expect(net.a + balances.a).toBe(500 - 500);
    expect(balances.b + net.b).toBe(0);
    expect(balances.c + net.c).toBe(0);
  });

  it('devolve vazio quando tudo zerado', () => {
    expect(simplifyDebts({ a: 0, b: 0 })).toEqual([]);
  });
});

describe('pairwiseDebts', () => {
  it('compensa dívidas cruzadas', () => {
    const expenses = [
      { amount: 100, paidBy: 'a', splitType: SPLIT_TYPES.EQUAL, participants: ['a', 'b'] },
      { amount: 40, paidBy: 'b', splitType: SPLIT_TYPES.EQUAL, participants: ['a', 'b'] },
    ];
    const debts = pairwiseDebts(expenses, []);
    expect(debts).toEqual([{ from: 'b', to: 'a', amount: 30 }]);
  });

  it('subtrai pagamentos já feitos', () => {
    const expenses = [
      { amount: 100, paidBy: 'a', splitType: SPLIT_TYPES.EQUAL, participants: ['a', 'b'] },
    ];
    const payments = [{ from: 'b', to: 'a', amount: 50 }];
    expect(pairwiseDebts(expenses, payments)).toEqual([]);
  });
});
