/** Amigos frequentes — base de contatos para montar viagens rapidamente. */
import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import Avatar from '../components/Avatar';

export default function FriendsPage() {
  const { friends, addFriend } = useApp();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    await addFriend({ name: name.trim(), email: email.trim() || `${name.trim().toLowerCase().replace(/\s+/g, '.')}@exemplo.com` });
    setName('');
    setEmail('');
  };

  const inputCls =
    'w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm placeholder:text-muted focus:outline-none focus:border-accent/60';

  return (
    <div className="pt-4 md:pt-0">
      <h1 className="text-3xl font-extrabold tracking-tight">Amigos</h1>
      <p className="mt-2 text-sm text-muted">
        Seus contatos frequentes — adicione-os às viagens em um toque.
      </p>

      <form onSubmit={handleAdd} className="card-gradient p-5 mt-6 space-y-3">
        <p className="label-caps">Adicionar amigo</p>
        <input className={inputCls} placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} />
        <input className={inputCls} placeholder="E-mail (opcional)" value={email} onChange={(e) => setEmail(e.target.value)} />
        <button
          type="submit"
          className="w-full py-3 rounded-2xl bg-gradient-to-br from-accent to-accent-bright font-bold flex items-center justify-center gap-2"
        >
          <UserPlus size={17} /> Adicionar
        </button>
      </form>

      <ul className="mt-6 space-y-2.5">
        {friends.map((f) => (
          <li key={f.id} className="card-flat p-4 flex items-center gap-3">
            <Avatar user={f} size="md" />
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{f.name}</p>
              <p className="text-xs text-muted truncate">{f.email}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
