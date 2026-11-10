import { useSyncExternalStore } from 'react';
export const CHRISTMAS_UNLOCKED_KEY = 'voz-urbana-christmas-unlocked';
export const CHRISTMAS_THEME_KEY = 'voz-urbana-site-theme';
export const CHRISTMAS_EVENT = 'voz-urbana:christmas-unlocked';
const CHANGE_EVENT = 'voz-urbana:theme-changed';
const EFFECTS_KEY = 'voz-urbana-christmas-effects';
const memory = new Map();
const read = (key) => { try { return localStorage.getItem(key) ?? memory.get(key); } catch { return memory.get(key); } };
const write = (key, value) => { memory.set(key, value); try { localStorage.setItem(key, value); } catch { /* Storage may be blocked by the browser. */ } };
export const isChristmasUnlocked = () => read(CHRISTMAS_UNLOCKED_KEY) === 'true';
export const getSiteTheme = () => isChristmasUnlocked() && read(CHRISTMAS_THEME_KEY) === 'christmas' ? 'christmas' : 'normal';
export const getChristmasEffects = () => read(EFFECTS_KEY) !== 'off';
export const syncSiteTheme = () => {
  document.documentElement.dataset.siteTheme = getSiteTheme();
  document.documentElement.dataset.christmasEffects = getChristmasEffects() ? 'on' : 'off';
};
const announce = () => { syncSiteTheme(); window.dispatchEvent(new Event(CHANGE_EVENT)); };
export const applySiteTheme = (theme) => {
  const next = theme === 'christmas' && isChristmasUnlocked() ? 'christmas' : 'normal';
  write(CHRISTMAS_THEME_KEY, next);
  announce();
  return next;
};
export const setChristmasEffects = (enabled) => { write(EFFECTS_KEY, enabled ? 'on' : 'off'); announce(); };
export const unlockChristmas = () => {
  if (isChristmasUnlocked()) return false;
  write(CHRISTMAS_UNLOCKED_KEY, 'true');
  applySiteTheme('christmas');
  window.dispatchEvent(new CustomEvent(CHRISTMAS_EVENT));
  return true;
};
export const recordPigeonSound = () => {
  if (isChristmasUnlocked()) return;
  const count = Math.min(3, (Number(read('voz-urbana-pigeon-sounds')) || 0) + 1);
  write('voz-urbana-pigeon-sounds', String(count));
  if (count === 3) unlockChristmas();
};
const subscribe = (callback) => {
  const update = () => { syncSiteTheme(); callback(); };
  window.addEventListener(CHANGE_EVENT, update);
  window.addEventListener('storage', update);
  return () => { window.removeEventListener(CHANGE_EVENT, update); window.removeEventListener('storage', update); };
};
export const useChristmasTheme = () => ({
  theme: useSyncExternalStore(subscribe, getSiteTheme),
  unlocked: useSyncExternalStore(subscribe, isChristmasUnlocked),
  effects: useSyncExternalStore(subscribe, getChristmasEffects),
});
