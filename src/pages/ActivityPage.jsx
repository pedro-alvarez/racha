/** Atividade global: histórico de todas as viagens, mais recente primeiro. */
import { useApp } from '../context/AppContext';
import ActivityList from '../components/ActivityList';

export default function ActivityPage() {
  const { trips, expensesByTrip, paymentsByTrip } = useApp();

  const items = trips
    .flatMap((trip) => [
      ...(expensesByTrip[trip.id] ?? []).map((e) => ({ ...e, kind: 'expense', tripName: trip.name })),
      ...(paymentsByTrip[trip.id] ?? []).map((p) => ({ ...p, kind: 'payment', tripName: trip.name })),
    ])
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  return (
    <div className="pt-4 md:pt-0">
      <h1 className="text-3xl font-extrabold tracking-tight">Atividade</h1>
      <p className="mt-2 text-sm text-muted">Tudo o que rolou em todas as viagens.</p>
      <ActivityList items={items} emptyText="Nenhuma atividade ainda." />
    </div>
  );
}
