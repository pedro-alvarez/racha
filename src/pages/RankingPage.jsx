/**
 * Ranking da viagem (tabela de liderança) e resumo de quando ela é encerrada.
 * Duas abas: Consumiu (a parte de cada um) e Pagou (o que cada um adiantou).
 * Aparece todo mundo; despesas marcadas "fora do ranking" não entram aqui.
 * Quem criou a viagem (ou o admin) encerra ou reabre por esta tela também.
 */
import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Check, Flag, PartyPopper, RotateCcw, Share2, Trophy } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { computeRanking } from '../lib/ranking';
import { formatCentsAbs, formatDateFull, firstName } from '../lib/format';
import Avatar from '../components/Avatar';
import FitText from '../components/FitText';

const MEDALHAS = ['🥇', '🥈', '🥉'];

export default function RankingPage() {
  const { tripId } = useParams();
  const { trips, expensesByTrip, userById, currentUser, setTripClosed } = useApp();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [aba, setAba] = useState('consumed');
  const [busy, setBusy] = useState(false);
  const [shared, setShared] = useState(false);

  const trip = trips.find((t) => t.id === tripId);
  const r = useMemo(
    () => computeRanking(expensesByTrip[tripId] ?? [], trip?.members ?? []),
    [expensesByTrip, tripId, trip]
  );
  if (!trip) return null;

  const fechada = Boolean(trip.closedAt);
  const podeGerenciar = trip.createdBy === currentUser.id || currentUser.role === 'admin';
  const lista = aba === 'consumed' ? r.byConsumed : r.byPaid;
  const valor = (p) => (aba === 'consumed' ? p.consumed : p.paid);
  const nome = (id) => (id === currentUser.id ? 'Você' : firstName(userById(id).name));

  const alternar = async () => {
    const msg = fechada
      ? 'Reabrir a viagem? O pessoal volta a poder lançar despesas.'
      : 'Encerrar a viagem? Ninguém lança despesa nova; os acertos continuam valendo.';
    if (!confirm(msg)) return;
    setBusy(true);
    try {
      await setTripClosed(trip.id, !fechada);
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  };

  const compartilhar = async () => {
    const linhas = r.byConsumed.map((p, i) => `${MEDALHAS[i] ?? `${i + 1}º`} ${firstName(userById(p.id).name)}: ${formatCentsAbs(p.consumed)}`);
    const titulos = r.titles.map((t) => `${t.emoji} ${t.titulo}: ${firstName(userById(t.id).name)}`);
    const texto = [
      `🏆 Ranking ${trip.emoji ?? ''} ${trip.name}`.trim(),
      `Total: ${formatCentsAbs(r.total)} · Média por pessoa: ${formatCentsAbs(r.average)}`,
      '',
      'Quem mais gastou:',
      ...linhas,
      ...(titulos.length ? ['', ...titulos] : []),
    ].join('\n');
    try {
      if (navigator.share) await navigator.share({ text: texto });
      else {
        await navigator.clipboard.writeText(texto);
        setShared(true);
        setTimeout(() => setShared(false), 1600);
      }
    } catch {
      /* cancelou */
    }
  };

  const podio = lista.slice(0, 3);
  const ordemPodio = [podio[1], podio[0], podio[2]]; // 2º, 1º, 3º
  const alturas = ['h-20', 'h-28', 'h-14'];

  return (
    <div className="pt-4 md:pt-0">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted hover:text-white">
          <ArrowLeft size={16} /> {trip.name}
        </button>
        <button
          onClick={compartilhar}
          aria-label="Compartilhar ranking"
          className={`hit-area relative w-9 h-9 rounded-full flex items-center justify-center transition ${
            shared ? 'bg-positive/20 text-positive' : 'bg-white/5 text-muted-light hover:text-white'
          }`}
        >
          {shared ? <Check size={16} /> : <Share2 size={16} />}
        </button>
      </div>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight flex items-center gap-2.5">
        <Trophy size={26} className="text-amber-300" /> Ranking
      </h1>

      {fechada && (
        <div className="mt-4 card-flat border-amber-400/30 p-4 flex items-center gap-3">
          <PartyPopper size={20} className="text-amber-300 shrink-0" />
          <p className="text-sm">
            <b>{params.get('encerrada') ? 'Viagem encerrada! ' : 'Viagem encerrada'}</b>
            <span className="text-muted-light"> em {formatDateFull(trip.closedAt)}. Os acertos continuam valendo.</span>
          </p>
        </div>
      )}

      {/* números da viagem */}
      <section className="card-gradient p-5 mt-4 grid grid-cols-2 gap-4">
        <div className="min-w-0">
          <p className="label-caps">Total gasto</p>
          <FitText className="mt-1 text-2xl font-extrabold tabular-nums">{formatCentsAbs(r.total)}</FitText>
        </div>
        <div className="min-w-0">
          <p className="label-caps">Média por pessoa</p>
          <FitText className="mt-1 text-2xl font-extrabold tabular-nums">{formatCentsAbs(r.average)}</FitText>
          <p className="text-[11px] text-muted">total ÷ {r.members} pessoas</p>
        </div>
      </section>

      {/* abas */}
      <div className="mt-5 flex rounded-full bg-white/5 p-1 w-fit">
        {[
          { id: 'consumed', label: 'Consumiu' },
          { id: 'paid', label: 'Pagou' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setAba(t.id)}
            className={`px-5 py-1.5 rounded-full text-sm font-semibold transition ${aba === t.id ? 'bg-accent text-white' : 'text-muted'}`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-xs text-muted">
        {aba === 'consumed'
          ? 'Quanto cada um gastou de verdade: a parte de cada um nas despesas.'
          : 'Quanto cada um tirou do bolso na hora, adiantando para o grupo.'}
      </p>

      {/* pódio */}
      {r.total > 0 && (
        <div className="mt-5 grid grid-cols-3 gap-2 items-end">
          {ordemPodio.map((p, i) =>
            p ? (
              <div key={p.id} className="flex flex-col items-center">
                <span className="text-2xl">{MEDALHAS[[1, 0, 2][i]]}</span>
                <Avatar user={userById(p.id)} size={i === 1 ? 'lg' : 'md'} />
                <p className="mt-1.5 text-xs font-bold truncate max-w-full">{nome(p.id)}</p>
                <p className="text-[11px] text-muted-light tabular-nums">{formatCentsAbs(valor(p))}</p>
                <div
                  className={`mt-2 w-full ${alturas[i]} rounded-t-2xl ${
                    i === 1 ? 'bg-gradient-to-b from-accent to-accent/40' : 'bg-white/10'
                  }`}
                />
              </div>
            ) : (
              <div key={i} />
            )
          )}
        </div>
      )}

      {/* tabela completa: todo mundo */}
      <ul className="mt-4 space-y-2">
        {lista.map((p, i) => {
          const dif = p.consumed - r.average;
          return (
            <li
              key={p.id}
              className={`card-flat p-3.5 flex items-center gap-3 ${p.id === currentUser.id ? 'border-accent/40' : ''}`}
            >
              <span className="w-7 text-center text-sm font-extrabold text-muted-light">{MEDALHAS[i] ?? `${i + 1}º`}</span>
              <Avatar user={userById(p.id)} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{nome(p.id)}</p>
                {aba === 'consumed' && r.total > 0 && (
                  <p className={`text-[11px] ${dif > 0 ? 'text-accent-bright' : dif < 0 ? 'text-positive' : 'text-muted'}`}>
                    {dif === 0 ? 'na média' : `${formatCentsAbs(dif)} ${dif > 0 ? 'acima' : 'abaixo'} da média`}
                  </p>
                )}
              </div>
              <p className="font-extrabold tabular-nums">{formatCentsAbs(valor(p))}</p>
            </li>
          );
        })}
      </ul>

      {/* títulos */}
      {r.titles.length > 0 && (
        <>
          <p className="label-caps mt-7">Títulos da viagem</p>
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            {r.titles.map((t) => (
              <div key={t.titulo} className="card-flat p-3.5">
                <p className="text-2xl">{t.emoji}</p>
                <p className="mt-1 text-xs font-bold text-muted-light">{t.titulo}</p>
                <p className="text-sm font-extrabold truncate">{nome(t.id)}</p>
                <p className="text-[11px] text-muted tabular-nums">
                  {formatCentsAbs(t.valor)} {t.pagou ? 'pagos' : ''}
                </p>
              </div>
            ))}
          </div>
        </>
      )}

      {r.excluded.length > 0 && (
        <p className="mt-5 text-xs text-muted">
          Fora do ranking: {r.excluded.map((e) => `${e.description} (${formatCentsAbs(e.amount)})`).join(', ')}.
        </p>
      )}

      {podeGerenciar && (
        <button
          onClick={alternar}
          disabled={busy}
          className={`mt-8 w-full py-3.5 rounded-2xl font-bold flex items-center justify-center gap-2 disabled:opacity-50 ${
            fechada ? 'bg-white/5 text-muted-light hover:text-white' : 'bg-gradient-to-br from-accent to-accent-bright shadow-fab'
          }`}
        >
          {fechada ? <RotateCcw size={17} /> : <Flag size={17} />}
          {fechada ? 'Reabrir viagem' : 'Encerrar viagem'}
        </button>
      )}
    </div>
  );
}
