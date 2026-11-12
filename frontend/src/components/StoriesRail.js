import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import { storiesAPI, mediaUrl } from '../services/api';
import { translate as tr, useI18n } from '../i18n';
import { useAuthStore } from '../store';
import { createVisibilityPoller, retainEqual } from '../utils/polling';
import { profilePath } from '../utils/profileLinks';
import Avatar from './Avatar';
import SiteDialog, { ConfirmDialog } from './SiteDialog';
import { UploadField, FloatingSelect } from './FloatingFields';
import { toast } from './LocalizedToast';
export default function StoriesRail({ ownerId }) {
 const { t }=useI18n(),user=useAuthStore(state=>state.user);
 const [result,setResult]=useState({data:[],total:0,page:1,limit:30}),[page,setPage]=useState(1),[error,setError]=useState(false);
 const [loading,setLoading]=useState(true),[creating,setCreating]=useState(false),[files,setFiles]=useState([]),[audience,setAudience]=useState('SEGUIDORES');
 const [busy,setBusy]=useState(false),[selected,setSelected]=useState(null),[deleting,setDeleting]=useState(false),[mediaError,setMediaError]=useState(false),[version,setVersion]=useState(0);
 const working=useRef(false),context=useRef('');context.current=[ownerId,user?.id].join(':');
 useEffect(()=>{setPage(1);setSelected(null);setFiles([]);setCreating(false);},[ownerId,user?.id]);
 useEffect(()=>{
  if(!user)return undefined;const controller=new AbortController();let active=true;setLoading(true);
  const refresh=async()=>{try{const{data}=await storiesAPI.list({page,owner:ownerId},{signal:controller.signal});if(!Array.isArray(data?.data))throw new Error('Invalid story list');if(active){setResult(current=>retainEqual(current,data));setError(false);}}catch{if(active)setError(true);}finally{if(active)setLoading(false);}};
  const poller=createVisibilityPoller(refresh,30000,{immediate:true});return()=>{active=false;controller.abort();poller.dispose();};
 },[ownerId,user?.id,page,version]);
 useEffect(()=>{
  if(!selected)return undefined;let active=true;setMediaError(false);
  storiesAPI.view(selected.id).then(({data})=>{if(!active)return;setSelected(current=>current?.id===data.id?data:current);setResult(current=>({...current,data:current.data.map(item=>item.id===data.id?data:item)}));}).catch(error=>{if(active){setMediaError(true);toast.error(error.response?.data?.error||tr('storyUnavailable'));}});
  return()=>{active=false;};
 },[selected?.id]);
 useEffect(()=>{
  if(!selected)return undefined;
  const timer=setTimeout(()=>{setMediaError(true);setResult(current=>({...current,data:current.data.filter(story=>story.id!==selected.id)}));},Math.max(0,new Date(selected.expiresAt).getTime()-Date.now()));
  return()=>clearTimeout(timer);
 },[selected?.id,selected?.expiresAt]);
 const groups=useMemo(()=>{const authors=new Map();for(const story of result.data){const group=authors.get(story.author.id)||{author:story.author,stories:[]};group.stories.push(story);authors.set(story.author.id,group);}return[...authors.values()];},[result.data]);
 const action=async operation=>{if(working.current)return;working.current=true;setBusy(true);const key=context.current;try{await operation(key);}catch(error){toast.error(error.response?.data?.error||tr('storySaveError'));}finally{working.current=false;setBusy(false);}};
 const publish=event=>{event.preventDefault();if(!files[0])return;action(async key=>{const body=new FormData();body.append('file',files[0]);body.append('audience',audience);await storiesAPI.publish(body);if(context.current===key){setFiles([]);setCreating(false);setPage(1);setVersion(value=>value+1);toast.success(tr('storyPublished'));}});};
 const position=result.data.findIndex(story=>story.id===selected?.id);
 if(!user)return null;
 return <section className="stories-panel site-panel rounded-3xl p-4" aria-label={t('storiesTitle')}>
  <header className="mb-3 flex items-center justify-between gap-3"><h2 className="font-bold">{t('storiesTitle')}</h2>{(!ownerId||ownerId===user.id)&&<button type="button" className="profile-action" onClick={()=>setCreating(true)}><Plus size={16}/>{t('storyCreate')}</button>}</header>
  {loading&&<p className="site-muted text-sm" role="status">{t('loading')}</p>}
  {error&&<div role="status" className="text-sm text-white/60"><p>{t('storyLoadError')}</p><button type="button" className="profile-action mt-2" onClick={()=>setVersion(value=>value+1)}>{t('collectionRetry')}</button></div>}
  {!loading&&!error&&result.data.length===0&&<p className="site-muted text-sm">{t('storiesEmpty')}</p>}
  <div className="story-rail">{groups.map(group=><button type="button" key={group.author.id} className={'story-author '+(group.stories.some(story=>!story.viewed)?'is-unseen':'')} onClick={()=>setSelected(group.stories.find(story=>!story.viewed)||group.stories[0])}><Avatar user={group.author}/><span>{group.author.username?'@'+group.author.username:group.author.nome}</span></button>)}</div>
  {result.total>result.limit&&<div className="mt-3 flex justify-between text-sm"><button type="button" disabled={page<=1||loading} onClick={()=>setPage(value=>value-1)}>{t('previous')}</button><span>{page}</span><button type="button" disabled={page*result.limit>=result.total||loading} onClick={()=>setPage(value=>value+1)}>{t('next')}</button></div>}
  {creating&&<SiteDialog title={t('storyCreate')} onClose={()=>setCreating(false)} busy={busy}><form className="mt-5 space-y-4" onSubmit={publish}><p className="text-sm text-white/60">{t('storyUploadHint')}</p><UploadField accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm" files={files} maxFiles={1} maxSizeMb={20} label={t('storyChooseMedia')} onChange={event=>{const next=Array.from(event.target.files||[]).slice(0,1);if(next[0]&&next[0].size>(next[0].type.startsWith('video/')?20:5)*1024*1024){toast.error(t('mediaTooLarge'));return;}setFiles(next);}}/><label className="block text-sm">{t('storyAudience')}<FloatingSelect value={audience} onChange={setAudience} options={['PUBLICO','SEGUIDORES','AMIGOS','SO_EU'].map(value=>({value,label:t('storyAudience'+value)}))}/></label><button type="submit" className="profile-action profile-action--primary" disabled={busy||!files.length}>{t(busy?'saving':'storyPublish')}</button></form></SiteDialog>}
  {selected&&<SiteDialog title={t('storiesTitle')} onClose={()=>{setSelected(null);setDeleting(false);}} busy={busy}>
   <div className="my-4 flex items-center gap-3"><Avatar user={selected.author} className="h-9 w-9"/><Link to={profilePath(selected.author)}>{selected.author.username?'@'+selected.author.username:selected.author.nome}</Link>{selected.author.id===user.id&&<button type="button" className="profile-action ml-auto" aria-label={t('storyDelete')} onClick={()=>setDeleting(true)}><Trash2 size={16}/></button>}</div>
   {mediaError?<p role="status" className="feed-empty">{t('storyUnavailable')}</p>:selected.mime.startsWith('video/')?<video key={selected.id} className="story-media" controls playsInline preload="metadata" poster={mediaUrl(selected.posterUrl)||undefined} src={mediaUrl(selected.mediaUrl)} onError={()=>setMediaError(true)}/>:<img key={selected.id} className="story-media" src={mediaUrl(selected.mediaUrl)} alt={t('storyMediaAlt')} onError={()=>setMediaError(true)}/>}
   <div className="mt-4 flex items-center justify-between gap-3"><button type="button" className="profile-action" disabled={position<=0||busy} aria-label={t('previous')} onClick={()=>setSelected(result.data[position-1])}><ChevronLeft size={18}/></button><span className="text-sm">{position+1} / {result.data.length}{selected.viewCount!==undefined&&<small className="block">{t('storyViews',{count:selected.viewCount})}</small>}</span><button type="button" className="profile-action" disabled={position<0||position>=result.data.length-1||busy} aria-label={t('next')} onClick={()=>setSelected(result.data[position+1])}><ChevronRight size={18}/></button></div>
  </SiteDialog>}
  {deleting&&selected&&<ConfirmDialog title={t('storyDelete')} description={t('storyDeleteHint')} busy={busy} onClose={()=>setDeleting(false)} onConfirm={()=>action(async key=>{await storiesAPI.remove(selected.id);if(context.current===key){setDeleting(false);setSelected(null);setVersion(value=>value+1);}})}/>}
 </section>;
}
