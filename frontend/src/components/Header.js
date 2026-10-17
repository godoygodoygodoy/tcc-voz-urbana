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
  const [compact, setCompact] = React.useState(false);
  const handleLogout = () => {
    logout();
    navigate('/');
  };

  React.useEffect(() => {
    const updateHeaderState = () => setCompact(window.scrollY > 72);
    updateHeaderState();
    window.addEventListener('scroll', updateHeaderState, { passive: true });
    return () => window.removeEventListener('scroll', updateHeaderState);
  }, []);

  return (
    <header className={`site-header ${compact ? 'is-compact' : ''}`} data-compact={compact}>
      <div className="site-header-inner container mx-auto px-4 py-4">
        <SiteMenu />
        <div className="site-header-content flex justify-between items-center">
          <Link to="/" className="site-header-brand flex items-center gap-3">
            <PigeonLogo className="h-10 w-10 bg-transparent object-contain drop-shadow-[0_0_8px_rgba(168,85,247,0.55)]" />
            <img src={`${import.meta.env.BASE_URL}branding/voz-urbana-texto.png`} alt="Voz Urbana" className="h-9 w-auto max-w-[165px] object-contain" />
          </Link>

          <div className="site-header-actions flex items-center gap-3">
            {user && <NotificationBell />}
            <AccessMenu compact={compact} authenticated={Boolean(user)} user={user} onLogout={handleLogout} />
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
