import React, { useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import { safetyAPI, socialAPI } from '../services/api';
import Avatar from './Avatar';
import { toast } from './LocalizedToast';
export default function CloseFriendsPanel() {
  const {
      t
    } = useI18n(),
    [query, setQuery] = useState(''),
    [search, setSearch] = useState([]),
    [list, setList] = useState(null),
    [page, setPage] = useState(1),
    [version, setVersion] = useState(0),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    setError(false);
    safetyAPI.closeFriends({
      page
    }).then(({
      data
    }) => {
      if (active) setList(data);
    }).catch(() => {
      if (active) setError(true);
    });
    return () => {
      active = false;
    };
  }, [page, version]);
  useEffect(() => {
    setSearch([]);
    if (query.trim().length < 2) return;
    const controller = new AbortController();
    const timer = setTimeout(() => socialAPI.searchUsers({
      q: query,
      limit: 12
    }, {
      signal: controller.signal
    }).then(({
      data
    }) => {
      if (!controller.signal.aborted) setSearch(data.data);
    }).catch(() => {
      if (!controller.signal.aborted) setError(true);
    }), 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);
  const change = async (id, enabled) => {
    if (busy) return;
    setBusy(true);
    try {
      await safetyAPI.setCloseFriend(id, enabled);
      setVersion(n => n + 1);
      setSearch([]);
      setQuery('');
    } catch (e) {
      toast.error(e.response?.data?.error || t('requestFailed'));
    } finally {
      setBusy(false);
    }
  };
  return <section className="site-panel my-6 rounded-3xl p-5"><h2 className="text-xl font-bold">{t('storyAudiencePROXIMOS')}</h2><p className="site-muted my-3 text-sm">{t('closeFriendsExplanation')}</p><label>{t('searchUsers')}<input className="site-form-input w-full rounded-xl p-3" value={query} maxLength={100} onChange={event => setQuery(event.target.value)} /></label>{error && <p role="alert">{t('requestFailed')}</p>}<ul>{search.map(person => <li className="my-3 flex items-center justify-between gap-3" key={person.id}><span>{person.nome} @{person.username}</span><button className="profile-action" disabled={busy} onClick={() => change(person.id, true)}>{t('closeFriendsAdd')}</button></li>)}</ul><ul>{list?.data.map(person => <li key={person.id} className="my-3 flex items-center justify-between gap-3"><span className="flex items-center gap-2"><Avatar user={person} className="h-8 w-8" />{person.nome}</span><button className="profile-action" disabled={busy} onClick={() => change(person.id, false)}>{t('closeFriendsRemove')}</button></li>)}</ul>{list && !list.total && <p>{t('socialSafetyEmpty')}</p>}{list && list.total > list.limit && <div className="flex justify-between"><button className="profile-action" disabled={page <= 1} onClick={() => setPage(n => n - 1)}>{t('previous')}</button><button className="profile-action" disabled={page * list.limit >= list.total} onClick={() => setPage(n => n + 1)}>{t('next')}</button></div>}</section>;
}
