/**
 * Minha Conta — como na referência: avatar central com lápis, plano,
 * seções GERAL e PAGAMENTOS, mais o placeholder explícito de autenticação.
 */
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  ChevronRight,
  CreditCard,
  KeyRound,
  Landmark,
  LogOut,
  Pencil,
  Settings,
  UserRound,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useFriendBalances } from '../hooks/useFriendBalances';
import { maskPix } from '../lib/format';
import Avatar from '../components/Avatar';

function Row({ Icon, label, value, dot, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full card-flat p-4 flex items-center gap-3.5 text-left hover:bg-white/5 transition"
    >
      <span className="w-10 h-10 rounded-2xl bg-white/5 flex items-center justify-center text-muted-light shrink-0">
        <Icon size={18} />
      </span>
      <span className="flex-1 font-semibold text-sm">{label}</span>
      {value && <span className="text-xs text-muted font-semibold">{value}</span>}
      {dot && <span className="w-2 h-2 rounded-full bg-accent-bright" />}
      <ChevronRight size={16} className="text-muted shrink-0" />
    </button>
  );
}

export default function AccountPage() {
  const { currentUser, logout } = useApp();
  const balances = useFriendBalances();
  const navigate = useNavigate();

  const hasPendingDebts = Object.values(balances).some((v) => v !== 0);
  const goProfile = () => navigate(`/perfil/${currentUser.id}`);

  return (
    <div className="pt-4 md:pt-0">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">Minha Conta</h1>
        <button
          onClick={goProfile}
          className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-muted-light hover:text-white transition"
          aria-label="Configurações"
        >
          <Settings size={18} />
        </button>
      </div>

      {/* Perfil central */}
      <div className="mt-7 flex flex-col items-center text-center">
        <button onClick={goProfile} className="relative">
          <Avatar user={currentUser} size="xl" />
          <span className="absolute -bottom-0.5 -right-0.5 w-7 h-7 rounded-full bg-accent flex items-center justify-center ring-4 ring-ink">
            <Pencil size={12} />
          </span>
        </button>
        <p className="mt-3.5 text-xl font-extrabold">{currentUser?.name}</p>
        <p className="text-sm text-muted">{currentUser?.email}</p>
        <span className="mt-2.5 px-3.5 py-1.5 rounded-full text-[11px] font-extrabold tracking-widest uppercase bg-gradient-to-br from-accent to-accent-bright">
          {currentUser?.role === 'admin' ? 'Admin · Plano Pro' : 'Plano Pro'}
        </span>
      </div>

      {/* GERAL */}
      <p className="label-caps mt-8">Geral</p>
      <div className="mt-3 space-y-2.5">
        <Row Icon={UserRound} label="Dados Pessoais" onClick={goProfile} />
        <Row
          Icon={Bell}
          label="Notificações"
          dot={hasPendingDebts}
          onClick={() => navigate('/notificacoes')}
        />
        <Row Icon={KeyRound} label="Segurança" onClick={() => navigate('/login')} />
      </div>

      {/* PAGAMENTOS */}
      <p className="label-caps mt-7">Pagamentos</p>
      <div className="mt-3 space-y-2.5">
        <Row Icon={CreditCard} label="Métodos de Pagamento" value="em breve" onClick={goProfile} />
        <Row Icon={Landmark} label="Chave PIX" value={maskPix(currentUser?.pix) ?? 'adicionar'} onClick={goProfile} />
      </div>

      <div className="mt-7 space-y-2.5">
        <button
          onClick={async () => {
            await logout();
            navigate('/login');
          }}
          className="w-full card-flat p-4 flex items-center gap-3 text-left hover:bg-white/5 transition"
        >
          <LogOut size={18} className="text-accent-bright" />
          <span className="text-sm font-semibold text-accent-bright">Sair</span>
        </button>
      </div>
    </div>
  );
}
