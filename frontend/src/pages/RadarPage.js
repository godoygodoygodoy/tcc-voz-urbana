import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPin, Radio } from 'lucide-react';
import { useI18n, translateCategory, translateStatus, getLanguage } from '../i18n';
import { radarAPI, categoriesAPI } from '../services/api';
import { FloatingSelect, FloatingDatePicker } from '../components/FloatingFields';
import Avatar from '../components/Avatar';
import { profilePath } from '../utils/profileLinks';
import { formatRelativeTime } from '../utils/relativeTime';
const UrbanMap = React.lazy(() => import('../components/Map'));
const GeographyInsights = React.lazy(() => import('../components/GeographyInsights'));
export default function RadarPage() {
  const {
      t
    } = useI18n(),
    [filters, setFilters] = useState({}),
    [draft, setDraft] = useState({}),
    [result, setResult] = useState(null),
    [categories, setCategories] = useState([]),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(false),
    [selected, setSelected] = useState(null),
    [heat, setHeat] = useState(false),
    [insights, setInsights] = useState(false),
    [version, setVersion] = useState(0);
  const requestGeneration = useRef(0);
  useEffect(() => {
    ++requestGeneration.current;
    const controller = new AbortController();
    let active = true;
    setBusy(true);
    setError(false);
    radarAPI.list(filters, {
      signal: controller.signal
    }).then(({
      data
    }) => {
      if (active) {
        setResult(data);
        setSelected(null);
      }
    }).catch(() => {
      if (active) setError(true);
    }).finally(() => {
      if (active) setBusy(false);
    });
    return () => {
      active = false;
      ++requestGeneration.current;
      controller.abort();
    };
  }, [filters, version]);
  useEffect(() => {
    categoriesAPI.list().then(({
      data
    }) => setCategories(Array.isArray(data) ? data : data.data || [])).catch(() => {});
  }, []);
  const next = async () => {
    if (busy || !result?.nextCursor) return;
    setBusy(true);
    setError(false);
    const generation = requestGeneration.current;
    try {
      const {
        data
      } = await radarAPI.list({
        ...filters,
        cursor: result.nextCursor
      });
      if (generation !== requestGeneration.current) return;
      setResult(current => ({
        ...current,
        ...data,
        data: [...current.data, ...data.data.filter(row => !current.data.some(old => old.id === row.id))]
      }));
    } catch {
      if (generation === requestGeneration.current) setError(true);
    } finally {
      if (generation === requestGeneration.current) setBusy(false);
    }
  };
  return <main className="site-page min-h-screen px-4 py-8 text-white"><div className="mx-auto max-w-7xl"><Link className="profile-action mb-5" to="/feed">{t('radarBack')}</Link><header><h1 className="flex items-center gap-3 text-3xl font-bold"><Radio />{t('radarTitle')}</h1><p className="site-muted mt-3">{t('radarIntro')}</p><p className="site-muted mt-2 text-sm">{t('radarCommunitySource')}</p></header><form className="site-panel my-6 grid gap-3 rounded-3xl p-5 sm:grid-cols-2 lg:grid-cols-4" onSubmit={event => {
        event.preventDefault();
        setFilters({
          ...draft
        });
      }}>{[['city', 'Cidade'], ['neighborhood', 'Bairro'], ['state', 'Estado']].map(([key, label]) => <label key={key}>{t(label)}<input className="site-form-input w-full rounded-xl p-3" value={draft[key] || ''} maxLength={120} onChange={event => setDraft(current => ({
            ...current,
            [key]: event.target.value
          }))} /></label>)}<label>{t('category')}<FloatingSelect value={draft.category || ''} onChange={value => setDraft(current => ({
            ...current,
            category: value
          }))} options={[{
            value: '',
            label: t('allCategories')
          }, ...categories.map(row => ({
            value: row.id,
            label: translateCategory(row.name || row.nome)
          }))]} /></label><label>{t('status')}<FloatingSelect value={draft.status || ''} onChange={value => setDraft(current => ({
            ...current,
            status: value
          }))} options={[{
            value: '',
            label: t('allStatuses')
          }, ...['ABERTO', 'EM_ANDAMENTO', 'RESOLVIDO', 'REJEITADO'].map(value => ({
            value,
            label: translateStatus(value)
          }))]} /></label><label>{t('startDate')}<FloatingDatePicker value={draft.from || ''} onChange={value => setDraft(current => ({
            ...current,
            from: value
          }))} /></label><label>{t('endDate')}<FloatingDatePicker value={draft.to || ''} onChange={value => setDraft(current => ({
            ...current,
            to: value
          }))} /></label><button className="profile-action profile-action--primary" disabled={busy}>{t('filters')}</button></form><div className="mb-4 flex flex-wrap gap-3"><button className="profile-action" aria-pressed={heat} onClick={() => setHeat(value => !value)}>{t('geoHeatmap')}</button><button className="profile-action" aria-pressed={insights} onClick={() => setInsights(value => !value)}>{t('geoInsightsTitle')}</button><FloatingSelect value={draft.type || 'all'} onChange={value => {
          setDraft(current => ({
            ...current,
            type: value
          }));
          setFilters(current => ({
            ...current,
            type: value
          }));
        }} options={[{
          value: 'all',
          label: t('radarNow')
        }, {
          value: 'reports',
          label: t('radarRecords')
        }, {
          value: 'updates',
          label: t('radarChanges')
        }, {
          value: 'resolved',
          label: t('resolvedStatus')
        }]} /></div>{error && <div role="alert"><p>{t('apiUnavailable')}</p><button className="profile-action" onClick={() => setVersion(n => n + 1)}>{t('retry')}</button></div>}{busy && !result && <p role="status">{t('loading')}</p>}{result && <div className="grid gap-6 lg:grid-cols-2"><section className="min-w-0"><React.Suspense fallback={<p role="status">{t('loading')}</p>}><UrbanMap problems={result.markers || []} height="500px" onMarkerClick={setSelected} heatFilters={heat ? filters : null} /></React.Suspense><p className="site-muted mt-2 text-xs">{t('radarMapLimited')}</p>{selected && <article className="site-panel mt-4 rounded-2xl p-5"><h2>{selected.title}</h2><p>{selected.address}</p><Link className="profile-action" to={'/problem/' + selected.id}>{t('radarOpen')}</Link></article>}</section><section aria-label={t('radarNow')} className="space-y-4"><h2 className="text-xl font-bold">{t('radarNow')}</h2>{!result.data.length && <p>{t('radarEmpty')}</p>}{result.data.map(event => <article key={event.id} className="site-panel rounded-2xl p-5"><p className="site-muted text-xs">{t(event.type === 'report' ? 'radarNewReport' : 'radarUpdate')} · {formatRelativeTime(new Date(event.at), getLanguage())}</p><Link to={profilePath(event.actor)} className="my-3 flex items-center gap-2"><Avatar user={event.actor} className="h-8 w-8" /><span>{event.actor?.nome}</span></Link><h3 className="text-lg font-bold">{event.post.title}</h3>{event.text && <p className="my-2 whitespace-pre-wrap break-words">{event.text}</p>}<p className="site-muted my-2 flex items-center gap-2 text-sm"><MapPin size={14} />{event.post.city} {event.post.neighborhood}</p><span className="feed-category">{translateStatus(event.status || event.post.status)}</span><Link className="profile-action mt-3" to={'/problem/' + event.post.id}>{t('radarOpen')}</Link></article>)}{result.hasMore && <button className="profile-action" disabled={busy} onClick={next}>{t(busy ? 'loading' : 'loadMore')}</button>}</section></div>}{insights && <React.Suspense fallback={<p role="status">{t('loading')}</p>}><GeographyInsights filters={filters} categories={categories} /></React.Suspense>}</div></main>;
}
