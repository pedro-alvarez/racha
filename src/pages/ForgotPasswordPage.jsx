/**
 * Esqueci minha senha: sem depender de e-mail. A pessoa informa o e-mail e o
 * admin recebe um aviso no celular para criar uma senha provisória, que ele
 * manda pelo WhatsApp. Por segurança, a resposta é a mesma exista ou não a conta.
 */
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, KeyRound, MailCheck } from 'lucide-react';
import * as dataService from '../lib/dataService';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return setError('Digite o e-mail da sua conta.');
    setLoading(true);
    try {
      await dataService.requestPasswordReset(email.trim());
      setEnviado(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link to="/login" className="inline-flex items-center gap-1.5 text-sm text-muted hover:text-white">
          <ArrowLeft size={16} /> Entrar
        </Link>

        {enviado ? (
          <div className="mt-8 text-center">
            <span className="mx-auto w-16 h-16 rounded-3xl bg-positive/15 text-positive flex items-center justify-center">
              <MailCheck size={28} />
            </span>
            <h1 className="mt-5 text-2xl font-extrabold">Pedido enviado!</h1>
            <p className="mt-2 text-sm text-muted">
              O administrador recebeu um aviso e vai te mandar uma <b className="text-white">senha provisória</b>, pelo
              WhatsApp ou pessoalmente.
            </p>
            <p className="mt-3 text-sm text-muted">
              Entre com ela e, em seguida, crie a sua senha em <b className="text-white">Conta → Segurança</b>.
            </p>
            <Link
              to="/login"
              className="mt-8 inline-flex w-full justify-center py-3.5 rounded-2xl bg-gradient-to-br from-accent to-accent-bright font-bold"
            >
              Voltar para entrar
            </Link>
          </div>
        ) : (
          <>
            <span className="mt-8 w-14 h-14 rounded-3xl bg-accent/15 text-accent-bright flex items-center justify-center">
              <KeyRound size={24} />
            </span>
            <h1 className="mt-5 text-3xl font-extrabold tracking-tight">Esqueci minha senha</h1>
            <p className="mt-2 text-sm text-muted">
              Digite o e-mail da sua conta. O administrador do Racha recebe o pedido e te manda uma senha provisória.
            </p>
            <form onSubmit={handleSubmit} className="mt-6 space-y-3">
              <input
                type="email"
                autoComplete="email"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3.5 text-sm placeholder:text-muted focus:outline-none focus:border-accent/60"
                placeholder="E-mail"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {error && <p className="text-sm text-accent-bright">{error}</p>}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-br from-accent to-accent-bright font-bold disabled:opacity-60"
              >
                {loading ? 'Enviando…' : 'Pedir nova senha'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
