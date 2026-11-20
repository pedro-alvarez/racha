-- ============================================================
-- upgrade-v10: notificações no celular (Web Push).
-- Guarda os aparelhos que ativaram as notificações e as
-- preferências de cada pessoa. Quem envia é a Edge Function
-- "notificar", com as chaves VAPID nos secrets do Supabase.
-- Rode no SQL Editor do Supabase.
-- ============================================================

-- um registro por aparelho/navegador que ativou as notificações
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists push_subscriptions_user_idx on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

drop policy if exists push_subscriptions_select on public.push_subscriptions;
create policy push_subscriptions_select on public.push_subscriptions for select to authenticated
  using (user_id = auth.uid());
drop policy if exists push_subscriptions_insert on public.push_subscriptions;
create policy push_subscriptions_insert on public.push_subscriptions for insert to authenticated
  with check (user_id = auth.uid());
drop policy if exists push_subscriptions_update on public.push_subscriptions;
create policy push_subscriptions_update on public.push_subscriptions for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists push_subscriptions_delete on public.push_subscriptions;
create policy push_subscriptions_delete on public.push_subscriptions for delete to authenticated
  using (user_id = auth.uid());

-- preferências: chave geral, um interruptor por tipo de aviso e o silêncio à noite
alter table public.profiles
  add column if not exists notify_prefs jsonb not null default
  '{"ativo": true, "despesas": true, "edicoes": true, "pagamentos": true, "confirmacoes": true, "silencio": false, "silencio_inicio": 23, "silencio_fim": 8}'::jsonb;

-- para chamar funções HTTP a partir do banco (testes e avisos futuros)
create extension if not exists pg_net;
