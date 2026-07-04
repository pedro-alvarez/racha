-- ============================================================
-- Racha. — atualização v2
-- Roda DEPOIS do schema.sql, no SQL Editor do Supabase.
-- Novidades:
--   1. Aprovação de cadastros (admin aprova cada conta nova)
--   2. Eventos abertos (qualquer usuário aprovado pode entrar)
--   3. Storage para fotos de perfil (bucket "avatars")
-- ============================================================

-- ---------- 1. PAPÉIS E APROVAÇÃO ----------

alter table public.profiles add column if not exists role text not null default 'member';
alter table public.profiles add column if not exists approved boolean not null default false;

-- Pedro é admin e já aprovado; perfis antigos criados antes desta versão
-- ficam aprovados para não travar ninguém que já estava usando.
update public.profiles set approved = true;
update public.profiles
  set role = 'admin'
  where email = 'pedro.a.certo@gmail.com';

-- Novos cadastros nascem pendentes (exceto o admin)
create or replace function public.handle_new_user()
returns trigger
language plpgsql security definer set search_path = public
as $$
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
  return new;
end;
$$;

-- Helpers
create or replace function public.is_admin()
returns boolean
language sql security definer set search_path = public stable
as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_approved()
returns boolean
language sql security definer set search_path = public stable
as $$
  select exists (select 1 from profiles where id = auth.uid() and (approved or role = 'admin'));
$$;

-- Ninguém (além do admin) muda o próprio role/approved
create or replace function public.protect_profile_flags()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    new.role := old.role;
    new.approved := old.approved;
  end if;
  return new;
end;
$$;

drop trigger if exists protect_profile_flags on public.profiles;
create trigger protect_profile_flags
  before update on public.profiles
  for each row execute function public.protect_profile_flags();

-- Policies de perfil atualizadas
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.is_approved());

drop policy if exists "profiles_update_own" on public.profiles;
drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles
  for update to authenticated
  using (id = auth.uid() or public.is_admin());

-- Admin pode recusar (apagar) cadastros pendentes
drop policy if exists "profiles_delete_admin" on public.profiles;
create policy "profiles_delete_admin" on public.profiles
  for delete to authenticated
  using (public.is_admin() and id <> auth.uid());

-- ---------- 2. EVENTOS ABERTOS ----------
-- Eventos (type = 'role') ficam visíveis para todo usuário aprovado,
-- que pode entrar sozinho. Viagens continuam privadas aos membros.

drop policy if exists "trips_select" on public.trips;
create policy "trips_select" on public.trips
  for select to authenticated
  using (
    public.is_trip_member(id)
    or created_by = auth.uid()
    or (type = 'role' and public.is_approved())
  );

drop policy if exists "trips_insert" on public.trips;
create policy "trips_insert" on public.trips
  for insert to authenticated
  with check (created_by = auth.uid() and public.is_approved());

drop policy if exists "trip_members_select" on public.trip_members;
create policy "trip_members_select" on public.trip_members
  for select to authenticated
  using (
    public.is_trip_member(trip_id)
    or user_id = auth.uid()
    or (public.is_approved()
        and exists (select 1 from trips t where t.id = trip_id and t.type = 'role'))
  );

drop policy if exists "trip_members_insert" on public.trip_members;
create policy "trip_members_insert" on public.trip_members
  for insert to authenticated
  with check (
    -- criador da viagem adiciona os membros…
    exists (select 1 from trips t where t.id = trip_id and t.created_by = auth.uid())
    -- …ou a própria pessoa entra num evento aberto
    or (
      user_id = auth.uid()
      and public.is_approved()
      and exists (select 1 from trips t where t.id = trip_id and t.type = 'role')
    )
  );

-- ---------- 3. FOTOS DE PERFIL (Storage) ----------

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars_read" on storage.objects;
create policy "avatars_read" on storage.objects
  for select using (bucket_id = 'avatars');

drop policy if exists "avatars_upload" on storage.objects;
create policy "avatars_upload" on storage.objects
  for insert to authenticated with check (bucket_id = 'avatars');

drop policy if exists "avatars_update" on storage.objects;
create policy "avatars_update" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and owner = auth.uid());
