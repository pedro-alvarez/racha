-- ============================================================
-- upgrade-v4: editar/excluir despesas + histórico de alterações
-- Rode este arquivo inteiro no SQL Editor do Supabase.
-- ============================================================

-- 1. Quem criou a despesa (permissão de edição).
--    Para despesas antigas, assume que o criador foi quem pagou.
alter table public.expenses
  add column if not exists created_by uuid references public.profiles (id);
update public.expenses set created_by = paid_by where created_by is null;

-- Preenche automaticamente nas próximas despesas.
create or replace function public.set_expense_creator()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  new.created_by := coalesce(new.created_by, auth.uid());
  return new;
end $$;
drop trigger if exists trg_expense_creator on public.expenses;
create trigger trg_expense_creator before insert on public.expenses
  for each row execute function public.set_expense_creator();

-- 2. Criador ou admin podem editar/excluir a despesa.
drop policy if exists "expenses_update" on public.expenses;
create policy "expenses_update" on public.expenses
  for update to authenticated
  using (created_by = auth.uid() or public.is_admin());

drop policy if exists "expenses_delete" on public.expenses;
create policy "expenses_delete" on public.expenses
  for delete to authenticated
  using (created_by = auth.uid() or public.is_admin());

-- Editar a divisão = apagar e reinserir participantes.
drop policy if exists "expense_participants_delete" on public.expense_participants;
create policy "expense_participants_delete" on public.expense_participants
  for delete to authenticated
  using (exists (
    select 1 from public.expenses e
    where e.id = expense_id and (e.created_by = auth.uid() or public.is_admin())
  ));

-- 3. Histórico de alterações ("alterado X de A para B, em tal dia/hora").
create table if not exists public.expense_history (
  id         uuid primary key default gen_random_uuid(),
  expense_id uuid not null references public.expenses (id) on delete cascade,
  edited_by  uuid not null references public.profiles (id),
  changes    jsonb not null, -- [{ "field": "valor", "old": "R$ 100,00", "new": "R$ 120,00" }]
  created_at timestamptz not null default now()
);
alter table public.expense_history enable row level security;

drop policy if exists "expense_history_select" on public.expense_history;
create policy "expense_history_select" on public.expense_history
  for select to authenticated
  using (exists (
    select 1 from public.expenses e
    where e.id = expense_id and public.is_trip_member(e.trip_id)
  ));

drop policy if exists "expense_history_insert" on public.expense_history;
create policy "expense_history_insert" on public.expense_history
  for insert to authenticated
  with check (edited_by = auth.uid() and exists (
    select 1 from public.expenses e
    where e.id = expense_id and (e.created_by = auth.uid() or public.is_admin())
  ));
