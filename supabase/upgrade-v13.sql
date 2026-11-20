-- ============================================================
-- upgrade-v13: observação e nota fiscal/comprovante na despesa.
-- O arquivo vai para o mesmo bucket privado "comprovantes"
-- (comprovantes/<id da viagem>/...), visível só para quem é da viagem.
-- Rode no SQL Editor do Supabase.
-- ============================================================
alter table public.expenses add column if not exists note text not null default '';
alter table public.expenses add column if not exists receipt_path text;
