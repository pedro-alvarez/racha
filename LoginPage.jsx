/**
 * Visão Geral da viagem — tela principal (referência visual).
 * Header + saldo + dots de carrossel + Plano de Acerto + Atividade Recente + FAB.
 */
import { useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ChevronRight, PlusCircle } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useTripSummary } from '../hooks/useTripSummary';
import TripHeader from '../components/TripHeader';
import BalanceCard from '../components/BalanceCard';
import TripDots from '../components/TripDots';
import SettlementPlan from '../components/SettlementPlan';
import ActivityList from '../components/ActivityList';
import Fab from '../components/Fab';

export default function OverviewPage() {
  const { tripId: routeTripId } = useParams();
  const { trips, selectedTripId, setSelectedTripId } = useApp();
  const navigate = useNavigate();

  // /viagem/:id sincroniza a viagem selecionada; "/" usa a última selecionada.
  useEffect(() => {
    if (routeTripId && routeTripId !== selectedTripId) setSelectedTripId(routeTripId);
  }, [routeTripId, selectedTripId, setSelectedTripId]);

  const tripId = routeTripId ?? selectedTripId;
  const { trip, simplified, pairwise, activity, myBalance } = useTripSummary(tripId);

  if (!trip) {
    return (
      <div className="pt-16 text-center">
        <p className="text-muted">Nenhuma viagem por aqui ainda.</p>
        <Link
          to="/viagens/nova"
          className="mt-4 inline-flex items-center gap-2 text-accent-bright font-semibold"
        >
          <PlusCircle size={18} /> Criar primeira viagem
        </Link>
      </div>
    );
  }

  return (
    <div>
      <TripHeader trip={trip} />
      <BalanceCard tripId={trip.id} balance={myBalance} />
      <TripDots
        trips={trips}
        selectedId={trip.id}
        onSelect={(id) => {
          setSelectedTripId(id);
          navigate(`/viagem/${id}`);
        }}
      />

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
