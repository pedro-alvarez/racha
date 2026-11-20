/**
 * DebtBreakdown - justificativa de uma dívida direta (vem de pairwiseDebts,
 * campo `items`), separada em blocos para a conta ficar clara:
 *   1. o que o devedor deve (despesas que o credor pagou);
 *   2. o que desconta: despesas que o devedor pagou e em que o credor tinha
 *      parte. As dívidas entre os dois se compensam e só a diferença é paga;
 *   3. pagamentos já confirmados.
 * No fim, a conta: total − descontos − pagamentos = valor da dívida.
 */
import { useApp } from '../context/AppContext';
import { formatCentsAbs, formatDate, firstName } from '../lib/format';
import { expenseCoverage } from '../lib/splitEngine';

const shortDate = (d) =>
  !d ? '' : d.length === 10 ? formatDate(d) : new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });

const sum = (list) => list.reduce((s, it) => s + Math.abs(it.amount), 0);

function Linha({ titulo, data, detalhe, valor, sinal, selo }) {
  return (
    <li className="flex items-start gap-3 text-xs">
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-white truncate">
          {titulo} <span className="font-normal text-muted">· {data}</span>
          {selo}
        </p>
        <p className="text-muted">{detalhe}</p>
      </div>
      <p className={`font-bold whitespace-nowrap ${sinal === '+' ? 'text-muted-light' : 'text-positive'}`}>
        {sinal} {formatCentsAbs(valor)}
      </p>
    </li>
  );
}

function Bloco({ titulo, total, children }) {
  return (
    <div className="mt-3 first:mt-0">
      <p className="flex justify-between label-caps !text-[10px]">
        <span>{titulo}</span>
        <span>{formatCentsAbs(total)}</span>
      </p>
      <ul className="mt-2 space-y-2">{children}</ul>
    </div>
  );
}

export default function DebtBreakdown({ debt }) {
  const { currentUser, userById } = useApp();
  const name = (id) => (id === currentUser.id ? 'você' : firstName(userById(id).name));
  const Name = (id) => (id === currentUser.id ? 'Você' : firstName(userById(id).name));

  const owed = debt.items.filter((it) => it.kind === 'expense' && it.amount > 0);
  const offsets = debt.items.filter((it) => it.kind === 'expense' && it.amount < 0);
  const payments = debt.items.filter((it) => it.kind === 'payment');
  const coverage = expenseCoverage(debt);
  const descriptionOf = Object.fromEntries(debt.items.filter((it) => it.kind === 'expense').map((it) => [it.id, it.description]));

  const totalOwed = sum(owed);
  const totalOffsets = sum(offsets);
  const paymentsNet = -payments.reduce((s, it) => s + it.amount, 0); // positivo = abate

  return (
    <div className="mt-3 pt-3 border-t border-white/10 text-left">
      <Bloco titulo={`${Name(debt.from)} deve a ${name(debt.to)}`} total={totalOwed}>
        {owed.map((it) => {
          const c = coverage[it.id];
          const selo =
            c && c.paid > 0 ? (
              <span
                className={`ml-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                  c.left <= 0 ? 'bg-positive/15 text-positive' : 'bg-amber-400/15 text-amber-300'
                }`}
              >
                {c.left <= 0 ? 'paga' : `faltam ${formatCentsAbs(c.left)}`}
              </span>
            ) : null;
          return (
            <Linha
              key={`e-${it.id}`}
              titulo={it.description}
              data={shortDate(it.date)}
              detalhe={`${name(it.paidBy) === 'você' ? 'você pagou' : `${Name(it.paidBy)} pagou`}, parte de ${name(it.owedBy)}`}
              valor={it.amount}
              sinal="+"
              selo={selo}
            />
          );
        })}
      </Bloco>

      {offsets.length > 0 && (
        <Bloco titulo={`Desconta: ${name(debt.to)} deve a ${name(debt.from)}`} total={totalOffsets}>
          {offsets.map((it) => (
            <Linha
              key={`o-${it.id}`}
              titulo={it.description}
              data={shortDate(it.date)}
              detalhe={`${name(it.paidBy) === 'você' ? 'você pagou' : `${Name(it.paidBy)} pagou`}, parte de ${name(it.owedBy)}`}
              valor={it.amount}
              sinal="−"
            />
          ))}
        </Bloco>
      )}

      {payments.length > 0 && (
        <Bloco titulo="Pagamentos confirmados" total={Math.abs(paymentsNet)}>
          {payments.map((it) => (
            <Linha
              key={`p-${it.id}`}
              titulo="Pagamento"
              data={shortDate(it.date)}
              detalhe={`${Name(it.from)} pagou ${name(it.to)}${
                it.expenseIds?.length ? `: ${it.expenseIds.map((id) => descriptionOf[id] ?? 'despesa').join(', ')}` : ''
              }`}
              valor={it.amount}
              sinal={it.amount > 0 ? '+' : '−'}
            />
          ))}
        </Bloco>
      )}

      {/* a conta */}
      <div className="mt-3 pt-2.5 border-t border-white/5 text-xs">
        {(offsets.length > 0 || payments.length > 0) && (
          <p className="text-muted tabular-nums">
            {formatCentsAbs(totalOwed)}
            {offsets.length > 0 && ` − ${formatCentsAbs(totalOffsets)}`}
            {payments.length > 0 && ` ${paymentsNet >= 0 ? '−' : '+'} ${formatCentsAbs(paymentsNet)}`}
            {` = ${formatCentsAbs(debt.amount)}`}
          </p>
        )}
        {offsets.length > 0 && (
          <p className="mt-1 text-muted">
            Os dois se devem: em vez de cada um pagar o outro, as dívidas se descontam e só a diferença é paga.
          </p>
        )}
        <p className="mt-1.5 flex justify-between font-bold">
          <span>
            {Name(debt.from)} deve a {name(debt.to)}
          </span>
          <span>{formatCentsAbs(debt.amount)}</span>
        </p>
      </div>
    </div>
  );
}
