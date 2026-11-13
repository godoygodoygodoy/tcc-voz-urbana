import { useEffect } from 'react';
import api, { notificationsAPI } from '../services/api';
import { useAuthStore } from '../store';
import { ACTIVITY_EVENT, setActivityConnected } from '../utils/activity';
import { SOCIAL_CHANGE_EVENT } from '../utils/social';
export default function ActivityConnection() {
  const userId = useAuthStore(state => state.user?.id), token = useAuthStore(state => state.token);
  useEffect(() => {
    if (!userId || !token) return undefined;
    let stopped = false, controller, timer, connecting = false, retry = 3000;
    const connect = async () => {
      if (stopped || document.hidden || connecting) return;
      connecting = true;controller = new AbortController();
      try {
        const response = await fetch(api.defaults.baseURL + '/notifications/stream', { headers: { Authorization: 'Bearer ' + token, Accept: 'text/event-stream' }, signal: controller.signal });
        if (!response.ok || !response.headers.get('content-type')?.includes('text/event-stream') || !response.body) throw new Error('Activity stream unavailable');
        const reader = response.body.getReader(), decoder = new TextDecoder();let buffer = '';
        while (!stopped) {
          const { value, done } = await reader.read();if (done || stopped) break;
          buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n');
          if (buffer.length > 65536) throw new Error('Invalid activity frame');
          let end;
          while ((end = buffer.indexOf('\n\n')) !== -1) {
            const frame = buffer.slice(0,end);buffer = buffer.slice(end+2);
            const lines = frame.split('\n'), event = lines.find(line=>line.startsWith('event:'))?.slice(6).trim();
            const serverRetry = lines.find(line=>line.startsWith('retry:'))?.slice(6).trim();
            if (serverRetry && Number.isFinite(Number(serverRetry))) retry = Math.max(3000,Math.min(60000,Number(serverRetry)));
            if (event === 'ready') { setActivityConnected(true); notificationsAPI.invalidate(); window.dispatchEvent(new CustomEvent(ACTIVITY_EVENT,{detail:{kind:'SYNC'}})); }
            if (event === 'activity') {
              try {
                const data = JSON.parse(lines.filter(line=>line.startsWith('data:')).map(line=>line.slice(5).trim()).join('\n'));
                notificationsAPI.invalidate();
                window.dispatchEvent(new CustomEvent(ACTIVITY_EVENT,{detail:data}));
                if (['NOVO_SEGUIDOR','SEGUIR_SOLICITACAO','SEGUIR_ACEITA','STATUS','ACOMPANHAMENTO','CONQUISTA'].includes(data.kind)) window.dispatchEvent(new Event(SOCIAL_CHANGE_EVENT));
              } catch { /* Malformed frames do not expose raw server messages. */ }
            }
          }
        }
      } catch { /* Polling remains available when a proxy cannot stream events. */ }
      finally {
        connecting = false;controller?.abort();if(!stopped)setActivityConnected(false);
        if (!stopped && !document.hidden) timer = setTimeout(connect,retry);
      }
    };
    const visibility = () => { clearTimeout(timer);if(document.hidden){controller?.abort();setActivityConnected(false);}else connect(); };
    document.addEventListener('visibilitychange',visibility);connect();
    return()=>{stopped=true;clearTimeout(timer);controller?.abort();setActivityConnected(false);document.removeEventListener('visibilitychange',visibility);};
  },[userId,token]);
  return null;
}
