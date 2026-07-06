/**
 * Cadastro do convidado. Aparece quando alguém entra pelo link do e-mail
 * e ainda não definiu nome/senha. E-mail vem travado; foto e cor opcionais.
 */
import { useRef, useState } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { Camera, Lock, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import * as dataService from '../lib/dataService';
import Avatar from '../components/Avatar';

const COLORS = ['#F0146B', '#8B5CF6', '#06B6D4', '#F59E0B', '#22C55E', '#3B82F6', '#EC4899', '#EF4444'];

export default function OnboardingPage() {
  const { currentUser, needsOnboarding, refreshAll } = useApp();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [photo, setPhoto] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (!currentUser) return <Navigate to="/login" replace />;
  if (!needsOnboarding) return <Navigate to="/" replace />;

  const handlePhotoFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!file.type.startsWith('image/')) return setError('Escolha um arquivo de imagem.');
    if (file.size > 5 * 1024 * 1024) return setError('Imagem muito grande (máx. 5 MB).');
    setError('');
    setUploading(true);
    try {
      const url = await dataService.uploadAvatar(currentUser.id, file);
      setPhoto(url);
    } catch (err) {
      setError(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (name.trim().length < 2) return setError('Digite seu nome.');
    if (password.length < 6) return setError('A senha precisa ter pelo menos 6 caracteres.');
    if (password !== confirm) return setError('As senhas não conferem.');
    setSaving(true);
    try {
      await dataService.completeOnboarding({ name: name.trim(), password, photo, color });
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
        {/* foto primeiro: avatar central com câmera */}
        <div className="flex flex-col items-center text-center">
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoFile} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="relative group"
            aria-label="Escolher foto de perfil"
          >
            <Avatar user={{ name: name || '?', color, photo: photo || null }} size="xl" />
            <span
              className={`absolute inset-0 rounded-full bg-black/55 flex items-center justify-center transition ${
                photo ? 'opacity-0 group-hover:opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}
            >
              <Camera size={24} />
            </span>
            <span className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-accent flex items-center justify-center ring-4 ring-ink">
              <Camera size={14} />
            </span>
          </button>
          {uploading && <p className="mt-2 text-xs text-muted">Enviando foto…</p>}
          {photo && !uploading && (
            <button
              type="button"
              onClick={() => setPhoto('')}
              className="mt-2 inline-flex items-center gap-1 text-xs text-muted hover:text-accent-bright"
            >
              <Trash2 size={12} /> Remover foto
            </button>
          )}

          {/* ou escolher a cor do avatar */}
          {!photo && (
            <div className="flex gap-2 mt-4 flex-wrap justify-center">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-7 h-7 rounded-full transition ${
                    color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-ink scale-110' : ''
                  }`}
                  style={{ background: c }}
                  aria-label={`Cor ${c}`}
                />
              ))}
            </div>
          )}

          <h1 className="mt-6 text-3xl font-extrabold tracking-tight">
            Bem-vindo(a) ao Racha<span className="text-accent">.</span>
          </h1>
          <p className="mt-2 text-sm text-muted">Falta pouco: completa teu cadastro pra entrar no grupo.</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-7 space-y-3">
          <div className="relative">
            <input type="email" className={`${inputCls} opacity-60 pr-10`} value={currentUser.email} disabled />
            <Lock size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted" />
          </div>
          <input className={inputCls} placeholder="Seu nome" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          <input type="password" className={inputCls} placeholder="Crie uma senha (mín. 6 caracteres)" value={password} onChange={(e) => setPassword(e.target.value)} />
          <input type="password" className={inputCls} placeholder="Repita a senha" value={confirm} onChange={(e) => setConfirm(e.target.value)} />

          {error && <p className="text-sm text-accent-bright">{error}</p>}

          <button
            type="submit"
            disabled={saving || uploading}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-br from-accent to-accent-bright font-bold disabled:opacity-60"
          >
            {saving ? 'Criando…' : 'Criar minha conta'}
          </button>
        </form>

        <p className="mt-5 text-center text-xs text-muted">Depois é só entrar com esse e-mail e senha.</p>
      </div>
    </div>
  );
}
