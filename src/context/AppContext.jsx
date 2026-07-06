/**
 * AppContext — estado global do app (Context API).
 * Toda mutação passa pelo dataService; os componentes nunca tocam em
 * localStorage nem sabem de onde os dados vêm.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import * as dataService from '../lib/dataService';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [trips, setTrips] = useState([]);
  const [openEvents, setOpenEvents] = useState([]);
  const [friends, setFriends] = useState([]);
  const [expensesByTrip, setExpensesByTrip] = useState({});
  const [paymentsByTrip, setPaymentsByTrip] = useState({});
  const [selectedTripId, setSelectedTripId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);

  const refreshAll = useCallback(async () => {
    const user = await dataService.getCurrentUser();

    // Sem sessão: limpa tudo (o Layout redireciona para /login)
    if (!user) {
      setCurrentUser(null);
      setUsers([]);
      setTrips([]);
      setOpenEvents([]);
      setFriends([]);
      setExpensesByTrip({});
      setPaymentsByTrip({});
      setSelectedTripId(null);
      setNeedsOnboarding(false);
      setLoading(false);
      return;
    }

    const [allUsers, allTrips, allFriends, onboarding] = await Promise.all([
      dataService.getUsers(),
      dataService.getTrips(),
      dataService.getFriends(),
      dataService.needsOnboarding(),
    ]);
    setNeedsOnboarding(onboarding);

    // "minhas": sou membro. "eventos abertos": eventos visíveis que ainda não entrei.
    const mine = allTrips.filter((t) => t.members.includes(user.id));
    const open = allTrips.filter((t) => t.type === 'role' && !t.members.includes(user.id));

    const expensesEntries = await Promise.all(
      mine.map(async (t) => [t.id, await dataService.getExpenses(t.id)])
    );
    const paymentsEntries = await Promise.all(
      mine.map(async (t) => [t.id, await dataService.getPayments(t.id)])
    );
    setCurrentUser(user);
    setUsers(allUsers);
    setTrips(mine);
    setOpenEvents(open);
    setFriends(allFriends);
    setExpensesByTrip(Object.fromEntries(expensesEntries));
    setPaymentsByTrip(Object.fromEntries(paymentsEntries));
    setSelectedTripId((prev) =>
      prev && mine.some((t) => t.id === prev) ? prev : mine[0]?.id ?? null
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    refreshAll();
    // login/logout (em qualquer aba) recarrega os dados
    const unsubscribe = dataService.onAuthChange(() => setTimeout(refreshAll, 0));
    return unsubscribe;
  }, [refreshAll]);

  const userById = useCallback(
    (id) => users.find((u) => u.id === id) ?? { id, name: '???', color: '#666' },
    [users]
  );

  /* ---------- ações (sempre via dataService) ---------- */

  const addExpense = useCallback(
    async (tripId, expense) => {
      await dataService.addExpense(tripId, expense);
      await refreshAll();
    },
    [refreshAll]
  );

  const updateExpense = useCallback(
    async (expenseId, expense, changes) => {
      await dataService.updateExpense(expenseId, expense, changes);
      await refreshAll();
    },
    [refreshAll]
  );

  const deleteExpense = useCallback(
    async (expenseId) => {
      await dataService.deleteExpense(expenseId);
      await refreshAll();
    },
    [refreshAll]
  );

  const settleDebt = useCallback(
    async (tripId, payment) => {
      await dataService.settleDebt(tripId, payment);
      await refreshAll();
    },
    [refreshAll]
  );

  const createTrip = useCallback(
    async (trip) => {
      const created = await dataService.createTrip(trip);
      await refreshAll();
      setSelectedTripId(created.id);
      return created;
    },
    [refreshAll]
  );

  const addTripMembers = useCallback(
    async (tripId, userIds) => {
      await dataService.addTripMembers(tripId, userIds);
      await refreshAll();
    },
    [refreshAll]
  );

  const deleteTrip = useCallback(
    async (tripId) => {
      await dataService.deleteTrip(tripId);
      setSelectedTripId(null);
      await refreshAll();
    },
    [refreshAll]
  );

  const updateUser = useCallback(
    async (userId, patch) => {
      await dataService.updateUser(userId, patch);
      await refreshAll();
    },
    [refreshAll]
  );

  const joinTrip = useCallback(
    async (tripId) => {
      await dataService.joinTrip(tripId);
      await refreshAll();
      setSelectedTripId(tripId);
    },
    [refreshAll]
  );

  const logout = useCallback(async () => {
    await dataService.logout();
    setSelectedTripId(null);
    await refreshAll();
  }, [refreshAll]);

  const value = useMemo(
    () => ({
      currentUser,
      users,
      userById,
      trips,
      openEvents,
      friends,
      expensesByTrip,
      paymentsByTrip,
      selectedTripId,
      setSelectedTripId,
      loading,
      addExpense,
      updateExpense,
      deleteExpense,
      settleDebt,
      createTrip,
      joinTrip,
      deleteTrip,
      addTripMembers,
      needsOnboarding,
      updateUser,
      logout,
      refreshAll,
    }),
    [
      currentUser,
      users,
      userById,
      trips,
      openEvents,
      friends,
      expensesByTrip,
      paymentsByTrip,
      selectedTripId,
      loading,
      addExpense,
      updateExpense,
      deleteExpense,
      settleDebt,
      createTrip,
      joinTrip,
      deleteTrip,
      addTripMembers,
      needsOnboarding,
      updateUser,
      logout,
      refreshAll,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp precisa estar dentro de <AppProvider>');
  return ctx;
}
