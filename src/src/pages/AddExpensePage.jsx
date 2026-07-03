/**
 * Adicionar despesa: descrição, valor, pagador, categoria e 4 modos de divisão
 * (igual, valores fixos, percentual, subconjunto de membros).
 * Toda a validação vem do splitEngine (validateExpense).
 */
import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CATEGORIES } from '../lib/categories';
import { SPLIT_TYPES, validateExpense } from '../lib/splitEngine';
import { parseToCents, formatCents, firstName } from '../lib/format';
import Avatar from '../components/Avatar';

const SPLIT_OPTIONS = [
  { id: SPLIT_TYPES.EQUAL, label: 'Igual' },
  { id: SPLIT_TYPES.FIXED, label: 'Valores' },
  { id: SPLIT_TYPES.PERCENT, label: '%' },
];

export default function AddExpensePage() {
  const { tripId } = useParams();
  const { trips, userById, currentUser, addExpense } = useApp();
  const navigate = useNavigate();

  const trip = trips.find((t) => t.id === tripId);
  const members = useMemo(() => (trip ? trip.members.map(userById) : []), [trip, userById]);

  const [description, setDescription] = useState('');
  const [amountText, setAmountText] = useState('');
  const [paidBy, setPaidBy] = useState(currentUser?.id);
  const [category, setCategory] = useState('comida');
  const [splitType, setSplitType] = useState(SPLIT_TYPES.EQUAL);
  const [participants, setParticipants] = useState(new Set(trip?.members ?? []));
  const [shareTexts, setShareTexts] = useState({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (!trip) return null;

  const amount = parseToCents(amountText);

  const toggleParticipant = (id) => {
    const next = new Set(participants);
    next.has(id) ? next.delete(id) : next.add(id);
    setParticipants(next);
  };

  const buildShares = () => {
    const ids = [...participants];
    if (splitType === SPLIT_TYPES.FIXED) {
      return Object.fromEntries(ids.map((id) => [id, parseToCents(shareTexts[id])]));
    }
    if (splitType === SPLIT_TYPES.PERCENT) {
      return Object.fromEntries(ids.map((id) => [id, parseFloat(shareTexts[id]) || 0]));
    }
    return {};
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!description.trim()) return setError('Descreva a despesa.');

    const expense = {
      description: description.trim(),
      amount,
      paidBy,
      category,
      splitType,
      participants: [...participants],
      shares: buildShares(),
    };

    const { valid, error: validationError } = validateExpense(expense);
    if (!valid) {
      // mensagens do engine vêm em centavos — formata para exibir
      return setError(validationError.replace(/\((\d+)\)/g, (_, c) => `(${formatCents(+c)})`));
    }

    setSaving(true);
    await addExpense(tripId, expense);
    navigate(`/viagem/${tripId}`);
  };

  const inputCls =
    'w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm placeholder:text-muted focus:outline-none focus:border-accent/60';

  const fixedSum = [...participants].reduce((acc, id) => acc + parseToCents(shareTexts[id]), 0);
  const percentSum = [...participants].reduce((acc, id) => acc + (parseFloat(shareTexts[id]) || 0), 0);

  return (
    <div className="pt-4 md:pt-0">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted hover:text-white">
        <ArrowLeft size={16} /> {trip.name}
      </button>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight">Nova despesa</h1>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div>
          <label className="label-caps">Descrição</label>
          <input
            className={`${inputCls} mt-2`}
            placeholder="Ex.: Jantar no quiosque"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <label className="label-caps">Valor</label>
          <div className="relative mt-2">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted font-semibold">R$</span>
            <input
              inputMode="decimal"
              className={`${inputCls} pl-11 text-lg font-bold`}
              placeholder="0,00"
              value={amountText}
              onChange={(e) => setAmountText(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="label-caps">Quem pagou</label>
          <div className="flex gap-2 mt-2 overflow-x-auto pb-1">
            {members.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setPaidBy(m.id)}
                className={`flex items-center gap-2 px-3 py-2 rounded-full border text-sm shrink-0 transition ${
                  paidBy === m.id ? 'border-accent bg-accent/15 font-semibold' : 'border-white/10 bg-white/5 text-muted-light'
                }`}
              >
                <Avatar user={m} size="xs" />
                {firstName(m.name)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label-caps">Categoria</label>
          <div className="flex gap-2 mt-2 flex-wrap">
            {Object.entries(CATEGORIES).map(([key, { label, Icon }]) => (
              <button
                key={key}
                type="button"
                onClick={() => setCategory(key)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-full border text-xs transition ${
                  category === key ? 'border-accent bg-accent/15 font-semibold text-white' : 'border-white/10 bg-white/5 text-muted-light'
                }`}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label className="label-caps">Como dividir</label>
            <div className="flex rounded-full bg-white/5 p-1">
              {SPLIT_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSplitType(opt.id)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition ${
                    splitType === opt.id ? 'bg-accent text-white' : 'text-muted'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <ul className="mt-3 space-y-2">
            {members.map((m) => {
              const active = participants.has(m.id);
              return (
                <li key={m.id} className={`card-flat p-3 flex items-center gap-3 ${active ? '' : 'opacity-45'}`}>
                  <button
                    type="button"
                    onClick={() => toggleParticipant(m.id)}
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${
                      active ? 'bg-accent' : 'bg-white/10'
                    }`}
                    aria-label={`Incluir ${m.name}`}
                  >
                    {active && <Check size={13} />}
                  </button>
                  <Avatar user={m} size="sm" />
                  <p className="flex-1 text-sm font-semibold truncate">{firstName(m.name)}</p>
                  {active && splitType === SPLIT_TYPES.EQUAL && participants.size > 0 && (
                    <p className="text-xs text-muted">{formatCents(Math.floor(amount / participants.size))}</p>
                  )}
                  {active && splitType !== SPLIT_TYPES.EQUAL && (
                    <div className="relative w-28">
                      <input
                        inputMode="decimal"
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-3 pr-8 py-2 text-sm text-right focus:outline-none focus:border-accent/60"
                        placeholder="0"
                        value={shareTexts[m.id] ?? ''}
                        onChange={(e) => setShareTexts({ ...shareTexts, [m.id]: e.target.value })}
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-muted">
                        {splitType === SPLIT_TYPES.PERCENT ? '%' : 'R$'}
                      </span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {splitType === SPLIT_TYPES.FIXED && (
            <p className={`mt-2 text-xs ${fixedSum === amount ? 'text-positive' : 'text-muted'}`}>
              Soma: {formatCents(fixedSum)} de {formatCents(amount)}
            </p>
          )}
          {splitType === SPLIT_TYPES.PERCENT && (
            <p className={`mt-2 text-xs ${Math.abs(percentSum - 100) < 0.01 ? 'text-positive' : 'text-muted'}`}>
              Soma: {percentSum}% de 100%
            </p>
          )}
        </div>

        {error && <p className="text-sm text-accent-bright">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-br from-accent to-accent-bright font-bold disabled:opacity-50"
        >
          {saving ? 'Salvando…' : 'Adicionar despesa'}
        </button>
      </form>
    </div>
  );
}
