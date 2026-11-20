-- ============================================================
-- upgrade-v12: "Esqueci minha senha" sem depender de e-mail.
-- Quem esqueceu pede pela tela de login (request_password_reset);
-- o pedido aparece para o admin, que recebe um aviso no celular e
-- cria uma senha provisória (admin_temp_password). Quem entra com
-- ela vê um aviso para criar a própria senha (temp_password).
-- Rode no SQL Editor do Supabase (depois do v10 e do v11).
-- ============================================================

create table if not exists public.password_requests (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  requested_at timestamptz not null default now()
);
alter table public.password_requests enable row level security;
drop policy if exists password_requests_admin_select on public.password_requests;
create policy password_requests_admin_select on public.password_requests for select to authenticated
  using (public.is_admin());
drop policy if exists password_requests_admin_delete on public.password_requests;
create policy password_requests_admin_delete on public.password_requests for delete to authenticated
  using (public.is_admin());

alter table public.profiles add column if not exists temp_password boolean not null default false;

-- pedido feito na tela de login (sem estar logado). Nunca diz se o e-mail existe.
create or replace function public.request_password_reset(p_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  alvo uuid;
  recente boolean;
begin
  select id into alvo from auth.users where lower(email) = lower(trim(p_email)) limit 1;
  if alvo is null or not exists (select 1 from profiles where id = alvo) then
    return;
  end if;
  select requested_at > now() - interval '5 minutes' into recente from password_requests where user_id = alvo;
  insert into password_requests (user_id, requested_at) values (alvo, now())
    on conflict (user_id) do update set requested_at = excluded.requested_at;
  if coalesce(recente, false) then
    return; -- já avisou há pouco
  end if;
  -- avisa os admins no celular (função notificar, chamada interna)
  perform net.http_post(
    url := 'https://yxkmbimblfpgesujfwze.supabase.co/functions/v1/notificar',
    body := jsonb_build_object('tipo', 'pedido_senha', 'extra', jsonb_build_object('userId', alvo)),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-racha-teste', (select decrypted_secret from vault.decrypted_secrets where name = 'racha_teste_push')
    )
  );
exception when others then
  return; -- quem pediu nunca vê erro
end
$$;
revoke all on function public.request_password_reset(text) from public;
grant execute on function public.request_password_reset(text) to anon, authenticated;

-- senha provisória criada pelo admin: 8 letras/números fáceis de ditar
create or replace function public.admin_temp_password(target uuid)
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  senha text;
begin
  if not public.is_admin() then
    raise exception 'Apenas o admin pode criar senha provisória.';
  end if;
  if not exists (select 1 from auth.users where id = target) then
    raise exception 'Conta não encontrada.';
  end if;
  select string_agg(substr('abcdefghjkmnpqrstuvwxyz23456789', 1 + (get_byte(gen_random_bytes(1), 0) % 31), 1), '')
    into senha
    from generate_series(1, 8);
  update auth.users set encrypted_password = crypt(senha, gen_salt('bf')), updated_at = now() where id = target;
  update profiles set temp_password = true where id = target;
  delete from password_requests where user_id = target;
  return senha;
end
$$;
revoke all on function public.admin_temp_password(uuid) from public, anon;
grant execute on function public.admin_temp_password(uuid) to authenticated;
