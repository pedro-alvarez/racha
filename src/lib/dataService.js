/**
 * dataService.js — camada de acesso a dados (ÚNICO ponto de I/O do app).
 *
 * Hoje: lê/escreve em localStorage, populado com dados mock (src/mock/seedData.js).
 * Amanhã: troque o corpo destas funções por chamadas HTTP (fetch/axios) para a
 * sua API real. As assinaturas já são assíncronas, então NENHUM componente
 * precisa mudar — só este arquivo.
 *
 * Exemplo de migração futura:
 *   export async function getTrips() {
 *     const res = await fetch(`${API_URL}/trips`, { headers: authHeaders() });
 *     return res.json();
 *   }
 *
 * Regra de ouro: nenhum componente acessa localStorage diretamente.
 */

import {
  seedUsers,
  seedTrips,
  seedExpenses,
  seedPayments,
  seedFriends,
  CURRENT_USER_ID,
} from '../mock/seedData';

const STORAGE_KEY = 'racha:db:v1';

// Pequeno delay para simular latência de rede e garantir que a UI
// já esteja preparada para estados de carregamento reais.
const simulateNetwork = (ms = 120) => new Promise((r) => setTimeout(r, ms));

function loadDb() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // storage corrompido — recomeça do seed
  }
  const db = {
    users: seedUsers,
    trips: seedTrips,
    expenses: seedExpenses,
    payments: seedPayments,
    friends: seedFriends,
    currentUserId: CURRENT_USER_ID,
  };
  saveDb(db);
  return db;
}

function saveDb(db) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

const uid = (prefix) => `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;

/* ------------------------------------------------------------------ */
/* Auth (mock) — TODO backend: trocar por login real (JWT/OAuth/etc.) */
/* ------------------------------------------------------------------ */

export async function login(_email, _password) {
  // TODO backend: POST /auth/login — hoje sempre "autentica" o usuário fixo.
  await simulateNetwork(400);
  const db = loadDb();
  return db.users.find((u) => u.id === db.currentUserId);
}

export async function getCurrentUser() {
  // TODO backend: GET /me com token salvo
  await simulateNetwork(50);
  const db = loadDb();
  return db.users.find((u) => u.id === db.currentUserId);
}

/* ---------------- Usuários / Amigos ---------------- */

export async function getUsers() {
  // TODO backend: GET /users
  await simulateNetwork();
  return loadDb().users;
}

export async function getFriends() {
  // TODO backend: GET /me/friends
  await simulateNetwork();
  const db = loadDb();
  return db.friends.map((id) => db.users.find((u) => u.id === id)).filter(Boolean);
}

export async function addFriend({ name, email }) {
  // TODO backend: POST /me/friends
  await simulateNetwork();
  const db = loadDb();
  const colors = ['#F0146B', '#8B5CF6', '#06B6D4', '#F59E0B', '#22C55E', '#3B82F6', '#EC4899'];
  const user = {
    id: uid('u'),
    name,
    email,
    color: colors[db.users.length % colors.length],
  };
  db.users.push(user);
  db.friends.push(user.id);
  saveDb(db);
  return user;
}

/* ---------------- Viagens ---------------- */

export async function getTrips() {
  // TODO backend: GET /trips
  await simulateNetwork();
  return loadDb().trips;
}

export async function getTrip(tripId) {
  // TODO backend: GET /trips/:id
  await simulateNetwork();
  return loadDb().trips.find((t) => t.id === tripId) ?? null;
}

export async function createTrip({ name, emoji, startDate, endDate, members }) {
  // TODO backend: POST /trips
  await simulateNetwork();
  const db = loadDb();
  const trip = {
    id: uid('t'),
    name,
    emoji: emoji || '✈️',
    startDate,
    endDate,
    members,
    createdAt: new Date().toISOString(),
  };
  db.trips.unshift(trip);
  saveDb(db);
  return trip;
}

/* ---------------- Despesas ---------------- */

export async function getExpenses(tripId) {
  // TODO backend: GET /trips/:id/expenses
  await simulateNetwork();
  return loadDb().expenses.filter((e) => e.tripId === tripId);
}

export async function addExpense(tripId, expense) {
  // TODO backend: POST /trips/:id/expenses
  await simulateNetwork();
  const db = loadDb();
  const record = {
    ...expense,
    id: uid('e'),
    tripId,
    createdAt: new Date().toISOString(),
  };
  db.expenses.push(record);
  saveDb(db);
  return record;
}

/* ---------------- Pagamentos / Acertos ---------------- */

export async function getPayments(tripId) {
  // TODO backend: GET /trips/:id/payments
  await simulateNetwork();
  return loadDb().payments.filter((p) => p.tripId === tripId);
}

/**
 * Registra um acerto: "from" pagou "amount" (centavos) para "to".
 */
export async function settleDebt(tripId, { from, to, amount, note }) {
  // TODO backend: POST /trips/:id/payments
  await simulateNetwork();
  const db = loadDb();
  const record = {
    id: uid('p'),
    tripId,
    from,
    to,
    amount,
    note: note ?? '',
    createdAt: new Date().toISOString(),
  };
  db.payments.push(record);
  saveDb(db);
  return record;
}

/* ---------------- Utilidades ---------------- */

/** Zera o banco local e volta aos dados de demonstração. */
export async function resetDemoData() {
  localStorage.removeItem(STORAGE_KEY);
  loadDb();
}
