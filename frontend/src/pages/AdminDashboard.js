import React, { useEffect, useMemo, useState } from 'react';
import {
  Activity, BarChart3, Database, FileText, Gauge, MapPin, Search, ShieldCheck,
  Trash2, Users, XCircle
} from 'lucide-react';
import { toast } from 'react-toastify';
import { adminAPI } from '../services/api';
import Avatar from '../components/Avatar';
import { useI18n } from '../i18n';
import Map from '../components/Map';

const periodOptions = [
  ['24h', '24 horas'],
  ['7d', '7 dias'],
  ['30d', '30 dias'],
  ['90d', '90 dias'],
  ['all', 'Todo o período'],
];

const StatCard = ({ label, value, detail, Icon, accent = 'violet' }) => (
  <div className="site-stat-card rounded-2xl p-5">
    <div className="mb-4 flex items-center justify-between">
      <Icon size={20} className={accent === 'pink' ? 'text-fuchsia-300' : 'text-violet-300'} />
      {detail && <span className="text-[10px] font-black uppercase tracking-wider text-white/35">{detail}</span>}
    </div>
    <p className="site-muted text-xs font-bold uppercase tracking-wider">{label}</p>
    <strong className="mt-1 block text-3xl">{Number(value || 0).toLocaleString('pt-BR')}</strong>
  </div>
);

