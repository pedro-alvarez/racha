/**
 * AppContext - estado global do app (Context API).
 * Toda mutação passa pelo dataService; os componentes nunca tocam em
 * localStorage nem sabem de onde os dados vêm.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
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

  // carrega tudo do banco (sem avisar ninguém)
  const load = useCallback(async () => {
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

  // depois de uma mudança feita aqui: avisa os outros aparelhos e recarrega
  const refreshAll = useCallback(async () => {
    dataService.notifyChange();
    await load();
  }, [load]);

  /* ---------- tempo real ----------
   * 1) aviso de outro aparelho (Supabase Realtime) recarrega em segundo plano;
   * 2) voltar para o app (aba/tela em foco, internet de volta) recarrega;
   * 3) de reserva, recarrega a cada 30 s com a tela aberta.
   * Recargas em segundo plano não mostram carregando e nunca rodam duas ao mesmo tempo.
   */
  const running = useRef(false);
  const queued = useRef(false);
  const lastLoad = useRef(0);
  const backgroundLoad = useCallback(async () => {
    if (running.current) {
      queued.current = true;
      return;
    }
    running.current = true;
    try {
      do {
        queued.current = false;
        lastLoad.current = Date.now();
        await load().catch(() => {}); // sem internet: tenta de novo na próxima
      } while (queued.current);
    } finally {
      running.current = false;
    }
  }, [load]);

  useEffect(() => {
    load();
    // login/logout (em qualquer aba) recarrega os dados
    const unsubscribe = dataService.onAuthChange(() => setTimeout(load, 0));
    return unsubscribe;
  }, [load]);

  const loggedIn = Boolean(currentUser);
  useEffect(() => {
    if (!loggedIn) return undefined;
    let timer = null;
    const soon = () => {
      clearTimeout(timer);
      timer = setTimeout(backgroundLoad, 300); // junta avisos em sequência
    };
    const stopRemote = dataService.onRemoteChange(soon);
    const onFocus = () => {
      if (document.visibilityState === 'visible' && Date.now() - lastLoad.current > 3000) backgroundLoad();
    };
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('focus', onFocus);
    window.addEventListener('online', onFocus);
    const poll = setInterval(() => {
      if (document.visibilityState === 'visible') backgroundLoad();
    }, 30000);
    return () => {
      clearTimeout(timer);
      stopRemote();
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('focus', onFocus);
      window.removeEventListener('online', onFocus);
      clearInterval(poll);
    };
  }, [loggedIn, backgroundLoad]);

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

  const confirmPayment = useCallback(
    async (paymentId) => {
      await dataService.confirmPayment(paymentId);
      await refreshAll();
    },
    [refreshAll]
  );

  const declinePayment = useCallback(
    async (paymentId) => {
      await dataService.declinePayment(paymentId);
      await refreshAll();
    },
    [refreshAll]
  );

  const reopenPayment = useCallback(
    async (paymentId) => {
      await dataService.reopenPayment(paymentId);
      await refreshAll();
    },
    [refreshAll]
  );

  const attachReceipt = useCallback(
    async (paymentId, tripId, file) => {
      await dataService.attachReceipt(paymentId, tripId, file);
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
    await load();
  }, [load]);

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
      confirmPayment,
      declinePayment,
      reopenPayment,
      attachReceipt,
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
      confirmPayment,
      declinePayment,
      reopenPayment,
      attachReceipt,
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
