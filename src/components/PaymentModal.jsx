/**
 * Modal de registro de pagamento: mostra quem paga quem, o valor,
 * a chave Pix de quem recebe (com copiar) e envia para confirmação.
 * Se quem registra é o próprio recebedor, confirma na hora.
 *
 * Três jeitos de pagar: o total da dívida, por despesa (escolhe quais
 * despesas está quitando; o pagamento guarda os ids delas) ou um valor livre.
 */
import { useState } from 'react';
import { ArrowRight, Check, Copy, QrCode } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { formatCentsAbs, formatDate, firstName, maskCents, parseToCents } from '../lib/format';
import Avatar from './Avatar';
import Sheet from './Sheet';
import { expenseCoverage } from '../lib/splitEngine';
import { chavePix, pixCopiaECola } from '../lib/pix';
import PixCopy from './PixCopy';
import * as dataService from '../lib/dataService';
import { ReceiptLink, ReceiptPicker } from './Receipt';

export default function PaymentModal({ transfer, tripId, onClose }) {
  const { userById, currentUser, settleDebt, confirmPayment, paymentsByTrip } = useApp();
  const [mode, setMode] = useState('all');
  const [selected, setSelected] = useState(new Set());
  const [customText, setCustomText] = useState('');
  const [note, setNote] = useState('');
  const [receipt, setReceipt] = useState(null);
  const [copied, setCopied] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const from = userById(transfer.from);
  const to = userById(transfer.to);
  const iAmReceiver = transfer.to === currentUser?.id;
  const iAmPayer = transfer.from === currentUser?.id;

  // pagamentos de quem deve para quem recebe: os confirmados já saíram da
  // dívida; os pendentes ainda não, mas não podem ser pagos de novo
  const between = (paymentsByTrip?.[tripId] ?? []).filter((p) => p.from === transfer.from && p.to === transfer.to);
  const pending = between.filter((p) => p.status === 'pending');
  const pendingSum = pending.reduce((s, p) => s + p.amount, 0);
  const nameOf = (id) => (id === currentUser?.id ? 'você' : firstName(userById(id).name));
  const descriptionOf = Object.fromEntries((transfer.items ?? []).map((it) => [it.id, it.description]));

  // o que ainda falta pagar, descontando o que já foi registrado e aguarda confirmação.
  // Nenhum jeito de pagar passa disso: evita pagar duas vezes a mesma coisa.
  const open = Math.max(0, transfer.amount - pendingSum);
  // quanto de cada despesa já foi pago "por despesa": só confirmados e com os pendentes
  const covConfirmed = expenseCoverage(transfer);
  const covAll = expenseCoverage(transfer, pending);
  const expenseRows = (transfer.items ?? [])
    .filter((it) => it.kind === 'expense' && it.amount > 0 && covConfirmed[it.id]?.left > 0)
    .map((it) => ({
      ...it,
      left: covConfirmed[it.id].left, // falta pagar desta despesa (confirmados)
      payable: Math.max(0, covAll[it.id].left), // descontando também os pendentes
      partial: covConfirmed[it.id].paid > 0,
    }));
  const selectedSum = expenseRows.filter((it) => selected.has(it.id)).reduce((s, it) => s + it.payable, 0);
  const customAmount = parseToCents(customText);
  const amount = mode === 'all' ? open : mode === 'expenses' ? Math.min(selectedSum, open) : customAmount;
  const capped = mode === 'expenses' && selectedSum > open;
  const offsets = (transfer.items ?? []).filter((it) => it.kind === 'expense' && it.amount < 0);

  const handleConfirmPending = async (paymentId) => {
    setSaving(true);
    try {
      await confirmPayment(paymentId);
      onClose();
    } catch (err) {
      setSaving(false);
      setError(err.message);
    }
  };

  const toggleExpense = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  // Pix copia e cola com o valor já preenchido: cola no app do banco e paga
  const pixCode =
    to.pix?.key && amount > 0
      ? pixCopiaECola({ key: chavePix(to.pix.type, to.pix.key), name: to.name, amount, info: 'Racha' })
      : null;

  const copyPix = async () => {
    try {
      await navigator.clipboard.writeText(to.pix?.key ?? '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard indisponível */
    }
  };

  const handleSubmit = async () => {
    setError('');
    if (open <= 0) return setError(`Já foi registrado tudo; falta ${firstName(to.name)} confirmar.`);
    if (mode === 'expenses' && selected.size === 0) return setError('Escolha ao menos uma despesa.');
    if (amount <= 0) return setError('Informe o valor do pagamento.');
    if (mode === 'custom' && amount > open)
      return setError(`O valor passa do que falta pagar (${formatCentsAbs(open)}).`);
    // quem recebe confirma na hora: pede uma checagem antes, para não registrar o valor errado
    if (iAmReceiver) {
      const chosen = expenseRows.filter((it) => selected.has(it.id)).map((it) => it.description);
      const what = mode === 'all' ? 'a dívida toda' : mode === 'expenses' ? chosen.join(', ') : 'um valor avulso';
      if (!confirm(`Confirmar que ${firstName(from.name)} te pagou ${formatCentsAbs(amount)} (${what})?`)) return;
    }
    setSaving(true);
    try {
      const receiptPath = receipt ? await dataService.uploadReceipt(tripId, receipt) : null;
      await settleDebt(tripId, {
        receiptPath,
        from: transfer.from,
        to: transfer.to,
        amount,
        note: note.trim(),
        expenseIds: mode === 'expenses' ? expenseRows.filter((it) => selected.has(it.id) && it.payable > 0).map((it) => it.id) : [],
      });
      onClose();
    } catch (err) {
      setSaving(false);
      setError(err.message);
    }
  };

  return (
    <Sheet onClose={onClose}>
      <h2 className="text-lg font-extrabold">
        {iAmPayer ? `Pagar ${firstName(to.name)}` : iAmReceiver ? 'Registrar recebimento' : 'Registrar pagamento'}
      </h2>

      {/* quem paga quem */}
      <div className="mt-5 flex items-center justify-center gap-4">
        <div className="flex flex-col items-center gap-1.5">
          <Avatar user={from} size="lg" />
          <p className="text-xs font-semibold">{transfer.from === currentUser?.id ? 'Você' : firstName(from.name)}</p>
        </div>
        <div className="flex flex-col items-center">
          <ArrowRight size={18} className="text-accent-bright" />
          <p className="mt-1 text-2xl font-extrabold text-accent-bright whitespace-nowrap">
            {formatCentsAbs(amount)}
          </p>
          {amount !== transfer.amount && (
            <p className="text-[11px] text-muted whitespace-nowrap">de {formatCentsAbs(transfer.amount)}</p>
          )}
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <Avatar user={to} size="lg" />
          <p className="text-xs font-semibold">{iAmReceiver ? 'Você' : firstName(to.name)}</p>
        </div>
      </div>

      {/* já registrado, aguardando quem recebe confirmar */}
      {pending.length > 0 && (
        <div className="card-flat p-4 mt-5 border-amber-400/25">
          <p className="label-caps text-amber-300">Aguardando confirmação</p>
          <ul className="mt-2 space-y-2.5">
            {pending.map((p) => (
              <li key={p.id} className="flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold">{formatCentsAbs(p.amount)}</p>
                  <p className="text-[11px] text-muted truncate">
                    {nameOf(p.from)} pagou {nameOf(p.to)}
                    {p.expenseIds?.length
                      ? `: ${p.expenseIds.map((id) => descriptionOf[id] ?? 'despesa').join(', ')}`
                      : ''}
                  </p>
                  <ReceiptLink path={p.receiptPath} className="mt-1" />
                </div>
                {iAmReceiver ? (
                  <button
                    onClick={() => handleConfirmPending(p.id)}
                    disabled={saving}
                    className="px-3 py-2 rounded-xl bg-positive/15 text-positive text-xs font-bold shrink-0 disabled:opacity-50"
                  >
                    Confirmar
                  </button>
                ) : (
                  <p className="text-[11px] text-amber-300 shrink-0">falta {nameOf(p.to)} confirmar</p>
                )}
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-muted">
            Esse valor ainda conta na dívida até ser confirmado. Falta pagar {formatCentsAbs(open)}.
          </p>
          {pendingSum > transfer.amount && (
            <p className="mt-2 text-[11px] font-semibold text-amber-300">
              Os pagamentos aguardando somam {formatCentsAbs(pendingSum)}, mais do que a dívida (
              {formatCentsAbs(transfer.amount)}). Se algum foi registrado duas vezes,{' '}
              {iAmReceiver ? 'recuse o repetido' : 'cancele o repetido'} em “Aguardando confirmação”, no fim da tela
              de acerto.
            </p>
          )}
        </div>
      )}

      {/* quanto pagar */}
      <div className="mt-5 flex rounded-full bg-white/5 p-1">
        {[
          { id: 'all', label: 'Tudo' },
          { id: 'expenses', label: 'Por despesa' },
          { id: 'custom', label: 'Outro valor' },
        ].map((m) => (
          <button
            key={m.id}
            type="button"
            onClick={() => {
              setMode(m.id);
              setError('');
            }}
            className={`flex-1 py-1.5 rounded-full text-xs font-semibold transition ${
              mode === m.id ? 'bg-accent text-white' : 'text-muted'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === 'expenses' && (
        <div className="mt-3">
          {expenseRows.length === 0 ? (
            <p className="text-sm text-muted text-center py-2">Não há despesas em aberto nesta dívida.</p>
          ) : (
            <ul className="space-y-2">
              {expenseRows.map((it) => {
                const on = selected.has(it.id);
                const waiting = it.payable <= 0;
                return (
                  <li key={it.id}>
                    <button
                      type="button"
                      onClick={() => !waiting && toggleExpense(it.id)}
                      disabled={waiting}
                      className={`w-full card-flat p-3 flex items-center gap-3 text-left transition ${on ? 'border-accent/50' : ''} ${
                        waiting ? 'opacity-60' : ''
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded-full flex items-center justify-center shrink-0 ${on ? 'bg-accent' : 'bg-white/10'}`}
                      >
                        {on && <Check size={13} />}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold truncate">{it.description}</span>
                        <span className="block text-[11px] text-muted">
                          {formatDate(String(it.date).slice(0, 10))} · parte de{' '}
                          {transfer.from === currentUser?.id ? 'você' : firstName(from.name)}
                          {it.partial && <span> · parte já paga</span>}
                          {waiting ? (
                            <span className="text-amber-300"> · paga, aguardando confirmação</span>
                          ) : (
                            it.payable < it.left && (
                              <span className="text-amber-300"> · {formatCentsAbs(it.left - it.payable)} aguardando confirmação</span>
                            )
                          )}
                        </span>
                      </span>
                      <span className="text-sm font-bold">{formatCentsAbs(waiting ? it.left : it.payable)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {capped && (
            <p className="mt-2 text-xs text-muted">
              As despesas somam {formatCentsAbs(selectedSum)}, mas falta pagar {formatCentsAbs(open)}
              {offsets.length > 0 &&
                `: ${firstName(to.name)} também tem parte em despesas que ${
                  transfer.from === currentUser?.id ? 'você pagou' : `${firstName(from.name)} pagou`
                } (${offsets.map((it) => it.description).join(', ')}), e isso já desconta`}
              {pendingSum > 0 && `${offsets.length > 0 ? ',' : ':'} já tem ${formatCentsAbs(pendingSum)} aguardando confirmação`}
              . O pagamento fica em {formatCentsAbs(open)}.
            </p>
          )}
        </div>
      )}

      {mode === 'custom' && (
        <div className="relative mt-3">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted font-semibold">R$</span>
          <input
            inputMode="numeric"
            className="w-full bg-white/5 border border-white/10 rounded-2xl pl-11 pr-4 py-3 text-lg font-bold placeholder:text-muted focus:outline-none focus:border-accent/60"
            placeholder="0,00"
            value={customText}
            onChange={(e) => setCustomText(maskCents(e.target.value))}
          />
        </div>
      )}

      {/* pix de quem recebe */}
      {!iAmReceiver && (
        <div className="card-flat p-4 mt-5">
          <p className="label-caps flex items-center gap-1.5">
            <QrCode size={12} /> Pix de {firstName(to.name)}
          </p>
          {to.pix?.key ? (
            <div className="mt-2 flex items-center gap-3">
              <p className="flex-1 text-sm font-bold break-all">{to.pix.key}</p>
              <button
                onClick={copyPix}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition ${
                  copied ? 'bg-positive/20 text-positive' : 'bg-white/10 hover:bg-white/15'
                }`}
              >
                {copied ? <Check size={13} /> : <Copy size={13} />}
                {copied ? 'Copiado!' : 'Copiar'}
              </button>
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted">Sem chave cadastrada. Combina com a pessoa por fora.</p>
          )}
          {pixCode && (
            <>
              <PixCopy to={to} amount={amount} className="mt-3" />
              <p className="mt-2 text-[11px] text-muted">
                “Chave + valor”: cole na IA do seu banco (ex.: Nubank). “Copia e cola”: no app do banco, Pix → Pix Copia e
                Cola → cole. Depois volte aqui e toque em Pagar.
              </p>
            </>
          )}
        </div>
      )}

      <ReceiptPicker file={receipt} onChange={setReceipt} />

      <input
        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm placeholder:text-muted focus:outline-none focus:border-accent/60 mt-4"
        placeholder="Observação (opcional): Pix, dinheiro…"
        value={note}
        onChange={(e) => setNote(e.target.value)}
      />

      <p className="mt-3 text-xs text-muted text-center">
        {iAmReceiver
          ? 'Você é quem recebe: o pagamento entra confirmado direto.'
          : `${firstName(to.name)} vai precisar confirmar o recebimento pra entrar no saldo.`}
      </p>

      {error && <p className="mt-2 text-sm text-accent-bright text-center">{error}</p>}

      <button
        onClick={handleSubmit}
        disabled={saving || open <= 0}
        className="mt-4 w-full py-3.5 rounded-2xl bg-gradient-to-br from-accent to-accent-bright font-bold disabled:opacity-50"
      >
        {saving
          ? receipt
            ? 'Enviando comprovante…'
            : 'Registrando…'
          : open <= 0
            ? 'Nada a pagar agora'
            : iAmReceiver
            ? 'Confirmar recebimento'
            : iAmPayer
              ? `Pagar ${formatCentsAbs(amount)}`
              : 'Registrar pagamento'}
      </button>
    </Sheet>
  );
}