const MiniBars = ({ items = [], color = 'bg-violet-400' }) => {
  const max = Math.max(...items.map((item) => item.total), 1);
  return (
    <div className="space-y-3">
      {items.length ? items.map((item) => (
        <div key={item.date || item.path} className="text-xs">
          <div className="mb-1 flex justify-between gap-3 text-white/65">
            <span className="truncate">{item.date || item.path}</span><strong>{item.total}</strong>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-white/8">
            <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(3, (item.total / max) * 100)}%` }} />
          </div>
        </div>
      )) : <p className="text-sm text-white/45">Sem dados no período selecionado.</p>}
    </div>
  );
};

const AdminDashboard = () => {
  const { t } = useI18n();
  const [tab, setTab] = useState('overview');
  const [period, setPeriod] = useState('30d');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [problems, setProblems] = useState([]);
  const [urbanProblems, setUrbanProblems] = useState([]);
  const [logs, setLogs] = useState([]);
  const [system, setSystem] = useState(null);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const loadStats = async () => setStats((await adminAPI.getStatsByPeriod(period)).data);
  const loadTab = async () => {
    if (tab === 'users') setUsers((await adminAPI.listUsers({ q: query, limit: 50 })).data);
    if (tab === 'problems') setProblems((await adminAPI.listProblems({ q: query })).data);
    if (tab === 'urban') setUrbanProblems((await adminAPI.listProblems({ limit: 100 })).data);
    if (tab === 'logs') setLogs((await adminAPI.getLogs({ limit: 50 })).data.items);
    if (tab === 'system') setSystem((await adminAPI.getSystem()).data);
  };

  useEffect(() => {
    let active = true;
    setLoading(true);
    Promise.all([loadStats(), loadTab()])
      .catch((error) => { if (active) toast.error(error.response?.data?.error || t('adminError')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [tab, period]);

  const search = async (event) => {
    event.preventDefault();
    try { await loadTab(); } catch (error) { toast.error(error.response?.data?.error || t('adminError')); }
  };

  const deleteProblem = async (problem) => {
    if (!window.confirm(t('confirmDeletePublication'))) return;
    try {
      await adminAPI.deleteProblem(problem.id);
      setProblems((current) => current.filter((item) => item.id !== problem.id));
      await loadStats();
      toast.success(t('publicationDeleted'));
    } catch (error) { toast.error(error.response?.data?.error || t('deletePublicationError')); }
  };

  const tabs = [
    ['overview', 'Visão geral', BarChart3],
    ['users', 'Usuários', Users],
    ['problems', 'Publicações', FileText],
    ['urban', 'Problemas urbanos', MapPin],
    ['analytics', 'Estatísticas', Activity],
    ['logs', 'Auditoria', ShieldCheck],
    ['system', 'Monitoramento', Gauge],
  ];

  const statusSummary = useMemo(() => [
    { label: 'Abertos', value: stats?.openProblems, color: 'bg-amber-400' },
    { label: 'Em andamento', value: stats?.inProgressProblems, color: 'bg-sky-400' },
    { label: 'Resolvidos', value: stats?.resolvedProblems, color: 'bg-emerald-400' },
    { label: 'Rejeitados', value: stats?.rejectedProblems, color: 'bg-rose-400' },
  ], [stats]);

  return (
    <div className="site-page min-h-screen py-8 text-white">
      <div className="container mx-auto max-w-7xl px-4">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="feed-kicker">CONTROLE DA PLATAFORMA</p>
            <h1 className="feed-title">Painel Administrativo</h1>
            <p className="mt-2 max-w-2xl text-sm text-white/55">Dados reais da plataforma, monitorados com acesso restrito a administradores.</p>
          </div>
          <ShieldCheck className="text-violet-300" size={34} />
        </header>

        <div className="mb-6 flex flex-wrap gap-2">
          {tabs.map(([value, label, Icon]) => (
            <button key={value} type="button" onClick={() => setTab(value)} className={`rounded-xl px-4 py-3 text-sm font-bold transition ${tab === value ? 'bg-violet-500 text-white shadow-lg shadow-violet-950/30' : 'bg-white/8 text-white/65 hover:bg-white/12'}`}>
              <Icon className="mr-2 inline" size={16} />{label}
            </button>
          ))}
        </div>

        {tab === 'overview' || tab === 'analytics' || tab === 'urban' ? (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
            <span className="text-sm font-bold text-white/65">Período dos indicadores</span>
            <div className="flex flex-wrap gap-2">
              {periodOptions.map(([value, label]) => <button key={value} type="button" onClick={() => setPeriod(value)} className={`rounded-lg px-3 py-2 text-xs font-bold ${period === value ? 'bg-fuchsia-500 text-white' : 'bg-white/8 text-white/60'}`}>{label}</button>)}
            </div>
          </div>
        ) : null}

        {loading && !stats ? <div className="feed-empty">Carregando dados administrativos...</div> : (
          <>
            {(tab === 'overview' || tab === 'analytics') && <section className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard label="Usuários cadastrados" value={stats?.totalUsers} detail={`+${stats?.periodUsers || 0} no período`} Icon={Users} />
                <StatCard label="Visitas registradas" value={stats?.periodVisits} detail={`${stats?.uniqueVisitors || 0} visitantes únicos`} Icon={Activity} accent="pink" />
                <StatCard label="Problemas no mapa" value={stats?.totalProblems} detail={`+${stats?.periodProblems || 0} no período`} Icon={MapPin} />
                <StatCard label="Publicações resolvidas" value={stats?.resolvedProblems} detail={`${stats?.openProblems || 0} abertas`} Icon={ShieldCheck} accent="pink" />
                <StatCard label="Comentários" value={stats?.totalComments} Icon={FileText} />
                <StatCard label="Interações" value={stats?.totalVotes} Icon={Activity} accent="pink" />
                <StatCard label="Publicações salvas" value={stats?.totalSaved} Icon={FileText} />
                <StatCard label="Visitas hoje" value={stats?.todayVisits} Icon={Gauge} accent="pink" />
              </div>
              <div className="grid gap-6 lg:grid-cols-2">
                <div className="site-panel rounded-3xl p-6"><h2 className="mb-5 text-xl font-black">Crescimento de usuários</h2><MiniBars items={stats?.usersByDay} /></div>
                <div className="site-panel rounded-3xl p-6"><h2 className="mb-5 text-xl font-black">Visitas por dia</h2><MiniBars items={stats?.visitsByDay} color="bg-fuchsia-400" /></div>
                <div className="site-panel rounded-3xl p-6"><h2 className="mb-5 text-xl font-black">Publicações por categoria</h2><MiniBars items={stats?.byCategory?.map((item) => ({ path: item.category, total: item.total }))} color="bg-violet-400" /></div>
                <div className="site-panel rounded-3xl p-6"><h2 className="mb-5 text-xl font-black">Páginas mais acessadas</h2><MiniBars items={stats?.topPages} color="bg-pink-400" /></div>
              </div>
            </section>}

            {tab === 'urban' && <section className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{statusSummary.map((item) => <StatCard key={item.label} label={item.label} value={item.value} Icon={MapPin} />)}</div>
              <div className="site-panel rounded-3xl p-6"><h2 className="mb-5 text-xl font-black">Registros de problemas por período</h2><MiniBars items={stats?.problemsByDay} color="bg-sky-400" /></div>
              <div className="site-panel rounded-3xl p-4"><h2 className="mb-3 px-2 text-xl font-black">Mapa administrativo</h2><Map problems={urbanProblems} height="520px" /></div>
            </section>}

            {(tab === 'users' || tab === 'problems') && <section className="site-panel rounded-3xl p-6">
              <form onSubmit={search} className="mb-6 flex gap-2"><label className="feed-search flex-1"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={tab === 'users' ? 'Pesquisar por nome, usuário ou e-mail' : 'Pesquisar por título, cidade ou usuário'} /></label><button className="feed-report-button" type="submit">Pesquisar</button></form>
              {tab === 'users' && <div className="space-y-3">{users.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-4"><div className="flex items-center gap-3"><Avatar user={item} className="h-10 w-10" /><div><strong>{item.nome}</strong><p className="text-xs text-white/55">{item.username ? `@${item.username}` : item.email}</p></div></div><div className="text-right text-xs text-white/55"><span className="text-violet-200">{item.role}</span><br />{new Date(item.dataCriacao).toLocaleDateString('pt-BR')} · {item.publicationCount} publicação(ões)</div></div>)}</div>}
              {tab === 'problems' && <div className="space-y-3">{problems.map((item) => <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/5 p-4"><div><strong>{item.title}</strong><p className="text-xs text-white/55">{item.author?.nome} · {item.city || item.address || 'Local não informado'} · {item.status}</p><p className="mt-1 text-xs text-white/35">{item.latitude && item.longitude ? `${item.latitude}, ${item.longitude}` : 'Sem coordenadas'}</p></div><button type="button" className="rounded-lg border border-red-300/30 p-2 text-red-200" aria-label="Excluir publicação" onClick={() => deleteProblem(item)}><Trash2 size={16} /></button></div>)}</div>}
              {!users.length && !problems.length && <p className="text-center text-sm text-white/45">Nenhum registro encontrado.</p>}
            </section>}

            {tab === 'logs' && <section className="site-panel rounded-3xl p-6"><h2 className="mb-5 text-xl font-black">Histórico administrativo</h2><div className="space-y-3">{logs.map((item) => <div key={item.id} className="rounded-xl border border-white/10 bg-white/5 p-4"><div className="flex justify-between gap-3"><strong>{item.acao}</strong><span className="text-xs text-white/40">{new Date(item.data).toLocaleString('pt-BR')}</span></div><p className="mt-1 text-xs text-white/50">{item.usuario?.nome} · {item.usuario?.email}</p></div>)}{!logs.length && <p className="text-sm text-white/45">Nenhuma ação administrativa registrada.</p>}</div></section>}

            {tab === 'system' && <section className="grid gap-6 lg:grid-cols-3"><div className="site-panel rounded-3xl p-6"><Database className="mb-4 text-emerald-300" /><h2 className="text-xl font-black">Banco de dados</h2><p className="mt-2 text-sm text-emerald-200">{system?.database || 'Verificando...'}</p><p className="mt-2 text-xs text-white/45">{system?.databaseResponseMs ? `${system.databaseResponseMs} ms` : 'Métrica indisponível'}</p></div><div className="site-panel rounded-3xl p-6"><Gauge className="mb-4 text-violet-300" /><h2 className="text-xl font-black">Backend</h2><p className="mt-2 text-sm text-violet-200">{system?.backend || 'Verificando...'}</p></div><div className="site-panel rounded-3xl p-6"><XCircle className="mb-4 text-amber-300" /><h2 className="text-xl font-black">Erros</h2><p className="mt-2 text-sm text-white/55">{system?.metrics || 'Não disponível sem coletor de erros.'}</p></div></section>}
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;
