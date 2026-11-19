-- ============================================================
-- upgrade-v8: pagamento por despesa. Guarda quais despesas um
-- pagamento quita (vazio = pagamento do total ou de um valor livre).
-- Rode no SQL Editor do Supabase.
-- ============================================================
alter table public.payments add column if not exists expense_ids uuid[] not null default '{}';
