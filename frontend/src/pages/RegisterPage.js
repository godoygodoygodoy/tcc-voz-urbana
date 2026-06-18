import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store';
import { toast } from 'react-toastify';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import AvatarPicker from '../components/AvatarPicker';
import { formatPhone } from '../utils/formatters';
import { authAPI } from '../services/api';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    passwordConfirm: '',
  });
  const [loading, setLoading] = useState(false);
  const [showAvatarPrompt, setShowAvatarPrompt] = useState(false);
  const [verificationToken, setVerificationToken] = useState('');
  const [avatarData, setAvatarData] = useState('');
  const [avatarPosition, setAvatarPosition] = useState({ x: 50, y: 35 });
  const { register } = useAuthStore();

  const handleChange = (e) => {
    const { name, value } = e.target;

    if (name === 'phone') {
      setFormData((prev) => ({
        ...prev,
        phone: formatPhone(value),
      }));
      return;
    }

    setFormData({
      ...formData,
      [name]: value,
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
      const response = await register({
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        password: formData.password,
      });

      setVerificationToken(response.verificationToken || '');
      setShowAvatarPrompt(true);
      toast.success('Conta criada. Confirme o e-mail para ativar o acesso.');
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao cadastrar');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAvatar = async () => {
    if (!verificationToken) {
      toast.error('Token de verificação ausente');
      return;
    }

    try {
      await authAPI.savePendingProfile({
        token: verificationToken,
        avatar: avatarData,
        avatarPositionX: avatarPosition.x,
        avatarPositionY: avatarPosition.y,
      });

      toast.success('Foto de perfil salva');
      setShowAvatarPrompt(false);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao salvar foto');
    }
  };

  const registerButtonLabel = useMemo(() => (loading ? 'Criando conta...' : 'Criar conta'), [loading]);

  return (
    <div className="min-h-screen bg-[#06070b] flex items-center justify-center py-12 px-4 text-white">
      <Card className="rounded-[2rem] w-full max-w-xl border border-white/10 !bg-[#0a0d15] !text-white shadow-[0_24px_70px_rgba(0,0,0,0.3)] backdrop-blur-xl">
        <CardContent className="p-10">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-black mb-2">
              <span className="text-violet-600">VOZ</span> URBANA
            </h1>
            <p className="text-white/65">Cadastro com e-mail verificado</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-semibold mb-2 text-white/85">Nome</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Seu nome completo"
                required
                className="w-full rounded-2xl border border-white/10 bg-white/[0.08] p-3 text-white placeholder:text-white/35 outline-none focus:border-violet-300/60"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-white/85">Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="seu@email.com"
                required
                className="w-full rounded-2xl border border-white/10 bg-white/[0.08] p-3 text-white placeholder:text-white/35 outline-none focus:border-violet-300/60"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-white/85">Telefone</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                placeholder="(00) 00000-0000"
                className="w-full rounded-2xl border border-white/10 bg-white/[0.08] p-3 text-white placeholder:text-white/35 outline-none focus:border-violet-300/60"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-white/85">Senha</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Mínimo 6 caracteres"
                required
                className="w-full rounded-2xl border border-white/10 bg-white/[0.08] p-3 text-white placeholder:text-white/35 outline-none focus:border-violet-300/60"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2 text-white/85">Confirme a Senha</label>
              <input
                type="password"
                name="passwordConfirm"
                value={formData.passwordConfirm}
                onChange={handleChange}
                placeholder="Confirme sua senha"
                required
                className="w-full rounded-2xl border border-white/10 bg-white/[0.08] p-3 text-white placeholder:text-white/35 outline-none focus:border-violet-300/60"
              />
            </div>

            <Button
              type="submit"
              className="w-full rounded-2xl py-3 text-lg font-bold mt-6 bg-white text-zinc-950 hover:bg-violet-50"
              disabled={loading}
            >
              {registerButtonLabel}
            </Button>
          </form>

          <div className="text-center mt-6">
            <p className="text-white/60">
              Já tem conta?{' '}
              <Link to="/login" className="text-violet-600 font-bold hover:underline">
                Faça login
              </Link>
            </p>
          </div>
        </CardContent>
      </Card>

      {showAvatarPrompt ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-[2rem] border border-white/10 bg-[#0a0d15] p-6 text-white shadow-[0_24px_80px_rgba(0,0,0,0.5)]">
            <div className="mb-5">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/40">Foto de perfil</p>
              <h2 className="mt-3 text-3xl font-black">Adicione sua foto agora</h2>
              <p className="mt-3 text-sm leading-6 text-white/60">
                Sua conta já foi criada. Agora você pode escolher uma foto e ajustar o enquadramento circular.
                Depois confirme o e-mail para ativar o acesso.
              </p>
            </div>

            <AvatarPicker
              value={avatarData}
              onChange={setAvatarData}
              positionX={avatarPosition.x}
              positionY={avatarPosition.y}
              onPositionChange={setAvatarPosition}
              title="Escolha sua imagem"
              subtitle="A foto fica em formato circular e você pode reposicionar a parte principal."
            />

            <div className="mt-5 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowAvatarPrompt(false)}
                className="rounded-full border border-white/12 bg-white/6 px-5 py-3 text-sm font-semibold text-white hover:bg-white/12"
              >
                Pular agora
              </button>
              <button
                type="button"
                onClick={handleSaveAvatar}
                className="rounded-full bg-white px-5 py-3 text-sm font-black text-zinc-950 hover:bg-violet-50"
              >
                Salvar foto
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default RegisterPage;
