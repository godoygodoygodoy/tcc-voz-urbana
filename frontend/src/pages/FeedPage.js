import React, { useCallback, useEffect, useState } from 'react';
import { CalendarDays, Heart, Image as ImageIcon, MapPin, MessageCircle, RefreshCw, Search } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { toast } from 'react-toastify';
import { categoriesAPI, mediaUrl, problemsAPI } from '../services/api';
import { getPurpleTone, getStatusTone } from '../utils/theme';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n';

const FeedPage = () => {
  const { t, language } = useI18n();
  const [posts, setPosts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('recent');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

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

  const statusLabels = {
    ABERTO: t('openStatus'),
    EM_ANDAMENTO: t('progressStatus'),
    RESOLVIDO: t('resolvedStatus'),
    REJEITADO: t('rejectedStatus') || t('resolvedStatus'),
    open: t('openStatus'),
    in_progress: t('progressStatus'),
    resolved: t('resolvedStatus'),
  };

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  const filteredPosts = posts.filter((post) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return [post.title, post.description, post.address, post.category?.name].some((value) => String(value || '').toLowerCase().includes(query));
  });

  return (
    <main className="min-h-screen bg-[#1b1d1f] px-4 py-10 text-white sm:px-6 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.3em] text-violet-300">{t('navFeed')}</p>
            <h1 className="mt-2 text-4xl font-black sm:text-5xl">{t('recentIdentifications')}</h1>
            <p className="mt-3 max-w-2xl text-white/60">{t('heroCopy')}</p>
          </div>
          <Link to="/report" className="rounded-full bg-white px-5 py-3 text-center text-sm font-black text-zinc-950 transition hover:bg-violet-100">{t('reportProblem')}</Link>
        </header>

        <section className="mb-8 grid gap-3 rounded-3xl border border-white/10 bg-white/6 p-4 backdrop-blur-xl sm:grid-cols-2 lg:grid-cols-5">
          <label className="relative lg:col-span-2">
            <Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-white/40" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={`${t('navFeed')}...`} className="w-full rounded-xl border border-white/10 bg-black/20 py-3 pl-10 pr-3 text-white outline-none placeholder:text-white/35 focus:border-violet-300" />
          </label>
          <select value={status} onChange={(event) => { setStatus(event.target.value); setPage(1); }} className="rounded-xl border border-white/10 bg-[#202326] p-3 text-white outline-none">
            <option value="">{t('allStatuses')}</option>
            <option value="ABERTO">{t('openStatus')}</option>
            <option value="EM_ANDAMENTO">{t('progressStatus')}</option>
            <option value="RESOLVIDO">{t('resolvedStatus')}</option>
          </select>
          <select value={category} onChange={(event) => { setCategory(event.target.value); setPage(1); }} className="rounded-xl border border-white/10 bg-[#202326] p-3 text-white outline-none">
            <option value="">{t('allCategories')}</option>
            {categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <select value={sort} onChange={(event) => { setSort(event.target.value); setPage(1); }} className="rounded-xl border border-white/10 bg-[#202326] p-3 text-white outline-none">
            <option value="recent">{t('recentCases')}</option>
            <option value="votes">{t('collectiveSupport')}</option>
          </select>
        </section>

        {loading ? <div className="py-20 text-center text-white/60">{t('loadingPosts')}</div> : filteredPosts.length === 0 ? <div className="rounded-3xl border border-white/10 bg-white/6 py-20 text-center text-white/60">{t('noPosts')}</div> : <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredPosts.map((post) => {
            const color = getPurpleTone(post.category?.name || post.category?.id || post.id);
            return <article key={post.id} className="overflow-hidden rounded-3xl border border-white/10 bg-[#202326] shadow-[0_20px_60px_rgba(0,0,0,0.22)] transition duration-300 hover:-translate-y-1 hover:border-violet-300/35">
              {post.images?.[0]?.url ? <Link to={`/problem/${post.id}`} className="block h-56 overflow-hidden"><img src={mediaUrl(post.images[0].url)} alt={post.title} className="h-full w-full object-cover transition duration-500 hover:scale-105" /></Link> : <div className="flex h-56 items-center justify-center bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.35),transparent_60%)]"><ImageIcon className="h-12 w-12 text-white/25" /></div>}
              <div className="p-5">
                <div className="flex items-center justify-between gap-3"><span className="rounded-full px-3 py-1 text-xs font-bold text-white" style={{ backgroundColor: color }}>{post.category?.name || t('noCategory')}</span><span className={`rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${getStatusTone(post.status)}`}>{statusLabels[post.status] || post.status}</span></div>
                <Link to={`/problem/${post.id}`} className="mt-4 block"><h2 className="text-xl font-black hover:text-violet-200">{post.title}</h2><p className="mt-2 line-clamp-3 text-sm leading-6 text-white/65">{post.description}</p></Link>
                <div className="mt-4 flex items-start gap-2 text-xs text-white/50"><MapPin className="h-4 w-4 shrink-0" /><span>{post.address || t('locationOnMap')}</span></div>
                <div className="mt-5 flex items-center justify-between border-t border-white/10 pt-4 text-xs text-white/50"><span className="flex items-center gap-3"><span className="flex items-center gap-1"><Heart className="h-4 w-4" />{post.votes || 0}</span><span className="flex items-center gap-1"><MessageCircle className="h-4 w-4" />{t('comment')}</span></span><span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" />{post.createdAt ? formatDistanceToNow(new Date(post.createdAt), { locale: language === 'pt-BR' ? ptBR : undefined, addSuffix: true }) : t('now')}</span></div>
              </div>
            </article>;
          })}
        </div>}

        <footer className="mt-8 flex items-center justify-between text-sm text-white/55"><span>{total} {t('publications')}</span><div className="flex items-center gap-2"><button type="button" disabled={page <= 1} onClick={() => setPage((value) => value - 1)} className="rounded-lg border border-white/15 px-3 py-2 disabled:opacity-30">{t('previous')}</button><span>{t('page')} {page}</span><button type="button" disabled={page * 9 >= total} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-white/15 px-3 py-2 disabled:opacity-30">{t('next')}</button><button type="button" onClick={loadFeed} className="rounded-lg border border-white/15 p-2" aria-label={t('refreshFeed')}><RefreshCw className="h-4 w-4" /></button></div></footer>
      </div>
    </main>
  );
};

export default FeedPage;
