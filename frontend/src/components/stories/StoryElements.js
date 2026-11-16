import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useI18n } from '../../i18n';
import { storyFonts } from './storyDocument';
import { storiesAPI } from '../../services/api';
import { toast } from '../LocalizedToast';
import { giphyProvider, giphyImage } from './giphyProvider';
function GiphyElement({
  id
}) {
  const {
      t
    } = useI18n(),
    [item, setItem] = useState(null),
    [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    giphyProvider.get(id, controller.signal).then(data => {
      if (!controller.signal.aborted) setItem(data);
    }).catch(() => {
      if (!controller.signal.aborted) setError(true);
    });
    return () => controller.abort();
  }, [id]);
  return error ? <small role="status">{t('mediaProviderUnavailable')}</small> : item ? <><img className="story-giphy-element" src={giphyImage(item)} alt={item.title || ''} decoding="async" /><small>{t('storyGiphyAttribution')}</small></> : <small role="status">{t('loading')}</small>;
}
function Countdown({
  endsAt
}) {
  const {
    t
  } = useI18n();
  const [remaining, setRemaining] = useState(Math.max(0, +new Date(endsAt) - Date.now()));
  useEffect(() => {
    const tick = () => {
      if (!document.hidden) setRemaining(Math.max(0, +new Date(endsAt) - Date.now()));
    };
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [endsAt]);
  const seconds = Math.floor(remaining / 1000);
  return <small>{Math.floor(seconds / 86400)}{' '}{t('storyDays')}{' '}{Math.floor(seconds % 86400 / 3600)}:{String(Math.floor(seconds % 3600 / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}</small>;
}
function Interactive({
  element,
  storyId,
  isOwner,
  onFocusChange
}) {
  const {
      t
    } = useI18n(),
    [answer, setAnswer] = useState(''),
    [busy, setBusy] = useState(false),
    [submitted, setSubmitted] = useState(false),
    [results, setResults] = useState(null),
    [page, setPage] = useState(1),
    [loading, setLoading] = useState(false),
    [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    if (!storyId) return;
    setLoading(true);
    setError(false);
    storiesAPI.answers(storyId, element.id, {
      page
    }).then(({
      data
    }) => {
      if (active) {
        if (isOwner) setResults(data);else setSubmitted(data.own !== null);
      }
    }).catch(() => {
      if (active) setError(true);
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [storyId, element.id, isOwner, page]);
  const submit = async value => {
    if (busy || submitted || loading) return;
    setBusy(true);
    try {
      await storiesAPI.answer(storyId, element.id, value);
      setSubmitted(true);
    } catch (e) {
      toast.error(e.response?.data?.error || t('storySaveError'));
    } finally {
      setBusy(false);
      onFocusChange?.(false);
    }
  };
  if (!storyId) return <div className="story-sticker-options">{element.options?.map((option, i) => <span key={i}>{option}</span>)}{element.type === 'slider' && element.emoji}{element.type === 'countdown' && <Countdown endsAt={element.endsAt} />}</div>;
  if (isOwner) return <details onToggle={event => onFocusChange?.(event.currentTarget.open)}><summary>{t('storyStickerResults')}{results ? ' (' + results.total + ')' : ''}</summary>{loading && t('loading')}{error && <p role="alert">{t('storySaveError')}</p>}<ul>{results?.data.map(row => <li key={row.id}>{row.user?.nome || t('notificationActorUnavailable')}: {element.type === 'poll' ? element.options[row.value] : String(row.value)}</li>)}</ul>{results && results.page * results.limit < results.total && <button className="profile-action" onClick={() => setPage(n => n + 1)}>{t('next')}</button>}{page > 1 && <button className="profile-action" onClick={() => setPage(n => n - 1)}>{t('previous')}</button>}</details>;
  return <fieldset disabled={busy || submitted || loading || error} className="story-sticker-options" onFocus={() => onFocusChange?.(true)} onBlur={() => onFocusChange?.(false)}>{error ? <span role="alert">{t('storySaveError')}</span> : submitted ? <small role="status">{t('storyStickerAnswered')}</small> : element.type === 'poll' ? element.options.map((option, i) => <button type="button" key={i} onClick={() => submit(i)}>{option}</button>) : element.type === 'question' ? <><input aria-label={t('storyStickerAnswer')} maxLength={1000} value={answer} onChange={event => setAnswer(event.target.value)} /><button type="button" disabled={!answer.trim() || busy || loading} onClick={() => submit(answer)}>{t('send')}</button></> : element.type === 'slider' ? <><label>{element.emoji}<input aria-label={t('storyStickerAnswer')} type="range" min="0" max="100" value={answer || 0} onChange={event => setAnswer(event.target.value)} /></label><button type="button" onClick={() => submit(Number(answer || 0))}>{t('send')}</button></> : <><Countdown endsAt={element.endsAt} /><button type="button" onClick={() => submit(true)}>{t('storyStickerInterested')}</button></>}</fieldset>;
}
export default function StoryElements({
  elements,
  selected,
  onPointerDown,
  storyId,
  isOwner,
  onFocusChange,
  onKeyboard
}) {
  const editing = Boolean(onPointerDown);
  return <div className="story-elements">{elements.map(element => <div key={element.id} tabIndex={editing ? 0 : undefined} onKeyDown={editing ? event => onKeyboard?.(event, element) : undefined} data-element-id={element.id} className={'story-element story-element--' + element.type + (selected === element.id ? ' is-selected' : '')} style={{
      left: element.x / 1080 * 100 + '%',
      top: element.y / 1920 * 100 + '%',
      width: element.width * 100 + '%',
      transform: `translate(-50%,-50%) rotate(${element.rotation || 0}deg)`,
      opacity: element.opacity,
      fontSize: element.size / 1080 * 100 + 'cqw',
      fontFamily: storyFonts[element.font],
      color: element.color,
      textAlign: element.align,
      background: element.fill || undefined
    }} onPointerDown={editing ? event => {
      event.stopPropagation();
      onPointerDown(event, element.id);
    } : undefined}>
  {element.type === 'giphy' ? <GiphyElement id={element.giphyId} /> : element.type === 'music' ? <a href={element.reference?.url || element.url} target="_blank" rel="noopener noreferrer" onClick={editing ? event => event.preventDefault() : undefined}>{element.reference?.artwork && <img src={element.reference.artwork} alt="" loading="lazy" decoding="async" width="64" height="64" />}<span>{element.reference?.name || element.text}<small>{element.reference?.artist}</small><small>{'Apple Music'}</small></span></a> : element.type === 'link' ? <a href={element.url} target="_blank" rel="noopener noreferrer" onClick={editing ? event => event.preventDefault() : undefined}>{element.text || element.url}</a> : element.type === 'mention' && !editing ? <Link to={'/profile/' + encodeURIComponent(element.userId)}>{element.text}</Link> : <span>{element.text}</span>}
  {['poll', 'question', 'slider', 'countdown'].includes(element.type) && <Interactive key={(storyId || 'editor') + element.id} element={element} storyId={storyId} isOwner={isOwner} onFocusChange={onFocusChange} />}
 </div>)}</div>;
}
