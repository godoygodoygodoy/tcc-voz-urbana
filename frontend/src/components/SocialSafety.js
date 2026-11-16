import React, { useEffect, useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store';
import { useI18n } from '../i18n';
import { safetyAPI } from '../services/api';
import SiteDialog from './SiteDialog';
import { FloatingSelect } from './FloatingFields';
import { toast } from './LocalizedToast';
import { notifySocialChange } from '../utils/social';
const categories = ['SPAM', 'ASSEDIO', 'ODIO', 'VIOLENCIA', 'PRIVACIDADE', 'FRAUDE', 'OUTRO'];
export function SafetyActions({
  targetId,
  targetType = 'USUARIO',
  onHidden,
  onOpen
}) {
  const {
      t
    } = useI18n(),
    user = useAuthStore(state => state.user),
    navigate = useNavigate();
  const [open, setOpen] = useState(false),
    [state, setState] = useState(null),
    [busy, setBusy] = useState(false),
    [reason, setReason] = useState(''),
    [category, setCategory] = useState('SPAM'),
    [error, setError] = useState(false);
  useEffect(() => {
    if (!open || targetType !== 'USUARIO') return;
    let active = true;
    setState(null);
    setError(false);
    safetyAPI.state(targetId).then(({
      data
    }) => {
      if (active) setState(data);
    }).catch(() => {
      if (active) setError(true);
    });
    return () => {
      active = false;
    };
  }, [open, targetId, targetType]);
  if (!user || targetType === 'USUARIO' && user.id === targetId) return null;
  const action = async operation => {
    if (busy) return;
    setBusy(true);
    try {
      await operation();
      notifySocialChange();
      toast.success(t('socialSafetySaved'));
    } catch (error) {
      toast.error(error.response?.data?.error || t('requestFailed'));
    } finally {
      setBusy(false);
    }
  };
  return <><button type="button" className="profile-action" onClick={() => {
      onOpen?.();
      setOpen(true);
    }} aria-label={t('socialSafetyActions')}><ShieldCheck size={16} /><span>{t('socialSafetyActions')}</span></button>{open && <SiteDialog title={t('socialSafetyActions')} onClose={() => setOpen(false)} busy={busy}><div className="space-y-4">{error && <p role="alert">{t('requestFailed')}</p>}{targetType === 'USUARIO' && state && <div className="flex flex-wrap gap-3"><button className="profile-action" disabled={busy} onClick={() => action(async () => {
            await safetyAPI.relation(targetId, 'block', !state.blocked);
            setOpen(false);
            navigate('/profile');
          })}>{t(state.blocked ? 'socialUnblock' : 'socialBlock')}</button><button className="profile-action" disabled={busy} onClick={() => action(async () => {
            await safetyAPI.relation(targetId, 'mute', !state.muted);
            setState(current => ({
              ...current,
              muted: !current.muted
            }));
          })}>{t(state.muted ? 'socialUnmute' : 'socialMute')}</button></div>}{targetType === 'PROBLEMA' && <button className="profile-action" disabled={busy} onClick={() => action(async () => {
          await safetyAPI.hide(targetId, true);
          onHidden?.();
          setOpen(false);
        })}>{t('socialHide')}</button>}<form onSubmit={event => {
          event.preventDefault();
          action(async () => {
            await safetyAPI.report({
              targetType,
              targetId,
              category,
              reason
            });
            setReason('');
            setOpen(false);
          });
        }}><h3>{t('socialReport')}</h3><label>{t('category')}<FloatingSelect value={category} onChange={setCategory} options={categories.map(value => ({
              value,
              label: t('socialReport' + value)
            }))} /></label><label>{t('socialReportReason')}<textarea className="site-form-input w-full rounded-xl p-3" value={reason} maxLength={1000} minLength={5} required onChange={event => setReason(event.target.value)} /></label><button className="profile-action profile-action--primary" disabled={busy || reason.trim().length < 5}>{t('socialReportSubmit')}</button></form></div></SiteDialog>}</>;
}
export function SafetyCenter() {
  const {
      t
    } = useI18n(),
    [type, setType] = useState('BLOQUEIO'),
    [page, setPage] = useState(1),
    [version, setVersion] = useState(0),
    [result, setResult] = useState(null),
    [preferences, setPreferences] = useState(null),
    [error, setError] = useState(false),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    setError(false);
    Promise.all([type === 'OCULTACAO' ? safetyAPI.hidden({
      page
    }) : safetyAPI.list({
      type,
      page
    }), safetyAPI.preferences()]).then(([rows, prefs]) => {
      if (active) {
        setResult(rows.data);
        setPreferences(prefs.data);
      }
    }).catch(() => {
      if (active) setError(true);
    });
    return () => {
      active = false;
    };
  }, [type, page, version]);
  const save = async operation => {
    if (busy) return;
    setBusy(true);
    try {
      await operation();
      notifySocialChange();
      toast.success(t('socialSafetySaved'));
      setVersion(n => n + 1);
    } catch (e) {
      toast.error(e.response?.data?.error || t('requestFailed'));
    } finally {
      setBusy(false);
    }
  };
  return <section className="site-panel my-6 rounded-3xl p-5"><h2 className="mb-4 text-xl font-bold">{t('socialSafetyCenter')}</h2>{error && <p role="alert">{t('requestFailed')}</p>}{preferences && <form onSubmit={event => {
      event.preventDefault();
      save(() => safetyAPI.updatePreferences(preferences));
    }}>{['mensagens', 'mencoes'].map(key => <label key={key} className="mb-3 block">{t('socialPolicy' + key)}<FloatingSelect value={preferences[key]} onChange={value => setPreferences(current => ({
          ...current,
          [key]: value
        }))} options={['TODOS', 'MUTUOS', 'NINGUEM'].map(value => ({
          value,
          label: t('socialPolicy' + value)
        }))} /></label>)}<button className="profile-action" disabled={busy}>{t('saveProfile')}</button></form>}<div className="my-4"><FloatingSelect value={type} onChange={value => {
        setType(value);
        setPage(1);
        setResult(null);
      }} options={['BLOQUEIO', 'SILENCIO', 'OCULTACAO'].map(value => ({
        value,
        label: t('socialList' + value)
      }))} /></div>{!result && !error && <p role="status">{t('loading')}</p>}{result && <><ul className="space-y-3">{result.data.map(row => <li className="flex items-center justify-between gap-3" key={row.id}><span>{type === 'OCULTACAO' ? row.title || t('socialContentUnavailable') : row.user?.nome} {row.user?.username ? '@' + row.user.username : ''}</span><button className="profile-action" disabled={busy} onClick={() => save(() => type === 'OCULTACAO' ? safetyAPI.hide(row.problemId, false) : safetyAPI.relation(row.user.id, type === 'BLOQUEIO' ? 'block' : 'mute', false))}>{t(type === 'OCULTACAO' ? 'socialUnhide' : type === 'BLOQUEIO' ? 'socialUnblock' : 'socialUnmute')}</button></li>)}</ul>{!result.total && <p>{t('socialSafetyEmpty')}</p>}<div className="mt-4 flex justify-between"><button className="profile-action" disabled={page <= 1 || busy} onClick={() => setPage(n => n - 1)}>{t('previous')}</button><button className="profile-action" disabled={page * result.limit >= result.total || busy} onClick={() => setPage(n => n + 1)}>{t('next')}</button></div></>}</section>;
}
export function ModerationQueue() {
  const {
      t
    } = useI18n(),
    [state, setState] = useState('ABERTA'),
    [page, setPage] = useState(1),
    [result, setResult] = useState(null),
    [error, setError] = useState(false),
    [selected, setSelected] = useState(null),
    [decision, setDecision] = useState(''),
    [finalState, setFinalState] = useState('ANALISE'),
    [busy, setBusy] = useState(false),
    [version, setVersion] = useState(0);
  useEffect(() => {
    let active = true;
    setError(false);
    setResult(null);
    safetyAPI.reports({
      state,
      page
    }).then(({
      data
    }) => {
      if (active) setResult(data);
    }).catch(() => {
      if (active) setError(true);
    });
    return () => {
      active = false;
    };
  }, [state, page, version]);
  return <section className="site-panel rounded-3xl p-5"><h2>{t('socialModeration')}</h2><FloatingSelect value={state} onChange={value => {
      setState(value);
      setPage(1);
    }} options={['ABERTA', 'ANALISE', 'RESOLVIDA', 'REJEITADA'].map(value => ({
      value,
      label: t('socialReportState' + value)
    }))} />{error && <p role="alert">{t('requestFailed')}</p>}{!result && !error && <p role="status">{t('loading')}</p>}{result && <><ul className="space-y-4">{result.data.map(row => <li key={row.id} className="rounded-xl border border-white/10 p-4"><strong>{t('socialReport' + row.categoria)}</strong><p>{t('socialTarget' + row.tipoAlvo)}: {row.alvoId}</p><p className="break-words">{row.motivo}</p>{row.decisao && <p>{row.decisao}</p>}{['ABERTA', 'ANALISE'].includes(row.estado) && <button className="profile-action" onClick={() => {
            setSelected(row);
            setDecision('');
          }}>{t('socialReview')}</button>}</li>)}</ul>{!result.total && <p>{t('socialSafetyEmpty')}</p>}<div className="flex justify-between"><button className="profile-action" disabled={page <= 1} onClick={() => setPage(n => n - 1)}>{t('previous')}</button><button className="profile-action" disabled={page * result.limit >= result.total} onClick={() => setPage(n => n + 1)}>{t('next')}</button></div></>}{selected && <SiteDialog title={t('socialReview')} onClose={() => setSelected(null)} busy={busy}><form onSubmit={async event => {
        event.preventDefault();
        if (busy) return;
        setBusy(true);
        try {
          await safetyAPI.review(selected.id, {
            state: finalState,
            decision
          });
          setSelected(null);
          setVersion(n => n + 1);
        } catch (e) {
          toast.error(e.response?.data?.error || t('requestFailed'));
        } finally {
          setBusy(false);
        }
      }}><FloatingSelect value={finalState} onChange={setFinalState} options={['ANALISE', 'RESOLVIDA', 'REJEITADA'].map(value => ({
          value,
          label: t('socialReportState' + value)
        }))} /><label>{t('socialReviewDecision')}<textarea className="site-form-input w-full rounded-xl p-3" value={decision} minLength={5} maxLength={1000} required onChange={event => setDecision(event.target.value)} /></label><button className="profile-action" disabled={busy || decision.trim().length < 5}>{t('saveProfile')}</button></form></SiteDialog>}</section>;
}
