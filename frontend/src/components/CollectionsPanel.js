import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Folder, Lock, Pencil, Plus, Trash2 } from 'lucide-react';
import { collectionsAPI, savedAPI } from '../services/api';
import { translate as tr, useI18n } from '../i18n';
import { useAuthStore } from '../store';
import { FloatingSelect } from './FloatingFields';
import { ConfirmDialog } from './SiteDialog';
import { toast } from './LocalizedToast';

export default function CollectionsPanel({ ownerId, savedPosts, renderPost }) {
  const { t } = useI18n(), user = useAuthStore(state => state.user), own = user?.id === ownerId;
  const [listing,setListing] = useState({ data:[],page:1,total:0,limit:30 });
  const [page,setPage] = useState(1), [selected,setSelected] = useState(null), [detail,setDetail] = useState(null);
  const [itemPage,setItemPage] = useState(1), [editing,setEditing] = useState(null), [deleting,setDeleting] = useState(null);
  const [busy,setBusy] = useState(false), [loading,setLoading] = useState(true), [error,setError] = useState(false);
  const [saved,setSaved] = useState([]), [problemId,setProblemId] = useState(''), [version,setVersion] = useState(0);
  const pending = useRef(false), active = useRef(''); active.current = ownerId;
  const refresh = () => setVersion(value => value + 1);
  useEffect(() => { setPage(1);setSelected(null);setDetail(null);setEditing(null);setDeleting(null); },[ownerId]);
  useEffect(() => {
    const controller = new AbortController(); setLoading(true);setError(false);
    const request = own ? collectionsAPI.list({page}, {signal:controller.signal}) : collectionsAPI.publicList(ownerId,{page},{signal:controller.signal});
    request.then(({data})=>{if(!Array.isArray(data?.data))throw new Error('Invalid collection response');if(!controller.signal.aborted)setListing(data);}).catch(()=>{if(!controller.signal.aborted)setError(true);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[own,ownerId,page,version]);
  useEffect(() => {
    setDetail(null); if(!selected)return undefined;
    const controller = new AbortController();
    collectionsAPI.get(selected,{page:itemPage},{signal:controller.signal}).then(({data})=>{if(!Array.isArray(data?.data))throw new Error('Invalid collection response');if(!controller.signal.aborted)setDetail(data);})
      .catch(error=>{if(!controller.signal.aborted){setDetail({error:true});toast.error(error.response?.data?.error||tr('collectionLoadError'));}});
    return()=>controller.abort();
  },[selected,itemPage,version]);
  useEffect(() => {
    if(!own)return undefined;
    if(savedPosts){setSaved(savedPosts);return undefined;}
    let live=true;savedAPI.list().then(({data})=>{if(live)setSaved(data||[]);}).catch(()=>{});
    return()=>{live=false;};
  },[own,ownerId,savedPosts,version]);
  const mutate = useCallback(async (operation, success) => {
    if(pending.current)return; pending.current=true;setBusy(true);const owner=ownerId;
    try {await operation();if(active.current===owner){success?.();refresh();}}
    catch(error){toast.error(error.response?.data?.error||tr('collectionSaveError'));}
    finally{pending.current=false;setBusy(false);}
  },[ownerId]);
  const submit = event => {event.preventDefault();mutate(()=>editing.id?collectionsAPI.update(editing.id,editing):collectionsAPI.create(editing),()=>setEditing(null));};
  return <section className="collection-panel site-panel rounded-3xl p-5" aria-labelledby="collections-heading">
    <header className="flex flex-wrap items-center justify-between gap-3"><h2 id="collections-heading" className="flex items-center gap-2 text-xl font-bold"><Folder size={20}/>{t('collectionsTitle')}</h2>{own&&<button type="button" className="profile-action" disabled={busy} onClick={()=>setEditing({name:'',private:true})}><Plus size={16}/>{t('collectionCreate')}</button>}</header>
    {editing&&<form onSubmit={submit} className="mt-5 space-y-3"><label className="block text-sm">{t('collectionName')}<input autoFocus className="site-form-input mt-2 w-full rounded-xl p-3" value={editing.name} maxLength={80} required onChange={event=>setEditing(current=>({...current,name:event.target.value}))}/></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={editing.private} onChange={event=>setEditing(current=>({...current,private:event.target.checked}))}/>{t('collectionPrivate')}</label><div className="flex gap-3"><button disabled={busy||!editing.name.trim()} type="submit" className="profile-action profile-action--primary">{t(busy?'saving':'save')}</button><button type="button" disabled={busy} className="profile-action" onClick={()=>setEditing(null)}>{t('Cancelar')}</button></div></form>}
    {loading?<p role="status" className="site-muted my-5">{t('loading')}</p>:error?<div role="alert" className="my-5"><p>{t('collectionLoadError')}</p><button type="button" className="profile-action mt-3" onClick={refresh}>{t('collectionRetry')}</button></div>:<>
      <div className="my-5 grid gap-3 sm:grid-cols-2">{listing.data.map(collection=><div key={collection.id} className="flex min-w-0 items-center gap-2 rounded-xl border border-white/10 p-3"><button type="button" aria-pressed={selected===collection.id} className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={()=>{setSelected(collection.id);setItemPage(1);}}>{collection.private&&<Lock size={14}/>}<span className="break-words">{collection.name}</span></button>{own&&<><button type="button" className="profile-action" aria-label={t('collectionRename')} onClick={()=>setEditing(collection)}><Pencil size={14}/></button><button type="button" className="profile-action" aria-label={t('collectionDelete')} onClick={()=>setDeleting(collection)}><Trash2 size={14}/></button></>}</div>)}</div>
      {listing.data.length===0&&<p className="site-muted my-5">{t('collectionsEmpty')}</p>}
      {listing.total>listing.limit&&<div className="flex gap-3"><button type="button" disabled={page<=1||busy} onClick={()=>setPage(value=>value-1)}>{t('previous')}</button><span>{page}</span><button type="button" disabled={page*listing.limit>=listing.total||busy} onClick={()=>setPage(value=>value+1)}>{t('next')}</button></div>}
    </>}
    {selected&&<div className="mt-5 border-t border-white/10 pt-5">
      {!detail?<p role="status">{t('loading')}</p>:detail.error?<p role="alert">{t('collectionLoadError')}</p>:<><h3 className="mb-4 text-lg font-bold">{detail.name} ({detail.total})</h3>{own&&<form className="mb-5 flex flex-wrap gap-3" onSubmit={event=>{event.preventDefault();if(problemId)mutate(()=>collectionsAPI.add(selected,problemId),()=>setProblemId(''));}}><label className="min-w-0 flex-1 text-sm">{t('collectionAdd')}<FloatingSelect value={problemId} onChange={setProblemId} options={[{value:'',label:t('collectionSelectPost')},...saved.map(post=>({value:post.id,label:post.title}))]}/></label><button type="submit" disabled={busy||!problemId} className="profile-action">{t('collectionAdd')}</button></form>}
      {detail.data.length===0?<p className="site-muted">{t('collectionItemsEmpty')}</p>:<div className="space-y-5">{detail.data.map(post=><div key={post.id}>{renderPost?renderPost(post):<Link to={'/problem/'+post.id} className="feed-post block p-4"><h4 className="font-bold">{post.title}</h4><p className="mt-2 text-sm text-white/65">{post.description}</p></Link>}{own&&<button type="button" disabled={busy} className="profile-action mt-2" onClick={()=>mutate(()=>collectionsAPI.removeItem(selected,post.id))}>{t('collectionRemoveItem')}</button>}</div>)}</div>}
      {detail.total>detail.limit&&<div className="mt-4 flex justify-between"><button type="button" disabled={itemPage<=1||busy} onClick={()=>setItemPage(value=>value-1)}>{t('previous')}</button><span>{itemPage}</span><button type="button" disabled={itemPage*detail.limit>=detail.total||busy} onClick={()=>setItemPage(value=>value+1)}>{t('next')}</button></div>}</>}
    </div>}
    {deleting&&<ConfirmDialog title={t('collectionDelete')} description={t('collectionDeleteHint')} busy={busy} onClose={()=>setDeleting(null)} onConfirm={()=>mutate(()=>collectionsAPI.remove(deleting.id),()=>{if(selected===deleting.id)setSelected(null);setDeleting(null);})}/>}
  </section>;
}
