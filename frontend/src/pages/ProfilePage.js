const ProfilePresentation = React.lazy(() => import('../components/ProfilePresentation'));
const NotificationPreferences = React.lazy(() => import('../components/NotificationPreferences'));
import { createVisibilityPoller, retainEqual } from '../utils/polling';
import { notifySocialChange, subscribeSocialChanges } from '../utils/social';
import { Link } from 'react-router-dom';
import { profilePath } from '../utils/profileLinks';
import { translate as tr, useI18n } from '../i18n';
import React, { useState, useEffect } from 'react';
import { socialAPI, usersAPI, mediaUrl } from '../services/api';
import { toast } from '../components/LocalizedToast';
import { useAuthStore } from '../store';

import { FloatingSelect, UploadField } from '../components/FloatingFields';
import { formatBrazilianPhone, normalizeDigits } from '../utils/formatters';
import ImageCropper from '../components/ImageCropper';
import Avatar from '../components/Avatar';
import { applySiteTheme, useChristmasTheme, setChristmasEffects } from '../utils/christmasTheme';

const ProfilePage = () => {

  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    phone: '',
    bio: '',
    isPrivate: false,
    avatar: '',
    avatarFile: null,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cropFile, setCropFile] = useState(null);
  const [followRequests, setFollowRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const setUser = useAuthStore((state) => state.setUser);
  const { t } = useI18n();
  const { theme: siteTheme, unlocked: christmasUnlocked, effects } = useChristmasTheme();
  const changeSiteTheme = (value) => applySiteTheme(value);

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
          isPrivate: Boolean(res.data.isPrivate),
          avatar: res.data.avatar || res.data.fotoPerfil || '',
        });
      } catch (error) {
        toast.error(tr('profileError'));
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
    Promise.all([socialAPI.requests(), socialAPI.sentRequests()])
      .then(([received, sent]) => { setFollowRequests(current => retainEqual(current, received.data || [])); setSentRequests(current => retainEqual(current, sent.data || [])); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    let active = true;
    const refresh = async () => {
      if (document.hidden) return;
      try {
        const [received, sent] = await Promise.all([socialAPI.requests(), socialAPI.sentRequests()]);
        if (active) { setFollowRequests(current => retainEqual(current, received.data || [])); setSentRequests(current => retainEqual(current, sent.data || [])); }
      } catch { /* A failed refresh must not discard pending requests. */ }
    };
    const poller = createVisibilityPoller(refresh, 5000);
    const unsubscribe = subscribeSocialChanges(poller.refresh);
    return () => { active = false; unsubscribe(); poller.dispose(); };
  }, []);

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

  useEffect(() => {
    const url = formData.avatar;
    return () => { if (url?.startsWith('blob:')) URL.revokeObjectURL(url); };
  }, [formData.avatar]);
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
      payload.append('isPrivate', String(formData.isPrivate));
      if (formData.avatarFile) payload.append('avatarFile', formData.avatarFile);
      else payload.append('avatar', formData.avatar);
      const response = await usersAPI.updateMe(payload);
      const updatedProfile = response.data;
      setProfile((current) => ({ ...current, ...updatedProfile }));
      setFormData((current) => ({ ...current, avatar: updatedProfile.avatar || updatedProfile.fotoPerfil || '', avatarFile: null }));
      setUser({ ...useAuthStore.getState().user, ...updatedProfile });
      notifySocialChange();
      toast.success(t('profileUpdated'));
    } catch (error) {
      toast.error(error.response?.data?.error || t('profileError'));
    } finally {
      setSaving(false);
    }
  };

  const updateRequest = async (request, action) => {
    try {
      await socialAPI.respondFollowRequest(request.id, action);
      setFollowRequests((current) => current.filter((item) => item.id !== request.id));
      setSentRequests((current) => current.filter((item) => item.id !== request.id));
      notifySocialChange();
      if (action === 'accept') toast.success(t('followRequestAccepted'));
    } catch (error) {
      toast.error(error.response?.data?.error || t("Não foi possível atualizar a solicitação."));
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
                placeholder={t("@seuusuario")}
                maxLength="30"
              />
              <p className="site-muted mt-1 text-xs">{t("Será exibido como @")}{formData.username.replace(/^@/, '') || 'usuario'}.</p>
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
                  <img src={formData.avatar.startsWith('blob:') ? formData.avatar : mediaUrl(formData.avatar)} alt={t("Prévia do perfil")} className="h-64 w-64 shrink-0 rounded-full border-2 border-violet-500 object-cover" />
                ) : (
                  <Avatar user={{ name: formData.name }} className="h-64 w-64 shrink-0 text-5xl" />
                )}
                <div className="flex-1 space-y-3">
                  <UploadField accept="image/*" files={formData.avatarFile ? [formData.avatarFile] : []} maxSizeMb={5} label={t("Escolher foto")} onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file && !file.type.startsWith('image/')) {
                      toast.error(t("Selecione um arquivo de imagem válido."));
                      return;
                    }
                    if (file && file.size > 5 * 1024 * 1024) {
                      toast.error(t("A imagem deve ter no máximo 5 MB."));
                      return;
                    }
                    selectAvatar(file);
                  }} />
                  <input type="url" name="avatar" value={formData.avatarFile ? '' : formData.avatar} onChange={handleChange} className="site-form-input mt-2 w-full border rounded-lg p-3" placeholder={t("Ou use uma URL de imagem")} />
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
                placeholder={t("Fale um pouco sobre você...")}
              />
            </div>

            <div>
              <label className="block text-sm font-semibold mb-2">{t('profilePrivacy')}</label>
              <FloatingSelect value={formData.isPrivate ? 'private' : 'public'} onChange={value => setFormData(current => ({ ...current, isPrivate: value === 'private' }))} options={[{ value: 'public', label: t('publicProfile') }, { value: 'private', label: t('privateProfile') }]} />
              <p className="site-muted mt-2 text-xs">{t('profilePrivacyHint')}</p>
              <p className="site-muted mb-5 mt-2 text-xs">{t('publicProfileHint')}</p>
              <label className="block text-sm font-semibold mb-2">{t('role')}</label>
              <input
                type="text"
                value={t(profile?.role || '')}
                disabled
                className="site-form-input w-full border rounded-lg p-3 cursor-not-allowed"
                placeholder={t("Usuário")}
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
          <React.Suspense fallback={null}><ProfilePresentation/><NotificationPreferences/></React.Suspense>
          {christmasUnlocked && <section className="theme-settings mt-8 border-t border-white/10 pt-6">
            <h2 className="mb-2 text-xl font-bold">{t("Tema do site")}</h2>
            <p className="site-muted mb-4 text-sm">{t("Personalize a aparência do Voz Urbana.")}</p>
            <label className="block text-sm font-semibold mb-2" htmlFor="site-theme">{t("Versão")}</label>
            <FloatingSelect
              value={siteTheme}
              onChange={changeSiteTheme}
              placeholder={t("Selecione uma versão")}
              options={[
                { value: 'normal', label: t("Voz Urbana Normal") },
                { value: 'christmas', label: 'Christmas Version' },
              ]}
            />
            <label className="mt-4 flex items-center gap-3 text-sm"><input type="checkbox" checked={effects} onChange={(event) => setChristmasEffects(event.target.checked)} />{t("Ativar neve e animações natalinas")}</label>
            <p className="site-muted mt-2 text-xs">{t("Preferências salvas neste navegador, mesmo após sair da conta.")}</p>
          </section>}
          <section className="mt-10 border-t border-white/10 pt-6">
            <h2 className="mb-4 text-xl font-bold">{t('followRequestsTitle')}</h2>
            {followRequests.length === 0 && sentRequests.length === 0 && <p className="text-sm text-white/55">{t("Nenhuma solicitação pendente.")}</p>}
            {followRequests.length > 0 && <h3 className="mb-3 text-sm font-semibold">{t('followReceivedRequests')}</h3>}
            <div className="space-y-3">{followRequests.map((request) => <div key={request.id} className="follow-request-row flex items-center justify-between gap-3 rounded-xl bg-white/5 p-3"><span><Link to={profilePath(request.follower)}><strong>{request.follower.nome}</strong></Link><small className="ml-2 text-white/50">{request.follower.username ? `@${request.follower.username}` : ''}</small></span><span className="flex gap-2"><button type="button" onClick={() => updateRequest(request, 'accept')} className="rounded-lg bg-violet-600 px-3 py-1 text-xs font-bold">{t("Aceitar")}</button><button type="button" onClick={() => updateRequest(request, 'reject')} className="rounded-lg border border-white/10 px-3 py-1 text-xs">{t("Recusar")}</button></span></div>)}</div>
            {sentRequests.length > 0 && <h3 className="mb-3 mt-5 text-sm font-semibold">{t('followSentRequests')}</h3>}
            <div className="mt-3 space-y-3">{sentRequests.map((request) => <div key={request.id} className="follow-request-row flex items-center justify-between rounded-xl bg-white/5 p-3 text-sm"><span>{t("Para")} <Link to={profilePath(request.following)}><strong>{request.following.nome}</strong></Link></span><button type="button" onClick={() => updateRequest(request, 'cancel')} className="rounded-lg border border-white/10 px-3 py-1 text-xs">{t("Cancelar")}</button></div>)}</div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
