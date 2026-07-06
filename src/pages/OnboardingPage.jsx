/**
 * Cadastro do convidado — aparece quando alguém entra pelo link do e-mail
 * e ainda não definiu nome/senha. E-mail vem travado; foto é opcional.
 */
import { useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Wallet, Lock } from 'lucide-react';
import { useApp } from '../context/AppContext';
import * as dataService from '../lib/dataService';
import Avatar from '../components/Avatar';

export default function OnboardingPage() {
  const { currentUser, needsOnboarding, refreshAll } = useApp();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [photo, setPhoto] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (!currentUser) return <Navigate to="/login" replace />;
  if (!needsOnboarding) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (name.trim().length < 2) return setError('Digite seu nome.');
    if (password.length < 6) return setError('A senha precisa ter pelo menos 6 caracteres.');
    if (password !== confirm) return setError('As senhas não conferem.');
    setSaving(true);
    try {
      await dataService.completeOnboarding({
        name: name.trim(),
        password,
        photo: photo.trim(),
      });
      await refreshAll();
      navigate('/', { replace: true });
    } catch (err) {
      setSaving(false);
      setError(err.message);
    }
  };

  const inputCls =
    'w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm placeholder:text-muted focus:outline-none focus:border-accent/60';

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-10">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center text-center">
          <span className="w-14 h-14 rounded-3xl bg-gradient-to-br from-accent to-accent-bright flex items-center justify-center shadow-fab">
            <Wallet size={26} />
          </span>
          <h1 className="mt-4 text-3xl font-extrabold tracking-tight">
            Bem-vindo(a) ao Racha<span className="text-accent">.</span>
          </h1>
          <p className="mt-2 text-sm text-muted">
            Falta pouco — completa teu cadastro pra entrar no grupo.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-3">
          {/* e-mail travado */}
          <div className="relative">
            <input type="email" className={`${inputCls} opacity-60 pr-10`} value={currentUser.email} disabled />
            <Lock size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted" />
          </div>

          <input
            className={inputCls}
            placeholder="Seu nome"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <input
            type="password"
            className={inputCls}
            placeholder="Crie uma senha (mín. 6 caracteres)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <input
            type="password"
            className={inputCls}
            placeholder="Repita a senha"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />

          <div className="flex items-center gap-3">
            <Avatar user={{ name: name || '?', color: '#F0146B', photo: photo.trim() || null }} size="md" />
            <input
              className={inputCls}
              placeholder="Foto — URL da imagem (opcional)"
              value={photo}
              onChange={(e) => setPhoto(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-accent-bright">{error}</p>}

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-br from-accent to-accent-bright font-bold disabled:opacity-60"
          >
            {saving ? 'Criando…' : 'Criar minha conta'}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-muted">
          Depois dá pra entrar com esse e-mail e senha normalmente.
        </p>
      </div>
    </div>
  );
}
