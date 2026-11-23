/**
 * supabaseService.js - implementação REAL da camada de dados (Supabase).
 *
 * Autenticação real (e-mail/senha + link mágico) e dados salvos na nuvem
 * (Postgres com Row Level Security). Os componentes não importam este
 * arquivo direto: tudo passa por dataService.js.
 *
 * Convenções mantidas do app:
 * - valores monetários em CENTAVOS (inteiros)
 * - shapes camelCase (tripId, paidBy, startDate…) - a tradução de/para
 *   snake_case do banco acontece aqui dentro.
 */

import { supabase } from './supabaseClient';

/* ---------------- mapeadores banco → app ---------------- */

const mapProfile = (row) =>
  row && {
    id: row.id,
    name: row.name,
    email: row.email,
    color: row.color,
    photo: row.photo,
    role: row.role ?? 'member',
    approved: row.approved ?? false,
    pix: row.pix_key ? { type: row.pix_type, key: row.pix_key } : null,
    notifyPrefs: row.notify_prefs ?? null,
    tempPassword: row.temp_password ?? false,
  };

const mapTrip = (row) => ({
  id: row.id,
  name: row.name,
  emoji: row.emoji,
  type: row.type,
  description: row.description ?? '',
  startDate: row.start_date,
  endDate: row.end_date,
  startTime: row.start_time ?? '',
  createdBy: row.created_by,
  closedAt: row.closed_at ?? null,
  closedBy: row.closed_by ?? null,
  members: (row.trip_members ?? []).map((m) => m.user_id),
  createdAt: row.created_at,
});

const mapExpense = (row) => {
  // ordem fixa (pelo id): o centavo que sobra numa divisão vai para os
  // primeiros da lista, e o banco nem sempre devolve as linhas na mesma ordem.
  // Sem isso, dois celulares podiam calcular partes com 1 centavo de diferença.
  const parts = [...(row.expense_participants ?? [])].sort((a, b) => (a.user_id < b.user_id ? -1 : a.user_id > b.user_id ? 1 : 0));
  const expense = {
    id: row.id,
    tripId: row.trip_id,
    description: row.description,
    date: row.expense_date,
    category: row.category,
    amount: row.amount,
    paidBy: row.paid_by,
    createdBy: row.created_by ?? row.paid_by,
    splitType: row.split_type,
    note: row.note ?? '',
    receiptPath: row.receipt_path ?? null,
    noRanking: row.no_ranking ?? false,
    participants: parts.map((p) => p.user_id),
    createdAt: row.created_at,
  };
  if (row.split_type !== 'equal') {
    expense.shares = Object.fromEntries(parts.map((p) => [p.user_id, p.share ?? 0]));
  }
  return expense;
};

const mapPayment = (row) => ({
  id: row.id,
  tripId: row.trip_id,
  from: row.from_user,
  to: row.to_user,
  amount: row.amount,
  note: row.note,
  expenseIds: row.expense_ids ?? [],
  receiptPath: row.receipt_path ?? null,
  status: row.status ?? 'confirmed',
  createdAt: row.created_at,
});

/* traduz mensagens comuns do Supabase para PT-BR */
function friendlyError(error) {
  const msg = error?.message ?? 'Erro inesperado.';
  if (msg.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (msg.includes('Email not confirmed'))
    return 'E-mail ainda não confirmado. Confira sua caixa de entrada.';
  if (msg.includes('User already registered')) return 'Este e-mail já tem cadastro. Faça login.';
  if (msg.includes('Password should be at least'))
    return 'A senha precisa ter pelo menos 6 caracteres.';
  if (msg.includes('valid email')) return 'Digite um e-mail válido.';
  if (msg.includes('violates foreign key'))
    return 'Não dá pra remover: essa pessoa tem registros no app (despesas, viagens ou acertos).';
  if (msg.includes('rate limit')) return 'Limite de e-mails atingido. Tente de novo em uma hora.';
  if (msg === '{}' || msg.trim() === '' || msg.includes('Error sending'))
    return 'Não foi possível enviar o e-mail agora. Verifique a configuração de SMTP no Supabase.';
  return msg;
}

const fail = (error) => {
  throw new Error(friendlyError(error));
};

/* ------------------------------------------------------------------ */
/* Auth                                                                */
/* ------------------------------------------------------------------ */

export async function login(email, password) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) fail(error);
  return getCurrentUser();
}

