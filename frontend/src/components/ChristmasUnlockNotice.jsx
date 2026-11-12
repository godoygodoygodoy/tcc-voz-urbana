import { useI18n } from '../i18n';
import React from 'react';
import { Sparkles, X } from 'lucide-react';
import { CHRISTMAS_EVENT } from '../utils/christmasTheme';

const ChristmasUnlockNotice = () => {
  const { t } = useI18n();
  const [visible, setVisible] = React.useState(false);
  React.useEffect(() => { const show = () => setVisible(true); window.addEventListener(CHRISTMAS_EVENT, show); return () => window.removeEventListener(CHRISTMAS_EVENT, show); }, []);
  if (!visible) return null;
  return <div className="christmas-unlock" role="status"><Sparkles /><div><strong>{t("Christmas Version desbloqueada!")}</strong><span>{t("O pombo trouxe o Natal para a cidade. Escolha seu tema no perfil quando quiser.")}</span></div><button type="button" aria-label={t("Fechar")} onClick={() => setVisible(false)}><X size={18} /></button></div>;
};
export default ChristmasUnlockNotice;
