/**
 * Lista de atividade (despesas + pagamentos).
 * Cada categoria tem cor própria; itens mostram a SUA parte na despesa
 * (Você deve / Emprestou). Avatares abrem o perfil da pessoa.
 */
import { useNavigate } from 'react-router-dom';
import Avatar from './Avatar';
import { useApp } from '../context/AppContext';
import { categoryOf, PAYMENT_ICON } from '../lib/categories';
import { computeShares } from '../lib/splitEngine';
import { formatCents, formatRelative, firstName } from '../lib/format';

export function ActivityItem({ item }) {
  const { userById, currentUser } = useApp();
  const navigate = useNavigate();

  if (item.kind === 'payment') {
    const HandIcon = PAYMENT_ICON;
    const from = userById(item.from);
    const to = userById(item.to);
    return (
      <li className="card-flat p-4 flex items-center gap-3">
        <span className="w-10 h-10 rounded-2xl bg-positive/15 text-positive flex items-center justify-center shrink-0">
          <HandIcon size={18} />
        </span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate">
            {from.id === currentUser.id ? 'Você' : firstName(from.name)} pagou{' '}
            {to.id === currentUser.id ? 'você' : firstName(to.name)}
          </p>
          <p className="text-xs text-muted mt-0.5">
            {item.tripName ? `${item.tripName} · ` : ''}
            {item.note ? `${item.note} · ` : ''}
            {formatRelative(item.createdAt)}
          </p>
        </div>
        <p className="font-bold text-positive">{formatCents(item.amount)}</p>
      </li>
    );
  }

  const { Icon, color } = categoryOf(item.category);
  const payer = userById(item.paidBy);
  const iPaid = item.paidBy === currentUser.id;
  const iParticipate = item.participants.includes(currentUser.id);
  const myShare = iParticipate ? computeShares(item)[currentUser.id] ?? 0 : 0;
  const lent = iPaid ? item.amount - myShare : 0;

  return (
    <li className="card-flat p-4 flex items-center gap-3">
      <span
        className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
        style={{ backgroundColor: `${color}26`, color }}
      >
        <Icon size={18} />
      </span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">{item.description}</p>
        <p className="text-xs text-muted mt-0.5">
          {item.tripName ? `${item.tripName} · ` : ''}
          {iPaid ? 'Você pagou' : `${firstName(payer.name)} pagou`} ·{' '}
          {item.participants.length} pessoas · {formatRelative(item.createdAt)}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="font-bold">{formatCents(item.amount)}</p>
        {iPaid && lent > 0 && (
          <p className="text-[11px] font-semibold text-positive">emprestou {formatCents(lent)}</p>
        )}
        {!iPaid && iParticipate && (
          <p className="text-[11px] font-semibold text-accent-bright">sua parte {formatCents(myShare)}</p>
        )}
      </div>
      <Avatar user={payer} size="xs" onClick={() => navigate(`/perfil/${payer.id}`)} />
    </li>
  );
}

export default function ActivityList({ items, limit, emptyText = 'Nada por aqui ainda.' }) {
  const list = limit ? items.slice(0, limit) : items;

  if (list.length === 0) {
    return <div className="card-flat p-5 mt-3 text-sm text-muted text-center">{emptyText}</div>;
  }

  return (
    <ul className="mt-3 space-y-2.5">
      {list.map((item) => (
        <ActivityItem key={item.id} item={item} />
      ))}
    </ul>
  );
}
