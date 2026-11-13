import { EventEmitter } from 'node:events';
const events = new EventEmitter();
export const activityListeners = userId => events.listenerCount('user:' + userId);
export const subscribeActivity = (userId, listener) => {
  const key = 'user:' + userId; events.on(key, listener);
  return () => events.off(key, listener);
};
export const publishActivity = (userId, kind) => events.emit('user:' + userId, { kind, at: new Date().toISOString() });
