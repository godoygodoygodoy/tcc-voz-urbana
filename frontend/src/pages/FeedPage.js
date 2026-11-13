import {sharingAPI} from '../services/api';
const SharePublicationDialog = React.lazy(() => import('../components/SharePublicationDialog'));
import { subscribeActivityChanges, notifyActivityChange } from '../utils/activity';
const StoriesRail = React.lazy(() => import('../components/StoriesRail'));
import { ConfirmDialog } from '../components/SiteDialog';
const CollectionsPanel = React.lazy(() => import('../components/CollectionsPanel'));
import { useObjectUrls } from '../utils/useObjectUrls';
import { createVisibilityPoller, retainEqual } from '../utils/polling';
import { shallow } from 'zustand/shallow';
import { followButtonKey, notifySocialChange, subscribeSocialChanges } from '../utils/social';
import { translateStatus, translateSystemText, translateCategory, getLanguage, translate as tr, useI18n } from '../i18n';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  Bookmark,
  Check,
  Copy,
  ChevronLeft,
  ChevronRight,
  Ellipsis,
  Image as ImageIcon,
  Mail,
  Mailbox,
  MapPin,
  Lock,
  MessageCircle,
  Plus,
  Search,
  Send,
  Share2,
  Trash2,
  Flag,
  Users,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR, enUS, es } from 'date-fns/locale';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from '../components/LocalizedToast';
import { categoriesAPI, conversationsAPI, mediaUrl, notificationsAPI, problemsAPI, savedAPI, socialAPI, votesAPI } from '../services/api';
import { useAuthStore } from '../store';

import AmbientContour from '../components/AmbientContour';
import { FloatingDatePicker, FloatingSelect, FloatingTimePicker, UploadField } from '../components/FloatingFields';
import { brazilStates, fetchCep, fetchCities, formatCep, normalizeCep } from '../utils/brazil';
import Avatar from '../components/Avatar';
import ImageCropper from '../components/ImageCropper';
import { profilePath } from '../utils/profileLinks';

const actionAsset = (name) => `${import.meta.env.BASE_URL}feed-actions/${name}.webp`;

const navItems = [
  { key: 'home', label: 'navHome', icon: Mailbox },
  { key: 'conversations', label: 'conversationsTitle', icon: Mail },
  { key: 'search', label: 'searchTitle', icon: Search },
  { key: 'notifications', label: 'notifications', icon: Bell },
  { key: 'saved', label: 'Publicações salvas', icon: Bookmark },
  { key: 'create', label: 'create', icon: Plus },
];

const emptyCreateForm = {
  title: '',
  description: '',
  categoryId: '',
  cep: '',
  street: '',
  number: '',
  neighborhood: '',
  complemento: '',
  city: '',
  state: '',
  occurrenceDate: '',
  occurrenceTime: ''
};

const MAX_IMAGE_COUNT = 8;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const FeedAction = ({ active, asset, label, count, onClick, disabled }) => { const { t } = useI18n(); return (<button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    className={`group/action inline-flex min-w-[76px] items-center gap-2 rounded-xl px-2 py-1.5 text-xs font-bold transition hover:bg-white/8 disabled:cursor-wait disabled:opacity-60 ${active ? 'text-fuchsia-300' : 'text-white/60'}`}
  >
    <img width="32" height="32" decoding="async" src={actionAsset(active ? (asset === 'curtir' ? 'curtido' : 'republicado') : asset)} alt="" className="h-8 w-8 object-contain transition group-hover/action:scale-110" />
    <span>{count ?? label}</span>
  </button>); };

const FeedHeader = ({ title, description, children }) => { const { t } = useI18n(); return (<div className="feed-view-head">
    <div>
      <p className="feed-kicker">Voz Urbana</p>
      <h1 className="feed-title">{title}</h1>
      <p className="feed-subtitle">{description}</p>
    </div>
    <div className="feed-view-actions">{children}</div>
  </div>); };

const FeedPost = React.memo(function FeedPost({ post, slide, liked, shared, menuOpen, saved, canManage, voting, onAction }) {
    const { t } = useI18n();
    const images = post.images?.length ? post.images : [];
    const authorName = post.author?.name || t("Usuário");
    const authorHandle = post.author?.username ? `@${post.author.username.replace(/^@/, '')}` : t("perfil sem @");
    return <article key={post.id} className="feed-post">
      <div className="feed-post-head">
        <Link to={profilePath(post.author)} className="feed-post-author"><Avatar user={post.author} className="feed-avatar" /></Link>
        <Link to={profilePath(post.author)} className="min-w-0 feed-post-author-copy"><strong>{authorHandle}</strong><span>{authorName} · {post.createdAt ? formatDistanceToNow(new Date(post.createdAt), { locale: ({ 'pt-BR': ptBR, en: enUS, es })[getLanguage()], addSuffix: true }) : t('now')}</span></Link>
        <div className="relative flex items-center gap-1">
          <button type="button" className="feed-more" aria-label={t("Mais opções")} onClick={() => onAction('menu', post.id, 'toggle')}><Ellipsis size={18} /></button>
              {menuOpen && <div className="feed-post-menu" role="menu">
            {canManage && <button type="button" onClick={() => { onAction('startEditing', post); onAction('menu', null); }}><Ellipsis size={14} /> {t("Editar publicação")}</button>}
            {canManage && <button type="button" onClick={() => { onAction('menu', null); onAction('deletePost', post); }}><Trash2 size={14} /> {t("Apagar publicação")}</button>}
            <button type="button" onClick={() => onAction('toggleSaved', post)}><Bookmark size={14} /> {saved ? t("Remover dos salvos") : t("Salvar publicação")}</button>
            <button type="button" onClick={() => onAction('copyPostLink', post)}><Copy size={14} /> {t("Copiar link")}</button>
            <button type="button" onClick={() => onAction('sharePost', post)}><Share2 size={14} /> {t("Compartilhar publicação")}</button>
            <button type="button" onClick={() => { onAction('menu', null); onAction('navigate', `/problem/${post.id}`); }}><Check size={14} /> {t("Ver detalhes")}</button>
            <button type="button" onClick={() => { onAction('menu', null); toast.info(t("Obrigado. A denúncia será analisada.")); }}><Flag size={14} /> {t("Denunciar")}</button>
          </div>}
        </div>
      </div>
      <Link to={`/problem/${post.id}`} className="block">
        <div className="feed-post-copy"><span className="feed-category">{translateCategory(post.category?.name) || t('noCategory')}</span><h2>{post.title}{post.isEdited && <small className="ml-2 text-xs text-white/45">{t("(editado)")}</small>}</h2><p>{post.description}</p><span className="feed-location"><MapPin size={13} />{post.address || t('locationOnMap')}</span></div>
        <div className="feed-media" style={{ aspectRatio: images.length ? (images[slide].proporcao === '16:9' ? '16 / 9' : images[slide].proporcao === '9:16' ? '9 / 16' : images[slide].proporcao === '4:5' ? '4 / 5' : images[slide].proporcao === '5:4' ? '5 / 4' : '1 / 1') : '1.85 / 1' }}>
          {images.length > 0 ? <button type="button" className="block h-full w-full" style={{ aspectRatio: images[slide].proporcao === '16:9' ? '16 / 9' : images[slide].proporcao === '9:16' ? '9 / 16' : images[slide].proporcao === '4:5' ? '4 / 5' : images[slide].proporcao === '5:4' ? '5 / 4' : '1 / 1' }} onClick={(event) => { event.preventDefault(); onAction('setLightboxImage', mediaUrl(images[slide].url)); }}><img loading="lazy" decoding="async" src={mediaUrl(images[slide].url)} alt={post.title} /></button> : <div className="feed-media-placeholder"><span>Voz Urbana</span><strong>{post.title}</strong><small>{translateStatus(post.status)}</small></div>}
          {images.length > 1 && <><button type="button" onClick={(event) => { event.preventDefault(); onAction('changeSlide', post.id, -1, images.length); }} className="feed-slide feed-slide-left" aria-label={t("Imagem anterior")}><ChevronLeft size={20} /></button><button type="button" onClick={(event) => { event.preventDefault(); onAction('changeSlide', post.id, 1, images.length); }} className="feed-slide feed-slide-right" aria-label={t("Próxima imagem")}><ChevronRight size={20} /></button><div className="feed-dots">{images.map((image, index) => <span key={image.id || index} className={index === slide ? 'is-current' : ''} />)}</div></>}
        </div>
      </Link>
      <div className="feed-post-actions">
        <FeedAction active={liked} asset="curtir" label={t("Curtir ocorrência")} count={`${post.votes || 0} ${t('apoios')}`} onClick={() => onAction('handleVote', post)} disabled={voting} />
        <FeedAction asset="comentar" label={t("Comentar ocorrência")} count={t("Comentar")} onClick={() => onAction('navigate', `/problem/${post.id}#comments`)} />
        <FeedAction active={shared} asset="republicar" label={t("Republicar ocorrência")} count={t("Republicar")} onClick={() => onAction('toggleShare', post)} />
        <button type="button" className="feed-action-icon" aria-label={t("Enviar mensagem")} onClick={() => onAction('openConversation', post.author)}><img width="32" height="32" decoding="async" src={actionAsset('mensagem')} alt="" /></button>
        <Link to={`/problem/${post.id}`} className="ml-auto feed-bookmark" aria-label={t("Abrir ocorrência")}><MessageCircle size={17} /></Link>
      </div>
    </article>;
});

