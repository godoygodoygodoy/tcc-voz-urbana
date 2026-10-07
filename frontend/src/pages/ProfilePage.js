import React, { useState, useEffect } from 'react';
import { usersAPI, mediaUrl } from '../services/api';
import { toast } from 'react-toastify';
import { useAuthStore } from '../store';
import { useI18n } from '../i18n';

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
  const [crop, setCrop] = useState({ zoom: 1, x: 0, y: 0 });
  const [dragStart, setDragStart] = useState(null);
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
          phone: res.data.phone || res.data.telefone || '',
          bio: res.data.bio || '',
          avatar: res.data.avatar || res.data.fotoPerfil || '',
        });
      } catch (error) {
        if (error.response?.data?.code === 'EMAIL_NOT_VERIFIED') return;
        toast.error(t('profileError'));
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [t]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value, ...(name === 'avatar' ? { avatarFile: null } : {}) }));
  };

  const selectAvatar = (file) => {
    if (!file) return;
    setCrop({ zoom: 1, x: 0, y: 0 });
    setFormData((current) => ({ ...current, avatarFile: file, avatar: URL.createObjectURL(file) }));
  };

  const createCroppedAvatar = () => new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const outputSize = 400;
      const previewSize = 256;
      const scale = Math.max(outputSize / image.width, outputSize / image.height) * crop.zoom;
      const canvas = document.createElement('canvas');
      canvas.width = outputSize;
      canvas.height = outputSize;
      const context = canvas.getContext('2d');
      context.drawImage(
        image,
        outputSize / 2 + crop.x * (outputSize / previewSize) - (image.width * scale) / 2,
        outputSize / 2 + crop.y * (outputSize / previewSize) - (image.height * scale) / 2,
        image.width * scale,
        image.height * scale,
      );
      canvas.toBlob((blob) => {
        if (!blob) return reject(new Error('Não foi possível preparar a imagem.'));
        resolve(new File([blob], `perfil-${Date.now()}.jpg`, { type: 'image/jpeg' }));
      }, 'image/jpeg', 0.9);
    };
    image.onerror = () => reject(new Error('Não foi possível abrir a imagem.'));
    image.src = formData.avatar;
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    try {
      const payload = new FormData();
      payload.append('name', formData.name);
      payload.append('username', formData.username);
      payload.append('phone', formData.phone);
      payload.append('bio', formData.bio);
      if (formData.avatarFile) payload.append('avatarFile', await createCroppedAvatar());
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
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">{t('loading')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#1b1b20] py-8 text-white">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto rounded-3xl border border-white/10 bg-[#202026] shadow-xl p-8">
          <h1 className="text-3xl font-bold mb-8">{t('profile')}</h1>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold mb-2">{t('accountEmail')}</label>
              <input
                type="email"
                value={profile?.email || ''}
                disabled
                className="w-full border rounded-lg p-3 bg-gray-100 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">{t('username')}</label>
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
              <label className="block text-sm font-semibold mb-2">{t('name')}</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full border rounded-lg p-3"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">{t('profilePhoto')}</label>
              <div className="flex flex-col gap-4 sm:flex-row">
                {formData.avatar ? (
                  <div
                    className="relative h-64 w-64 shrink-0 cursor-move overflow-hidden rounded-full border-2 border-violet-500 bg-zinc-100 touch-none"
                    onPointerDown={(event) => setDragStart({ x: event.clientX, y: event.clientY, cropX: crop.x, cropY: crop.y })}
                    onPointerMove={(event) => {
                      if (!dragStart) return;
                      setCrop((current) => ({ ...current, x: dragStart.cropX + event.clientX - dragStart.x, y: dragStart.cropY + event.clientY - dragStart.y }));
                    }}
                    onPointerUp={() => setDragStart(null)}
                    onPointerLeave={() => setDragStart(null)}
                  >
                    <img src={formData.avatar.startsWith('blob:') ? formData.avatar : mediaUrl(formData.avatar)} alt="Prévia editável do perfil" className="h-full w-full select-none object-cover" draggable="false" style={{ transform: `translate(${crop.x}px, ${crop.y}px) scale(${crop.zoom})` }} />
                  </div>
                ) : (
                  <div className="h-64 w-64 shrink-0 rounded-full bg-violet-100 flex items-center justify-center text-5xl text-violet-700 font-bold">{formData.name?.[0] || '?'}</div>
                )}
                <div className="flex-1 space-y-3">
                  <input type="file" accept="image/*" onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file && !file.type.startsWith('image/')) {
                      toast.error('Selecione um arquivo de imagem válido.');
                      event.target.value = '';
                      return;
                    }
                    if (file && file.size > 5 * 1024 * 1024) {
                      toast.error('A imagem deve ter no máximo 5 MB.');
                      event.target.value = '';
                      return;
                    }
                    selectAvatar(file);
                  }} className="w-full rounded-lg border border-white/15 bg-[#17171b] p-3 text-sm" />
                  {formData.avatarFile && <>
                    <div>
                      <label className="mb-1 block text-sm font-medium">{t('zoom')}</label>
                      <input type="range" min="1" max="3" step="0.01" value={crop.zoom} onChange={(event) => setCrop((current) => ({ ...current, zoom: Number(event.target.value) }))} className="w-full accent-violet-600" />
                    </div>
                    <p className="text-xs text-gray-500">Arraste a foto para reposicioná-la e use o controle para alterar o tamanho.</p>
                  </>}
                  <input type="url" name="avatar" value={formData.avatarFile ? '' : formData.avatar} onChange={handleChange} className="mt-2 w-full border rounded-lg p-3" placeholder="Ou use uma URL de imagem" />
                  {formData.avatar && <button type="button" onClick={() => { setCrop({ zoom: 1, x: 0, y: 0 }); setFormData((current) => ({ ...current, avatar: '', avatarFile: null })); }} className="text-sm text-red-600">{t('removePhoto')}</button>}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">{t('phone')}</label>
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
              <label className="block text-sm font-semibold mb-2">{t('bio')}</label>
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
              <label className="block text-sm font-semibold mb-2">{t('role')}</label>
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
              {saving ? t('saving') : t('saveProfile')}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
