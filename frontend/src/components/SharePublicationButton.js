import React, { useState } from 'react';
import { Share2 } from 'lucide-react';
import { useI18n } from '../i18n';
import SharePublicationDialog from './SharePublicationDialog';
export default function SharePublicationButton({
  problemId
}) {
  const {
      t
    } = useI18n(),
    [open, setOpen] = useState(false);
  return <><button type="button" className="profile-action mt-4" onClick={() => setOpen(true)}><Share2 size={16} />{t('sharePublicationTitle')}</button>{open && <SharePublicationDialog problemId={problemId} onClose={() => setOpen(false)} />}</>;
}
