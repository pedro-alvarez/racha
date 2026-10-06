/**
 * dataService.js - camada de acesso a dados (ÚNICO ponto de I/O do app).
 *
 * Os componentes só conhecem este arquivo. Ele encaminha cada chamada para
 * uma de duas implementações com exatamente a mesma interface:
 *
 * - supabaseService.js → app real: login de verdade e dados no Postgres;
 * - mockService.js     → modo demonstração: dados fictícios (seedData.js)
 *                        guardados só no navegador, sem login nem cadastro.
 *
 * Qual delas responde é decidido a cada chamada: se há uma sessão demo
 * ativa (botão "Explorar o modo demonstração" no login), vai pro mock.
 */

import * as real from './supabaseService';
import * as mock from './mockService';

const service = () => (mock.isActive() ? mock : real);
const route =
  (name) =>
  (...args) =>
    service()[name](...args);

/* ---------------- Modo demonstração ---------------- */

export const isDemoMode = () => mock.isActive();
export const enterDemo = () => mock.enter();
export const resetDemo = () => mock.reset();

/* ---------------- Auth ---------------- */

export const login = route('login');
export const signUp = route('signUp');
export const logout = route('logout');
export const getCurrentUser = route('getCurrentUser');
export const needsOnboarding = route('needsOnboarding');
export const completeOnboarding = route('completeOnboarding');
export const changePassword = route('changePassword');

/** Login/logout reais (inclusive em outra aba) disparam o callback. */
export function onAuthChange(callback) {
  return real.onAuthChange(callback);
}

/* ---------------- Usuários / Amigos ---------------- */

export const getUsers = route('getUsers');
export const getFriends = route('getFriends');
export const inviteFriend = route('inviteFriend');
export const getInvites = route('getInvites');
export const revokeInvite = route('revokeInvite');

/* ---------------- Viagens / Rolês ---------------- */

export const getTrips = route('getTrips');
export const getTrip = route('getTrip');
export const createTrip = route('createTrip');
export const addTripMembers = route('addTripMembers');
export const joinTrip = route('joinTrip');
export const deleteTrip = route('deleteTrip');

/* ---------------- Despesas ---------------- */

export const getExpenses = route('getExpenses');
export const addExpense = route('addExpense');
export const updateExpense = route('updateExpense');
export const deleteExpense = route('deleteExpense');
export const getExpenseHistory = route('getExpenseHistory');
export const getUserEdits = route('getUserEdits');

/* ---------------- Pagamentos / Acertos ---------------- */

export const getPayments = route('getPayments');
export const settleDebt = route('settleDebt');
export const confirmPayment = route('confirmPayment');
export const declinePayment = route('declinePayment');

/* ---------------- Administração ---------------- */

export const getPendingUsers = route('getPendingUsers');
export const approveUser = route('approveUser');
export const rejectUser = route('rejectUser');
export const removeUser = route('removeUser');

/* ---------------- Perfil ---------------- */

export const uploadAvatar = route('uploadAvatar');
export const updateUser = route('updateUser');
