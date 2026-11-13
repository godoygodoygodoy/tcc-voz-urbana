import React, { useEffect, useId, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ptBR, enUS, es } from 'date-fns/locale';
import { commentsAPI } from '../services/api';
import { getLanguage, translate as tr, useI18n } from '../i18n';
import { useAuthStore } from '../store';
import { profilePath } from '../utils/profileLinks';
import Avatar from './Avatar';
import { toast } from './LocalizedToast';
const CommentRow = React.memo(function CommentRow({comment}) {
  const {t}=useI18n();
  return <div className="site-comment rounded-lg p-4"><div className="flex flex-wrap items-center justify-between gap-3"><Link to={profilePath(comment.usuario)} className="flex min-w-0 items-center gap-2"><Avatar user={comment.usuario} className="h-8 w-8"/><strong className="break-all">{comment.usuario?.username?'@'+comment.usuario.username:comment.usuario?.nome||t('Usuário')}</strong></Link><span className="site-muted text-xs">{formatDistanceToNow(new Date(comment.dataCriacao),{locale:({'pt-BR':ptBR,en:enUS,es})[getLanguage()],addSuffix:true})}</span></div><p className="mt-2 whitespace-pre-wrap break-words text-white/70">{comment.texto}</p></div>;
});
export default React.memo(function CommentThread({comment,problemId,onReplyCreated}) {
  const {t}=useI18n(),user=useAuthStore(state=>state.user),openAuthModal=useAuthStore(state=>state.openAuthModal),inputId=useId();
  const [expanded,setExpanded]=useState(false),[replying,setReplying]=useState(false),[draft,setDraft]=useState('');
  const [result,setResult]=useState({data:[],total:comment.replyCount||0,limit:20}),[page,setPage]=useState(1),[revision,setRevision]=useState(0);
  const [loading,setLoading]=useState(false),[error,setError]=useState(false),[busy,setBusy]=useState(false),pending=useRef(false),active=useRef(true);
  useEffect(()=>{active.current=true;return()=>{active.current=false;};},[]);
  useEffect(()=>{
    if(!expanded)return undefined;const controller=new AbortController();setLoading(true);
    commentsAPI.replies(problemId,comment.id,page,{signal:controller.signal}).then(({data})=>{if(!controller.signal.aborted){setResult(data);setError(false);}}).catch(()=>{if(!controller.signal.aborted)setError(true);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[expanded,problemId,comment.id,page,revision]);
  const reply=async event=>{
    event.preventDefault();if(!user){openAuthModal('login');return;}if(pending.current||draft.trim().length<2)return;
    pending.current=true;setBusy(true);
    try{const{data}=await commentsAPI.create(problemId,{texto:draft,parentId:comment.id});if(!active.current)return;
      const total=data.threadTotal??Math.max(result.total,comment.replyCount||0)+1;
      setDraft('');setReplying(false);setPage(Math.max(1,Math.ceil(total/20)));setRevision(value=>value+1);onReplyCreated(comment.id,total);toast.success(tr('commentReplyPublished'));
    }catch(error){if(active.current)toast.error(error.response?.data?.error||tr('commentReplyError'));}
    finally{pending.current=false;if(active.current)setBusy(false);}
  };
  return <article className="comment-thread"><CommentRow comment={comment}/><div className="mt-2 flex flex-wrap gap-3 text-xs">
    <button type="button" className="profile-action" onClick={()=>{if(!user){openAuthModal('login');return;}setReplying(value=>!value);setExpanded(true);}}>{t('commentReply')}</button>
    {(comment.replyCount||0)>0&&<button type="button" className="profile-action" aria-expanded={expanded} onClick={()=>setExpanded(value=>!value)}>{t(expanded?'commentHideReplies':'commentViewReplies',{count:comment.replyCount})}</button>}
  </div>{expanded&&<div className="ml-3 mt-3 space-y-3 border-l border-white/10 pl-3 sm:ml-5">
    {loading&&<p role="status" className="site-muted text-xs">{t('loading')}</p>}
    {error&&<div role="status"><p className="site-muted text-sm">{t('commentReplyLoadError')}</p><button type="button" className="profile-action mt-2" onClick={()=>setRevision(value=>value+1)}>{t('collectionRetry')}</button></div>}
    {result.data.map(row=><CommentRow key={row.id} comment={row}/>)}
    {result.total>result.limit&&<div className="flex justify-between text-xs"><button type="button" disabled={page<=1||loading} onClick={()=>setPage(value=>value-1)}>{t('previous')}</button><span>{page}</span><button type="button" disabled={page*result.limit>=result.total||loading} onClick={()=>setPage(value=>value+1)}>{t('next')}</button></div>}
    {replying&&<form onSubmit={reply} className="space-y-3"><label htmlFor={inputId} className="block text-sm">{t('commentReplyTo',{name:comment.usuario?.username?'@'+comment.usuario.username:comment.usuario?.nome||t('Usuário')})}</label><textarea id={inputId} value={draft} onChange={event=>setDraft(event.target.value)} className="site-form-input w-full rounded-xl p-3" rows={3} maxLength={1000} minLength={2} required/><button type="submit" disabled={busy||draft.trim().length<2} className="profile-action profile-action--primary">{t(busy?'saving':'commentSendReply')}</button></form>}
  </div>}</article>;
});
