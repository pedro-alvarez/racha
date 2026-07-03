/**
 * Plano de Acerto: quem paga quem.
 * Toggle "Simplificado" alterna entre o plano otimizado (menos transferências)
 * e todas as dívidas par a par.
 */
import { useState } from 'react';
import Avatar from './Avatar';
import { useApp } from '../context/AppContext';
import { formatCentsAbs, firstName } from '../lib/format';

export default function SettlementPlan({ simplified, pairwise }) {
  const { currentUser, userById } = useApp();
  const [useSimplified, setUseSimplified] = useState(true);
  const transfers = useSimplified ? simplified : pairwise;

  // Ordena colocando primeiro as transferências que envolvem o usuário.
  const mine = transfers.filter((t) => t.from === currentUser.id || t.to === currentUser.id);
  const others = transfers.filter((t) => t.from !== currentUser.id && t.to !== currentUser.id);
  const ordered = [...mine, ...others];

  return (
    <section className="mt-7">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Plano de Acerto</h2>
        <button
          onClick={() => setUseSimplified((v) => !v)}
          className="flex items-center gap-2 text-xs font-semibold text-muted-light"
        >
          Simplificado
          <span
            className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
              useSimplified ? 'bg-accent' : 'bg-white/15'
            }`}
          >
            <span
              className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                useSimplified ? 'translate-x-4' : ''
              }`}
            />
          </span>
        </button>
      </div>

      {ordered.length === 0 ? (
        <div className="card-flat p-5 mt-3 text-sm text-muted text-center">
          Ninguém deve nada — contas em dia ✨
        </div>
      ) : (
        <ul className="mt-3 space-y-2.5">
          {ordered.map((t, i) => {
            const from = userById(t.from);
            const to = userById(t.to);
            const iOwe = t.from === currentUser.id;
            const owedToMe = t.to === currentUser.id;
            const other = iOwe ? to : from;
            return (
              <li key={`${t.from}-${t.to}-${i}`} className="card-flat p-4 flex items-center gap-3">
                <Avatar user={other} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold truncate">{other.name}</p>
                  <p className="label-caps mt-0.5">
                    {iOwe
                      ? 'Você deve'
                      : owedToMe
                        ? 'Te deve'
                        : `${firstName(from.name)} deve a ${firstName(to.name)}`}
                  </p>
                </div>
                <p
                  className={`text-lg font-extrabold ${
                    iOwe ? 'text-accent-bright' : owedToMe ? 'text-positive' : 'text-white'
                  }`}
                >
                  {formatCentsAbs(t.amount)}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
