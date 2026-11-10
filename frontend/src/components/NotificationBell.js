import React, { useEffect, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { notificationsAPI } from '../services/api';
import { useI18n } from '../i18n';
import { toast } from 'react-toastify';

const NotificationBell = () => {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);
  const { t } = useI18n();

  const load = async () => {
    try {
      const response = await notificationsAPI.list();
      setItems(response.data || []);
    } catch (error) {
      setItems([]);
    }
  };

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 15000);
    return () => window.clearInterval(timer);
  }, []);

  const unread = items.filter((item) => !item.lida).length;
  const markAll = async () => {
    try {
      await notificationsAPI.markAllRead();
      setItems((current) => current.map((item) => ({ ...item, lida: true })));
    } catch (error) {
      toast.error(error.response?.data?.error || 'Não foi possível marcar as notificações como lidas.');
    }
  };

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)} className="relative rounded-full p-2 text-white/70 transition hover:bg-white/10 hover:text-white" aria-label={t('notifications')}>
        <Bell className="h-5 w-5" />
        {unread > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-violet-500 px-1 text-[10px] font-bold text-white">{unread}</span>}
      </button>
      {open && <div className="absolute right-0 top-full z-[100] mt-3 w-80 rounded-2xl border border-white/10 bg-[#202326] p-3 text-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-2"><strong>{t('notifications')}</strong><button type="button" onClick={markAll} className="text-xs text-violet-200"><CheckCheck className="mr-1 inline h-3 w-3" />{t('markAllRead')}</button></div>
        <div className="context-scroll max-h-72 overflow-auto py-2">{items.length === 0 ? <p className="py-5 text-center text-sm text-white/50">{t('noNotifications')}</p> : items.map((item) => <button type="button" key={item.id} onClick={async () => { if (!item.lida) { await notificationsAPI.markRead(item.id); setItems((current) => current.map((entry) => entry.id === item.id ? { ...entry, lida: true } : entry)); } if (item.link) window.location.href = `${import.meta.env.BASE_URL.replace(/\/$/, '')}${item.link}`; }} className={`block w-full rounded-xl p-3 text-left text-sm ${item.lida ? 'text-white/55' : 'bg-white/8 text-white'}`}><strong>{item.titulo}</strong><p className="mt-1">{item.mensagem}</p></button>)}</div>
      </div>}
    </div>
  );
};

export default NotificationBell;
