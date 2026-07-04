/**
 * Layout — casca do app.
 * Mobile (< md): conteúdo em coluna + barra de navegação inferior fixa.
 * Desktop (>= md): sidebar fixa à esquerda + conteúdo em área central.
 */
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, ListTodo, CircleUserRound, Wallet, Hourglass, LogOut } from 'lucide-react';
import { useApp } from '../context/AppContext';
import Avatar from './Avatar';

/** Tela de espera: conta criada mas ainda não aprovada pelo admin. */
function PendingApproval() {
  const { currentUser, logout } = useApp();
  const navigate = useNavigate();
  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm text-center">
        <span className="mx-auto w-16 h-16 rounded-3xl bg-accent/15 text-accent-bright flex items-center justify-center">
          <Hourglass size={28} />
        </span>
        <h1 className="mt-5 text-2xl font-extrabold">Quase lá, {currentUser?.name?.split(' ')[0]}!</h1>
        <p className="mt-2 text-sm text-muted">
          Sua conta foi criada e está aguardando a aprovação do administrador.
          Assim que for liberada, é só entrar de novo.
        </p>
        <button
          onClick={async () => {
            await logout();
            navigate('/login');
          }}
          className="mt-8 inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/5 border border-white/10 text-sm font-semibold text-muted-light hover:text-white transition"
        >
          <LogOut size={16} /> Sair
        </button>
      </div>
    </div>
  );
}

const NAV_ITEMS = [
  { to: '/', label: 'Visão Geral', Icon: LayoutDashboard, end: true },
  { to: '/amigos', label: 'Amigos', Icon: Users },
  { to: '/atividade', label: 'Atividade', Icon: ListTodo },
  { to: '/conta', label: 'Conta', Icon: CircleUserRound },
];

function navClasses(isActive) {
  return `flex flex-col md:flex-row items-center gap-1 md:gap-3 text-[10px] md:text-sm font-medium transition-colors md:px-4 md:py-3 md:rounded-2xl ${
    isActive ? 'text-accent md:bg-accent/10' : 'text-muted hover:text-white md:hover:bg-white/5'
  }`;
}

export default function Layout() {
  const { currentUser, loading } = useApp();
  const navigate = useNavigate();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  // Gate de autenticação: sem sessão, só a tela de login é acessível
  if (!currentUser) return <Navigate to="/login" replace />;

  // Gate de aprovação: conta nova espera o OK do admin
  if (!currentUser.approved && currentUser.role !== 'admin') return <PendingApproval />;

  return (
    <div className="min-h-screen md:flex">
      {/* Sidebar (desktop) */}
      <aside className="hidden md:flex md:flex-col w-64 shrink-0 h-screen sticky top-0 border-r border-white/5 bg-ink-soft px-4 py-6">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2.5 px-4 mb-8 text-left"
        >
          <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-accent to-accent-bright flex items-center justify-center">
            <Wallet size={18} />
          </span>
          <span className="text-xl font-extrabold tracking-tight">
            Racha<span className="text-accent">.</span>
          </span>
        </button>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map(({ to, label, Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => navClasses(isActive)}>
              <Icon size={20} />
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto flex items-center gap-3 px-4 py-3 rounded-2xl bg-white/5">
          <Avatar user={currentUser} size="sm" />
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">{currentUser?.name}</p>
            <p className="text-[11px] text-muted truncate">{currentUser?.email}</p>
          </div>
        </div>
      </aside>

      {/* Conteúdo */}
      <div className="flex-1 min-w-0">
        <main className="max-w-lg md:max-w-3xl mx-auto px-5 md:px-10 pt-4 pb-28 md:pb-12 md:pt-8">
          {/* key na rota faz cada tela entrar com animação */}
          <div key={location.pathname} className="page-enter">
            <Outlet />
          </div>
        </main>
      </div>

      {/* Navegação inferior (mobile) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-ink-soft/95 backdrop-blur border-t border-white/5 px-6 pt-2.5 pb-6">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          {NAV_ITEMS.map(({ to, label, Icon, end }) => (
            <NavLink key={to} to={to} end={end} className={({ isActive }) => navClasses(isActive)}>
              <Icon size={22} />
              <span>{label}</span>
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}