/**
 * Cadastro aberto pela tela inicial, sem depender de e-mail: a Edge Function
 * "criar-conta" cria o login já confirmado e aqui a pessoa já entra. A conta
 * nasce sem aprovação, então ela vê a tela de espera até o admin liberar.
 */
export async function signUp(name, email, password) {
  const { error } = await supabase.functions.invoke('criar-conta', {
    body: { name, email, password },
  });
  if (error) {
    let message = '';
    try {
      message = (await error.context.json()).error;
    } catch {
      /* resposta sem corpo JSON */
    }
    throw new Error(message || 'Não foi possível criar a conta agora. Tente de novo em instantes.');
  }
  await login(email, password);
  // cria o perfil (ainda sem aprovação) e forma as amizades de convites pendentes
  const { error: rpcError } = await supabase.rpc('complete_onboarding', {
    p_name: name,
    p_photo: '',
    p_color: '',
  });
  if (rpcError) fail(rpcError);
  return getCurrentUser();
}

export async function logout() {
  await supabase.auth.signOut();
}

export async function getCurrentUser() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return null;
  const { data } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
  return (
    mapProfile(data) ?? {
      id: session.user.id,
      name: session.user.user_metadata?.name ?? session.user.email,
      email: session.user.email,
      color: '#F0146B',
      photo: null,
      role: 'member',
      approved: false,
      pix: null,
    }
  );
}

/** Notifica o app quando a sessão muda (login/logout em qualquer aba). */
export function onAuthChange(callback) {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(() => callback());
  return () => subscription.unsubscribe();
}

/* ---------------- Tempo real ---------------- */

// Canal de avisos entre os aparelhos (Supabase Realtime, broadcast): quem muda
// algo manda "mudou" e os outros recarregam. O aviso não leva dado nenhum; os
// dados continuam vindo do banco, protegidos pelo RLS.
let syncChannel = null;

/** Escuta os avisos de mudança dos outros aparelhos. Devolve a função para parar. */
export function onRemoteChange(callback) {
  const channel = supabase
    .channel('racha-sync', { config: { broadcast: { self: false } } })
    .on('broadcast', { event: 'mudou' }, () => callback())
    .subscribe();
  syncChannel = channel;
  return () => {
    if (syncChannel === channel) syncChannel = null;
    supabase.removeChannel(channel);
  };
}

/** Avisa os outros aparelhos que algo mudou (sem dados). */
export function notifyChange() {
  syncChannel?.send({ type: 'broadcast', event: 'mudou', payload: { em: Date.now() } }).catch(() => {});
}

/* ---------------- Usuários / Amigos ---------------- */

export async function getUsers() {
  const { data, error } = await supabase.from('profiles').select('*');
  if (error) fail(error);
  return data.map(mapProfile);
}

export async function getFriends() {
  const me = (await supabase.auth.getSession()).data.session?.user?.id;
  if (!me) return [];
  const { data, error } = await supabase
    .from('friends')
    .select('friend:profiles!friends_friend_id_fkey(*)')
    .eq('user_id', me);
  if (error) fail(error);
  return data.map((row) => mapProfile(row.friend)).filter(Boolean);
}

/**
 * Convida alguém por e-mail:
 * - se a pessoa JÁ tem conta no Racha → vira amizade na hora;
 * - se não tem → registra o convite e o Supabase envia um e-mail com link
 *   mágico; ao clicar, a conta é criada, a amizade se forma sozinha (trigger
 *   no banco) e ela cai na fila de aprovação do admin.
 * Retorna { status: 'friend' | 'invited', profile? }.
 */
