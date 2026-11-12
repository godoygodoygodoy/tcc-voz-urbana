export const SOCIAL_CHANGE_EVENT = 'voz-urbana:social-changed';
export const notifySocialChange = () => {
  window.dispatchEvent(new Event(SOCIAL_CHANGE_EVENT));
  try { localStorage.setItem(SOCIAL_CHANGE_EVENT, `${Date.now()}-${Math.random()}`); } catch { /* Storage is optional. */ }
};
export const subscribeSocialChanges = (refresh) => {
  const storage = (event) => { if (event.key === SOCIAL_CHANGE_EVENT) refresh(); };
  window.addEventListener(SOCIAL_CHANGE_EVENT, refresh);
  window.addEventListener('storage', storage);
  window.addEventListener('focus', refresh);
  return () => {
    window.removeEventListener(SOCIAL_CHANGE_EVENT, refresh);
    window.removeEventListener('storage', storage);
    window.removeEventListener('focus', refresh);
  };
};
export const followButtonKey = (relation) => relation?.pending ? 'followRequested'
  : relation?.following ? 'followingLabel' : relation?.followedBy ? 'followBackButton' : 'followButton';
