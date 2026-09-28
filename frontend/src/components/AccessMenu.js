import React, { useState } from 'react';
import { ChevronDown, Globe2, LogIn, UserPlus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n';
import { mediaUrl } from '../services/api';

const AccessMenu = ({ authenticated = false, user, onLogout }) => {
  const { language, setLanguage, t } = useI18n();
  const [open, setOpen] = useState(false);
  const languages = [{ code: 'pt-BR', label: t('portuguese') }, { code: 'en', label: t('english') }, { code: 'es', label: t('spanish') }];
  const selectedLanguage = languages.find((item) => item.code === language) || languages[0];

  const changeLanguage = (code) => {
    setLanguage(code);
    localStorage.setItem('language', code);
    setLanguage(code);
  };

  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)} aria-expanded={open} className="group flex items-center gap-2 rounded-full border border-white/15 bg-white/8 p-1.5 pr-3 text-sm font-black text-white transition hover:bg-white/15">
        {authenticated ? (
          user?.avatar || user?.fotoPerfil ? <img src={mediaUrl(user.avatar || user.fotoPerfil)} alt="Perfil" className="h-9 w-9 rounded-full object-cover" /> : <span className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-500 text-white">{(user?.name || user?.nome || 'U').charAt(0).toUpperCase()}</span>
        ) : <LogIn className="ml-2 h-5 w-5" />}
        <span className="hidden sm:inline">{authenticated ? (user?.username ? `@${user.username.replace(/^@/, '')}` : t('account')) : t('login')}</span>
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="absolute right-0 top-full z-[100] mt-3 w-72 rounded-2xl border border-white/12 bg-[#202326] p-2 text-white shadow-2xl">
        {authenticated ? <>
          <Link to="/profile" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-white/10">{t('accountSettings')}</Link>
          <Link to="/register" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-white/10"><UserPlus className="h-4 w-4 text-violet-300" />{t('createProfile')}</Link>
        </> : <>
          <Link to="/login" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-white/10"><LogIn className="h-4 w-4 text-violet-300" />{t('login')}</Link>
          <Link to="/register" onClick={() => setOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm hover:bg-white/10"><UserPlus className="h-4 w-4 text-violet-300" />{t('createAccount')}</Link>
        </>}
        <div className="my-2 border-t border-white/10" />
        <div className="px-3 py-2 text-xs font-bold uppercase tracking-[0.18em] text-white/45"><Globe2 className="mr-2 inline h-4 w-4" />{t('language')}</div>
        {languages.map((item) => <button key={item.code} type="button" onClick={() => changeLanguage(item.code)} className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm hover:bg-white/10 ${language === item.code ? 'bg-violet-500/20 text-violet-100' : 'text-white/75'}`}><span>{item.label}</span>{language === item.code && <span aria-label="Selecionado">✓</span>}</button>)}
        <p className="px-3 pb-2 pt-2 text-[11px] text-white/35">{t('language')}: {selectedLanguage.label}</p>
        {authenticated && <button type="button" onClick={onLogout} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-red-200 hover:bg-red-500/15">{t('logout')}</button>}
      </div>}
    </div>
  );
};

export default AccessMenu;
