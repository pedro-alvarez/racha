/**
 * Card de saldo total do usuário na viagem, com contagem animada
 * e link "Acertar contas". Rosa = a pagar, verde = a receber.
 */
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCentsAbs } from '../lib/format';
import { useCountUp } from '../hooks/useCountUp';

export default function BalanceCard({ tripId, balance }) {
  const animated = useCountUp(balance);
  const negative = balance < 0;
  const zero = balance === 0;

  return (
    <section className="card-gradient p-6 mt-5">
      <p className="label-caps">Seu saldo total</p>
      <p
        className={`mt-2 text-4xl md:text-5xl font-extrabold tracking-tight tabular-nums ${
          zero ? 'text-white' : negative ? 'text-accent-bright' : 'text-positive'
        }`}
      >
        {negative ? '-' : ''}
        {formatCentsAbs(animated)}
      </p>
      <div className="mt-3 flex items-end justify-between gap-4">
        <p className="text-sm text-muted-light">
          {zero ? 'tudo acertado por aqui 🎉' : negative ? 'a pagar no total' : 'a receber no total'}
        </p>
        <Link
          to={`/viagem/${tripId}/acertar`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-accent-bright hover:text-white transition-colors shrink-0 group"
        >
          Acertar contas
          <ArrowRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
        </Link>
      </div>
    </section>
  );
}
