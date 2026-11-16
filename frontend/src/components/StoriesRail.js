import StoryElements from './stories/StoryElements';
import {fromComposition,mediaEffect} from './stories/storyDocument';
﻿import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Plus, ChevronLeft, ChevronRight, Trash2, Heart,Pause,Play,Send } from 'lucide-react';
import { storiesAPI, conversationsAPI, mediaUrl } from '../services/api';
import StoryProgress from './StoryProgress';
import { translate as tr, useI18n } from '../i18n';
import { useAuthStore } from '../store';
import { createVisibilityPoller, retainEqual } from '../utils/polling';
import { profilePath } from '../utils/profileLinks';
import Avatar from './Avatar';
import SiteDialog, { ConfirmDialog } from './SiteDialog';
const StoryComposer=React.lazy(()=>import('./StoryComposer'));
import { toast } from './LocalizedToast';
export default function StoriesRail({ ownerId, profileUser }) {
 const location=useLocation();
 const { t }=useI18n(),user=useAuthStore(state=>state.user);
 const [result,setResult]=useState({data:[],total:0,page:1,limit:30}),[page,setPage]=useState(1),[error,setError]=useState(false);
 const [loading,setLoading]=useState(true),[creating,setCreating]=useState(false),[files,setFiles]=useState([]),[audience,setAudience]=useState('SEGUIDORES');
 const [busy,setBusy]=useState(false),[selected,setSelected]=useState(null),[deleting,setDeleting]=useState(false),[mediaError,setMediaError]=useState(false),[version,setVersion]=useState(0);
 const working=useRef(false),context=useRef('');context.current=[ownerId,user?.id].join(':');
 const video=useRef(null),swipe=useRef(null);
 const [paused,setPaused]=useState(false),[reply,setReply]=useState(''),[viewers,setViewers]=useState(null);
 useEffect(()=>{setPaused(false);setReply('');setViewers(null);},[selected?.id]);
 useEffect(()=>{const element=video.current;if(!element)return;if(paused||busy||deleting||viewers)element.pause();else element.play().catch(()=>{});},[paused,busy,deleting,viewers,selected?.id]);
 useEffect(()=>{
  const element=video.current;if(!element)return undefined;
  const visibility=()=>{if(document.hidden)element.pause();};
  const observer='IntersectionObserver'in window?new IntersectionObserver(entries=>{if(entries.some(entry=>!entry.isIntersecting))element.pause();}):null;
  observer?.observe(element);document.addEventListener('visibilitychange',visibility);
  return()=>{observer?.disconnect();document.removeEventListener('visibilitychange',visibility);element.pause();};
 },[selected?.id]);
 useEffect(()=>{setPage(1);setSelected(null);setFiles([]);setCreating(false);},[ownerId,user?.id]);
 useEffect(()=>{
  if(!user)return undefined;const controller=new AbortController();let active=true;setLoading(true);
  const refresh=async()=>{try{const{data}=await storiesAPI.list({page,owner:ownerId,...(!ownerId?{scope:'following'}:{})},{signal:controller.signal});if(!Array.isArray(data?.data))throw new Error('Invalid story list');if(active){setResult(current=>retainEqual(current,data));setError(false);}}catch{if(active)setError(true);}finally{if(active)setLoading(false);}};
  const poller=createVisibilityPoller(refresh,30000,{immediate:true});return()=>{active=false;controller.abort();poller.dispose();};
 },[ownerId,user?.id,page,version]);
 useEffect(()=>{
  if(!selected)return undefined;let active=true;setMediaError(false);
  storiesAPI.view(selected.id).then(({data})=>{if(!active)return;setSelected(current=>current?.id===data.id?{...data,mediaUrl:current.mediaUrl,posterUrl:current.posterUrl}:current);setResult(current=>({...current,data:current.data.map(item=>item.id===data.id?data:item)}));}).catch(error=>{if(active){setMediaError(true);toast.error(error.response?.data?.error||tr('storyUnavailable'));}});
  return()=>{active=false;};
 },[selected?.id]);
 useEffect(()=>{
  if(!selected)return undefined;
  const timer=setTimeout(()=>{setMediaError(true);setResult(current=>({...current,data:current.data.filter(story=>story.id!==selected.id)}));},Math.max(0,new Date(selected.expiresAt).getTime()-Date.now()));
  return()=>clearTimeout(timer);
 },[selected?.id,selected?.expiresAt]);
 useEffect(()=>{
  const storyId=new URLSearchParams(location.search).get('story');
  if(ownerId||!storyId||!user)return undefined;
  const controller=new AbortController();
  storiesAPI.get(storyId,{signal:controller.signal}).then(({data})=>{if(!controller.signal.aborted){setSelected(data);setResult(current=>current.data.some(story=>story.id===data.id)?current:{...current,data:[...current.data,data]});}}).catch(error=>{if(!controller.signal.aborted)toast.error(error.response?.data?.error||tr('storyUnavailable'));});
  return()=>controller.abort();
 },[location.search,ownerId,user?.id]);
 const groups=useMemo(()=>{const authors=new Map();for(const story of result.data){const group=authors.get(story.author.id)||{author:story.author,stories:[]};group.stories.push(story);authors.set(story.author.id,group);}return[...authors.values()];},[result.data]);
 const action=async operation=>{if(working.current)return;working.current=true;setBusy(true);const key=context.current;try{await operation(key);}catch(error){toast.error(error.response?.data?.error||tr('storySaveError'));}finally{working.current=false;setBusy(false);}};
 const publishFile=(file,visibility,metadata={})=>action(async key=>{const body=new FormData();body.append('file',file);body.append('audience',visibility);if(metadata.composition)body.append('composition',JSON.stringify(metadata.composition));if(metadata.publicationKey)body.append('publicationKey',metadata.publicationKey);if(metadata.original)body.append('original',metadata.original);const {data}=await storiesAPI.publish(body);if(context.current===key){setCreating(false);setPage(1);setResult(current=>({...current,data:[data,...current.data.filter(story=>story.id!==data.id)],total:current.total+1}));setVersion(value=>value+1);toast.success(tr('storyPublished'));}});
 const ordered=useMemo(()=>groups.flatMap(group=>group.stories),[groups]);
 const position=ordered.findIndex(story=>story.id===selected?.id);
 useEffect(()=>{if(!selected||busy||deleting||viewers)return undefined;const key=event=>{if(event.target.closest('input,textarea,select'))return;if(event.key==='ArrowRight'){event.preventDefault();if(position<result.data.length-1)setSelected(ordered[position+1]);}if(event.key==='ArrowLeft'&&position>0){event.preventDefault();setSelected(ordered[position-1]);}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[selected?.id,position,result.data,busy,deleting,viewers]);
 if(!user)return profileUser?<div className="profile-avatar"><Avatar user={profileUser} className="profile-story-image"/></div>:null;
 return <section className={profileUser?'profile-story-anchor':'stories-panel stories-panel--compact'} aria-label={t('storiesTitle')}>
  {profileUser?<><button type="button" className={'profile-avatar profile-story-button '+(result.data.length?(result.data.some(story=>!story.viewed)?'has-unseen-stories':'has-seen-stories'):'')} disabled={!result.data.length} aria-label={t('storiesTitle')} onClick={()=>setSelected(result.data.find(story=>!story.viewed)||result.data[0])}><Avatar user={profileUser} className="profile-story-image"/></button>{ownerId===user.id&&<button type="button" className="profile-action mt-2" onClick={()=>setCreating(true)} aria-label={t('storyCreate')}><Plus size={16}/></button>}</>:<>
  <header className="sr-only"><h2>{t('storiesTitle')}</h2></header>
  {loading&&<p className="site-muted text-sm" role="status">{t('loading')}</p>}
  {error&&<div role="status" className="text-sm text-white/60"><p>{t('storyLoadError')}</p><button type="button" className="profile-action mt-2" onClick={()=>setVersion(value=>value+1)}>{t('collectionRetry')}</button></div>}
  {!loading&&!error&&result.data.length===0&&<p className="site-muted text-sm">{t('storiesEmpty')}</p>}
  <div className="story-rail">{(!ownerId||ownerId===user.id)&&<button type="button" className="story-author story-add" aria-label={t('storyCreate')} onClick={()=>setCreating(true)}><span className="relative"><Avatar user={user}/><Plus size={18}/></span><span>{t('storyCreate')}</span></button>}{groups.map(group=><button type="button" key={group.author.id} className={'story-author '+(group.stories.some(story=>!story.viewed)?'is-unseen':'')} onClick={()=>setSelected(group.stories.find(story=>!story.viewed)||group.stories[0])}><Avatar user={group.author}/><span>{group.author.username?'@'+group.author.username:group.author.nome}</span></button>)}</div>
  {result.total>result.limit&&<div className="mt-3 flex justify-between text-sm"><button type="button" disabled={page<=1||loading} onClick={()=>setPage(value=>value-1)}>{t('previous')}</button><span>{page}</span><button type="button" disabled={page*result.limit>=result.total||loading} onClick={()=>setPage(value=>value+1)}>{t('next')}</button></div>}
  </>}
  {creating&&<React.Suspense fallback={<p role="status">{t('loading')}</p>}><StoryComposer onClose={()=>setCreating(false)} onPublish={publishFile} busy={busy}/></React.Suspense>}
  {selected&&<SiteDialog title={t('storiesTitle')} onClose={()=>{setSelected(null);setDeleting(false);}} busy={busy}>
   <StoryProgress storyId={selected.id} paused={paused||busy||mediaError||Boolean(reply)||deleting||Boolean(viewers)} video={selected.mime.startsWith('video/')?video:null} onComplete={()=>{if(position<ordered.length-1)setSelected(ordered[position+1]);else setSelected(null);}}/>
   <button type="button" className="profile-action" aria-label={t(paused?'composerPlay':'composerPause')} onClick={()=>setPaused(value=>!value)}>{paused?<Play size={16}/>:<Pause size={16}/>}</button>
   <div className="my-4 flex items-center gap-3"><Avatar user={selected.author} className="h-9 w-9"/><Link to={profilePath(selected.author)}>{selected.author.username?'@'+selected.author.username:selected.author.nome}</Link>{selected.author.id===user.id&&<button type="button" className="profile-action ml-auto" aria-label={t('storyDelete')} onClick={()=>setDeleting(true)}><Trash2 size={16}/></button>}</div>
   <div className="story-view-stage" onTouchStart={event=>{if(event.target.closest('button,input,textarea,a,details'))return;const touch=event.touches[0];swipe.current={x:touch.clientX,y:touch.clientY};}} onTouchEnd={event=>{const start=swipe.current;swipe.current=null;if(!start||busy)return;const touch=event.changedTouches[0],dx=touch.clientX-start.x,dy=touch.clientY-start.y;if(Math.abs(dx)<50||Math.abs(dx)<Math.abs(dy))return;if(dx<0&&position<ordered.length-1)setSelected(ordered[position+1]);else if(dx>0&&position>0)setSelected(ordered[position-1]);}}>{mediaError?<p role="status" className="feed-empty">{t('storyUnavailable')}</p>:selected.mime.startsWith('video/')?<video ref={video} key={selected.id} className="story-media" style={mediaEffect(selected.composition?.effect,selected.composition?.intensity)} controls autoPlay playsInline preload="metadata" onEnded={()=>{if(position<ordered.length-1)setSelected(ordered[position+1]);else setSelected(null);}} poster={mediaUrl(selected.posterUrl)||undefined} src={mediaUrl(selected.mediaUrl)} onError={()=>setMediaError(true)}/>:<img key={selected.id} className="story-media" style={mediaEffect(selected.composition?.effect,selected.composition?.intensity)} src={mediaUrl(selected.mediaUrl)} alt={t('storyMediaAlt')} onError={()=>setMediaError(true)}/>}
   {!mediaError&&selected.composition&&<StoryElements key={selected.id} elements={fromComposition(selected.composition)} storyId={selected.id} isOwner={selected.author.id===user.id} onFocusChange={value=>setPaused(value)}/>}</div>
   {selected.author.id!==user.id&&<button type="button" className="profile-action mt-3" aria-pressed={selected.reaction==='heart'} disabled={busy||mediaError} onClick={()=>action(async key=>{const {data}=await storiesAPI.react(selected.id,selected.reaction!=='heart');if(context.current===key)setSelected(data);})}><Heart size={17} fill={selected.reaction==='heart'?'currentColor':'none'}/>{t('storyReact')}</button>}
   {selected.author.id!==user.id&&<form className="story-reply" onSubmit={event=>{event.preventDefault();if(!reply.trim()||busy)return;action(async()=>{const {data}=await conversationsAPI.create(selected.author.id);await conversationsAPI.send(data.id,{texto:reply.trim()});setReply('');toast.success(tr('composerReplySent'));});}}><input value={reply} onChange={event=>setReply(event.target.value)} maxLength={2000} aria-label={t('composerReply')} placeholder={t('composerReply')}/><button className="profile-action" type="submit" disabled={busy||!reply.trim()} aria-label={t('Enviar mensagem')}><Send size={16}/></button></form>}
   <div className="mt-4 flex items-center justify-between gap-3"><button type="button" className="profile-action" disabled={position<=0||busy} aria-label={t('previous')} onClick={()=>setSelected(ordered[position-1])}><ChevronLeft size={18}/></button><span className="text-sm">{Math.max(1,position+1)} / {Math.max(1,result.data.length)}{selected.viewCount!==undefined&&<button type="button" className="profile-action" onClick={()=>action(async()=>{const {data}=await storiesAPI.viewers(selected.id);setViewers(data);setPaused(true);})}>{t('storyViews',{count:selected.viewCount})}</button>}</span><button type="button" className="profile-action" disabled={position<0||position>=result.data.length-1||busy} aria-label={t('next')} onClick={()=>setSelected(ordered[position+1])}><ChevronRight size={18}/></button></div>
  </SiteDialog>}
  {viewers&&selected&&<SiteDialog title={t('composerViewers')} onClose={()=>setViewers(null)}><ul className="story-viewers">{viewers.data.map(row=><li key={row.id}>{row.user?<Link to={profilePath(row.user)}><Avatar user={row.user}/><span>{row.user.nome}{row.user.username&&<small>@{row.user.username}</small>}</span></Link>:t('notificationActorUnavailable')}</li>)}</ul>{viewers.total>viewers.limit&&<div className="flex justify-between"><button className="profile-action" disabled={viewers.page<=1||busy} onClick={()=>action(async()=>{const {data}=await storiesAPI.viewers(selected.id,{page:viewers.page-1});setViewers(data);})}>{t('previous')}</button><button className="profile-action" disabled={viewers.page*viewers.limit>=viewers.total||busy} onClick={()=>action(async()=>{const {data}=await storiesAPI.viewers(selected.id,{page:viewers.page+1});setViewers(data);})}>{t('next')}</button></div>}</SiteDialog>}
  {deleting&&selected&&<ConfirmDialog title={t('storyDelete')} description={t('storyDeleteHint')} busy={busy} onClose={()=>setDeleting(false)} onConfirm={()=>action(async key=>{await storiesAPI.remove(selected.id);if(context.current===key){setDeleting(false);setSelected(null);setVersion(value=>value+1);}})}/>}
 </section>;
}
