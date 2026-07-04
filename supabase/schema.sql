-- ============================================================
-- Racha. — schema do banco (Supabase / Postgres)
-- Cole este arquivo inteiro no painel do Supabase:
--   SQL Editor → New query → colar → Run
-- Valores monetários em CENTAVOS (inteiros), como no app.
-- ============================================================

-- ---------- PERFIS ----------
-- Cada usuário logado tem um perfil (mesmo id do auth).
-- Amigos convidados que ainda não têm conta também viram perfis
-- (criados pelo app, sem login vinculado).
create table public.profiles (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text,
  color      text not null default '#F0146B',
  photo      text,
  pix_type   text,
  pix_key    text,
  created_at timestamptz not null default now()
);

-- Cria o perfil automaticamente quando alguém se cadastra
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- AMIZADES ----------
create table public.friends (
  user_id    uuid not null references public.profiles (id) on delete cascade,
  friend_id  uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id)
);

-- ---------- VIAGENS / ROLÊS ----------
create table public.trips (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  emoji      text not null default '✈️',
  type       text not null default 'viagem',
  start_date date,
  end_date   date,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.trip_members (
  trip_id    uuid not null references public.trips (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (trip_id, user_id)
);

-- ---------- DESPESAS ----------
create table public.expenses (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references public.trips (id) on delete cascade,
  description text not null,
  category    text not null default 'outros',
  amount      integer not null check (amount > 0),          -- centavos
  paid_by     uuid not null references public.profiles (id),
  split_type  text not null default 'equal'
              check (split_type in ('equal', 'fixed', 'percent')),
  created_at  timestamptz not null default now()
);

-- Quem participa de cada despesa.
-- share: null p/ divisão igual; centavos p/ 'fixed'; percentual p/ 'percent'.
create table public.expense_participants (
  expense_id uuid not null references public.expenses (id) on delete cascade,
  user_id    uuid not null references public.profiles (id) on delete cascade,
  share      integer,
  primary key (expense_id, user_id)
);

-- ---------- ACERTOS / PAGAMENTOS ----------
create table public.payments (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references public.trips (id) on delete cascade,
  from_user  uuid not null references public.profiles (id),
  to_user    uuid not null references public.profiles (id),
  amount     integer not null check (amount > 0),           -- centavos
  note       text not null default '',
  created_at timestamptz not null default now()
);

-- ============================================================
-- SEGURANÇA (Row Level Security)
-- Regra geral: você só enxerga viagens das quais é membro,
-- e as despesas/acertos/perfis ligados a elas.
-- ============================================================

alter table public.profiles             enable row level security;
alter table public.friends              enable row level security;
alter table public.trips                enable row level security;
alter table public.trip_members         enable row level security;
alter table public.expenses             enable row level security;
alter table public.expense_participants enable row level security;
alter table public.payments             enable row level security;

-- Função auxiliar (security definer evita recursão nas policies)
create or replace function public.is_trip_member(p_trip_id uuid)
returns boolean
language sql security definer set search_path = public stable
as $$
  select exists (
    select 1 from trip_members
    where trip_id = p_trip_id and user_id = auth.uid()
  );
$$;

-- Perfis: todo usuário logado pode ler (necessário p/ montar grupos);
-- cada um só edita o próprio; qualquer logado pode criar perfil de amigo.
create policy "profiles_select" on public.profiles
  for select to authenticated using (true);
create policy "profiles_insert" on public.profiles
  for insert to authenticated with check (true);
create policy "profiles_update_own" on public.profiles
  for update to authenticated using (id = auth.uid());

-- Amizades: cada um gerencia a própria lista
create policy "friends_select" on public.friends
  for select to authenticated using (user_id = auth.uid());
create policy "friends_insert" on public.friends
  for insert to authenticated with check (user_id = auth.uid());
create policy "friends_delete" on public.friends
  for delete to authenticated using (user_id = auth.uid());

-- Viagens: membros leem; qualquer logado cria; criador edita/apaga
create policy "trips_select" on public.trips
  for select to authenticated using (public.is_trip_member(id) or created_by = auth.uid());
create policy "trips_insert" on public.trips
  for insert to authenticated with check (created_by = auth.uid());
create policy "trips_update" on public.trips
  for update to authenticated using (created_by = auth.uid());
create policy "trips_delete" on public.trips
  for delete to authenticated using (created_by = auth.uid());

-- Membros: membros da viagem leem; o criador da viagem adiciona
create policy "trip_members_select" on public.trip_members
  for select to authenticated
  using (public.is_trip_member(trip_id) or user_id = auth.uid());
create policy "trip_members_insert" on public.trip_members
  for insert to authenticated
  with check (exists (select 1 from trips t where t.id = trip_id and t.created_by = auth.uid()));

-- Despesas: membros da viagem leem e criam
create policy "expenses_select" on public.expenses
  for select to authenticated using (public.is_trip_member(trip_id));
create policy "expenses_insert" on public.expenses
  for insert to authenticated with check (public.is_trip_member(trip_id));

create policy "expense_participants_select" on public.expense_participants
  for select to authenticated
  using (exists (select 1 from expenses e where e.id = expense_id and public.is_trip_member(e.trip_id)));
create policy "expense_participants_insert" on public.expense_participants
  for insert to authenticated
  with check (exists (select 1 from expenses e where e.id = expense_id and public.is_trip_member(e.trip_id)));

-- Acertos: membros da viagem leem e registram
create policy "payments_select" on public.payments
  for select to authenticated using (public.is_trip_member(trip_id));
create policy "payments_insert" on public.payments
  for insert to authenticated with check (public.is_trip_member(trip_id));