export async function inviteFriend(email) {
  const me = (await supabase.auth.getSession()).data.session?.user?.id;

  // já é usuário? amizade direta.
  const { data: existing } = await supabase
    .from('profiles')
    .select('*')
    .eq('email', email)
    .maybeSingle();
  if (existing) {
    if (existing.id === me) throw new Error('Esse é o seu próprio e-mail 😅');
    const { error } = await supabase.from('friends').upsert({ user_id: me, friend_id: existing.id });
    if (error) fail(error);
    return { status: 'friend', profile: mapProfile(existing) };
  }

  // registra o convite (revogável na tela de Amigos)
  const { error: inviteError } = await supabase
    .from('invites')
    .upsert({ email, invited_by: me }, { onConflict: 'email,invited_by' });
  if (inviteError) fail(inviteError);

// dispara o e-mail com link mágico que cria a conta
  const { error: otpError } = await supabase.auth.signInWithOtp({
    email,
    options: {
      shouldCreateUser: true,
      emailRedirectTo: 'https://pedro-alvarez.github.io/racha/',
    },
  });
if (otpError) {
    // rollback: se o e-mail não saiu, não deixa convite pendente pra trás
    await supabase.from('invites').delete().eq('email', email).eq('invited_by', me);
    fail(otpError);
  }
  return { status: 'invited' };
}

/** Convites pendentes que eu enviei (ainda não aceitos). */
export async function getInvites() {
  const { data, error } = await supabase
    .from('invites')
    .select('*')
    .is('accepted_at', null)
    .order('created_at', { ascending: false });
  if (error) fail(error);
  return data.map((row) => ({
    id: row.id,
    email: row.email,
    invitedBy: row.invited_by,
    createdAt: row.created_at,
  }));
}

/** Revoga um convite pendente. */
export async function revokeInvite(inviteId) {
  // função do banco: apaga o convite e o login fantasma, se houver
  const { error } = await supabase.rpc('revoke_invite', { p_invite: inviteId });
  if (error) fail(error);
}

/* ---------------- Viagens ---------------- */

export async function getTrips() {
  const { data, error } = await supabase
    .from('trips')
    .select('*, trip_members(user_id)')
    .order('created_at', { ascending: false });
  if (error) fail(error);
  return data.map(mapTrip);
}

export async function getTrip(tripId) {
  const { data, error } = await supabase
    .from('trips')
    .select('*, trip_members(user_id)')
    .eq('id', tripId)
    .maybeSingle();
  if (error) fail(error);
  return data ? mapTrip(data) : null;
}

export async function createTrip({ name, emoji, type, startDate, endDate, startTime, description, members }) {
  const me = (await supabase.auth.getSession()).data.session?.user?.id;
  const { data: trip, error } = await supabase
    .from('trips')
    .insert({
      name,
      emoji: emoji || '✈️',
      type: type || 'viagem',
      description: description?.trim() || null,
      start_date: startDate || null,
      end_date: endDate || null,
      start_time: startTime || null,
      created_by: me,
    })
    .select()
    .single();
  if (error) fail(error);

  const uniqueMembers = [...new Set([me, ...members])];
  const { error: membersError } = await supabase
    .from('trip_members')
    .insert(uniqueMembers.map((userId) => ({ trip_id: trip.id, user_id: userId })));
  if (membersError) fail(membersError);

  return mapTrip({ ...trip, trip_members: uniqueMembers.map((id) => ({ user_id: id })) });
}

/* ---------------- Despesas ---------------- */

export async function getExpenses(tripId) {
  const { data, error } = await supabase
    .from('expenses')
    .select('*, expense_participants(user_id, share)')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: true });
  if (error) fail(error);
  return data.map(mapExpense);
}

/**
 * Edita uma despesa (só o criador ou o admin - o banco valida via RLS).
 * "changes" é a lista legível de alterações para o histórico:
 * [{ field: 'valor', old: 'R$ 100,00', new: 'R$ 120,00' }]
 */
export async function updateExpense(expenseId, expense, changes = []) {
  const me = (await supabase.auth.getSession()).data.session?.user?.id;

  const { error } = await supabase
    .from('expenses')
    .update({
      description: expense.description,
      expense_date: expense.date,
      category: expense.category ?? 'outros',
      amount: expense.amount,
      paid_by: expense.paidBy,
      split_type: expense.splitType ?? 'equal',
      note: expense.note ?? '',
      receipt_path: expense.receiptPath ?? null,
      no_ranking: Boolean(expense.noRanking),
    })
    .eq('id', expenseId);
  if (error) fail(error);

  // troca os participantes/partes (guardando os antigos para desfazer se der erro)
  const { data: oldRows } = await supabase
    .from('expense_participants')
    .select('expense_id, user_id, share')
    .eq('expense_id', expenseId);
  const { error: delError } = await supabase
    .from('expense_participants')
    .delete()
    .eq('expense_id', expenseId);
  if (delError) fail(delError);
  const rows = expense.participants.map((userId) => ({
    expense_id: expenseId,
    user_id: userId,
    share: expense.shares?.[userId] ?? null,
  }));
  const { error: insError } = await supabase.from('expense_participants').insert(rows);
  if (insError) {
    if (oldRows?.length) await supabase.from('expense_participants').insert(oldRows);
    fail(insError);
  }

  // registra o histórico
  if (changes.length > 0) {
    const { error: histError } = await supabase
      .from('expense_history')
      .insert({ expense_id: expenseId, edited_by: me, changes });
    if (histError) fail(histError);
  }
}

