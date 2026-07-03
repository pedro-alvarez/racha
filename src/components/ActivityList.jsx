/** Lista de atividade (despesas + pagamentos), com ícone por categoria. */
import Avatar from '../components/Avatar';
import { useApp } from '../context/AppContext';
import { categoryOf, PAYMENT_ICON } from '../lib/categories';
import { formatCents, formatRelative, firstName } from '../lib/format';

export default function ActivityList({ items, limit, emptyText = 'Nada por aqui ainda.' }) {
  const { userById } = useApp();
  const list = limit ? items.slice(0, limit) : items;

  if (list.length === 0) {
    return <div className="card-flat p-5 mt-3 text-sm text-muted text-center">{emptyText}</div>;
  }

  return (
    <ul className="mt-3 space-y-2.5">
      {list.map((item) => {
        if (item.kind === 'payment') {
          const HandIcon = PAYMENT_ICON;
          const from = userById(item.from);
          const to = userById(item.to);
          return (
            <li key={item.id} className="card-flat p-4 flex items-center gap-3">
              <span className="w-10 h-10 rounded-2xl bg-positive/15 text-positive flex items-center justify-center shrink-0">
                <HandIcon size={18} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-semibold truncate">
                  {firstName(from.name)} pagou {firstName(to.name)}
                </p>
                <p className="text-xs text-muted mt-0.5">
                  {item.note ? `${item.note} · ` : ''}
                  {formatRelative(item.createdAt)}
                </p>
              </div>
              <p className="font-bold text-positive">{formatCents(item.amount)}</p>
            </li>
          );
        }

        const { Icon } = categoryOf(item.category);
        const payer = userById(item.paidBy);
        return (
          <li key={item.id} className="card-flat p-4 flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-accent/15 text-accent-bright flex items-center justify-center shrink-0">
              <Icon size={18} />
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold truncate">{item.description}</p>
              <p className="text-xs text-muted mt-0.5">
                {firstName(payer.name)} pagou · {item.participants.length} pessoas ·{' '}
                {formatRelative(item.createdAt)}
              </p>
            </div>
            <div className="flex items-center gap-2.5">
              <p className="font-bold">{formatCents(item.amount)}</p>
              <Avatar user={payer} size="xs" />
            </div>
          </li>
        );
      })}
    </ul>
  );
}
