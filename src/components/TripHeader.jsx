/** Header da viagem/rolê: nome, membros + datas/hora, descrição, avatares.
 *  Admin vê também o botão de apagar (lixeira). */
import { Settings, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AvatarStack from './AvatarStack';
import { useApp } from '../context/AppContext';
import { formatDateRange, tripTypeLabel } from '../lib/format';

export default function TripHeader({ trip }) {
  const { userById, currentUser, deleteTrip } = useApp();
  const navigate = useNavigate();
  const members = trip.members.map(userById);
  const isAdmin = currentUser?.role === 'admin';
  const isRole = trip.type === 'role';

  const handleDelete = async () => {
    const label = isRole ? 'este rolê' : 'esta viagem';
    if (!confirm(`Apagar ${label}? Todas as despesas e acertos vão junto. Não dá pra desfazer.`)) return;
    await deleteTrip(trip.id);
    navigate('/');
  };

  return (
    <header className="pt-4 md:pt-0">
      <div className="flex items-center justify-end gap-2">
        {isAdmin && (
          <button
            aria-label={isRole ? 'Apagar rolê' : 'Apagar viagem'}
            onClick={handleDelete}
            className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-muted-light hover:text-accent-bright hover:bg-accent/10 transition-colors"
          >
            <Trash2 size={17} />
          </button>
        )}
        <button
          aria-label="Todas as viagens"
          onClick={() => navigate('/viagens')}
          className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-muted-light hover:text-white transition-colors"
        >
          <Settings size={18} />
        </button>
      </div>
      <h1 className="mt-3 text-3xl md:text-4xl font-extrabold tracking-tight">
        {trip.emoji} {trip.name}
      </h1>
      <div className="mt-2 flex items-center justify-between">
        <p className="text-sm text-muted">
          <span className={`font-bold ${isRole ? 'text-accent-bright' : 'text-muted-light'}`}>{tripTypeLabel(trip.type)}</span>{' · '}
          {trip.members.length} {isRole ? 'confirmados' : 'membros'} · {formatDateRange(trip.startDate, trip.endDate)}
          {trip.startTime && ` · ${trip.startTime}`}
        </p>
        <AvatarStack users={members} max={4} />
      </div>
      {trip.description && (
        <p className="mt-2.5 text-sm text-muted-light bg-white/5 border border-white/5 rounded-2xl px-4 py-3">
          {trip.description}
        </p>
      )}
    </header>
  );
}
