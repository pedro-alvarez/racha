/**
 * Amigos — como na referência: card "Convidar amigos" (link/QR),
 * seção "SEUS AMIGOS (n)" com saldo entre vocês em cada linha.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, ChevronRight, QrCode, UserPlus, UserRoundPlus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useFriendBalances } from '../hooks/useFriendBalances';
import { formatCentsAbs } from '../lib/format';
import Avatar from '../components/Avatar';

export default function FriendsPage() {
  const { friends, addFriend } = useApp();
  const balances = useFriendBalances();
  const navigate = useNavigate();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [copied, setCopied] = useState(false);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    await addFriend({
      name: name.trim(),
      email: email.trim() || `${name.trim().toLowerCase().replace(/\s+/g, '.')}@exemplo.com`,
    });
    setName('');
    setEmail('');
    setShowForm(false);
  };

  const handleInvite = async () => {
    // TODO backend: gerar link de convite real por usuário
    try {
      await navigator.clipboard.writeText('https://pedro-alvarez.github.io/racha/#/convite/demo');
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard indisponível */
    }
  };

  const inputCls =
    'w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm placeholder:text-muted focus:outline-none focus:border-accent/60';

  return (
    <div className="pt-4 md:pt-0">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold tracking-tight">Amigos</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className={`w-10 h-10 rounded-full flex items-center justify-center transition ${
            showForm ? 'bg-accent text-white' : 'bg-white/5 text-muted-light hover:text-white'
          }`}
          aria-label="Adicionar amigo"
        >
          <UserRoundPlus size={18} />
        </button>
      </div>

      {/* Convite */}
      <button
        onClick={handleInvite}
        className="w-full card-gradient p-4 mt-5 flex items-center gap-3.5 text-left hover:brightness-110 transition"
      >
        <span className="w-12 h-12 rounded-2xl bg-gradient-to-br from-accent to-accent-bright flex items-center justify-center shrink-0 shadow-fab">
          {copied ? <Check size={20} /> : <QrCode size={20} />}
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-bold">{copied ? 'Link copiado!' : 'Convidar amigos'}</p>
          <p className="text-xs text-muted mt-0.5">
            {copied ? 'Manda no grupo 😉' : 'Compartilhe o link ou QR code'}
          </p>
        </div>
        <ChevronRight size={17} className="text-muted shrink-0" />
      </button>

      {showForm && (
        <form onSubmit={handleAdd} className="card-flat p-5 mt-4 space-y-3 border-accent/30">
          <p className="label-caps">Adicionar manualmente</p>
          <input className={inputCls} placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <input className={inputCls} placeholder="E-mail (opcional)" value={email} onChange={(e) => setEmail(e.target.value)} />
          <button
            type="submit"
            className="w-full py-3 rounded-2xl bg-gradient-to-br from-accent to-accent-bright font-bold flex items-center justify-center gap-2"
          >
            <UserPlus size={17} /> Adicionar
          </button>
        </form>
      )}

      <p className="label-caps mt-7">Seus amigos ({friends.length})</p>
      <ul className="mt-3 space-y-2.5">
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
