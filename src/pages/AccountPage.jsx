/**
 * Conta: perfil mockado (com Pix em destaque) + placeholder EXPLÍCITO de
 * autenticação. Quando o backend existir, este é o ponto de entrada do login.
 */
import { useNavigate } from 'react-router-dom';
import { ChevronRight, KeyRound, LogOut, QrCode, RotateCcw, ShieldAlert } from 'lucide-react';
import { useApp } from '../context/AppContext';
import Avatar from '../components/Avatar';
import { PIX_TYPES } from './ProfilePage';

export default function AccountPage() {
  const { currentUser, resetDemo } = useApp();
  const navigate = useNavigate();

  return (
    <div className="pt-4 md:pt-0">
      <h1 className="text-3xl font-extrabold tracking-tight">Conta</h1>

      <button
        onClick={() => navigate(`/perfil/${currentUser.id}`)}
        className="w-full card-gradient p-6 mt-6 flex items-center gap-4 text-left hover:brightness-110 transition"
      >
        <Avatar user={currentUser} size="xl" />
        <div className="min-w-0 flex-1">
          <p className="text-xl font-bold truncate">{currentUser?.name}</p>
          <p className="text-sm text-muted truncate">{currentUser?.email}</p>
          <span className="inline-block mt-2 px-2.5 py-1 rounded-full text-[11px] font-semibold text-positive bg-positive/15">
            Conta demo
          </span>
        </div>
        <ChevronRight size={18} className="text-muted shrink-0" />
      </button>

      {/* Pix em destaque */}
      <button
        onClick={() => navigate(`/perfil/${currentUser.id}`)}
        className="w-full card-flat p-5 mt-4 text-left hover:bg-white/5 transition"
      >
        <div className="flex items-center justify-between">
          <p className="label-caps flex items-center gap-1.5">
            <QrCode size={13} /> Sua chave Pix
          </p>
          {currentUser?.pix && (
            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-accent/20 text-accent-bright uppercase tracking-wide">
              {PIX_TYPES[currentUser.pix.type] ?? currentUser.pix.type}
            </span>
          )}
        </div>
        <p className="mt-2 font-bold break-all">
          {currentUser?.pix?.key ?? (
            <span className="text-muted font-normal">Nenhuma chave — toque para adicionar</span>
          )}
        </p>
        <p className="mt-1 text-[11px] text-muted">Toque para editar perfil, foto e Pix</p>
      </button>

      {/* ---------------------------------------------------------------- */}
      {/* PLACEHOLDER DE AUTENTICAÇÃO                                       */}
      {/* Quando o backend real existir:                                    */}
      {/* 1. dataService.login() passa a chamar POST /auth/login            */}
      {/* 2. o token fica no dataService (nunca nos componentes)            */}
      {/* 3. LoginPage vira o gate real de entrada do app                   */}
      {/* ---------------------------------------------------------------- */}
      <section className="card-flat p-5 mt-4 border-dashed border-accent/40">
        <div className="flex items-start gap-3">
          <span className="w-10 h-10 rounded-2xl bg-accent/15 text-accent-bright flex items-center justify-center shrink-0">
            <ShieldAlert size={18} />
          </span>
          <div>
            <p className="font-bold">Autenticação real em breve</p>
            <p className="text-sm text-muted mt-1">
              Hoje você está logado como usuário de demonstração. Este bloco marca onde
              entrará o login com backend (e-mail/senha, Google etc.).
            </p>
            <button
              onClick={() => navigate('/login')}
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-accent-bright"
            >
              <KeyRound size={15} /> Ver tela de login (protótipo)
            </button>
          </div>
        </div>
      </section>

      <section className="mt-4 space-y-2.5">
        <button
          onClick={async () => {
            if (confirm('Restaurar os dados de demonstração? Tudo que você criou será apagado.')) {
              await resetDemo();
              navigate('/');
            }
          }}
          className="w-full card-flat p-4 flex items-center gap-3 text-left hover:bg-white/5 transition"
        >
          <RotateCcw size={18} className="text-muted" />
          <span className="text-sm font-semibold">Restaurar dados de demonstração</span>
        </button>
        <button
          onClick={() => navigate('/login')}
          className="w-full card-flat p-4 flex items-center gap-3 text-left hover:bg-white/5 transition"
        >
          <LogOut size={18} className="text-accent-bright" />
          <span className="text-sm font-semibold text-accent-bright">Sair (simulado)</span>
        </button>
      </section>
    </div>
  );
}
