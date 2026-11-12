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

const actionAsset = (name) => `${import.meta.env.BASE_URL}feed-actions/${name}.png`;

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

const sharePost = async (post) => {
  const url = `${window.location.origin}${import.meta.env.BASE_URL}problem/${post.id}`;
  try {
    if (navigator.share) await navigator.share({ title: post.title, text: post.description, url });
    else await navigator.clipboard?.writeText(url);
    toast.success(navigator.share ? tr("Publicação compartilhada.") : tr("Link da publicação copiado."));
  } catch (error) {
    if (error.name !== 'AbortError') toast.error(tr("Não foi possível compartilhar a publicação."));
  } finally {
    setOpenMenu(null);
  }
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
    <img src={actionAsset(active ? (asset === 'curtir' ? 'curtido' : 'republicado') : asset)} alt="" className="h-8 w-8 object-contain transition group-hover/action:scale-110" />
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

const FeedPage = () => {

  const { t, language } = useI18n();
  const { user, openAuthModal } = useAuthStore();
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
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [userResults, setUserResults] = useState([]);
  const [peopleSearchError, setPeopleSearchError] = useState(false);
  const [peopleTotal, setPeopleTotal] = useState(0);
  const [peoplePage, setPeoplePage] = useState(1);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [friendships, setFriendships] = useState({});
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messageText, setMessageText] = useState('');
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [creating, setCreating] = useState(false);
  const [deletingPost, setDeletingPost] = useState(null);
  const [cities, setCities] = useState([]);
  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingCep, setLoadingCep] = useState(false);
  const [createImages, setCreateImages] = useState([]);
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

  const loadFeed = useCallback(async () => {
    try {
      setLoading(true);
      setFeedError(false);
      const [problemsResult, categoriesResult] = await Promise.allSettled([
        problemsAPI.list({ category: category || undefined, status: status || undefined, sort, page, limit: 9 }),
        categoriesAPI.list(),
      ]);
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
        toast.error(t("Não foi possível carregar as categorias."));
      } else {
        setCategories(categoriesResult.value.data);
        setCategoryError(false);
      }
    } catch (error) {
      setCategoryError(true);
      setFeedError(true);
      toast.error(t('apiUnavailable'));
    } finally {
      setLoading(false);
    }
  }, [category, page, sort, status, t]);

  useEffect(() => { loadFeed(); }, [loadFeed]);

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
    conversationsAPI.list()
      .then((response) => setConversations(response.data || []))
      .catch((error) => toast.error(error.response?.data?.error || t("Não foi possível carregar as conversas.")));
    return undefined;
  }, [activeTab, user]);

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
    if (activeTab !== 'notifications') return;
    const loadNotifications = async () => {
      try {
        setLoadingNotifications(true);
        const response = await notificationsAPI.list();
        setNotifications(response.data || []);
      } catch (error) {
        setNotifications([]);
      } finally {
        setLoadingNotifications(false);
      }
    };
    loadNotifications();
  }, [activeTab]);

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
    setLoadingUsers(true);
    setPeopleSearchError(false);
    setUserResults([]);
    setPeopleTotal(0);
    const loadUsers = async () => {
      try {
        setLoadingUsers(true);
        const response = await socialAPI.searchUsers({ q: normalizedSearch, page: peoplePage, limit: 12 });
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
    return () => { cancelled = true; window.clearTimeout(timer); };
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
    try {
      setVotingPost(post.id);
      const response = await votesAPI.vote(post.id, { type: 'up' });
      setPosts((current) => current.map((item) => item.id === post.id ? { ...item, votes: response.data.votes } : item));
      setLikedPosts((current) => {
        const next = new Set(current);
        if (next.has(post.id)) next.delete(post.id); else next.add(post.id);
        return next;
      });
    } catch (error) {
      toast.error(error.response?.data?.error || t('reportError'));
    } finally {
      setVotingPost(null);
    }
  };

  const changeSlide = (postId, amount, imageCount) => {
    setSlideByPost((current) => ({ ...current, [postId]: ((current[postId] || 0) + amount + imageCount) % imageCount }));
  };

  const toggleShare = async (post) => {
    setSharedPosts((current) => {
      const next = new Set(current);
      if (next.has(post.id)) next.delete(post.id); else next.add(post.id);
      return next;
    });
    try {
      await navigator.clipboard?.writeText(`${window.location.origin}${import.meta.env.BASE_URL}problem/${post.id}`);
      toast.success(t("Link da ocorrência copiado"));
    } catch (error) {
      toast.info(t("Ocorrência marcada para compartilhar"));
    }
  };

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

  const copyPostLink = async (post) => {
    await navigator.clipboard?.writeText(`${window.location.origin}${import.meta.env.BASE_URL}problem/${post.id}`);
    setOpenMenu(null);
    toast.success(t("Link da publicação copiado."));
  };

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

  const deletePost = async (post) => {
    if (!window.confirm(t('confirmDeletePublication'))) return;
    try {
      setDeletingPost(post.id);
      await problemsAPI.remove(post.id);
      setPosts((current) => current.filter((item) => item.id !== post.id));
      setTotal((current) => Math.max(0, current - 1));
      toast.success(t('publicationDeleted'));
    } catch (error) {
      toast.error(error.response?.data?.error || t('deletePublicationError'));
    } finally {
      setDeletingPost(null);
    }
  };

  const openConversation = async (friend) => {
    try {
      const response = await conversationsAPI.create(friend.id);
      setSelectedConversation(response.data);
      const messagesResponse = await conversationsAPI.messages(response.data.id);
      setMessages(messagesResponse.data || []);
      setConversations((current) => current.some((item) => item.id === response.data.id) ? current : [response.data, ...current]);
    } catch (error) {
      toast.error(error.response?.data?.error || t("A amizade precisa estar confirmada para conversar."));
    }
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    if (!messageText.trim() || !selectedConversation) return;
    try {
      const response = await conversationsAPI.send(selectedConversation.id, { texto: messageText.trim() });
      setMessages((current) => [...current, response.data]);
      setMessageText('');
    } catch (error) {
      toast.error(error.response?.data?.error || t("Não foi possível enviar a mensagem."));
    }
  };

  const markNotificationsRead = async () => {
    try { await notificationsAPI.markAllRead(); } catch (error) { /* The local state still reflects the action. */ }
    setNotifications((current) => current.map((item) => ({ ...item, lida: true })));
  };

  const loadFriendship = async (userId) => {
    if (!user) return;
    try {
      const response = await socialAPI.friendship(userId);
      setFriendships((current) => ({ ...current, [userId]: response.data }));
    } catch (error) {
      toast.error(t("Não foi possível consultar a amizade."));
    }
  };

  const changeFriendship = async (person) => {
    if (!user) {
      toast.info(t("Entre na sua conta para adicionar pessoas."));
      return;
    }
    const relation = friendships[person.id];
    try {
      if (!relation || relation.status === 'NONE') {
        const response = await socialAPI.requestFriendship(person.id);
        setFriendships((current) => ({ ...current, [person.id]: response.data }));
      } else {
        const action = relation.status === 'PENDENTE' && relation.destinatarioId === user.id ? 'accept'
          : relation.status === 'PENDENTE' ? 'cancel' : 'remove';
        const response = await socialAPI.updateFriendship(relation.id, action);
        setFriendships((current) => ({ ...current, [person.id]: response.data }));
      }
    } catch (error) {
      toast.error(error.response?.data?.error || t("Não foi possível atualizar a amizade."));
    }
  };

  const renderPost = (post) => {
    const images = post.images?.length ? post.images : [];
    const slide = slideByPost[post.id] || 0;
    const liked = likedPosts.has(post.id);
    const shared = sharedPosts.has(post.id);
    const authorName = post.author?.name || t("Usuário");
    const authorHandle = post.author?.username ? `@${post.author.username.replace(/^@/, '')}` : t("perfil sem @");
    return <article key={post.id} className="feed-post">
      <div className="feed-post-head">
        <Link to={profilePath(post.author)} className="feed-post-author"><Avatar user={post.author} className="feed-avatar" /></Link>
        <Link to={profilePath(post.author)} className="min-w-0 feed-post-author-copy"><strong>{authorHandle}</strong><span>{authorName} · {post.createdAt ? formatDistanceToNow(new Date(post.createdAt), { locale: ({ 'pt-BR': ptBR, en: enUS, es })[getLanguage()], addSuffix: true }) : t('now')}</span></Link>
        <div className="relative flex items-center gap-1">
          <button type="button" className="feed-more" aria-label={t("Mais opções")} onClick={() => setOpenMenu((current) => current === post.id ? null : post.id)}><Ellipsis size={18} /></button>
              {openMenu === post.id && <div className="feed-post-menu" role="menu">
            {(post.author?.id === user?.id || user?.role === 'admin') && <button type="button" onClick={() => { startEditing(post); setOpenMenu(null); }}><Ellipsis size={14} /> {t("Editar publicação")}</button>}
            {(post.author?.id === user?.id || user?.role === 'admin') && <button type="button" onClick={() => { setOpenMenu(null); deletePost(post); }}><Trash2 size={14} /> {t("Apagar publicação")}</button>}
            <button type="button" onClick={() => toggleSaved(post)}><Bookmark size={14} /> {savedPosts.some((item) => item.id === post.id) ? t("Remover dos salvos") : t("Salvar publicação")}</button>
            <button type="button" onClick={() => copyPostLink(post)}><Copy size={14} /> {t("Copiar link")}</button>
            <button type="button" onClick={() => sharePost(post)}><Share2 size={14} /> {t("Compartilhar publicação")}</button>
            <button type="button" onClick={() => { setOpenMenu(null); navigate(`/problem/${post.id}`); }}><Check size={14} /> {t("Ver detalhes")}</button>
            <button type="button" onClick={() => { setOpenMenu(null); toast.info(t("Obrigado. A denúncia será analisada.")); }}><Flag size={14} /> {t("Denunciar")}</button>
          </div>}
        </div>
      </div>
      <Link to={`/problem/${post.id}`} className="block">
        <div className="feed-post-copy"><span className="feed-category">{translateCategory(post.category?.name) || t('noCategory')}</span><h2>{post.title}{post.isEdited && <small className="ml-2 text-xs text-white/45">{t("(editado)")}</small>}</h2><p>{post.description}</p><span className="feed-location"><MapPin size={13} />{post.address || t('locationOnMap')}</span></div>
        <div className="feed-media" style={{ aspectRatio: images.length ? (images[slide].proporcao === '16:9' ? '16 / 9' : images[slide].proporcao === '9:16' ? '9 / 16' : images[slide].proporcao === '4:5' ? '4 / 5' : images[slide].proporcao === '5:4' ? '5 / 4' : '1 / 1') : '1.85 / 1' }}>
          {images.length > 0 ? <button type="button" className="block h-full w-full" style={{ aspectRatio: images[slide].proporcao === '16:9' ? '16 / 9' : images[slide].proporcao === '9:16' ? '9 / 16' : images[slide].proporcao === '4:5' ? '4 / 5' : images[slide].proporcao === '5:4' ? '5 / 4' : '1 / 1' }} onClick={(event) => { event.preventDefault(); setLightboxImage(mediaUrl(images[slide].url)); }}><img src={mediaUrl(images[slide].url)} alt={post.title} /></button> : <div className="feed-media-placeholder"><span>Voz Urbana</span><strong>{post.title}</strong><small>{statusLabels[post.status] || translateStatus(post.status)}</small></div>}
          {images.length > 1 && <><button type="button" onClick={(event) => { event.preventDefault(); changeSlide(post.id, -1, images.length); }} className="feed-slide feed-slide-left" aria-label={t("Imagem anterior")}><ChevronLeft size={20} /></button><button type="button" onClick={(event) => { event.preventDefault(); changeSlide(post.id, 1, images.length); }} className="feed-slide feed-slide-right" aria-label={t("Próxima imagem")}><ChevronRight size={20} /></button><div className="feed-dots">{images.map((image, index) => <span key={image.id || index} className={index === slide ? 'is-current' : ''} />)}</div></>}
        </div>
      </Link>
      <div className="feed-post-actions">
        <FeedAction active={liked} asset="curtir" label={t("Curtir ocorrência")} count={`${post.votes || 0} ${t('apoios')}`} onClick={() => handleVote(post)} disabled={votingPost === post.id} />
        <FeedAction asset="comentar" label={t("Comentar ocorrência")} count={t("Comentar")} onClick={() => navigate(`/problem/${post.id}#comments`)} />
        <FeedAction active={shared} asset="republicar" label={t("Republicar ocorrência")} count={t("Republicar")} onClick={() => toggleShare(post)} />
        <button type="button" className="feed-action-icon" aria-label={t("Enviar mensagem")}><img src={actionAsset('mensagem')} alt="" /></button>
        <Link to={`/problem/${post.id}`} className="ml-auto feed-bookmark" aria-label={t("Abrir ocorrência")}><MessageCircle size={17} /></Link>
      </div>
    </article>;
  };

  const renderHome = () => <>
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
    {loading ? <div className="feed-empty">{t('loadingPosts')}</div> : feedError && filteredPosts.length === 0 ? null : filteredPosts.length === 0 ? <div className="feed-empty"><ImageIcon size={30} />{t('noPosts')}</div> : <div className="space-y-5">{filteredPosts.map(renderPost)}</div>}
    <footer className="feed-pagination"><span>{total} {t("publicações")}</span><div><button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft size={16} /></button><span>{page}</span><button type="button" disabled={page * 9 >= total} onClick={() => setPage((value) => value + 1)}><ChevronRight size={16} /></button></div></footer>
  </>;

  const renderConversations = () => <>
    <FeedHeader title={t('conversationsTitle')} description={t("Troque mensagens com pessoas que também cuidam da cidade.")} />
    <div className="feed-dm-shell">
      <div className="feed-dm-list">
        <div className="feed-dm-list-head"><strong>{t("Mensagens")}</strong><button type="button" aria-label={t("Nova conversa")}><Plus size={17} /></button></div>
        {conversations.length === 0 ? <div className="feed-empty">{t("Adicione e confirme uma amizade para iniciar conversas.")}</div> : conversations.map((conversation) => <button key={conversation.id} type="button" className={`feed-dm-contact ${selectedConversation?.id === conversation.id ? 'is-selected' : ''}`} onClick={async () => { setSelectedConversation(conversation); const response = await conversationsAPI.messages(conversation.id); setMessages(response.data || []); }}><Avatar user={conversation.amigo} /><span><strong>{conversation.amigo?.nome}</strong><small>{conversation.ultimaMensagem?.texto || t("Nenhuma mensagem ainda")}</small></span></button>)}
      </div>
      <div className="feed-dm-thread"><div className="feed-dm-thread-head"><Avatar user={selectedConversation?.amigo} /><div><strong>{selectedConversation?.amigo?.nome || t("Nenhuma conversa selecionada")}</strong><small>{selectedConversation ? t("Amizade confirmada") : t("Confirme uma amizade para conversar.")}</small></div></div><div className="feed-dm-messages">{messages.length ? messages.map((message) => <div key={message.id} className={`feed-message ${message.remetenteId === user?.id ? 'is-own' : ''}`}><span>{message.texto}</span><small>{new Date(message.criadaEm).toLocaleTimeString(getLanguage(), { hour: '2-digit', minute: '2-digit' })}</small></div>) : <div className="feed-empty">{t("Nenhuma mensagem.")}</div>}</div><form onSubmit={sendMessage} className="feed-dm-compose"><input value={messageText} onChange={(event) => setMessageText(event.target.value)} placeholder={selectedConversation ? t("Escreva uma mensagem...") : t("Mensagens disponíveis para amigos confirmados.")} disabled={!selectedConversation} /><button type="submit" aria-label={t("Enviar mensagem")} disabled={!selectedConversation}><Send size={17} /></button></form></div>
    </div>
  </>;

  const renderSearch = () => <>
    <FeedHeader title={t('searchTitle')} description={t("Encontre locais, pessoas, ambientes e problemas publicados na cidade.")} />
    <div className="feed-discovery-search"><Search size={20} /><input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t("Busque por rua, usuário, categoria ou problema...")} /></div>
    <div className="feed-search-section">
      <div className="feed-section-label"><Users size={15} /> {t("Pessoas")}</div>
      {search.trim().replace(/^@+/, '').length < 2 ? <p className="feed-search-empty">{t("Digite pelo menos 2 caracteres para buscar pessoas.")}</p> : peopleSearchError ? <p className="feed-search-empty" role="alert">{t("Não foi possível consultar as pessoas. Verifique sua conexão e tente novamente.")}</p> : loadingUsers ? <p className="feed-search-empty">{t("Buscando pessoas...")}</p> : userResults.length === 0 ? <p className="feed-search-empty">{t("Nenhuma pessoa encontrada.")}</p> : userResults.map((person) => {
        const relation = friendships[person.id];
        const relationLabel = relation?.status === 'ACEITA' ? t("Amigos") : relation?.status === 'PENDENTE' && relation.destinatarioId === user?.id ? t("Aceitar") : relation?.status === 'PENDENTE' ? t("Solicitação enviada") : t("Adicionar");
        return <div key={person.id} className="feed-search-person">
          <div className="feed-search-person-main">
            <Link to={profilePath(person)} className="feed-search-person-main">
              <Avatar user={person} />
              <span><strong>{person.nome}</strong><small>{person.username ? `@${person.username}` : t('noUsername')}</small></span>
            </Link>
          </div>
          {user && person.id !== user.id && <button type="button" onClick={() => changeFriendship(person)} onMouseEnter={() => loadFriendship(person.id)}>{relationLabel}</button>}
        </div>;
      })}
      {peopleTotal > 12 && <nav className="flex items-center justify-between gap-3" aria-label={t("Páginas de pessoas")}><button type="button" disabled={loadingUsers || peoplePage === 1} onClick={() => setPeoplePage(current => current - 1)}>{t("Anterior")}</button><span>{t("Página")} {peoplePage} {t("de")} {Math.ceil(peopleTotal / 12)}</span><button type="button" disabled={loadingUsers || peoplePage * 12 >= peopleTotal} onClick={() => setPeoplePage(current => current + 1)}>{t("Próxima")}</button></nav>}
      <div className="feed-section-label"><MapPin size={15} /> {t("Ocorrências e locais")}</div>{filteredPosts.length === 0 ? <p className="feed-search-empty">{t("Nenhum resultado encontrado.")}</p> : filteredPosts.map(renderPost)}
    </div>
  </>;

  const renderNotifications = () => <>
    <FeedHeader title={t('notifications')} description={t("Acompanhe respostas, apoios e novidades sobre os seus relatos.")}><button type="button" onClick={markNotificationsRead} className="feed-secondary-button">{t("Marcar tudo como lido")}</button></FeedHeader>
    <div className="feed-notification-balloon">
      <div className="feed-notification-head"><span><Bell size={17} /> {t("Sua atividade")}</span><strong>{notifications.filter((item) => !item.lida).length} {t("novas")}</strong></div>
      {loadingNotifications ? <div className="feed-empty">{t("Carregando notificações...")}</div> : notifications.length === 0 ? <div className="feed-notification-empty"><Bell size={30} /><strong>{t("Nenhuma notificação por enquanto")}</strong><span>{t("Quando a comunidade interagir com seus relatos, elas aparecerão aqui.")}</span></div> : notifications.map((item) => <div key={item.id} className={`feed-notification ${item.lida ? '' : 'is-unread'}`}><span className="feed-notification-icon"><Bell size={15} /></span><div><strong>{translateSystemText(item.titulo)}</strong><p>{translateSystemText(item.mensagem)}</p><small>{item.dataCriacao ? formatDistanceToNow(new Date(item.dataCriacao), { locale: ({ 'pt-BR': ptBR, en: enUS, es })[getLanguage()], addSuffix: true }) : t("agora")}</small></div></div>)}
    </div>
  </>;

  const renderSaved = () => <>
    <FeedHeader title={t("Publicações salvas")} description={t("Acesse rapidamente os relatos que você escolheu acompanhar.")} />
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
      {createImages.length > 0 && <div className="grid grid-cols-4 gap-2">{createImages.map((file, index) => <div key={`${file.name}-${index}`} className="relative"><img src={URL.createObjectURL(file)} alt="" className="h-20 w-full rounded object-cover" /><button type="button" onClick={() => setCreateImages((current) => current.filter((_, imageIndex) => imageIndex !== index))} className="absolute right-1 top-1">×</button></div>)}</div>}
      <button type="submit" disabled={creating} className="feed-create-submit"><Send size={16} /> {creating ? 'Publicando...' : t("Publicar identificação")}</button>
    </form>
  </>;

  const renderTab = { home: renderHome, conversations: renderConversations, search: renderSearch, notifications: renderNotifications, saved: renderSaved, create: renderCreate }[activeTab];

  return (
    <main className="feed-shell min-h-screen bg-[#090b0e] text-white">
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
    </main>
  );
};

export default FeedPage;
