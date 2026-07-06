/** Criar nova viagem/rolê: nome, emoji, datas, hora e descrição opcionais, membros. */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check } from 'lucide-react';
import { useApp } from '../context/AppContext';
import Avatar from '../components/Avatar';

const EMOJIS = ['✈️', '🏖️', '🏔️', '🍖', '🎉', '🏕️', '🚗', '🛳️'];

export default function NewTripPage() {
  const { friends, currentUser, createTrip } = useApp();
  const navigate = useNavigate();

  const [type, setType] = useState('viagem'); // viagem | role
  const [name, setName] = useState('');
  const [emoji, setEmoji] = useState('✈️');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [description, setDescription] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const toggle = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return setError(type === 'role' ? 'Dê um nome para o rolê.' : 'Dê um nome para a viagem.');
    // rolês podem nascer só com o criador - as pessoas entram sozinhas depois
    setSaving(true);
    const trip = await createTrip({
      name: name.trim(),
      emoji,
      type,
      description,
      startDate,
      endDate: type === 'role' ? startDate : endDate,
      startTime: type === 'role' ? startTime : '',
      members: [currentUser.id, ...selected],
    });
    navigate(`/viagem/${trip.id}`);
  };

  const inputCls =
    'w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm placeholder:text-muted focus:outline-none focus:border-accent/60';

  return (
    <div className="pt-4 md:pt-0">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted hover:text-white">
        <ArrowLeft size={16} /> Voltar
      </button>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight">
        {type === 'role' ? 'Novo rolê' : 'Nova viagem'}
      </h1>

      <form onSubmit={handleSubmit} className="mt-6 space-y-5">
        {/* Tipo: viagem (vários dias) ou rolê (um dia) */}
        <div className="grid grid-cols-2 gap-2">
          {[
            { id: 'viagem', label: '✈️ Viagem', desc: 'privada, vários dias' },
            { id: 'role', label: '🎉 Rolê', desc: 'aberto, a galera entra' },
          ].map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setType(opt.id)}
              className={`p-3.5 rounded-2xl border text-left transition ${
                type === opt.id ? 'border-accent bg-accent/15' : 'border-white/10 bg-white/5'
              }`}
            >
              <p className="font-bold text-sm">{opt.label}</p>
              <p className="text-[11px] text-muted mt-0.5">{opt.desc}</p>
            </button>
          ))}
        </div>

        <div>
          <label className="label-caps">Nome</label>
          <input
            className={`${inputCls} mt-2`}
            placeholder={type === 'role' ? 'Ex.: Churras de Julho' : 'Ex.: Ubatuba 2026'}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div>
          <label className="label-caps">Ícone</label>
          <div className="flex gap-2 mt-2 flex-wrap">
            {EMOJIS.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setEmoji(e)}
                className={`w-11 h-11 rounded-2xl text-xl flex items-center justify-center border transition ${
                  emoji === e ? 'border-accent bg-accent/15' : 'border-white/10 bg-white/5'
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label-caps">{type === 'role' ? 'Data' : 'Início'}</label>
            <input type="date" className={`${inputCls} mt-2`} value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          {type === 'role' ? (
            <div>
              <label className="label-caps">Hora (opcional)</label>
              <input type="time" className={`${inputCls} mt-2`} value={startTime} onChange={(e) => setStartTime(e.target.value)} />
            </div>
          ) : (
            <div>
              <label className="label-caps">Fim</label>
              <input type="date" className={`${inputCls} mt-2`} value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
          )}
        </div>

        <div>
          <label className="label-caps">Descrição (opcional)</label>
          <textarea
            className={`${inputCls} mt-2 resize-none`}
            rows={3}
            placeholder={type === 'role' ? 'Ex.: Churras na casa do Thiago, leva o que for beber 🍻' : 'Ex.: Casa na praia, levar protetor e boné'}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <label className="label-caps">Membros</label>
          <ul className="mt-2 space-y-2">
            {friends.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => toggle(f.id)}
                  className={`w-full card-flat p-3 flex items-center gap-3 text-left transition ${
                    selected.has(f.id) ? 'border-accent/60' : ''
                  }`}
                >
                  <Avatar user={f} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{f.name}</p>
                    <p className="text-[11px] text-muted truncate">{f.email}</p>
                  </div>
                  <span
                    className={`w-5 h-5 rounded-full flex items-center justify-center ${
                      selected.has(f.id) ? 'bg-accent' : 'bg-white/10'
                    }`}
                  >
                    {selected.has(f.id) && <Check size={13} />}
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <p className="mt-2.5 text-[11px] text-muted">
            Não achou alguém? Convide pela aba <span className="font-semibold text-muted-light">Amigos</span>: a
            pessoa entra na lista assim que aceitar.
          </p>
        </div>

        {error && <p className="text-sm text-accent-bright">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="w-full py-3.5 rounded-2xl bg-gradient-to-br from-accent to-accent-bright font-bold disabled:opacity-50"
        >
          {saving ? 'Criando…' : type === 'role' ? 'Criar rolê' : 'Criar viagem'}
        </button>
      </form>
    </div>
  );
}
