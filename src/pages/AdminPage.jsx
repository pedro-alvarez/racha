/**
 * Painel do administrador - só o admin acessa.
 * - Aprovações pendentes (aprovar / recusar cadastros)
 * - Membros do app (com remoção)
 * - Todos os convites enviados (de qualquer pessoa), revogáveis
 * - Pedidos de "esqueci minha senha" e senha provisória para qualquer membro
 */
import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Check,
  Clock,
  Copy,
  KeyRound,
  MessageCircle,
  Mail,
  ShieldCheck,
  Trash2,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import * as dataService from '../lib/dataService';
import { useApp } from '../context/AppContext';
import { formatRelative } from '../lib/format';
import Avatar from '../components/Avatar';

function Stat({ Icon, label, value }) {
  return (
    <div className="card-flat p-4 flex-1 text-center">
      <Icon size={17} className="mx-auto text-accent-bright" />
      <p className="mt-1.5 text-xl font-extrabold">{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-widest text-muted">{label}</p>
    </div>
  );
}

export default function AdminPage() {
  const { currentUser, users, userById, refreshAll } = useApp();
  const navigate = useNavigate();

  const [pending, setPending] = useState([]);
  const [invites, setInvites] = useState([]);
  const [resets, setResets] = useState([]);
  const [tempPass, setTempPass] = useState(null); // { user, senha }
  const [copied, setCopied] = useState(false);
  const [acting, setActing] = useState(null);
  const [error, setError] = useState('');

  const isAdmin = currentUser?.role === 'admin';

  useEffect(() => {
    if (!isAdmin) return;
    dataService.getPendingUsers().then(setPending).catch(() => setPending([]));
    dataService.getInvites().then(setInvites).catch(() => setInvites([]));
    dataService.getPasswordRequests().then(setResets).catch(() => setResets([]));
  }, [isAdmin]);

  if (!isAdmin) return <Navigate to="/" replace />;

  const members = users.filter((u) => u.approved);

  const run = async (id, fn) => {
    setActing(id);
    setError('');
    try {
      await fn();
    } catch (err) {
      setError(err.message);
    } finally {
      setActing(null);
    }
  };

  const approve = (p) =>
    run(p.id, async () => {
      await dataService.approveUser(p.id);
      setPending((prev) => prev.filter((x) => x.id !== p.id));
      await refreshAll();
    });

  const reject = (p) =>
    run(p.id, async () => {
      if (!confirm(`Recusar o cadastro de ${p.name}?`)) return;
      await dataService.rejectUser(p.id);
      setPending((prev) => prev.filter((x) => x.id !== p.id));
    });

  const remove = (u) =>
    run(u.id, async () => {
      if (!confirm(`Remover ${u.name} do app? A pessoa perde o acesso e sai da sua lista de membros.`)) return;
      await dataService.removeUser(u.id);
      await refreshAll();
    });

  // senha provisória: a atual deixa de valer; a pessoa troca em Conta → Segurança
  const makeTempPassword = (u) =>
    run(u.id, async () => {
      if (!confirm(`Criar uma senha provisória para ${u.name}? A senha atual deixa de funcionar.`)) return;
      const senha = await dataService.adminTempPassword(u.id);
      setResets((prev) => prev.filter((r) => r.userId !== u.id));
      setCopied(false);
      setTempPass({ user: u, senha });
    });

  const site = `${window.location.origin}${import.meta.env.BASE_URL}`;
  const whatsText = tempPass
    ? `Oi ${tempPass.user.name.split(' ')[0]}! Sua senha provisória do Racha é: ${tempPass.senha}\nEntre em ${site} e crie a sua em Conta → Segurança.`
    : '';
  const copyTemp = async () => {
    try {
      await navigator.clipboard.writeText(tempPass.senha);
      setCopied(true);
    } catch {
      /* sem área de transferência */
    }
  };

  const revoke = (inv) =>
    run(inv.id, async () => {
      if (!confirm(`Revogar o convite de ${inv.email}?`)) return;
      await dataService.revokeInvite(inv.id);
      setInvites((prev) => prev.filter((x) => x.id !== inv.id));
    });

  return (
    <div className="pt-4 md:pt-0">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted hover:text-white">
        <ArrowLeft size={16} /> Voltar
      </button>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight flex items-center gap-2.5">
        <ShieldCheck size={26} className="text-accent-bright" /> Administração
      </h1>

      {/* visão geral */}
      <div className="flex gap-2.5 mt-5">
        <Stat Icon={Users} label="Membros" value={members.length} />
        <Stat Icon={UserCheck} label="Pendentes" value={pending.length} />
        <Stat Icon={Mail} label="Convites" value={invites.length} />
      </div>

      {error && (
        <p className="mt-4 text-sm text-accent-bright bg-accent/10 border border-accent/30 rounded-2xl px-4 py-3">
          {error}
        </p>
      )}

      {/* senha provisória recém-criada */}
      {tempPass && (
        <section className="card-gradient p-5 mt-5 border border-accent/30">
          <p className="label-caps">Senha provisória de {tempPass.user.name.split(' ')[0]}</p>
          <p className="mt-2 text-3xl font-extrabold tracking-widest font-mono select-all">{tempPass.senha}</p>
          <p className="mt-1 text-xs text-muted-light">
            Mande para a pessoa. Ela entra com essa senha e cria a dela em Conta → Segurança.
          </p>
          <div className="mt-4 flex gap-2">
            <button
              onClick={copyTemp}
              className={`flex-1 py-2.5 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition ${
                copied ? 'bg-positive/20 text-positive' : 'bg-white/10 hover:bg-white/15'
              }`}
            >
              {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? 'Copiada!' : 'Copiar'}
            </button>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(whatsText)}`}
              target="_blank"
              rel="noreferrer"
              className="flex-1 py-2.5 rounded-2xl bg-positive/15 text-positive text-sm font-bold flex items-center justify-center gap-2 hover:bg-positive/25 transition"
            >
              <MessageCircle size={15} /> WhatsApp
            </a>
          </div>
          <button onClick={() => setTempPass(null)} className="mt-3 w-full text-xs font-semibold text-muted hover:text-white">
            Fechar
          </button>
        </section>
      )}

      {/* pedidos de nova senha */}
      {resets.length > 0 && (
        <>
          <p className="label-caps mt-7">Esqueceram a senha ({resets.length})</p>
          <ul className="mt-3 space-y-2.5">
            {resets.map((r) => {
              const u = userById(r.userId);
              return (
                <li key={r.userId} className="card-flat p-4 flex items-center gap-3 border-amber-400/25">
                  <Avatar user={u} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{u.name}</p>
                    <p className="text-[11px] text-muted truncate">pediu {formatRelative(r.requestedAt)}</p>
                  </div>
                  <button
                    onClick={() => makeTempPassword(u)}
                    disabled={acting === u.id}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-accent/15 text-accent-bright hover:bg-accent/25 transition disabled:opacity-50 shrink-0"
                  >
                    <KeyRound size={13} /> Criar senha
                  </button>
                </li>
              );
            })}
          </ul>
        </>
      )}

      {/* aprovações */}
      <p className="label-caps mt-7">Aprovações pendentes ({pending.length})</p>
      {pending.length === 0 ? (
        <div className="card-flat p-4 mt-3 text-sm text-muted text-center">Ninguém esperando aprovação ✨</div>
      ) : (
        <ul className="mt-3 space-y-2.5 stagger">
          {pending.map((p) => (
            <li key={p.id} className="card-flat p-4 flex items-center gap-3 border-accent/30">
              <Avatar user={p} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{p.name}</p>
                <p className="text-[11px] text-muted truncate">{p.email}</p>
              </div>
              <button
                onClick={() => approve(p)}
                disabled={acting === p.id}
                className="w-9 h-9 rounded-full bg-positive/15 text-positive flex items-center justify-center hover:bg-positive/25 transition disabled:opacity-50"
                aria-label={`Aprovar ${p.name}`}
              >
                <Check size={16} />
              </button>
              <button
                onClick={() => reject(p)}
                disabled={acting === p.id}
                className="w-9 h-9 rounded-full bg-accent/15 text-accent-bright flex items-center justify-center hover:bg-accent/25 transition disabled:opacity-50"
                aria-label={`Recusar ${p.name}`}
              >
                <X size={16} />
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* membros */}
      <p className="label-caps mt-7">Membros ({members.length})</p>
      <ul className="mt-3 space-y-2.5 stagger">
        {members.map((u) => {
          const isMe = u.id === currentUser.id;
          return (
            <li key={u.id} className="card-flat p-4 flex items-center gap-3">
              <button onClick={() => navigate(`/perfil/${u.id}`)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
                <Avatar user={u} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">
                    {u.name}
                    {u.role === 'admin' && (
                      <span className="ml-2 px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wide bg-gradient-to-br from-accent to-accent-bright">
                        Admin
                      </span>
                    )}
                    {isMe && <span className="ml-2 text-[11px] text-muted">(você)</span>}
                  </p>
                  <p className="text-[11px] text-muted truncate">{u.email}</p>
                </div>
              </button>
              {!isMe && (
                <button
                  onClick={() => makeTempPassword(u)}
                  disabled={acting === u.id}
                  className="w-9 h-9 rounded-full bg-white/5 text-muted flex items-center justify-center hover:text-white hover:bg-white/10 transition disabled:opacity-50 shrink-0"
                  aria-label={`Senha provisória para ${u.name}`}
                  title="Criar senha provisória"
                >
                  <KeyRound size={15} />
                </button>
              )}
              {!isMe && u.role !== 'admin' && (
                <button
                  onClick={() => remove(u)}
                  disabled={acting === u.id}
                  className="w-9 h-9 rounded-full bg-white/5 text-muted flex items-center justify-center hover:text-accent-bright hover:bg-accent/10 transition disabled:opacity-50 shrink-0"
                  aria-label={`Remover ${u.name}`}
                >
                  <Trash2 size={15} />
                </button>
              )}
            </li>
          );
        })}
      </ul>

      {/* convites */}
      <p className="label-caps mt-7">Convites pendentes ({invites.length})</p>
      {invites.length === 0 ? (
        <div className="card-flat p-4 mt-3 text-sm text-muted text-center">Nenhum convite no ar.</div>
      ) : (
        <ul className="mt-3 space-y-2.5 stagger">
          {invites.map((inv) => {
            const inviter = userById(inv.invitedBy);
            return (
              <li key={inv.id} className="card-flat p-4 flex items-center gap-3">
                <span className="w-10 h-10 rounded-2xl bg-amber-400/10 text-amber-300 flex items-center justify-center shrink-0">
                  <Clock size={16} />
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate">{inv.email}</p>
                  <p className="text-[11px] text-muted truncate">
                    por {inviter?.name ?? '?'} · {formatRelative(inv.createdAt)}
                  </p>
                </div>
                <button
                  onClick={() => revoke(inv)}
                  disabled={acting === inv.id}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-accent/10 text-accent-bright hover:bg-accent/20 transition disabled:opacity-50 shrink-0"
                >
                  <X size={13} /> Revogar
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
