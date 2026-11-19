/**
 * DebtBreakdown - justificativa de uma dívida direta: as despesas e os
 * pagamentos que formam o valor (vem de pairwiseDebts, campo `items`).
 * "+" aumenta a dívida, "−" diminui (parte do credor numa despesa que o
 * devedor pagou, ou um pagamento já feito).
 */
import { useApp } from '../context/AppContext';
import { formatCentsAbs, formatDate, firstName } from '../lib/format';

const shortDate = (d) =>
  !d ? '' : d.length === 10 ? formatDate(d) : new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

export default function DebtBreakdown({ debt }) {
  const { currentUser, userById } = useApp();
  const name = (id) => (id === currentUser.id ? 'você' : firstName(userById(id).name));
  // despesas quitadas por um pagamento "por despesa" desta mesma dívida
  const descriptionOf = Object.fromEntries(
    debt.items.filter((it) => it.kind === 'expense').map((it) => [it.id, it.description])
  );
  const paidIds = new Set(debt.items.filter((it) => it.kind === 'payment').flatMap((it) => it.expenseIds ?? []));

  return (
    <div className="mt-3 pt-3 border-t border-white/10 text-left">
      <ul className="space-y-2">
        {debt.items.map((it, i) => (
          <li key={`${it.kind}-${it.id}-${i}`} className="flex items-start gap-3 text-xs">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-white truncate">
                {it.kind === 'expense' ? it.description : 'Pagamento'}{' '}
                <span className="font-normal text-muted">· {shortDate(it.date)}</span>
                {it.kind === 'expense' && it.amount > 0 && paidIds.has(it.id) && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-md bg-positive/15 text-positive text-[10px] font-bold">paga</span>
                )}
              </p>
              <p className="text-muted">
                {it.kind === 'expense'
                  ? `${it.owedBy === currentUser.id ? 'sua parte' : `parte de ${name(it.owedBy)}`}, ${name(it.paidBy)} pagou`
                  : `${name(it.from)} pagou ${name(it.to)}${
                      it.expenseIds?.length
                        ? `: ${it.expenseIds.map((id) => descriptionOf[id] ?? 'despesa').join(', ')}`
                        : ''
                    }`}
              </p>
            </div>
            <p className={`font-bold whitespace-nowrap ${it.amount > 0 ? 'text-muted-light' : 'text-positive'}`}>
              {it.amount > 0 ? '+' : '−'} {formatCentsAbs(it.amount)}
            </p>
          </li>
        ))}
      </ul>
      <p className="mt-2.5 pt-2 border-t border-white/5 flex justify-between text-xs font-bold">
        <span>
          {name(debt.from) === 'você' ? 'Você deve' : `${name(debt.from)} deve`} a {name(debt.to)}
        </span>
        <span>{formatCentsAbs(debt.amount)}</span>
      </p>
    </div>
  );
}
