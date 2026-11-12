import { translate as tr, translateCategory, useI18n } from '../i18n';
import React, { useState, useEffect } from 'react';
import { problemsAPI, categoriesAPI } from '../services/api';
import { toast } from '../components/LocalizedToast';
import Map from '../components/Map';
import ProblemCard from '../components/ProblemCard';
import { FiFilter } from 'react-icons/fi';

import { FloatingDatePicker, FloatingSelect } from '../components/FloatingFields';

const HomePage = () => {
  const { t } = useI18n();
  const [problems, setProblems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('ABERTO');
  const [mapProblems, setMapProblems] = useState([]);
  const [selectedProblem, setSelectedProblem] = useState(null);
  const [selectedArea, setSelectedArea] = useState(null);
  const [drawingMode, setDrawingMode] = useState(false);
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [sort, setSort] = useState('recent');
  const [radius, setRadius] = useState('5');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let active = true;
    categoriesAPI.list().then(response => { if (active) setCategories(response.data || []); }).catch(() => { if (active) toast.error(tr('apiUnavailable')); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    problemsAPI.list({ status: selectedStatus, category: selectedCategory, from, to, sort, radius, page, limit: 9 }, { signal: controller.signal })
      .then(({ data }) => {
        if (controller.signal.aborted) return;
        const rows = data?.data || [];
        setProblems(rows); setTotal(data?.total || 0);
        setSelectedProblem(current => current || rows[0] || null);
      }).catch(() => { if (!controller.signal.aborted) toast.error(tr('apiUnavailable')); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [selectedStatus, selectedCategory, from, to, sort, radius, page]);

  // Changing the list page does not download the same 100 map markers again.
  useEffect(() => {
    const controller = new AbortController();
    problemsAPI.list({ category: selectedCategory, from, to, sort, radius, limit: 100 }, { signal: controller.signal })
      .then(({ data }) => { if (!controller.signal.aborted) setMapProblems(data?.data || []); })
      .catch(() => { if (!controller.signal.aborted) toast.error(tr('apiUnavailable')); });
    return () => controller.abort();
  }, [selectedCategory, from, to, sort, radius]);

  const handleAreaComplete = (points) => {
    setSelectedArea(points);
    setDrawingMode(false);
  };

  const statusOptions = [
    { value: 'ABERTO', label: t('openStatus') },
    { value: 'EM_ANDAMENTO', label: t('progressStatus') },
    { value: 'RESOLVIDO', label: t('resolvedStatus') },
  ];

  return (
    <div className="site-page min-h-screen text-white">
      {/* Hero Section */}
      <section className="map-page-hero border-b border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(168,85,247,0.26),transparent_28%),linear-gradient(180deg,rgba(6,7,11,0.98),rgba(6,7,11,0.92))] py-12">
        <div className="container mx-auto px-4">
          <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/40">{t('mapProblems')}</p>
          <h1 className="mt-2 text-4xl font-black text-white">VOZ URBANA</h1>
          <p className="mt-3 max-w-2xl text-lg text-white/70">
            {t('mapIntro')}
          </p>
        </div>
      </section>

      {/* Mapa */}
      <section className="map-explorer container mx-auto px-4 py-8">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-2xl font-bold text-white">{t('mapProblems')}</h2>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setDrawingMode((current) => !current)}
              className={`rounded-full border px-5 py-2 text-sm font-bold transition ${drawingMode ? 'border-violet-300 bg-violet-500 text-white' : 'border-white/15 bg-white/6 text-white hover:bg-white/10'}`}
            >
              {drawingMode ? t('drawingArea') : t('selectArea')}
            </button>
            {selectedArea && (
              <button
                type="button"
                onClick={() => setSelectedArea(null)}
                className="rounded-full border border-white/15 bg-white/6 px-5 py-2 text-sm font-bold text-white hover:bg-white/10"
              >
                {t('clearArea')}
              </button>
            )}
          </div>
        </div>
        <Map
          problems={mapProblems}
          onMarkerClick={setSelectedProblem}
          selectedArea={selectedArea}
          onAreaComplete={handleAreaComplete}
          areaDrawingActive={drawingMode}
          onAreaDrawingToggle={setDrawingMode}
        />
        {selectedArea && (
          <div className="mt-4 rounded-2xl border border-white/10 bg-white/6 p-4 text-sm text-white/70">
            {t('selectedArea')} {selectedArea.length} {t('points') || 'pontos'}.
          </div>
        )}
      </section>

      {/* Filtros */}
      <section className="map-controls container mx-auto px-4 py-8">
        <div className="site-panel rounded-3xl p-6 mb-8 shadow-[0_24px_70px_rgba(0,0,0,0.18)]">
          <h2 className="mb-4 flex items-center gap-2 text-xl font-bold text-white">
            <FiFilter /> {t('filters')}
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="mb-2 block text-sm font-semibold text-white/70">{t('status')}</label>
              <FloatingSelect value={selectedStatus} onChange={setSelectedStatus} options={statusOptions} />
            </div>

            <div>
              <label className="mb-2 block text-sm font-semibold text-white/70">{t('category')}</label>
              <FloatingSelect value={selectedCategory || ''} onChange={(value) => setSelectedCategory(value || null)} options={[{ value: '', label: t('allCategories') }, ...categories.map((cat) => ({ value: cat.id, label: translateCategory(cat.name) }))]} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-white/70">{t('sort')}</label>
              <FloatingSelect value={sort} onChange={(value) => { setSort(value); setPage(1); }} options={[{ value: 'recent', label: t('recent') }, { value: 'votes', label: t('mostVoted') }]} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-white/70">{t('startDate')}</label>
              <FloatingDatePicker value={from} onChange={(value) => { setFrom(value); setPage(1); }} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-white/70">{t('endDate')}</label>
              <FloatingDatePicker value={to} onChange={(value) => { setTo(value); setPage(1); }} />
            </div>
            <div>
              <label className="mb-2 block text-sm font-semibold text-white/70">{t('radius')}</label>
              <FloatingSelect value={radius} onChange={setRadius} options={[{ value: '1', label: '1 km' }, { value: '5', label: '5 km' }, { value: '10', label: '10 km' }, { value: '25', label: '25 km' }]} />
            </div>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-between text-sm text-white/60">
          <span>{total} {t('occurrences')}</span>
          <div className="flex items-center gap-2">
            <button type="button" disabled={page <= 1} onClick={() => setPage((current) => current - 1)} className="rounded-lg border border-white/15 px-3 py-2 disabled:opacity-30">{t('previous')}</button>
            <span>{t('page')} {page}</span>
            <button type="button" disabled={page * 9 >= total} onClick={() => setPage((current) => current + 1)} className="rounded-lg border border-white/15 px-3 py-2 disabled:opacity-30">{t('next')}</button>
          </div>
        </div>

        {/* Grid de Problemas */}
        {loading && problems.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-white/70">{t('loadingProblems')}</p>
          </div>
        ) : problems.length === 0 ? (
          <div className="site-panel rounded-3xl py-12 text-center">
            <p className="text-white/70">{t('noProblems')}</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {problems.map((problem) => (
              <ProblemCard key={problem.id} problem={problem} />
            ))}
          </div>
        )}

        <div className="site-panel mt-8 rounded-3xl p-6 shadow-[0_24px_70px_rgba(0,0,0,0.18)]">
          <div className="flex items-center justify-between gap-4 mb-4">
            <h2 className="text-xl font-bold text-white">{t('selectedProblem')}</h2>
            {selectedProblem && (
              <button
                type="button"
                onClick={() => setSelectedProblem(null)}
                className="text-sm font-semibold text-violet-300 hover:underline"
              >
                {t('clearSelection')}
              </button>
            )}
          </div>
          {selectedProblem ? (
            <ProblemCard problem={selectedProblem} />
          ) : (
            <p className="text-white/70">{t('clickMarker')}</p>
          )}
        </div>
      </section>
    </div>
  );
};

export default HomePage;
