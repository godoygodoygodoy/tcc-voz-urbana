import React, { useEffect, useState } from 'react';
import { sharingAPI } from '../services/api';
import { getLanguage, useI18n } from '../i18n';
import SiteDialog from './SiteDialog';
import { toast } from './LocalizedToast';
export default function SharePublicationDialog({
  problemId,
  onClose
}) {
  const {
      t,
      language
    } = useI18n(),
    [data, setData] = useState(null),
    [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setData(null);
    setError(false);
    sharingAPI.publication(problemId, getLanguage(), {
      signal: controller.signal
    }).then(({
      data
    }) => {
      if (!controller.signal.aborted) setData(data);
    }).catch(() => {
      if (!controller.signal.aborted) setError(true);
    });
    return () => controller.abort();
  }, [problemId, language]);
  const copy = async () => {
    try {
      if (!navigator.clipboard?.writeText) throw Error();
      await navigator.clipboard.writeText(data.url);
      toast.success(t('shareCopied'));
    } catch {
      toast.error(t('shareCopyError'));
    }
  };
  const native = async () => {
    try {
      if (navigator.share) await navigator.share({
        title: data.title,
        text: data.description,
        url: data.url
      });else await copy();
    } catch (error) {
      if (error.name !== 'AbortError') toast.error(t('shareCopyError'));
    }
  };
  return <SiteDialog title={t('sharePublicationTitle')} onClose={onClose}>{error ? <p role="status" className="mt-4">{t('sharePublicOnly')}</p> : !data ? <p role="status" className="mt-4">{t('loading')}</p> : <div className="mt-4 space-y-4"><p className="break-words font-bold">{data.title}</p><p className="site-muted text-sm">{t('shareHint')}</p><div className="flex flex-wrap gap-3"><button type="button" className="profile-action" onClick={native}>{t('shareNative')}</button><button type="button" className="profile-action" onClick={copy}>{t('shareCopy')}</button><a className="profile-action" target="_blank" rel="noopener noreferrer" href={'https://wa.me/?text=' + encodeURIComponent(data.title + ' ' + data.url)}>WhatsApp</a><a className="profile-action" target="_blank" rel="noopener noreferrer" href={'https://www.facebook.com/sharer/sharer.php?u=' + encodeURIComponent(data.url)}>{t('Facebook')}</a><a className="profile-action" target="_blank" rel="noopener noreferrer" href={'https://twitter.com/intent/tweet?text=' + encodeURIComponent(data.title) + '&url=' + encodeURIComponent(data.url)}>{t('X')}</a></div><p className="site-muted text-xs">{t('shareInstagramHint')}</p><label className="block text-sm">{t('shareLink')}<input className="site-form-input mt-2 w-full rounded-xl p-3" readOnly value={data.url} onFocus={event => event.target.select()} /></label></div>}</SiteDialog>;
}
