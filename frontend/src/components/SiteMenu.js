import React from 'react';
import { FiCompass, FiFileText, FiHome, FiInfo, FiMail, FiMenu, FiMap, FiX } from 'react-icons/fi';
import { Link } from 'react-router-dom';
import { useI18n } from '../i18n';

const SiteMenu = () => {
  const { t } = useI18n();

  const items = [
    { label: t('navHome'), href: '/', icon: FiHome },
    { label: t('navHow'), href: '/#como', icon: FiCompass },
    { label: t('navMap'), href: '/map', icon: FiMap },
    { label: t('navFeed'), href: '/feed', icon: FiFileText },
    { label: t('navAbout'), href: '/#sobre', icon: FiInfo },
    { label: t('navContact'), href: '/#contato', icon: FiMail },
  ];

  return (
    <div className="site-menu">
      <button type="button" className="site-menu-trigger" aria-label="Abrir menu">
        <FiMenu className="site-menu-open-icon" />
        <FiX className="site-menu-close-icon" />
      </button>
      <div className="site-menu-panel">
        <div className="site-menu-panel-title">Voz Urbana</div>
        <nav aria-label="Menu principal" className="site-menu-links">
          {items.map(({ label, href, icon: Icon }) => (
            <Link key={label} to={href} className="site-menu-link">
              <Icon />
              <span>{label}</span>
            </Link>
          ))}
          <Link to="/report" className="site-menu-link site-menu-create">
            <FiFileText />
            <span>{t('reportProblem')}</span>
          </Link>
        </nav>
      </div>
    </div>
  );
};

export default SiteMenu;
