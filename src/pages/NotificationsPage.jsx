/**
 * Notificações - derivadas dos dados: dívidas pendentes suas e a receber,
 * por viagem/rolê. (Com backend real, viram push/eventos de verdade.)
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BellRing, HandCoins } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { simplifyDebts, computeBalances } from '../lib/splitEngine';
import { formatCentsAbs, firstName } from '../lib/format';
import Avatar from '../components/Avatar';

export default function NotificationsPage() {
  const { trips, expensesByTrip, paymentsByTrip, currentUser, userById, confirmPayment, declinePayment } = useApp();
  const [busyId, setBusyId] = useState(null);
  const navigate = useNavigate();

  // pagamentos pendentes que envolvem você (confirmar / acompanhar)
  const pendingConfirmations = trips.flatMap((trip) =>
    (paymentsByTrip[trip.id] ?? [])
      .filter((p) => p.status === 'pending' && (p.to === currentUser.id || p.from === currentUser.id))
      .map((p) => ({ ...p, trip }))
  );

  const handleConfirm = async (id) => {
    setBusyId(id);
    try {
      await confirmPayment(id);
    } finally {
      setBusyId(null);
    }
  };
  const handleDecline = async (id) => {
    if (!confirm('Recusar este pagamento? Ele será removido.')) return;
    setBusyId(id);
    try {
      await declinePayment(id);
    } finally {
      setBusyId(null);
    }
  };

  const notifications = trips.flatMap((trip) => {
    const confirmed = (paymentsByTrip[trip.id] ?? []).filter((x) => x.status !== 'pending');
    const balances = computeBalances(
      expensesByTrip[trip.id] ?? [],
      confirmed,
      trip.members
    );
    return simplifyDebts(balances)
      .filter((t) => t.from === currentUser.id || t.to === currentUser.id)
      .map((t) => ({ ...t, trip }));
  });

  return (
    <div className="pt-4 md:pt-0">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-muted-light hover:text-white"
          aria-label="Voltar"
        >
          <ArrowLeft size={17} />
        </button>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Notificações</h1>
      </div>

      {pendingConfirmations.length > 0 && (
        <section className="mt-6">
          <p className="label-caps">Pagamentos para confirmar</p>
          <ul className="mt-3 space-y-2.5 stagger">
            {pendingConfirmations.map((p) => {
              const other = userById(p.to === currentUser.id ? p.from : p.to);
              const iAmReceiver = p.to === currentUser.id;
              return (
                <li key={p.id} className="card-flat p-4 border-amber-400/20">
                  <div className="flex items-center gap-3">
                    <Avatar user={other} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">
                        {iAmReceiver ? (
                          <>{firstName(other.name)} diz que te pagou <span className="text-positive font-extrabold">{formatCentsAbs(p.amount)}</span></>
                        ) : (
                          <>Aguardando {firstName(other.name)} confirmar <span className="font-extrabold">{formatCentsAbs(p.amount)}</span></>
                        )}
                      </p>
                      <p className="text-xs text-muted mt-0.5">
                        {p.trip.emoji} {p.trip.name}
                        {p.note ? ` · ${p.note}` : ''}
                      </p>
                    </div>
                  </div>
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
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {notifications.length === 0 ? (
        <div className="card-gradient p-8 mt-6 text-center">
          <BellRing size={28} className="mx-auto text-muted" />
          <p className="mt-3 font-bold">Tudo em dia!</p>
          <p className="text-sm text-muted mt-1">Nenhuma pendência por aqui.</p>
        </div>
      ) : (
        <ul className="mt-6 space-y-2.5 stagger">
          {notifications.map((n, i) => {
            const iOwe = n.from === currentUser.id;
            const other = userById(iOwe ? n.to : n.from);
            return (
              <li key={i}>
                <button
                  onClick={() => navigate(`/viagem/${n.trip.id}/acertar`)}
                  className="w-full card-flat p-4 flex items-center gap-3 text-left hover:bg-white/5 transition"
                >
                  <Avatar user={other} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">
                      {iOwe ? (
                        <>Você deve <span className="text-accent-bright font-extrabold">{formatCentsAbs(n.amount)}</span> a {firstName(other.name)}</>
                      ) : (
                        <>{firstName(other.name)} te deve <span className="text-positive font-extrabold">{formatCentsAbs(n.amount)}</span></>
                      )}
                    </p>
                    <p className="text-xs text-muted mt-0.5">
                      {n.trip.emoji} {n.trip.name} · toque para acertar
                    </p>
                  </div>
                  <HandCoins size={17} className={iOwe ? 'text-accent-bright' : 'text-positive'} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
