/**
 * LoginPage — placeholder estruturado de autenticação.
 * Hoje: qualquer clique em "Entrar" chama dataService.login() (mock) e segue
 * para o app. Amanhã: basta o dataService validar credenciais de verdade —
 * esta tela já está pronta para isso.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Wallet } from 'lucide-react';
import * as dataService from '../lib/dataService';

export default function LoginPage() {
  const [email, setEmail] = useState('pedro.a.certo@gmail.com');
  const [password, setPassword] = useState('••••••••');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    await dataService.login(email, password); // mock — sempre autentica
    navigate('/');
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

        <form onSubmit={handleLogin} className="mt-10 space-y-3">
          <input
            type="email"
            className={inputCls}
            placeholder="E-mail"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <input
            type="password"
            className={inputCls}
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-br from-accent to-accent-bright font-bold disabled:opacity-60"
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-muted">
          Protótipo — o login é simulado. A autenticação real entrará aqui
          quando o backend for plugado.
        </p>
      </div>
    </div>
  );
}
