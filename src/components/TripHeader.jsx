/** Header da viagem/rolê: nome, membros + datas/hora, descrição, avatares.
 *  No topo: sininho de pendências e o menu "⋯" (membros, todas as viagens e,
 *  para quem pode, encerrar e apagar). */
import { useEffect, useRef, useState } from 'react';
import { Flag, LayoutList, MoreHorizontal, Trash2, UserPlus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import AvatarStack from './AvatarStack';
import PendingBell from './PendingBell';
import { useApp } from '../context/AppContext';
import { formatDateRange, tripTypeLabel } from '../lib/format';

/** Menu que abre do botão "⋯": fecha ao tocar fora, no Esc ou ao escolher. */
function TripMenu({ items }) {
  const [open, setOpen] = useState(false);
  const box = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const fora = (e) => !box.current?.contains(e.target) && setOpen(false);
    const esc = (e) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', fora);
    window.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('pointerdown', fora);
      window.removeEventListener('keydown', esc);
    };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button
        aria-label="Opções da viagem"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className={`hit-area relative w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
          open ? 'bg-white/15 text-white' : 'bg-white/5 text-muted-light hover:text-white'
        }`}
      >
        <MoreHorizontal size={18} />
      </button>
      {open && (
        <div
          role="menu"
          className="menu-in absolute right-0 top-11 z-40 w-56 rounded-2xl bg-ink-soft border border-white/10 shadow-card p-1.5"
        >
          {items.map(({ label, Icon, onSelect, danger }) => (
            <button
              key={label}
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onSelect();
              }}
              className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-left transition-colors ${
                danger ? 'text-red-400 hover:bg-red-500/10' : 'text-white hover:bg-white/5'
              }`}
            >
              <Icon size={17} className={danger ? '' : 'text-muted-light'} />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

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
        <TripMenu
          items={[
            { label: 'Membros', Icon: UserPlus, onSelect: () => navigate(`/viagem/${trip.id}/membros`) },
            { label: 'Todas as viagens', Icon: LayoutList, onSelect: () => navigate('/viagens') },
            ...(podeEncerrar ? [{ label: isRole ? 'Encerrar rolê' : 'Encerrar viagem', Icon: Flag, onSelect: handleClose }] : []),
            ...(isAdmin ? [{ label: isRole ? 'Apagar rolê' : 'Apagar viagem', Icon: Trash2, onSelect: handleDelete, danger: true }] : []),
          ]}
        />
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
