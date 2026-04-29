import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuthStore } from '../store';
import { toast } from 'react-toastify';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    passwordConfirm: '',
  });
  const [loading, setLoading] = useState(false);
  const { register } = useAuthStore();
  const navigate = useNavigate();

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.passwordConfirm) {
      toast.error('As senhas não coincidem');
      return;
    }

    setLoading(true);

    try {
      await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });
      toast.success('Cadastro realizado com sucesso!');
      navigate('/');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao cadastrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-100 flex items-center justify-center py-12 px-4">
      <Card className="rounded-3xl w-full max-w-md shadow-2xl">
        <CardContent className="p-10">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black mb-2">
              <span className="text-violet-600">VOZ</span> URBANA
            </h1>
            <p className="text-gray-600">Cadastro</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2">Nome</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Seu nome completo"
                required
                className="w-full border-2 rounded-xl p-3 focus:outline-none focus:border-violet-600"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="seu@email.com"
                required
                className="w-full border-2 rounded-xl p-3 focus:outline-none focus:border-violet-600"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Senha</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Mínimo 6 caracteres"
                required
                className="w-full border-2 rounded-xl p-3 focus:outline-none focus:border-violet-600"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Confirme a Senha</label>
              <input
                type="password"
                name="passwordConfirm"
                value={formData.passwordConfirm}
                onChange={handleChange}
                placeholder="Confirme sua senha"
                required
                className="w-full border-2 rounded-xl p-3 focus:outline-none focus:border-violet-600"
              />
            </div>

            <Button
              type="submit"
              className="w-full rounded-2xl py-3 text-lg font-bold mt-6"
              disabled={loading}
            >
              {loading ? 'Criando conta...' : 'Criar conta'}
            </Button>
          </form>

          <div className="text-center mt-6">
            <p className="text-gray-600">
              Já tem conta?{' '}
              <Link to="/login" className="text-violet-600 font-bold hover:underline">
                Faça login
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default RegisterPage;
