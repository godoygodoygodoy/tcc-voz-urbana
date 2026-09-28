import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiPlus, FiSun, FiMoon } from 'react-icons/fi';
import { useAuthStore } from '../store';
import NotificationBell from './NotificationBell';
import AccessMenu from './AccessMenu';

const Header = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [theme, setTheme] = React.useState(() => localStorage.getItem('theme') || 'dark');

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link to="/" className="flex items-center gap-3">
            <img src="/branding/mascote-voz-urbana.png" alt="Voz Urbana" className="h-10 w-10 rounded-full object-cover" />
            <img src="/branding/voz-urbana-texto.png" alt="Voz Urbana" className="h-9 w-auto max-w-[165px] object-contain" />
          </Link>

          <nav className="hidden md:flex gap-6 items-center">
            <Link to="/" className="text-gray-700 hover:text-primary-600">
              Início
            </Link>
            <Link to="/map" className="text-gray-700 hover:text-primary-600">
              Mapa
            </Link>
            <Link to="/feed" className="text-gray-700 hover:text-primary-600">
              Feed
            </Link>
            <Link to="/about" className="text-gray-700 hover:text-primary-600">
              Sobre
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <button type="button" onClick={toggleTheme} aria-label="Alternar tema" className="text-gray-700 hover:text-primary-600">
              {theme === 'dark' ? <FiSun size={18} /> : <FiMoon size={18} />}
            </button>
            <Link
              to="/report"
              className="hidden md:inline-flex items-center gap-2 bg-gradient-to-r from-primary to-primary-600 text-white px-4 py-2 rounded-full shadow-sm"
            >
              <FiPlus /> Identificar problema
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
