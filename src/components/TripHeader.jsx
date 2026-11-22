/** Header da viagem/rolê: nome, membros + datas/hora, descrição, avatares.
 *  Admin vê também o botão de apagar (lixeira). */
import { Flag, Settings, Trash2, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AvatarStack from './AvatarStack';
import PendingBell from './PendingBell';
import { useApp } from '../context/AppContext';
import { formatDateRange, tripTypeLabel } from '../lib/format';

export default function TripHeader({ trip, abrirPendencias = false, onAbriuPendencias }) {
  const { userById, currentUser, deleteTrip, setTripClosed } = useApp();
  const navigate = useNavigate();
  const members = trip.members.map(userById);
  const isAdmin = currentUser?.role === 'admin';
  const podeEncerrar = !trip.closedAt && (isAdmin || trip.createdBy === currentUser?.id);

  const handleClose = async () => {
    const label = trip.type === 'role' ? 'o rolê' : 'a viagem';
    if (!confirm(`Encerrar ${label}? Ninguém lança despesa nova, os acertos continuam valendo e sai o ranking final.`)) return;
    try {
      await setTripClosed(trip.id, true);
      navigate(`/viagem/${trip.id}/ranking?encerrada=1`);
    } catch (err) {
      alert(err.message);
    }
  };
  const isRole = trip.type === 'role';

  const handleDelete = async () => {
    const label = isRole ? 'este rolê' : 'esta viagem';
    if (!confirm(`Apagar ${label}? Todas as despesas e acertos vão junto. Não dá pra desfazer.`)) return;
    navigate('/', { replace: true }); // sai da rota da viagem ANTES de apagar
    await deleteTrip(trip.id);
  };

  return (
    <header className="pt-4 md:pt-0">
      <div className="flex items-center gap-2">
        {/* pendências: pagamentos para você confirmar */}
        <PendingBell abrir={abrirPendencias} onAbriu={onAbriuPendencias} />
        <span className="flex-1" />
        {podeEncerrar && (
          <button
            aria-label={trip.type === 'role' ? 'Encerrar rolê' : 'Encerrar viagem'}
            title="Encerrar e ver o ranking final"
            onClick={handleClose}
            className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-muted-light hover:text-white transition-colors"
          >
            <Flag size={16} />
          </button>
        )}
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
          aria-label="Membros"
          onClick={() => navigate(`/viagem/${trip.id}/membros`)}
          className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-muted-light hover:text-white transition-colors"
        >
          <UserPlus size={17} />
        </button>
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
          {trip.closedAt && (
            <span className="mr-1.5 px-2 py-0.5 rounded-full bg-amber-400/15 text-amber-300 text-[10px] font-extrabold uppercase tracking-wide">
              Encerrada
            </span>
          )}
          <span className={`font-bold ${isRole ? 'text-accent-bright' : 'text-muted-light'}`}>{tripTypeLabel(trip.type)}</span>{' · '}
          {trip.members.length} {isRole ? 'confirmados' : 'membros'} · {formatDateRange(trip.startDate, trip.endDate)}
          {trip.startTime && ` · ${trip.startTime}`}
        </p>
        <button aria-label="Ver membros" onClick={() => navigate(`/viagem/${trip.id}/membros`)}>
          <AvatarStack users={members} max={4} />
        </button>
      </div>
      {trip.description && (
        <p className="mt-2.5 text-sm text-muted-light bg-white/5 border border-white/5 rounded-2xl px-4 py-3">
          {trip.description}
        </p>
      )}
    </header>
  );
}
