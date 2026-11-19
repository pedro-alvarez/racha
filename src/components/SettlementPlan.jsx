/**
 * Plano de Acerto: dívidas diretas (cada um paga a quem pagou a despesa dele).
 * Suas dívidas/créditos em cards, as dos outros em lista. Tocar numa dívida
 * abre a justificativa: as despesas e pagamentos que formam o valor.
 */
import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import Avatar from './Avatar';
import DebtBreakdown from './DebtBreakdown';
import { useApp } from '../context/AppContext';
import { formatCentsAbs, firstName } from '../lib/format';

export default function SettlementPlan({ settlements }) {
  const { currentUser, userById } = useApp();
  const [open, setOpen] = useState(null);
  const toggle = (key) => setOpen((k) => (k === key ? null : key));
  const keyOf = (t) => `${t.from}|${t.to}`;

  const mine = settlements.filter((t) => t.from === currentUser.id || t.to === currentUser.id);
  const others = settlements.filter((t) => t.from !== currentUser.id && t.to !== currentUser.id);

  return (
    <section className="mt-7">
      <h2 className="text-lg font-bold">Plano de Acerto</h2>
      {settlements.length > 0 && <p className="mt-0.5 text-xs text-muted">Toque numa dívida para ver de onde ela vem.</p>}

      {settlements.length === 0 ? (
        <div className="card-flat p-5 mt-3 text-sm text-muted text-center">
          Ninguém deve nada. Contas em dia ✨
        </div>
      ) : (
        <>
          {/* suas dívidas/créditos em cards */}
          {mine.length > 0 && (
            <div className="grid grid-cols-2 gap-3 mt-3 stagger">
              {mine.map((t) => {
                const iOwe = t.from === currentUser.id;
                const other = userById(iOwe ? t.to : t.from);
                const isOpen = open === keyOf(t);
                return (
                  <div
                    key={keyOf(t)}
                    role="button"
                    tabIndex={0}
                    onClick={() => toggle(keyOf(t))}
                    onKeyDown={(e) => e.key === 'Enter' && toggle(keyOf(t))}
                    className={`card-gradient p-4 text-left cursor-pointer hover:brightness-110 transition ${
                      isOpen ? 'col-span-2' : ''
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <Avatar user={other} size="sm" />
                      <p className="flex-1 font-bold truncate">{firstName(other.name)}</p>
                      <ChevronDown size={16} className={`text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </div>
                    <p className="label-caps mt-3.5">{iOwe ? 'Você deve' : 'Te deve'}</p>
                    <p
                      className={`mt-1 text-2xl font-extrabold tracking-tight ${
                        iOwe ? 'text-accent-bright' : 'text-positive'
                      }`}
                    >
                      {formatCentsAbs(t.amount)}
                    </p>
                    {isOpen && <DebtBreakdown debt={t} />}
                  </div>
                );
              })}
            </div>
          )}

          {/* dívidas entre outras pessoas */}
          {others.length > 0 && (
            <ul className="mt-3 space-y-2">
              {others.map((t) => {
                const from = userById(t.from);
                const to = userById(t.to);
                const isOpen = open === keyOf(t);
                return (
                  <li key={keyOf(t)} className="card-flat px-4 py-3">
                    <button onClick={() => toggle(keyOf(t))} className="w-full flex items-center gap-3 text-left">
                      <div className="flex -space-x-2">
                        <Avatar user={from} size="sm" ring />
                        <Avatar user={to} size="sm" ring />
                      </div>
                      <p className="flex-1 min-w-0 text-sm text-muted-light">
                        <span className="font-semibold text-white">{firstName(from.name)}</span> deve a{' '}
                        <span className="font-semibold text-white">{firstName(to.name)}</span>
                      </p>
                      <p className="font-bold">{formatCentsAbs(t.amount)}</p>
                      <ChevronDown size={16} className={`text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {isOpen && <DebtBreakdown debt={t} />}
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
