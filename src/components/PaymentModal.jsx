/**
 * Modal de registro de pagamento: mostra quem paga quem, o valor,
 * a chave Pix de quem recebe (com copiar) e envia para confirmação.
 * Se quem registra é o próprio recebedor, confirma na hora.
 */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, Check, Copy, QrCode, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCentsAbs, firstName } from '../lib/format';
import Avatar from './Avatar';

export default function PaymentModal({ transfer, tripId, onClose }) {
  const { userById, currentUser, settleDebt } = useApp();
  const [note, setNote] = useState('');
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const from = userById(transfer.from);
  const to = userById(transfer.to);
  const iAmReceiver = transfer.to === currentUser?.id;

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const copyPix = async () => {
    try {
      await navigator.clipboard.writeText(to.pix?.key ?? '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard indisponível */
    }
  };

  const handleSubmit = async () => {
    setSaving(true);
    setError('');
    try {
      await settleDebt(tripId, {
        from: transfer.from,
        to: transfer.to,
        amount: transfer.amount,
        note: note.trim(),
      });
      onClose();
    } catch (err) {
      setSaving(false);
      setError(err.message);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      <button aria-label="Fechar" onClick={onClose} className="absolute inset-0 bg-black/65 backdrop-blur-sm overlay-in" />

      <div className="relative w-full max-w-lg max-h-[88vh] overflow-y-auto bg-ink-soft border border-white/10 rounded-t-3xl md:rounded-3xl p-6 pb-8 sheet-up">
        <div className="mx-auto w-10 h-1 rounded-full bg-white/15 mb-5 md:hidden" />
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-muted hover:text-white"
          aria-label="Fechar"
        >
          <X size={15} />
        </button>

        <h2 className="text-lg font-extrabold">Registrar pagamento</h2>

        {/* quem paga quem */}
        <div className="mt-5 flex items-center justify-center gap-4">
          <div className="flex flex-col items-center gap-1.5">
            <Avatar user={from} size="lg" />
            <p className="text-xs font-semibold">{transfer.from === currentUser?.id ? 'Você' : firstName(from.name)}</p>
          </div>
          <div className="flex flex-col items-center">
            <ArrowRight size={18} className="text-accent-bright" />
            <p className="mt-1 text-2xl font-extrabold text-accent-bright whitespace-nowrap">
              {formatCentsAbs(transfer.amount)}
            </p>
          </div>
          <div className="flex flex-col items-center gap-1.5">
            <Avatar user={to} size="lg" />
            <p className="text-xs font-semibold">{iAmReceiver ? 'Você' : firstName(to.name)}</p>
          </div>
        </div>

        {/* pix de quem recebe */}
        {!iAmReceiver && (
          <div className="card-flat p-4 mt-5">
            <p className="label-caps flex items-center gap-1.5">
              <QrCode size={12} /> Pix de {firstName(to.name)}
            </p>
            {to.pix?.key ? (
              <div className="mt-2 flex items-center gap-3">
                <p className="flex-1 text-sm font-bold break-all">{to.pix.key}</p>
                <button
                  onClick={copyPix}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition ${
                    copied ? 'bg-positive/20 text-positive' : 'bg-white/10 hover:bg-white/15'
                  }`}
                >
                  {copied ? <Check size={13} /> : <Copy size={13} />}
                  {copied ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted">Sem chave cadastrada. Combina com a pessoa por fora.</p>
            )}
          </div>
        )}

        <input
          className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm placeholder:text-muted focus:outline-none focus:border-accent/60 mt-4"
          placeholder="Observação (opcional): Pix, dinheiro…"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />

        <p className="mt-3 text-xs text-muted text-center">
          {iAmReceiver
            ? 'Você é quem recebe: o pagamento entra confirmado direto.'
            : `${firstName(to.name)} vai precisar confirmar o recebimento pra entrar no saldo.`}
        </p>

        {error && <p className="mt-2 text-sm text-accent-bright text-center">{error}</p>}

        <button
          onClick={handleSubmit}
          disabled={saving}
          className="mt-4 w-full py-3.5 rounded-2xl bg-gradient-to-br from-accent to-accent-bright font-bold disabled:opacity-50"
        >
          {saving ? 'Registrando…' : iAmReceiver ? 'Confirmar recebimento' : 'Enviar para confirmação'}
        </button>
      </div>
    </div>,
    document.body
  );
}
