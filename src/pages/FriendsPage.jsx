/**
 * Amigos — convite por e-mail (único caminho de entrada) e
 * seção "SEUS AMIGOS (n)" com saldo entre vocês em cada linha.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Mail, Send } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useFriendBalances } from '../hooks/useFriendBalances';
import { formatCentsAbs, firstName } from '../lib/format';
import Avatar from '../components/Avatar';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function FriendsPage() {
  const { friends, addFriend } = useApp();
  const balances = useFriendBalances();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [added, setAdded] = useState(null); // nome do último amigo adicionado

  const handleInvite = async (e) => {
    e.preventDefault();
    const value = email.trim().toLowerCase();
    if (!EMAIL_RE.test(value)) return setError('Digite um e-mail válido.');
    setError('');
    setSending(true);
    try {
      const friend = await addFriend({ name: value.split('@')[0], email: value });
      setAdded(firstName(friend.name));
      setEmail('');
      setTimeout(() => setAdded(null), 2500);
    } catch (err) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="pt-4 md:pt-0">
      <h1 className="text-3xl font-extrabold tracking-tight">Amigos</h1>

      {/* Convite por e-mail */}
      <section className="card-gradient p-5 mt-5">
        <div className="flex items-center gap-3.5">
          <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent to-accent-bright flex items-center justify-center shrink-0 shadow-fab">
            {added ? <Check size={20} /> : <Mail size={20} />}
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-bold">{added ? `${added} está na sua lista!` : 'Convidar por e-mail'}</p>
            <p className="text-xs text-muted mt-0.5">
              {added
                ? 'Já dá pra dividir despesas com essa pessoa 😉'
                : 'A pessoa entra na sua lista e pode criar a conta depois'}
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
      </ul>
    </div>
  );
}
