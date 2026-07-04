/**
 * Segurança — troca de senha da conta logada (Supabase Auth).
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, KeyRound, ShieldCheck } from 'lucide-react';
import * as dataService from '../lib/dataService';
import { useApp } from '../context/AppContext';

export default function SecurityPage() {
  const { currentUser } = useApp();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 6) return setError('A nova senha precisa ter pelo menos 6 caracteres.');
    if (password !== confirm) return setError('As senhas não conferem.');
    setSaving(true);
    try {
      await dataService.changePassword(password);
      setDone(true);
      setPassword('');
      setConfirm('');
      setTimeout(() => setDone(false), 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    'w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm placeholder:text-muted focus:outline-none focus:border-accent/60';

  return (
    <div className="pt-4 md:pt-0">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted hover:text-white">
        <ArrowLeft size={16} /> Voltar
      </button>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight">Segurança</h1>

      <section className="card-flat p-5 mt-6 flex items-center gap-3.5">
        <span className="w-11 h-11 rounded-2xl bg-positive/10 text-positive flex items-center justify-center shrink-0">
          <ShieldCheck size={19} />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold">Conta protegida por senha</p>
          <p className="text-xs text-muted truncate mt-0.5">{currentUser?.email}</p>
        </div>
      </section>

      <form onSubmit={handleSubmit} className="card-flat p-5 mt-4 space-y-3">
        <p className="label-caps flex items-center gap-1.5">
          <KeyRound size={13} /> Trocar senha
        </p>
        <input
          type="password"
          className={inputCls}
          placeholder="Nova senha (mín. 6 caracteres)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="new-password"
        />
        <input
          type="password"
          className={inputCls}
          placeholder="Repetir a nova senha"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          autoComplete="new-password"
        />

        {error && (
          <p className="text-sm text-accent-bright bg-accent/10 border border-accent/30 rounded-2xl px-4 py-3">
            {error}
          </p>
        )}
        {done && (
          <p className="text-sm text-positive bg-positive/10 border border-positive/30 rounded-2xl px-4 py-3 flex items-center gap-2">
            <Check size={15} /> Senha alterada com sucesso!
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-br from-accent to-accent-bright font-bold disabled:opacity-50"
        >
          {saving ? 'Salvando…' : 'Salvar nova senha'}
        </button>
      </form>
    </div>
  );
}
