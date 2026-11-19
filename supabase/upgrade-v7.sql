-- ============================================================
-- upgrade-v7: data da despesa (quando aconteceu), obrigatória.
-- As despesas antigas recebem o dia em que foram registradas.
-- Rode no SQL Editor do Supabase.
-- ============================================================
alter table public.expenses add column if not exists expense_date date;
update public.expenses
  set expense_date = (created_at at time zone 'America/Sao_Paulo')::date
  where expense_date is null;
alter table public.expenses
  alter column expense_date set default ((now() at time zone 'America/Sao_Paulo')::date);
alter table public.expenses alter column expense_date set not null;
