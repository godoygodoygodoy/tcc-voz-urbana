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
      <div className="site-header-inner">
        <SiteMenu />
        <div className="site-header-menu-slot" aria-hidden="true" />
        <div className="site-header-content">
          <Link to="/" className="site-header-brand">
            <PigeonLogo className="site-header-mascot" />
            <img src={`${import.meta.env.BASE_URL}branding/voz-urbana-texto.png`} alt="Voz Urbana" className="site-header-wordmark" />
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
