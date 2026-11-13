import React, { useEffect, useState } from 'react';
import { profileFeaturesAPI } from '../services/api';
import { useI18n, getLanguage } from '../i18n';
import { useAuthStore } from '../store';
import { createVisibilityPoller } from '../utils/polling';
import { subscribeSocialChanges } from '../utils/social';
export default function ProfileStats({
  ownerId
}) {
  const {
      t
    } = useI18n(),
    viewerId = useAuthStore(state => state.user?.id),
    [data, setData] = useState(null),
    [error, setError] = useState(false),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setData(null);
    const load = async () => {
      try {
        const {
          data
        } = await profileFeaturesAPI.stats(ownerId, {
          signal: controller.signal
        });
        if (active) {
          setData(data);
          setError(false);
        }
      } catch {
        if (active) setError(true);
      }
    };
    const poller = createVisibilityPoller(load, 60000, {
        immediate: true
      }),
      unsubscribe = subscribeSocialChanges(poller.refresh);
    return () => {
      active = false;
      controller.abort();
      poller.dispose();
      unsubscribe();
    };
  }, [ownerId, viewerId, revision]);
  return <section className="site-panel mt-6 rounded-3xl p-5"><h2 className="mb-4 text-xl font-bold">{t('profileStatsTitle')}</h2>{error && <div role="status"><p>{t('profileStatsError')}</p><button type="button" className="profile-action mt-2" onClick={() => setRevision(value => value + 1)}>{t('collectionRetry')}</button></div>}{!data && !error && <p role="status">{t('loading')}</p>}{data && <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{['posts', 'followers', 'following', 'support', 'comments', 'resolved', ...(viewerId === ownerId ? ['watched'] : [])].map(key => <div key={key} className="site-comment rounded-xl p-3"><strong className="text-xl">{Number(data[key] || 0).toLocaleString(getLanguage())}</strong><p className="site-muted mt-1 text-xs">{t('profileStat' + key)}</p></div>)}</div>}</section>;
}
