import { describe, it, expect, beforeEach } from 'vitest';
import * as mock from './mockService';
import { computeBalances } from './splitEngine';

describe('mockService (modo demonstração)', () => {
  beforeEach(async () => {
    await mock.logout();
  });

  it('sem sessão demo não há usuário logado', async () => {
    expect(mock.isActive()).toBe(false);
    expect(await mock.getCurrentUser()).toBeNull();
  });

  it('entra como admin aprovado e enxerga o grupo fictício', async () => {
    const user = await mock.enter();
    expect(mock.isActive()).toBe(true);
    expect(user).toMatchObject({ id: 'u-pedro', role: 'admin', approved: true });

    const trips = await mock.getTrips();
    expect(trips.map((t) => t.id)).toContain('t-ubatuba');
    expect((await mock.getFriends()).length).toBeGreaterThan(0);
    expect((await mock.getPendingUsers()).map((u) => u.id)).toEqual(['u-joao']);
  });

  it('fluxo principal: cria viagem, lança despesa e acerta as contas', async () => {
    await mock.enter();
    const trip = await mock.createTrip({ name: 'Praia', members: ['u-marina'] });
    expect(trip.members).toEqual(['u-pedro', 'u-marina']);
    expect(trip.createdBy).toBe('u-pedro');

    await mock.addExpense(trip.id, {
      description: 'Pousada',
      category: 'hospedagem',
      amount: 50000,
      paidBy: 'u-pedro',
      splitType: 'equal',
      participants: ['u-pedro', 'u-marina'],
    });
    const expenses = await mock.getExpenses(trip.id);
    expect(expenses).toHaveLength(1);
    expect(expenses[0].createdBy).toBe('u-pedro');

    // Marina deve R$ 250,00 ao Pedro
    let balances = computeBalances(expenses, [], trip.members);
    expect(balances['u-marina']).toBe(-25000);

    // Pedro (recebedor) registra "já recebi": entra confirmado no saldo
    const payment = await mock.settleDebt(trip.id, { from: 'u-marina', to: 'u-pedro', amount: 25000 });
    expect(payment.status).toBe('confirmed');
    balances = computeBalances(expenses, await mock.getPayments(trip.id), trip.members);
    expect(balances['u-marina']).toBe(0);
  });

  it('pagamento registrado por quem paga fica pendente até o recebedor confirmar', async () => {
    await mock.enter();
    const p = await mock.settleDebt('t-ubatuba', { from: 'u-pedro', to: 'u-marina', amount: 1000 });
    expect(p.status).toBe('pending');
    await mock.confirmPayment(p.id);
    const stored = (await mock.getPayments('t-ubatuba')).find((x) => x.id === p.id);
    expect(stored.status).toBe('confirmed');
  });

  it('edição grava histórico e respeita a regra de permissão', async () => {
    await mock.enter();
    const [expense] = await mock.getExpenses('t-ubatuba');
    await mock.updateExpense(expense.id, { ...expense, amount: 250000 }, [
      { field: 'valor', old: 'R$ 2.400,00', new: 'R$ 2.500,00' },
    ]);
    const history = await mock.getExpenseHistory(expense.id);
    expect(history[0]).toMatchObject({ editorName: 'Pedro Certo' });

    await expect(mock.updateUser('u-marina', { name: 'X' })).rejects.toThrow(/permissão/);
  });

  it('restaurar volta tudo ao estado inicial', async () => {
    await mock.enter();
    await mock.createTrip({ name: 'Temporária', members: [] });
    const before = (await mock.getTrips()).length;
    await mock.reset();
    expect((await mock.getTrips()).length).toBe(before - 1);
  });
});
