import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { trackingAPI, adminAPI } from '../services/api';
import { getLanguage, translateStatus, translateSystemText, useI18n } from '../i18n';
import { useAuthStore } from '../store';
import { createVisibilityPoller } from '../utils/polling';
import { notifySocialChange, subscribeSocialChanges } from '../utils/social';
import { FloatingSelect } from './FloatingFields';
import { toast } from './LocalizedToast';
import { profilePath } from '../utils/profileLinks';
const label = (stage, t) => stage?.name || t(stage?.translationKey || 'workflow' + stage?.code);
export default function ProblemTrackingPanel({
  problemId
}) {
  const {
      t
    } = useI18n(),
    user = useAuthStore(state => state.user),
    login = useAuthStore(state => state.openAuthModal);
  const [summary, setSummary] = useState(null),
    [stages, setStages] = useState([]),
    [stage, setStage] = useState(''),
    [related, setRelated] = useState([]);
  const [error, setError] = useState(false),
    [busy, setBusy] = useState(false),
    [show, setShow] = useState(false),
    [timeline, setTimeline] = useState({
      data: [],
      nextCursor: null
    });
  const [timelineRevision, setTimelineRevision] = useState(0),
    [loadingTimeline, setLoadingTimeline] = useState(false),
    [timelineError, setTimelineError] = useState(false),
    [revision, setRevision] = useState(0);
  const pending = useRef(false),
    context = useRef('');
  context.current = [problemId, user?.id].join(':');
  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setSummary(null);
    setRelated([]);
    setError(false);
    setShow(false);
    const load = async () => {
      try {
        const {
          data
        } = await trackingAPI.confirmations(problemId, {
          signal: controller.signal
        });
        if (!Array.isArray(data.choices)) throw Error();
        if (active) {
          setSummary(data);
          setError(false);
        }
      } catch {
        if (active) setError(true);
      }
    };
    const poller = createVisibilityPoller(load, 30000, {
        immediate: true
      }),
      unsubscribe = subscribeSocialChanges(poller.refresh);
    trackingAPI.related(problemId, {
      signal: controller.signal
    }).then(({
      data
    }) => {
      if (active) setRelated(data.data || []);
    }).catch(() => {});
    if (user?.role === 'admin') trackingAPI.stages().then(({
      data
    }) => {
      if (active) setStages(data.data || []);
    }).catch(() => {});
    return () => {
      active = false;
      controller.abort();
      poller.dispose();
      unsubscribe();
    };
  }, [problemId, user?.id, user?.role, revision]);
  useEffect(() => show ? subscribeSocialChanges(() => setTimelineRevision(value => value + 1)) : undefined, [show]);
  useEffect(() => {
    if (!show) return undefined;
    const controller = new AbortController();
    setLoadingTimeline(true);
    setTimeline({
      data: [],
      nextCursor: null
    });
    setTimelineError(false);
    trackingAPI.timeline(problemId, null, {
      signal: controller.signal
    }).then(({
      data
    }) => {
      if (!controller.signal.aborted) setTimeline(data);
    }).catch(() => {
      if (!controller.signal.aborted) setTimelineError(true);
    }).finally(() => {
      if (!controller.signal.aborted) setLoadingTimeline(false);
    });
    return () => controller.abort();
  }, [show, problemId, timelineRevision]);
  const act = async operation => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    const key = context.current;
    try {
      const result = await operation();
      if (context.current === key) {
        setSummary(result);
        notifySocialChange();
      }
    } catch (error) {
      toast.error(error.response?.data?.error || t('trackingError'));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  const confirm = choice => {
    if (!user) {
      login('login');
      return;
    }
    act(async () => {
      const {
        data
      } = await trackingAPI.confirm(problemId, choice);
      return data;
    });
  };
  const update = event => {
    event.preventDefault();
    if (!stage) return;
    act(async () => {
      await adminAPI.updateProblem(problemId, {
        stageCode: stage
      });
      const {
        data
      } = await trackingAPI.confirmations(problemId);
      toast.success(t('workflowSaved'));
      return data;
    });
  };
  const more = async () => {
    if (loadingTimeline) return;
    const key = context.current;
    setLoadingTimeline(true);
    try {
      const {
        data
      } = await trackingAPI.timeline(problemId, timeline.nextCursor);
      if (context.current === key) {
        setTimeline(current => ({
          data: [...current.data, ...data.data],
          nextCursor: data.nextCursor
        }));
        setTimelineError(false);
      }
    } catch {
      setTimelineError(true);
    } finally {
      setLoadingTimeline(false);
    }
  };
  return <section className="mt-8 border-t border-white/10 pt-6" aria-labelledby="tracking-title"><h2 id="tracking-title" className="text-xl font-bold">{t('trackingTitle')}</h2>
    {error && <div role="status" className="mt-3"><p>{t('trackingError')}</p><button type="button" className="profile-action mt-2" onClick={() => setRevision(value => value + 1)}>{t('collectionRetry')}</button></div>}
    {!summary && !error && <p role="status" className="site-muted mt-3">{t('loading')}</p>}
    {summary && <><p className="mt-4"><span className="rounded-full border px-4 py-2 text-sm" style={{
          borderColor: summary.stage?.color || '#7C3AED'
        }}>{summary.stage ? label(summary.stage, t) : translateStatus(summary.status)}</span></p>
      {user?.role === 'admin' && <form onSubmit={update} className="mt-5 flex flex-wrap items-end gap-3"><div className="min-w-[200px] flex-1"><label className="mb-2 block text-sm">{t('workflowChoose')}</label><FloatingSelect value={stage} onChange={setStage} options={[{
            value: '',
            label: t('workflowChoose')
          }, ...stages.filter(row => row.active).map(row => ({
            value: row.code,
            label: label(row, t)
          }))]} /></div><button type="submit" className="profile-action" disabled={!stage || busy}>{t('workflowApply')}</button></form>}
      <h3 className="mb-2 mt-6 font-bold">{t('confirmationTitle')}</h3><p className="site-muted text-sm">{t('confirmationHint')}</p><div className="mt-3 flex flex-wrap gap-2">{summary.choices.map(row => <button type="button" key={row.choice} aria-pressed={summary.mine?.choice === row.choice} disabled={busy} className={'profile-action ' + (summary.mine?.choice === row.choice ? 'profile-action--primary' : '')} onClick={() => confirm(row.choice)}>{t('confirmation' + row.choice)} · {row.count}</button>)}</div>{summary.mine && <p className="site-muted mt-3 text-xs">{t('confirmationNext', {
          date: new Date(summary.mine.nextAllowedAt).toLocaleString(getLanguage())
        })}</p>}
    </>}
    <button type="button" className="profile-action mt-6" aria-expanded={show} onClick={() => setShow(value => !value)}>{t('trackingTimeline')}</button>
    {show && <div className="mt-4 space-y-3">{timeline.data.map(event => <article key={event.kind + event.id} className="site-comment rounded-xl border-l-2 border-violet-400 p-4"><div className="flex flex-wrap justify-between gap-3 text-xs"><strong>{t('timeline' + event.kind)}</strong><time dateTime={event.at}>{new Date(event.at).toLocaleString(getLanguage())}</time></div>{event.author && <Link className="mt-2 block text-xs text-violet-200" to={profilePath(event.author)}>{event.author.username ? '@' + event.author.username : event.author.nome}</Link>}{event.kind === 'comment' ? <p className="mt-2 whitespace-pre-wrap break-words text-sm">{event.text}</p> : event.kind === 'update' && <p className="mt-2 text-sm">{event.stageCode ? event.stageName || t('workflow' + event.stageCode) : translateSystemText(event.text)}</p>}</article>)}{loadingTimeline && <p role="status">{t('loading')}</p>}{timelineError && <div role="status"><p>{t('trackingTimelineError')}</p><button type="button" className="profile-action" onClick={more}>{t('collectionRetry')}</button></div>}{timeline.nextCursor && <button type="button" disabled={loadingTimeline} className="profile-action" onClick={more}>{t('loadMore')}</button>}</div>}
    {related.length > 0 && <><h3 className="mb-3 mt-6 font-bold">{t('trackingRelated')}</h3><div className="grid gap-3 sm:grid-cols-2">{related.map(row => <Link to={'/problem/' + row.id} key={row.id} className="site-comment rounded-xl p-4"><strong className="break-words">{row.title}</strong><p className="site-muted mt-2 text-xs">{row.reasons.map(reason => t('related' + reason)).join(' · ')}</p></Link>)}</div></>}
  </section>;
}
