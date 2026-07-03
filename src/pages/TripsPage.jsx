/**
 * Viagens & Rolês — separados em seções claras, com filtro por tipo
 * e saldo resumido em cada card.
 */
import { Link, useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { Plus } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { computeBalances } from '../lib/splitEngine';
import { formatCentsAbs, formatDateRange, tripTypeLabel } from '../lib/format';
import AvatarStack from '../components/AvatarStack';

function TripCard({ trip, onOpen }) {
  const { expensesByTrip, paymentsByTrip, currentUser, userById } = useApp();
  const balances = computeBalances(
    expensesByTrip[trip.id] ?? [],
    paymentsByTrip[trip.id] ?? [],
    trip.members
  );
  const mine = balances[currentUser.id] ?? 0;
  const isRole = trip.type === 'role';

  return (
    <button onClick={onOpen} className="card-gradient p-5 w-full text-left hover:brightness-110 transition">
      <div className="flex items-start justify-between">
        <span className="text-3xl">{trip.emoji}</span>
        <div className="flex flex-col items-end gap-2">
          <span
            className={`px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest ${
              isRole ? 'bg-accent/20 text-accent-bright' : 'bg-white/10 text-muted-light'
            }`}
          >
            {tripTypeLabel(trip.type)}
          </span>
          <AvatarStack users={trip.members.map(userById)} max={3} />
        </div>
      </div>
      <h2 className="mt-3 text-xl font-bold">{trip.name}</h2>
      <p className="text-xs text-muted mt-1">
        {trip.members.length} membros · {formatDateRange(trip.startDate, trip.endDate)}
      </p>
      <p className="mt-3 text-sm">
        {mine === 0 ? (
          <span className="text-muted-light">Tudo acertado</span>
        ) : mine < 0 ? (
          <span className="text-accent-bright font-bold">Você deve {formatCentsAbs(mine)}</span>
        ) : (
          <span className="text-positive font-bold">Você recebe {formatCentsAbs(mine)}</span>
        )}
      </p>
    </button>
  );
}

export default function TripsPage() {
  const { trips, setSelectedTripId } = useApp();
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all'); // all | viagem | role

  const open = (trip) => {
    setSelectedTripId(trip.id);
    navigate(`/viagem/${trip.id}`);
  };

  const viagens = trips.filter((t) => t.type !== 'role');
  const roles = trips.filter((t) => t.type === 'role');

  const chip = (active) =>
    `px-4 py-2 rounded-full text-xs font-bold transition ${
      active ? 'bg-accent text-white' : 'bg-white/5 text-muted-light border border-white/10'
    }`;

  const renderSection = (title, list) =>
    list.length > 0 && (
      <section className="mt-6">
        <p className="label-caps">{title} ({list.length})</p>
        <ul className="mt-3 space-y-3 md:grid md:grid-cols-2 md:gap-4 md:space-y-0 stagger">
          {list.map((trip) => (
            <li key={trip.id}>
              <TripCard trip={trip} onOpen={() => open(trip)} />
            </li>
          ))}
        </ul>
      </section>
    );

  return (
    <div className="pt-4 md:pt-0">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-extrabold tracking-tight">Viagens & Rolês</h1>
        <Link
          to="/viagens/nova"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full bg-gradient-to-br from-accent to-accent-bright text-sm font-semibold"
        >
          <Plus size={16} /> Novo
        </Link>
      </div>

      <div className="flex gap-2 mt-5">
        <button className={chip(filter === 'all')} onClick={() => setFilter('all')}>Tudo</button>
        <button className={chip(filter === 'viagem')} onClick={() => setFilter('viagem')}>✈️ Viagens</button>
        <button className={chip(filter === 'role')} onClick={() => setFilter('role')}>🎉 Rolês</button>
      </div>

      {(filter === 'all' || filter === 'viagem') && renderSection('Viagens', viagens)}
      {(filter === 'all' || filter === 'role') && renderSection('Rolês', roles)}
    </div>
  );
}
