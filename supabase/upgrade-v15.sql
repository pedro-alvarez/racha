-- ============================================================
-- upgrade-v15: lembrete de pagamento.
-- Quem tem a receber pode lembrar quem deve, por notificação,
-- no máximo uma vez por dia (horário de Brasília) para cada pessoa
-- em cada viagem. Quem grava é a Edge Function "notificar"
-- (service role); cada um só lê os lembretes em que aparece.
-- Rode no SQL Editor do Supabase.
-- ============================================================
create table if not exists public.payment_reminders (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  from_user uuid not null references public.profiles(id) on delete cascade, -- quem cobra (tem a receber)
  to_user uuid not null references public.profiles(id) on delete cascade,   -- quem deve
  amount integer not null,
  sent_at timestamptz not null default now()
);
create index if not exists payment_reminders_lookup_idx
  on public.payment_reminders (trip_id, from_user, to_user, sent_at desc);

alter table public.payment_reminders enable row level security;

drop policy if exists payment_reminders_select on public.payment_reminders;
create policy payment_reminders_select on public.payment_reminders for select to authenticated
  using (auth.uid() in (from_user, to_user));
