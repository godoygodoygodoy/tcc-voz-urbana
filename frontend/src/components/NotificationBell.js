import { useNavigate } from 'react-router-dom';
import { createVisibilityPoller, retainEqual } from '../utils/polling';
import { isActivityConnected, subscribeActivityChanges } from '../utils/activity';
import { translateSystemText, useI18n } from '../i18n';
import React, { useEffect, useRef, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { notificationsAPI } from '../services/api';
import { useAuthStore } from '../store';
import { toast } from './LocalizedToast';
export default function NotificationBell() {
  const navigate = useNavigate(), userId = useAuthStore(state=>state.user?.id);
  const [items,setItems] = useState([]), [unread,setUnread] = useState(0), [open,setOpen] = useState(false);
  const {t} = useI18n(), refresh = useRef(()=>{}), requestSequence = useRef(0);
  useEffect(()=>{
    let active=true,lastLoaded=0;++requestSequence.current;setItems([]);setUnread(0);
    const load=async()=>{
      if(!active||document.hidden)return;
      const sequence=++requestSequence.current;
      try {const{data}=await notificationsAPI.list({paginated:'true',page:1});if(!active||sequence!==requestSequence.current)return;
        const rows=Array.isArray(data)?data:data.data||[];
        setItems(current=>retainEqual(current,rows));setUnread(Array.isArray(data)?rows.filter(row=>!row.lida).length:data.unread||0);lastLoaded=Date.now();
      }catch{ /* Preserve loaded notifications on a transient failure. */ }
    };
    refresh.current=load;
    const poller=createVisibilityPoller(()=>isActivityConnected()&&Date.now()-lastLoaded<60000?undefined:load(),15000,{immediate:true});
    const unsubscribe=subscribeActivityChanges(load);
    return()=>{active=false;++requestSequence.current;poller.dispose();unsubscribe();};
  },[userId]);
  const markAll=async()=>{
    const sequence=++requestSequence.current;
    try {const {data}=await notificationsAPI.markAllRead();if(sequence===requestSequence.current){setItems(current=>current.map(item=>({...item,lida:true})));setUnread(data.unread??0);}void refresh.current();}
    catch(error){toast.error(error.response?.data?.error||t('notificationReadError'));}
  };
  const openItem=async item=>{
    if(!item.lida){const sequence=++requestSequence.current;try{const {data}=await notificationsAPI.markRead(item.id);setItems(current=>current.map(row=>row.id===item.id?{...row,lida:true}:row));if(sequence===requestSequence.current)setUnread(data.unread??0);void refresh.current();}catch(error){toast.error(error.response?.data?.error||t('notificationReadError'));}}
    if(item.link?.startsWith('/')&&!item.link.startsWith('//')){setOpen(false);navigate(item.link);}
  };
  return <div className="relative">
    <button type="button" onClick={()=>{setOpen(value=>!value);if(!open)refresh.current();}} className="relative rounded-full p-2 text-white/70 transition hover:bg-white/10 hover:text-white" aria-label={t('notifications')} aria-expanded={open}>
      <Bell className="h-5 w-5"/>{unread>0&&<span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-violet-500 px-1 text-[10px] font-bold text-white">{unread>99?'99+':unread}</span>}
    </button>
    {open&&<div className="absolute right-0 top-full z-[100] mt-3 w-80 max-w-[calc(100vw-24px)] rounded-2xl border border-white/10 bg-[#202326] p-3 text-white shadow-2xl" onKeyDown={event=>{if(event.key==='Escape')setOpen(false);}}>
      <div className="flex items-center justify-between border-b border-white/10 pb-2"><strong>{t('notifications')}</strong><button type="button" onClick={markAll} className="text-xs text-violet-200"><CheckCheck className="mr-1 inline h-3 w-3"/>{t('markAllRead')}</button></div>
      <div className="context-scroll max-h-72 overflow-auto py-2">{items.length===0?<p className="py-5 text-center text-sm text-white/50">{t('noNotifications')}</p>:items.map(item=><button type="button" key={item.id} onClick={()=>openItem(item)} className={'block w-full rounded-xl p-3 text-left text-sm '+(item.lida?'text-white/55':'bg-white/8 text-white')}><strong>{translateSystemText(item.titulo)}</strong><p className="mt-1">{translateSystemText(item.mensagem)}</p></button>)}</div>
      <button type="button" className="profile-action w-full justify-center" onClick={()=>{setOpen(false);navigate('/feed#notifications');}}>{t('activityViewAll')}</button>
    </div>}
  </div>;
}
