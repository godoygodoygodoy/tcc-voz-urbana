import React, { useEffect, useState } from 'react';
import { Bell, CheckCheck } from 'lucide-react';
import { notificationsAPI } from '../services/api';

const NotificationBell = () => {
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(false);

  const load = async () => {
    try {
      const response = await notificationsAPI.list();
      setItems(response.data || []);
    } catch (error) {
      setItems([]);
    }
  };

  useEffect(() => { load(); }, []);

  const unread = items.filter((item) => !item.lida).length;
  const markAll = async () => {
    await notificationsAPI.markAllRead();
    setItems((current) => current.map((item) => ({ ...item, lida: true })));
  };

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)} className="relative rounded-full p-2 text-white/70 transition hover:bg-white/10 hover:text-white" aria-label="Notificações">
        <Bell className="h-5 w-5" />
        {unread > 0 && <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-violet-500 px-1 text-[10px] font-bold text-white">{unread}</span>}
      </button>
      {open && <div className="absolute right-0 top-full z-[100] mt-3 w-80 rounded-2xl border border-white/10 bg-[#202326] p-3 text-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 pb-2"><strong>Notificações</strong><button type="button" onClick={markAll} className="text-xs text-violet-200"><CheckCheck className="mr-1 inline h-3 w-3" />Ler todas</button></div>
        <div className="max-h-72 overflow-auto py-2">{items.length === 0 ? <p className="py-5 text-center text-sm text-white/50">Nenhuma notificação</p> : items.map((item) => <div key={item.id} className={`rounded-xl p-3 text-sm ${item.lida ? 'text-white/55' : 'bg-white/8 text-white'}`}><strong>{item.titulo}</strong><p className="mt-1">{item.mensagem}</p></div>)}</div>
      </div>}
    </div>
  );
};

export default NotificationBell;
