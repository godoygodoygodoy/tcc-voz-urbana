export const ACTIVITY_EVENT = 'voz-urbana:activity';
let connected = false;
export const isActivityConnected = () => connected;
export const setActivityConnected = value => { connected = value; };
export const subscribeActivityChanges = callback => {
  window.addEventListener(ACTIVITY_EVENT, callback);
  return () => window.removeEventListener(ACTIVITY_EVENT, callback);
};

export const notifyActivityChange = (kind = 'READ') => window.dispatchEvent(new CustomEvent(ACTIVITY_EVENT,{detail:{kind}}));
