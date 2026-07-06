/**
 * Modal (bottom sheet) de detalhes da despesa:
 * - visão completa: valor, categoria, grupo, dia, hora, quem pagou e a divisão
 * - histórico de alterações ("Fulano alterou valor: A → B · dia hora")
 * - Editar / Excluir no rodapé, visíveis só para o criador ou o admin
 */
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { CalendarDays, Clock, History, Pencil, Trash2, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { categoryOf } from '../lib/categories';
import { computeShares } from '../lib/splitEngine';
import * as dataService from '../lib/dataService';
import { formatCents, formatDateFull, formatTime, firstName } from '../lib/format';
import Avatar from './Avatar';

export default function ExpenseModal({ expense, onClose }) {
  const { userById, currentUser, trips, deleteExpense } = useApp();
  const navigate = useNavigate();
  const [history, setHistory] = useState([]);
  const [historyError, setHistoryError] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { Icon, color, label } = categoryOf(expense.category);
  const payer = userById(expense.paidBy);
  const creator = userById(expense.createdBy ?? expense.paidBy);
  const trip = trips.find((t) => t.id === expense.tripId);
  const shares = computeShares(expense);
  const isAdmin = currentUser?.role === 'admin';
  const canManage = isAdmin || (expense.createdBy ?? expense.paidBy) === currentUser?.id;

  useEffect(() => {
    let alive = true;
    dataService
      .getExpenseHistory(expense.id)
      .then((h) => alive && setHistory(h))
      .catch(() => alive && setHistoryError(true));
    return () => (alive = false);
  }, [expense.id]);

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const handleDelete = async () => {
    if (!confirmDelete) return setConfirmDelete(true);
    setDeleting(true);
    try {
      await deleteExpense(expense.id);
      onClose();
    } catch (err) {
      setDeleting(false);
      alert(err.message);
    }
  };

  const handleEdit = () => {
    onClose();
    navigate(`/viagem/${expense.tripId}/despesa/${expense.id}/editar`);
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center">
      {/* fundo */}
      <button aria-label="Fechar" onClick={onClose} className="absolute inset-0 bg-black/65 backdrop-blur-sm overlay-in" />

      {/* sheet */}
      <div className="relative w-full max-w-lg max-h-[88vh] overflow-y-auto bg-ink-soft border border-white/10 rounded-t-3xl md:rounded-3xl p-6 pb-8 sheet-up">
        <div className="mx-auto w-10 h-1 rounded-full bg-white/15 mb-5 md:hidden" />
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-muted hover:text-white"
          aria-label="Fechar"
        >
          <X size={15} />
        </button>

        {/* cabeçalho */}
        <div className="flex items-center gap-3">
          <span className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${color}26`, color }}>
            <Icon size={22} />
          </span>
          <div className="min-w-0">
            <p className="text-lg font-extrabold leading-tight">{expense.description}</p>
            <p className="text-xs text-muted mt-0.5">
              {label}
              {trip ? ` · ${trip.emoji} ${trip.name}` : ''}
            </p>
          </div>
        </div>

        <p className="mt-4 text-4xl font-extrabold tracking-tight">{formatCents(expense.amount)}</p>

        {/* dia / hora / pagador */}
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <div className="card-flat p-3.5">
            <p className="label-caps flex items-center gap-1.5"><CalendarDays size={12} /> Dia</p>
            <p className="mt-1 text-sm font-bold">{formatDateFull(expense.createdAt)}</p>
          </div>
          <div className="card-flat p-3.5">
            <p className="label-caps flex items-center gap-1.5"><Clock size={12} /> Hora</p>
            <p className="mt-1 text-sm font-bold">{formatTime(expense.createdAt)}</p>
          </div>
        </div>
        <div className="card-flat p-3.5 mt-2.5 flex items-center gap-3">
          <Avatar user={payer} size="sm" />
          <div className="min-w-0">
            <p className="label-caps">Pago por</p>
            <p className="text-sm font-bold truncate">
              {payer.id === currentUser?.id ? 'Você' : payer.name}
            </p>
          </div>
        </div>

        {/* divisão */}
        <p className="label-caps mt-5">Divisão ({expense.participants.length} pessoas)</p>
        <ul className="mt-2 space-y-1.5">
          {expense.participants.map((id) => {
            const member = userById(id);
            const isMe = id === currentUser?.id;
            return (
              <li key={id} className="flex items-center gap-2.5 px-3 py-2 rounded-2xl bg-white/[0.03]">
                <Avatar user={member} size="xs" />
                <p className={`flex-1 text-sm truncate ${isMe ? 'font-bold' : ''}`}>
                  {isMe ? 'Você' : member.name}
                </p>
                <p className={`text-sm font-bold ${isMe ? 'text-accent-bright' : 'text-muted-light'}`}>
                  {formatCents(shares[id] ?? 0)}
                </p>
              </li>
            );
          })}
        </ul>

        {/* histórico */}
        <p className="label-caps mt-5 flex items-center gap-1.5"><History size={12} /> Histórico</p>
        <ul className="mt-2 space-y-2 text-xs text-muted">
          {history.map((h) => (
            <li key={h.id} className="card-flat p-3">
              <p className="font-semibold text-muted-light">
                {h.editorName} alterou · {formatDateFull(h.createdAt)} às {formatTime(h.createdAt)}
              </p>
              <ul className="mt-1 space-y-0.5">
                {h.changes.map((c, i) => (
                  <li key={i}>
                    <span className="capitalize">{c.field}</span>:{' '}
                    <span className="line-through opacity-60">{c.old}</span>{' '}
                    <span className="text-white font-semibold">→ {c.new}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
          <li>
            Criada por {creator.id === currentUser?.id ? 'você' : firstName(creator.name)} ·{' '}
            {formatDateFull(expense.createdAt)} às {formatTime(expense.createdAt)}
          </li>
          {historyError && (
            <li className="text-accent-bright/70">
              Histórico indisponível — rode o supabase/upgrade-v4.sql no banco.
            </li>
          )}
        </ul>

        {/* ações (criador ou admin) */}
        {canManage && (
          <div className="mt-6 flex gap-2.5">
            <button
              onClick={handleEdit}
              className="flex-1 py-3 rounded-2xl bg-gradient-to-br from-accent to-accent-bright font-bold text-sm flex items-center justify-center gap-2"
            >
              <Pencil size={15} /> Editar
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className={`flex-1 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition ${
                confirmDelete ? 'bg-red-500 text-white' : 'bg-red-500/15 text-red-400 hover:bg-red-500/25'
              } disabled:opacity-50`}
            >
              <Trash2 size={15} />
              {deleting ? 'Excluindo…' : confirmDelete ? 'Confirmar exclusão' : 'Excluir'}
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
