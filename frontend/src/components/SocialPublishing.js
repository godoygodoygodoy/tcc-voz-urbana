import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Repeat2, Plus } from 'lucide-react';
import { useI18n, getLanguage } from '../i18n';
import { useAuthStore } from '../store';
import { publishingAPI } from '../services/api';
import { profilePath } from '../utils/profileLinks';
import Avatar from './Avatar';
import SiteDialog from './SiteDialog';
import { FloatingSelect } from './FloatingFields';
import { toast } from './LocalizedToast';
import { formatRelativeTime } from '../utils/relativeTime';
import { createVisibilityPoller } from '../utils/polling';
const EVENT = 'voz-urbana:publishing';
const announce = () => window.dispatchEvent(new Event(EVENT));
export function NotesRail() {
  const {
      t
    } = useI18n(),
    user = useAuthStore(state => state.user),
    [result, setResult] = useState(null),
    [page, setPage] = useState(1),
    [error, setError] = useState(false),
    [editing, setEditing] = useState(false),
    [draft, setDraft] = useState(''),
    [audience, setAudience] = useState('SEGUIDORES'),
    [hours, setHours] = useState('24'),
    [busy, setBusy] = useState(false),
    [version, setVersion] = useState(0);
  useEffect(() => {
    if (!user) return;
    let active = true;
    const poller = createVisibilityPoller(async () => {
      try {
        const {
          data
        } = await publishingAPI.notes({
          page
        });
        if (active) {
          setResult(data);
          setError(false);
        }
      } catch {
        if (active) setError(true);
      }
    }, 30000, {
      immediate: true
    });
    return () => {
      active = false;
      poller.dispose();
    };
  }, [user?.id, page, version]);
  if (!user) return null;
  const own = result?.data.find(note => note.author.id === user.id);
  const save = async operation => {
    if (busy) return;
    setBusy(true);
    try {
      await operation();
      setEditing(false);
      setVersion(n => n + 1);
      toast.success(t('socialNoteSaved'));
    } catch (e) {
      toast.error(e.response?.data?.error || t('requestFailed'));
    } finally {
      setBusy(false);
    }
  };
  return <section className="site-panel mb-5 rounded-2xl p-4" aria-label={t('socialNotes')}><div className="mb-3 flex items-center justify-between gap-3"><h2 className="font-bold">{t('socialNotes')}</h2><button className="profile-action" onClick={() => {
        setDraft(own?.text || '');
        setAudience(own?.audience || 'SEGUIDORES');
        setEditing(true);
      }}><Plus size={16} />{t(own ? 'socialNoteEdit' : 'socialNoteCreate')}</button></div>{error && <p role="alert">{t('apiUnavailable')}</p>}<ul className="flex gap-3 overflow-x-auto pb-2">{result?.data.map(note => <li key={note.id} className="w-48 shrink-0 rounded-2xl border border-white/10 p-3"><Link to={profilePath(note.author)} className="flex items-center gap-2"><Avatar user={note.author} className="h-8 w-8" /><strong className="truncate text-sm">{note.author.username ? '@' + note.author.username : note.author.nome}</strong></Link><p className="mt-2 break-words text-sm">{note.text}</p><small className="site-muted">{t('socialNoteExpires')} {formatRelativeTime(new Date(note.expiresAt), getLanguage())}</small></li>)}</ul>{result && !result.total && <p className="site-muted text-sm">{t('socialNotesEmpty')}</p>}{result?.total > result?.limit && <div className="flex justify-between"><button className="profile-action" disabled={page <= 1} onClick={() => setPage(n => n - 1)}>{t('previous')}</button><button className="profile-action" disabled={page * result.limit >= result.total} onClick={() => setPage(n => n + 1)}>{t('next')}</button></div>}{editing && <SiteDialog title={t('socialNoteCreate')} onClose={() => setEditing(false)} busy={busy}><form onSubmit={event => {
        event.preventDefault();
        save(() => publishingAPI.saveNote({
          text: draft,
          audience,
          hours: Number(hours)
        }));
      }}><label>{t('socialNoteText')}<textarea className="site-form-input w-full rounded-xl p-3" value={draft} maxLength={140} required onChange={event => setDraft(event.target.value)} /></label><label>{t('storyAudience')}<FloatingSelect value={audience} onChange={setAudience} options={['PUBLICO', 'SEGUIDORES', 'AMIGOS', 'SO_EU', 'PROXIMOS'].map(value => ({
            value,
            label: t('storyAudience' + value)
          }))} /></label><label>{t('socialNoteDuration')}<FloatingSelect value={hours} onChange={setHours} options={['1', '6', '12', '24'].map(value => ({
            value,
            label: t('socialNoteHours', {
              count: value
            })
          }))} /></label><div className="mt-4 flex gap-3"><button className="profile-action profile-action--primary" disabled={busy || !draft.trim()}>{t('saveProfile')}</button>{own && <button className="profile-action" type="button" disabled={busy} onClick={() => save(() => publishingAPI.removeNote(own.id))}>{t('socialNoteDelete')}</button>}</div></form></SiteDialog>}</section>;
}
export function RepostButton({
  postId
}) {
  const {
      t
    } = useI18n(),
    user = useAuthStore(state => state.user),
    [open, setOpen] = useState(false),
    [text, setText] = useState(''),
    [busy, setBusy] = useState(false);
  if (!user) return null;
  return <><button className="profile-action" onClick={() => setOpen(true)}><Repeat2 size={16} />{t('socialRepost')}</button>{open && <SiteDialog title={t('socialRepost')} onClose={() => setOpen(false)} busy={busy}><form onSubmit={async event => {
        event.preventDefault();
        if (busy) return;
        setBusy(true);
        try {
          await publishingAPI.repost(postId, text);
          setOpen(false);
          setText('');
          announce();
          toast.success(t('socialRepostSaved'));
        } catch (e) {
          toast.error(e.response?.data?.error || t('requestFailed'));
        } finally {
          setBusy(false);
        }
      }}><label>{t('socialRepostComment')}<textarea className="site-form-input w-full rounded-xl p-3" maxLength={500} value={text} onChange={event => setText(event.target.value)} /></label><button className="profile-action profile-action--primary" disabled={busy}>{t('socialRepost')}</button></form></SiteDialog>}</>;
}
export function RepostsPanel({
  ownerId
}) {
  const {
      t
    } = useI18n(),
    user = useAuthStore(state => state.user),
    [page, setPage] = useState(1),
    [result, setResult] = useState(null),
    [error, setError] = useState(false),
    [version, setVersion] = useState(0),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    setPage(1);
    setResult(null);
  }, [ownerId, user?.id]);
  useEffect(() => {
    let active = true;
    setError(false);
    publishingAPI.reposts({
      owner: ownerId,
      page
    }).then(({
      data
    }) => {
      if (active) setResult(data);
    }).catch(() => {
      if (active) setError(true);
    });
    return () => {
      active = false;
    };
  }, [ownerId, user?.id, page, version]);
  useEffect(() => {
    const refresh = () => setVersion(n => n + 1);
    window.addEventListener(EVENT, refresh);
    return () => window.removeEventListener(EVENT, refresh);
  }, []);
  return <section className="my-6 space-y-4"><h2 className="text-xl font-bold">{t('socialReposts')}</h2>{error && <p role="alert">{t('apiUnavailable')}</p>}{!result && !error && <p role="status">{t('loading')}</p>}{result && !result.total && <p className="site-muted">{t('socialRepostsEmpty')}</p>}{result?.data.map(row => <article key={row.id} className="site-panel rounded-2xl p-4"><div className="flex items-center justify-between gap-3"><Link className="flex items-center gap-2" to={profilePath(row.author)}><Avatar user={row.author} className="h-8 w-8" /><strong>{row.author.nome}</strong></Link><small>{formatRelativeTime(new Date(row.createdAt), getLanguage())}</small></div><p className="site-muted text-xs">{t('socialReposted')}</p>{row.comment && <p className="my-3 whitespace-pre-wrap break-words">{row.comment}</p>}{row.original ? <div className="my-3 rounded-xl border border-white/10 p-4"><Link to={profilePath(row.original.author)}>{row.original.author.nome}</Link><h3>{row.original.title}</h3><p className="line-clamp-3 break-words">{row.original.description}</p><Link className="profile-action mt-3" to={'/problem/' + row.original.id}>{t('socialRepostOriginal')}</Link></div> : <p className="site-muted my-3">{t('socialRepostUnavailable')}</p>}{user?.id === row.author.id && <button className="profile-action" disabled={busy} onClick={async () => {
        setBusy(true);
        try {
          await publishingAPI.removeRepost(row.id);
          setVersion(n => n + 1);
        } catch (e) {
          toast.error(e.response?.data?.error || t('requestFailed'));
        } finally {
          setBusy(false);
        }
      }}>{t('socialRepostRemove')}</button>}</article>)}{result && result.total > result.limit && <div className="flex justify-between"><button className="profile-action" disabled={page <= 1} onClick={() => setPage(n => n - 1)}>{t('previous')}</button><button className="profile-action" disabled={page * result.limit >= result.total} onClick={() => setPage(n => n + 1)}>{t('next')}</button></div>}</section>;
}
