import React, { useEffect, useState } from 'react';
import { profileFeaturesAPI } from '../services/api';
import { useI18n } from '../i18n';
import { UploadField } from './FloatingFields';
import { notifySocialChange } from '../utils/social';
import { toast } from './LocalizedToast';
export default function ProfilePresentation() {
  const {
      t
    } = useI18n(),
    [presentation, setPresentation] = useState(''),
    [file, setFile] = useState(null),
    [remove, setRemove] = useState(false),
    [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false),
    [loadError, setLoadError] = useState(false),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setLoadError(false);
    profileFeaturesAPI.getPresentation({
      signal: controller.signal
    }).then(({
      data
    }) => {
      if (!controller.signal.aborted) {
        setPresentation(data.presentation || '');
        setReady(true);
      }
    }).catch(() => {
      if (!controller.signal.aborted) setLoadError(true);
    });
    return () => controller.abort();
  }, [revision]);
  const save = async event => {
    event.preventDefault();
    if (busy || !ready) return;
    setBusy(true);
    try {
      const data = new FormData();
      data.append('presentation', presentation.trim());
      if (file) data.append('cover', file);
      if (remove) data.append('removeCover', 'true');
      await profileFeaturesAPI.presentation(data);
      setFile(null);
      setRemove(false);
      notifySocialChange();
      toast.success(t('profilePresentationSaved'));
    } catch (error) {
      toast.error(error.response?.data?.error || t('profileStatsError'));
    } finally {
      setBusy(false);
    }
  };
  return <section className="mt-8 border-t border-white/10 pt-6"><h2 className="text-xl font-bold">{t('profilePresentationTitle')}</h2><p className="site-muted mt-2 text-sm">{t('profilePresentationHint')}</p>{loadError && <div role="status"><p>{t('profileStatsError')}</p><button type="button" className="profile-action mt-2" onClick={() => setRevision(value => value + 1)}>{t('collectionRetry')}</button></div>}<form onSubmit={save} className="mt-4 space-y-4"><label className="block text-sm">{t('profilePresentationLabel')}<input maxLength={120} value={presentation} onChange={event => setPresentation(event.target.value)} className="site-form-input mt-2 w-full rounded-xl p-3" /></label><UploadField accept="image/*" label={t('profileCover')} files={file ? [file] : []} maxSizeMb={5} onChange={event => {
        setFile(event.target.files?.[0] || null);
        setRemove(false);
      }} /><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={remove} onChange={event => {
          setRemove(event.target.checked);
          if (event.target.checked) setFile(null);
        }} />{t('profileCoverRemove')}</label><button type="submit" disabled={busy || !ready} className="profile-action profile-action--primary">{t(busy ? 'saving' : 'save')}</button></form></section>;
}
