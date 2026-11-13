import React, { useEffect, useRef, useState } from 'react';
import { Pin } from 'lucide-react';
import { profileFeaturesAPI } from '../services/api';
import { useAuthStore } from '../store';
import { useI18n } from '../i18n';
import { notifySocialChange } from '../utils/social';
import { toast } from './LocalizedToast';
export default function PinControl({
  problem
}) {
  const {
      t
    } = useI18n(),
    userId = useAuthStore(state => state.user?.id),
    [pinned, setPinned] = useState(Boolean(problem.fixadaEm)),
    [busy, setBusy] = useState(false),
    pending = useRef(false),
    context = useRef(problem.id);
  context.current = problem.id;
  useEffect(() => setPinned(Boolean(problem.fixadaEm)), [problem.id, problem.fixadaEm]);
  const change = async () => {
    if (pending.current) return;
    pending.current = true;
    setBusy(true);
    const id = problem.id;
    try {
      const {
        data
      } = await profileFeaturesAPI.pin(id, !pinned);
      if (context.current === id) {
        setPinned(data.pinned);
        notifySocialChange();
        toast.success(t(data.pinned ? 'pinSaved' : 'pinRemoved'));
      }
    } catch (error) {
      toast.error(error.response?.data?.error || t('pinError'));
    } finally {
      pending.current = false;
      setBusy(false);
    }
  };
  if (userId !== problem.author?.id) return null;
  return <button type="button" aria-pressed={pinned} disabled={busy} onClick={change} className="profile-action mt-4"><Pin size={16} />{t(pinned ? 'pinRemove' : 'pinAdd')}</button>;
}
