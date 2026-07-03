/**
 * Atividade global com filtros:
 * - por viagem (chips no topo — "Todas" ou uma viagem específica)
 * - por tipo (Tudo / Participei / Eu paguei / Dívidas / Acertos)
 * Agrupada por dia (Hoje / Ontem / data).
 */
import { useMemo, useState } from 'react';
import { useApp } from '../context/AppContext';
import { ActivityItem } from '../components/ActivityList';
import { dayLabel } from '../lib/format';

const TYPE_FILTERS = [
  { id: 'all', label: 'Tudo' },
  { id: 'participated', label: 'Participei' },
  { id: 'paid', label: 'Eu paguei' },
  { id: 'owe', label: 'Dívidas' },
  { id: 'settlements', label: 'Acertos' },
];

export default function ActivityPage() {
  const { trips, expensesByTrip, paymentsByTrip, currentUser } = useApp();
  const [tripFilter, setTripFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const groups = useMemo(() => {
    const source = tripFilter === 'all' ? trips : trips.filter((t) => t.id === tripFilter);
    let items = source
      .flatMap((trip) => [
        ...(expensesByTrip[trip.id] ?? []).map((e) => ({ ...e, kind: 'expense', tripName: trip.name })),
        ...(paymentsByTrip[trip.id] ?? []).map((p) => ({ ...p, kind: 'payment', tripName: trip.name })),
      ])
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const me = currentUser?.id;
    items = items.filter((item) => {
      switch (typeFilter) {
        case 'participated':
          return item.kind === 'expense' && item.participants.includes(me);
        case 'paid':
          return item.kind === 'expense' && item.paidBy === me;
        case 'owe':
          return item.kind === 'expense' && item.participants.includes(me) && item.paidBy !== me;
        case 'settlements':
          return item.kind === 'payment';
        default:
          return true;
      }
    });

    // agrupa por dia mantendo a ordem
    const byDay = [];
    for (const item of items) {
      const label = dayLabel(item.createdAt);
      const last = byDay[byDay.length - 1];
      if (last && last.label === label) last.items.push(item);
      else byDay.push({ label, items: [item] });
    }
    return byDay;
  }, [trips, expensesByTrip, paymentsByTrip, tripFilter, typeFilter, currentUser]);

  const chip = (active) =>
    `px-3.5 py-2 rounded-full text-xs font-semibold whitespace-nowrap transition shrink-0 ${
      active ? 'bg-accent text-white' : 'bg-white/5 text-muted-light border border-white/10'
    }`;

  return (
    <div className="pt-4 md:pt-0">
      <h1 className="text-3xl font-extrabold tracking-tight">Atividade</h1>

      {/* filtro por viagem */}
      <div className="flex gap-2 mt-5 overflow-x-auto pb-1 -mx-5 px-5 md:mx-0 md:px-0">
        <button className={chip(tripFilter === 'all')} onClick={() => setTripFilter('all')}>
          Todas as viagens
        </button>
        {trips.map((t) => (
          <button key={t.id} className={chip(tripFilter === t.id)} onClick={() => setTripFilter(t.id)}>
            {t.emoji} {t.name}
          </button>
        ))}
      </div>

      {/* filtro por tipo */}
      <div className="flex gap-2 mt-2.5 overflow-x-auto pb-1 -mx-5 px-5 md:mx-0 md:px-0">
        {TYPE_FILTERS.map((f) => (
          <button key={f.id} className={chip(typeFilter === f.id)} onClick={() => setTypeFilter(f.id)}>
            {f.label}
          </button>
        ))}
      </div>

      {groups.length === 0 ? (
        <div className="card-flat p-5 mt-5 text-sm text-muted text-center">
          Nada encontrado com esses filtros.
        </div>
      ) : (
        groups.map((group) => (
          <section key={group.label} className="mt-5">
            <span className="inline-block px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest text-accent-bright bg-accent/10">
              {group.label}
            </span>
            <ul className="mt-2.5 space-y-2.5">
              {group.items.map((item) => (
                <ActivityItem key={item.id} item={item} />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
