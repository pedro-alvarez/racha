-- ============================================================
-- upgrade-v14: encerrar viagem + ranking.
-- trips.closed_at / closed_by: viagem encerrada (não recebe despesa nova;
-- os acertos continuam). expenses.no_ranking: despesa que não entra no
-- ranking (compra pessoal, presente), mas vale nas contas.
-- set_trip_closed: encerra/reabre (quem criou a viagem ou o admin).
-- Rode no SQL Editor do Supabase.
-- ============================================================
alter table public.trips add column if not exists closed_at timestamptz;
alter table public.trips add column if not exists closed_by uuid references public.profiles(id) on delete set null;
alter table public.expenses add column if not exists no_ranking boolean not null default false;

create or replace function public.set_trip_closed(p_trip uuid, p_closed boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from trips where id = p_trip and (created_by = auth.uid() or public.is_admin())) then
    raise exception 'Só quem criou a viagem ou o admin pode encerrar.';
  end if;
  update trips
     set closed_at = case when p_closed then now() else null end,
         closed_by = case when p_closed then auth.uid() else null end
   where id = p_trip;
end
$$;
revoke all on function public.set_trip_closed(uuid, boolean) from public, anon;
grant execute on function public.set_trip_closed(uuid, boolean) to authenticated;
