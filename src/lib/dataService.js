/**
 * dataService.js - camada de acesso a dados (ÚNICO ponto de I/O do app).
 *
 * Os componentes só conhecem este arquivo, que encaminha cada chamada para
 * supabaseService.js (login de verdade e dados no Postgres). Trocar de
 * backend no futuro significa mexer só aqui, sem tocar nas telas.
 */

import * as real from './supabaseService';

const route =
  (name) =>
  (...args) =>
    real[name](...args);

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
export const reopenPayment = route('reopenPayment');

/* ---------------- Administração ---------------- */

export const getPendingUsers = route('getPendingUsers');
export const approveUser = route('approveUser');
export const rejectUser = route('rejectUser');
export const removeUser = route('removeUser');

/* ---------------- Perfil ---------------- */

export const uploadAvatar = route('uploadAvatar');
export const updateUser = route('updateUser');
