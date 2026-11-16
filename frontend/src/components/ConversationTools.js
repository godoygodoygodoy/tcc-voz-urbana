import React, { useEffect, useState } from 'react';
import { Users, Settings, Reply, Heart } from 'lucide-react';
import { useI18n } from '../i18n';
import { useAuthStore } from '../store';
import { conversationsAPI, socialAPI } from '../services/api';
import { notifySocialChange } from '../utils/social';
import SiteDialog from './SiteDialog';
import { FloatingSelect } from './FloatingFields';
import { toast } from './LocalizedToast';
function UserPicker({
  selected,
  onChange
}) {
  const {
      t
    } = useI18n(),
    user = useAuthStore(state => state.user),
    [query, setQuery] = useState(''),
    [result, setResult] = useState([]),
    [error, setError] = useState(false);
  useEffect(() => {
    setResult([]);
    setError(false);
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
      if (!controller.signal.aborted) setResult(data.data.filter(item => item.id !== user.id));
    }).catch(() => {
      if (!controller.signal.aborted) setError(true);
    }), 350);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, user?.id]);
  return <div><label>{t('chatGroupFindPeople')}<input className="site-form-input w-full rounded-xl p-3" value={query} maxLength={100} onChange={event => setQuery(event.target.value)} /></label>{error && <p role="alert">{t('apiUnavailable')}</p>}<ul>{result.map(person => <li key={person.id}><label className="flex items-center gap-3 p-2"><input type="checkbox" checked={selected.includes(person.id)} onChange={event => onChange(event.target.checked ? [...selected, person.id] : selected.filter(id => id !== person.id))} /><span>{person.nome} @{person.username}</span></label></li>)}</ul><small>{t('chatGroupSelected', {
        count: selected.length
      })}</small></div>;
}
export function CreateConversation({
  onCreated
}) {
  const {
      t
    } = useI18n(),
    user = useAuthStore(state => state.user),
    [open, setOpen] = useState(false),
    [type, setType] = useState('GRUPO'),
    [name, setName] = useState(''),
    [description, setDescription] = useState(''),
    [members, setMembers] = useState([]),
    [busy, setBusy] = useState(false);
  if (!user) return null;
  return <><button className="profile-action mb-3" onClick={() => setOpen(true)}><Users size={16} />{t('chatGroupCreate')}</button>{open && <SiteDialog title={t('chatGroupCreate')} onClose={() => setOpen(false)} busy={busy}><form className="space-y-4" onSubmit={async event => {
        event.preventDefault();
        if (busy) return;
        setBusy(true);
        try {
          const {
            data
          } = await conversationsAPI.createGroup({
            type,
            name,
            description,
            members
          });
          setOpen(false);
          setName('');
          setMembers([]);
          notifySocialChange();
          onCreated(data.id);
        } catch (e) {
          toast.error(e.response?.data?.error || t('requestFailed'));
        } finally {
          setBusy(false);
        }
      }}><label>{t('chatGroupName')}<input className="site-form-input w-full rounded-xl p-3" required maxLength={100} value={name} onChange={event => setName(event.target.value)} /></label><label>{t('chatGroupDescription')}<textarea className="site-form-input w-full rounded-xl p-3" maxLength={1000} value={description} onChange={event => setDescription(event.target.value)} /></label><FloatingSelect value={type} onChange={setType} options={(user.role?.toLowerCase() === 'admin' ? ['GRUPO', 'CANAL'] : ['GRUPO']).map(value => ({
          value,
          label: t('chatType' + value)
        }))} /><UserPicker selected={members} onChange={setMembers} /><p className="site-muted text-sm">{t('chatGroupLimitExplanation')}</p><button className="profile-action profile-action--primary" disabled={busy || members.length > 19 || type === 'GRUPO' && !members.length}>{t('chatGroupCreate')}</button></form></SiteDialog>}</>;
}
export function ManageConversation({
  conversation,
  onLeave
}) {
  const {
      t
    } = useI18n(),
    user = useAuthStore(state => state.user),
    [open, setOpen] = useState(false),
    [details, setDetails] = useState(null),
    [selected, setSelected] = useState([]),
    [busy, setBusy] = useState(false),
    [version, setVersion] = useState(0),
    [error, setError] = useState(false);
  useEffect(() => {
    if (!open || !conversation) return;
    let active = true;
    setDetails(null);
    setError(false);
    conversationsAPI.details(conversation.id).then(({
      data
    }) => {
      if (active) setDetails(data);
    }).catch(() => {
      if (active) setError(true);
    });
    return () => {
      active = false;
    };
  }, [open, conversation?.id, version]);
  if (!conversation?.tipo || conversation.tipo === 'DIRETA') return null;
  const change = async (id, action) => {
    if (busy) return;
    setBusy(true);
    try {
      await conversationsAPI.member(conversation.id, id, action);
      notifySocialChange();
      if (action === 'leave') {
        setOpen(false);
        onLeave();
      } else {
        setVersion(n => n + 1);
        setSelected([]);
      }
    } catch (e) {
      toast.error(e.response?.data?.error || t('requestFailed'));
    } finally {
      setBusy(false);
    }
  };
  return <><button className="profile-action" onClick={() => setOpen(true)} aria-label={t('chatGroupManage')}><Settings size={16} /></button>{open && <SiteDialog title={t('chatGroupManage')} onClose={() => setOpen(false)} busy={busy}>{error && <p role="alert">{t('requestFailed')}</p>}{!details && !error && <p role="status">{t('loading')}</p>}{details && <div className="space-y-4"><h3>{details.name}</h3><p>{details.description}</p><ul className="space-y-3">{details.members.map(member => <li key={member.user.id} className="flex flex-wrap items-center gap-3"><span>{member.user.nome} · {t('chatRole' + member.role)}</span>{details.role === 'ADMIN' && <><button className="profile-action" disabled={busy} onClick={() => change(member.user.id, member.role === 'ADMIN' ? 'demote' : 'promote')}>{t(member.role === 'ADMIN' ? 'chatDemote' : 'chatPromote')}</button><button className="profile-action" disabled={busy} onClick={() => change(member.user.id, 'remove')}>{t('chatRemoveMember')}</button></>}</li>)}</ul>{details.role === 'ADMIN' && <><UserPicker selected={selected} onChange={setSelected} /><button className="profile-action" disabled={busy || selected.length !== 1} onClick={() => change(selected[0], 'add')}>{t('chatAddMember')}</button></>}<button className="profile-action" disabled={busy} onClick={() => change(user.id, 'leave')}>{t('chatLeaveGroup')}</button></div>}</SiteDialog>}</>;
}
export function MessageActions({
  message,
  conversationId,
  onReply,
  onReaction,
  canReply = true
}) {
  const {
      t
    } = useI18n(),
    user = useAuthStore(state => state.user),
    [busy, setBusy] = useState(false);
  const mine = message.reacoes?.find(row => row.usuarioId === user?.id)?.emoji;
  return <span className="mt-1 flex gap-2"><button type="button" className="profile-action" aria-label={t('chatReply')} disabled={!canReply} onClick={onReply}><Reply size={12} /></button><button type="button" className="profile-action" disabled={busy} aria-label={t('chatReact')} aria-pressed={Boolean(mine)} onClick={async () => {
      if (busy) return;
      setBusy(true);
      const emoji = mine ? null : '💜';
      try {
        await conversationsAPI.react(conversationId, message.id, emoji);
        onReaction(emoji);
      } catch (e) {
        toast.error(e.response?.data?.error || t('requestFailed'));
      } finally {
        setBusy(false);
      }
    }}><Heart size={12} fill={mine ? 'currentColor' : 'none'} /><small>{message.reacoes?.length || ''}</small></button></span>;
}
