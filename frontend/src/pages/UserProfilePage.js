import { translateCategory, getLanguage, useI18n } from '../i18n';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bookmark, CalendarDays, FileText, Heart, Lock, MessageCircle, Settings, Share2, UserCheck, UserPlus, X } from 'lucide-react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { toast } from '../components/LocalizedToast';
import { format } from 'date-fns';
import { ptBR, enUS, es } from 'date-fns/locale';
import { conversationsAPI, mediaUrl, savedAPI, socialAPI } from '../services/api';
import { useAuthStore } from '../store';
import Avatar from '../components/Avatar';
import { followButtonKey, notifySocialChange, subscribeSocialChanges } from '../utils/social';

const UserProfilePage = () => {
  const { id, username } = useParams();
  const navigate = useNavigate();
  const { t } = useI18n();
  const { user, openAuthModal } = useAuthStore();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [relationship, setRelationship] = useState(null);
  const [updatingFollow, setUpdatingFollow] = useState(false);
  const [tab, setTab] = useState('posts');
  const [privatePosts, setPrivatePosts] = useState({ saved: null, liked: null });
  const [loadingTab, setLoadingTab] = useState(false);
  const [network, setNetwork] = useState(null);
  const profileRequest = useRef(0);
  const networkRequest = useRef(0);
  const isOwnProfile = Boolean(user && profile?.id === user.id);

  const loadProfile = useCallback(async (silent = false) => {
    const sequence = ++profileRequest.current;
    if (!silent) setLoading(true);
    try {
      const { data } = await (username ? socialAPI.profileByUsername(username) : socialAPI.profile(id));
      if (sequence !== profileRequest.current) return;
      setProfile(data);
      setRelationship(data.relationship || null);
      if (data.canViewPosts === false) { ++networkRequest.current; setNetwork(null); }
    } catch (error) {
      if (sequence === profileRequest.current && !silent) { setProfile(null); toast.error(error.response?.data?.error || t('profileError')); }
    } finally { if (sequence === profileRequest.current) setLoading(false); }
  }, [id, username, user?.id, t]);

  useEffect(() => {
    setTab('posts'); setPrivatePosts({ saved: null, liked: null }); setNetwork(null); ++networkRequest.current;
    loadProfile();
    const refresh = () => { if (!document.hidden) loadProfile(true); };
    const unsubscribe = subscribeSocialChanges(refresh);
    const timer = window.setInterval(refresh, 5000);
    return () => { ++profileRequest.current; unsubscribe(); window.clearInterval(timer); };
  }, [loadProfile]);

  useEffect(() => {
    if (!isOwnProfile || tab === 'posts' || privatePosts[tab] !== null) return undefined;
    let cancelled = false; setLoadingTab(true);
    const request = tab === 'saved' ? savedAPI.list() : socialAPI.likedPublications(profile.id);
    request.then(({ data }) => { if (!cancelled) setPrivatePosts(current => ({ ...current, [tab]: data || [] })); })
      .catch(error => { if (!cancelled) toast.error(error.response?.data?.error || t('followListError')); })
      .finally(() => { if (!cancelled) setLoadingTab(false); });
    return () => { cancelled = true; };
  }, [isOwnProfile, privatePosts, profile?.id, tab, t]);

  const closeNetwork = () => { ++networkRequest.current; setNetwork(null); };
  useEffect(() => {
    if (!network) return undefined;
    const close = event => { if (event.key === 'Escape') closeNetwork(); };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [Boolean(network)]);

  const openNetwork = async (direction, page = 1) => {
    if (profile.canViewPosts === false) return;
    const sequence = ++networkRequest.current;
    setNetwork({ direction, page, data: [], total: 0, loading: true });
    try {
      const { data } = await socialAPI[direction](profile.id, { page });
      if (sequence === networkRequest.current) setNetwork({ ...data, direction, loading: false });
    } catch (error) {
      if (sequence === networkRequest.current) setNetwork(current => ({ ...current, loading: false, error: true }));
    }
  };
  const updateFollow = async () => {
    if (!user) { openAuthModal('login'); return; }
    if (updatingFollow) return;
    setUpdatingFollow(true);
    try {
      const { data } = await (relationship?.following || relationship?.pending ? socialAPI.unfollow(profile.id) : socialAPI.follow(profile.id));
      setRelationship(data);
      await loadProfile(true);
      if (network) closeNetwork();
      notifySocialChange();
    } catch (error) { toast.error(error.response?.data?.error || t('followError')); }
    finally { setUpdatingFollow(false); }
  };
  const startConversation = async () => {
    if (!user) { openAuthModal('login'); return; }
    try {
      const { data } = await conversationsAPI.create(profile.id);
      navigate('/feed#conversations', { state: { conversationId: data.id } });
    } catch (error) { toast.error(error.response?.data?.error || t('conversationNotFound')); }
  };
  const share = async () => {
    try {
      if (navigator.share) await navigator.share({ title: profile.name, url: window.location.href });
      else await navigator.clipboard.writeText(window.location.href);
      toast.success(navigator.share ? t('Perfil compartilhado.') : t('Link do perfil copiado.'));
    } catch (error) { if (error.name !== 'AbortError') toast.error(t('Não foi possível compartilhar o perfil.')); }
  };
  const posts = useMemo(() => tab === 'posts' ? profile?.publications || [] : privatePosts[tab] || [], [profile, privatePosts, tab]);
  if (loading) return <div className="site-page flex min-h-screen items-center justify-center text-white"><p className="site-muted">{t('loading')}</p></div>;
  if (!profile) return <div className="site-page flex min-h-screen items-center justify-center text-white"><p>{t('profileNotFound')}</p></div>;
  const tabs = [{ key: 'posts', label: t('Publicações'), icon: FileText }, ...(isOwnProfile ? [{ key: 'saved', label: t('Favoritos'), icon: Bookmark }, { key: 'liked', label: t('Curtidas'), icon: Heart }] : [])];
  return <div className="site-page profile-page min-h-screen py-8 text-white">
    <main className="profile-shell mx-auto max-w-5xl px-4">
      <section className="profile-hero site-panel">
        <div className="profile-avatar">{profile.avatar ? <img src={mediaUrl(profile.avatar)} alt={profile.name} /> : <span>{profile.name?.charAt(0).toUpperCase()}</span>}</div>
        <div className="profile-summary">
          <div className="profile-name-row"><h1>{profile.name}</h1><span>{profile.username ? `@${profile.username}` : t('noUsername')}{profile.isPrivate && <Lock size={14} aria-label={t('privateProfile')} />}</span></div>
          <div className="profile-stats">
            <span><b>{profile.publicationCount || 0}</b> {t('publicações')}</span>
            <button type="button" disabled={profile.canViewPosts === false} onClick={() => openNetwork('following')}><b>{profile.following || 0}</b> {t('followingTitle')}</button>
            <button type="button" disabled={profile.canViewPosts === false} onClick={() => openNetwork('followers')}><b>{profile.followers || 0}</b> {t('followersTitle')}</button>
            <span><b>{profile.likes || 0}</b> {t('curtidas')}</span>
          </div>
          {!isOwnProfile && (relationship?.mutual || relationship?.followedBy) && <p className="social-relationship-badge"><UserCheck size={14} />{t(relationship.mutual ? 'mutualFriends' : 'followsYou')}</p>}
          <div className="profile-actions">
            {isOwnProfile ? <><Link to="/profile" className="profile-action profile-action--primary"><Settings size={16} />{t('Editar perfil')}</Link><Link to="/profile" aria-label={t('Configurações')} className="profile-action"><Settings size={16} /></Link></>
              : <><button type="button" disabled={updatingFollow} onClick={updateFollow} title={t(relationship?.pending ? 'cancelFollowRequest' : relationship?.following ? 'unfollowButton' : 'followButton')} className={`profile-action ${relationship?.following ? '' : 'profile-action--primary'}`}>{relationship?.following ? <UserCheck size={16} /> : <UserPlus size={16} />}{t(followButtonKey(relationship))}</button><button type="button" onClick={startConversation} className="profile-action"><MessageCircle size={16} />{t('Mensagem')}</button></>}
            <button type="button" onClick={share} className="profile-action"><Share2 size={16} /><span>{t('Compartilhar')}</span></button>
          </div>
          {profile.bio && <p className="profile-bio">{profile.bio}</p>}
          <p className="profile-date"><CalendarDays size={14} />{t('joinedAt')} {format(new Date(profile.joinedAt), 'P', { locale: ({ 'pt-BR': ptBR, en: enUS, es })[getLanguage()] })}</p>
        </div>
      </section>
      <section className="profile-content">
        <nav className="profile-tabs" aria-label={t('Conteúdo do perfil')}>{tabs.map(({ key, label, icon: Icon }) => <button key={key} type="button" className={tab === key ? 'is-active' : ''} onClick={() => setTab(key)}><Icon size={16} />{label}</button>)}</nav>
        {profile.canViewPosts === false ? <div className="feed-empty social-private-notice"><Lock size={28} /><p>{t('privateProfileNotice')}</p></div>
          : loadingTab ? <div className="feed-empty">{t('Carregando conteúdo…')}</div>
            : posts.length === 0 ? <div className="feed-empty">{tab === 'posts' ? t('profileNoPosts') : t('Nenhuma publicação nesta seção.')}</div>
              : <div className="profile-post-grid">{posts.map(publication => <Link key={publication.id} to={`/problem/${publication.id}`} className="feed-post block"><span className="feed-category">{translateCategory(publication.category?.name) || t('noCategory')}</span><h2>{publication.title}</h2><p>{publication.description}</p><small>{publication.city && publication.state ? `${publication.city}, ${publication.state}` : publication.address || t('locationNotSpecified')}</small></Link>)}</div>}
      </section>
    </main>
    {network && <div className="context-modal social-network-backdrop" onClick={event => { if (event.target === event.currentTarget) closeNetwork(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="social-network-title" className="site-panel social-network-dialog">
        <header><h2 id="social-network-title">{t(network.direction === 'followers' ? 'followersTitle' : 'followingTitle')}</h2><button type="button" aria-label={t('Fechar')} onClick={closeNetwork}><X size={20} /></button></header>
        {network.loading ? <p className="feed-empty">{t('loading')}</p> : network.error ? <p role="alert" className="feed-empty">{t('followListError')}</p> : network.data.length === 0 ? <p className="feed-empty">{t('followListEmpty')}</p> : <ul>{network.data.map(person => <li key={person.id}><Link to={person.username ? `/${encodeURIComponent(person.username)}` : `/profile/${person.id}`} onClick={closeNetwork}><Avatar user={person} /><span><strong>{person.nome}</strong><small>{person.username ? `@${person.username}` : t('noUsername')}</small></span></Link></li>)}</ul>}
        {network.total > network.limit && <footer><button type="button" disabled={network.loading || network.page <= 1} onClick={() => openNetwork(network.direction, network.page - 1)}>{t('previous')}</button><span>{network.page}</span><button type="button" disabled={network.loading || network.page * network.limit >= network.total} onClick={() => openNetwork(network.direction, network.page + 1)}>{t('next')}</button></footer>}
      </section>
    </div>}
  </div>;
};
export default UserProfilePage;
