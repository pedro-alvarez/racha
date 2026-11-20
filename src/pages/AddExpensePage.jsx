/**
 * Adicionar OU editar despesa (rota com :expenseId = edição).
 * Na edição, as mudanças são comparadas e gravadas no histórico
 * (expense_history), exibido no modal de detalhes.
 */
import { useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { CATEGORIES } from '../lib/categories';
import { SPLIT_TYPES, validateExpense, fillRemainder, computeShares } from '../lib/splitEngine';
import { parseToCents, formatCents, formatDateFull, firstName, maskCents, todayISO } from '../lib/format';
import Avatar from '../components/Avatar';
import { ReceiptPicker } from '../components/Receipt';
import * as dataService from '../lib/dataService';

const SPLIT_OPTIONS = [
  { id: SPLIT_TYPES.EQUAL, label: 'Igual' },
  { id: SPLIT_TYPES.FIXED, label: 'Valores' },
  { id: SPLIT_TYPES.PERCENT, label: '%' },
];

const centsToText = (cents) => (cents / 100).toFixed(2).replace('.', ',');

export default function AddExpensePage() {
  const { tripId, expenseId } = useParams();
  const { trips, userById, currentUser, addExpense, updateExpense, expensesByTrip } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  const trip = trips.find((t) => t.id === tripId);
  const members = useMemo(() => (trip ? trip.members.map(userById) : []), [trip, userById]);

  // modo edição: despesa original (se a rota tiver :expenseId)
  const original = expenseId
    ? (expensesByTrip[tripId] ?? []).find((e) => e.id === expenseId) ?? null
    : null;

  const [description, setDescription] = useState(original?.description ?? '');
  const [date, setDate] = useState(original?.date ?? todayISO());
  const [amountText, setAmountText] = useState(original ? maskCents(String(original.amount)) : '');
  const [paidBy, setPaidBy] = useState(original?.paidBy ?? currentUser?.id);
  const [category, setCategory] = useState(original?.category ?? 'comida');
  const [note, setNote] = useState(original?.note ?? '');
  const [receiptFile, setReceiptFile] = useState(null); // nota fiscal/comprovante novo
  const [keptReceipt, setKeptReceipt] = useState(original?.receiptPath ?? null); // anexo já salvo
  const [splitType, setSplitType] = useState(original?.splitType ?? SPLIT_TYPES.EQUAL);
  const [participants, setParticipants] = useState(
    new Set(original?.participants ?? trip?.members ?? [])
  );
  const [shareTexts, setShareTexts] = useState(() => {
    if (!original?.shares) return {};
    return Object.fromEntries(
      Object.entries(original.shares).map(([id, v]) => [
        id,
        original.splitType === SPLIT_TYPES.FIXED ? centsToText(v) : String(v),
      ])
    );
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  if (!trip) return null;

  const amount = parseToCents(amountText);

  const toggleParticipant = (id) => {
    const next = new Set(participants);
    next.has(id) ? next.delete(id) : next.add(id);
    setParticipants(next);
  };

  // marcar todos de uma vez / desmarcar todos
  const allSelected = members.length > 0 && members.every((m) => participants.has(m.id));
  const toggleAll = () => setParticipants(allSelected ? new Set() : new Set(members.map((m) => m.id)));

  // Valores e %: quem ficou em branco divide o resto por igual (fillRemainder)
  const buildShares = () => {
    if (splitType === SPLIT_TYPES.EQUAL) return {};
    const ids = members.map((m) => m.id).filter((id) => participants.has(id));
    const filled = {};
    ids.forEach((id) => {
      const text = (shareTexts[id] ?? '').trim();
      if (!text) return;
      filled[id] =
        splitType === SPLIT_TYPES.FIXED ? parseToCents(text) : parseFloat(text.replace(',', '.')) || 0;
    });
    return fillRemainder(splitType, amount, ids, filled);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!description.trim()) return setError('Descreva a despesa.');
    if (!date) return setError('Informe a data da despesa.');
    if (amount <= 0) return setError('Informe o valor da despesa.');

    const expense = {
      description: description.trim(),
      date,
      amount,
      paidBy,
      category,
      splitType,
      participants: [...participants],
      shares: buildShares(),
      note: note.trim(),
      receiptPath: keptReceipt,
    };

    const { valid, error: validationError } = validateExpense(expense);
    if (!valid) {
      // mensagens do engine vêm em centavos - formata para exibir
      return setError(validationError.replace(/\((\d+)\)/g, (_, c) => `(${formatCents(+c)})`));
    }

    setSaving(true);
    try {
      if (receiptFile) expense.receiptPath = await dataService.uploadReceipt(tripId, receiptFile);
      if (original) {
        await updateExpense(expenseId, expense, buildChanges(original, expense));
      } else {
        await addExpense(tripId, expense);
      }
      // volta para a tela de onde veio (Visão Geral, Despesas...); se abriu
      // direto pelo link, vai para a viagem
      if (location.key !== 'default') navigate(-1);
      else navigate(`/viagem/${tripId}`, { replace: true });
    } catch (err) {
      setSaving(false);
      setError(err.message);
    }
  };

  /** Compara a despesa original com a editada e gera o registro do histórico. */
  function buildChanges(oldE, newE) {
    const changes = [];
    const catLabel = (k) => CATEGORIES[k]?.label ?? k;
    // nome de verdade: o histórico é lido por todos, então "Você" ficaria errado para os outros
    const who = (id) => firstName(userById(id).name);
    const splitDesc = (e) => {
      const labels = { equal: 'igual', fixed: 'valores fixos', percent: 'percentual' };
      return `${labels[e.splitType] ?? e.splitType} · ${e.participants.length} pessoas`;
    };
    if (oldE.description !== newE.description)
      changes.push({ field: 'descrição', old: oldE.description, new: newE.description });
    if (oldE.date !== newE.date)
      changes.push({ field: 'data', old: formatDateFull(oldE.date), new: formatDateFull(newE.date) });
    if (oldE.amount !== newE.amount)
      changes.push({ field: 'valor', old: formatCents(oldE.amount), new: formatCents(newE.amount) });
    if (oldE.category !== newE.category)
      changes.push({ field: 'categoria', old: catLabel(oldE.category), new: catLabel(newE.category) });
    if ((oldE.note ?? '') !== (newE.note ?? ''))
      changes.push({ field: 'observação', old: oldE.note || '(vazia)', new: newE.note || '(vazia)' });
    if ((oldE.receiptPath ?? null) !== (newE.receiptPath ?? null))
      changes.push({
        field: 'nota/comprovante',
        old: oldE.receiptPath ? 'anexado' : 'sem anexo',
        new: newE.receiptPath ? (oldE.receiptPath ? 'trocado' : 'anexado') : 'removido',
      });
    if (oldE.paidBy !== newE.paidBy)
      changes.push({ field: 'quem pagou', old: who(oldE.paidBy), new: who(newE.paidBy) });
    const oldSplit = JSON.stringify({ t: oldE.splitType, p: [...oldE.participants].sort(), s: oldE.shares ?? null });
    const newSplit = JSON.stringify({ t: newE.splitType, p: [...newE.participants].sort(), s: Object.keys(newE.shares ?? {}).length ? newE.shares : null });
    if (oldSplit !== newSplit)
      changes.push({ field: 'divisão', old: splitDesc(oldE), new: splitDesc(newE) });
    return changes;
  }

  const inputCls =
    'w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm placeholder:text-muted focus:outline-none focus:border-accent/60';

  const autoShares = buildShares();
  const isBlank = (id) => !(shareTexts[id] ?? '').trim();
  const autoLabel = (id) =>
    splitType === SPLIT_TYPES.FIXED
      ? centsToText(autoShares[id] ?? 0)
      : (autoShares[id] ?? 0).toFixed(2).replace('.', ',');
  // no modo %, quanto cada um paga em reais
  const percentCents =
    splitType === SPLIT_TYPES.PERCENT
      ? computeShares({ amount, splitType, participants: Object.keys(autoShares), shares: autoShares })
      : {};
  // divisão igual: parte exata de cada um (centavos que sobram vão para os primeiros, na mesma ordem do app)
  const equalCents =
    splitType === SPLIT_TYPES.EQUAL
      ? computeShares({ amount, splitType, participants: [...participants].sort() })
      : {};
  const fixedSum = Object.values(autoShares).reduce((acc, v) => acc + v, 0);
  const percentSum = Math.round(Object.values(autoShares).reduce((acc, v) => acc + v, 0) * 100) / 100;

  return (
    <div className="pt-4 md:pt-0">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted hover:text-white">
        <ArrowLeft size={16} /> {trip.name}
      </button>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight">{original ? 'Editar despesa' : 'Nova despesa'}</h1>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        <div>
          <label className="label-caps">Descrição <span className="text-accent-bright">*</span></label>
          <input
            className={`${inputCls} mt-2`}
            placeholder="Ex.: Jantar no quiosque"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <label className="label-caps">Data <span className="text-accent-bright">*</span></label>
          <input
            type="date"
            required
            className={`${inputCls} mt-2 [color-scheme:dark]`}
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        <div>
          <label className="label-caps">Valor <span className="text-accent-bright">*</span></label>
          <div className="relative mt-2">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted font-semibold">R$</span>
            <input
              inputMode="numeric"
              className={`${inputCls} pl-11 text-lg font-bold`}
              placeholder="0,00"
              value={amountText}
              onChange={(e) => setAmountText(maskCents(e.target.value))}
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

          <div className="mt-3 flex items-center justify-between">
            <p className="text-xs text-muted">
              {participants.size} de {members.length} {members.length === 1 ? 'pessoa' : 'pessoas'}
            </p>
            <button
              type="button"
              onClick={toggleAll}
              className="px-3 py-1.5 rounded-full text-xs font-bold bg-white/5 border border-white/10 text-muted-light hover:text-white transition"
            >
              {allSelected ? 'Desmarcar todos' : 'Marcar todos'}
            </button>
          </div>

          <ul className="mt-2 space-y-2">
            {members.map((m) => {
              const active = participants.has(m.id);
              return (
                <li
                  key={m.id}
                  role="checkbox"
                  aria-checked={active}
                  aria-label={`Incluir ${m.name}`}
                  tabIndex={0}
                  onClick={() => toggleParticipant(m.id)}
                  onKeyDown={(e) => {
                    if (e.target !== e.currentTarget) return;
                    if (e.key === ' ' || e.key === 'Enter') {
                      e.preventDefault();
                      toggleParticipant(m.id);
                    }
                  }}
                  className={`card-flat p-3 flex items-center gap-3 cursor-pointer select-none transition active:scale-[0.99] hover:bg-white/5 ${
                    active ? 'border-accent/30' : 'opacity-45'
                  }`}
                >
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 transition ${
                      active ? 'bg-accent' : 'bg-white/10'
                    }`}
                  >
                    {active && <Check size={13} />}
                  </span>
                  <Avatar user={m} size="sm" />
                  <p className="flex-1 text-sm font-semibold truncate">{firstName(m.name)}</p>
                  {active && splitType === SPLIT_TYPES.EQUAL && participants.size > 0 && (
                    <p className="text-xs text-muted">{formatCents(equalCents[m.id] ?? 0)}</p>
                  )}
                  {active && splitType === SPLIT_TYPES.PERCENT && amount > 0 && (
                    <p className="text-xs text-muted">{formatCents(percentCents[m.id] ?? 0)}</p>
                  )}
                  {active && splitType !== SPLIT_TYPES.EQUAL && (
                    // digitar o valor não marca/desmarca a pessoa
                    <div className="relative w-28" onClick={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
                      <input
                        inputMode="decimal"
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-3 pr-8 py-2 text-sm text-right focus:outline-none focus:border-accent/60"
                        placeholder={isBlank(m.id) ? autoLabel(m.id) : '0'}
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

          {splitType !== SPLIT_TYPES.EQUAL && (
            <p className="mt-2 text-xs text-muted">
              Preencha só quem paga diferente. Quem ficar em branco divide o resto por igual.
            </p>
          )}
          {splitType === SPLIT_TYPES.FIXED && (
            <p className={`mt-2 text-xs ${fixedSum === amount ? 'text-positive' : 'text-muted'}`}>
              Soma: {formatCents(fixedSum)} de {formatCents(amount)}
            </p>
          )}
          {splitType === SPLIT_TYPES.PERCENT && (
            <p className={`mt-2 text-xs ${Math.abs(percentSum - 100) < 0.01 ? 'text-positive' : 'text-muted'}`}>
              Soma: {String(percentSum).replace('.', ',')}% de 100%
            </p>
          )}
        </div>

        {/* observação e nota fiscal (opcionais) */}
        <div>
          <label className="label-caps">Observação</label>
          <textarea
            rows={2}
            maxLength={500}
            className={`${inputCls} mt-2 resize-none`}
            placeholder="Opcional: o que foi, combinado, detalhes…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
          <div className="mt-3">
            <ReceiptPicker
              file={receiptFile}
              onChange={setReceiptFile}
              label="Anexar nota fiscal ou comprovante (opcional)"
              existingPath={keptReceipt}
              onRemoveExisting={() => setKeptReceipt(null)}
            />
          </div>
        </div>

        {error && <p className="text-sm text-accent-bright">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-br from-accent to-accent-bright font-bold disabled:opacity-50"
        >
          {saving ? (receiptFile ? 'Enviando anexo…' : 'Salvando…') : original ? 'Salvar alterações' : 'Adicionar despesa'}
        </button>
      </form>
    </div>
  );
}
