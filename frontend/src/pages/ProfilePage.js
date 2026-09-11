import React, { useState, useEffect } from 'react';
import { usersAPI } from '../services/api';
import { toast } from 'react-toastify';

const ProfilePage = () => {
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    phone: '',
    bio: '',
    avatar: '',
    avatarFile: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await usersAPI.getMe();
        setProfile(res.data);
        setFormData({
          name: res.data.name || res.data.nome || '',
          username: res.data.username || '',
          phone: res.data.phone || res.data.telefone || '',
          bio: res.data.bio || '',
          avatar: res.data.avatar || res.data.fotoPerfil || '',
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
      const payload = new FormData();
      payload.append('name', formData.name);
      payload.append('username', formData.username);
      payload.append('phone', formData.phone);
      payload.append('bio', formData.bio);
      if (formData.avatarFile) payload.append('avatarFile', formData.avatarFile);
      else payload.append('avatar', formData.avatar);
      const response = await usersAPI.updateMe(payload);
      setProfile((current) => ({ ...current, ...response.data }));
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
              <label className="block text-sm font-semibold mb-2">Nome de usuário</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="w-full border rounded-lg p-3"
                placeholder="@seuusuario"
                maxLength="30"
              />
              <p className="mt-1 text-xs text-gray-500">Será exibido como @{formData.username.replace(/^@/, '') || 'usuario'}.</p>
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
              <label className="block text-sm font-semibold mb-2">Foto de perfil</label>
              <div className="flex items-center gap-4">
                {formData.avatar ? (
                  <img src={formData.avatar} alt="Prévia do perfil" className="h-16 w-16 rounded-full object-cover border-2 border-violet-500" />
                ) : (
                  <div className="h-16 w-16 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-bold">{formData.name?.[0] || '?'}</div>
                )}
                <div className="flex-1">
                  <input type="file" accept="image/*" onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) setFormData((current) => ({ ...current, avatarFile: file, avatar: URL.createObjectURL(file) }));
                  }} className="w-full border rounded-lg p-3" />
                  <input type="url" name="avatar" value={formData.avatarFile ? '' : formData.avatar} onChange={handleChange} className="mt-2 w-full border rounded-lg p-3" placeholder="Ou use uma URL de imagem" />
                  {formData.avatar && <button type="button" onClick={() => setFormData((current) => ({ ...current, avatar: '', avatarFile: null }))} className="mt-2 text-sm text-red-600">Remover foto</button>}
                </div>
              </div>
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
