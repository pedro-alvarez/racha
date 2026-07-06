/**
 * dataService.js — camada de acesso a dados (ÚNICO ponto de I/O do app).
 *
 * Agora conectado ao Supabase: autenticação real (e-mail/senha) e dados
 * salvos na nuvem (Postgres). As assinaturas continuam as mesmas do mock,
 * então nenhum componente precisou mudar — só este arquivo.
 *
 * Convenções mantidas do app:
 * - valores monetários em CENTAVOS (inteiros)
 * - shapes camelCase (tripId, paidBy, startDate…) — a tradução de/para
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
  members: (row.trip_members ?? []).map((m) => m.user_id),
  createdAt: row.created_at,
});

const mapExpense = (row) => {
  const parts = row.expense_participants ?? [];
  const expense = {
    id: row.id,
    tripId: row.trip_id,
    description: row.description,
    category: row.category,
    amount: row.amount,
    paidBy: row.paid_by,
    createdBy: row.created_by ?? row.paid_by,
    splitType: row.split_type,
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
  createdAt: row.created_at,
});

/* traduz mensagens comuns do Supabase para PT-BR */
function friendlyError(error) {
  const msg = error?.message ?? 'Erro inesperado.';
  if (msg.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.';
  if (msg.includes('Email not confirmed'))
    return 'E-mail ainda não confirmado — confira sua caixa de entrada.';
  if (msg.includes('User already registered')) return 'Este e-mail já tem cadastro. Faça login.';
  if (msg.includes('Password should be at least'))
    return 'A senha precisa ter pelo menos 6 caracteres.';
  if (msg.includes('valid email')) return 'Digite um e-mail válido.';
  if (msg.includes('violates foreign key'))
    return 'Não dá pra remover: essa pessoa tem registros no app (despesas, viagens ou acertos).';
  if (msg.includes('rate limit')) return 'Limite de e-mails atingido — tente de novo em ~1 hora.';
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

export async function signUp(name, email, password) {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } },
  });
  if (error) fail(error);
  // Se a confirmação por e-mail estiver ativa, ainda não há sessão.
  if (!data.session) return { needsConfirmation: true };
  return { user: await getCurrentUser() };
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
  const { error } = await supabase.from('invites').delete().eq('id', inviteId);
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
 * Edita uma despesa (só o criador ou o admin — o banco valida via RLS).
 * "changes" é a lista legível de alterações para o histórico:
 * [{ field: 'valor', old: 'R$ 100,00', new: 'R$ 120,00' }]
 */
export async function updateExpense(expenseId, expense, changes = []) {
  const me = (await supabase.auth.getSession()).data.session?.user?.id;

  const { error } = await supabase
    .from('expenses')
    .update({
      description: expense.description,
      category: expense.category ?? 'outros',
      amount: expense.amount,
      paid_by: expense.paidBy,
      split_type: expense.splitType ?? 'equal',
    })
    .eq('id', expenseId);
  if (error) fail(error);

  // troca os participantes/partes
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
  if (insError) fail(insError);

  // registra o histórico
  if (changes.length > 0) {
    const { error: histError } = await supabase
      .from('expense_history')
      .insert({ expense_id: expenseId, edited_by: me, changes });
    if (histError) fail(histError);
  }
}

/** Exclui uma despesa (criador ou admin — RLS valida). */
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
      category: expense.category ?? 'outros',
      amount: expense.amount,
      paid_by: expense.paidBy,
      split_type: expense.splitType ?? 'equal',
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
  if (partsError) fail(partsError);

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
export async function settleDebt(tripId, { from, to, amount, note }) {
  const { data, error } = await supabase
    .from('payments')
    .insert({ trip_id: tripId, from_user: from, to_user: to, amount, note: note ?? '' })
    .select()
    .single();
  if (error) fail(error);
  return mapPayment(data);
}

/** Apaga uma viagem/rolê (RLS: só o admin consegue). */
export async function deleteTrip(tripId) {
  const { error } = await supabase.from('trips').delete().eq('id', tripId);
  if (error) fail(error);
}

/** Troca a senha do usuário logado. */
export async function changePassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) fail(error);
}

/* ---------------- Rolês abertos ---------------- */

/** Entra num rolê aberto (type = 'role') — vale como confirmação de presença. */
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
  const { error } = await supabase.from('profiles').delete().eq('id', userId);
  if (error) fail(error);
}

/** Remove alguém do app (admin). Mesmo efeito de recusar: apaga o perfil. */
export async function removeUser(userId) {
  return rejectUser(userId);
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
