/**
 * Amigos — convite por e-mail de verdade:
 * a pessoa recebe um e-mail com link mágico, cria a conta por ele e cai na
 * fila de aprovação do admin; a amizade se forma sozinha ao aceitar.
 * Convites pendentes ficam numa seção expansível, com opção de revogar.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronDown, Clock, Mail, Send, X } from 'lucide-react';
import * as dataService from '../lib/dataService';
import { useApp } from '../context/AppContext';
import { useFriendBalances } from '../hooks/useFriendBalances';
import { formatCentsAbs, formatRelative, firstName } from '../lib/format';
import Avatar from '../components/Avatar';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function FriendsPage() {
  const { friends, refreshAll } = useApp();
  const balances = useFriendBalances();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState(null); // { text, sub }

  const [invites, setInvites] = useState([]);
  const [showInvites, setShowInvites] = useState(false);
  const [revoking, setRevoking] = useState(null);

  const loadInvites = () => dataService.getInvites().then(setInvites).catch(() => setInvites([]));
  useEffect(() => {
    loadInvites();
  }, []);

  const handleInvite = async (e) => {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!EMAIL_RE.test(value)) return setError('Digite um e-mail válido.');
    setError('');
    setSending(true);
    try {
      const result = await dataService.inviteFriend(value);
      if (result.status === 'friend') {
        setFeedback({
          text: `${firstName(result.profile.name)} já usa o Racha!`,
          sub: 'Adicionamos direto na sua lista de amigos 😉',
        });
        await refreshAll();
      } else {
        setFeedback({
          text: 'Convite enviado!',
          sub: `${value} vai receber um e-mail com o link pra criar a conta.`,
        });
        await loadInvites();
        setShowInvites(true);
      }
      setEmail('');
      setTimeout(() => setFeedback(null), 4000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  const handleRevoke = async (invite) => {
    if (!confirm(`Revogar o convite de ${invite.email}?`)) return;
    setRevoking(invite.id);
    try {
      await dataService.revokeInvite(invite.id);
      setInvites((prev) => prev.filter((i) => i.id !== invite.id));
    } finally {
      setRevoking(null);
    }
  };

  return (
    <div className="pt-4 md:pt-0">
      <h1 className="text-3xl font-extrabold tracking-tight">Amigos</h1>

      {/* Convite por e-mail */}
      <section className="card-gradient p-5 mt-5">
        <div className="flex items-center gap-3.5">
          <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent to-accent-bright flex items-center justify-center shrink-0 shadow-fab">
            {feedback ? <Check size={20} /> : <Mail size={20} />}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-bold">{feedback ? feedback.text : 'Convidar por e-mail'}</p>
            <p className="text-xs text-muted mt-0.5">
              {feedback ? feedback.sub : 'A pessoa recebe um link pra criar a conta no Racha'}
            </p>
          </div>
        </div>
        <form onSubmit={handleInvite} className="mt-4 flex gap-2">
          <input
            type="email"
            className="flex-1 min-w-0 bg-ink/40 border border-white/10 rounded-2xl px-4 py-3 text-sm placeholder:text-muted focus:outline-none focus:border-accent/60"
            placeholder="email@doamigo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <button
            type="submit"
            disabled={sending}
            className="px-4 rounded-2xl bg-gradient-to-br from-accent to-accent-bright font-bold shrink-0 flex items-center justify-center disabled:opacity-50"
            aria-label="Convidar"
          >
            <Send size={17} />
          </button>
        </form>
        {error && <p className="mt-2.5 text-xs text-accent-bright">{error}</p>}
      </section>

      {/* Convites pendentes (expansível) */}
      {invites.length > 0 && (
        <section className="card-flat mt-4 overflow-hidden">
          <button
            onClick={() => setShowInvites((v) => !v)}
            className="w-full p-4 flex items-center gap-3 text-left hover:bg-white/5 transition"
          >
            <span className="w-10 h-10 rounded-2xl bg-amber-400/10 text-amber-300 flex items-center justify-center shrink-0">
              <Clock size={17} />
            </span>
            <span className="flex-1 font-semibold text-sm">
              Convites pendentes
              <span className="ml-2 px-2 py-0.5 rounded-full text-[11px] font-bold bg-accent/20 text-accent-bright">
                {invites.length}
              </span>
            </span>
            <ChevronDown
              size={17}
              className={`text-muted transition-transform duration-300 ${showInvites ? 'rotate-180' : ''}`}
            />
          </button>
          {showInvites && (
            <ul className="px-4 pb-4 space-y-2 stagger">
              {invites.map((inv) => (
                <li
                  key={inv.id}
                  className="flex items-center gap-3 bg-white/5 border border-white/5 rounded-2xl px-4 py-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{inv.email}</p>
                    <p className="text-[11px] text-muted">enviado {formatRelative(inv.createdAt)}</p>
                  </div>
                  <button
                    onClick={() => handleRevoke(inv)}
                    disabled={revoking === inv.id}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-accent/10 text-accent-bright hover:bg-accent/20 transition disabled:opacity-50"
                  >
                    <X size={13} /> Revogar
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <p className="label-caps mt-7">Seus amigos ({friends.length})</p>
      <ul className="mt-3 space-y-2.5 stagger">
        {friends.map((f) => {
          const net = balances[f.id] ?? 0;
          return (
            <li key={f.id}>
              <button
                onClick={() => navigate(`/perfil/${f.id}`)}
                className="w-full card-flat p-4 flex items-center gap-3 text-left hover:bg-white/5 transition"
              >
                <div className="relative shrink-0">
                  <Avatar user={f} size="md" />
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-positive ring-2 ring-ink-soft" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{f.name}</p>
                  <p className="text-xs text-muted truncate">{f.email}</p>
                </div>
                <div className="text-right shrink-0">
                  {net === 0 ? (
                    <p className="text-xs text-muted">Em dia</p>
                  ) : net > 0 ? (
                    <>
                      <p className="text-[11px] font-bold text-positive">Te deve</p>
                      <p className="font-extrabold text-positive">{formatCentsAbs(net)}</p>
                    </>
                  ) : (
                    <>
                      <p className="text-[11px] font-bold text-accent-bright">Você deve</p>
                      <p className="font-extrabold text-accent-bright">{formatCentsAbs(net)}</p>
                    </>
                  )}
                </div>
              </button>
            </li>
          );
        })}
        {friends.length === 0 && (
          <li className="card-flat p-5 text-sm text-muted text-center">
            Ninguém por aqui ainda — convide alguém pelo e-mail aí em cima 👆
          </li>
        )}
      </ul>
    </div>
  );
}
