/**
 * Despesas - tela só das despesas da viagem/rolê selecionado: resumo
 * (total gasto, sua parte, você pagou), busca, filtro e a lista agrupada
 * pelo dia da despesa. Tocar numa despesa abre os detalhes.
 */
import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PlusCircle, Search, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useTripSummary } from '../hooks/useTripSummary';
import { ActivityItem } from '../components/ActivityList';
import Fab from '../components/Fab';
import { categoryOf } from '../lib/categories';
import { computeShares } from '../lib/splitEngine';
import { dayLabel, formatCents, formatCentsAbs, todayISO } from '../lib/format';

const FILTERS = [
  { id: 'all', label: 'Todas' },
  { id: 'mine', label: 'Com você' },
  { id: 'paid', label: 'Você pagou' },
];

/** minúsculas e sem acento, para a busca achar "agua" em "Água" */
const normalize = (text = '') =>
  text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();

const dayOf = (e) => e.date ?? todayISO(e.createdAt);

export default function ExpensesPage() {
  const { trips, selectedTripId, setSelectedTripId, currentUser, userById } = useApp();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const { trip, expenses } = useTripSummary(selectedTripId);
  const me = currentUser.id;

  const stats = useMemo(() => {
    let total = 0;
    let myPart = 0;
    let iPaid = 0;
    for (const e of expenses) {
      total += e.amount;
      if (e.participants.includes(me)) myPart += computeShares(e)[me] ?? 0;
      if (e.paidBy === me) iPaid += e.amount;
    }
    return { total, myPart, iPaid };
  }, [expenses, me]);

  const { groups, count } = useMemo(() => {
    const q = normalize(query.trim());
    const list = expenses
      .filter((e) => {
        if (filter === 'mine' && !e.participants.includes(me)) return false;
        if (filter === 'paid' && e.paidBy !== me) return false;
        if (!q) return true;
        const haystack = normalize(
          `${e.description} ${categoryOf(e.category).label} ${userById(e.paidBy).name}`
        );
        return haystack.includes(q);
      })
      .sort((a, b) => dayOf(b).localeCompare(dayOf(a)) || new Date(b.createdAt) - new Date(a.createdAt));

    const byDay = [];
    for (const e of list) {
      const day = dayOf(e);
      const last = byDay[byDay.length - 1];
      if (last && last.day === day) {
        last.items.push(e);
        last.total += e.amount;
      } else byDay.push({ day, items: [e], total: e.amount });
    }
    return { groups: byDay, count: list.length };
  }, [expenses, filter, query, me, userById]);

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

  const addExpense = () => navigate(`/viagem/${trip.id}/nova-despesa`);

  return (
    <div className="pt-4 md:pt-0">
      <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">Despesas</h1>
      <p className="mt-1 text-sm text-muted">
        {trip.emoji} {trip.name}
      </p>

      {/* troca de viagem/rolê */}
      {trips.length > 1 && (
        <div className="flex gap-2 mt-4 overflow-x-auto pb-1 -mx-5 px-5 md:mx-0 md:px-0">
          {trips.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedTripId(t.id)}
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

      {/* resumo */}
      <section className="card-gradient p-5 mt-4">
        <p className="label-caps">Total gasto</p>
        <p className="mt-1.5 text-3xl md:text-4xl font-extrabold tracking-tight tabular-nums">
          {formatCentsAbs(stats.total)}
        </p>
        <p className="mt-0.5 text-xs text-muted">
          {expenses.length} {expenses.length === 1 ? 'despesa' : 'despesas'}
          {trip.members.length > 0 && stats.total > 0 && (
            <> · média de {formatCentsAbs(Math.round(stats.total / trip.members.length))} por pessoa ({trip.members.length})</>
          )}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-black/20 px-3.5 py-2.5">
            <p className="label-caps">Sua parte</p>
            <p className="mt-0.5 font-extrabold text-accent-bright tabular-nums">{formatCentsAbs(stats.myPart)}</p>
          </div>
          <div className="rounded-2xl bg-black/20 px-3.5 py-2.5">
            <p className="label-caps">Você pagou</p>
            <p className="mt-0.5 font-extrabold text-positive tabular-nums">{formatCentsAbs(stats.iPaid)}</p>
          </div>
        </div>
      </section>

      {expenses.length === 0 ? (
        <div className="card-flat p-6 mt-5 text-center">
          <p className="text-sm text-muted">Nenhuma despesa registrada ainda.</p>
          {!trip.closedAt && (
            <button onClick={addExpense} className="mt-3 inline-flex items-center gap-2 text-accent-bright font-semibold text-sm">
              <PlusCircle size={17} /> Adicionar despesa
            </button>
          )}
        </div>
      ) : (
        <>
          {/* busca */}
          <div className="relative mt-5">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar despesa"
              className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-11 py-3 text-sm placeholder:text-muted focus:outline-none focus:border-accent/60 [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                aria-label="Limpar busca"
                className="hit-area absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-muted-light hover:text-white"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* filtro */}
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex rounded-full bg-white/5 p-1">
              {FILTERS.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setFilter(f.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition ${
                    filter === f.id ? 'bg-accent text-white' : 'text-muted hover:text-white'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <span className="text-xs font-semibold text-muted whitespace-nowrap">
              {count} {count === 1 ? 'despesa' : 'despesas'}
            </span>
          </div>

          {/* lista por dia */}
          <div key={`${filter}-${trip.id}`}>
            {groups.length === 0 ? (
              <div className="card-flat p-5 mt-5 text-sm text-muted text-center">
                Nenhuma despesa encontrada.
              </div>
            ) : (
              groups.map((g) => (
                <section key={g.day} className="mt-5">
                  <div className="flex items-center justify-between">
                    <span className="inline-block px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest text-accent-bright bg-accent/10 border border-accent/20">
                      {dayLabel(g.day)}
                    </span>
                    <span className="text-xs font-semibold text-muted tabular-nums">{formatCents(g.total)}</span>
                  </div>
                  <ul className="mt-3 space-y-2.5">
                    {g.items.map((e) => (
                      <ActivityItem key={e.id} item={e} />
                    ))}
                  </ul>
                </section>
              ))
            )}
          </div>
        </>
      )}

      {!trip.closedAt && <Fab onClick={addExpense} />}
    </div>
  );
}
