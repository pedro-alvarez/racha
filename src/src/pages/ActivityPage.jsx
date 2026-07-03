/**
 * Histórico de Atividades — timeline com filtros por viagem/rolê e por tipo,
 * agrupada por dia (Hoje / Ontem / data), como na referência.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { TimelineItem } from '../components/ActivityList';
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
  const navigate = useNavigate();
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
    `px-4 py-2 rounded-full text-xs font-bold whitespace-nowrap transition shrink-0 ${
      active ? 'bg-accent text-white shadow-fab' : 'bg-white/5 text-muted-light border border-white/10'
    }`;

  return (
    <div className="pt-4 md:pt-0">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="w-9 h-9 rounded-full bg-white/5 flex items-center justify-center text-muted-light hover:text-white md:hidden"
          aria-label="Voltar"
        >
          <ArrowLeft size={17} />
        </button>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Histórico de Atividades</h1>
      </div>

      {/* filtro por tipo */}
      <div className="flex gap-2 mt-5 overflow-x-auto pb-1 -mx-5 px-5 md:mx-0 md:px-0">
        {TYPE_FILTERS.map((f) => (
          <button key={f.id} className={chip(typeFilter === f.id)} onClick={() => setTypeFilter(f.id)}>
            {f.label}
          </button>
        ))}
      </div>

      {/* filtro por viagem/rolê */}
      <div className="flex gap-2 mt-2.5 overflow-x-auto pb-1 -mx-5 px-5 md:mx-0 md:px-0">
        <button className={chip(tripFilter === 'all')} onClick={() => setTripFilter('all')}>
          Todos os grupos
        </button>
        {trips.map((t) => (
          <button key={t.id} className={chip(tripFilter === t.id)} onClick={() => setTripFilter(t.id)}>
            {t.emoji} {t.name}
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
            <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest text-accent-bright bg-accent/10 border border-accent/20">
              {group.label}
            </span>
            <ul className="mt-3">
              {group.items.map((item, i) => (
                <TimelineItem key={item.id} item={item} isLast={i === group.items.length - 1} />
              ))}
            </ul>
          </section>
        ))
      )}
    </div>
  );
}
