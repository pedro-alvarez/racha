/** Lista de viagens em cards, com saldo resumido de cada uma. */
import { Link, useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { computeBalances } from '../lib/splitEngine';
import { formatCentsAbs, formatDateRange } from '../lib/format';
import AvatarStack from '../components/AvatarStack';

export default function TripsPage() {
  const { trips, expensesByTrip, paymentsByTrip, currentUser, userById, setSelectedTripId } = useApp();
  const navigate = useNavigate();

  return (
    <div className="pt-4 md:pt-0">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold tracking-tight">Viagens</h1>
        <Link
          to="/viagens/nova"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-br from-accent to-accent-bright text-sm font-semibold"
        >
          <Plus size={16} /> Nova
        </Link>
      </div>

      <ul className="mt-6 space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0">
        {trips.map((trip) => {
          const balances = computeBalances(
            expensesByTrip[trip.id] ?? [],
            paymentsByTrip[trip.id] ?? [],
            trip.members
          );
          const mine = balances[currentUser.id] ?? 0;
          return (
            <li key={trip.id}>
              <button
                onClick={() => {
                  setSelectedTripId(trip.id);
                  navigate(`/viagem/${trip.id}`);
                }}
                className="card-gradient p-5 w-full text-left hover:brightness-110 transition"
              >
                <div className="flex items-start justify-between">
                  <span className="text-3xl">{trip.emoji}</span>
                  <AvatarStack users={trip.members.map(userById)} max={3} />
                </div>
                <h2 className="mt-3 text-xl font-bold">{trip.name}</h2>
                <p className="text-xs text-muted mt-1">
                  {trip.members.length} membros · {formatDateRange(trip.startDate, trip.endDate)}
                </p>
                <p className="mt-3 text-sm">
                  {mine === 0 ? (
                    <span className="text-muted-light">Tudo acertado</span>
                  ) : mine < 0 ? (
                    <span className="text-accent-bright font-bold">
                      Você deve {formatCentsAbs(mine)}
                    </span>
                  ) : (
                    <span className="text-positive font-bold">
                      Você recebe {formatCentsAbs(mine)}
                    </span>
                  )}
                </p>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
