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

    // despesas e pagamentos de todas as viagens ao mesmo tempo
    const [expensesEntries, paymentsEntries] = await Promise.all([
      Promise.all(mine.map(async (t) => [t.id, await dataService.getExpenses(t.id)])),
      Promise.all(mine.map(async (t) => [t.id, await dataService.getPayments(t.id)])),
    ]);
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

  // depois de uma mudança feita aqui: avisa os outros e recarrega em segundo
  // plano. A tela já foi atualizada na hora (otimista) e não espera a recarga.
  const refreshSoon = useCallback(() => {
    dataService.notifyChange();
    backgroundLoad();
  }, [backgroundLoad]);

  const patchExpenses = (tripId, fn) => setExpensesByTrip((prev) => ({ ...prev, [tripId]: fn(prev[tripId] ?? []) }));
  const patchPayments = (fn) =>
    setPaymentsByTrip((prev) => Object.fromEntries(Object.entries(prev).map(([k, list]) => [k, fn(list)])));

  const userById = useCallback(
    (id) => users.find((u) => u.id === id) ?? { id, name: '???', color: '#666' },
    [users]
  );

  /* ---------- ações (sempre via dataService) ---------- */

  const addExpense = useCallback(
    async (tripId, expense) => {
      const created = await dataService.addExpense(tripId, expense);
      if (created?.id) {
        patchExpenses(tripId, (list) => [...list, created]);
        dataService.notify('despesa', created.id);
      }
      refreshSoon();
    },
    [refreshSoon]
  );

  const updateExpense = useCallback(
    async (expenseId, expense, changes) => {
      await dataService.updateExpense(expenseId, expense, changes);
      setExpensesByTrip((prev) =>
        Object.fromEntries(
          Object.entries(prev).map(([k, list]) => [k, list.map((e) => (e.id === expenseId ? { ...e, ...expense, id: expenseId } : e))])
        )
      );
      dataService.notify('edicao', expenseId);
      refreshSoon();
    },
    [refreshSoon]
  );

  const deleteExpense = useCallback(
    async (expenseId) => {
      await dataService.deleteExpense(expenseId);
      setExpensesByTrip((prev) =>
        Object.fromEntries(Object.entries(prev).map(([k, list]) => [k, list.filter((e) => e.id !== expenseId)]))
      );
      refreshSoon();
    },
    [refreshSoon]
  );

  const confirmPayment = useCallback(
    async (paymentId) => {
      await dataService.confirmPayment(paymentId);
      patchPayments((list) => list.map((p) => (p.id === paymentId ? { ...p, status: 'confirmed' } : p)));
      dataService.notify('confirmacao', paymentId);
      refreshSoon();
    },
    [refreshSoon]
  );

  const declinePayment = useCallback(
    async (paymentId) => {
      // guarda quem/quanto antes de apagar, para avisar o outro lado
      const p = Object.values(paymentsByTrip).flat().find((x) => x.id === paymentId);
      await dataService.declinePayment(paymentId);
      patchPayments((list) => list.filter((x) => x.id !== paymentId));
      if (p) dataService.notify('recusa', paymentId, { from: p.from, to: p.to, amount: p.amount, tripId: p.tripId });
      refreshSoon();
    },
    [refreshSoon, paymentsByTrip]
  );

  const reopenPayment = useCallback(
    async (paymentId) => {
      await dataService.reopenPayment(paymentId);
      patchPayments((list) => list.map((p) => (p.id === paymentId ? { ...p, status: 'pending' } : p)));
      refreshSoon();
    },
    [refreshSoon]
  );

  const attachReceipt = useCallback(
    async (paymentId, tripId, file) => {
      await dataService.attachReceipt(paymentId, tripId, file);
      refreshSoon();
    },
    [refreshSoon]
  );

  const settleDebt = useCallback(
    async (tripId, payment) => {
      const created = await dataService.settleDebt(tripId, payment);
      if (created?.id) {
        setPaymentsByTrip((prev) => ({ ...prev, [tripId]: [...(prev[tripId] ?? []), created] }));
        dataService.notify('pagamento', created.id);
      }
      refreshSoon();
    },
    [refreshSoon]
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

  // encerra ou reabre a viagem (só quem criou ou o admin)
  const setTripClosed = useCallback(
    async (tripId, closed) => {
      await dataService.setTripClosed(tripId, closed);
      setTrips((prev) =>
        prev.map((t) => (t.id === tripId ? { ...t, closedAt: closed ? new Date().toISOString() : null } : t))
      );
      refreshSoon();
    },
    [refreshSoon]
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
      const updated = await dataService.updateUser(userId, patch);
      if (updated) {
        setUsers((prev) => prev.map((u) => (u.id === userId ? { ...u, ...updated } : u)));
        setCurrentUser((prev) => (prev?.id === userId ? { ...prev, ...updated } : prev));
      }
      refreshSoon();
    },
    [refreshSoon]
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
      setTripClosed,
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
      setTripClosed,
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
