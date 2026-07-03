/**
 * Visão Geral — carrossel de viagens com gestos:
 * - swipe (arrastar pro lado) no celular e no mouse
 * - setas laterais no desktop
 * - chips com nome das viagens (em vez de bolinhas minúsculas)
 */
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, ChevronRight, PlusCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useTripSummary } from '../hooks/useTripSummary';
import TripHeader from '../components/TripHeader';
import BalanceCard from '../components/BalanceCard';
import SettlementPlan from '../components/SettlementPlan';
import ActivityList from '../components/ActivityList';
import Fab from '../components/Fab';

export default function OverviewPage() {
  const { tripId: routeTripId } = useParams();
  const { trips, selectedTripId, setSelectedTripId } = useApp();
  const navigate = useNavigate();
  const [direction, setDirection] = useState(0); // -1 esquerda, 1 direita
  const touchStart = useRef(null);

  useEffect(() => {
    if (routeTripId && routeTripId !== selectedTripId) setSelectedTripId(routeTripId);
  }, [routeTripId, selectedTripId, setSelectedTripId]);

  const tripId = routeTripId ?? selectedTripId;
  const { trip, simplified, pairwise, activity, myBalance } = useTripSummary(tripId);

  if (!trip) {
    return (
      <div className="pt-16 text-center">
        <p className="text-muted">Nenhuma viagem por aqui ainda.</p>
        <Link to="/viagens/nova" className="mt-4 inline-flex items-center gap-2 text-accent-bright font-semibold">
          <PlusCircle size={18} /> Criar primeira viagem
        </Link>
      </div>
    );
  }

  const index = Math.max(0, trips.findIndex((t) => t.id === trip.id));

  const goTo = (i, dir) => {
    if (trips.length < 2) return;
    const next = trips[(i + trips.length) % trips.length];
    setDirection(dir);
    setSelectedTripId(next.id);
    navigate(`/viagem/${next.id}`, { replace: true });
  };

  /* gestos: swipe horizontal (ignora se o movimento for mais vertical) */
  const onStart = (x, y) => (touchStart.current = { x, y });
  const onEnd = (x, y) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const dx = x - start.x;
    const dy = y - start.y;
    if (Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy) * 1.4) {
      dx < 0 ? goTo(index + 1, 1) : goTo(index - 1, -1);
    }
  };

  return (
    <div>
      {/* região deslizável: header + saldo */}
      <div className="relative">
        <div
          key={trip.id}
          className={direction === 0 ? '' : direction > 0 ? 'slide-in-right' : 'slide-in-left'}
          onTouchStart={(e) => onStart(e.touches[0].clientX, e.touches[0].clientY)}
          onTouchEnd={(e) => onEnd(e.changedTouches[0].clientX, e.changedTouches[0].clientY)}
          onPointerDown={(e) => e.pointerType === 'mouse' && onStart(e.clientX, e.clientY)}
          onPointerUp={(e) => e.pointerType === 'mouse' && onEnd(e.clientX, e.clientY)}
          style={{ touchAction: 'pan-y' }}
        >
          <TripHeader trip={trip} />
          <BalanceCard tripId={trip.id} balance={myBalance} />
        </div>

        {/* setas (desktop e telas maiores) */}
        {trips.length > 1 && (
          <>
            <button
              onClick={() => goTo(index - 1, -1)}
              aria-label="Viagem anterior"
              className="hidden sm:flex absolute -left-4 md:-left-6 top-1/2 w-9 h-9 rounded-full bg-white/5 border border-white/10 items-center justify-center text-muted-light hover:text-white hover:bg-white/10 transition"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              onClick={() => goTo(index + 1, 1)}
              aria-label="Próxima viagem"
              className="hidden sm:flex absolute -right-4 md:-right-6 top-1/2 w-9 h-9 rounded-full bg-white/5 border border-white/10 items-center justify-center text-muted-light hover:text-white hover:bg-white/10 transition"
            >
              <ChevronRight size={18} />
            </button>
          </>
        )}
      </div>

      {/* seletor de viagens: chips com nome (substitui as bolinhas) */}
      {trips.length > 1 && (
        <div className="flex gap-2 mt-4 overflow-x-auto pb-1 -mx-5 px-5 md:mx-0 md:px-0 md:justify-center">
          {trips.map((t, i) => (
            <button
              key={t.id}
              onClick={() => goTo(i, i > index ? 1 : -1)}
              className={`px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition shrink-0 ${
                t.id === trip.id
                  ? 'bg-accent text-white shadow-fab'
                  : 'bg-white/5 text-muted-light border border-white/10 hover:text-white'
              }`}
            >
              {t.emoji} {t.name}
            </button>
          ))}
        </div>
      )}

      <div className="mt-2 text-right">
        <Link to="/viagens" className="text-xs font-semibold text-muted hover:text-white inline-flex items-center gap-0.5">
          Todas as viagens <ChevronRight size={14} />
        </Link>
      </div>

      <SettlementPlan simplified={simplified} pairwise={pairwise} />

      <section className="mt-7">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Atividade Recente</h2>
          <Link to="/atividade" className="text-xs font-semibold text-accent-bright">
            Ver tudo
          </Link>
        </div>
        <ActivityList items={activity} limit={5} emptyText="Nenhum gasto registrado ainda." />
      </section>

      <Fab onClick={() => navigate(`/viagem/${trip.id}/nova-despesa`)} />
    </div>
  );
}
