/**
 * Ranking da viagem (tabela de liderança): para cada membro, quanto ele
 * CONSUMIU (a parte dele nas despesas) e quanto PAGOU (o que tirou do bolso
 * na hora). Aparece todo mundo da viagem, inclusive quem ficou zerado.
 * Despesas marcadas como "não contar no ranking" (ex.: compra pessoal) ficam
 * fora dessas contas, mas continuam valendo em quem deve a quem.
 */
import { computeShares } from './splitEngine';

export const TITULOS = [
  { categoria: 'comida', titulo: 'Rei da comida', emoji: '🍔' },
  { categoria: 'bebidas', titulo: 'Patrocinador do bar', emoji: '🍻' },
  { categoria: 'transporte', titulo: 'Motorista oficial', emoji: '🚗' },
  { categoria: 'lazer', titulo: 'Rei do rolê', emoji: '🎉' },
  { categoria: 'hospedagem', titulo: 'Dono da casa', emoji: '🏠' },
  { categoria: 'compras', titulo: 'Rei das compras', emoji: '🛍️' },
];

/**
 * @param {Array} expenses  despesas da viagem
 * @param {Array} memberIds membros da viagem (a média divide por eles)
 */
export function computeRanking(expenses = [], memberIds = []) {
  const stats = {};
  const pessoa = (id) => (stats[id] ??= { id, consumed: 0, paid: 0, count: 0, byCategory: {} });
  memberIds.forEach(pessoa);

  const contam = expenses.filter((e) => !e.noRanking);
  let total = 0;
  for (const e of contam) {
    total += e.amount;
    pessoa(e.paidBy).paid += e.amount;
    for (const [id, share] of Object.entries(computeShares(e))) {
      const s = pessoa(id);
      s.consumed += share;
      s.count += 1;
      const cat = e.category ?? 'outros';
      s.byCategory[cat] = (s.byCategory[cat] ?? 0) + share;
    }
  }

  const pessoas = Object.values(stats);
  const average = memberIds.length ? Math.round(total / memberIds.length) : 0;
  const ordena = (campo) => [...pessoas].sort((a, b) => b[campo] - a[campo] || a.id.localeCompare(b.id));
  const byConsumed = ordena('consumed');
  const byPaid = ordena('paid');

  // títulos de brincadeira: quem mais consumiu em cada categoria
  const titles = [];
  // (empate no topo não dá título: dividido igual entre todos não é mérito de ninguém)
  for (const t of TITULOS) {
    const [top, segundo] = [...pessoas].sort((a, b) => (b.byCategory[t.categoria] ?? 0) - (a.byCategory[t.categoria] ?? 0));
    const valor = top?.byCategory[t.categoria] ?? 0;
    if (valor > 0 && valor > (segundo?.byCategory[t.categoria] ?? 0)) titles.push({ ...t, id: top.id, valor });
  }
  if (byPaid[0]?.paid > 0) titles.push({ titulo: 'Banco do grupo', emoji: '💳', id: byPaid[0].id, valor: byPaid[0].paid, pagou: true });
  if (total > 0 && pessoas.length > 1) {
    const [menor, penultimo] = [...byConsumed].reverse();
    if (menor.consumed < penultimo.consumed) titles.push({ titulo: 'Mão de vaca', emoji: '🤏', id: menor.id, valor: menor.consumed });
  }

  return {
    total,
    average,
    members: memberIds.length,
    byConsumed,
    byPaid,
    titles,
    excluded: expenses.filter((e) => e.noRanking),
  };
}