/** Exclui uma despesa (criador ou admin - RLS valida). */
export async function deleteExpense(expenseId) {
  const { error } = await supabase.from('expenses').delete().eq('id', expenseId);
  if (error) fail(error);
}

/** Histórico de alterações de uma despesa (mais recente primeiro). */
export async function getExpenseHistory(expenseId) {
  const { data, error } = await supabase
    .from('expense_history')
    .select('*, editor:profiles!expense_history_edited_by_fkey(name)')
    .eq('expense_id', expenseId)
    .order('created_at', { ascending: false });
  if (error) fail(error);
  return data.map((row) => ({
    id: row.id,
    editorName: row.editor?.name ?? 'Alguém',
    changes: row.changes ?? [],
    createdAt: row.created_at,
  }));
}

export async function addExpense(tripId, expense) {
  const { data: record, error } = await supabase
    .from('expenses')
    .insert({
      trip_id: tripId,
      description: expense.description,
      expense_date: expense.date,
      category: expense.category ?? 'outros',
      amount: expense.amount,
      paid_by: expense.paidBy,
      split_type: expense.splitType ?? 'equal',
      note: expense.note ?? '',
      receipt_path: expense.receiptPath ?? null,
      no_ranking: Boolean(expense.noRanking),
    })
    .select()
    .single();
  if (error) fail(error);

  const rows = expense.participants.map((userId) => ({
    expense_id: record.id,
    user_id: userId,
    share: expense.shares?.[userId] ?? null,
  }));
  const { error: partsError } = await supabase.from('expense_participants').insert(rows);
  if (partsError) {
    // não deixa uma despesa sem participantes para trás
    await supabase.from('expenses').delete().eq('id', record.id);
    fail(partsError);
  }

  return mapExpense({
    ...record,
    expense_participants: rows.map((r) => ({ user_id: r.user_id, share: r.share })),
  });
}

/* ---------------- Pagamentos / Acertos ---------------- */

export async function getPayments(tripId) {
  const { data, error } = await supabase
    .from('payments')
    .select('*')
    .eq('trip_id', tripId)
    .order('created_at', { ascending: true });
  if (error) fail(error);
  return data.map(mapPayment);
}

/** Registra um acerto: "from" pagou "amount" (centavos) para "to". */
export async function settleDebt(tripId, { from, to, amount, note, expenseIds = [], receiptPath = null }) {
  const me = (await supabase.auth.getSession()).data.session?.user?.id;
  // quem RECEBE registrando ("já recebi") confirma na hora;
  // quem PAGA registra como pendente e o recebedor precisa aceitar
  const status = me === to ? 'confirmed' : 'pending';
  const { data, error } = await supabase
    .from('payments')
    .insert({
      trip_id: tripId, from_user: from, to_user: to, amount, note: note ?? '', expense_ids: expenseIds, status,
      receipt_path: receiptPath,
    })
    .select()
    .single();
  if (error) fail(error);
  return mapPayment(data);
}

/** Quem recebeu confirma o pagamento (entra no saldo). */
export async function confirmPayment(paymentId) {
  const { error } = await supabase
    .from('payments')
    .update({ status: 'confirmed' })
    .eq('id', paymentId);
  if (error) fail(error);
}

/**
 * Desfaz a confirmação de um pagamento (quem recebeu ou o admin): ele volta
 * para "aguardando confirmação", onde dá para confirmar de novo ou recusar.
 */
export async function reopenPayment(paymentId) {
  const { data, error } = await supabase
    .from('payments')
    .update({ status: 'pending' })
    .eq('id', paymentId)
    .select('id');
  if (error) fail(error);
  // o RLS não dá erro quando bloqueia: só não atualiza nenhuma linha
  if (!data?.length) throw new Error('Só quem recebeu o pagamento ou o admin pode desfazer.');
}

