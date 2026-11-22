import { describe, expect, it } from 'vitest';
import { computeRanking } from './ranking';
import { SPLIT_TYPES } from './splitEngine';

const E = (id, amount, paidBy, participants, category, extra = {}) => ({
  id, amount, paidBy, participants, category, splitType: SPLIT_TYPES.EQUAL, ...extra,
});

describe('computeRanking', () => {
  const membros = ['a', 'b', 'c', 'd'];
  const despesas = [
    E('mercado', 9000, 'a', ['a', 'b', 'c'], 'comida'),
    E('bar', 4000, 'b', ['b'], 'bebidas'),
    E('camisa', 15000, 'a', ['a'], 'compras', { noRanking: true }),
  ];
  const r = computeRanking(despesas, membros);

  it('soma o total e a média por membro, sem a despesa fora do ranking', () => {
    expect(r.total).toBe(13000);
    expect(r.average).toBe(3250); // 130,00 / 4
    expect(r.excluded.map((e) => e.id)).toEqual(['camisa']);
  });

  it('mostra todo mundo, inclusive quem ficou zerado', () => {
    expect(r.byConsumed.map((p) => p.id)).toEqual(['b', 'a', 'c', 'd']);
    expect(r.byConsumed.map((p) => p.consumed)).toEqual([7000, 3000, 3000, 0]);
    expect(r.byPaid.map((p) => [p.id, p.paid])).toEqual([['a', 9000], ['b', 4000], ['c', 0], ['d', 0]]);
  });

  it('dá os títulos por categoria, o banco do grupo e o mão de vaca', () => {
    const t = Object.fromEntries(r.titles.map((x) => [x.titulo, x.id]));
    expect(t['Rei da comida']).toBeUndefined(); // empate em 30,00 entre a, b e c: ninguém leva
    expect(t['Patrocinador do bar']).toBe('b');
    expect(t['Banco do grupo']).toBe('a');
    expect(t['Mão de vaca']).toBe('d');
    expect(t['Rei das compras']).toBeUndefined(); // a camisa não conta
  });
});

describe('computeRanking: títulos só para quem lidera sozinho', () => {
  it('dá o título quando um consumiu mais na categoria', () => {
    const r = computeRanking([E('x', 3000, 'a', ['a', 'b'], 'comida'), E('y', 2000, 'a', ['a'], 'comida')], ['a', 'b']);
    expect(r.titles.find((t) => t.titulo === 'Rei da comida')).toMatchObject({ id: 'a', valor: 3500 });
  });
});
