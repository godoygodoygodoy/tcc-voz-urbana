import React, { useEffect, useRef, useState } from 'react';
import { notificationsAPI } from '../services/api';
import { translate as tr, useI18n } from '../i18n';
import { toast } from './LocalizedToast';
export default function NotificationPreferences() {
  const { t }=useI18n();const [items,setItems]=useState(null),[error,setError]=useState(false),[saving,setSaving]=useState(false);const pending=useRef(false);
  useEffect(()=>{let active=true;notificationsAPI.preferences().then(({data})=>{if(!Array.isArray(data.preferences))throw new Error('Invalid preferences');if(active)setItems(data.preferences);}).catch(()=>{if(active)setError(true);});return()=>{active=false;};},[]);
  const change=async(type,enabled)=>{
    if(pending.current)return;pending.current=true;setSaving(true);const previous=items;setItems(current=>current.map(item=>item.type===type?{...item,enabled}:item));
    try {const {data}=await notificationsAPI.updatePreferences([{type,enabled}]);if(!Array.isArray(data.preferences))throw new Error('Invalid preferences');setItems(data.preferences);toast.success(tr('notificationPreferencesSaved'));}
    catch(error){setItems(previous);toast.error(error.response?.data?.error||tr('notificationPreferencesError'));}
    finally{pending.current=false;setSaving(false);}
  };
  return <section className="mt-8 border-t border-white/10 pt-6" aria-labelledby="notification-preferences-title"><h2 id="notification-preferences-title" className="mb-4 text-xl font-bold">{t('notificationPreferencesTitle')}</h2>{error?<p role="status" className="site-muted text-sm">{t('notificationPreferencesError')}</p>:!items?<p role="status">{t('loading')}</p>:<fieldset disabled={saving} className="grid gap-3 sm:grid-cols-2"><legend className="sr-only">{t('notificationPreferencesTitle')}</legend>{items.map(item=><label key={item.type} className="flex items-center gap-3 rounded-xl border border-white/10 p-3 text-sm"><input type="checkbox" checked={item.enabled} onChange={event=>change(item.type,event.target.checked)}/>{t('notificationType'+item.type)}</label>)}</fieldset>}</section>;
}
