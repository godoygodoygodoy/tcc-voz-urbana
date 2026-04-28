import React, { useState, useEffect } from 'react';
import { usersAPI } from '../services/api';
import { toast } from 'react-toastify';
import { useAuthStore } from '../store';

const ProfilePage = () => {
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    bio: '',
    avatar: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user } = useAuthStore();

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
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      await usersAPI.updateMe(formData);
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
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold mb-8">Meu Perfil</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold mb-2">Email</label>
              <input
                type="email"
                value={profile?.email || ''}
                disabled
                className="w-full border rounded-lg p-3 bg-gray-100 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Nome</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full border rounded-lg p-3"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Telefone</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="w-full border rounded-lg p-3"
                placeholder="(11) 99999-9999"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">Bio</label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                className="w-full border rounded-lg p-3"
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
                className="w-full border rounded-lg p-3 bg-gray-100 cursor-not-allowed"
                placeholder="Usuário"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-purple-600 text-white font-semibold py-3 rounded-lg hover:bg-purple-700 disabled:bg-gray-400"
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
