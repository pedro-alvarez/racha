/**
 * Itens de atividade em dois formatos:
 * - "row" (Visão Geral): linha compacta com o SEU impacto à direita
 *   (Você deve / Emprestou / pagou), como na referência.
 * - "timeline" (Histórico): card com "Sua parte" e hora.
 */
import { useNavigate } from 'react-router-dom';
import Avatar from './Avatar';
import { useApp } from '../context/AppContext';
import { categoryOf, PAYMENT_ICON } from '../lib/categories';
import { computeShares } from '../lib/splitEngine';
import { formatCents, formatTime, firstName } from '../lib/format';

/** Resumo do impacto da despesa para o usuário logado. */
function useImpact(item) {
  const { currentUser } = useApp();
  if (item.kind === 'payment') {
    return { isPayment: true };
  }
  const iPaid = item.paidBy === currentUser.id;
  const iParticipate = item.participants.includes(currentUser.id);
  const myShare = iParticipate ? computeShares(item)[currentUser.id] ?? 0 : 0;
  const toReceive = iPaid ? item.amount - myShare : 0;
  return { isPayment: false, iPaid, iParticipate, myShare, toReceive };
}

function CategoryBubble({ item, payer, onOpenProfile }) {
  const { Icon, color } = categoryOf(item.category);
  return (
    <div className="relative shrink-0">
      <span
        className="w-10 h-10 rounded-2xl flex items-center justify-center"
        style={{ backgroundColor: `${color}26`, color }}
      >
        <Icon size={18} />
      </span>
      <Avatar
        user={payer}
        size="xs"
        ring
        className="absolute -bottom-1 -right-1"
        onClick={onOpenProfile}
      />
    </div>
  );
}

export function ActivityItem({ item }) {
  const { userById, currentUser } = useApp();
  const navigate = useNavigate();
  const impact = useImpact(item);

  if (impact.isPayment) {
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
            {item.tripName ? `${item.tripName} · ` : ''}Acerto registrado
          </p>
        </div>
        <p className="font-bold text-positive">{formatCents(item.amount)}</p>
      </li>
    );
  }

  const payer = userById(item.paidBy);
  const { iPaid, iParticipate, myShare, toReceive } = impact;

  return (
    <li className="card-flat p-4 flex items-center gap-3">
      <CategoryBubble item={item} payer={payer} onOpenProfile={() => navigate(`/perfil/${payer.id}`)} />
      <div className="flex-1 min-w-0">
        <p className="font-semibold truncate">{item.description}</p>
        <p className="text-xs text-muted mt-0.5">
          {item.tripName ? `${item.tripName} · ` : ''}
          {iPaid ? 'Você pagou' : `${firstName(payer.name)} pagou`} {formatCents(item.amount)}
        </p>
      </div>
      <div className="text-right shrink-0">
        {iPaid && toReceive > 0 ? (
          <>
            <p className="text-[11px] font-bold text-positive">Emprestou</p>
            <p className="font-extrabold text-positive">{formatCents(toReceive)}</p>
          </>
        ) : !iPaid && iParticipate ? (
          <>
            <p className="text-[11px] font-bold text-accent-bright">Você deve</p>
            <p className="font-extrabold text-accent-bright">{formatCents(myShare)}</p>
          </>
        ) : (
          <p className="font-bold text-muted-light">{formatCents(item.amount)}</p>
        )}
      </div>
    </li>
  );
}

export function TimelineItem({ item, isLast }) {
  const { userById, currentUser } = useApp();
  const navigate = useNavigate();
  const impact = useImpact(item);
  const HandIcon = PAYMENT_ICON;

  const payer = impact.isPayment ? userById(item.from) : userById(item.paidBy);

  return (
    <li className="flex gap-3">
      {/* trilho da timeline */}
      <div className="flex flex-col items-center">
        {impact.isPayment ? (
          <span className="w-10 h-10 rounded-full bg-positive/15 text-positive flex items-center justify-center shrink-0">
            <HandIcon size={18} />
          </span>
        ) : (
          <CategoryBubble item={item} payer={payer} onOpenProfile={() => navigate(`/perfil/${payer.id}`)} />
        )}
        {!isLast && <span className="w-px flex-1 bg-white/10 my-1.5" />}
      </div>

      {/* card */}
      <div className="card-flat p-4 flex-1 min-w-0 mb-3">
        <div className="flex items-start justify-between gap-3">
          <p className="font-semibold">
            {impact.isPayment
              ? `${payer.id === currentUser.id ? 'Você' : firstName(payer.name)} pagou ${
                  item.to === currentUser.id ? 'você' : firstName(userById(item.to).name)
                }`
              : item.description}
          </p>
          <p
            className={`font-extrabold whitespace-nowrap ${
              impact.isPayment || impact.iPaid
                ? 'text-positive'
                : impact.iParticipate
                  ? 'text-accent-bright'
                  : 'text-white'
            }`}
          >
            {formatCents(item.amount)}
          </p>
        </div>

        <p className="text-xs text-muted mt-1">
          {item.tripName ? `${item.tripName} · ` : ''}
          {impact.isPayment
            ? item.note || 'Acerto'
            : `${impact.iPaid ? 'Você' : firstName(payer.name)} pagou · ${item.participants.length} pessoas`}
        </p>

        {!impact.isPayment && impact.iParticipate && (
          <div className="mt-2.5 bg-white/5 rounded-xl px-3 py-2 text-xs flex items-center gap-1.5 flex-wrap">
            <span className="text-muted">Sua parte:</span>
            <span className={`font-bold ${impact.iPaid ? 'text-positive' : 'text-accent-bright'}`}>
              {formatCents(impact.myShare)}
            </span>
            {impact.iPaid && impact.toReceive > 0 && (
              <span className="text-muted">(a receber: {formatCents(impact.toReceive)})</span>
            )}
          </div>
        )}

        <p className="mt-2.5 text-[11px] text-muted">{formatTime(item.createdAt)}</p>
      </div>
    </li>
  );
}

export default function ActivityList({ items, limit, emptyText = 'Nada por aqui ainda.' }) {
  const list = limit ? items.slice(0, limit) : items;

  if (list.length === 0) {
    return <div className="card-flat p-5 mt-3 text-sm text-muted text-center">{emptyText}</div>;
  }

  return (
    <ul className="mt-3 space-y-2.5 stagger">
      {list.map((item) => (
        <ActivityItem key={item.id} item={item} />
      ))}
    </ul>
  );
}
