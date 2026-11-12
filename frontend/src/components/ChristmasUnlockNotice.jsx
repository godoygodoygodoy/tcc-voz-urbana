import { translate as _tr, useI18n as _useLocale } from '../i18n';
import React from 'react';
import { Sparkles, X } from 'lucide-react';
import { CHRISTMAS_EVENT } from '../utils/christmasTheme';

const ChristmasUnlockNotice = () => {
  _useLocale();
  const [visible, setVisible] = React.useState(false);
  React.useEffect(() => { const show = () => setVisible(true); window.addEventListener(CHRISTMAS_EVENT, show); return () => window.removeEventListener(CHRISTMAS_EVENT, show); }, []);
  if (!visible) return null;
  return <div className="christmas-unlock" role="status"><Sparkles /><div><strong>{_tr("Christmas Version desbloqueada!")}</strong><span>{_tr("O pombo trouxe o Natal para a cidade. Escolha seu tema no perfil quando quiser.")}</span></div><button type="button" aria-label={_tr("Fechar")} onClick={() => setVisible(false)}><X size={18} /></button></div>;
};
export default ChristmasUnlockNotice;
