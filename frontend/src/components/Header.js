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
    <header className="bg-white shadow-md sticky top-0 z-50">
      <div className="container mx-auto px-4 py-3">
        <div className="flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white font-bold">V</span>
            </div>
            <span className="font-bold text-lg">VOZ URBANA</span>
          </Link>

          <nav className="hidden md:flex gap-6">
            <Link to="/" className="text-gray-700 hover:text-purple-600">
              Home
            </Link>
            {user && (
              <Link to="/" className="text-gray-700 hover:text-purple-600">
                Meu Mapa
              </Link>
            )}
            {user?.role === 'admin' && (
              <Link to="/admin" className="text-gray-700 hover:text-purple-600">
                Admin
              </Link>
            )}
          </nav>

          <div className="flex items-center gap-4">
            {user ? (
              <>
                <Link
                  to="/report"
                  className="flex items-center gap-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                >
                  <FiPlus /> Reportar
                </Link>
                <Link to="/profile" className="text-gray-700 hover:text-purple-600">
                  <FiUser size={20} />
                </Link>
                <button
                  onClick={handleLogout}
                  className="text-gray-700 hover:text-purple-600"
                >
                  <FiLogOut size={20} />
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-gray-700 hover:text-purple-600">
                  Login
                </Link>
                <Link
                  to="/register"
                  className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
                >
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