/** Recusar (recebedor) ou cancelar (pagador) um pagamento pendente. */
export async function declinePayment(paymentId) {
  const { error } = await supabase.from('payments').delete().eq('id', paymentId);
  if (error) fail(error);
}

/** Apaga uma viagem/rolê (RLS: só o admin consegue). */
/** Adiciona membros a uma viagem/rolê existente (criador ou admin - RLS valida). */
export async function addTripMembers(tripId, userIds) {
  const { error } = await supabase
    .from('trip_members')
    .upsert(
      userIds.map((userId) => ({ trip_id: tripId, user_id: userId })),
      { onConflict: 'trip_id,user_id', ignoreDuplicates: true }
    );
  if (error) fail(error);
}

/**
 * Convidado que entrou pelo link mágico ainda não definiu nome/senha?
 * (Quem se cadastra normal tem "name" nos metadados; o convidado não.)
 */
export async function needsOnboarding() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) return false;
  return !session.user.user_metadata?.name;
}

/** Completa o cadastro do convidado: nome + senha (e foto opcional). */
export async function completeOnboarding({ name, password, photo, color }) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) throw new Error('Sessão expirada. Abra o link do e-mail de novo.');

  // 1º o banco: cria o perfil, aceita convites e forma as amizades
  const { error: rpcError } = await supabase.rpc('complete_onboarding', {
    p_name: name,
    p_photo: photo || '',
    p_color: color || '',
  });
  if (rpcError) fail(rpcError);

  // depois a senha + nome nos metadados (é isso que encerra o modo cadastro)
  const { error } = await supabase.auth.updateUser({ password, data: { name } });
  if (error) fail(error);
}

/** Edições de despesas feitas por uma pessoa (para o histórico do perfil). */
export async function getUserEdits(userId) {
  const { data, error } = await supabase
    .from('expense_history')
    .select('*, expense:expenses(description)')
    .eq('edited_by', userId)
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) fail(error);
  return data.map((row) => ({
    id: row.id,
    expenseDescription: row.expense?.description ?? 'despesa',
    changes: row.changes ?? [],
    createdAt: row.created_at,
  }));
}

/** Encerra (closed = true) ou reabre a viagem. Só quem criou ou o admin. */
export async function setTripClosed(tripId, closed) {
  const { error } = await supabase.rpc('set_trip_closed', { p_trip: tripId, p_closed: closed });
  if (error) fail(error);
}

export async function deleteTrip(tripId) {
  const { error } = await supabase.from('trips').delete().eq('id', tripId);
  if (error) fail(error);
}

/** Troca a senha do usuário logado. */
export async function changePassword(newPassword) {
  const { data, error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) fail(error);
  // criou a própria senha: sai do aviso de "senha provisória"
  if (data?.user?.id) await supabase.from('profiles').update({ temp_password: false }).eq('id', data.user.id);
}

/* ---------------- Esqueci minha senha (sem e-mail) ---------------- */

/** Pedido feito na tela de login: o admin recebe um aviso e cria uma senha provisória. */
export async function requestPasswordReset(email) {
  const { error } = await supabase.rpc('request_password_reset', { p_email: email });
  if (error) fail(error);
}

/** Pedidos de nova senha (só o admin vê). */
export async function getPasswordRequests() {
  const { data, error } = await supabase
    .from('password_requests')
    .select('user_id, requested_at')
    .order('requested_at', { ascending: false });
  if (error) fail(error);
  return data.map((r) => ({ userId: r.user_id, requestedAt: r.requested_at }));
}

/** Admin cria uma senha provisória para alguém; devolve a senha para mandar à pessoa. */
export async function adminTempPassword(userId) {
  const { data, error } = await supabase.rpc('admin_temp_password', { target: userId });
  if (error) fail(error);
  return data;
}

/* ---------------- Rolês abertos ---------------- */

/** Entra num rolê aberto (type = 'role') - vale como confirmação de presença. */
export async function joinTrip(tripId) {
  const me = (await supabase.auth.getSession()).data.session?.user?.id;
  const { error } = await supabase
    .from('trip_members')
    .upsert({ trip_id: tripId, user_id: me });
  if (error) fail(error);
}

