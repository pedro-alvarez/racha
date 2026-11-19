/**
 * Edge Function "criar-conta": cadastro aberto pela tela inicial, sem e-mail.
 *
 * Cria o login já confirmado (admin API), então a pessoa entra na hora com
 * a senha que escolheu. Depois do login, o app chama complete_onboarding, que
 * cria o perfil com approved = false: ela fica na tela de espera até o admin
 * aprovar.
 *
 * Quem foi convidado e nunca abriu o link do e-mail já tem um login pendente;
 * nesse caso o login é reaproveitado (senha + nome) em vez de duplicado.
 * Contas já confirmadas ou já usadas nunca são alteradas aqui.
 *
 * Deploy com verify_jwt = false: a chave publishable do app não é um JWT.
 */
import { createClient } from 'npm:@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const responder = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const erro = (mensagem: string, status = 400) => responder(status, { error: mensagem });

const EMAIL_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return erro('Método não permitido.', 405);

  let dados: { name?: unknown; email?: unknown; password?: unknown };
  try {
    dados = await req.json();
  } catch {
    return erro('Dados inválidos.');
  }

  const name = typeof dados.name === 'string' ? dados.name.trim() : '';
  const email = typeof dados.email === 'string' ? dados.email.trim().toLowerCase() : '';
  const password = typeof dados.password === 'string' ? dados.password : '';

  if (name.length < 2 || name.length > 60) return erro('Digite seu nome.');
  if (!EMAIL_VALIDO.test(email)) return erro('Digite um e-mail válido.');
  if (password.length < 6) return erro('A senha precisa ter pelo menos 6 caracteres.');

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { error: criarErro } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { name },
  });
  if (!criarErro) return responder(200, { ok: true });

  if (criarErro.code === 'weak_password') return erro('Senha fraca. Use pelo menos 6 caracteres, misturando letras e números.');
  if (criarErro.code !== 'email_exists') {
    console.error('createUser', criarErro);
    return erro('Não foi possível criar a conta agora. Tente de novo em instantes.', 500);
  }

  // E-mail já existe: só reaproveita o login pendente de um convite nunca aceito.
  const { data: lista, error: listarErro } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listarErro) {
    console.error('listUsers', listarErro);
    return erro('Não foi possível criar a conta agora. Tente de novo em instantes.', 500);
  }
  const existente = lista.users.find((u) => u.email?.toLowerCase() === email);
  if (!existente || existente.email_confirmed_at || existente.last_sign_in_at) {
    return erro('Este e-mail já tem cadastro. Faça login.', 409);
  }

  const { error: atualizarErro } = await admin.auth.admin.updateUserById(existente.id, {
    password,
    email_confirm: true,
    user_metadata: { ...existente.user_metadata, name },
  });
  if (atualizarErro) {
    console.error('updateUserById', atualizarErro);
    return erro('Não foi possível criar a conta agora. Tente de novo em instantes.', 500);
  }
  // o perfil foi criado pelo gatilho com o começo do e-mail como nome
  await admin.from('profiles').update({ name }).eq('id', existente.id);

  return responder(200, { ok: true });
});
