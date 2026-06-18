import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiLogOut, FiUser, FiPlus } from 'react-icons/fi';
import { useAuthStore } from '../store';

const Header = () => {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="bg-white shadow-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex justify-between items-center">
          <Link to="/" className="flex items-center gap-3">
            <div className="w-10 h-10 brand-gradient rounded-full flex items-center justify-center">
              <span className="text-white font-extrabold">V</span>
            </div>
            <div>
              <div className="font-bold text-lg text-neutral">VOZ URBANA</div>
              <div className="text-xs text-gray-500">Sua voz melhora a cidade</div>
            </div>
          </Link>

          <nav className="hidden md:flex gap-6 items-center">
            <Link to="/" className="text-gray-700 hover:text-primary-600">
              Início
            </Link>
            <Link to="/map" className="text-gray-700 hover:text-primary-600">
              Mapa
            </Link>
            <Link to="/about" className="text-gray-700 hover:text-primary-600">
              Sobre
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              to="/report"
              className="hidden md:inline-flex items-center gap-2 bg-gradient-to-r from-primary to-primary-600 text-white px-4 py-2 rounded-full shadow-sm"
            >
              <FiPlus /> Identificar problema
            </Link>

            {user ? (
              <>
                {user.avatar ? (
                  <Link to="/profile" className="hidden sm:block">
                    <div className="h-10 w-10 overflow-hidden rounded-full border border-white/10 bg-white/10">
                      <img
                        src={user.avatar}
                        alt={user.name || 'Avatar do usuário'}
                        className="h-full w-full object-cover"
                        style={{ objectPosition: `${user.avatarPositionX || 50}% ${user.avatarPositionY || 50}%` }}
                      />
                    </div>
                  </Link>
                ) : null}
                <Link to="/profile" className="text-gray-700 hover:text-primary-600">
                  <FiUser size={20} />
                </Link>
                <button onClick={handleLogout} className="text-gray-700 hover:text-primary-600">
                  <FiLogOut size={20} />
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-gray-700 hover:text-primary-600">
                  Entrar
                </Link>
                <Link to="/register" className="hidden md:inline-flex items-center bg-white border border-primary px-4 py-2 rounded-full text-primary hover:bg-primary hover:text-white transition">
                  Cadastre-se
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
