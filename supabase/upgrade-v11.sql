-- ============================================================
-- upgrade-v11: chaves das notificações (Web Push) no Vault.
-- A Edge Function "notificar" lê as chaves por get_push_config,
-- que só o service_role pode chamar.
--
-- Gere um par de chaves VAPID (ex.: npx web-push generate-vapid-keys),
-- troque os textos abaixo e rode no SQL Editor do Supabase.
-- A chave PÚBLICA também vai em src/lib/supabaseService.js (VAPID_PUBLIC).
-- Nunca coloque a chave privada no código.
-- ============================================================
select vault.create_secret('<CHAVE_PUBLICA_VAPID>', 'vapid_public', 'Racha: chave pública VAPID (web push)');
select vault.create_secret('<CHAVE_PRIVADA_VAPID>', 'vapid_private', 'Racha: chave privada VAPID (web push)');
-- opcional: permite testar a função pelo banco (pg_net) com o header x-racha-teste
select vault.create_secret('<TEXTO_ALEATORIO>', 'racha_teste_push', 'Racha: chave para testar a função notificar pelo banco');

create or replace function public.get_push_config()
returns json
language sql
security definer
set search_path = public
as $$
  select json_build_object(
    'public', (select decrypted_secret from vault.decrypted_secrets where name = 'vapid_public'),
    'private', (select decrypted_secret from vault.decrypted_secrets where name = 'vapid_private'),
    'teste', (select decrypted_secret from vault.decrypted_secrets where name = 'racha_teste_push')
  );
$$;
revoke all on function public.get_push_config() from public, anon, authenticated;
grant execute on function public.get_push_config() to service_role;
