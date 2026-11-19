import { describe, expect, it } from 'vitest';
import {
  computeShares,
  computeBalances,
  pairwiseDebts,
  validateExpense,
  fillRemainder,
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

describe('pairwiseDebts', () => {
  it('compensa dívidas cruzadas', () => {
    const expenses = [
      { amount: 100, paidBy: 'a', splitType: SPLIT_TYPES.EQUAL, participants: ['a', 'b'] },
      { amount: 40, paidBy: 'b', splitType: SPLIT_TYPES.EQUAL, participants: ['a', 'b'] },
    ];
    const debts = pairwiseDebts(expenses, []);
    expect(debts.map(({ from, to, amount }) => ({ from, to, amount }))).toEqual([{ from: 'b', to: 'a', amount: 30 }]);
  });

  it('subtrai pagamentos já feitos', () => {
    const expenses = [
      { amount: 100, paidBy: 'a', splitType: SPLIT_TYPES.EQUAL, participants: ['a', 'b'] },
    ];
    const payments = [{ from: 'b', to: 'a', amount: 50 }];
    expect(pairwiseDebts(expenses, payments)).toEqual([]);
  });
});

describe('fillRemainder', () => {
  const quatro = ['pedro', 'akira', 'c', 'd'];

  it('valores: quem ficou em branco divide o resto por igual', () => {
    // total R$ 100: Pedro R$ 10, Akira R$ 20, os outros dois R$ 35 cada
    const shares = fillRemainder(SPLIT_TYPES.FIXED, 10000, quatro, { pedro: 1000, akira: 2000 });
    expect(shares).toEqual({ pedro: 1000, akira: 2000, c: 3500, d: 3500 });
    expect(validateExpense({ amount: 10000, paidBy: 'pedro', splitType: SPLIT_TYPES.FIXED, participants: quatro, shares }).valid).toBe(true);
  });

  it('valores: centavos do arredondamento fecham o total', () => {
    const shares = fillRemainder(SPLIT_TYPES.FIXED, 1000, ['a', 'b', 'c', 'd'], { a: 0 });
    expect(Object.values(shares).reduce((s, v) => s + v, 0)).toBe(1000);
  });

  it('percentual: 50% para um e o resto dividido entre os outros', () => {
    const shares = fillRemainder(SPLIT_TYPES.PERCENT, 9000, quatro, { pedro: 50 });
    expect(shares.pedro).toBe(50);
    expect(shares.akira + shares.c + shares.d).toBeCloseTo(50, 5);
    expect(shares.akira).toBe(shares.c);
    expect(shares.c).toBe(shares.d);
    const cents = computeShares({ amount: 28697, splitType: SPLIT_TYPES.PERCENT, participants: quatro, shares });
    expect(Object.values(cents).reduce((s, v) => s + v, 0)).toBe(28697);
    expect(Math.max(cents.akira, cents.c, cents.d) - Math.min(cents.akira, cents.c, cents.d)).toBeLessThanOrEqual(1);
    expect(validateExpense({ amount: 9000, paidBy: 'pedro', splitType: SPLIT_TYPES.PERCENT, participants: quatro, shares }).valid).toBe(true);
  });

  it('se o preenchido já passa do total, os em branco ficam com zero', () => {
    const shares = fillRemainder(SPLIT_TYPES.FIXED, 1000, ['a', 'b'], { a: 1500 });
    expect(shares).toEqual({ a: 1500, b: 0 });
  });
});

describe('computeBalances com despesa sem participantes', () => {
  it('não credita o pagador quando ninguém divide a despesa', () => {
    const balances = computeBalances(
      [
        { amount: 28697, paidBy: 'miguel', splitType: SPLIT_TYPES.PERCENT, participants: [], shares: {} },
        { amount: 8300, paidBy: 'andre', splitType: SPLIT_TYPES.EQUAL, participants: ['andre', 'pedro'] },
      ],
      [],
      ['miguel', 'andre', 'pedro']
    );
    expect(balances).toEqual({ miguel: 0, andre: 4150, pedro: -4150 });
  });
});

describe('pairwiseDebts com justificativa', () => {
  it('explica cada dívida pelas despesas e pagamentos', () => {
    const expenses = [
      { id: 'gas', description: 'Gasolina', date: '2026-11-18', amount: 9000, paidBy: 'miguel', splitType: SPLIT_TYPES.EQUAL, participants: ['andre', 'pedro', 'miguel'] },
      { id: 'pad', description: 'Padaria', date: '2026-11-19', amount: 2000, paidBy: 'andre', splitType: SPLIT_TYPES.EQUAL, participants: ['andre', 'miguel'] },
    ];
    const payments = [{ id: 'p1', from: 'pedro', to: 'miguel', amount: 1000, createdAt: '2026-11-20T10:00:00Z' }];
    const debts = pairwiseDebts(expenses, payments);

    const andre = debts.find((d) => d.from === 'andre' && d.to === 'miguel');
    expect(andre.amount).toBe(2000); // 3000 da gasolina - 1000 da padaria
    expect(andre.items.map((i) => [i.id, i.amount])).toEqual([['gas', 3000], ['pad', -1000]]);

    const pedro = debts.find((d) => d.from === 'pedro');
    expect(pedro.amount).toBe(2000);
    expect(pedro.items.map((i) => [i.kind, i.amount])).toEqual([['expense', 3000], ['payment', -1000]]);

    for (const d of debts) expect(d.items.reduce((s, i) => s + i.amount, 0)).toBe(d.amount);
  });
});
