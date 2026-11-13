import React, { useEffect, useState } from 'react';
import { geographyAPI } from '../services/api';
import { getLanguage, translateCategory, translateStatus, useI18n } from '../i18n';
import { useAuthStore } from '../store';

export default function GeographyInsights({ filters, categories }) {
  const { t } = useI18n(), userId = useAuthStore(state => state.user?.id);
  const [data, setData] = useState(null), [error, setError] = useState(false), [loading, setLoading] = useState(true), [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setData(null); setLoading(true); setError(false);
    geographyAPI.summary(filters, { signal: controller.signal }).then(({ data: result }) => {
      if (!Array.isArray(result.timeline) || !Array.isArray(result.regions) || !Array.isArray(result.distribution)) throw new Error('Invalid geography summary');
      if (!controller.signal.aborted) setData(result);
    }).catch(() => { if (!controller.signal.aborted) setError(true); }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [filters, userId, revision]);
  const date = value => new Date(value).toLocaleDateString(getLanguage(), { timeZone: 'UTC' });
  return <section className="site-panel mb-8 rounded-3xl p-6" aria-labelledby="geo-insights-title">
    <h2 id="geo-insights-title" className="text-xl font-bold">{t('geoInsightsTitle')}</h2><p className="site-muted mt-2 text-sm">{t('geoInsightsMethod')}</p>
    {loading && <p role="status" className="site-muted mt-4">{t('loading')}</p>}
    {error && <div role="status" className="mt-4"><p>{t('geoInsightsError')}</p><button type="button" className="profile-action mt-3" onClick={() => setRevision(value => value + 1)}>{t('collectionRetry')}</button></div>}
    {data && <>
      <p className="mt-5 text-sm">{date(data.from)} – {date(data.to)} · {t('geoPeriodTotal', { count: data.total })}</p>
      <p className="site-muted mt-2 text-sm">{t('geoPreviousPeriod', { count: data.previousTotal, from: date(data.previousFrom), to: date(data.previousTo) })} {data.changePercent === null ? t('geoNoBaseline') : t('geoChange', { percent: data.changePercent })}</p>
      {data.total === 0 && <p className="site-muted mt-4">{t('noProblems')}</p>}
      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <div><h3 className="mb-3 font-bold">{t('geoRegistrationTimeline')}</h3><ol className="space-y-2">{data.timeline.map(bin => <li key={bin.from} className="text-xs"><div className="mb-1 flex justify-between gap-3"><span>{date(bin.from)} – {date(bin.to)}</span><strong>{bin.count}</strong></div><div className="h-2 rounded-full bg-white/5"><div className="h-full rounded-full bg-violet-400" style={{ width: `${bin.count / Math.max(1, ...data.timeline.map(row => row.count)) * 100}%` }}/></div></li>)}</ol></div>
        <div><h3 className="mb-3 font-bold">{t('geoCurrentStatus')}</h3>{data.distribution.map(row => <p key={row.status} className="mb-2 flex justify-between gap-3 text-sm"><span>{translateStatus(row.status)}</span><strong>{row.count}</strong></p>)}<h3 className="mb-3 mt-5 font-bold">{t('category')}</h3>{data.categories.map(row => <p key={row.categoryId} className="mb-2 flex justify-between gap-3 text-sm"><span>{translateCategory(categories.find(category => category.id === row.categoryId)?.name) || t('noCategory')}</span><strong>{row.count}</strong></p>)}</div>
      </div>
      <h3 className="mb-3 mt-6 font-bold">{t('geoRegionalComparison')}</h3><div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead><tr>{['Estado', 'Cidade', 'Bairro', 'occurrences'].map(key => <th key={key} className="p-2">{t(key)}</th>)}</tr></thead><tbody>{data.regions.map((row, index) => <tr key={index} className="border-t border-white/10"><td className="p-2">{row.state || t('locationNotSpecified')}</td><td className="p-2">{row.city || t('locationNotSpecified')}</td><td className="p-2">{row.neighborhood || t('geoUnknownNeighborhood')}</td><td className="p-2">{row.count}</td></tr>)}</tbody></table></div><p className="site-muted mt-3 text-xs">{t('geoRegionLimit')} {t('geoUnknownCount', { count: data.unknownNeighborhood })}</p>
    </>}
  </section>;
}
