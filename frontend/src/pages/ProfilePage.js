import React, { useState, useEffect } from 'react';
import { usersAPI } from '../services/api';
import { toast } from 'react-toastify';
import { useAuthStore } from '../store';
import AvatarPicker from '../components/AvatarPicker';
import { formatPhone } from '../utils/formatters';

const ProfilePage = () => {
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    bio: '',
    avatar: '',
    avatarPositionX: 50,
    avatarPositionY: 50,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { updateUser } = useAuthStore();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await usersAPI.getMe();
        setProfile(res.data);
        setFormData({
          name: res.data.name,
          phone: res.data.phone || '',
          bio: res.data.bio || '',
          avatar: res.data.avatar || '',
          avatarPositionX: res.data.avatarPositionX ?? 50,
          avatarPositionY: res.data.avatarPositionY ?? 50,
        });
      } catch (error) {
        toast.error('Erro ao carregar perfil');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === 'phone') {
      setFormData((prev) => ({ ...prev, phone: formatPhone(value) }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const response = await usersAPI.updateMe(formData);
      updateUser(response.data);
      toast.success('Perfil atualizado com sucesso!');
    } catch (error) {
      toast.error('Erro ao atualizar perfil');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Carregando...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#06070b] py-8 text-white">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-2xl rounded-[2rem] border border-white/10 bg-white/6 p-8 shadow-[0_24px_70px_rgba(0,0,0,0.3)] backdrop-blur-xl">
          <h1 className="mb-8 text-3xl font-black">Meu Perfil</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold mb-2">Email</label>
              <input
                type="email"
                value={profile?.email || ''}
                disabled
                className="w-full cursor-not-allowed rounded-2xl border border-white/10 bg-white/6 p-3 text-white/55"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Nome</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full rounded-2xl border border-white/10 bg-white/6 p-3 text-white outline-none focus:border-violet-300/60"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Telefone</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full rounded-2xl border border-white/10 bg-white/6 p-3 text-white outline-none focus:border-violet-300/60"
                placeholder="(11) 99999-9999"
              />
            </div>

            <AvatarPicker
              value={formData.avatar}
              onChange={(avatar) => setFormData((prev) => ({ ...prev, avatar }))}
              positionX={formData.avatarPositionX}
              positionY={formData.avatarPositionY}
              onPositionChange={({ x, y }) => setFormData((prev) => ({ ...prev, avatarPositionX: x, avatarPositionY: y }))}
              title="Foto de perfil"
              subtitle="Sua foto aparece em formato circular, com a parte principal centralizada do seu jeito."
            />

            <div>
              <label className="block text-sm font-semibold mb-2">Bio</label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                className="w-full rounded-2xl border border-white/10 bg-white/6 p-3 text-white outline-none focus:border-violet-300/60"
                rows="4"
                placeholder="Fale um pouco sobre você..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Papel</label>
              <input
                type="text"
                value={profile?.role || ''}
                disabled
                className="w-full cursor-not-allowed rounded-2xl border border-white/10 bg-white/6 p-3 text-white/55"
                placeholder="Usuário"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-2xl bg-white py-3 font-black text-zinc-950 hover:bg-violet-50 disabled:bg-gray-400"
            >
              {saving ? 'Salvando...' : 'Salvar Perfil'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
