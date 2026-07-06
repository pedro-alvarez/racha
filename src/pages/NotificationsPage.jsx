/**
 * Notificações - derivadas dos dados: dívidas pendentes suas e a receber,
 * por viagem/rolê. (Com backend real, viram push/eventos de verdade.)
 */
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BellRing, HandCoins } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { simplifyDebts, computeBalances } from '../lib/splitEngine';
import { formatCentsAbs, firstName } from '../lib/format';
import Avatar from '../components/Avatar';

export default function NotificationsPage() {
  const { trips, expensesByTrip, paymentsByTrip, currentUser, userById } = useApp();
  const navigate = useNavigate();

  const notifications = trips.flatMap((trip) => {
    const balances = computeBalances(
      expensesByTrip[trip.id] ?? [],
      paymentsByTrip[trip.id] ?? [],
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
