/**
 * Acerto Final - visão dinâmica do plano simplificado:
 * card de total pendente, transações avatar → avatar e "marcar pago"
 * (com a chave Pix do credor a um toque, via perfil).
 */
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check, Share2, Sparkles } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useTripSummary } from '../hooks/useTripSummary';
import PaymentModal from '../components/PaymentModal';
import { formatCentsAbs, firstName } from '../lib/format';
import Avatar from '../components/Avatar';

export default function SettlePage() {
  const { tripId } = useParams();
  const { userById, currentUser, confirmPayment, declinePayment } = useApp();
  const { trip, simplified, expenses, pendingPayments } = useTripSummary(tripId);
  const navigate = useNavigate();
  const [payingTransfer, setPayingTransfer] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [shared, setShared] = useState(false);

  if (!trip) return null;

  const total = simplified.reduce((acc, t) => acc + t.amount, 0);
  const displayName = (u) => (u.id === currentUser.id ? 'Você' : firstName(u.name));

  const handleConfirm = async (paymentId) => {
    setBusyId(paymentId);
    try {
      await confirmPayment(paymentId);
    } finally {
      setBusyId(null);
    }
  };

  const handleDecline = async (paymentId) => {
    if (!confirm('Recusar este pagamento? Ele será removido.')) return;
    setBusyId(paymentId);
    try {
      await declinePayment(paymentId);
    } finally {
      setBusyId(null);
    }
  };

  const handleShare = async () => {
    const lines = simplified.map((t) => {
      const from = userById(t.from);
      const to = userById(t.to);
      const pix = to.pix ? ` (Pix: ${to.pix.key})` : '';
      return `• ${firstName(from.name)} paga ${formatCentsAbs(t.amount)} para ${firstName(to.name)}${pix}`;
    });
    const text = `Acerto de ${trip.name}\n${lines.join('\n')}`;
    try {
      if (navigator.share) await navigator.share({ text });
      else {
        await navigator.clipboard.writeText(text);
        setShared(true);
        setTimeout(() => setShared(false), 1600);
      }
    } catch {
      /* usuário cancelou */
    }
  };

  return (
    <div className="pt-4 md:pt-0">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted hover:text-white">
          <ArrowLeft size={16} /> {trip.name}
        </button>
        <button
          onClick={handleShare}
          className={`w-9 h-9 rounded-full flex items-center justify-center transition ${
            shared ? 'bg-positive/20 text-positive' : 'bg-white/5 text-muted-light hover:text-white'
          }`}
          aria-label="Compartilhar plano"
        >
          {shared ? <Check size={16} /> : <Share2 size={16} />}
        </button>
      </div>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight">Acerto Final</h1>

      {/* Total pendente */}
      <section className="mt-5 rounded-3xl p-6 bg-gradient-to-br from-accent to-accent-bright shadow-fab">
        <p className="text-[11px] font-semibold uppercase tracking-widest text-white/80">Total pendente</p>
        <p className="mt-1.5 text-5xl font-extrabold tracking-tight">{formatCentsAbs(total)}</p>
        <div className="mt-4 inline-flex items-center gap-2 px-3.5 py-2 rounded-2xl bg-black/25 text-sm font-semibold">
          <Sparkles size={15} />
          Dívidas simplificadas · {expenses.length} despesas
        </div>
      </section>

      <div className="mt-7 flex items-center justify-between">
        <h2 className="text-lg font-bold">Transações</h2>
        <span className="text-xs font-semibold text-muted">{simplified.length} transferências</span>
      </div>

      {simplified.length === 0 ? (
        <div className="card-gradient p-8 mt-3 text-center">
          <p className="text-2xl">🎉</p>
          <p className="mt-2 font-bold">Tudo acertado!</p>
          <p className="text-sm text-muted mt-1">Ninguém deve nada nesta viagem.</p>
        </div>
      ) : (
        <ul className="mt-3 space-y-3">
          {simplified.map((t, i) => {
            const from = userById(t.from);
            const to = userById(t.to);
            const key = `${t.from}-${t.to}-${i}`;
            const involvesMe = t.from === currentUser.id || t.to === currentUser.id;
            return (
              <li key={key} className={`card-flat p-5 ${involvesMe ? 'border-accent/30' : ''}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="flex flex-col items-center gap-1.5 w-20">
                    <div className="relative">
                      <Avatar user={from} size="lg" onClick={() => navigate(`/perfil/${from.id}`)} />
                      <span className="absolute -bottom-0.5 -right-0.5 w-[18px] h-[18px] rounded-full bg-accent flex items-center justify-center ring-2 ring-ink-soft">
                        <ArrowRight size={10} strokeWidth={3} className="rotate-45" />
                      </span>
                    </div>
                    <p className="text-xs font-semibold truncate w-full text-center">{displayName(from)}</p>
                  </div>

                  <div className="flex-1 flex flex-col items-center">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-muted">paga</p>
                    <ArrowRight size={16} className="text-accent-bright my-0.5" />
                    <p className="text-lg font-extrabold text-accent-bright whitespace-nowrap">
                      {formatCentsAbs(t.amount)}
                    </p>
                  </div>

                  <div className="flex flex-col items-center gap-1.5 w-20">
                    <div className="relative">
                      <Avatar user={to} size="lg" onClick={() => navigate(`/perfil/${to.id}`)} />
                      <span className="absolute -bottom-0.5 -right-0.5 w-[18px] h-[18px] rounded-full bg-positive flex items-center justify-center ring-2 ring-ink-soft">
                        <ArrowRight size={10} strokeWidth={3} className="-rotate-45" />
                      </span>
                    </div>
                    <p className="text-xs font-semibold truncate w-full text-center">{displayName(to)}</p>
                  </div>
                </div>

                <button
                  onClick={() => setPayingTransfer(t)}
                  disabled={false}
                  className="mt-4 w-full py-2.5 rounded-2xl bg-positive/15 text-positive text-sm font-bold hover:bg-positive/25 transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Check size={15} />
                  Marcar como pago
                </button>
              </li>
            );
          })}
        </ul>
      )}
      {/* pagamentos aguardando confirmação */}
      {pendingPayments.length > 0 && (
        <section className="mt-7">
          <h2 className="text-lg font-bold">Aguardando confirmação</h2>
          <ul className="mt-3 space-y-2.5 stagger">
            {pendingPayments.map((p) => {
              const from = userById(p.from);
              const to = userById(p.to);
              const iAmReceiver = p.to === currentUser.id;
              const iAmPayer = p.from === currentUser.id;
              return (
                <li key={p.id} className="card-flat p-4 border-amber-400/20">
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                      <Avatar user={from} size="sm" ring />
                      <Avatar user={to} size="sm" ring />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">
                        {iAmPayer ? 'Você' : firstName(from.name)} pagou{' '}
                        {iAmReceiver ? 'você' : firstName(to.name)}
                      </p>
                      <p className="text-xs text-amber-300 mt-0.5">
                        {iAmReceiver ? 'confirma que recebeu?' : `aguardando ${firstName(to.name)} confirmar`}
                      </p>
                    </div>
                    <p className="font-extrabold">{formatCentsAbs(p.amount)}</p>
                  </div>
                  {(iAmReceiver || iAmPayer) && (
                    <div className="mt-3 flex gap-2">
                      {iAmReceiver && (
                        <button
                          onClick={() => handleConfirm(p.id)}
                          disabled={busyId === p.id}
                          className="flex-1 py-2.5 rounded-2xl bg-positive/15 text-positive text-xs font-bold hover:bg-positive/25 transition disabled:opacity-50"
                        >
                          Confirmar recebimento
                        </button>
                      )}
                      <button
                        onClick={() => handleDecline(p.id)}
                        disabled={busyId === p.id}
                        className="flex-1 py-2.5 rounded-2xl bg-red-500/10 text-red-400 text-xs font-bold hover:bg-red-500/20 transition disabled:opacity-50"
                      >
                        {iAmReceiver ? 'Recusar' : 'Cancelar'}
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {payingTransfer && (
        <PaymentModal
          transfer={payingTransfer}
          tripId={tripId}
          onClose={() => setPayingTransfer(null)}
        />
      )}
    </div>
  );
}
