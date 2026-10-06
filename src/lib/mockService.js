/**
 * mockService.js - implementação FICTÍCIA da camada de dados (modo demo).
 *
 * Mesmas funções e mesmos formatos de retorno do supabaseService.js, mas
 * tudo acontece no navegador: os dados de src/mock/seedData.js são copiados
 * para o localStorage e cada ação (criar viagem, lançar despesa, acertar…)
 * altera essa cópia. Nada sai da máquina de quem está testando.
 *
 * As regras que no banco real ficam nas políticas de RLS (só o criador ou
 * o admin edita uma despesa, só o admin apaga viagem etc.) são simuladas
 * aqui para o fluxo se comportar igual.
 */

import {
  CURRENT_USER_ID,
  seedUsers,
  seedTrips,
  seedExpenses,
  seedPayments,
  seedFriends,
  seedInvites,
  seedHistory,
} from '../mock/seedData';

const DB_KEY = 'racha.demo.db';
const SESSION_KEY = 'racha.demo.session';

/* ---------------- armazenamento (localStorage com fallback em memória) ---------------- */

const memory = new Map();
const storage = {
  get(key) {
    if (memory.has(key)) return memory.get(key);
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },
  set(key, value) {
    try {
      if (globalThis.localStorage) {
        localStorage.setItem(key, value);
        memory.delete(key);
        return;
      }
    } catch {
      /* modo privado, storage bloqueado ou cheio: segue só em memória */
    }
    memory.set(key, value);
  },
  remove(key) {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      /* idem */
    }
    memory.delete(key);
  },
};

const clone = (value) => JSON.parse(JSON.stringify(value));

function seedDb() {
  return {
    users: clone(seedUsers),
    trips: clone(seedTrips),
    expenses: clone(seedExpenses),
    payments: clone(seedPayments),
    friends: seedFriends.map((friendId) => ({ userId: CURRENT_USER_ID, friendId })),
    invites: clone(seedInvites),
    history: clone(seedHistory),
  };
}

function load() {
  const raw = storage.get(DB_KEY);
  if (raw) {
    try {
      return JSON.parse(raw);
    } catch {
      /* JSON corrompido: recomeça do seed */
    }
  }
  const db = seedDb();
  save(db);
  return db;
}

function save(db) {
  storage.set(DB_KEY, JSON.stringify(db));
}

/** Lê o banco, aplica a mutação e salva. Devolve o que a mutação retornar. */
function mutate(fn) {
  const db = load();
  const result = fn(db);
  save(db);
  return result;
}

const newId = (prefix) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const now = () => new Date().toISOString();
// pequena espera para a UI mostrar os estados de "carregando" como no app real
const delay = (ms = 150) => new Promise((resolve) => setTimeout(resolve, ms));

const me = () => (storage.get(SESSION_KEY) ? CURRENT_USER_ID : null);
const isAdmin = (db) => db.users.find((u) => u.id === me())?.role === 'admin';

const mapProfile = (u) =>
  u && {
    id: u.id,
    name: u.name,
    email: u.email,
    color: u.color,
    photo: u.photo ?? null,
    role: u.role ?? 'member',
    approved: u.approved ?? true,
    pix: u.pix ?? null,
  };

/* ------------------------------------------------------------------ */
/* Sessão demo                                                         */
/* ------------------------------------------------------------------ */

/** Há uma sessão demo ativa neste navegador? */
export function isActive() {
  return Boolean(storage.get(SESSION_KEY));
}

/** Entra no modo demo sempre a partir dos dados originais. */
export async function enter() {
  save(seedDb());
  storage.set(SESSION_KEY, '1');
  await delay();
  return getCurrentUser();
}

/** Volta os dados fictícios ao estado inicial (sem sair do demo). */
export async function reset() {
  save(seedDb());
  await delay();
}

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

export async function login() {
  throw new Error('No modo demonstração não há login: use o botão "Explorar o modo demonstração".');
}

export async function signUp() {
  throw new Error('Cadastro indisponível no modo demonstração.');
}

export async function logout() {
  storage.remove(SESSION_KEY);
  storage.remove(DB_KEY);
}

export async function getCurrentUser() {
  const id = me();
  if (!id) return null;
  return mapProfile(load().users.find((u) => u.id === id));
}

export function onAuthChange() {
  return () => {};
}

/* ---------------- Usuários / Amigos ---------------- */

export async function getUsers() {
  return load().users.map(mapProfile);
}

export async function getFriends() {
  const db = load();
  return db.friends
    .filter((f) => f.userId === me())
    .map((f) => mapProfile(db.users.find((u) => u.id === f.friendId)))
    .filter(Boolean);
}

