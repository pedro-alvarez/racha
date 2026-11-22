/**
 * Visão Geral - carrossel de viagens com gestos:
 * - swipe (arrastar pro lado) no celular e no mouse
 * - setas laterais no desktop
 * - chips com nome das viagens (em vez de bolinhas minúsculas)
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ChevronRight, PartyPopper, PlusCircle, Receipt, Trophy } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useTripSummary } from '../hooks/useTripSummary';
import TripHeader from '../components/TripHeader';
import BalanceCard from '../components/BalanceCard';
import SettlementPlan from '../components/SettlementPlan';
import ActivityList from '../components/ActivityList';
import Fab from '../components/Fab';
import { formatCents, firstName } from '../lib/format';
import { computeRanking } from '../lib/ranking';
import Avatar from '../components/Avatar';

export default function OverviewPage() {
  const { tripId: routeTripId } = useParams();
  const { trips, openEvents, selectedTripId, setSelectedTripId, userById } = useApp();
  const navigate = useNavigate();
  const [direction, setDirection] = useState(0); // -1 esquerda, 1 direita
  const touchStart = useRef(null);
  const activeChipRef = useRef(null);
  // aviso do celular "fulano diz que te pagou" abre direto as pendências (#/?pendencias=1)
  const [params, setParams] = useSearchParams();
  const abrirPendencias = params.get('pendencias') === '1';
  const limparParam = useCallback(() => setParams({}, { replace: true }), [setParams]);

  useEffect(() => {
    if (routeTripId && routeTripId !== selectedTripId) setSelectedTripId(routeTripId);
  }, [routeTripId, selectedTripId, setSelectedTripId]);

  const tripId = routeTripId ?? selectedTripId;
  const { trip, settlements, activity, myBalance, expenses, totalSpent } = useTripSummary(tripId);

  // mantém o chip da viagem ativa visível na faixa rolável
  useEffect(() => {
    activeChipRef.current?.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }, [trip?.id]);

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
          <TripHeader trip={trip} abrirPendencias={abrirPendencias} onAbriuPendencias={limparParam} />
          <BalanceCard tripId={trip.id} balance={myBalance} />
        </div>
      </div>

      {/* indicador de páginas: bolinhas animadas (a ativa vira um traço rosa) */}
      {trips.length > 1 && (
        <div className="flex justify-center mt-1">
          {trips.map((t, i) => (
            // o pontinho é pequeno; o botão em volta dá uma área de toque confortável
            <button
              key={t.id}
              onClick={() => goTo(i, i > index ? 1 : -1)}
              aria-label={`Ir para ${t.name}`}
              className="group hit-y relative px-[3px] py-3"
            >
              <span
                className={`block h-1.5 rounded-full transition-[width,background-color] duration-300 ${
                  i === index ? 'w-7 bg-accent' : 'w-1.5 bg-white/15 group-hover:bg-white/35'
                }`}
              />
            </button>
          ))}
        </div>
      )}

      {/* seletor de viagens: chips com nome (substitui as bolinhas) */}
      {trips.length > 1 && (
        <div className="flex gap-2 mt-1 overflow-x-auto pb-1 -mx-5 px-5 md:mx-0 md:px-0 md:justify-center">
          {trips.map((t, i) => (
            <button
              key={t.id}
              ref={t.id === trip.id ? activeChipRef : null}
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
        <Link to="/viagens" className="hit-y relative text-xs font-semibold text-muted hover:text-white inline-flex items-center gap-0.5">
          Todas as viagens <ChevronRight size={14} />
        </Link>
      </div>

      {/* atalho para a tela de despesas */}
      <Link
        to="/despesas"
        className="card-flat p-4 mt-4 flex items-center gap-3.5 hover:bg-white/5 transition"
      >
        <span className="w-11 h-11 rounded-2xl bg-white/5 text-accent-bright flex items-center justify-center shrink-0">
          <Receipt size={19} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm">Despesas</p>
          <p className="text-xs text-muted mt-0.5">
            {expenses.length} {expenses.length === 1 ? 'despesa' : 'despesas'} · {formatCents(totalSpent)}
          </p>
        </div>
        <ChevronRight size={16} className="text-muted shrink-0" />
      </Link>

      {/* ranking: top 3 de quem mais gastou (consumiu) */}
      {totalSpent > 0 && (() => {
        const top = computeRanking(expenses, trip.members).byConsumed.slice(0, 3);
        return (
          <Link
            to={`/viagem/${trip.id}/ranking`}
            className="card-flat p-4 mt-3 flex items-center gap-3.5 hover:bg-white/5 transition"
          >
            <span className="w-11 h-11 rounded-2xl bg-amber-400/15 text-amber-300 flex items-center justify-center shrink-0">
              <Trophy size={19} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm">{trip.closedAt ? 'Ranking final' : 'Ranking'}</p>
              <p className="text-xs text-muted mt-0.5 truncate">
                {top.map((p, i) => `${['🥇', '🥈', '🥉'][i]} ${firstName(userById(p.id).name)}`).join('  ')}
              </p>
            </div>
            <div className="flex -space-x-2 shrink-0">
              {top.map((p) => (
                <Avatar key={p.id} user={userById(p.id)} size="sm" ring />
              ))}
            </div>
            <ChevronRight size={16} className="text-muted shrink-0" />
          </Link>
        );
      })()}

      {/* Rolês abertos esperando confirmação */}
      {openEvents.length > 0 && (
        <Link
          to="/viagens"
          className="card-flat p-4 mt-4 flex items-center gap-3.5 border-accent/25 hover:bg-white/5 transition"
        >
          <span className="w-11 h-11 rounded-2xl bg-accent/15 text-accent-bright flex items-center justify-center shrink-0">
            <PartyPopper size={19} />
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm">
              {openEvents.length === 1
                ? `Rolê aberto: ${openEvents[0].emoji} ${openEvents[0].name}`
                : `${openEvents.length} rolês abertos te esperando`}
            </p>
            <p className="text-xs text-muted mt-0.5">Toque pra ver e confirmar presença</p>
          </div>
          <ChevronRight size={16} className="text-muted shrink-0" />
        </Link>
      )}

      <SettlementPlan settlements={settlements} />

      <section className="mt-7">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold">Atividade Recente</h2>
          <Link to="/atividade" className="hit-y relative text-xs font-semibold text-accent-bright">
            Ver tudo
          </Link>
        </div>
        <ActivityList items={activity} limit={5} emptyText="Nenhum gasto registrado ainda." />
      </section>

      {!trip.closedAt && <Fab onClick={() => navigate(`/viagem/${trip.id}/nova-despesa`)} />}
    </div>
  );
}
