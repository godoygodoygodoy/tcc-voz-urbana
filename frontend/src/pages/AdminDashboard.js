import React, { useEffect, useState } from 'react';
import { AlertCircle, BarChart3, FileText, Search, ShieldCheck, Trash2, Users } from 'lucide-react';
import { toast } from 'react-toastify';
import { adminAPI, mediaUrl } from '../services/api';
import { useI18n } from '../i18n';

const AdminDashboard = () => {
  const { t } = useI18n();
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [problems, setProblems] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const loadOverview = async () => {
    const response = await adminAPI.getStats();
    setStats(response.data);
  };

  const loadCollection = async (targetTab, search = '') => {
    if (targetTab === 'users') setUsers((await adminAPI.listUsers({ q: search })).data);
    if (targetTab === 'problems') setProblems((await adminAPI.listProblems({ q: search })).data);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([loadOverview(), loadCollection(tab, query)])
      .catch((error) => { if (!cancelled) toast.error(error.response?.data?.error || t('adminError')); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [tab, t]);

  const search = async (event) => {
    event.preventDefault();
    try {
      await loadCollection(tab, query);
    } catch (error) {
      toast.error(error.response?.data?.error || t('adminError'));
    }
  };

  const deleteProblem = async (problem) => {
    if (!window.confirm(t('confirmDeletePublication'))) return;
    try {
      await adminAPI.deleteProblem(problem.id);
      setProblems((current) => current.filter((item) => item.id !== problem.id));
      setStats((current) => current ? { ...current, totalProblems: Math.max(0, current.totalProblems - 1) } : current);
      toast.success(t('publicationDeleted'));
    } catch (error) {
      toast.error(error.response?.data?.error || t('deletePublicationError'));
    }
  };

  const tabs = [
    ['overview', t('adminOverview'), BarChart3],
    ['users', t('adminUsers'), Users],
    ['problems', t('adminPublications'), FileText]
  ];

  return (
    <div className="site-page min-h-screen py-8 text-white">
      <div className="container mx-auto max-w-7xl px-4">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div><p className="feed-kicker">{t('adminNav')}</p><h1 className="feed-title">{t('adminDashboard')}</h1></div>
          <ShieldCheck className="text-violet-300" size={30} />
        </div>
        <div className="mb-6 flex flex-wrap gap-2">
          {tabs.map(([value, label, Icon]) => <button key={value} type="button" onClick={() => setTab(value)} className={`rounded-xl px-4 py-3 text-sm font-bold ${tab === value ? 'bg-violet-500 text-white' : 'bg-white/8 text-white/65'}`}><Icon className="mr-2 inline" size={16} />{label}</button>)}
        </div>

        {loading && !stats ? <div className="feed-empty">{t('loading')}</div> : <>
          {tab === 'overview' && <section className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              {[
                [t('totalProblems'), stats?.totalProblems, FileText],
                [t('openStatus'), stats?.openProblems, AlertCircle],
                [t('resolvedStatus'), stats?.resolvedProblems, ShieldCheck],
                [t('users'), stats?.totalUsers, Users],
                [t('categories'), stats?.totalCategories, BarChart3]
              ].map(([label, value, Icon]) => <div key={label} className="site-stat-card rounded-2xl p-5"><Icon className="mb-4 text-violet-300" /><p className="site-muted text-sm">{label}</p><strong className="text-3xl">{value || 0}</strong></div>)}
            </div>
            <div className="grid gap-6 lg:grid-cols-2">
              <div className="site-panel rounded-3xl p-6"><h2 className="mb-4 text-xl font-black">{t('categories')}</h2>{stats?.byCategory?.map((item) => <div key={item.category} className="mb-3 flex justify-between text-sm"><span>{item.category}</span><strong>{item.total}</strong></div>)}</div>
              <div className="site-panel rounded-3xl p-6"><h2 className="mb-4 text-xl font-black">{t('adminRecentActivity')}</h2>{stats?.recentActivity?.map((item) => <div key={item.id} className="mb-3 border-b border-white/10 pb-3 text-sm"><strong>{item.titulo}</strong><p className="text-white/55">{item.usuario?.nome}</p></div>)}</div>
            </div>
          </section>}

          {(tab === 'users' || tab === 'problems') && <section className="site-panel rounded-3xl p-6">
            <form onSubmit={search} className="mb-6 flex gap-2"><label className="feed-search flex-1"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={tab === 'users' ? t('searchUsers') : t('searchPublications')} /></label><button className="feed-report-button" type="submit">{t('searchTitle')}</button></form>
            {tab === 'users' && <div className="space-y-3">{users.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-4"><div className="flex items-center gap-3">{item.fotoPerfil ? <img src={mediaUrl(item.fotoPerfil)} alt="" className="h-10 w-10 rounded-full object-cover" /> : <span className="feed-avatar">{item.nome.charAt(0)}</span>}<div><strong>{item.nome}</strong><p className="text-xs text-white/55">{item.username ? `@${item.username}` : item.email}</p></div></div><div className="text-right text-xs text-white/55"><span>{item.role}</span><br />{item.publicationCount} {t('publications')}</div></div>)}</div>}
            {tab === 'problems' && <div className="space-y-3">{problems.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-4"><div><strong>{item.title}</strong><p className="text-xs text-white/55">{item.author?.nome} · {item.city || item.address || t('locationNotSpecified')}</p></div><button type="button" className="rounded-lg border border-red-300/30 p-2 text-red-200" aria-label={t('deletePublication')} onClick={() => deleteProblem(item)}><Trash2 size={16} /></button></div>)}</div>}
          </section>}
        </>}
      </div>
    </div>
  );
};

export default AdminDashboard;
