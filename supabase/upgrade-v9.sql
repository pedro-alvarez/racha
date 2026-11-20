-- ============================================================
-- upgrade-v9: comprovante de pagamento.
-- O comprovante (foto, print ou PDF) fica num bucket PRIVADO,
-- em comprovantes/<id da viagem>/<arquivo>, e só quem é da viagem
-- consegue ver. O pagamento guarda o caminho do arquivo.
-- Rode no SQL Editor do Supabase.
-- ============================================================
alter table public.payments add column if not exists receipt_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'comprovantes', 'comprovantes', false, 10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif', 'application/pdf']
)
on conflict (id) do update
  set public = false,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- id da viagem a partir do caminho "<trip_id>/<arquivo>" (null se não for um uuid)
create or replace function public.trip_from_path(p_name text)
returns uuid
language sql
immutable
as $$
  select case
    when split_part(p_name, '/', 1) ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
    then split_part(p_name, '/', 1)::uuid
  end
$$;

drop policy if exists comprovantes_read on storage.objects;
create policy comprovantes_read on storage.objects for select to authenticated
  using (bucket_id = 'comprovantes' and public.is_trip_member(public.trip_from_path(name)));

drop policy if exists comprovantes_upload on storage.objects;
create policy comprovantes_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'comprovantes' and public.is_trip_member(public.trip_from_path(name)));

drop policy if exists comprovantes_delete on storage.objects;
create policy comprovantes_delete on storage.objects for delete to authenticated
  using (bucket_id = 'comprovantes' and (owner = auth.uid() or public.is_admin()));

-- Anexar o comprovante depois de registrar o pagamento: quem pagou, quem
-- recebeu ou o admin. (A política de update de payments só libera quem recebe,
-- então quem pagou passa por esta função, que mexe só no comprovante.)
create or replace function public.set_payment_receipt(p_payment uuid, p_path text)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  ok boolean;
begin
  update payments
     set receipt_path = p_path
   where id = p_payment
     and (from_user = auth.uid() or to_user = auth.uid() or is_admin())
     and public.trip_from_path(p_path) = trip_id
  returning true into ok;
  return coalesce(ok, false);
end
$$;

revoke all on function public.set_payment_receipt(uuid, text) from public;
grant execute on function public.set_payment_receipt(uuid, text) to authenticated;
