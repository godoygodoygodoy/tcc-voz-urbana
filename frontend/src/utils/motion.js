import { useSyncExternalStore } from 'react';

const callbacks = new Set();
const listeners = new Set();
let frame = 0;
let listening = false;
let mediaQuery;
let snapshot;
const read = () => ({
  hidden: typeof document !== 'undefined' && document.hidden,
  reduced: typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches,
  lowPower: typeof navigator !== 'undefined' && (navigator.connection?.saveData || (navigator.deviceMemory && navigator.deviceMemory <= 4) || navigator.hardwareConcurrency <= 4 || (typeof innerWidth !== 'undefined' && innerWidth < 640)),
});
const getSnapshot = () => snapshot || (snapshot = read());
const requestTick = () => { if (!frame && callbacks.size && !getSnapshot().hidden) frame = requestAnimationFrame(tick); };
function tick(time) {
  frame = 0;
  for (const entry of [...callbacks]) {
    if (!callbacks.has(entry) || (entry.last != null && time - entry.last < 1000 / entry.fps - .5)) continue;
    const delta = entry.last == null ? 1 / entry.fps : Math.min(.1, (time - entry.last) / 1000);
    entry.last = time;
    if (entry.callback(time, delta) === false) callbacks.delete(entry);
  }
  requestTick();
  unlisten();
}
const update = () => {
  const next = read(), previous = getSnapshot();
  if (next.hidden) { cancelAnimationFrame(frame); frame = 0; }
  else { for (const entry of callbacks) entry.last = null; }
  if (typeof document !== 'undefined') {
    document.documentElement.classList.toggle('is-page-hidden', next.hidden);
    document.documentElement.classList.toggle('is-motion-reduced', next.reduced);
    document.documentElement.dataset.motionBudget = next.lowPower ? 'low' : 'normal';
  }
  if (Object.keys(next).some(key => next[key] !== previous[key])) { snapshot = next; listeners.forEach(listener => listener()); }
  requestTick();
};
const listen = () => {
  if (listening || typeof window === 'undefined') return;
  listening = true;
  document.addEventListener('visibilitychange', update);
  mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  mediaQuery.addEventListener?.('change', update);
  window.addEventListener('resize', update, { passive: true });
  update();
};
const unlisten = () => {
  if (!listening || callbacks.size || listeners.size) return;
  document.removeEventListener('visibilitychange', update);
  mediaQuery?.removeEventListener?.('change', update);
  window.removeEventListener('resize', update);
  listening = false;
};
const subscribeBudget = listener => {
  listeners.add(listener); listen();
  return () => { listeners.delete(listener); unlisten(); };
};
export const subscribeAnimation = (callback, fps = 60) => {
  listen();
  const entry = { callback, fps, last: null };
  callbacks.add(entry);requestTick();
  return () => { callbacks.delete(entry); if (!callbacks.size) { cancelAnimationFrame(frame); frame = 0; } unlisten(); };
};
export const useMotionBudget = () => useSyncExternalStore(subscribeBudget, getSnapshot, getSnapshot);