/* ---------------- Aprovação de cadastros (admin) ---------------- */

export async function getPendingUsers() {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('approved', false)
    .order('created_at', { ascending: true });
  if (error) fail(error);
  return data.map(mapProfile);
}

export async function approveUser(userId) {
  const { error } = await supabase.from('profiles').update({ approved: true }).eq('id', userId);
  if (error) fail(error);
}

export async function rejectUser(userId) {
  // apaga perfil E conta de login (função com privilégio no banco valida se é admin)
  const { error } = await supabase.rpc('admin_delete_user', { target: userId });
  if (error) fail(error);
}

/** Remove alguém do app (admin). Mesmo efeito de recusar: apaga o perfil. */
export async function removeUser(userId) {
  return rejectUser(userId);
}

/* ---------------- Notificações no celular (Web Push) ---------------- */

// chave pública VAPID (a privada fica no Vault do Supabase, lida pela função "notificar")
const VAPID_PUBLIC = 'BHgg5mhdzYviUgr963vzbZ_vXNwCLSndHRxq81OMk7FMIa6TUuJVu1MLaywWsBag2LTeD9udoVI3-LFtr_b6FaI';
const SW_URL = `${import.meta.env.BASE_URL}sw.js`;

function base64UrlToBytes(b64) {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4);
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

/** O que este aparelho permite: suporte, se é iPhone, se está instalado e a permissão. */
export function pushSupport() {
  const ok = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
  const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const standalone = window.matchMedia?.('(display-mode: standalone)').matches || navigator.standalone === true;
  return { ok, ios, standalone, permission: 'Notification' in window ? Notification.permission : 'unsupported' };
}

/** Registra o service worker (só cuida das notificações). */
export async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return null;
  return navigator.serviceWorker.register(SW_URL);
}

/** A inscrição de notificação deste aparelho, se houver. */
export async function getPushSubscription() {
  if (!pushSupport().ok) return null;
  const reg = await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL);
  return reg ? reg.pushManager.getSubscription() : null;
}

/** Pede permissão, inscreve este aparelho e guarda no banco. */
export async function enablePush() {
  if (!pushSupport().ok) throw new Error('Este navegador não aceita notificações.');
  const perm = await Notification.requestPermission();
  if (perm !== 'granted') {
    throw new Error(
      perm === 'denied'
        ? 'As notificações estão bloqueadas para o Racha. Libere nas configurações do celular ou do navegador.'
        : 'Você não liberou as notificações.'
    );
  }
  const reg = (await registerServiceWorker()) ?? (await navigator.serviceWorker.ready);
  await navigator.serviceWorker.ready;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(VAPID_PUBLIC) }));
  const json = sub.toJSON();
  const me = (await supabase.auth.getSession()).data.session?.user?.id;
  const { error } = await supabase.from('push_subscriptions').upsert(
    { user_id: me, endpoint: json.endpoint, p256dh: json.keys.p256dh, auth: json.keys.auth, user_agent: navigator.userAgent.slice(0, 200) },
    { onConflict: 'endpoint' }
  );
  if (error) fail(error);
}

/** Desliga as notificações neste aparelho. */
export async function disablePush() {
  const sub = await getPushSubscription();
  if (!sub) return;
  await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
  await sub.unsubscribe();
}

/** Manda um aviso de teste para os aparelhos da própria pessoa. */
export async function sendTestPush() {
  const { data, error } = await supabase.functions.invoke('notificar', { body: { tipo: 'teste' } });
  if (error) fail(error);
  return data;
}

/* ---------------- Lembrete de pagamento ---------------- */

/** meia-noite de hoje no horário de Brasília (o limite é 1 lembrete por dia) */
function inicioDoDiaBrasilia() {
  const dia = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(new Date());
  return new Date(`${dia}T00:00:00-03:00`).toISOString();
}

/**
 * Lembra quem te deve, por notificação. O servidor confere a dívida, o limite
 * de 1 por dia e as preferências da pessoa, e devolve { enviados, motivo, mensagem }.
 */
export async function sendReminder(tripId, toUserId) {
  const { data, error } = await supabase.functions.invoke('notificar', {
    body: { tipo: 'lembrete', id: tripId, extra: { to: toUserId } },
  });
  if (error) throw new Error('Não deu para mandar o lembrete agora. Tente de novo.');
  return data;
}

