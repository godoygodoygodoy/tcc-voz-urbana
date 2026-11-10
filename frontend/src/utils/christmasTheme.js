export const CHRISTMAS_UNLOCKED_KEY = 'voz-urbana-christmas-unlocked';
export const CHRISTMAS_THEME_KEY = 'voz-urbana-site-theme';
export const CHRISTMAS_EVENT = 'voz-urbana:christmas-unlocked';
export const isChristmasUnlocked = () => localStorage.getItem(CHRISTMAS_UNLOCKED_KEY) === 'true';
export const getSiteTheme = () => (isChristmasUnlocked() && localStorage.getItem(CHRISTMAS_THEME_KEY) === 'christmas' ? 'christmas' : 'normal');
export const applySiteTheme = (theme) => {
  const nextTheme = theme === 'christmas' && isChristmasUnlocked() ? 'christmas' : 'normal';
  localStorage.setItem(CHRISTMAS_THEME_KEY, nextTheme);
  document.documentElement.dataset.siteTheme = nextTheme;
  return nextTheme;
};
export const unlockChristmas = () => {
  if (isChristmasUnlocked()) return false;
  localStorage.setItem(CHRISTMAS_UNLOCKED_KEY, 'true');
  applySiteTheme('christmas');
  window.dispatchEvent(new CustomEvent(CHRISTMAS_EVENT));
  return true;
};
