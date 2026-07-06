/**
 * LoginPage: autenticação por e-mail e senha (Supabase).
 * Não existe "criar conta" aqui de propósito: a entrada no Racha é
 * somente por convite, e o cadastro acontece na tela que o link
 * do e-mail abre (/bem-vindo).
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import * as dataService from '../lib/dataService';
import { useApp } from '../context/AppContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { refreshAll } = useApp();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) return setError('Digite seu e-mail.');
    if (!password) return setError('Digite sua senha.');
    setLoading(true);
    try {
      await dataService.login(email.trim(), password);
      await refreshAll(); // garante o usuário carregado antes de entrar
      navigate('/');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputCls =
    'w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm placeholder:text-muted focus:outline-none focus:border-accent/60';

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <span className="w-16 h-16 rounded-3xl bg-gradient-to-br from-accent to-accent-bright flex items-center justify-center shadow-fab">
            <Wallet size={28} />
          </span>
          <h1 className="mt-5 text-4xl font-extrabold tracking-tight">
            Racha<span className="text-accent">.</span>
          </h1>
          <p className="mt-2 text-sm text-muted">A carteira compartilhada do seu grupo.</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-10 space-y-3">
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
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          {error && <p className="text-sm text-accent-bright">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-br from-accent to-accent-bright font-bold disabled:opacity-60"
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-muted">
          Ainda não tem conta? O Racha é só por convite: peça pra alguém do
          grupo te convidar e siga o link que chega no seu e-mail.
        </p>
      </div>
    </div>
  );
}