export async function inviteFriend(email) {
  await delay(400);
  return mutate((db) => {
    const existing = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      if (existing.id === me()) throw new Error('Esse é o seu próprio e-mail 😅');
      if (!db.friends.some((f) => f.userId === me() && f.friendId === existing.id)) {
        db.friends.push({ userId: me(), friendId: existing.id });
      }
      return { status: 'friend', profile: mapProfile(existing) };
    }
    // no app real o Supabase manda o e-mail com link mágico; aqui só registra
    if (!db.invites.some((i) => i.email === email && i.invitedBy === me())) {
      db.invites.unshift({ id: newId('i'), email, invitedBy: me(), createdAt: now() });
    }
    return { status: 'invited' };
  });
}

export async function getInvites() {
  const db = load();
  // como na RLS: cada um vê os próprios convites; o admin vê todos
  return db.invites.filter((i) => isAdmin(db) || i.invitedBy === me());
}

export async function revokeInvite(inviteId) {
  mutate((db) => {
    db.invites = db.invites.filter((i) => i.id !== inviteId);
  });
}

/* ---------------- Viagens ---------------- */

export async function getTrips() {
  return [...load().trips].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

export async function getTrip(tripId) {
  return load().trips.find((t) => t.id === tripId) ?? null;
}

export async function createTrip({ name, emoji, type, startDate, endDate, startTime, description, members }) {
  await delay();
  return mutate((db) => {
    const trip = {
      id: newId('t'),
      name,
      emoji: emoji || '✈️',
      type: type || 'viagem',
      description: description?.trim() || '',
      startDate: startDate || null,
      endDate: endDate || null,
      startTime: startTime || '',
      createdBy: me(),
      members: [...new Set([me(), ...members])],
      createdAt: now(),
    };
    db.trips.push(trip);
    return trip;
  });
}

export async function addTripMembers(tripId, userIds) {
  mutate((db) => {
    const trip = db.trips.find((t) => t.id === tripId);
    if (!trip) throw new Error('Viagem não encontrada.');
    if (!isAdmin(db) && trip.createdBy !== me()) {
      throw new Error('Só quem criou (ou o admin) pode adicionar membros.');
    }
    trip.members = [...new Set([...trip.members, ...userIds])];
  });
}

export async function joinTrip(tripId) {
  mutate((db) => {
    const trip = db.trips.find((t) => t.id === tripId);
    if (trip && !trip.members.includes(me())) trip.members.push(me());
  });
}

export async function deleteTrip(tripId) {
  mutate((db) => {
    if (!isAdmin(db)) throw new Error('Só o admin pode apagar uma viagem.');
    const expenseIds = new Set(db.expenses.filter((e) => e.tripId === tripId).map((e) => e.id));
    db.trips = db.trips.filter((t) => t.id !== tripId);
    db.expenses = db.expenses.filter((e) => e.tripId !== tripId);
    db.payments = db.payments.filter((p) => p.tripId !== tripId);
    db.history = db.history.filter((h) => !expenseIds.has(h.expenseId));
  });
}

/* ---------------- Despesas ---------------- */

const toExpense = (tripId, expense, extra) => {
  const record = {
    tripId,
    description: expense.description,
    category: expense.category ?? 'outros',
    amount: expense.amount,
    paidBy: expense.paidBy,
    splitType: expense.splitType ?? 'equal',
    participants: [...expense.participants],
    ...extra,
  };
  if (record.splitType !== 'equal') record.shares = { ...expense.shares };
  return record;
};

const canManageExpense = (db, expense) =>
  isAdmin(db) || (expense.createdBy ?? expense.paidBy) === me();

export async function getExpenses(tripId) {
  return load()
    .expenses.filter((e) => e.tripId === tripId)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

export async function addExpense(tripId, expense) {
  await delay();
  return mutate((db) => {
    const record = toExpense(tripId, expense, { id: newId('e'), createdBy: me(), createdAt: now() });
    db.expenses.push(record);
    return record;
  });
}

export async function updateExpense(expenseId, expense, changes = []) {
  await delay();
  mutate((db) => {
    const index = db.expenses.findIndex((e) => e.id === expenseId);
    if (index === -1) throw new Error('Despesa não encontrada.');
    const current = db.expenses[index];
    if (!canManageExpense(db, current)) {
      throw new Error('Só quem criou a despesa (ou o admin) pode editá-la.');
    }
    db.expenses[index] = toExpense(current.tripId, expense, {
      id: current.id,
      createdBy: current.createdBy,
      createdAt: current.createdAt,
    });
    if (changes.length > 0) {
      db.history.push({ id: newId('h'), expenseId, editedBy: me(), changes, createdAt: now() });
    }
  });
}

export async function deleteExpense(expenseId) {
  mutate((db) => {
    const expense = db.expenses.find((e) => e.id === expenseId);
    if (!expense) return;
    if (!canManageExpense(db, expense)) {
      throw new Error('Só quem criou a despesa (ou o admin) pode excluí-la.');
    }
    db.expenses = db.expenses.filter((e) => e.id !== expenseId);
    db.history = db.history.filter((h) => h.expenseId !== expenseId);
  });
}

export async function getExpenseHistory(expenseId) {
  const db = load();
  return db.history
    .filter((h) => h.expenseId === expenseId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .map((h) => ({
      id: h.id,
      editorName: db.users.find((u) => u.id === h.editedBy)?.name ?? 'Alguém',
      changes: h.changes,
      createdAt: h.createdAt,
    }));
}

export async function getUserEdits(userId) {
  const db = load();
  return db.history
    .filter((h) => h.editedBy === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 20)
    .map((h) => ({
      id: h.id,
      expenseDescription: db.expenses.find((e) => e.id === h.expenseId)?.description ?? 'despesa',
      changes: h.changes,
      createdAt: h.createdAt,
    }));
}

/* ---------------- Pagamentos / Acertos ---------------- */

export async function getPayments(tripId) {
  return load()
    .payments.filter((p) => p.tripId === tripId)
    .map((p) => ({ ...p, status: p.status ?? 'confirmed' }))
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

export async function settleDebt(tripId, { from, to, amount, note }) {
  await delay();
  return mutate((db) => {
    // mesma regra do app real: quem RECEBE registra já confirmado;
    // quem PAGA registra pendente e o recebedor precisa aceitar
    const payment = {
      id: newId('p'),
      tripId,
      from,
      to,
      amount,
      note: note ?? '',
      status: me() === to ? 'confirmed' : 'pending',
      createdAt: now(),
    };
    db.payments.push(payment);
    return payment;
  });
}

export async function confirmPayment(paymentId) {
  mutate((db) => {
    const payment = db.payments.find((p) => p.id === paymentId);
    if (payment) payment.status = 'confirmed';
  });
}

export async function declinePayment(paymentId) {
  mutate((db) => {
    db.payments = db.payments.filter((p) => p.id !== paymentId);
  });
}

/* ---------------- Onboarding / conta ---------------- */

export async function needsOnboarding() {
  return false;
}

export async function completeOnboarding() {
  throw new Error('O cadastro por convite só existe no app real.');
}

export async function changePassword() {
  await delay();
  // não há senha no modo demo; finge sucesso para o fluxo da tela seguir
}

/* ---------------- Aprovação de cadastros (admin) ---------------- */

export async function getPendingUsers() {
  return load()
    .users.filter((u) => u.approved === false)
    .map(mapProfile);
}

export async function approveUser(userId) {
  mutate((db) => {
    const user = db.users.find((u) => u.id === userId);
    if (user) user.approved = true;
  });
}

export async function rejectUser(userId) {
  mutate((db) => {
    if (!isAdmin(db)) throw new Error('Só o admin pode remover pessoas.');
    // no banco, a chave estrangeira impede apagar quem já tem registros
    const hasRecords =
      db.expenses.some((e) => e.paidBy === userId || e.participants.includes(userId)) ||
      db.payments.some((p) => p.from === userId || p.to === userId);
    if (hasRecords) {
      throw new Error('Não dá pra remover: essa pessoa tem registros no app (despesas, viagens ou acertos).');
    }
    db.users = db.users.filter((u) => u.id !== userId);
    db.friends = db.friends.filter((f) => f.userId !== userId && f.friendId !== userId);
    db.trips.forEach((t) => {
      t.members = t.members.filter((id) => id !== userId);
    });
  });
}

export async function removeUser(userId) {
  return rejectUser(userId);
}

/* ---------------- Perfil ---------------- */

/** No demo a foto vira uma data URL (fica salva junto com os dados fictícios). */
export async function uploadAvatar(_userId, file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Não foi possível ler a imagem.'));
    reader.readAsDataURL(file);
  });
}

export async function updateUser(userId, patch) {
  return mutate((db) => {
    if (userId !== me()) throw new Error('Você não tem permissão para editar o perfil de outra pessoa.');
    const user = db.users.find((u) => u.id === userId);
    for (const key of ['name', 'photo', 'color', 'pix']) {
      if (key in patch) user[key] = patch[key];
    }
    return mapProfile(user);
  });
}
