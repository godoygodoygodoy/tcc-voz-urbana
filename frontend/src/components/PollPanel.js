import React, { useEffect, useRef, useState } from 'react';
import { pollsAPI } from '../services/api';
import { getLanguage, translate as tr, useI18n } from '../i18n';
import { useAuthStore } from '../store';
import { createVisibilityPoller, retainEqual } from '../utils/polling';
import { FloatingDatePicker, FloatingTimePicker } from './FloatingFields';
import { toast } from './LocalizedToast';

export default function PollPanel({ problem }) {
  const { t } = useI18n();
  const user = useAuthStore(state => state.user), openAuthModal = useAuthStore(state => state.openAuthModal);
  const [poll, setPoll] = useState(null), [loading, setLoading] = useState(true), [error, setError] = useState(false);
  const [editing, setEditing] = useState(false), [question, setQuestion] = useState(''), [options, setOptions] = useState('');
  const [date, setDate] = useState(''), [time, setTime] = useState('23:59'), [busy, setBusy] = useState(false), [revision,setRevision] = useState(0);
  const pending = useRef(false), context = useRef('');context.current = [problem.id,user?.id].join(':');
  useEffect(() => {
    const controller = new AbortController();let active = true;setLoading(true);setEditing(false);
    const load = async () => {
      try { const { data } = await pollsAPI.get(problem.id,{signal:controller.signal});
        if (active) { setPoll(current=>retainEqual(current,data.poll));setError(false);if(data.poll?.closed)poller.dispose(); }
      } catch { if(active)setError(true); }
      finally { if(active)setLoading(false); }
    };
    const poller = createVisibilityPoller(load,30000,{immediate:true});
    return()=>{active=false;controller.abort();poller.dispose();};
  },[problem.id,user?.id,revision]);
  useEffect(()=>{
    if(!poll?.endsAt||poll.closed)return undefined;
    const delay=new Date(poll.endsAt).getTime()-Date.now();
    if(delay>2147483647)return undefined;
    const timer=setTimeout(()=>setPoll(current=>current?{...current,closed:true}:current),Math.max(0,delay));
    return()=>clearTimeout(timer);
  },[poll?.id,poll?.endsAt,poll?.closed]);
  const perform = async operation => {
    if(pending.current)return;pending.current=true;setBusy(true);const key=context.current;
    try { const {data}=await operation();if(context.current===key){setPoll(data.poll);setEditing(false);setError(false);} }
    catch(error){toast.error(error.response?.data?.error||tr('pollSaveError'));}
    finally {pending.current=false;setBusy(false);}
  };
  const publish = event => {
    event.preventDefault();
    const list=options.split('\n').map(value=>value.trim()).filter(Boolean);
    if(list.length<2||list.length>6)return toast.error(t('pollOptionsInvalid'));
    let endsAt=null;
    if(date){const end=new Date(date+'T'+time);if(!Number.isFinite(end.getTime())||end<=new Date())return toast.error(t('pollEndInvalid'));endsAt=end.toISOString();}
    perform(()=>pollsAPI.create(problem.id,{question,options:list,endsAt}));
  };
  const canCreate=user?.id===problem.author?.id;
  if(loading)return <p className="site-muted mt-6 text-sm" role="status">{t('loading')}</p>;
  if(error)return <div className="mt-6 text-sm" role="status"><p>{t('pollLoadError')}</p><button type="button" className="profile-action mt-2" onClick={()=>setRevision(value=>value+1)}>{t('collectionRetry')}</button></div>;
  if(!poll&&!canCreate)return null;
  return <section className="site-panel mt-6 rounded-2xl p-5" aria-label={t('pollTitle')}>
    <header className="mb-4 flex items-center justify-between gap-3"><h2 className="text-xl font-bold">{t('pollTitle')}</h2>{!poll&&!editing&&<button type="button" className="profile-action" onClick={()=>setEditing(true)}>{t('pollCreate')}</button>}</header>
    {editing&&<form onSubmit={publish} className="space-y-4">
      <label className="block text-sm">{t('pollQuestion')}<input className="site-form-input mt-2 w-full rounded-xl p-3" value={question} onChange={event=>setQuestion(event.target.value)} maxLength={200} required/></label>
      <label className="block text-sm">{t('pollOptions')}<textarea className="site-form-input mt-2 w-full rounded-xl p-3" value={options} onChange={event=>setOptions(event.target.value)} rows={5} required/></label>
      <p className="site-muted text-xs">{t('pollImmutableHint')}</p>
      <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm">{t('pollEndDate')}<FloatingDatePicker value={date} onChange={setDate}/></label><label className="text-sm">{t('Hora')}<FloatingTimePicker value={time} onChange={setTime}/></label></div>
      <div className="flex gap-3"><button type="submit" className="profile-action profile-action--primary" disabled={busy}>{t(busy?'saving':'pollPublish')}</button><button type="button" className="profile-action" disabled={busy} onClick={()=>setEditing(false)}>{t('Cancelar')}</button></div>
    </form>}
    {poll&&<><h3 className="mb-4 font-bold">{poll.question}</h3><div className="space-y-3">{poll.options.map(option=><div key={option.id}><button type="button" className="w-full rounded-xl border border-white/15 p-3 text-left transition hover:bg-white/5 disabled:cursor-default" aria-pressed={poll.votedOptionId===option.id} disabled={busy||poll.closed||Boolean(poll.votedOptionId)} onClick={()=>{if(!user){openAuthModal('login');return;}perform(()=>pollsAPI.vote(problem.id,option.id));}}><span className="flex flex-wrap justify-between gap-2"><span>{option.text}{poll.votedOptionId===option.id&&<span className="ml-2 text-xs text-violet-200">{t('pollYourVote')}</span>}</span><span>{option.percentage.toLocaleString(getLanguage())}%</span></span></button><div role="progressbar" aria-label={option.text} aria-valuemin={0} aria-valuemax={100} aria-valuenow={option.percentage} className="mt-1 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full rounded-full bg-violet-400" style={{width:option.percentage+'%'}}/></div></div>)}</div><p className="site-muted mt-4 text-sm">{t('pollVotes',{count:poll.total})} · {t(poll.closed?'pollClosed':'pollOpen')}{poll.endsAt&&' · '+new Date(poll.endsAt).toLocaleString(getLanguage())}</p></>}
  </section>;
}
