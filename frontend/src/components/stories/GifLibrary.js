import giphyMark from '../../assets/providers/powered-by-giphy.png';
import React, { useEffect, useState } from 'react';
import { useI18n } from '../../i18n';
import { giphyConfigured, giphyProvider, giphyImage } from './giphyProvider';
import { FloatingSelect } from '../FloatingFields';
import { newElement } from './storyDocument';
export default function GifLibrary({
  onAdd
}) {
  const {
      t,
      language
    } = useI18n(),
    [q, setQ] = useState(''),
    [kind, setKind] = useState('gifs'),
    [offset, setOffset] = useState(0),
    [result, setResult] = useState({
      data: [],
      hasMore: false
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(null),
    [preview, setPreview] = useState(null),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    if (!giphyConfigured()) return;
    const controller = new AbortController();
    setBusy(true);
    setError(null);
    setResult({
      data: [],
      hasMore: false
    });
    const timer = setTimeout(() => giphyProvider.search({
      q,
      kind,
      offset,
      language: language === 'pt-BR' ? 'pt' : language
    }, controller.signal).then(data => {
      if (!controller.signal.aborted) setResult(data);
    }).catch(error => {
      if (!controller.signal.aborted) setError(error.message);
    }).finally(() => {
      if (!controller.signal.aborted) setBusy(false);
    }), 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, kind, offset, language, retry]);
  if (!giphyConfigured()) return <p role="status">{t('mediaProviderNotConfigured')}</p>;
  return <section><p><a href="https://giphy.com/" target="_blank" rel="noopener noreferrer"><img src={giphyMark} width="200" height="42" alt={t('storyGiphyAttribution')} /></a></p><label>{t('storyMediaSearch')}<input value={q} maxLength={50} onChange={event => {
        setQ(event.target.value);
        setOffset(0);
        setPreview(null);
      }} /></label><FloatingSelect value={kind} onChange={value => {
      setKind(value);
      setOffset(0);
      setPreview(null);
    }} options={['gifs', 'stickers'].map(value => ({
      value,
      label: t('storyGiphy' + value)
    }))} />{busy && <p role="status">{t('loading')}</p>}{error && <p role="alert">{t(error)}<button type="button" className="profile-action" onClick={() => setRetry(n => n + 1)}>{t('retry')}</button></p>}<div className="story-gif-grid">{result.data.map(item => <button type="button" key={item.id} onClick={() => setPreview(item)} aria-label={item.title || t('storyMediaPreview')}><img src={giphyImage(item)} alt={item.title || ''} width="120" height="120" loading="lazy" decoding="async" /></button>)}</div>{preview && <div className="story-gif-preview"><img src={giphyImage(preview)} alt={preview.title || ''} width="200" height="200" /><p>{preview.user?.display_name || preview.title}</p><button type="button" className="profile-action" onClick={() => {
        onAdd(newElement('giphy', {
          giphyId: preview.id,
          text: '',
          width: .4
        }));
        setPreview(null);
      }}>{t('storyMediaAdd')}</button></div>}<div className="flex justify-between"><button type="button" className="profile-action" disabled={offset === 0 || busy} onClick={() => setOffset(n => Math.max(0, n - 12))}>{t('previous')}</button><button type="button" className="profile-action" disabled={!result.hasMore || busy} onClick={() => setOffset(n => n + 12)}>{t('next')}</button></div></section>;
}
