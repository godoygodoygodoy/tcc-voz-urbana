import React, { useEffect, useRef, useState } from 'react';
import { Award } from 'lucide-react';
import { participationAPI } from '../services/api';
import { getLanguage, useI18n } from '../i18n';
import { useAuthStore } from '../store';
import { createVisibilityPoller, retainEqual } from '../utils/polling';
import { subscribeSocialChanges } from '../utils/social';
export default function AchievementsPanel({ ownerId }) {
  const {t}=useI18n(),viewerId=useAuthStore(state=>state.user?.id);
  const [rows,setRows]=useState(null),[error,setError]=useState(false),[revision,setRevision]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();let active=true;setRows(null);setError(false);
    const load=async()=>{try{const{data}=await participationAPI.achievements(ownerId,{signal:controller.signal});if(!Array.isArray(data.data))throw new Error('Invalid achievements');if(active){setRows(current=>retainEqual(current,data.data));setError(false);}}catch{if(active)setError(true);}};
    const poller=createVisibilityPoller(load,60000,{immediate:true}),unsubscribe=subscribeSocialChanges(poller.refresh);
    return()=>{active=false;controller.abort();poller.dispose();unsubscribe();};
  },[ownerId,viewerId,revision]);
  return <section className="site-panel mt-6 rounded-3xl p-5" aria-labelledby="profile-achievements-title"><h2 id="profile-achievements-title" className="mb-4 flex items-center gap-2 text-xl font-bold"><Award size={20}/>{t('achievementsTitle')}</h2>
    {error&&<div role="status" className="site-muted text-sm"><p>{t('achievementsError')}</p><button type="button" className="profile-action mt-2" onClick={()=>setRevision(value=>value+1)}>{t('collectionRetry')}</button></div>}
    {!rows&&!error?<p role="status" className="site-muted">{t('loading')}</p>:rows?.length===0?<p className="site-muted text-sm">{t('achievementsEmpty')}</p>:rows&&<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{rows.map(row=><article key={row.code} className={'rounded-2xl border p-4 '+(row.unlockedAt?'border-violet-300/30 bg-violet-500/10':'border-white/10 text-white/45')}><Award size={24} className={row.unlockedAt?'mb-3 text-violet-200':'mb-3 text-white/30'}/><h3 className="font-bold">{t('achievementName'+row.code)}</h3><p className="mt-2 text-xs leading-relaxed">{t('achievementGoal'+row.code)}</p><p className="mt-3 text-xs">{row.unlockedAt?t('achievementUnlockedAt',{date:new Date(row.unlockedAt).toLocaleDateString(getLanguage())}):t('achievementLocked')}</p></article>)}</div>}
  </section>;
}
