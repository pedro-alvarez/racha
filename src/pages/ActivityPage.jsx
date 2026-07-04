/**
 * Histórico de Atividades — timeline com filtros por viagem/rolê e por tipo,
 * agrupada por dia (Hoje / Ontem / data), como na referência.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ArrowLeftRight, HandCoins, Sparkles, Users, Wallet } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { TimelineItem } from '../components/ActivityList';
import { dayLabel } from '../lib/format';

const TYPE_FILTERS = [
  { id: 'all', label: 'Tudo', Icon: Sparkles },
  { id: 'participated', label: 'Participei', Icon: Users },
  { id: 'paid', label: 'Paguei', Icon: Wallet },
  { id: 'owe', label: 'Dívidas', Icon: HandCoins },
  { id: 'settlements', label: 'Acertos', Icon: ArrowLeftRight },
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

  const typeIndex = TYPE_FILTERS.findIndex((f) => f.id === typeFilter);

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

      {/* filtro por tipo: controle segmentado com pílula deslizante */}
      <div className="relative mt-5 p-1 rounded-2xl bg-white/5 border border-white/10 grid grid-cols-5">
        <span
          aria-hidden="true"
          className="absolute top-1 bottom-1 rounded-xl bg-gradient-to-br from-accent to-accent-bright shadow-fab transition-[left] duration-300 ease-out"
          style={{
            width: 'calc((100% - 8px) / 5)',
            left: `calc(4px + ${typeIndex} * (100% - 8px) / 5)`,
          }}
        />
        {TYPE_FILTERS.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTypeFilter(id)}
            className={`relative z-10 flex flex-col items-center gap-1 py-2 rounded-xl transition-colors duration-300 ${
              typeFilter === id ? 'text-white' : 'text-muted hover:text-white'
            }`}
          >
            <Icon size={15} />
            <span className="text-[10px] font-bold">{label}</span>
          </button>
        ))}
      </div>

      {/* filtro por viagem/rolê: chips que expandem ao selecionar */}
      <div className="flex gap-2 mt-3 overflow-x-auto pb-1 -mx-5 px-5 md:mx-0 md:px-0">
        <button
          onClick={() => setTripFilter('all')}
          className={`px-3.5 py-2 rounded-full text-xs font-bold whitespace-nowrap transition-all duration-300 shrink-0 ${
            tripFilter === 'all'
              ? 'bg-accent text-white shadow-fab'
              : 'bg-white/5 text-muted-light border border-white/10 hover:text-white'
          }`}
        >
          Todos
        </button>
        {trips.map((t) => {
          const active = tripFilter === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTripFilter(active ? 'all' : t.id)}
              title={t.name}
              className={`flex items-center px-3 py-2 rounded-full text-xs font-bold transition-all duration-300 shrink-0 ${
                active
                  ? 'bg-accent text-white shadow-fab'
                  : 'bg-white/5 text-muted-light border border-white/10 hover:text-white'
              }`}
            >
              <span className="text-sm leading-none">{t.emoji}</span>
              <span
                className={`overflow-hidden whitespace-nowrap transition-all duration-300 ${
                  active ? 'max-w-[180px] opacity-100 ml-1.5' : 'max-w-0 opacity-0 ml-0'
                }`}
              >
                {t.name}
              </span>
            </button>
          );
        })}
      </div>

      {/* key nos filtros faz a lista reanimar a cada mudança */}
      <div key={`${typeFilter}-${tripFilter}`}>
        {groups.length === 0 ? (
          <div className="card-flat p-5 mt-5 text-sm text-muted text-center page-enter">
            Nada encontrado com esses filtros.
          </div>
        ) : (
          groups.map((group) => (
            <section key={group.label} className="mt-5">
              <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest text-accent-bright bg-accent/10 border border-accent/20">
                {group.label}
              </span>
              <ul className="mt-3 stagger">
                {group.items.map((item, i) => (
                  <TimelineItem key={item.id} item={item} isLast={i === group.items.length - 1} />
                ))}
              </ul>
            </section>
          ))
        )}
      </div>
    </div>
  );
}
