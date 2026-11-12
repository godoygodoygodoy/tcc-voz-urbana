import React from 'react';
import { useI18n } from '../i18n';
export default function RouteSkeleton() {
  const { t } = useI18n();
  return <main className="site-page route-skeleton" aria-busy="true" role="status">
    <span className="sr-only">{t('loading')}</span>
    <div className="route-skeleton-title" /><div className="route-skeleton-line" />
    <div className="route-skeleton-cards">{[0,1,2].map(key => <div className="site-panel route-skeleton-card" key={key} />)}</div>
  </main>;
}
