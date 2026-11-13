import React, { useEffect, useState } from 'react';
import { trackingAPI } from '../services/api';
import { useI18n, translateStatus } from '../i18n';
import { FloatingSelect } from './FloatingFields';
import { toast } from './LocalizedToast';
const initial = {
  code: '',
  name: '',
  status: 'ABERTO',
  color: '#7C3AED',
  active: true
};
export default function WorkflowSettings() {
  const {
      t
    } = useI18n(),
    [rows, setRows] = useState([]),
    [draft, setDraft] = useState(initial),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    trackingAPI.stages().then(({
      data
    }) => {
      if (active) setRows(data.data || []);
    }).catch(() => {
      if (active) setError(true);
    });
    return () => {
      active = false;
    };
  }, []);
  const choose = code => {
    const row = rows.find(item => item.code === code);
    setDraft(row ? {
      ...row,
      name: row.name || ''
    } : initial);
  };
  const save = async event => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      await trackingAPI.configure(draft.code, {
        name: draft.name.trim() || null,
        status: draft.status,
        color: draft.color,
        active: draft.active
      });
      setRows((await trackingAPI.stages()).data.data);
      setError(false);
      toast.success(t('workflowSaved'));
    } catch (error) {
      setError(true);
      toast.error(error.response?.data?.error || t('workflowInvalid'));
    } finally {
      setBusy(false);
    }
  };
  return <section className="site-panel mb-6 rounded-3xl p-6"><h2 className="text-xl font-bold">{t('workflowSettings')}</h2><p className="site-muted mt-2 text-sm">{t('workflowSettingsHint')}</p>{error && <p role="status" className="mt-3">{t('trackingError')}</p>}<form onSubmit={save} className="mt-4 grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><FloatingSelect value={draft.code} onChange={choose} options={[{
          value: '',
          label: t('workflowNew')
        }, ...rows.map(row => ({
          value: row.code,
          label: row.name || t(row.translationKey)
        }))]} /></div><label className="text-sm">{t('workflowCode')}<input required maxLength={40} pattern="[A-Z][A-Z0-9_]{1,39}" value={draft.code} onChange={event => setDraft(current => ({
          ...current,
          code: event.target.value.toUpperCase()
        }))} className="site-form-input mt-2 w-full rounded-xl p-3" /></label><label className="text-sm">{t('workflowName')}<input maxLength={80} value={draft.name} onChange={event => setDraft(current => ({
          ...current,
          name: event.target.value
        }))} className="site-form-input mt-2 w-full rounded-xl p-3" /></label><div><label className="mb-2 block text-sm">{t('workflowBase')}</label><FloatingSelect value={draft.status} onChange={status => setDraft(current => ({
          ...current,
          status
        }))} options={['ABERTO', 'EM_ANDAMENTO', 'RESOLVIDO', 'REJEITADO'].map(value => ({
          value,
          label: translateStatus(value)
        }))} /></div><label className="text-sm">{t('workflowColor')}<input required pattern="#[A-Fa-f0-9]{6}" maxLength={7} value={draft.color} onChange={event => setDraft(current => ({
          ...current,
          color: event.target.value
        }))} className="site-form-input mt-2 w-full rounded-xl p-3" /></label><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={draft.active} onChange={event => setDraft(current => ({
          ...current,
          active: event.target.checked
        }))} />{t('workflowActive')}</label><button type="submit" className="profile-action profile-action--primary" disabled={busy || !draft.code}>{t(busy ? 'saving' : 'save')}</button></form></section>;
}
