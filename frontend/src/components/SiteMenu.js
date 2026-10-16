import React, { useState } from 'react';
import { FiCompass, FiFileText, FiHome, FiInfo, FiMail, FiMenu, FiMap, FiX } from 'react-icons/fi';
import { Link, useLocation } from 'react-router-dom';
import { useI18n } from '../i18n';

const SiteMenu = () => {
  const { t } = useI18n();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const items = [
    { label: t('navHome'), href: '/', icon: FiHome },
    { label: t('navHow'), href: '/#como', icon: FiCompass },
    { label: t('navMap'), href: '/map', icon: FiMap },
    { label: t('navFeed'), href: '/feed', icon: FiFileText },
    { label: t('navAbout'), href: '/#sobre', icon: FiInfo },
    { label: t('navContact'), href: '/#contato', icon: FiMail },
  ];

  return (
    <div className={`site-menu ${open ? 'is-open' : ''}`}>
      <button type="button" className="site-menu-trigger" aria-label={open ? 'Fechar menu' : 'Abrir menu'} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        <FiMenu className="site-menu-open-icon" />
        <FiX className="site-menu-close-icon" />
      </button>
      {open && <button type="button" className="site-menu-backdrop" aria-label="Fechar menu" onClick={() => setOpen(false)} />}
      <div className="site-menu-panel" aria-hidden={!open}>
        <div className="site-menu-panel-contours" aria-hidden="true" />
        <div className="site-menu-panel-head">
          <div>
            <span className="site-menu-panel-kicker">NAVEGAÇÃO URBANA / 01</span>
            <div className="site-menu-panel-title">Voz Urbana</div>
          </div>
          <span className="site-menu-panel-live"><i /> AO VIVO</span>
        </div>
        <nav aria-label="Menu principal" className="site-menu-links">
          {items.map(({ label, href, icon: Icon }, index) => (
            <Link key={label} to={href} onClick={() => setOpen(false)} className={`site-menu-link ${location.pathname === href.split('#')[0] ? 'is-current' : ''}`} style={{ '--menu-index': index }}>
              <span className="site-menu-link-index">0{index + 1}</span>
              <Icon />
              <span className="site-menu-link-label">{label}</span>
              <span className="site-menu-link-arrow">↗</span>
            </Link>
          ))}
          <Link to="/report" onClick={() => setOpen(false)} className="site-menu-link site-menu-create" style={{ '--menu-index': items.length }}>
            <span className="site-menu-link-index">07</span>
            <FiFileText />
            <span className="site-menu-link-label">{t('reportProblem')}</span>
            <span className="site-menu-link-arrow">↗</span>
          </Link>
        </nav>
        <div className="site-menu-panel-foot">
          <span>ROXO É A NOSSA FREQUÊNCIA</span>
          <span>SCROLL / EXPLORE</span>
        </div>
      </div>
    </div>
  );
};

export default SiteMenu;
