/**
 * Edge Function "notificar": envia as notificações no celular (Web Push).
 *
 * O app chama depois de uma ação: { tipo, id, extra }.
 *   despesa      nova despesa             -> quem participa ou pagou (menos o autor)
 *   edicao       despesa editada          -> quem participa ou pagou (menos quem editou)
 *   pagamento    pagamento registrado     -> pendente: quem recebe; já confirmado: quem pagou
 *   confirmacao  pagamento confirmado     -> quem pagou
 *   recusa       pagamento recusado ou cancelado (extra traz from/to/amount, já foi apagado) -> o outro lado
 *   teste        aviso de teste           -> a própria pessoa
 *
 * Cada pessoa escolhe o que recebe (profiles.notify_prefs): chave geral, um
 * interruptor por tipo e silêncio à noite (horário de Brasília). As chaves
 * VAPID ficam no Vault e são lidas por get_push_config (só service_role).
 *
 * Deploy com verify_jwt = false: o token do usuário é conferido aqui dentro.
 * Para testes pelo banco (pg_net), o header x-racha-teste com a chave do Vault
 * permite agir "como" um usuário (campo como no corpo).
 */
import { createClient } from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};
const responder = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } });

const SITE = 'https://pedro-alvarez.github.io/racha/';
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const reais = (c: number) => brl.format(Math.abs(c) / 100);
const primeiro = (nome?: string) => (nome ?? 'Alguém').split(' ')[0];

type Prefs = {
  ativo?: boolean; despesas?: boolean; edicoes?: boolean; pagamentos?: boolean; confirmacoes?: boolean;
  silencio?: boolean; silencio_inicio?: number; silencio_fim?: number;
};
type Aviso = { para: string; categoria: keyof Prefs | 'teste'; title: string; body: string; url: string; tag: string };

/** parte de cada um numa despesa (mesma regra do app: ordem pelo id, centavos para os primeiros) */
function partes(amount: number, tipo: string, linhas: { user_id: string; share: number | null }[]) {
  const ps = [...linhas].sort((a, b) => (a.user_id < b.user_id ? -1 : a.user_id > b.user_id ? 1 : 0));
  const r: Record<string, number> = {};
  if (ps.length === 0) return r;
  if (tipo === 'fixed') {
    for (const p of ps) r[p.user_id] = Math.round(Number(p.share ?? 0));
    return r;
  }
  if (tipo === 'percent') {
    const exato = ps.map((p) => (amount * Number(p.share ?? 0)) / 100);
    const pisos = exato.map((v) => Math.floor(v + 1e-9));
    let sobra = amount - pisos.reduce((s, v) => s + v, 0);
    const ordem = exato.map((v, i) => ({ i, f: v - pisos[i] })).sort((a, b) => b.f - a.f || a.i - b.i);
    for (let k = 0; sobra > 0; k++, sobra--) pisos[ordem[k % ordem.length].i] += 1;
    ps.forEach((p, i) => (r[p.user_id] = pisos[i]));
    return r;
  }
  const base = Math.floor(amount / ps.length);
  let resto = amount - base * ps.length;
  for (const p of ps) {
    r[p.user_id] = base + (resto > 0 ? 1 : 0);
    if (resto > 0) resto--;
  }
  return r;
}

