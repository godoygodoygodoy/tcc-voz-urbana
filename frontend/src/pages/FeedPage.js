import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Bell,
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
  Users,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { categoriesAPI, mediaUrl, notificationsAPI, problemsAPI, votesAPI } from '../services/api';
import { useAuthStore } from '../store';
import { useI18n } from '../i18n';
import AmbientContour from '../components/AmbientContour';

const actionAsset = (name) => `${import.meta.env.BASE_URL}feed-actions/${name}.png`;

const navItems = [
  { key: 'home', label: 'Página Inicial', icon: Mailbox },
  { key: 'conversations', label: 'Conversas', icon: Mail },
  { key: 'search', label: 'Pesquisar', icon: Search },
  { key: 'notifications', label: 'Notificações', icon: Bell },
  { key: 'create', label: 'Criar', icon: Plus },
];

const emptyCreateForm = { title: '', description: '', address: '', latitude: '', longitude: '', categoryId: '' };

const FeedAction = ({ active, asset, label, count, onClick, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-label={label}
    className={`group/action inline-flex min-w-[76px] items-center gap-2 rounded-xl px-2 py-1.5 text-xs font-bold transition hover:bg-white/8 disabled:cursor-wait disabled:opacity-60 ${active ? 'text-fuchsia-300' : 'text-white/60'}`}
  >
    <img src={actionAsset(active ? (asset === 'curtir' ? 'curtido' : 'republicado') : asset)} alt="" className="h-8 w-8 object-contain transition group-hover/action:scale-110" />
    <span>{count ?? label}</span>
  </button>
);

const FeedHeader = ({ title, description, children }) => (
  <div className="feed-view-head">
    <div>
      <p className="feed-kicker">Voz Urbana</p>
      <h1 className="feed-title">{title}</h1>
      <p className="feed-subtitle">{description}</p>
    </div>
    <div className="feed-view-actions">{children}</div>
  </div>
);

const FeedPage = () => {
  const { t, language } = useI18n();
  const { user } = useAuthStore();
  const location = useLocation();
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('recent');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [likedPosts, setLikedPosts] = useState(() => new Set());
  const [sharedPosts, setSharedPosts] = useState(() => new Set());
  const [slideByPost, setSlideByPost] = useState({});
  const [votingPost, setVotingPost] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);
  const [messages, setMessages] = useState([{ from: 'Coletivo Centro', text: 'Você viu o novo ponto de iluminação na praça?', time: '09:42' }]);
  const [selectedConversation, setSelectedConversation] = useState(0);
  const [messageText, setMessageText] = useState('');
  const [createForm, setCreateForm] = useState(emptyCreateForm);
  const [creating, setCreating] = useState(false);

  const activeTab = navItems.some((item) => item.key === location.hash.slice(1)) ? location.hash.slice(1) : 'home';

  const loadFeed = useCallback(async () => {
    try {
      setLoading(true);
      const [problemsResponse, categoriesResponse] = await Promise.all([
        problemsAPI.list({ category: category || undefined, status: status || undefined, sort, page, limit: 9 }),
        categoriesAPI.list(),
      ]);
      setPosts(problemsResponse.data?.data || []);
      setTotal(problemsResponse.data?.total || 0);
      setCategories(categoriesResponse.data || []);
    } catch (error) {
      toast.error(t('noPosts'));
    } finally {
      setLoading(false);
    }
  }, [category, page, sort, status, t]);

  useEffect(() => { loadFeed(); }, [loadFeed]);

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

  const displayName = user?.username ? `@${user.username.replace(/^@/, '')}` : user?.name || user?.nome || '@usuario_de_exemplo';
  const displayAvatar = mediaUrl(user?.avatar || user?.fotoPerfil);

  const selectTab = (key) => {
    navigate(`/feed#${key}`);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleVote = async (post) => {
    if (!user) {
      toast.info(t('loginToVote'));
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
      toast.success('Link da ocorrência copiado');
    } catch (error) {
      toast.info('Ocorrência marcada para compartilhar');
    }
  };

  const updateCreateForm = (event) => setCreateForm((current) => ({ ...current, [event.target.name]: event.target.value }));

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!user) {
      toast.info('Entre na sua conta para criar uma postagem.');
      return;
    }
    if (!createForm.title || !createForm.description || !createForm.categoryId || !createForm.latitude || !createForm.longitude) {
      toast.error('Preencha título, descrição, categoria e localização.');
      return;
    }
    try {
      setCreating(true);
      const payload = new FormData();
      Object.entries(createForm).forEach(([key, value]) => payload.append(key, key === 'latitude' || key === 'longitude' ? Number(value) : value));
      await problemsAPI.create(payload);
      toast.success('Postagem criada com sucesso!');
      setCreateForm(emptyCreateForm);
      selectTab('home');
      loadFeed();
    } catch (error) {
      toast.error(error.response?.data?.error || t('reportError'));
    } finally {
      setCreating(false);
    }
  };

  const sendMessage = (event) => {
    event.preventDefault();
    if (!messageText.trim()) return;
    setMessages((current) => [...current, { from: 'Você', text: messageText.trim(), time: 'agora' }]);
    setMessageText('');
  };

  const markNotificationsRead = async () => {
    try { await notificationsAPI.markAllRead(); } catch (error) { /* The local state still reflects the action. */ }
    setNotifications((current) => current.map((item) => ({ ...item, lida: true })));
  };

  const renderPost = (post) => {
    const images = post.images?.length ? post.images : [];
    const slide = slideByPost[post.id] || 0;
    const liked = likedPosts.has(post.id);
    const shared = sharedPosts.has(post.id);
    const authorName = post.author?.name || 'Usuário de exemplo';
    return <article key={post.id} className="feed-post">
      <div className="feed-post-head">
        <div className="feed-avatar">{authorName.charAt(0).toUpperCase()}</div>
        <div className="min-w-0"><strong>{post.author?.username ? `@${post.author.username}` : `@${authorName.toLowerCase().replace(/\s+/g, '_')}`}</strong><span>{post.createdAt ? formatDistanceToNow(new Date(post.createdAt), { locale: language === 'pt-BR' ? ptBR : undefined, addSuffix: true }) : 'agora'}</span></div>
        <button type="button" className="feed-more" aria-label="Mais opções"><Ellipsis size={18} /></button>
      </div>
      <Link to={`/problem/${post.id}`} className="block">
        <div className="feed-post-copy"><span className="feed-category">{post.category?.name || t('noCategory')}</span><h2>{post.title}</h2><p>{post.description}</p><span className="feed-location"><MapPin size={13} />{post.address || t('locationOnMap')}</span></div>
        <div className="feed-media">
          {images.length > 0 ? <img src={mediaUrl(images[slide].url)} alt={post.title} /> : <div className="feed-media-placeholder"><span>Voz Urbana</span><strong>{post.title}</strong><small>{statusLabels[post.status] || post.status}</small></div>}
          {images.length > 1 && <><button type="button" onClick={(event) => { event.preventDefault(); changeSlide(post.id, -1, images.length); }} className="feed-slide feed-slide-left" aria-label="Imagem anterior"><ChevronLeft size={20} /></button><button type="button" onClick={(event) => { event.preventDefault(); changeSlide(post.id, 1, images.length); }} className="feed-slide feed-slide-right" aria-label="Próxima imagem"><ChevronRight size={20} /></button><div className="feed-dots">{images.map((image, index) => <span key={image.id || index} className={index === slide ? 'is-current' : ''} />)}</div></>}
        </div>
      </Link>
      <div className="feed-post-actions">
        <FeedAction active={liked} asset="curtir" label="Curtir ocorrência" count={`${post.votes || 0} apoios`} onClick={() => handleVote(post)} disabled={votingPost === post.id} />
        <FeedAction asset="comentar" label="Comentar ocorrência" count="Comentar" onClick={() => navigate(`/problem/${post.id}#comments`)} />
        <FeedAction active={shared} asset="republicar" label="Republicar ocorrência" count="Republicar" onClick={() => toggleShare(post)} />
        <button type="button" className="feed-action-icon" aria-label="Enviar mensagem"><img src={actionAsset('mensagem')} alt="" /></button>
        <Link to={`/problem/${post.id}`} className="ml-auto feed-bookmark" aria-label="Abrir ocorrência"><MessageCircle size={17} /></Link>
      </div>
    </article>;
  };

  const renderHome = () => <>
    <FeedHeader title="Identificações recentes" description="Relatos urbanos, apoio comunitário e acompanhamento real.">
      <button type="button" onClick={() => selectTab('create')} className="feed-report-button"><Plus size={15} /> <span>{t('reportProblem')}</span></button>
    </FeedHeader>
    <section id="search" className="feed-filters">
      <label className="feed-search"><Search size={16} /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar no feed..." /></label>
      <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }}><option value="">Todos os status</option><option value="ABERTO">{t('openStatus')}</option><option value="EM_ANDAMENTO">{t('progressStatus')}</option><option value="RESOLVIDO">{t('resolvedStatus')}</option></select>
      <select value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }}><option value="">Todas as categorias</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
      <select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }}><option value="recent">Ocorrências recentes</option><option value="votes">Mais apoiadas</option></select>
    </section>
    {loading ? <div className="feed-empty">{t('loadingPosts')}</div> : filteredPosts.length === 0 ? <div className="feed-empty"><ImageIcon size={30} />{t('noPosts')}</div> : <div className="space-y-5">{filteredPosts.map(renderPost)}</div>}
    <footer className="feed-pagination"><span>{total} publicações</span><div><button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft size={16} /></button><span>{page}</span><button type="button" disabled={page * 9 >= total} onClick={() => setPage((value) => value + 1)}><ChevronRight size={16} /></button></div></footer>
  </>;

  const renderConversations = () => <>
    <FeedHeader title="Conversas" description="Troque mensagens com pessoas que também cuidam da cidade." />
    <div className="feed-dm-shell">
      <div className="feed-dm-list">
        <div className="feed-dm-list-head"><strong>Mensagens</strong><button type="button" aria-label="Nova conversa"><Plus size={17} /></button></div>
        {['Coletivo Centro', 'Ana da Vila', 'Mutirão da Praça'].map((name, index) => <button type="button" key={name} onClick={() => setSelectedConversation(index)} className={`feed-dm-contact ${selectedConversation === index ? 'is-selected' : ''}`}><span className="feed-avatar feed-avatar-small">{name.charAt(0)}</span><span><strong>{name}</strong><small>{index === 0 ? 'Você viu o novo ponto...' : 'Nova conversa da comunidade'}</small></span></button>)}
      </div>
      <div className="feed-dm-thread"><div className="feed-dm-thread-head"><span className="feed-avatar">{['C', 'A', 'M'][selectedConversation]}</span><div><strong>{['Coletivo Centro', 'Ana da Vila', 'Mutirão da Praça'][selectedConversation]}</strong><small>Conversa comunitária</small></div></div><div className="feed-dm-messages">{messages.map((message, index) => <div key={`${message.time}-${index}`} className={`feed-message ${message.from === 'Você' ? 'is-own' : ''}`}><span>{message.text}</span><small>{message.time}</small></div>)}</div><form onSubmit={sendMessage} className="feed-dm-compose"><input value={messageText} onChange={(event) => setMessageText(event.target.value)} placeholder="Escreva uma mensagem..." /><button type="submit" aria-label="Enviar mensagem"><Send size={17} /></button></form></div>
    </div>
  </>;

  const renderSearch = () => <>
    <FeedHeader title="Pesquisar" description="Encontre locais, pessoas, ambientes e problemas publicados na cidade." />
    <div className="feed-discovery-search"><Search size={20} /><input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Busque por rua, usuário, categoria ou problema..." /></div>
    <div className="feed-search-section"><div className="feed-section-label"><MapPin size={15} /> Ocorrências e locais</div>{filteredPosts.length === 0 ? <p className="feed-search-empty">Nenhum resultado encontrado.</p> : filteredPosts.map(renderPost)}</div>
  </>;

  const renderNotifications = () => <>
    <FeedHeader title="Notificações" description="Acompanhe respostas, apoios e novidades sobre os seus relatos."><button type="button" onClick={markNotificationsRead} className="feed-secondary-button">Marcar tudo como lido</button></FeedHeader>
    <div className="feed-notification-balloon">
      <div className="feed-notification-head"><span><Bell size={17} /> Sua atividade</span><strong>{notifications.filter((item) => !item.lida).length} novas</strong></div>
      {loadingNotifications ? <div className="feed-empty">Carregando notificações...</div> : notifications.length === 0 ? <div className="feed-notification-empty"><Bell size={30} /><strong>Nenhuma notificação por enquanto</strong><span>Quando a comunidade interagir com seus relatos, elas aparecerão aqui.</span></div> : notifications.map((item) => <div key={item.id} className={`feed-notification ${item.lida ? '' : 'is-unread'}`}><span className="feed-notification-icon"><Bell size={15} /></span><div><strong>{item.titulo}</strong><p>{item.mensagem}</p><small>{item.dataCriacao ? formatDistanceToNow(new Date(item.dataCriacao), { locale: ptBR, addSuffix: true }) : 'agora'}</small></div></div>)}
    </div>
  </>;

  const renderCreate = () => <>
    <FeedHeader title="Criar postagem" description="Registre um problema urbano e coloque a sua comunidade em movimento." />
    <form onSubmit={handleCreate} className="feed-create-form">
      <div className="feed-create-intro"><span className="feed-avatar"><Plus size={18} /></span><div><strong>Nova identificação urbana</strong><small>Compartilhe o que precisa mudar perto de você.</small></div></div>
      <label>Categoria<select name="categoryId" value={createForm.categoryId} onChange={updateCreateForm} required><option value="">Selecione uma categoria</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
      <label>Título<input name="title" value={createForm.title} onChange={updateCreateForm} placeholder="Ex: Buraco na rua principal" required /></label>
      <label>Descrição<textarea name="description" value={createForm.description} onChange={updateCreateForm} placeholder="Descreva o que está acontecendo..." rows="5" required /></label>
      <label>Endereço<input name="address" value={createForm.address} onChange={updateCreateForm} placeholder="Rua, número, bairro" /></label>
      <div className="feed-create-grid"><label>Latitude<input name="latitude" type="number" step="0.000001" value={createForm.latitude} onChange={updateCreateForm} placeholder="-15.7942" required /></label><label>Longitude<input name="longitude" type="number" step="0.000001" value={createForm.longitude} onChange={updateCreateForm} placeholder="-47.8822" required /></label></div>
      <button type="submit" disabled={creating} className="feed-create-submit"><Send size={16} /> {creating ? 'Publicando...' : 'Publicar identificação'}</button>
    </form>
  </>;

  const renderTab = { home: renderHome, conversations: renderConversations, search: renderSearch, notifications: renderNotifications, create: renderCreate }[activeTab];

  return (
    <main className="feed-shell min-h-screen bg-[#090b0e] text-white">
      <AmbientContour variant="feed" />
      <div className="feed-layout mx-auto max-w-[1440px] px-4 py-6 lg:px-8">
        <aside className="feed-rail hidden lg:flex">
          <Link to="/" className="feed-brand" aria-label="Voz Urbana"><span className="feed-brand-mark">VU</span><span><strong>Voz</strong><em>URBANA</em></span></Link>
          <nav className="mt-14 space-y-2">{navItems.map((item) => { const Icon = item.icon; return <button type="button" key={item.key} onClick={() => selectTab(item.key)} className={`feed-nav-item ${activeTab === item.key ? 'is-active' : ''}`}><Icon className="feed-nav-icon" size={29} strokeWidth={1.8} /><span>{item.label}</span></button>; })}</nav>
          <Link to="/profile" className="feed-profile mt-auto">{displayAvatar ? <img src={displayAvatar} alt="" /> : <span>{displayName.slice(1, 2).toUpperCase()}</span>}<small>{displayName}</small><span className="feed-profile-edit">&#9998;</span></Link>
        </aside>
        <nav className="feed-mobile-nav lg:hidden" aria-label="Navegação do feed">{navItems.map((item) => { const Icon = item.icon; return <button type="button" key={item.key} onClick={() => selectTab(item.key)} className={activeTab === item.key ? 'is-active' : ''}><Icon size={18} /><span>{item.label}</span></button>; })}</nav>
        <section className="feed-main">{renderTab()}</section>
        <aside className="feed-aside hidden xl:block"><div className="feed-aside-head"><span>Para seguir</span><Users size={17} /></div>{Array.from({ length: 5 }).map((_, index) => <div className="feed-suggestion" key={index}><span className="feed-avatar feed-avatar-small">{String.fromCharCode(65 + index)}</span><span><strong>@usuario_de_exemplo</strong><small>Identificação urbana</small></span><button type="button">Seguir</button></div>)}<div className="feed-aside-links">Sobre · Ajuda · Imprensa · API · Carreiras<br />Termos · Localizações · Idioma</div><div className="feed-aside-note"><Bell size={15} /> Comunidade conectada</div></aside>
      </div>
    </main>
  );
};

export default FeedPage;
