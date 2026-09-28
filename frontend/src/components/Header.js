import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiPlus } from 'react-icons/fi';
import { useAuthStore } from '../store';
import NotificationBell from './NotificationBell';
import AccessMenu from './AccessMenu';
import { useI18n } from '../i18n';

const Header = () => {
  const { user, logout } = useAuthStore();
  const { t } = useI18n();
  const navigate = useNavigate();
  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#17171b]/95 text-white shadow-lg backdrop-blur-xl">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link to="/" className="flex items-center gap-3">
            <img src="/branding/mascote-voz-urbana.png" alt="Voz Urbana" className="h-10 w-10 bg-transparent object-contain drop-shadow-[0_0_8px_rgba(168,85,247,0.55)]" />
            <img src="/branding/voz-urbana-texto.png" alt="Voz Urbana" className="h-9 w-auto max-w-[165px] object-contain" />
          </Link>

          <nav className="hidden md:flex gap-6 items-center">
            <Link to="/" className="text-white/75 hover:text-violet-300">
              {t('navHome')}
            </Link>
            <Link to="/map" className="text-white/75 hover:text-violet-300">
              {t('navMap')}
            </Link>
            <Link to="/feed" className="text-white/75 hover:text-violet-300">
              {t('navFeed')}
            </Link>
            <Link to="/about" className="text-white/75 hover:text-violet-300">
              {t('navAbout')}
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              to="/report"
              className="hidden md:inline-flex items-center gap-2 bg-gradient-to-r from-primary to-primary-600 text-white px-4 py-2 rounded-full shadow-sm"
            >
              <FiPlus /> {t('reportProblem')}
            </Link>

            {user && <NotificationBell />}
            <AccessMenu authenticated={Boolean(user)} user={user} onLogout={handleLogout} />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
