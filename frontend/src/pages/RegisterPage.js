import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';
import { toast } from 'react-toastify';

const RegisterPage = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (password !== passwordConfirm) {
      toast.error('As senhas não coincidem');
      return;
    }

    setLoading(true);

    try {
      await register({ name, email, password });
      toast.success('Cadastro realizado com sucesso!');
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao cadastrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h1 className="text-3xl font-bold text-center mb-8">Cadastro</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold mb-2">Nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full border rounded-lg p-3"
              placeholder="Seu nome"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full border rounded-lg p-3"
              placeholder="seu@email.com"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full border rounded-lg p-3"
              placeholder="••••••••"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold mb-2">Confirme a Senha</label>
            <input
              type="password"
              value={passwordConfirm}
              onChange={(e) => setPasswordConfirm(e.target.value)}
              required
              className="w-full border rounded-lg p-3"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-purple-600 text-white font-semibold py-3 rounded-lg hover:bg-purple-700 disabled:bg-gray-400"
          >
            {loading ? 'Cadastrando...' : 'Cadastrar'}
          </button>
        </form>

        <p className="text-center mt-4 text-gray-600">
          Já tem conta?{' '}
          <a href="/login" className="text-purple-600 hover:underline font-semibold">
            Faça login
          </a>
        </p>
      </div>
    </div>
  );
};

export default RegisterPage;
