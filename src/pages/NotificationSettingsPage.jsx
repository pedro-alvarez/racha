/**
 * Avisos no celular (Web Push): ativar/desativar neste aparelho, mandar um
 * teste e escolher o que receber. As escolhas ficam no perfil (valem para
 * todos os aparelhos da pessoa); a ativação é por aparelho.
 * No iPhone, só funciona com o Racha instalado na tela de início (iOS 16.4+).
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, BellOff, BellRing, Moon, Share, Smartphone } from 'lucide-react';
import { useApp } from '../context/AppContext';
import * as dataService from '../lib/dataService';

const PADRAO = {
  ativo: true,
  despesas: true,
  edicoes: true,
  pagamentos: true,
  confirmacoes: true,
  lembretes: true,
  silencio: false,
  silencio_inicio: 23,
  silencio_fim: 8,
};

const TIPOS = [
  { id: 'despesas', label: 'Nova despesa', desc: 'Quando lançam uma despesa em que você entra' },
  { id: 'edicoes', label: 'Despesa editada', desc: 'Quando mudam uma despesa e a sua parte' },
  { id: 'pagamentos', label: 'Alguém te pagou', desc: 'Para você conferir e confirmar' },
  { id: 'confirmacoes', label: 'Seu pagamento', desc: 'Quando confirmam ou recusam o que você pagou' },
  { id: 'lembretes', label: 'Lembretes de pagamento', desc: 'Quando alguém lembra que você ainda deve (no máximo 1 por dia de cada pessoa)' },
];

const HORAS = Array.from({ length: 24 }, (_, h) => h);

function Chave({ ligada, onChange, disabled, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ligada}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!ligada)}
      className={`relative w-12 h-7 rounded-full transition shrink-0 disabled:opacity-40 ${ligada ? 'bg-accent' : 'bg-white/15'}`}
    >
      <span
        className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${ligada ? 'left-6' : 'left-1'}`}
      />
    </button>
  );
}

export default function NotificationSettingsPage() {
  const { currentUser, updateUser } = useApp();
  const navigate = useNavigate();
  const suporte = dataService.pushSupport();
  const [ativoAqui, setAtivoAqui] = useState(null); // null = verificando
  const [ocupado, setOcupado] = useState(false);
  const [msg, setMsg] = useState('');
  const [prefs, setPrefs] = useState({ ...PADRAO, ...(currentUser?.notifyPrefs ?? {}) });

  useEffect(() => {
    dataService
      .getPushSubscription()
      .then((s) => setAtivoAqui(Boolean(s)))
      .catch(() => setAtivoAqui(false));
  }, []);

  const salvar = async (mudanca) => {
    const novo = { ...prefs, ...mudanca };
    setPrefs(novo);
    try {
      await updateUser(currentUser.id, { notifyPrefs: novo });
    } catch (err) {
      setMsg(err.message);
    }
  };

  const ativar = async () => {
    setOcupado(true);
    setMsg('');
    try {
      await dataService.enablePush();
      setAtivoAqui(true);
      await dataService.sendTestPush();
      setMsg('Pronto! Mandamos um aviso de teste para este celular.');
    } catch (err) {
      setMsg(err.message);
    } finally {
      setOcupado(false);
    }
  };

  const desativar = async () => {
    setOcupado(true);
    setMsg('');
    try {
      await dataService.disablePush();
      setAtivoAqui(false);
    } catch (err) {
      setMsg(err.message);
    } finally {
      setOcupado(false);
    }
  };

  const testar = async () => {
    setOcupado(true);
    setMsg('');
    try {
      const r = await dataService.sendTestPush();
      setMsg(r?.enviados ? 'Aviso de teste enviado. Deve chegar em alguns segundos.' : 'Não achamos este celular. Desative e ative de novo.');
    } catch (err) {
      setMsg(err.message);
    } finally {
      setOcupado(false);
    }
  };

  const bloqueado = suporte.permission === 'denied';

  return (
    <div className="pt-4 md:pt-0">
      <button onClick={() => navigate(-1)} className="flex items-center gap-1.5 text-sm text-muted hover:text-white">
        <ArrowLeft size={16} /> Conta
      </button>
      <h1 className="mt-3 text-3xl font-extrabold tracking-tight">Avisos no celular</h1>
      <p className="mt-1 text-sm text-muted">Receba um aviso quando algo mudar, mesmo com o Racha fechado.</p>

      {/* este aparelho */}
      <section className="card-gradient p-5 mt-5">
        <div className="flex items-center gap-3">
          <span className="w-11 h-11 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
            <Smartphone size={20} />
          </span>
          <div className="flex-1 min-w-0">
            <p className="font-bold">Neste celular</p>
            <p className="text-xs text-muted-light">
              {!suporte.ok
                ? 'Ainda não dá para ativar aqui'
                : bloqueado
                  ? 'Bloqueado nas configurações'
                  : ativoAqui === null
                    ? 'Verificando…'
                    : ativoAqui
                      ? 'Avisos ativados'
                      : 'Avisos desativados'}
            </p>
          </div>
        </div>

        {!suporte.ok && suporte.ios && !suporte.standalone ? (
          <div className="mt-4 rounded-2xl bg-black/25 p-4 text-sm">
            <p className="font-semibold">No iPhone, primeiro instale o Racha:</p>
            <ol className="mt-2 space-y-1.5 text-muted-light list-decimal list-inside">
              <li>
                No Safari, toque em <Share size={14} className="inline -mt-0.5" /> Compartilhar.
              </li>
              <li>Escolha “Adicionar à Tela de Início”.</li>
              <li>Abra o Racha pelo ícone novo e volte nesta tela.</li>
            </ol>
            <p className="mt-2 text-xs text-muted">Precisa do iOS 16.4 ou mais novo.</p>
          </div>
        ) : !suporte.ok ? (
          <p className="mt-4 text-sm text-muted-light">
            Este navegador não aceita notificações. No Android, abra o Racha no Chrome.
          </p>
        ) : bloqueado ? (
          <p className="mt-4 text-sm text-muted-light">
            Você bloqueou as notificações do Racha. Libere em Ajustes → Notificações (iPhone) ou nas configurações do site
            no Chrome, e volte aqui.
          </p>
        ) : ativoAqui ? (
          <div className="mt-4 flex gap-2">
            <button
              onClick={testar}
              disabled={ocupado}
              className="flex-1 py-3 rounded-2xl bg-white/10 text-sm font-bold hover:bg-white/15 transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <BellRing size={16} /> Enviar teste
            </button>
            <button
              onClick={desativar}
              disabled={ocupado}
              className="flex-1 py-3 rounded-2xl bg-white/5 text-sm font-bold text-muted-light hover:text-white transition disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <BellOff size={16} /> Desativar
            </button>
          </div>
        ) : (
          <button
            onClick={ativar}
            disabled={ocupado || ativoAqui === null}
            className="mt-4 w-full py-3.5 rounded-2xl bg-gradient-to-br from-accent to-accent-bright font-bold shadow-fab disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <BellRing size={17} /> {ocupado ? 'Ativando…' : 'Ativar neste celular'}
          </button>
        )}
        {msg && <p className="mt-3 text-xs text-muted-light">{msg}</p>}
      </section>

      {/* o que receber */}
      <p className="label-caps mt-7">O que receber</p>
      <div className="mt-3 card-flat divide-y divide-white/5">
        <div className="p-4 flex items-center gap-3">
          <div className="flex-1">
            <p className="font-semibold text-sm">Receber avisos</p>
            <p className="text-xs text-muted">Desligue para pausar tudo, em todos os seus aparelhos</p>
          </div>
          <Chave label="Receber avisos" ligada={prefs.ativo} onChange={(v) => salvar({ ativo: v })} />
        </div>
        {TIPOS.map((t) => (
          <div key={t.id} className={`p-4 flex items-center gap-3 ${prefs.ativo ? '' : 'opacity-50'}`}>
            <div className="flex-1">
              <p className="font-semibold text-sm">{t.label}</p>
              <p className="text-xs text-muted">{t.desc}</p>
            </div>
            <Chave label={t.label} ligada={prefs[t.id]} disabled={!prefs.ativo} onChange={(v) => salvar({ [t.id]: v })} />
          </div>
        ))}
      </div>

      {/* silêncio à noite */}
      <p className="label-caps mt-7">Silêncio</p>
      <div className={`mt-3 card-flat p-4 ${prefs.ativo ? '' : 'opacity-50'}`}>
        <div className="flex items-center gap-3">
          <Moon size={18} className="text-muted-light shrink-0" />
          <div className="flex-1">
            <p className="font-semibold text-sm">Silêncio à noite</p>
            <p className="text-xs text-muted">Nesse horário os avisos não chegam (horário de Brasília)</p>
          </div>
          <Chave
            label="Silêncio à noite"
            ligada={prefs.silencio}
            disabled={!prefs.ativo}
            onChange={(v) => salvar({ silencio: v })}
          />
        </div>
        {prefs.silencio && (
          <div className="mt-4 flex items-center gap-2 text-sm">
            <span className="text-muted">Das</span>
            <select
              value={prefs.silencio_inicio}
              onChange={(e) => salvar({ silencio_inicio: Number(e.target.value) })}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 [color-scheme:dark]"
            >
              {HORAS.map((h) => (
                <option key={h} value={h}>{`${h}h`}</option>
              ))}
            </select>
            <span className="text-muted">às</span>
            <select
              value={prefs.silencio_fim}
              onChange={(e) => salvar({ silencio_fim: Number(e.target.value) })}
              className="bg-white/5 border border-white/10 rounded-xl px-3 py-2 [color-scheme:dark]"
            >
              {HORAS.map((h) => (
                <option key={h} value={h}>{`${h}h`}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