/** Quem você já lembrou hoje nesta viagem (ids de quem deve). */
export async function getRemindersToday(tripId) {
  const me = (await supabase.auth.getSession()).data.session?.user?.id;
  if (!me) return [];
  const { data, error } = await supabase
    .from('payment_reminders')
    .select('to_user')
    .eq('trip_id', tripId)
    .eq('from_user', me)
    .gte('sent_at', inicioDoDiaBrasilia());
  if (error) return []; // sem a tabela ou sem internet: o botão aparece e o servidor decide
  return data.map((r) => r.to_user);
}

/** Avisa quem precisa saber de uma ação (em segundo plano: nunca trava o app). */
export function notify(tipo, id, extra = {}) {
  supabase.functions.invoke('notificar', { body: { tipo, id, extra } }).then(
    () => {},
    () => {}
  );
}

/* ---------------- Comprovantes de pagamento (Storage privado) ---------------- */

const RECEIPT_MAX = 10 * 1024 * 1024;

/** Reduz fotos grandes (prints de banco costumam ter vários MB) para JPEG de até 1800 px. */
async function shrinkImage(file) {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size < 1.5 * 1024 * 1024) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext('2d').drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.85));
    return blob && blob.size < file.size ? new File([blob], 'comprovante.jpg', { type: 'image/jpeg' }) : file;
  } catch {
    return file; // navegador sem suporte: sobe o original
  }
}

/** Sobe o comprovante em comprovantes/<viagem>/<arquivo> e devolve o caminho. */
export async function uploadReceipt(tripId, original) {
  const file = await shrinkImage(original);
  if (file.size > RECEIPT_MAX) throw new Error('O comprovante passa de 10 MB. Mande um print ou um PDF menor.');
  const ext = file.type === 'application/pdf' ? 'pdf' : (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${tripId}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('comprovantes').upload(path, file, { contentType: file.type || undefined });
  if (error) fail(error);
  return path;
}

/** Anexa um comprovante a um pagamento já registrado (quem pagou, quem recebeu ou o admin). */
export async function attachReceipt(paymentId, tripId, file) {
  const path = await uploadReceipt(tripId, file);
  const { data, error } = await supabase.rpc('set_payment_receipt', { p_payment: paymentId, p_path: path });
  if (error || !data) {
    await supabase.storage.from('comprovantes').remove([path]);
    if (error) fail(error);
    throw new Error('Só quem pagou, quem recebeu ou o admin pode anexar o comprovante.');
  }
}

/** Link temporário (1 h) para ver um comprovante: o bucket é privado. */
export async function getReceiptUrl(path) {
  const { data, error } = await supabase.storage.from('comprovantes').createSignedUrl(path, 60 * 60);
  if (error) fail(error);
  return data.signedUrl;
}

/* ---------------- Foto de perfil (Storage) ---------------- */

/** Sobe a foto de perfil e devolve a URL pública. */
export async function uploadAvatar(userId, file) {
  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const path = `${userId}/${Date.now()}.${ext}`;
  const { error } = await supabase.storage.from('avatars').upload(path, file, {
    cacheControl: '3600',
    upsert: true,
  });
  if (error) fail(error);
  const { data } = supabase.storage.from('avatars').getPublicUrl(path);
  return data.publicUrl;
}

/* ---------------- Perfil ---------------- */

/** Atualiza perfil (nome, foto, cor, chave Pix…). RLS garante: só o próprio. */
export async function updateUser(userId, patch) {
  const row = {};
  if ('name' in patch) row.name = patch.name;
  if ('photo' in patch) row.photo = patch.photo;
  if ('color' in patch) row.color = patch.color;
  if ('pix' in patch) {
    row.pix_type = patch.pix?.type ?? null;
    row.pix_key = patch.pix?.key ?? null;
  }
  if ('notifyPrefs' in patch) row.notify_prefs = patch.notifyPrefs;
  const { data, error } = await supabase
    .from('profiles')
    .update(row)
    .eq('id', userId)
    .select()
    .maybeSingle();
  if (error) fail(error);
  if (!data) throw new Error('Você não tem permissão para editar o perfil de outra pessoa.');
  return mapProfile(data);
}
