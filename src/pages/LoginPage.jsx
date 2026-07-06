/**
 * LoginPage - autenticação real (Supabase, e-mail/senha).
 * Alterna entre "Entrar" e "Criar conta". Se a confirmação por e-mail
 * estiver ativa no Supabase, orienta o usuário a conferir a caixa de entrada.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import * as dataService from '../lib/dataService';

export default function LoginPage() {
  const [mode, setMode] = useState('login'); // login | signup
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const isSignup = mode === 'signup';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setInfo('');

    if (isSignup && !name.trim()) return setError('Diga seu nome.');
    if (!email.trim()) return setError('Digite seu e-mail.');
    if (!password) return setError('Digite sua senha.');

    setLoading(true);
    try {
      if (isSignup) {
        const result = await dataService.signUp(name.trim(), email.trim(), password);
        if (result?.needsConfirmation) {
          setInfo('Conta criada! Confira seu e-mail e clique no link de confirmação para entrar.');
          setMode('login');
        } else {
          navigate('/');
        }
      } else {
        await dataService.login(email.trim(), password);
        navigate('/');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = () => {
    setMode(isSignup ? 'login' : 'signup');
    setError('');
    setInfo('');
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
          {isSignup && (
            <input
              type="text"
              className={inputCls}
              placeholder="Seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          )}
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
            placeholder={isSignup ? 'Senha (mín. 6 caracteres)' : 'Senha'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={isSignup ? 'new-password' : 'current-password'}
          />

          {error && (
            <p className="text-sm text-accent-bright bg-accent/10 border border-accent/30 rounded-2xl px-4 py-3">
              {error}
            </p>
          )}
          {info && (
            <p className="text-sm text-positive bg-positive/10 border border-positive/30 rounded-2xl px-4 py-3">
              {info}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-br from-accent to-accent-bright font-bold disabled:opacity-60"
          >
            {loading ? (isSignup ? 'Criando conta…' : 'Entrando…') : isSignup ? 'Criar conta' : 'Entrar'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          {isSignup ? 'Já tem conta?' : 'Ainda não tem conta?'}{' '}
          <button onClick={switchMode} className="font-bold text-accent-bright">
            {isSignup ? 'Entrar' : 'Criar conta'}
          </button>
        </p>
      </div>
    </div>
  );
}
