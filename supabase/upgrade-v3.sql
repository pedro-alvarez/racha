-- ============================================================
-- Racha. — atualização v3
-- Roda DEPOIS do upgrade-v2.sql, no SQL Editor do Supabase.
-- Novidades:
--   1. Convites por e-mail (tabela + amizade automática ao aceitar)
--   2. Rolês com hora e descrição opcionais
--   3. Apagar viagem/rolê: só o admin
-- ============================================================

-- ---------- 1. CONVITES ----------

create table if not exists public.invites (
  id          uuid primary key default gen_random_uuid(),
  email       text not null,
  invited_by  uuid not null references public.profiles (id) on delete cascade,
  accepted_at timestamptz,
  created_at  timestamptz not null default now(),
  unique (email, invited_by)
);

alter table public.invites enable row level security;

drop policy if exists "invites_select" on public.invites;
create policy "invites_select" on public.invites
  for select to authenticated
  using (invited_by = auth.uid() or public.is_admin());

drop policy if exists "invites_insert" on public.invites;
create policy "invites_insert" on public.invites
  for insert to authenticated
  with check (invited_by = auth.uid() and public.is_approved());

drop policy if exists "invites_delete" on public.invites;
create policy "invites_delete" on public.invites
  for delete to authenticated
  using (invited_by = auth.uid() or public.is_admin());

-- Quando o convidado cria a conta: marca o convite como aceito e
-- cria a amizade nos dois sentidos, automaticamente.
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_inviter uuid;
begin
  insert into public.profiles (id, name, email, role, approved)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'name', split_part(new.email, '@', 1)),
    new.email,
    case when new.email = 'pedro.a.certo@gmail.com' then 'admin' else 'member' end,
    new.email = 'pedro.a.certo@gmail.com'
  )
  on conflict (id) do nothing;

  for v_inviter in
    select invited_by from public.invites
    where email = new.email and accepted_at is null
  loop
    insert into public.friends (user_id, friend_id)
    values (v_inviter, new.id), (new.id, v_inviter)
    on conflict do nothing;
  end loop;

  update public.invites set accepted_at = now()
  where email = new.email and accepted_at is null;

  return new;
end;
$$;

-- ---------- 2. HORA E DESCRIÇÃO ----------

alter table public.trips add column if not exists description text;
alter table public.trips add column if not exists start_time text; -- "HH:MM", opcional

-- ---------- 3. APAGAR: SÓ ADMIN ----------

drop policy if exists "trips_delete" on public.trips;
create policy "trips_delete" on public.trips
  for delete to authenticated
  using (public.is_admin());
