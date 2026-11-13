import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { useI18n } from '../i18n';
let openDialogs = 0, previousOverflow;
export default function SiteDialog({ title, children, onClose, busy = false }) {
  const { t } = useI18n(), label = useId(), element = useRef(null), close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement;
    if (openDialogs++ === 0) { previousOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden'; }
    element.current?.querySelector('button:not(:disabled),input:not(:disabled),[tabindex="0"]')?.focus();
    return () => { if (--openDialogs === 0) document.body.style.overflow = previousOverflow; if (previous?.isConnected) previous.focus(); };
  }, []);
  return createPortal(<div className="context-modal social-network-backdrop" onClick={event => { if (event.target === event.currentTarget && !busy) close.current(); }}>
    <section ref={element} role="dialog" aria-modal="true" aria-labelledby={label} className="site-panel social-network-dialog" onKeyDown={event => {
      if (event.target.closest('.floating-portal') || event.key === 'Escape' && element.current?.querySelector('.floating-trigger[aria-expanded="true"]')) return;
      if (event.key === 'Escape' && !busy) { event.stopPropagation(); close.current(); }
      if (event.key !== 'Tab') return;
      const controls = [...event.currentTarget.querySelectorAll('button:not(:disabled),input:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]')];
      const first = controls[0], last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }}>
      <header><h2 id={label}>{title}</h2><button type="button" disabled={busy} aria-label={t('Fechar')} onClick={onClose}><X size={20} /></button></header>
      {children}
    </section>
  </div>, document.body);
}
export function ConfirmDialog({ title, description, onConfirm, onClose, busy }) {
  const { t } = useI18n();
  return <SiteDialog title={title} onClose={onClose} busy={busy}><p className="my-5 text-sm text-white/70">{description}</p><div className="flex justify-end gap-3"><button type="button" className="profile-action" disabled={busy} onClick={onClose}>{t('Cancelar')}</button><button type="button" className="profile-action profile-action--primary" disabled={busy} onClick={onConfirm}>{t(busy ? 'saving' : 'Confirmar')}</button></div></SiteDialog>;
}