const FeedPage = () => {

  const { t, language } = useI18n();
  const { user, openAuthModal } = useAuthStore(state => ({ user: state.user, openAuthModal: state.openAuthModal }), shallow);
  const location = useLocation();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoryError, setCategoryError] = useState(false);
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('recent');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [feedError, setFeedError] = useState(false);
  const [likedPosts, setLikedPosts] = useState(() => new Set());
  const [sharedPosts, setSharedPosts] = useState(() => new Set());
  const [slideByPost, setSlideByPost] = useState({});
  const [votingPost, setVotingPost] = useState(null);
  const votesInFlight = useRef(new Set());
  const [notifications, setNotifications] = useState([]);
  const [notificationFilter,setNotificationFilter] = useState('all');
  const [notificationPage,setNotificationPage] = useState(1);
  const [notificationMeta,setNotificationMeta] = useState({total:0,unread:0,limit:30});
  const [notificationError,setNotificationError] = useState(false);
  const notificationRequest = useRef(0);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [userResults, setUserResults] = useState([]);
  const [peopleSearchError, setPeopleSearchError] = useState(false);
  const [peopleTotal, setPeopleTotal] = useState(0);
  const [peoplePage, setPeoplePage] = useState(1);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [relationships, setRelationships] = useState({});
  const [messages, setMessages] = useState([]);
  const messageCursor = useRef(null);
  const [hasOlderMessages, setHasOlderMessages] = useState(false);
  const [loadingOlderMessages, setLoadingOlderMessages] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const [historyReady, setHistoryReady] = useState(false);
  const [historyError, setHistoryError] = useState(false);
  const dmMessages = useRef(null);
  const dmAtBottom = useRef(true);
  const messageRequest = useRef(0);
  const messageSending = useRef(false);
  const selectedConversationId = useRef(null);
  selectedConversationId.current = selectedConversation?.id || null;
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [creating, setCreating] = useState(false);
  const [deletingPost, setDeletingPost] = useState(null);
  const [deleteCandidate, setDeleteCandidate] = useState(null);
  const [cities, setCities] = useState([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [createImages, setCreateImages] = useState([]);
  const createPreviews = useObjectUrls(createImages);
  const [editingPost, setEditingPost] = useState(null);
  const [editImages, setEditImages] = useState([]);
  const [removedEditImages, setRemovedEditImages] = useState([]);
  const [savingEdit, setSavingEdit] = useState(false);
  const [lightboxImage, setLightboxImage] = useState(null);
  const [savedPosts, setSavedPosts] = useState([]);
  const [openMenu, setOpenMenu] = useState(null);
  const [cropFile, setCropFile] = useState(null);
  const [cropQueue, setCropQueue] = useState([]);
  const [cropTarget, setCropTarget] = useState('create');
  const [createImageAspect, setCreateImageAspect] = useState('1:1');
  const [editImageAspect, setEditImageAspect] = useState('1:1');
  const lastCepLookup = useRef('');

  const activeTab = navItems.some((item) => item.key === location.hash.slice(1)) ? location.hash.slice(1) : 'home';

  useEffect(() => {
    const modalOpen = Boolean(editingPost || lightboxImage);
    if (!modalOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [editingPost, lightboxImage]);

  const feedRequest = useRef(0);
  const loadFeed = useCallback(async () => {
    const sequence = ++feedRequest.current;
    try {
      setLoading(true);
      setFeedError(false);
      const [problemsResult, categoriesResult] = await Promise.allSettled([
        problemsAPI.list({ category: category || undefined, status: status || undefined, sort, page, limit: 9 }),
        categoriesAPI.list(),
      ]);
      if (sequence !== feedRequest.current) return;
      if (problemsResult.status === 'rejected') throw problemsResult.reason;
      const problemsResponse = problemsResult.value;
      setPosts(problemsResponse.data?.data || []);
      setLikedPosts(new Set((problemsResponse.data?.data || []).filter((post) => post.supportedByMe).map((post) => post.id)));
      setTotal(problemsResponse.data?.total || 0);
      if (categoriesResult.status === 'rejected'
        || !Array.isArray(categoriesResult.value.data)
        || categoriesResult.value.data.length === 0) {
        setCategories([]);
        setCategoryError(true);
        toast.error(tr("Não foi possível carregar as categorias."));
      } else {
        setCategories(categoriesResult.value.data);
        setCategoryError(false);
      }
    } catch (error) {
      if (sequence !== feedRequest.current) return;
      setCategoryError(true);
      setFeedError(true);
      toast.error(tr('apiUnavailable'));
    } finally {
      if (sequence === feedRequest.current) setLoading(false);
    }
  }, [category, page, sort, status]);

  useEffect(() => { loadFeed(); return () => { ++feedRequest.current; }; }, [loadFeed]);

  useEffect(() => {
    if (!user) {
      setSavedPosts([]);
      return undefined;
    }
    savedAPI.list().then((response) => setSavedPosts(response.data || []))
      .catch((error) => toast.error(error.response?.data?.error || t("Não foi possível carregar as publicações salvas.")));
    return undefined;
  }, [activeTab, user]);

  useEffect(() => {
    if (!user || activeTab !== 'conversations') return undefined;
    let active = true;
    let chooseRequested = true;
    let requestSequence = 0;
    const refresh = async () => {
      if (document.hidden) return;
      const sequence = ++requestSequence;
      try {
        const { data } = await conversationsAPI.list();
        if (!active || sequence !== requestSequence) return;
        setConversations(current => retainEqual(current, data || []));
        const requested = chooseRequested && data.find(item => item.id === (location.state?.conversationId || new URLSearchParams(location.search).get('conversation')));
        chooseRequested = false;
        setSelectedConversation(current => retainEqual(current, requested || (current ? { ...current, participant: data.find(item => item.id === current.id)?.participant || current.participant } : data[0] || null)));
      } catch { /* Keep existing conversations visible when a refresh fails. */ }
    };
    refresh();
    const poller = createVisibilityPoller(refresh, 5000);
    const unsubscribe = subscribeSocialChanges(poller.refresh);
    return () => { active = false; ++requestSequence; unsubscribe(); poller.dispose(); };
  }, [activeTab, user?.id, location.state?.conversationId, location.search]);

  useEffect(() => {
    if (dmMessages.current && dmAtBottom.current) dmMessages.current.scrollTop = dmMessages.current.scrollHeight;
  }, [messages]);
  useEffect(() => {
    ++messageRequest.current; selectedConversationId.current = null;
    setMessages([]); setSelectedConversation(null); setConversations([]); setRelationships({}); setHistoryReady(false);
  }, [user?.id]);

  const readMessages = useCallback(async (conversationId) => {
    if (messageSending.current || selectedConversationId.current !== conversationId) return;
    const sequence = ++messageRequest.current;
    try {
      const after = messageCursor.current;
      const { data } = await conversationsAPI.messages(conversationId, after ? { after } : undefined);
      if (sequence !== messageRequest.current || selectedConversationId.current !== conversationId) return;
      setMessages(current => {
        const known = new Set(current.map(item => item.id));
        const fresh = (data.messages || []).filter(item => !known.has(item.id));
        return fresh.length ? [...current, ...fresh] : current;
      });
      if (data.messages?.length) messageCursor.current = data.messages[data.messages.length - 1].id;
      if (!after) setHasOlderMessages(Boolean(data.pageInfo?.hasOlder));
      setSelectedConversation(current => current?.id === conversationId ? retainEqual(current, { ...current, messaging: data.messaging }) : current);
      setHistoryReady(true); setHistoryError(false);
    } catch {
      if (sequence === messageRequest.current && selectedConversationId.current === conversationId) setHistoryError(true);
    }
  }, []);
  useEffect(() => {
    const conversationId = selectedConversation?.id;
    if (activeTab !== 'conversations' || !conversationId || !user) return undefined;
    dmAtBottom.current = true;
    messageCursor.current = null; setHasOlderMessages(false);
    setMessages([]); setMessageText(''); setHistoryReady(false); setHistoryError(false);
    readMessages(conversationId);
    const refresh = () => !document.hidden && readMessages(conversationId);
    const poller = createVisibilityPoller(refresh, 3000);
    const unsubscribe = subscribeSocialChanges(poller.refresh);
    return () => { ++messageRequest.current; unsubscribe(); poller.dispose(); };
  }, [activeTab, selectedConversation?.id, user?.id, readMessages]);

  useEffect(() => {
    if (!openMenu) return undefined;
    const close = (event) => {
      if (event.key === 'Escape' || !event.target.closest('.feed-post-head')) setOpenMenu(null);
    };
    document.addEventListener('keydown', close);
    document.addEventListener('pointerdown', close);
    return () => {
      document.removeEventListener('keydown', close);
      document.removeEventListener('pointerdown', close);
    };
  }, [openMenu]);

  useEffect(() => {
    let cancelled = false;
    if (!createForm.state) {
      setCities([]);
      return undefined;
    }
    setLoadingCities(true);
    fetchCities(createForm.state)
      .then((items) => { if (!cancelled) setCities(items); })
      .catch((error) => { if (!cancelled) { setCities([]); toast.error(error.message); } })
      .finally(() => { if (!cancelled) setLoadingCities(false); });
    return () => { cancelled = true; };
  }, [createForm.state]);

  useEffect(() => {
    const cep = normalizeCep(createForm.cep);
    if (cep.length !== 8) {
      lastCepLookup.current = '';
      return undefined;
    }
    if (lastCepLookup.current === cep) return undefined;
    lastCepLookup.current = cep;
    let cancelled = false;
    setLoadingCep(true);
    fetchCep(cep)
      .then((result) => {
        if (cancelled || !result) return;
        setCreateForm((current) => ({
          ...current,
          cep: formatCep(result.cep),
          street: current.street || result.street,
          neighborhood: current.neighborhood || result.neighborhood,
          city: current.city || result.city,
          state: current.state || result.state
        }));
      })
      .catch((error) => { if (!cancelled) toast.error(error.message); })
      .finally(() => { if (!cancelled) setLoadingCep(false); });
    return () => { cancelled = true; };
  }, [createForm.cep]);

  useEffect(() => {
    if (activeTab !== 'notifications' || !user) return undefined;
    let active=true;
    const loadNotifications=async()=>{
      const sequence=++notificationRequest.current;
      setLoadingNotifications(true);
      try{
        const {data}=await notificationsAPI.list({paginated:'true',page:notificationPage,...(notificationFilter==='all'?{}:{read:String(notificationFilter==='read')})});
        if(active&&sequence===notificationRequest.current){const rows=Array.isArray(data)?data:data.data||[];setNotifications(current=>retainEqual(current,rows));setNotificationMeta(Array.isArray(data)?{total:rows.length,unread:rows.filter(row=>!row.lida).length,limit:30}:data);setNotificationError(false);}
      }catch{if(active&&sequence===notificationRequest.current)setNotificationError(true);}
      finally{if(active&&sequence===notificationRequest.current)setLoadingNotifications(false);}
    };
    const poller=createVisibilityPoller(loadNotifications,30000,{immediate:true});
    const unsubscribe=subscribeActivityChanges(poller.refresh);
    return()=>{active=false;++notificationRequest.current;poller.dispose();unsubscribe();};
  },[activeTab,user?.id,notificationFilter,notificationPage]);

  const validateImages = (files, existingCount = 0) => {
    const selected = Array.from(files || []);
    if (existingCount + selected.length > MAX_IMAGE_COUNT) throw new Error(t('Você pode enviar no máximo {count} imagens.', { count: MAX_IMAGE_COUNT }));
    const invalid = selected.find((file) => !IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_SIZE);
    if (invalid) throw new Error(t("Use JPG, PNG, WEBP ou GIF com até 5 MB por imagem."));
    return selected;
  };

  const handleCreateImages = (event) => {
    try {
      const selected = validateImages(event.target.files, createImages.length);
      if (selected.length) {
        setCropTarget('create');
        setCropFile(selected[0]);
        setCropQueue(selected.slice(1));
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      event.target.value = '';
    }
  };

  const handleCroppedImage = (file, aspect) => {
    if (cropTarget === 'create') setCreateImages((current) => [...current, file]);
    else setEditImages((current) => [...current, file]);
    if (cropTarget === 'create') setCreateImageAspect(aspect);
    else setEditImageAspect(aspect);
    const [next, ...rest] = cropQueue;
    if (next) {
      setCropFile(next);
      setCropQueue(rest);
    } else {
      setCropFile(null);
    }
  };

  const startEditing = (post) => {
    setEditingPost({
      ...post,
      title: post.title || '',
      description: post.description || '',
      address: post.address || '',
      categoryId: post.category?.id || ''
    });
    setEditImages([]);
    setRemovedEditImages([]);
  };

  const saveEdit = async (event) => {
    event.preventDefault();
    if (!editingPost) return;
    try {
      setSavingEdit(true);
      const payload = new FormData();
      ['title', 'description', 'address', 'street', 'number', 'neighborhood', 'complemento', 'cep', 'city', 'state', 'categoryId'].forEach((key) => {
        if (editingPost[key] !== undefined && editingPost[key] !== null) payload.append(key, editingPost[key]);
      });
      payload.append('removedImageIds', JSON.stringify(removedEditImages));
      payload.append('imageAspect', editImageAspect);
      editImages.forEach((file) => payload.append('images', file));
      const response = await problemsAPI.update(editingPost.id, payload);
      setPosts((current) => current.map((post) => post.id === editingPost.id ? response.data : post));
      setEditingPost(null);
      toast.success(t("Publicação atualizada."));
    } catch (error) {
      toast.error(error.response?.data?.error || error.message || t("Não foi possível editar a publicação."));
    } finally {
      setSavingEdit(false);
    }
  };

  useEffect(() => {
    const normalizedSearch = search.trim().replace(/^@+/, '');
    if (activeTab !== 'search' || normalizedSearch.length < 2) {
      setUserResults([]);
      setPeopleTotal(0);
      setPeopleSearchError(false);
      setLoadingUsers(false);
      return undefined;
    }
    let cancelled = false;
    const controller = new AbortController();
    setLoadingUsers(true);
    setPeopleSearchError(false);
    setUserResults([]);
    setPeopleTotal(0);
    const loadUsers = async () => {
      try {
        setLoadingUsers(true);
        const response = await socialAPI.searchUsers({ q: normalizedSearch, page: peoplePage, limit: 12 }, { signal: controller.signal });
        if (!cancelled) {
          setUserResults(response.data?.data || []);
          setPeopleTotal(response.data?.total || 0);
        }
      } catch (error) {
        if (!cancelled) { setUserResults([]); setPeopleSearchError(true); }
      } finally {
        if (!cancelled) setLoadingUsers(false);
      }
    };
    const timer = window.setTimeout(loadUsers, 300);
    return () => { cancelled = true; controller.abort(); window.clearTimeout(timer); };
  }, [activeTab, search, peoplePage]);

  useEffect(() => { setPeoplePage(1); }, [search]);

  const statusLabels = {
    ABERTO: t('openStatus'),
    EM_ANDAMENTO: t('progressStatus'),
    RESOLVIDO: t('resolvedStatus'),
    open: t('openStatus'),
    in_progress: t('progressStatus'),
    resolved: t('resolvedStatus'),
  };

  const filteredPosts = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return posts;
    return posts.filter((post) => [post.title, post.description, post.address, post.category?.name, post.author?.name, post.author?.username]
      .some((value) => String(value || '').toLowerCase().includes(query)));
  }, [posts, search]);

  const displayName = user?.username ? `@${user.username.replace(/^@/, '')}` : user?.name || user?.nome || t("Perfil");

  const selectTab = (key) => {
    navigate(`/feed#${key}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleVote = async (post) => {
    if (!user) {
      openAuthModal('login');
      return;
    }
    if (votesInFlight.current.has(post.id)) return;
    votesInFlight.current.add(post.id);
    const wasLiked = likedPosts.has(post.id), previousVotes = post.votes || 0;
    setVotingPost(post.id);
    setLikedPosts(current => { const next = new Set(current); if (wasLiked) next.delete(post.id); else next.add(post.id); return next; });
    setPosts(current => current.map(item => item.id === post.id ? { ...item, votes: Math.max(0, previousVotes + (wasLiked ? -1 : 1)) } : item));
    try {
      const response = await votesAPI.vote(post.id, { type: 'up' });
      setPosts(current => current.map(item => item.id === post.id ? { ...item, votes: response.data.votes } : item));
    } catch (error) {
      setPosts(current => current.map(item => item.id === post.id ? { ...item, votes: previousVotes } : item));
      setLikedPosts(current => { const next = new Set(current); if (wasLiked) next.add(post.id); else next.delete(post.id); return next; });
      toast.error(error.response?.data?.error || t('reportError'));
    } finally {
      votesInFlight.current.delete(post.id);
      setVotingPost(current => current === post.id ? null : current);
    }
  };

  const changeSlide = (postId, amount, imageCount) => {
    setSlideByPost((current) => ({ ...current, [postId]: ((current[postId] || 0) + amount + imageCount) % imageCount }));
  };

  const [shareCandidate,setShareCandidate] = useState(null);
  const toggleShare = post => { setOpenMenu(null); setShareCandidate(post.id); };

  const toggleSaved = async (post) => {
    if (!user) {
      toast.info(t("Entre na sua conta para salvar publicações."));
      return;
    }
    try {
      const saved = savedPosts.some((item) => item.id === post.id);
      if (saved) {
        await savedAPI.remove(post.id);
        setSavedPosts((current) => current.filter((item) => item.id !== post.id));
      } else {
        await savedAPI.save(post.id);
        setSavedPosts((current) => [{ ...post, savedByMe: true }, ...current]);
      }
      setOpenMenu(null);
      toast.success(saved ? t("Publicação removida dos salvos.") : t("Publicação salva."));
    } catch (error) {
      toast.error(error.response?.data?.error || t("Não foi possível atualizar os salvos."));
    }
  };

  const copyPostLink = async post => { setOpenMenu(null); try { const {data}=await sharingAPI.publication(post.id,getLanguage()); if(!navigator.clipboard?.writeText)throw Error();await navigator.clipboard.writeText(data.url);toast.success(t('shareCopied'));} catch(error){toast.error(error.response?.data?.error||t('shareCopyError'));} };
  const updateCreateForm = (event) => setCreateForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!user) {
      openAuthModal('login');
      return;
    }
    if (!createForm.title || !createForm.description || !createForm.categoryId
      || !createForm.occurrenceDate || !createForm.occurrenceTime) {
      toast.error(t("Preencha título, descrição, categoria e data/hora da ocorrência."));
      return;
    }
    try {
      setCreating(true);
      const payload = new FormData();
      const address = [createForm.street, createForm.number, createForm.neighborhood]
        .filter((value) => value.trim())
        .join(', ');
      payload.append('title', createForm.title);
      payload.append('description', createForm.description);
      payload.append('categoryId', createForm.categoryId);
      payload.append('address', address);
      payload.append('street', createForm.street);
      payload.append('number', createForm.number);
      payload.append('neighborhood', createForm.neighborhood);
      payload.append('complemento', createForm.complemento);
      payload.append('cep', normalizeCep(createForm.cep));
      payload.append('imageAspect', createImageAspect);
      payload.append('occurrenceDate', createForm.occurrenceDate);
      payload.append('occurrenceTime', createForm.occurrenceTime);
      payload.append('city', createForm.city);
      payload.append('state', createForm.state);
      createImages.forEach((file) => payload.append('images', file));
      await problemsAPI.create(payload);
      toast.success(t("Postagem criada com sucesso!"));
      setCreateForm(emptyCreateForm);
      setCreateImages([]);
      selectTab('home');
      loadFeed();
    } catch (error) {
      toast.error(error.response?.data?.error || t('reportError'));
    } finally {
      setCreating(false);
    }
  };

  const deletePost = post => setDeleteCandidate(post);
  const performDeletePost = async (post) => {
    try {
      setDeletingPost(post.id);
      await problemsAPI.remove(post.id);
      setPosts((current) => current.filter((item) => item.id !== post.id));
      setTotal((current) => Math.max(0, current - 1));
      setDeleteCandidate(null);
      toast.success(t('publicationDeleted'));
    } catch (error) {
      toast.error(error.response?.data?.error || t('deletePublicationError'));
    } finally {
      setDeletingPost(null);
    }
  };

  const openConversation = async (person) => {
    if (!user) { openAuthModal('login'); return; }
    if (!person?.id || person.id === user.id) return;
    try {
      const { data } = await conversationsAPI.create(person.id);
      ++messageRequest.current; selectedConversationId.current = data.id;
      setMessages([]); setHistoryReady(false); setMessageText(''); setSelectedConversation(data);
      setConversations(current => current.some(item => item.id === data.id) ? current : [data, ...current]);
      selectTab('conversations');
    } catch (error) { toast.error(error.response?.data?.error || t('conversationNotFound')); }
  };
  const sendMessage = async (event) => {
    event.preventDefault();
    if (!messageText.trim() || !selectedConversation || !historyReady || selectedConversation.messaging?.canSend === false || messageSending.current) return;
    const conversationId = selectedConversation.id;
    dmAtBottom.current = true;
    ++messageRequest.current; messageSending.current = true; setSendingMessage(true);
    try {
      const { data } = await conversationsAPI.send(conversationId, { texto: messageText.trim() });
      if (selectedConversationId.current === conversationId) {
        setMessages(current => current.some(item => item.id === data.message.id) ? current : [...current, data.message]);
        setSelectedConversation(current => current?.id === conversationId ? { ...current, messaging: data.messaging } : current);
        setMessageText('');
      }
      setConversations(current => current.map(item => item.id === conversationId ? { ...item, ultimaMensagem: data.message, messaging: data.messaging } : item));
    } catch (error) {
      if (error.response?.data?.messaging) setSelectedConversation(current => current?.id === conversationId ? { ...current, messaging: error.response.data.messaging } : current);
      toast.error(error.response?.data?.error || t('Não foi possível enviar a mensagem.'));
    } finally {
      messageSending.current = false; setSendingMessage(false);
      if (selectedConversationId.current === conversationId) readMessages(conversationId);
    }
  };
  const markNotificationsRead = async () => {
    const sequence=++notificationRequest.current;
    try { const {data}=await notificationsAPI.markAllRead();if(sequence===notificationRequest.current){setNotifications(current=>notificationFilter==='unread'?[]:current.map(item=>({...item,lida:true})));setNotificationMeta(current=>({...current,unread:data.unread??0,total:notificationFilter==='unread'?0:current.total}));}notifyActivityChange(); }
    catch(error){toast.error(error.response?.data?.error||t('notificationReadError'));}
  };
  const openNotification = async item => {
    if(!item.lida){const sequence=++notificationRequest.current;try{const {data}=await notificationsAPI.markRead(item.id);setNotifications(current=>current.map(row=>row.id===item.id?{...row,lida:true}:row));if(sequence===notificationRequest.current)setNotificationMeta(current=>({...current,unread:data.unread??0}));}catch(error){toast.error(error.response?.data?.error||t('notificationReadError'));}}
    if(item.link?.startsWith('/')&&!item.link.startsWith('//'))navigate(item.link);
  };
  const loadRelationship = async (userId) => {
    if (!user) return;
    try { const { data } = await socialAPI.relationship(userId); setRelationships(current => ({ ...current, [userId]: data })); }
    catch { /* An unavailable relationship must not prevent browsing profiles. */ }
  };
  const changeFollow = async (person) => {
    if (!user) { openAuthModal('login'); return; }
    const relation = relationships[person.id];
    try {
      const { data } = await (relation?.following || relation?.pending ? socialAPI.unfollow(person.id) : socialAPI.follow(person.id));
      setRelationships(current => ({ ...current, [person.id]: data }));
      notifySocialChange();
    } catch (error) { toast.error(error.response?.data?.error || t('followError')); }
  };
  useEffect(() => {
    if (!user || !userResults.length) return undefined;
    let active = true;
    const refresh = async () => {
      const results = await Promise.allSettled(userResults.filter(person => person.id !== user.id).map(async person => [person.id, (await socialAPI.relationship(person.id)).data]));
      if (active) setRelationships(current => ({ ...current, ...Object.fromEntries(results.filter(result => result.status === 'fulfilled').map(result => result.value)) }));
    };
    refresh();
    const unsubscribe = subscribeSocialChanges(refresh);
    return () => { active = false; unsubscribe(); };
  }, [user?.id, userResults]);
  useEffect(() => subscribeSocialChanges(() => loadFeed()), [loadFeed]);

  const postActions = useRef({});
  postActions.current = { startEditing, deletePost, toggleSaved, copyPostLink, sharePost: post => { setOpenMenu(null); setShareCandidate(post.id); }, navigate, setLightboxImage, changeSlide, handleVote, toggleShare, openConversation,
    menu: (id, mode) => setOpenMenu(current => mode === 'toggle' && current === id ? null : id) };
  const dispatchPostAction = useCallback((name, ...args) => postActions.current[name](...args), []);
  const renderPost = post => <FeedPost key={post.id} post={post} slide={slideByPost[post.id] || 0} liked={likedPosts.has(post.id)} shared={sharedPosts.has(post.id)} menuOpen={openMenu === post.id} saved={savedPosts.some(item => item.id === post.id)} canManage={post.author?.id === user?.id || user?.role === 'admin'} voting={votingPost === post.id} onAction={dispatchPostAction} />;

  const renderHome = () => <>
    <React.Suspense fallback={null}><StoriesRail/></React.Suspense>
    <FeedHeader title={t('recentIdentifications')} description={t("Relatos urbanos, apoio comunitário e acompanhamento real.")}>
      <button type="button" onClick={() => selectTab('create')} className="feed-report-button"><Plus size={15} /> <span>{t('reportProblem')}</span></button>
    </FeedHeader>
    <section id="search" className="feed-filters">
      <label className="feed-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("Buscar no feed...")} /></label>
      <FloatingSelect value={status} onChange={(value) => { setStatus(value); setPage(1); }} options={[{ value: '', label: t("Todos os status") }, { value: 'ABERTO', label: t('openStatus') }, { value: 'EM_ANDAMENTO', label: t('progressStatus') }, { value: 'RESOLVIDO', label: t('resolvedStatus') }]} />
      <FloatingSelect value={category} onChange={(value) => { setCategory(value); setPage(1); }} options={[{ value: '', label: categoryError ? t("Categorias indisponíveis") : t("Todas as categorias") }, ...categories.map((item) => ({ value: item.id, label: translateCategory(item.name) }))]} />
      <FloatingSelect value={sort} onChange={(value) => { setSort(value); setPage(1); }} options={[{ value: 'recent', label: t("Ocorrências recentes") }, { value: 'votes', label: t("Mais apoiadas") }]} />
    </section>
    {feedError && <div className="feed-empty" role="alert">{t("Não foi possível consultar as publicações. Isso não significa que foram apagadas.")}<button type="button" onClick={loadFeed}>{t("Tentar novamente")}</button></div>}
    {loading && posts.length === 0 ? <div className="feed-post-skeleton" role="status" aria-busy="true"><span className="sr-only">{t('loadingPosts')}</span><div className="route-skeleton-title" /><div className="route-skeleton-line" /><div className="route-skeleton-card" /></div> : feedError && filteredPosts.length === 0 ? null : filteredPosts.length === 0 ? <div className="feed-empty"><ImageIcon size={30} />{t('noPosts')}</div> : <div className="space-y-5">{filteredPosts.map(renderPost)}</div>}
    <footer className="feed-pagination"><span>{total} {t("publicações")}</span><div><button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft size={16} /></button><span>{page}</span><button type="button" disabled={page * 9 >= total} onClick={() => setPage((value) => value + 1)}><ChevronRight size={16} /></button></div></footer>
  </>;

  const loadOlderMessages = async () => {
    if (!selectedConversation || loadingOlderMessages || !messages.length) return;
    const id = selectedConversation.id;
    setLoadingOlderMessages(true);
    const element = dmMessages.current, height = element?.scrollHeight || 0;
    dmAtBottom.current = false;
    try {
      const { data } = await conversationsAPI.messages(id, { before: messages[0].id });
      if (selectedConversationId.current !== id) return;
      setMessages(current => { const known = new Set(current.map(item => item.id)); return [...data.messages.filter(item => !known.has(item.id)), ...current]; });
      setHasOlderMessages(Boolean(data.pageInfo?.hasOlder));
      requestAnimationFrame(() => { if (element) element.scrollTop += element.scrollHeight - height; });
    } catch { if (selectedConversationId.current === id) setHistoryError(true); }
    finally { setLoadingOlderMessages(false); }
  };

  const renderConversations = () => <>
    <FeedHeader title={t('conversationsTitle')} description={t('Troque mensagens com pessoas que também cuidam da cidade.')} />
    <div className="feed-dm-shell">
      <div className="feed-dm-list">
        <div className="feed-dm-list-head"><strong>{t('Mensagens')}</strong><button type="button" aria-label={t('Nova conversa')} onClick={() => selectTab('search')}><Plus size={17} /></button></div>
        {conversations.length === 0 ? <div className="feed-empty">{t('chatStartHint')}</div> : conversations.map(conversation => <button key={conversation.id} type="button" className={`feed-dm-contact ${selectedConversation?.id === conversation.id ? 'is-selected' : ''}`} onClick={() => { ++messageRequest.current; selectedConversationId.current = conversation.id; setMessages([]); setHistoryReady(false); setMessageText(''); setSelectedConversation(conversation); }}><Avatar user={conversation.participant} /><span><strong>{conversation.participant?.nome}</strong><small>{conversation.ultimaMensagem?.texto || t('Nenhuma mensagem ainda')}</small></span></button>)}
      </div>
      <div className="feed-dm-thread">
        <div className="feed-dm-thread-head"><Avatar user={selectedConversation?.participant} /><div><strong>{selectedConversation?.participant?.nome || t('Nenhuma conversa selecionada')}</strong><small>{!selectedConversation ? t('chatChooseConversation') : selectedConversation.messaging?.mutual ? t('chatUnlimited') : selectedConversation.messaging ? t('chatMessagesRemaining', { count: selectedConversation.messaging.remaining }) : t('loading')}</small></div></div>
        {historyError && <p className="feed-dm-history-error" role="alert">{t('chatHistoryError')}</p>}
        <div className="feed-dm-messages" ref={dmMessages} onScroll={event => { const el = event.currentTarget; dmAtBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60; }}>{hasOlderMessages && <button type="button" disabled={loadingOlderMessages} onClick={loadOlderMessages}>{t(loadingOlderMessages ? 'loading' : 'loadMore')}</button>}{messages.length ? messages.map(message => <div key={message.id} className={`feed-message ${message.remetenteId === user?.id ? 'is-own' : ''}`}><span>{message.texto}</span><small>{new Date(message.criadaEm).toLocaleTimeString(getLanguage(), { hour: '2-digit', minute: '2-digit' })}</small></div>) : <div className="feed-empty">{t(historyReady ? 'Nenhuma mensagem.' : selectedConversation ? 'loading' : 'chatChooseConversation')}</div>}</div>
        {selectedConversation?.messaging?.canSend === false ? <div className="feed-dm-limit" role="status"><Lock size={18} /><p>{t('chatLimitReached')}</p></div>
          : <form onSubmit={sendMessage} className="feed-dm-compose"><input value={messageText} onChange={event => setMessageText(event.target.value)} maxLength={2000} placeholder={t(selectedConversation ? 'Escreva uma mensagem...' : 'chatChooseConversation')} disabled={!selectedConversation || !historyReady || sendingMessage} /><button type="submit" aria-label={t(sendingMessage ? 'chatSendBusy' : 'Enviar mensagem')} disabled={!selectedConversation || !historyReady || sendingMessage || !messageText.trim()}><Send size={17} /></button></form>}
      </div>
    </div>
  </>;

  const renderSearch = () => <>
    <FeedHeader title={t('searchTitle')} description={t("Encontre locais, pessoas, ambientes e problemas publicados na cidade.")} />
    <div className="feed-discovery-search"><Search size={20} /><input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("Busque por rua, usuário, categoria ou problema...")} /></div>
    <div className="feed-search-section">
      <div className="feed-section-label"><Users size={15} /> {t("Pessoas")}</div>
      {search.trim().replace(/^@+/, '').length < 2 ? <p className="feed-search-empty">{t("Digite pelo menos 2 caracteres para buscar pessoas.")}</p> : peopleSearchError ? <p className="feed-search-empty" role="alert">{t("Não foi possível consultar as pessoas. Verifique sua conexão e tente novamente.")}</p> : loadingUsers ? <p className="feed-search-empty">{t("Buscando pessoas...")}</p> : userResults.length === 0 ? <p className="feed-search-empty">{t("Nenhuma pessoa encontrada.")}</p> : userResults.map((person) => {
        const relation = relationships[person.id];
        const relationLabel = t(followButtonKey(relation));
        return <div key={person.id} className="feed-search-person">
          <div className="feed-search-person-main">
            <Link to={profilePath(person)} className="feed-search-person-main">
              <Avatar user={person} />
              <span><strong>{person.nome}</strong><small>{person.username ? `@${person.username}` : t('noUsername')}</small></span>
            </Link>
          </div>
          {user && person.id !== user.id && <div className="feed-person-actions"><span className="social-relationship-badge">{relation?.mutual ? t('mutualFriends') : relation?.followedBy ? t('followsYou') : ''}</span><button type="button" onClick={() => changeFollow(person)} onMouseEnter={() => loadRelationship(person.id)} title={t(relation?.following ? 'unfollowButton' : relation?.pending ? 'cancelFollowRequest' : 'followButton')}>{relationLabel}</button><button type="button" aria-label={t('Enviar mensagem')} onClick={() => openConversation(person)}><MessageCircle size={16} /></button></div>}
        </div>;
      })}
      {peopleTotal > 12 && <nav className="flex items-center justify-between gap-3" aria-label={t("Páginas de pessoas")}><button type="button" disabled={loadingUsers || peoplePage === 1} onClick={() => setPeoplePage(current => current - 1)}>{t("Anterior")}</button><span>{t("Página")} {peoplePage} {t("de")} {Math.ceil(peopleTotal / 12)}</span><button type="button" disabled={loadingUsers || peoplePage * 12 >= peopleTotal} onClick={() => setPeoplePage(current => current + 1)}>{t("Próxima")}</button></nav>}
      <div className="feed-section-label"><MapPin size={15} /> {t("Ocorrências e locais")}</div>{filteredPosts.length === 0 ? <p className="feed-search-empty">{t("Nenhum resultado encontrado.")}</p> : filteredPosts.map(renderPost)}
    </div>
  </>;

  const renderNotifications = () => <>
    <FeedHeader title={t('notifications')} description={t('activityDescription')}><button type="button" onClick={markNotificationsRead} className="feed-secondary-button">{t('markAllRead')}</button></FeedHeader>
    <div className="mb-4 flex flex-wrap gap-2">{['all','unread','read'].map(value=><button type="button" className="profile-action" key={value} aria-pressed={notificationFilter===value} onClick={()=>{setNotificationFilter(value);setNotificationPage(1);}}>{t('activityFilter'+value)}</button>)}</div>
    {notificationError&&<p role="status" className="site-muted mb-4">{t('activityLoadError')}</p>}
    <div className="feed-notification-balloon"><div className="feed-notification-head"><span><Bell size={17}/>{t('notifications')}</span><strong>{notificationMeta.unread} {t('activityUnread')}</strong></div>
      {loadingNotifications&&notifications.length===0?<div className="feed-empty" role="status">{t('loading')}</div>:notifications.length===0?<p className="feed-empty">{t('noNotifications')}</p>:notifications.map(item=><button type="button" key={item.id} onClick={()=>openNotification(item)} className={'feed-notification w-full text-left '+(item.lida?'':'is-unread')}><span className="feed-notification-icon"><Bell size={15}/></span><span><strong>{translateSystemText(item.titulo)}</strong><p>{translateSystemText(item.mensagem)}</p><small>{item.dataCriacao?formatDistanceToNow(new Date(item.dataCriacao),{locale:({'pt-BR':ptBR,en:enUS,es})[getLanguage()],addSuffix:true}):t('now')}</small></span></button>)}
    </div>
    {notificationMeta.total>notificationMeta.limit&&<div className="mt-4 flex justify-between"><button type="button" disabled={notificationPage<=1||loadingNotifications} onClick={()=>setNotificationPage(value=>value-1)}>{t('previous')}</button><span>{notificationPage}</span><button type="button" disabled={notificationPage*notificationMeta.limit>=notificationMeta.total||loadingNotifications} onClick={()=>setNotificationPage(value=>value+1)}>{t('next')}</button></div>}
  </>;

  const renderSaved = () => <>
    <FeedHeader title={t("Publicações salvas")} description={t("Acesse rapidamente os relatos que você escolheu acompanhar.")} />
    {user && <React.Suspense fallback={<p>{t('loading')}</p>}><CollectionsPanel ownerId={user.id} savedPosts={savedPosts} renderPost={renderPost}/></React.Suspense>}
    {savedPosts.length ? <div className="space-y-5">{savedPosts.map(renderPost)}</div> : <div className="feed-empty"><Bookmark size={30} />{t("Nenhuma publicação salva.")}</div>}
  </>;

  const renderCreate = () => <>
    <FeedHeader title={t('createPostTitle')} description={t("Registre um problema urbano e coloque a sua comunidade em movimento.")} />
    <form onSubmit={handleCreate} className="feed-create-form">
      <div className="feed-create-intro"><span className="feed-avatar"><Plus size={18} /></span><div><strong>{t("Nova identificação urbana")}</strong><small>{t("Compartilhe o que precisa mudar perto de você.")}</small></div></div>
      <label>{t("Categoria")}<FloatingSelect value={createForm.categoryId} onChange={(value) => setCreateForm((current) => ({ ...current, categoryId: value }))} options={[{ value: '', label: categoryError ? t("Categorias indisponíveis") : t("Selecione uma categoria") }, ...categories.map((item) => ({ value: item.id, label: translateCategory(item.name) }))]} /></label>
      <label>{t("Título")}<input name="title" value={createForm.title} onChange={updateCreateForm} placeholder={t("Ex: Buraco na rua principal")} required /></label>
      <label>{t("Descrição")}<textarea name="description" value={createForm.description} onChange={updateCreateForm} placeholder={t("Descreva o que está acontecendo...")} rows="5" required /></label>
      <fieldset className="feed-fieldset">
        <legend>{t("Endereço")}</legend>
        <div className="feed-address-grid">
          <label className="feed-address-street">{t("Rua")}<input name="street" value={createForm.street} onChange={updateCreateForm} placeholder={t("Nome da rua")} /></label>
          <label>{t("Número")}<input name="number" value={createForm.number} onChange={updateCreateForm} placeholder={t("Nº")} /></label>
          <label>{t("Bairro")}<input name="neighborhood" value={createForm.neighborhood} onChange={updateCreateForm} placeholder={t("Bairro")} /></label>
          <label>{t("Complemento")}<input name="complemento" value={createForm.complemento} onChange={updateCreateForm} placeholder={t("Apto, referência...")} /></label>
              <label>{t("CEP")}<div className="relative"><input name="cep" value={createForm.cep} onChange={(event) => setCreateForm((current) => ({ ...current, cep: formatCep(event.target.value) }))} placeholder="00000-000" inputMode="numeric" />{loadingCep && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-violet-200">...</span>}</div></label>
              <label>{t("Cidade")}<FloatingSelect value={createForm.city} onChange={(value) => setCreateForm((current) => ({ ...current, city: value }))} options={[{ value: '', label: loadingCities ? t('loadingCities') : t('selectCity') }, ...cities]} /></label>
              <label>{t("Estado")}<FloatingSelect value={createForm.state} onChange={(value) => setCreateForm((current) => ({ ...current, state: value, city: '' }))} options={[{ value: '', label: t('selectState') }, ...brazilStates]} /></label>
        </div>
      </fieldset>
      <fieldset className="feed-fieldset">
        <legend>{t("Quando aconteceu?")}</legend>
        <div className="feed-datetime-grid">
          <label>{t("Data")}<FloatingDatePicker value={createForm.occurrenceDate} onChange={(value) => setCreateForm((current) => ({ ...current, occurrenceDate: value }))} /></label>
          <label>{t("Hora")}<FloatingTimePicker value={createForm.occurrenceTime} onChange={(value) => setCreateForm((current) => ({ ...current, occurrenceTime: value }))} /></label>
        </div>
      </fieldset>
      <UploadField accept={IMAGE_TYPES.join(',')} multiple files={createImages} maxFiles={MAX_IMAGE_COUNT} maxSizeMb={5} label={t("Adicionar fotos")} onChange={handleCreateImages} />
      {createImages.length > 0 && <div className="grid grid-cols-4 gap-2">{createImages.map((file, index) => <div key={`${file.name}-${index}`} className="relative"><img src={createPreviews[index]} alt="" className="h-20 w-full rounded object-cover" /><button type="button" onClick={() => setCreateImages((current) => current.filter((_, imageIndex) => imageIndex !== index))} className="absolute right-1 top-1">×</button></div>)}</div>}
      <button type="submit" disabled={creating} className="feed-create-submit"><Send size={16} /> {creating ? 'Publicando...' : t("Publicar identificação")}</button>
    </form>
  </>;

  const renderTab = { home: renderHome, conversations: renderConversations, search: renderSearch, notifications: renderNotifications, saved: renderSaved, create: renderCreate }[activeTab];

  return (
    <main className="feed-shell min-h-screen bg-[#090b0e] text-white">
      {deleteCandidate && <ConfirmDialog title={t('confirmDeletePublication')} description={deleteCandidate.title} busy={Boolean(deletingPost)} onClose={() => setDeleteCandidate(null)} onConfirm={() => performDeletePost(deleteCandidate)}/>}
      <AmbientContour variant="feed" />
      <div className="feed-layout site-menu-safe-layout mx-auto max-w-[1440px] px-4 py-6 lg:px-8">
        <aside className="feed-rail hidden lg:flex">
          <Link to="/" className="feed-brand" aria-label="Voz Urbana"><span className="feed-brand-mark">VU</span><span><strong>Voz</strong><em>URBANA</em></span></Link>
          <nav className="mt-14 space-y-2">{navItems.map((item) => { const Icon = item.icon; return <button type="button" key={item.key} onClick={() => selectTab(item.key)} className={`feed-nav-item ${activeTab === item.key ? 'is-active' : ''}`}><Icon className="feed-nav-icon" size={29} strokeWidth={1.8} /><span>{t(item.label)}</span></button>; })}</nav>
          <Link to={profilePath(user)} className="feed-profile mt-auto"><Avatar user={user} /><small>{displayName}</small><span className="feed-profile-edit">&#9998;</span></Link>
        </aside>
        <nav className="feed-mobile-nav lg:hidden" aria-label={t("Navegação do feed")}>{navItems.map((item) => { const Icon = item.icon; return <button type="button" key={item.key} onClick={() => selectTab(item.key)} className={activeTab === item.key ? 'is-active' : ''}><Icon size={18} /><span>{t(item.label)}</span></button>; })}</nav>
        <section className="feed-main">{renderTab()}</section>
        <aside className="feed-aside hidden xl:block"><div className="feed-aside-head"><span>{t("Para seguir")}</span><Users size={17} /></div><div className="feed-empty">{t("Pesquise pessoas para encontrar conexões reais.")}</div><div className="feed-aside-links">{t("Sobre · Ajuda · Imprensa · API · Carreiras")}<br />{t("Termos · Localizações · Idioma")}</div><div className="feed-aside-note"><Bell size={15} /> {t("Comunidade conectada")}</div></aside>
      </div>
      {editingPost && <div className="context-modal fixed inset-0 z-[1400] grid place-items-center bg-black/70 p-4" role="dialog" aria-modal="true" aria-label={t("Editar publicação")}>
        <form onSubmit={saveEdit} className="context-scroll site-panel max-h-[90vh] w-full max-w-2xl space-y-4 overflow-auto rounded-2xl p-6">
          <div className="flex items-center justify-between"><h2 className="text-xl font-bold">{t('editPostTitle')}</h2><button type="button" onClick={() => setEditingPost(null)} aria-label={t("Fechar")}>×</button></div>
          <input value={editingPost.title} onChange={(event) => setEditingPost((current) => ({ ...current, title: event.target.value }))} required className="site-form-input w-full rounded p-3" />
          <textarea value={editingPost.description} onChange={(event) => setEditingPost((current) => ({ ...current, description: event.target.value }))} required rows="5" className="site-form-input w-full rounded p-3" />
          <div className="grid gap-3 sm:grid-cols-2">
            <input value={editingPost.street || ''} onChange={(event) => setEditingPost((current) => ({ ...current, street: event.target.value }))} className="site-form-input w-full rounded p-3" placeholder={t("Rua ou logradouro")} />
            <input value={editingPost.number || ''} onChange={(event) => setEditingPost((current) => ({ ...current, number: event.target.value }))} className="site-form-input w-full rounded p-3" placeholder={t("Número")} />
            <input value={editingPost.neighborhood || ''} onChange={(event) => setEditingPost((current) => ({ ...current, neighborhood: event.target.value }))} className="site-form-input w-full rounded p-3" placeholder={t("Bairro")} />
            <input value={editingPost.complemento || ''} onChange={(event) => setEditingPost((current) => ({ ...current, complemento: event.target.value }))} className="site-form-input w-full rounded p-3" placeholder={t("Complemento")} />
            <input value={editingPost.cep || ''} onChange={(event) => setEditingPost((current) => ({ ...current, cep: event.target.value }))} className="site-form-input w-full rounded p-3" placeholder={t("CEP")} />
            <input value={editingPost.city || ''} onChange={(event) => setEditingPost((current) => ({ ...current, city: event.target.value }))} className="site-form-input w-full rounded p-3" placeholder={t("Cidade")} />
            <input value={editingPost.state || ''} onChange={(event) => setEditingPost((current) => ({ ...current, state: event.target.value }))} className="site-form-input w-full rounded p-3" placeholder={t("Estado")} />
          </div>
          <input value={editingPost.address || ''} onChange={(event) => setEditingPost((current) => ({ ...current, address: event.target.value }))} className="site-form-input w-full rounded p-3" placeholder={t("Endereço completo (opcional)")} />
          <FloatingSelect value={editingPost.categoryId} onChange={(value) => setEditingPost((current) => ({ ...current, categoryId: value }))} options={categories.map((item) => ({ value: item.id, label: translateCategory(item.name) }))} />
          <div className="grid grid-cols-4 gap-2">{(editingPost.images || []).filter((image) => !removedEditImages.includes(image.id)).map((image) => <div key={image.id} className="relative"><img src={mediaUrl(image.url)} alt="" className="h-20 w-full rounded object-cover" /><button type="button" onClick={() => setRemovedEditImages((current) => [...current, image.id])} className="absolute right-1 top-1">×</button></div>)}</div>
          <UploadField accept={IMAGE_TYPES.join(',')} multiple files={editImages} maxFiles={MAX_IMAGE_COUNT} maxSizeMb={5} label={t("Adicionar fotos")} onChange={(event) => { try { const selected = validateImages(event.target.files, (editingPost.images || []).length - removedEditImages.length + editImages.length); if (selected.length) { setCropTarget('edit'); setCropFile(selected[0]); setCropQueue(selected.slice(1)); } } catch (error) { toast.error(error.message); } }} />
          <div className="flex justify-end gap-3"><button type="button" onClick={() => setEditingPost(null)}>{t("Cancelar")}</button><button type="submit" disabled={savingEdit} className="feed-create-submit">{savingEdit ? t("Salvando...") : t("Salvar alterações")}</button></div>
        </form>
      </div>}
      {lightboxImage && <button type="button" className="context-modal fixed inset-0 z-[1500] grid place-items-center bg-black/90 p-6" onClick={() => setLightboxImage(null)} aria-label={t("Fechar imagem")}><img src={lightboxImage} alt="" className="max-h-full max-w-full object-contain" /></button>}
      {cropFile && <ImageCropper file={cropFile} onCancel={() => { setCropFile(null); setCropQueue([]); }} onConfirm={handleCroppedImage} />}
      {shareCandidate && <React.Suspense fallback={null}><SharePublicationDialog problemId={shareCandidate} onClose={()=>setShareCandidate(null)}/></React.Suspense>}
    </main>
  );
};

export default FeedPage;
