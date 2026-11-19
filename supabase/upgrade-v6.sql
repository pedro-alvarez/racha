-- ============================================================
-- upgrade-v6: a parte de cada participante aceita decimais.
-- Divisão por % pode ter casas decimais (ex.: 16,67%); valores
-- fixos continuam em centavos inteiros. Rode no SQL Editor do Supabase.
-- ============================================================
alter table public.expense_participants alter column share type numeric(12,2);
