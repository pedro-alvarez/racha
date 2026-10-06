/**
 * LoginPage: autenticação por e-mail e senha (Supabase).
 * Não existe "criar conta" aqui de propósito: a entrada no Racha é
 * somente por convite, e o cadastro acontece na tela que o link
 * do e-mail abre (/bem-vindo).
 * Quem só quer conhecer o app entra pelo modo demonstração (dados
 * fictícios, sem conta e sem aprovação do admin).
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlayCircle, Wallet } from 'lucide-react';
import * as dataService from '../lib/dataService';
import { useApp } from '../context/AppContext';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [enteringDemo, setEnteringDemo] = useState(false);
  const navigate = useNavigate();
  const { refreshAll, enterDemo } = useApp();

  const handleDemo = async () => {
    setError('');
    setEnteringDemo(true);
    try {
      await enterDemo();
      navigate('/');
    } catch (err) {
      setError(err.message);
      setEnteringDemo(false);
    }
  };

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

        <div className="mt-6 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-widest text-muted">
          <span className="h-px flex-1 bg-white/10" /> ou <span className="h-px flex-1 bg-white/10" />
        </div>
        <button
          type="button"
          onClick={handleDemo}
          disabled={enteringDemo}
          className="mt-6 w-full py-3.5 rounded-2xl bg-white/5 border border-white/10 font-bold flex items-center justify-center gap-2 hover:bg-white/10 transition disabled:opacity-60"
        >
          <PlayCircle size={18} className="text-accent-bright" />
          {enteringDemo ? 'Preparando a demonstração…' : 'Explorar o modo demonstração'}
        </button>
        <p className="mt-2 text-center text-xs text-muted">
          Sem cadastro: você entra como admin de um grupo com dados fictícios.
        </p>

        <p className="mt-6 text-center text-xs text-muted">
          Ainda não tem conta? O Racha é só por convite: peça pra alguém do
          grupo te convidar e siga o link que chega no seu e-mail.
        </p>
      </div>
    </div>
  );
}
