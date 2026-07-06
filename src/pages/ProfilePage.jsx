/**
 * Perfil de uma pessoa: avatar, dados, chave Pix em destaque (copiável)
 * e saldo entre vocês. Modo edição: nome, foto (URL), cor do avatar e Pix.
 */
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Camera, Check, Copy, Lock, Pencil, QrCode, Trash2 } from 'lucide-react';
import * as dataService from '../lib/dataService';
import { useApp } from '../context/AppContext';
import { useFriendBalances } from '../hooks/useFriendBalances';
import { formatCentsAbs, formatCents, formatDateFull, formatTime, firstName } from '../lib/format';
import Avatar from '../components/Avatar';

export const PIX_TYPES = {
  cpf: 'CPF',
  email: 'E-mail',
  celular: 'Celular',
  aleatoria: 'Chave aleatória',
};

const COLORS = ['#F0146B', '#8B5CF6', '#06B6D4', '#F59E0B', '#22C55E', '#3B82F6', '#EC4899', '#EF4444'];

export default function ProfilePage() {
  const { userId } = useParams();
  const { userById, currentUser, updateUser } = useApp();
  const balances = useFriendBalances();
  const navigate = useNavigate();

  const { trips, expensesByTrip, paymentsByTrip } = useApp();
  const [edits, setEdits] = useState([]);
  const user = userById(userId);
  const isMe = userId === currentUser?.id;
  const isAdmin = currentUser?.role === 'admin';
  const canEdit = isMe || isAdmin; // só você mesmo — ou o admin — edita um perfil
  const net = balances[userId] ?? 0;

  const [editing, setEditing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [form, setForm] = useState({ name: '', photo: '', color: '', pixType: 'email', pixKey: '' });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  const handlePhotoFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // permite escolher o mesmo arquivo de novo
    if (!file) return;
    if (!file.type.startsWith('image/')) return setUploadError('Escolha um arquivo de imagem.');
    if (file.size > 5 * 1024 * 1024) return setUploadError('Imagem muito grande (máx. 5 MB).');
    setUploadError('');
    setUploading(true);
    try {
      const url = await dataService.uploadAvatar(userId, file);
      setForm((f) => ({ ...f, photo: url }));
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  useEffect(() => {
    setForm({
      name: user?.name ?? '',
      photo: user?.photo ?? '',
      color: user?.color ?? COLORS[0],
      pixType: user?.pix?.type ?? 'email',
      pixKey: user?.pix?.key ?? '',
    });
  }, [user?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // histórico: tudo que a pessoa criou, pagou, acertou e alterou
  useEffect(() => {
    let alive = true;
    dataService
      .getUserEdits(userId)
      .then((e) => alive && setEdits(e))
      .catch(() => alive && setEdits([]));
    return () => (alive = false);
  }, [userId]);

  const historyItems = (() => {
    const items = [];
    for (const trip of trips) {
      if (trip.createdBy === userId && trip.createdAt) {
        items.push({
          t: trip.createdAt,
          text: `criou ${trip.type === 'role' ? 'o rolê' : 'a viagem'} "${trip.name}"`,
        });
      }
      for (const e of expensesByTrip[trip.id] ?? []) {
        if ((e.createdBy ?? e.paidBy) === userId) {
          items.push({
            t: e.createdAt,
            text: `criou a despesa "${e.description}" (${formatCents(e.amount)}) em ${trip.name}`,
          });
        } else if (e.paidBy === userId) {
          items.push({
            t: e.createdAt,
            text: `pagou "${e.description}" (${formatCents(e.amount)}) em ${trip.name}`,
          });
        }
      }
      for (const pay of paymentsByTrip[trip.id] ?? []) {
        if (pay.from === userId) {
          const to = userById(pay.to);
          items.push({
            t: pay.createdAt,
            text: `acertou ${formatCents(pay.amount)} com ${firstName(to.name)} em ${trip.name}`,
          });
        }
      }
    }
    for (const ed of edits) {
      for (const c of ed.changes) {
        items.push({
          t: ed.createdAt,
          text: `alterou ${c.field} de "${ed.expenseDescription}": ${c.old} → ${c.new}`,
        });
      }
    }
    return items.sort((a, b) => new Date(b.t) - new Date(a.t)).slice(0, 15);
  })();

  const copyPix = async () => {
    try {
      await navigator.clipboard.writeText(user.pix?.key ?? '');
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard indisponível */
    }
  };

  const handleSave = async () => {
    setSaving(true);
    await updateUser(userId, {
      name: form.name.trim() || user.name,
      photo: form.photo.trim() || null,
      color: form.color,
      pix: form.pixKey.trim() ? { type: form.pixType, key: form.pixKey.trim() } : null,
    });
    setSaving(false);
    setEditing(false);
  };

  const inputCls =
    'w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 text-sm placeholder:text-muted focus:outline-none focus:border-accent/60';

  return (
    <div className="pt-4 md:pt-0">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted hover:text-white">
          <ArrowLeft size={16} /> Voltar
        </button>
        {canEdit ? (
          <button
            onClick={() => setEditing((v) => !v)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/5 text-xs font-semibold text-muted-light hover:text-white transition"
          >
            <Pencil size={13} /> {editing ? 'Cancelar' : isMe ? 'Editar perfil' : 'Editar (admin)'}
          </button>
        ) : (
          <span className="flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-white/5 text-xs font-semibold text-muted">
            <Lock size={12} /> Somente leitura
          </span>
        )}
      </div>

      <div className="mt-6 flex flex-col items-center text-center">
        <Avatar user={editing ? { ...user, ...form, photo: form.photo || null } : user} size="xl" />
        <h1 className="mt-4 text-2xl font-extrabold">{user?.name}</h1>
        <p className="text-sm text-muted">{user?.email}</p>
        <div className="mt-2 flex gap-2">
          {isMe && (
            <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold text-positive bg-positive/15">
              Você
            </span>
          )}
          {user?.role === 'admin' && (
            <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wide bg-gradient-to-br from-accent to-accent-bright">
              Admin
            </span>
          )}
        </div>
      </div>

      {!editing ? (
        <>
          {/* Chave Pix em destaque */}
          <section className="card-gradient p-5 mt-7">
            <div className="flex items-center justify-between">
              <p className="label-caps flex items-center gap-1.5">
                <QrCode size={13} /> Chave Pix
              </p>
              {user?.pix && (
                <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-accent/20 text-accent-bright uppercase tracking-wide">
                  {PIX_TYPES[user.pix.type] ?? user.pix.type}
                </span>
              )}
            </div>
            {user?.pix ? (
              <div className="mt-3 flex items-center gap-3">
                <p className="flex-1 text-lg font-bold break-all">{user.pix.key}</p>
                <button
                  onClick={copyPix}
                  className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-2xl text-xs font-bold shrink-0 transition ${
                    copied ? 'bg-positive/20 text-positive' : 'bg-white/10 hover:bg-white/15'
                  }`}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
            ) : (
              <p className="mt-3 text-sm text-muted">
                Nenhuma chave cadastrada.
                {canEdit && (
                  <button onClick={() => setEditing(true)} className="ml-1 text-accent-bright font-semibold">
                    Adicionar
                  </button>
                )}
              </p>
            )}
          </section>

          {/* Saldo entre vocês */}
          {!isMe && (
            <section className="card-flat p-5 mt-4 flex items-center justify-between">
              <p className="text-sm text-muted">Saldo entre vocês</p>
              {net === 0 ? (
                <p className="font-bold text-muted-light">Em dia ✨</p>
              ) : net > 0 ? (
                <p className="font-extrabold text-positive">te deve {formatCentsAbs(net)}</p>
              ) : (
                <p className="font-extrabold text-accent-bright">você deve {formatCentsAbs(net)}</p>
              )}
            </section>
          )}

          {/* Histórico de atividade da pessoa */}
          <section className="mt-6">
            <p className="label-caps">Histórico</p>
            {historyItems.length === 0 ? (
              <div className="card-flat p-4 mt-2.5 text-sm text-muted text-center">
                Nenhuma atividade ainda.
              </div>
            ) : (
              <ul className="mt-2.5 space-y-2 stagger">
                {historyItems.map((h, i) => (
                  <li key={i} className="card-flat px-4 py-3 flex items-start gap-2.5">
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-accent shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-muted-light">
                        <span className="font-semibold text-white">
                          {isMe ? 'Você' : firstName(user.name)}
                        </span>{' '}
                        {h.text}
                      </p>
                      <p className="text-[11px] text-muted mt-0.5">
                        {formatDateFull(h.t)} às {formatTime(h.t)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : (
        /* ---------- modo edição ---------- */
        <div className="mt-7 space-y-5">
          <div>
            <label className="label-caps">Nome</label>
            <input className={`${inputCls} mt-2`} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>

          <div>
            <label className="label-caps">Foto de perfil</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoFile}
            />
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex-1 py-3 rounded-2xl bg-white/5 border border-white/10 text-sm font-semibold flex items-center justify-center gap-2 hover:bg-white/10 transition disabled:opacity-50"
              >
                <Camera size={16} />
                {uploading ? 'Enviando…' : form.photo ? 'Trocar foto' : 'Escolher foto'}
              </button>
              {form.photo && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, photo: '' })}
                  className="px-4 rounded-2xl bg-white/5 border border-white/10 text-muted hover:text-accent-bright transition"
                  aria-label="Remover foto"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
            {uploadError && <p className="mt-2 text-xs text-accent-bright">{uploadError}</p>}
            <p className="mt-2 text-[11px] text-muted">Sem foto, o avatar mostra suas iniciais.</p>
          </div>

          <div>
            <label className="label-caps">Cor do avatar</label>
            <div className="flex gap-2.5 mt-2 flex-wrap">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, color: c })}
                  className={`w-9 h-9 rounded-full transition ${form.color === c ? 'ring-2 ring-white ring-offset-2 ring-offset-ink' : ''}`}
                  style={{ background: c }}
                  aria-label={c}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="label-caps">Chave Pix</label>
            <div className="flex gap-2 mt-2">
              <select
                className="bg-white/5 border border-white/10 rounded-2xl px-3 py-3 text-sm focus:outline-none focus:border-accent/60 shrink-0 [&>option]:bg-ink"
                value={form.pixType}
                onChange={(e) => setForm({ ...form, pixType: e.target.value })}
              >
                {Object.entries(PIX_TYPES).map(([k, label]) => (
                  <option key={k} value={k}>{label}</option>
                ))}
              </select>
              <input
                className={inputCls}
                placeholder="Sua chave"
                value={form.pixKey}
                onChange={(e) => setForm({ ...form, pixKey: e.target.value })}
              />
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-br from-accent to-accent-bright font-bold disabled:opacity-50"
          >
            {saving ? 'Salvando…' : 'Salvar alterações'}
          </button>
        </div>
      )}
    </div>
  );
}
