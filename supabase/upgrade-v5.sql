-- ============================================================
-- upgrade-v5: admin também pode adicionar membros a
-- viagens/rolês já criados. Rode no SQL Editor do Supabase.
-- ============================================================
drop policy if exists "trip_members_insert" on public.trip_members;
create policy "trip_members_insert" on public.trip_members
  for insert to authenticated
  with check (
    -- criador da viagem ou admin adicionam membros…
    exists (select 1 from trips t where t.id = trip_id and t.created_by = auth.uid())
    or public.is_admin()
    -- …ou a própria pessoa entra num evento aberto
    or (
      user_id = auth.uid()
      and public.is_approved()
      and exists (select 1 from trips t where t.id = trip_id and t.type = 'role')
    )
  );
