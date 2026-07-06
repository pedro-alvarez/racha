/**
 * useTripSummary - junta despesas + pagamentos de uma viagem e devolve
 * tudo que a UI precisa: saldos, plano de acerto (simplificado ou não)
 * e atividade em ordem cronológica.
 */
import { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { computeBalances, simplifyDebts, pairwiseDebts } from '../lib/splitEngine';

export function useTripSummary(tripId) {
  const { trips, expensesByTrip, paymentsByTrip, currentUser } = useApp();

  return useMemo(() => {
    const trip = trips.find((t) => t.id === tripId) ?? null;
    const expenses = expensesByTrip[tripId] ?? [];
    const payments = paymentsByTrip[tripId] ?? [];

    if (!trip) {
      return { trip: null, expenses, payments, balances: {}, simplified: [], pairwise: [], activity: [], myBalance: 0, totalSpent: 0 };
    }

    const balances = computeBalances(expenses, payments, trip.members);
    const simplified = simplifyDebts(balances);
    const pairwise = pairwiseDebts(expenses, payments);

    const activity = [
      ...expenses.map((e) => ({ ...e, kind: 'expense' })),
      ...payments.map((p) => ({ ...p, kind: 'payment' })),
    ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const totalSpent = expenses.reduce((acc, e) => acc + e.amount, 0);
    const myBalance = currentUser ? balances[currentUser.id] ?? 0 : 0;

    return { trip, expenses, payments, balances, simplified, pairwise, activity, myBalance, totalSpent };
  }, [trips, expensesByTrip, paymentsByTrip, tripId, currentUser]);
}
