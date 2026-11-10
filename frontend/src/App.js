import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import 'leaflet/dist/leaflet.css';

// Store
import { useAuthStore } from './store';

// Pages
import LandingPage from './pages/LandingPage';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import RegisterPage from './pages/RegisterPage';
import ProblemDetailPage from './pages/ProblemDetailPage';
import AdminDashboard from './pages/AdminDashboard';
import ProfilePage from './pages/ProfilePage';
// import VerifyEmailPage from './pages/VerifyEmailPage';
import FeedPage from './pages/FeedPage';
import UserProfilePage from './pages/UserProfilePage';

// Components
import Header from './components/Header';
import ProtectedRoute from './components/ProtectedRoute';
import ReactiveAtmosphere from './components/ReactiveAtmosphere';
import AuthModal from './components/AuthModal';
import ChristmasUnlockNotice from './components/ChristmasUnlockNotice';
import { ChristmasEffects, NativityFooter } from './components/ChristmasEffects';
import { syncSiteTheme } from './utils/christmasTheme';
import { usersAPI, visitsAPI } from './services/api';

const VisitTracker = () => {
  const location = useLocation();

  React.useEffect(() => {
    const storageKey = 'voz-urbana-visitor-id';
    const visitorId = localStorage.getItem(storageKey) || (typeof crypto !== 'undefined' && crypto.randomUUID
      ? crypto.randomUUID()
      : `visitor-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    localStorage.setItem(storageKey, visitorId);
    const path = `${location.pathname}${location.search}`;
    const visitKey = `voz-urbana-last-visit:${path}`;
    const lastVisit = Number(sessionStorage.getItem(visitKey) || 0);
    if (Date.now() - lastVisit < 30_000) return undefined;
    sessionStorage.setItem(visitKey, String(Date.now()));
    visitsAPI.record({ visitorId, path }).catch(() => undefined);
    return undefined;
  }, [location.pathname, location.search]);

  return null;
};

function App() {
  const { user, token, setUser, logout } = useAuthStore();

  React.useEffect(() => {
    if (!token) return undefined;
    let active = true;
    usersAPI.getMe()
      .then((response) => {
        if (active) setUser(response.data);
      })
      .catch(() => {
        if (active) logout();
      });
    return () => {
      active = false;
    };
  }, [token, setUser, logout]);

  React.useEffect(() => {
    document.documentElement.dataset.theme = 'dark';
    syncSiteTheme();
    localStorage.setItem('theme', 'dark');
  }, []);

  return (
    <Router basename={import.meta.env.BASE_URL}>
      <div>
        <VisitTracker />
        <ReactiveAtmosphere />
        <ChristmasEffects />
        <Routes>
          {/* Landing page - sem header customizado, ela tem seu próprio */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/contato" element={<Navigate to="/#contato" replace />} />

          {/* Outras rotas com header */}
          <Route
            path="/*"
            element={
              <div className="min-h-screen bg-[#1b1b20] text-white">
                <Header />
                <Routes>
                  <Route path="/map" element={<HomePage />} />
                  <Route path="/feed" element={<FeedPage />} />
                  <Route path="/login" element={user ? <Navigate to="/" /> : <LoginPage />} />
                  <Route path="/forgot-password" element={user ? <Navigate to="/" /> : <ForgotPasswordPage />} />
                  <Route path="/reset-password" element={user ? <Navigate to="/" /> : <ResetPasswordPage />} />
                  <Route path="/register" element={<RegisterPage />} />
                  {/* <Route path="/verify-email" element={<VerifyEmailPage />} /> */}
                  <Route path="/problem/:id" element={<ProblemDetailPage />} />

                  {/* Rotas protegidas */}
                  <Route path="/report" element={<Navigate to="/feed#create" replace />} />
                  <Route path="/profile" element={<ProtectedRoute component={ProfilePage} />} />
                  <Route path="/profile/:id" element={<ProtectedRoute component={UserProfilePage} />} />
                  <Route path="/admin" element={<ProtectedRoute component={AdminDashboard} roles={['admin']} />} />
                </Routes>
                <NativityFooter />
              </div>
            }
          />
        </Routes>
      </div>
      <ToastContainer position="bottom-right" />
      <ChristmasUnlockNotice />
      <AuthModal />
    </Router>
  );
}

export default App;
