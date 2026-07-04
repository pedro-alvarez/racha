/**
 * App — roteamento.
 * HashRouter é usado de propósito: em GitHub Pages não há rewrite de rotas
 * no servidor, então /viagem/x daria 404 com BrowserRouter. Quando o app
 * tiver backend próprio/hosting com rewrites, dá para trocar por
 * createBrowserRouter sem mexer nas páginas.
 */
import { useState } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Layout from './components/Layout';
import SplashScreen from './components/SplashScreen';
import LoginPage from './pages/LoginPage';
import OverviewPage from './pages/OverviewPage';
import TripsPage from './pages/TripsPage';
import NewTripPage from './pages/NewTripPage';
import AddExpensePage from './pages/AddExpensePage';
import SettlePage from './pages/SettlePage';
import FriendsPage from './pages/FriendsPage';
import ActivityPage from './pages/ActivityPage';
import AccountPage from './pages/AccountPage';
import SecurityPage from './pages/SecurityPage';
import AdminPage from './pages/AdminPage';
import ProfilePage from './pages/ProfilePage';
import NotificationsPage from './pages/NotificationsPage';

export default function App() {
  // Splash só na carga inicial; o app já renderiza por trás e é "revelado".
  const [showSplash, setShowSplash] = useState(true);

  return (
    <AppProvider>
      {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}
      <HashRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<Layout />}>
            <Route path="/" element={<OverviewPage />} />
            <Route path="/viagens" element={<TripsPage />} />
            <Route path="/viagens/nova" element={<NewTripPage />} />
            <Route path="/viagem/:tripId" element={<OverviewPage />} />
            <Route path="/viagem/:tripId/nova-despesa" element={<AddExpensePage />} />
            <Route path="/viagem/:tripId/acertar" element={<SettlePage />} />
            <Route path="/amigos" element={<FriendsPage />} />
            <Route path="/atividade" element={<ActivityPage />} />
            <Route path="/conta" element={<AccountPage />} />
            <Route path="/seguranca" element={<SecurityPage />} />
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/perfil/:userId" element={<ProfilePage />} />
            <Route path="/notificacoes" element={<NotificationsPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
    </AppProvider>
  );
}
