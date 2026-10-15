import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';
import NotificationBell from './NotificationBell';
import AccessMenu from './AccessMenu';
import PigeonLogo from './PigeonLogo';
import SiteMenu from './SiteMenu';

const Header = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#17171b]/95 text-white shadow-lg backdrop-blur-xl">
      <div className="site-header-inner container mx-auto px-4 py-4">
        <SiteMenu />
        <div className="flex justify-between items-center">
          <Link to="/" className="flex items-center gap-3">
            <PigeonLogo className="h-10 w-10 bg-transparent object-contain drop-shadow-[0_0_8px_rgba(168,85,247,0.55)]" />
            <img src="/branding/voz-urbana-texto.png" alt="Voz Urbana" className="h-9 w-auto max-w-[165px] object-contain" />
          </Link>

          <div className="flex items-center gap-3">
            {user && <NotificationBell />}
            <AccessMenu authenticated={Boolean(user)} user={user} onLogout={handleLogout} />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
