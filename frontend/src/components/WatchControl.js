import React, { useEffect, useRef, useState } from 'react';
import { Bell, BellOff } from 'lucide-react';
import { participationAPI } from '../services/api';
import { translate as tr, useI18n } from '../i18n';
import { useAuthStore } from '../store';
import { notifySocialChange } from '../utils/social';
import { toast } from './LocalizedToast';
export default function WatchControl({ problemId }) {
  const {t}=useI18n(),userId=useAuthStore(state=>state.user?.id),openAuthModal=useAuthStore(state=>state.openAuthModal);
  const [watching,setWatching]=useState(false),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(false),pending=useRef(false),context=useRef('');context.current=[problemId,userId].join(':');
  useEffect(()=>{const controller=new AbortController();setLoading(true);participationAPI.watching(problemId,{signal:controller.signal}).then(({data})=>{if(typeof data.watching!=='boolean')throw new Error('Invalid watch state');if(!controller.signal.aborted){setWatching(data.watching);setError(false);}}).catch(()=>{if(!controller.signal.aborted)setError(true);}).finally(()=>{if(!controller.signal.aborted)setLoading(false);});return()=>controller.abort();},[problemId,userId]);
  const change=async()=>{
    if(!userId){openAuthModal('login');return;}if(pending.current)return;pending.current=true;setBusy(true);const previous=watching,key=context.current;setWatching(!previous);
    try{const{data}=await participationAPI.watch(problemId,!previous);if(typeof data.watching!=='boolean')throw new Error('Invalid watch state');if(context.current===key){setWatching(data.watching);setError(false);notifySocialChange();toast.success(tr(data.watching?'watchEnabled':'watchDisabled'));}}
    catch(error){if(context.current===key)setWatching(previous);toast.error(error.response?.data?.error||tr('watchError'));}
    finally{pending.current=false;setBusy(false);}
  };
  return <div className="mt-5"><button type="button" className="profile-action" disabled={loading||busy} aria-pressed={watching} onClick={change}>{watching?<BellOff size={16}/>:<Bell size={16}/>} {t(loading?'loading':watching?'watchStop':'watchStart')}</button><p className="site-muted mt-2 text-xs" role={error?'status':undefined}>{t(error?'watchError':'watchHint')}</p></div>;
}
