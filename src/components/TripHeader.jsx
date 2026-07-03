/** Header da viagem: badge sync, nome, membros + datas, avatares, engrenagem. */
import { Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AvatarStack from './AvatarStack';
import { useApp } from '../context/AppContext';
import { formatDateRange, tripTypeLabel } from '../lib/format';

export default function TripHeader({ trip }) {
  const { userById } = useApp();
  const navigate = useNavigate();
  const members = trip.members.map(userById);

  return (
    <header className="pt-4 md:pt-0">
      <div className="flex items-center justify-end">
        <button
          aria-label="Configurações da viagem"
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
          <span className={`font-bold ${trip.type === 'role' ? 'text-accent-bright' : 'text-muted-light'}`}>{tripTypeLabel(trip.type)}</span>{' · '}
          {trip.members.length} membros · {formatDateRange(trip.startDate, trip.endDate)}
        </p>
        <AvatarStack users={members} max={4} />
      </div>
    </header>
  );
}
