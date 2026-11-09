import React, { useState, useEffect } from 'react';
import { usersAPI, mediaUrl } from '../services/api';
import { toast } from 'react-toastify';
import { useAuthStore } from '../store';
import { useI18n } from '../i18n';
import { UploadField } from '../components/FloatingFields';
import { formatBrazilianPhone, normalizeDigits } from '../utils/formatters';
import ImageCropper from '../components/ImageCropper';
import Avatar from '../components/Avatar';

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
  const [cropFile, setCropFile] = useState(null);
  const setUser = useAuthStore((state) => state.setUser);
  const { t } = useI18n();

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await usersAPI.getMe();
        setProfile(res.data);
        setFormData({
          name: res.data.name || res.data.nome || '',
          username: res.data.username || '',
          phone: formatBrazilianPhone(res.data.phone || res.data.telefone || ''),
          bio: res.data.bio || '',
          avatar: res.data.avatar || res.data.fotoPerfil || '',
        });
      } catch (error) {
        toast.error(t('profileError'));
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [t]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'phone' ? formatBrazilianPhone(value) : value,
      ...(name === 'avatar' ? { avatarFile: null } : {}),
    }));
  };

  const selectAvatar = (file) => {
    if (!file) return;
    setCropFile(file);
  };

  const confirmAvatarCrop = (file) => {
    setFormData((current) => ({ ...current, avatarFile: file, avatar: URL.createObjectURL(file) }));
    setCropFile(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = new FormData();
      payload.append('name', formData.name);
      payload.append('username', formData.username);
      payload.append('phone', normalizeDigits(formData.phone));
      payload.append('bio', formData.bio);
      if (formData.avatarFile) payload.append('avatarFile', formData.avatarFile);
      else payload.append('avatar', formData.avatar);
      const response = await usersAPI.updateMe(payload);
      const updatedProfile = response.data;
      setProfile((current) => ({ ...current, ...updatedProfile }));
      setFormData((current) => ({ ...current, avatar: updatedProfile.avatar || updatedProfile.fotoPerfil || '', avatarFile: null }));
      setUser({ ...useAuthStore.getState().user, ...updatedProfile });
      toast.success(t('profileUpdated'));
    } catch (error) {
      toast.error(error.response?.data?.error || t('profileError'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="site-page min-h-screen flex items-center justify-center text-white">
        <p className="site-muted">{t('loading')}</p>
      </div>
    );
  }

  return (
    <div className="site-page min-h-screen py-8 text-white">
      <div className="container mx-auto px-4">
        <div className="site-panel max-w-2xl mx-auto rounded-3xl shadow-xl p-8">
          <h1 className="text-3xl font-bold mb-8">{t('profile')}</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold mb-2">{t('accountEmail')}</label>
              <input
                type="email"
                value={profile?.email || ''}
                disabled
                className="site-form-input w-full border rounded-lg p-3 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">{t('username')}</label>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                className="site-form-input w-full border rounded-lg p-3"
                placeholder="@seuusuario"
                maxLength="30"
              />
              <p className="site-muted mt-1 text-xs">Será exibido como @{formData.username.replace(/^@/, '') || 'usuario'}.</p>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">{t('name')}</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="site-form-input w-full border rounded-lg p-3"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">{t('profilePhoto')}</label>
              <div className="flex flex-col gap-4 sm:flex-row">
                {formData.avatar ? (
                  <img src={formData.avatar.startsWith('blob:') ? formData.avatar : mediaUrl(formData.avatar)} alt="Prévia do perfil" className="h-64 w-64 shrink-0 rounded-full border-2 border-violet-500 object-cover" />
                ) : (
                  <Avatar user={{ name: formData.name }} className="h-64 w-64 shrink-0 text-5xl" />
                )}
                <div className="flex-1 space-y-3">
                  <UploadField accept="image/*" files={formData.avatarFile ? [formData.avatarFile] : []} maxSizeMb={5} label="Escolher foto" onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file && !file.type.startsWith('image/')) {
                      toast.error('Selecione um arquivo de imagem válido.');
                      return;
                    }
                    if (file && file.size > 5 * 1024 * 1024) {
                      toast.error('A imagem deve ter no máximo 5 MB.');
                      return;
                    }
                    selectAvatar(file);
                  }} />
                  <input type="url" name="avatar" value={formData.avatarFile ? '' : formData.avatar} onChange={handleChange} className="site-form-input mt-2 w-full border rounded-lg p-3" placeholder="Ou use uma URL de imagem" />
                  {formData.avatar && <button type="button" onClick={() => { setCrop({ zoom: 1, x: 0, y: 0 }); setFormData((current) => ({ ...current, avatar: '', avatarFile: null })); }} className="text-sm text-fuchsia-300">{t('removePhoto')}</button>}
                </div>
              </div>
              {cropFile && <ImageCropper file={cropFile} initialAspect="1:1" onCancel={() => setCropFile(null)} onConfirm={confirmAvatarCrop} />}
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">{t('phone')}</label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className="site-form-input w-full border rounded-lg p-3"
                placeholder="(11) 99999-9999"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">{t('bio')}</label>
              <textarea
                name="bio"
                value={formData.bio}
                onChange={handleChange}
                className="site-form-input w-full border rounded-lg p-3"
                rows="4"
                placeholder="Fale um pouco sobre você..."
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">{t('role')}</label>
              <input
                type="text"
                value={profile?.role || ''}
                disabled
                className="site-form-input w-full border rounded-lg p-3 cursor-not-allowed"
                placeholder="Usuário"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="w-full bg-purple-600 text-white font-semibold py-3 rounded-lg hover:bg-purple-700 disabled:bg-gray-400"
            >
              {saving ? t('saving') : t('saveProfile')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
