/**
 * Acertar contas: lista as transferências do plano simplificado e permite
 * registrar cada pagamento (marca a dívida como paga via dataService.settleDebt).
 */
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useTripSummary } from '../hooks/useTripSummary';
import { formatCentsAbs, firstName } from '../lib/format';
import Avatar from '../components/Avatar';

export default function SettlePage() {
  const { tripId } = useParams();
  const { userById, settleDebt } = useApp();
  const { trip, simplified } = useTripSummary(tripId);
  const navigate = useNavigate();
  const [settlingKey, setSettlingKey] = useState(null);

  if (!trip) return null;

  const handleSettle = async (t, key) => {
    setSettlingKey(key);
    await settleDebt(tripId, { from: t.from, to: t.to, amount: t.amount, note: 'Acerto' });
    setSettlingKey(null);
  };

  return (
    <div className="pt-4 md:pt-0">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted hover:text-white">
        <ArrowLeft size={16} /> {trip.name}
      </button>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight">Acertar contas</h1>
      <p className="mt-2 text-sm text-muted">
        Plano simplificado: o mínimo de transferências para zerar o grupo.
      </p>

      {simplified.length === 0 ? (
        <div className="card-gradient p-8 mt-6 text-center">
          <p className="text-2xl">🎉</p>
          <p className="mt-2 font-bold">Tudo acertado!</p>
          <p className="text-sm text-muted mt-1">Ninguém deve nada nesta viagem.</p>
        </div>
      ) : (
        <ul className="mt-6 space-y-3">
          {simplified.map((t, i) => {
            const from = userById(t.from);
            const to = userById(t.to);
            const key = `${t.from}-${t.to}-${i}`;
            return (
              <li key={key} className="card-flat p-4">
                <div className="flex items-center gap-3">
                  <Avatar user={from} size="md" />
                  <ArrowRight size={16} className="text-accent-bright shrink-0" />
                  <Avatar user={to} size="md" />
                  <div className="flex-1 min-w-0 ml-1">
                    <p className="text-sm font-semibold truncate">
                      {firstName(from.name)} paga {firstName(to.name)}
                    </p>
                    <p className="text-lg font-extrabold text-accent-bright">
                      {formatCentsAbs(t.amount)}
                    </p>
                  </div>
                  <button
                    onClick={() => handleSettle(t, key)}
                    disabled={settlingKey === key}
                    className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-positive/15 text-positive text-xs font-bold hover:bg-positive/25 transition disabled:opacity-50 shrink-0"
                  >
                    <Check size={14} />
                    {settlingKey === key ? 'Salvando…' : 'Marcar pago'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