function emSilencio(p: Prefs) {
  if (!p.silencio) return false;
  const h = Number(new Intl.DateTimeFormat('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone: 'America/Sao_Paulo' }).format(new Date()));
  const ini = p.silencio_inicio ?? 23;
  const fim = p.silencio_fim ?? 8;
  return ini > fim ? h >= ini || h < fim : h >= ini && h < fim;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return responder(405, { error: 'Método não permitido.' });

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false },
  });
  const { data: cfg, error: cfgErro } = await admin.rpc('get_push_config');
  if (cfgErro || !cfg?.private) return responder(500, { error: 'Notificações não configuradas.' });

  let corpo: { tipo?: string; id?: string; extra?: Record<string, unknown>; como?: string };
  try {
    corpo = await req.json();
  } catch {
    return responder(400, { error: 'Dados inválidos.' });
  }

  // quem está chamando: token do app, ou teste pelo banco
  let eu: string | null = null;
  if (cfg.teste && req.headers.get('x-racha-teste') === cfg.teste && typeof corpo.como === 'string') {
    eu = corpo.como;
  } else {
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
    const { data } = await admin.auth.getUser(token);
    eu = data.user?.id ?? null;
  }
  if (!eu) return responder(401, { error: 'Entre na sua conta.' });

  const { tipo, id, extra = {} } = corpo;
  const { data: perfis } = await admin.from('profiles').select('id, name, role, notify_prefs');
  const perfil = new Map((perfis ?? []).map((p) => [p.id, p]));
  const nome = (uid: string) => primeiro(perfil.get(uid)?.name);
  const souAdmin = perfil.get(eu)?.role === 'admin';
  const avisos: Aviso[] = [];

  if (tipo === 'teste') {
    avisos.push({
      para: eu, categoria: 'teste', title: 'Notificações do Racha ativadas ✓',
      body: 'É assim que os avisos vão chegar.', url: SITE, tag: 'teste',
    });
  } else if (tipo === 'despesa' || tipo === 'edicao') {
    const { data: e } = await admin
      .from('expenses')
      .select('id, trip_id, description, amount, paid_by, created_by, split_type, trips(name), expense_participants(user_id, share)')
      .eq('id', id)
      .single();
    if (!e) return responder(404, { error: 'Despesa não encontrada.' });
    if (e.created_by !== eu && !souAdmin) return responder(403, { error: 'Sem permissão.' });
    const p = partes(e.amount, e.split_type, e.expense_participants ?? []);
    const viagem = (e.trips as { name?: string } | null)?.name ?? '';
    const alvo = new Set([...Object.keys(p), e.paid_by]);
    alvo.delete(eu);
    for (const uid of alvo) {
      const minha = p[uid];
      const corpoTxt =
        minha != null
          ? `${tipo === 'edicao' ? 'Sua parte agora' : 'Sua parte'}: ${reais(minha)}${uid === e.paid_by ? ' (você pagou)' : ''} · ${viagem}`
          : `Você pagou ${reais(e.amount)} · ${viagem}`;
      avisos.push({
        para: uid,
        categoria: tipo === 'edicao' ? 'edicoes' : 'despesas',
        title: `${nome(eu)} ${tipo === 'edicao' ? 'editou' : 'lançou'} ${e.description}`,
        body: corpoTxt,
        url: `${SITE}#/despesas`,
        tag: `despesa-${e.id}`,
      });
    }
  } else if (tipo === 'pagamento' || tipo === 'confirmacao') {
    const { data: p } = await admin
      .from('payments')
      .select('id, trip_id, from_user, to_user, amount, status, trips(name)')
      .eq('id', id)
      .single();
    if (!p) return responder(404, { error: 'Pagamento não encontrado.' });
    if (![p.from_user, p.to_user].includes(eu) && !souAdmin) return responder(403, { error: 'Sem permissão.' });
    const viagem = (p.trips as { name?: string } | null)?.name ?? '';
    const url = `${SITE}#/viagem/${p.trip_id}/acertar`;
    if (tipo === 'pagamento' && p.status === 'pending') {
      avisos.push({
        para: p.to_user, categoria: 'pagamentos', title: `${nome(p.from_user)} diz que te pagou ${reais(p.amount)}`,
        body: `Toque para conferir e confirmar · ${viagem}`, url, tag: `pagamento-${p.id}`,
      });
    } else {
      // confirmado: avisa quem pagou (quem recebeu registrou ou confirmou)
      avisos.push({
        para: p.from_user, categoria: 'confirmacoes',
        title: tipo === 'confirmacao' ? `${nome(p.to_user)} confirmou seu pagamento` : `${nome(p.to_user)} registrou que recebeu de você`,
        body: `${reais(p.amount)} · ${viagem}`, url, tag: `pagamento-${p.id}`,
      });
    }
  } else if (tipo === 'recusa') {
    const de = String(extra.from ?? '');
    const para = String(extra.to ?? '');
    const valor = Number(extra.amount ?? 0);
    if (![de, para].includes(eu)) return responder(403, { error: 'Sem permissão.' });
    const recebedorRecusou = eu === para;
    avisos.push({
      para: recebedorRecusou ? de : para,
      categoria: 'confirmacoes',
      title: recebedorRecusou ? `${nome(para)} recusou seu pagamento` : `${nome(de)} cancelou o pagamento`,
      body: `${reais(valor)}${recebedorRecusou ? ' · confira e registre de novo se precisar' : ''}`,
      url: extra.tripId ? `${SITE}#/viagem/${extra.tripId}/acertar` : SITE,
      tag: `recusa-${id}`,
    });
  } else {
    return responder(400, { error: 'Tipo desconhecido.' });
  }

  // filtra pelas preferências de cada um
  const enviar = avisos.filter((a) => {
    if (a.categoria === 'teste') return true;
    const prefs: Prefs = perfil.get(a.para)?.notify_prefs ?? {};
    if (prefs.ativo === false) return false;
    if (prefs[a.categoria as keyof Prefs] === false) return false;
    return !emSilencio(prefs);
  });
  if (enviar.length === 0) return responder(200, { enviados: 0 });

  webpush.setVapidDetails(SITE, cfg.public, cfg.private);
  const { data: aparelhos } = await admin
    .from('push_subscriptions')
    .select('id, user_id, endpoint, p256dh, auth')
    .in('user_id', [...new Set(enviar.map((a) => a.para))]);

  let enviados = 0;
  const falhas: string[] = [];
  await Promise.all(
    enviar.flatMap((a) =>
      (aparelhos ?? [])
        .filter((s) => s.user_id === a.para)
        .map(async (s) => {
          try {
            await webpush.sendNotification(
              { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
              JSON.stringify({ title: a.title, body: a.body, url: a.url, tag: a.tag }),
              { TTL: 60 * 60 * 24, urgency: 'high' },
            );
            enviados++;
          } catch (err) {
            const status = (err as { statusCode?: number }).statusCode;
            // aparelho que desativou ou trocou de navegador: some da lista
            if (status === 404 || status === 410) await admin.from('push_subscriptions').delete().eq('id', s.id);
            falhas.push(`${status ?? ''} ${(err as Error).message}`.trim());
          }
        }),
    ),
  );
  return responder(200, { enviados, falhas });
});
