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
  startDate: row.start_date,
  endDate: row.end_date,
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

export async function addFriend({ name, email }) {
  const me = (await supabase.auth.getSession()).data.session?.user?.id;
  const colors = ['#F0146B', '#8B5CF6', '#06B6D4', '#F59E0B', '#22C55E', '#3B82F6', '#EC4899'];
  const color = colors[Math.floor(Math.random() * colors.length)];

  // Reaproveita perfil existente com o mesmo e-mail (ex.: alguém já cadastrado)
  let profile = null;
  if (email) {
    const { data } = await supabase.from('profiles').select('*').eq('email', email).maybeSingle();
    profile = data;
  }
  if (!profile) {
    // perfil "convidado" (sem conta ainda): já nasce aprovado, pois não loga —
    // serve só para dividir despesas até a pessoa criar a conta de verdade
    const { data, error } = await supabase
      .from('profiles')
      .insert({ name, email, color, approved: true })
      .select()
      .single();
    if (error) fail(error);
    profile = data;
  }

  const { error: linkError } = await supabase
    .from('friends')
    .upsert({ user_id: me, friend_id: profile.id });
  if (linkError) fail(linkError);
  return mapProfile(profile);
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

export async function createTrip({ name, emoji, type, startDate, endDate, members }) {
  const me = (await supabase.auth.getSession()).data.session?.user?.id;
  const { data: trip, error } = await supabase
    .from('trips')
    .insert({
      name,
      emoji: emoji || '✈️',
      type: type || 'viagem',
      start_date: startDate || null,
      end_date: endDate || null,
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

/* ---------------- Eventos abertos ---------------- */

/** Entra num evento aberto (type = 'role'). */
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
