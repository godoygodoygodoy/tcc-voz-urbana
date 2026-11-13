import React, { useEffect, useId, useState } from 'react';
import { trackingAPI, mediaUrl } from '../services/api';
import { useAuthStore } from '../store';
import { useI18n } from '../i18n';
import { UploadField, FloatingSelect } from './FloatingFields';
import SiteDialog from './SiteDialog';
import { toast } from './LocalizedToast';
export default function ComparisonPanel({
  problem,
  onChange
}) {
  const {
      t
    } = useI18n(),
    user = useAuthStore(state => state.user),
    slider = useId();
  const before = problem.images?.filter(image => image.tipo !== 'DEPOIS') || [],
    after = problem.images?.filter(image => image.tipo === 'DEPOIS') || [];
  const [left, setLeft] = useState(''),
    [right, setRight] = useState(''),
    [split, setSplit] = useState(50),
    [open, setOpen] = useState(false),
    [files, setFiles] = useState({
      before: [],
      after: []
    }),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    setLeft(before[0]?.id || '');
    setRight(after[0]?.id || '');
  }, [problem.id, problem.images]);
  const submit = async event => {
    event.preventDefault();
    if (busy || !files.before[0] || !files.after[0]) return;
    setBusy(true);
    try {
      const data = new FormData();
      data.append('before', files.before[0]);
      data.append('after', files.after[0]);
      await trackingAPI.comparison(problem.id, data);
      setOpen(false);
      setFiles({
        before: [],
        after: []
      });
      onChange();
      toast.success(t('comparisonSaved'));
    } catch (error) {
      toast.error(error.response?.data?.error || t('comparisonError'));
    } finally {
      setBusy(false);
    }
  };
  const a = before.find(image => image.id === left),
    b = after.find(image => image.id === right),
    canEdit = user && (user.id === problem.author?.id || user.role === 'admin');
  if (!canEdit && (!a || !b)) return null;
  return <section className="mt-6 border-t border-white/10 pt-6"><h2 className="text-xl font-bold">{t('comparisonTitle')}</h2><p className="site-muted mt-2 text-sm">{t('comparisonHint')}</p>{a && b && <>
    {(before.length > 1 || after.length > 1) && <div className="mt-3 grid gap-3 sm:grid-cols-2"><FloatingSelect value={left} onChange={setLeft} options={before.map((image, index) => ({
          value: image.id,
          label: t('before') + ' ' + (index + 1)
        }))} /><FloatingSelect value={right} onChange={setRight} options={after.map((image, index) => ({
          value: image.id,
          label: t('after') + ' ' + (index + 1)
        }))} /></div>}
    <div className="relative mt-4 aspect-[4/3] overflow-hidden rounded-2xl border border-white/10 bg-black"><img src={mediaUrl(a.url)} alt={t('before')} loading="lazy" width="960" height="720" className="absolute inset-0 h-full w-full object-contain" /><img src={mediaUrl(b.url)} alt={t('after')} loading="lazy" width="960" height="720" className="absolute inset-0 h-full w-full object-contain" style={{
          clipPath: `inset(0 0 0 ${split}%)`
        }} /><div aria-hidden="true" className="pointer-events-none absolute inset-y-0 border-l-2 border-white/80" style={{
          left: split + '%'
        }} /><span className="absolute left-3 top-3 rounded-lg bg-black/75 px-3 py-1 text-xs">{t('before')}</span><span className="absolute right-3 top-3 rounded-lg bg-black/75 px-3 py-1 text-xs">{t('after')}</span></div><label htmlFor={slider} className="mt-3 block text-sm">{t('comparisonSlider')}</label><input id={slider} type="range" min="0" max="100" value={split} onChange={event => setSplit(Number(event.target.value))} className="mt-2 w-full accent-violet-400" />
  </>}{canEdit && <button type="button" className="profile-action mt-4" onClick={() => setOpen(true)}>{t('comparisonAdd')}</button>}{open && <SiteDialog title={t('comparisonAdd')} onClose={() => setOpen(false)} busy={busy}><form onSubmit={submit} className="mt-4 space-y-4">{['before', 'after'].map(kind => <UploadField key={kind} accept="image/*" files={files[kind]} maxSizeMb={5} label={t(kind)} onChange={event => setFiles(current => ({
          ...current,
          [kind]: Array.from(event.target.files || []).slice(0, 1)
        }))} />)}<button type="submit" className="profile-action profile-action--primary" disabled={busy || !files.before[0] || !files.after[0]}>{t(busy ? 'saving' : 'comparisonPublish')}</button></form></SiteDialog>}</section>;
}
