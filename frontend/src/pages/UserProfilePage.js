import React, { useEffect, useState } from 'react';
import { CalendarDays, FileText } from 'lucide-react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { mediaUrl, socialAPI } from '../services/api';
import { useAuthStore } from '../store';
import { useI18n } from '../i18n';

const UserProfilePage = () => {
  const { id } = useParams();
  const { language, t } = useI18n();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [friendship, setFriendship] = useState(null);
  const { user } = useAuthStore();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    socialAPI.profile(id)
      .then((response) => { if (!cancelled) setProfile(response.data); })
      .catch((error) => { if (!cancelled) toast.error(error.response?.data?.error || t('profileError')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    if (user && user.id !== id) {
      socialAPI.friendship(id).then((response) => { if (!cancelled) setFriendship(response.data); }).catch(() => {});
    }
    return () => { cancelled = true; };
  }, [id, t, user]);

  const updateFriendship = async () => {
    try {
      if (!friendship || friendship.status === 'NONE') {
        const response = await socialAPI.requestFriendship(id);
        setFriendship(response.data);
      } else if (friendship.status === 'PENDENTE' && friendship.destinatarioId === user.id) {
        const response = await socialAPI.updateFriendship(friendship.id, 'accept');
        setFriendship(response.data);
      } else if (friendship.status === 'PENDENTE') {
        const response = await socialAPI.updateFriendship(friendship.id, 'cancel');
        setFriendship({ status: 'NONE' });
      } else {
        await socialAPI.updateFriendship(friendship.id, 'remove');
        setFriendship({ status: 'NONE' });
      }
    } catch (error) {
      toast.error(error.response?.data?.error || 'Não foi possível atualizar a amizade.');
    }
  };

  if (loading) return <div className="site-page flex min-h-screen items-center justify-center text-white"><p className="site-muted">{t('loading')}</p></div>;
  if (!profile) return <div className="site-page flex min-h-screen items-center justify-center text-white"><p>{t('profileNotFound')}</p></div>;

  const joinedAt = new Date(profile.joinedAt);
  const dateLocale = language === 'pt-BR' ? ptBR : undefined;

  return (
    <div className="site-page min-h-screen py-10 text-white">
      <div className="container mx-auto max-w-5xl px-4">
        <section className="site-panel rounded-3xl p-6 sm:p-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            {profile.avatar ? <img src={mediaUrl(profile.avatar)} alt={profile.name} className="h-28 w-28 rounded-full border-2 border-violet-300 object-cover" /> : <div className="flex h-28 w-28 items-center justify-center rounded-full bg-violet-950 text-4xl font-black text-violet-200">{profile.name?.charAt(0).toUpperCase()}</div>}
            <div className="min-w-0">
              <h1 className="text-4xl font-black">{profile.name}</h1>
              <p className="mt-1 text-violet-200">{profile.username ? `@${profile.username}` : t('noUsername')}</p>
              {profile.bio && <p className="mt-4 max-w-2xl text-white/70">{profile.bio}</p>}
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-white/55">
                <span className="inline-flex items-center gap-2"><CalendarDays size={15} />{t('joinedAt')} {format(joinedAt, 'dd/MM/yyyy', { locale: dateLocale })}</span>
                <span className="inline-flex items-center gap-2"><FileText size={15} />{profile.publicationCount} {t('publications')}</span>
              </div>
              {user && user.id !== profile.id && <button type="button" onClick={updateFriendship} className="mt-5 rounded-xl bg-violet-600 px-4 py-2 text-sm font-bold text-white hover:bg-violet-700">
                {!friendship || friendship.status === 'NONE' ? 'Adicionar amigo' : friendship.status === 'ACEITA' ? 'Remover amigo' : friendship.destinatarioId === user.id ? 'Aceitar solicitação' : 'Cancelar solicitação'}
              </button>}
            </div>
          </div>
        </section>

        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-2xl font-black">{t('profilePublications')}</h2>
            <Link to="/profile" className="text-sm font-bold text-violet-200 hover:text-white">{t('myProfile')}</Link>
          </div>
          {profile.publications.length === 0 ? <div className="feed-empty">{t('profileNoPosts')}</div> : <div className="grid gap-5 md:grid-cols-2">{profile.publications.map((publication) => (
            <Link key={publication.id} to={`/problem/${publication.id}`} className="feed-post block">
              <span className="feed-category">{publication.category?.name || t('noCategory')}</span>
              <h3 className="mt-3 text-2xl font-black">{publication.title}</h3>
              <p className="mt-2 text-sm text-white/65">{publication.description}</p>
              <p className="mt-4 text-xs text-white/45">{publication.city && publication.state ? `${publication.city}, ${publication.state}` : publication.address || t('locationNotSpecified')}</p>
            </Link>
          ))}</div>}
        </section>
      </div>
    </div>
  );
};

export default UserProfilePage;
