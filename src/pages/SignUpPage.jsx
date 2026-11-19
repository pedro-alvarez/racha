/**
 * SignUpPage: cadastro aberto, sem depender do e-mail chegar.
 * A conta é criada já confirmada e a pessoa entra na hora; até o admin
 * aprovar, ela vê a tela "Quase lá" (PendingApproval, no Layout).
 */
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Wallet } from 'lucide-react';
import * as dataService from '../lib/dataService';
import { useApp } from '../context/AppContext';

export default function SignUpPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { refreshAll } = useApp();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (name.trim().length < 2) return setError('Digite seu nome.');
    if (!email.trim()) return setError('Digite seu e-mail.');
    if (password.length < 6) return setError('A senha precisa ter pelo menos 6 caracteres.');
    if (password !== confirm) return setError('As senhas não conferem.');
    setLoading(true);
    try {
      await dataService.signUp(name.trim(), email.trim(), password);
      await refreshAll();
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
      setLoading(false);
    }
  };

  const inputCls =
    'w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm placeholder:text-muted focus:outline-none focus:border-accent/60';

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-white transition">
          <ArrowLeft size={16} /> Voltar
        </Link>

        <div className="mt-6 flex flex-col items-center text-center">
          <span className="w-16 h-16 rounded-3xl bg-gradient-to-br from-accent to-accent-bright flex items-center justify-center shadow-fab">
            <Wallet size={28} />
          </span>
          <h1 className="mt-5 text-3xl font-extrabold tracking-tight">Criar conta</h1>
          <p className="mt-2 text-sm text-muted">Entra pro Racha e começa a dividir os gastos com a galera.</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-10 space-y-3">
          <input
            className={inputCls}
            placeholder="Seu nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
          />
          <input
            type="email"
            className={inputCls}
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />
          <input
            type="password"
            className={inputCls}
            placeholder="Senha (mín. 6 caracteres)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
          <input
            type="password"
            className={inputCls}
            placeholder="Confirmar senha"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
          {error && <p className="text-sm text-accent-bright">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-br from-accent to-accent-bright font-bold disabled:opacity-60"
          >
            {loading ? 'Criando conta…' : 'Criar conta'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-muted">
          Depois de criar, sua conta passa pela aprovação do administrador do grupo.
        </p>
      </div>
    </div>
  );
}
