/**
 * Plano de Acerto em cards (grade 2 colunas), como na referência:
 * avatar + nome, rótulo "VOCÊ DEVE" / "TE DEVE" e o valor em destaque.
 * Toggle "Simplificado" alterna entre plano otimizado e dívidas par a par.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Avatar from './Avatar';
import { useApp } from '../context/AppContext';
import { formatCentsAbs, firstName } from '../lib/format';

export default function SettlementPlan({ simplified, pairwise }) {
  const { currentUser, userById } = useApp();
  const navigate = useNavigate();
  const [useSimplified, setUseSimplified] = useState(true);
  const transfers = useSimplified ? simplified : pairwise;

  const mine = transfers.filter((t) => t.from === currentUser.id || t.to === currentUser.id);
  const others = transfers.filter((t) => t.from !== currentUser.id && t.to !== currentUser.id);

  return (
    <section className="mt-7">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Plano de Acerto</h2>
        <button
          onClick={() => setUseSimplified((v) => !v)}
          className="flex items-center gap-2 text-xs font-semibold text-accent-bright"
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

      {transfers.length === 0 ? (
        <div className="card-flat p-5 mt-3 text-sm text-muted text-center">
          Ninguém deve nada — contas em dia ✨
        </div>
      ) : (
        <>
          {/* suas dívidas/créditos em cards */}
          {mine.length > 0 && (
            <div className="grid grid-cols-2 gap-3 mt-3 stagger">
              {mine.map((t, i) => {
                const iOwe = t.from === currentUser.id;
                const other = userById(iOwe ? t.to : t.from);
                return (
                  <button
                    key={`m-${i}`}
                    onClick={() => navigate(`/perfil/${other.id}`)}
                    className="card-gradient p-4 text-left hover:brightness-110 transition"
                  >
                    <div className="flex items-center gap-2.5">
                      <Avatar user={other} size="sm" />
                      <p className="font-bold truncate">{firstName(other.name)}</p>
                    </div>
                    <p className="label-caps mt-3.5">{iOwe ? 'Você deve' : 'Te deve'}</p>
                    <p
                      className={`mt-1 text-2xl font-extrabold tracking-tight ${
                        iOwe ? 'text-accent-bright' : 'text-positive'
                      }`}
                    >
                      {formatCentsAbs(t.amount)}
                    </p>
                  </button>
                );
              })}
            </div>
          )}

          {/* dívidas entre outras pessoas */}
          {others.length > 0 && (
            <ul className="mt-3 space-y-2">
              {others.map((t, i) => {
                const from = userById(t.from);
                const to = userById(t.to);
                return (
                  <li key={`o-${i}`} className="card-flat px-4 py-3 flex items-center gap-3">
                    <div className="flex -space-x-2">
                      <Avatar user={from} size="sm" ring />
                      <Avatar user={to} size="sm" ring />
                    </div>
                    <p className="flex-1 text-sm text-muted-light truncate">
                      <span className="font-semibold text-white">{firstName(from.name)}</span> deve a{' '}
                      <span className="font-semibold text-white">{firstName(to.name)}</span>
                    </p>
                    <p className="font-bold">{formatCentsAbs(t.amount)}</p>
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
