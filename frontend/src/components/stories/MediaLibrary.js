import GifLibrary from './GifLibrary';
import React, { useEffect, useRef, useState } from 'react';
import { useI18n } from '../../i18n';
import { mediaLibraryAPI, socialAPI } from '../../services/api';
import { FloatingSelect } from '../FloatingFields';
import { musicProviders } from './musicProvider';
import { newElement } from './storyDocument';
import { toast } from '../LocalizedToast';
function MusicLibrary({
  onAdd
}) {
  const {
      t
    } = useI18n(),
    [q, setQ] = useState(''),
    [type, setType] = useState('songs'),
    [offset, setOffset] = useState(0),
    [result, setResult] = useState({
      data: [],
      hasMore: false
    }),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(null),
    stop = useRef(null),
    generation = useRef(0),
    [previewing, setPreviewing] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setResult({
      data: [],
      hasMore: false
    });
    setError(null);
    setBusy(false);
    if (!q.trim()) return;
    setBusy(true);
    const timer = setTimeout(() => musicProviders.apple.search({
      q,
      type,
      offset
    }, {
      signal: controller.signal
    }).then(({
      data
    }) => {
      if (!controller.signal.aborted) setResult(data);
    }).catch(e => {
      if (!controller.signal.aborted) setError(e.response?.data?.error || 'mediaProviderUnavailable');
    }).finally(() => {
      if (!controller.signal.aborted) setBusy(false);
    }), 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [q, type, offset]);
  useEffect(() => () => {
    ++generation.current;
    stop.current?.();
    musicProviders.apple.stop();
  }, []);
  const preview = async item => {
    const current = ++generation.current;
    stop.current?.();
    setPreviewing(true);
    try {
      const release = await musicProviders.apple.preview(item.id);
      if (current !== generation.current) release();else stop.current = release;
    } catch {
      toast.error(t('mediaProviderUnavailable'));
    } finally {
      if (current === generation.current) setPreviewing(false);
    }
  };
  return <section><p>{t('storyMusicReferenceOnly')}</p><button type="button" className="profile-action" onClick={() => musicProviders.apple.authorize().catch(() => toast.error(t('mediaProviderUnavailable')))}>{t('storyMusicAuthorize')}</button><label>{t('storyMediaSearch')}<input value={q} maxLength={100} onChange={event => {
        setQ(event.target.value);
        setOffset(0);
      }} /></label><FloatingSelect value={type} onChange={value => {
      setType(value);
      setOffset(0);
    }} options={['songs', 'artists', 'albums'].map(value => ({
      value,
      label: t('storyMusic' + value)
    }))} />{busy && <p role="status">{t('loading')}</p>}{error && <p role="alert">{t(error)}</p>}<ul className="story-library-results">{result.data.map(item => <li key={item.id}>{item.artwork && <img src={item.artwork} alt="" width="64" height="64" loading="lazy" decoding="async" />}<span>{item.name}<small>{item.artist}</small></span>{type === 'songs' ? <><button className="profile-action" type="button" disabled={previewing} onClick={() => preview(item)}>{t('storyMusicPreview')}</button><button className="profile-action" type="button" onClick={() => onAdd(newElement('music', {
            text: item.name,
            provider: 'apple',
            catalogId: item.id,
            reference: item
          }))}>{t('storyMediaAdd')}</button></> : item.url && <a className="profile-action" href={item.url} target="_blank" rel="noopener noreferrer">{t('storyMusicOpen')}</a>}</li>)}</ul><button type="button" className="profile-action" onClick={() => {
      ++generation.current;
      stop.current?.();
      musicProviders.apple.stop();
      setPreviewing(false);
    }}>{t('storyMusicStop')}</button><div className="flex justify-between"><button type="button" className="profile-action" disabled={offset === 0 || busy} onClick={() => setOffset(n => Math.max(0, n - 12))}>{t('previous')}</button><button type="button" className="profile-action" disabled={!result.hasMore || busy} onClick={() => setOffset(n => n + 12)}>{t('next')}</button></div></section>;
}
function StickerLibrary({
  onAdd
}) {
  const {
      t
    } = useI18n(),
    [type, setType] = useState('emoji'),
    [value, setValue] = useState(''),
    [url, setUrl] = useState(''),
    [options, setOptions] = useState(''),
    [endsAt, setEndsAt] = useState(''),
    [users, setUsers] = useState([]),
    [searching, setSearching] = useState(false),
    [error, setError] = useState(false);
  useEffect(() => {
    setUsers([]);
    setError(false);
    setSearching(false);
    if (type !== 'mention' || !value.trim()) return;
    const controller = new AbortController();
    setSearching(true);
    const timer = setTimeout(() => socialAPI.searchUsers({
      q: value,
      page: 1
    }, {
      signal: controller.signal
    }).then(({
      data
    }) => {
      if (!controller.signal.aborted) setUsers(data.data || []);
    }).catch(() => {
      if (!controller.signal.aborted) setError(true);
    }).finally(() => {
      if (!controller.signal.aborted) setSearching(false);
    }), 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [type, value]);
  const add = () => {
    const properties = {
      text: value.trim(),
      fill: '#281334'
    };
    if (type === 'link') {
      try {
        const link = new URL(url);
        if (link.protocol !== 'https:' || link.username || link.password) throw Error();
        properties.url = link.href;
      } catch {
        toast.error(t('storyCompositionInvalid'));
        return;
      }
    }
    if (type === 'poll') {
      properties.options = options.split('\n').map(s => s.trim()).filter(Boolean);
      if (properties.options.length < 2 || properties.options.length > 4 || new Set(properties.options).size !== properties.options.length) {
        toast.error(t('storyCompositionInvalid'));
        return;
      }
    }
    if (type === 'slider') properties.emoji = '💜';
    if (type === 'countdown') {
      if (!Number.isFinite(+new Date(endsAt)) || +new Date(endsAt) <= Date.now()) {
        toast.error(t('storyCompositionInvalid'));
        return;
      }
      properties.endsAt = new Date(endsAt).toISOString();
    }
    if (type === 'hashtag') properties.text = '#' + value.trim().replace(/^#+/, '').replace(/\s+/g, '');
    onAdd(newElement(type, properties));
  };
  return <section><FloatingSelect value={type} onChange={value => {
      setType(value);
      setValue('');
    }} options={['emoji', 'location', 'mention', 'link', 'hashtag', 'poll', 'question', 'slider', 'countdown'].map(value => ({
      value,
      label: t('storySticker' + value)
    }))} /><label>{t('storyStickerLabel')}<input value={value} maxLength={type === 'emoji' ? 16 : 200} onChange={event => setValue(event.target.value)} /></label>{type === 'location' && <p>{t('storyLocationConsent')}</p>}{type === 'link' && <label>{t('storyStickerURL')}<input type="url" value={url} maxLength={1000} onChange={event => setUrl(event.target.value)} /></label>}{type === 'poll' && <label>{t('storyPollOptions')}<textarea value={options} onChange={event => setOptions(event.target.value)} maxLength={400} /></label>}{type === 'countdown' && <label>{t('storyCountdownDate')}<input type="datetime-local" value={endsAt} onChange={event => setEndsAt(event.target.value)} /></label>}{type === 'mention' ? <>{searching && <p role="status">{t('loading')}</p>}{error && <p role="alert">{t('storySaveError')}</p>}<ul>{users.map(user => <li key={user.id}><button type="button" className="profile-action" onClick={() => onAdd(newElement('mention', {
            userId: user.id,
            text: '@' + user.username,
            fill: '#281334'
          }))}>{user.nome} @{user.username}</button></li>)}</ul></> : <button type="button" className="profile-action" disabled={!value.trim()} onClick={add}>{t('storyMediaAdd')}</button>}</section>;
}
export default function MediaLibrary({
  onAdd,
  onClose
}) {
  const {
      t
    } = useI18n(),
    [tab, setTab] = useState('stickers'),
    [providers, setProviders] = useState(null),
    [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    mediaLibraryAPI.providers({
      signal: controller.signal
    }).then(({
      data
    }) => setProviders(data)).catch(() => {
      if (!controller.signal.aborted) setError(true);
    });
    return () => controller.abort();
  }, []);
  return <aside className="story-library"><div className="flex flex-wrap gap-2">{['stickers', 'music', 'giphy'].map(value => <button key={value} type="button" className="profile-action" aria-pressed={value === tab} onClick={() => setTab(value)}>{t('storyLibrary' + value)}</button>)}<button type="button" className="profile-action" onClick={onClose}>{t('close')}</button></div>{tab === 'stickers' ? <StickerLibrary onAdd={onAdd} /> : tab === 'music' ? error ? <p role="alert">{t('mediaProviderUnavailable')}</p> : !providers ? <p role="status">{t('loading')}</p> : providers.apple.configured ? <MusicLibrary onAdd={onAdd} /> : <p role="status">{t('mediaProviderNotConfigured')}</p> : <GifLibrary onAdd={onAdd} />}</aside>;
}
