const fs=require('fs');let p='frontend/src/i18n.js',s=fs.readFileSync(p,'utf8');s=s.replace("import React,", "import interfaceMessages from './locales/interface.json';\nimport React,");s=s.slice(0,s.indexOf('const I18nContext'))+`export const supportedLanguages = ['pt-BR', 'en', 'es'];
const normalizeLanguage = (value) => supportedLanguages.includes(value) ? value : 'pt-BR';
const readLanguage = () => { try { return normalizeLanguage(localStorage.getItem('language')); } catch { return 'pt-BR'; } };
let currentLanguage = readLanguage();
export const getLanguage = () => currentLanguage;
export const translate = (key, params = {}, language = currentLanguage) => {
  const text = translations[language]?.[key] ?? interfaceMessages[language]?.[key] ?? key;
  return String(text ?? '').replace(/\\{(\\w+)\\}/g, (match, name) => params[name] ?? match);
};
const I18nContext = createContext(null);
export const I18nProvider = ({ children }) => {
  const [language, updateLanguage] = useState(readLanguage);
  currentLanguage = language;
  const setLanguage = React.useCallback((value) => {
    const next = normalizeLanguage(value);
    currentLanguage = next;
    try { localStorage.setItem('language', next); } catch { /* Private browsing may disable storage. */ }
    updateLanguage(next);
  }, []);
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);
  useEffect(() => {
    const sync = (event) => { if (event.key === 'language') setLanguage(event.newValue); };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, [setLanguage]);
  const value = useMemo(() => ({ language, setLanguage, t: (key, params) => translate(key, params, language) }), [language, setLanguage]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};
export const useI18n = () => useContext(I18nContext);
`;fs.writeFileSync(p,s);
p='frontend/src/components/SiteMenu.js';s=fs.readFileSync(p,'utf8');s=s.replace(/    \.\.\.\(user \? \[\{ label: t\('reportProblem'\).*\r?\n/,'');s=s.replace(/    \.\.\.\(user\?\.role\?\.toLowerCase\(\) === 'admin' \?.*\r?\n/,"    { label: t('reportProblem'), href: '/feed#create', icon: FiFileText, variant: 'create' },\n    ...(user?.role?.toLowerCase() === 'admin' ? [{ label: t('adminNav'), href: '/admin', icon: FiShield, variant: 'admin' }] : []),\n");s=s.replace("location.pathname === '/report' ? items.length : currentIndex","location.pathname === '/report' ? 6 : currentIndex");s=s.replace('items.map(({ label, href, icon: Icon }, index)', 'items.map(({ label, href, icon: Icon, variant }, index)');s=s.replace('className={`site-menu-link ${selectedIndex',"className={`site-menu-link ${variant ? `site-menu-${variant}` : ''} ${selectedIndex");const start=s.indexOf('          <Link\n            to="/feed#create"');const end=s.indexOf('        </nav>',start);if(start>=0)s=s.slice(0,start)+s.slice(end);s=s.replace('[open, selectedIndex]','[open, selectedIndex, t]').replace('selectedIndex, items.length]','selectedIndex, items.length, t]');fs.writeFileSync(p,s);
