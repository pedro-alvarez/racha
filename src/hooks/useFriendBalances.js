/**
 * useFriendBalances — saldo líquido entre VOCÊ e cada pessoa, somando todas
 * as viagens. Positivo = a pessoa te deve; negativo = você deve a ela.
 */
import { useMemo } from 'react';
import { useApp } from '../context/AppContext';
import { pairwiseDebts } from '../lib/splitEngine';

export function useFriendBalances() {
  const { trips, expensesByTrip, paymentsByTrip, currentUser } = useApp();

  return useMemo(() => {
    const net = {};
    if (!currentUser) return net;
    for (const trip of trips) {
      const debts = pairwiseDebts(expensesByTrip[trip.id] ?? [], paymentsByTrip[trip.id] ?? []);
      for (const d of debts) {
        if (d.from === currentUser.id) net[d.to] = (net[d.to] ?? 0) - d.amount;
        else if (d.to === currentUser.id) net[d.from] = (net[d.from] ?? 0) + d.amount;
      }
    }
    return net;
  }, [trips, expensesByTrip, paymentsByTrip, currentUser]);
}
