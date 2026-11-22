/**
 * Sininho de pendências (Visão Geral, canto superior esquerdo).
 * O número mostra quantos pagamentos esperam VOCÊ confirmar, em qualquer
 * viagem. Tocando, abre a lista: confirmar ou recusar ali mesmo, vendo o
 * comprovante. Também lista o que você pagou e ainda espera o outro confirmar.
 */
import { useCallback, useEffect, useState } from 'react';
import { Bell, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCentsAbs, firstName, formatRelative } from '../lib/format';
import Avatar from './Avatar';
import { ReceiptLink } from './Receipt';
import Sheet from './Sheet';

export function usePendencias() {
  const { trips, paymentsByTrip, expensesByTrip, currentUser } = useApp();
  const me = currentUser?.id;
  const todos = trips.flatMap((trip) =>
    (paymentsByTrip[trip.id] ?? [])
      .filter((p) => p.status === 'pending' && (p.to === me || p.from === me))
      .map((p) => {
        const nomes = Object.fromEntries((expensesByTrip[trip.id] ?? []).map((e) => [e.id, e.description]));
        return { ...p, trip, despesas: (p.expenseIds ?? []).map((id) => nomes[id]).filter(Boolean) };
      })
  );
  const ordem = (a, b) => new Date(b.createdAt) - new Date(a.createdAt);
  return {
    paraConfirmar: todos.filter((p) => p.to === me).sort(ordem),
    aguardando: todos.filter((p) => p.from === me).sort(ordem),
  };
}

function Linha({ p, recebo }) {
  const { userById, confirmPayment, declinePayment } = useApp();
  const [busy, setBusy] = useState(false);
  const outro = userById(recebo ? p.from : p.to);
  const agir = async (fn, pergunta) => {
    if (pergunta && !confirm(pergunta)) return;
    setBusy(true);
    try {
      await fn(p.id);
    } catch (err) {
      alert(err.message);
      setBusy(false);
    }
  };
  return (
    <li className={`card-flat p-4 ${recebo ? 'border-amber-400/25' : ''}`}>
      <div className="flex items-center gap-3">
        <Avatar user={outro} size="md" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">
            {recebo ? `${firstName(outro.name)} diz que te pagou` : `Você pagou ${firstName(outro.name)}`}
          </p>
          <p className="text-xs text-muted mt-0.5 truncate">
            {p.trip.emoji} {p.trip.name}
            {p.despesas.length > 0 ? ` · ${p.despesas.join(', ')}` : ''} · {formatRelative(p.createdAt)}
          </p>
        </div>
        <p className={`font-extrabold whitespace-nowrap ${recebo ? 'text-positive' : ''}`}>{formatCentsAbs(p.amount)}</p>
      </div>
      {p.receiptPath ? (
        <ReceiptLink path={p.receiptPath} className="mt-3" />
      ) : (
        recebo && <p className="mt-3 text-[11px] text-muted">Sem comprovante anexado.</p>
      )}
      {recebo ? (
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => agir(confirmPayment)}
            disabled={busy}
            className="flex-[2] py-3 rounded-2xl bg-positive text-ink text-sm font-extrabold flex items-center justify-center gap-1.5 disabled:opacity-50"
          >
            <Check size={16} strokeWidth={3} /> Confirmar
          </button>
          <button
            onClick={() => agir(declinePayment, `Recusar o pagamento de ${formatCentsAbs(p.amount)}? Ele será removido.`)}
            disabled={busy}
            className="flex-1 py-3 rounded-2xl bg-red-500/10 text-red-400 text-sm font-bold disabled:opacity-50"
          >
            Recusar
          </button>
        </div>
      ) : (
        <p className="mt-2 text-[11px] text-amber-300">Esperando {firstName(outro.name)} confirmar</p>
      )}
    </li>
  );
}

export default function PendingBell({ abrir = false, onAbriu }) {
  const { paraConfirmar, aguardando } = usePendencias();
  const [open, setOpen] = useState(false);
  const n = paraConfirmar.length;
  const fechar = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (abrir) {
      setOpen(true);
      onAbriu?.();
    }
  }, [abrir, onAbriu]);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={n ? `${n} pagamento${n > 1 ? 's' : ''} para confirmar` : 'Pendências'}
        className={`hit-area relative w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
          n ? 'bg-accent/15 text-accent-bright' : 'bg-white/5 text-muted-light hover:text-white'
        }`}
      >
        <Bell size={17} />
        {n > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-accent text-white text-[10px] font-extrabold flex items-center justify-center ring-2 ring-ink">
            {n > 9 ? '9+' : n}
          </span>
        )}
      </button>

      {open && (
        <Sheet onClose={fechar}>
          <h2 className="text-lg font-extrabold">Pendências</h2>

          <p className="label-caps mt-5">Para você confirmar ({paraConfirmar.length})</p>
          {paraConfirmar.length === 0 ? (
            <div className="card-flat p-4 mt-2 text-sm text-muted text-center">Nada para confirmar ✨</div>
          ) : (
            <ul className="mt-2 space-y-2.5">
              {paraConfirmar.map((p) => (
                <Linha key={p.id} p={p} recebo />
              ))}
            </ul>
          )}

          {aguardando.length > 0 && (
            <>
              <p className="label-caps mt-6">Esperando os outros ({aguardando.length})</p>
              <ul className="mt-2 space-y-2.5">
                {aguardando.map((p) => (
                  <Linha key={p.id} p={p} recebo={false} />
                ))}
              </ul>
            </>
          )}
        </Sheet>
      )}
    </>
  );
}
