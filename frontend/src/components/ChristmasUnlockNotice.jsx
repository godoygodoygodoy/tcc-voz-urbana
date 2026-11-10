import React from 'react';
import { Sparkles, X } from 'lucide-react';
import { CHRISTMAS_EVENT } from '../utils/christmasTheme';

const ChristmasUnlockNotice = () => {
  const [visible, setVisible] = React.useState(false);
  React.useEffect(() => { const show = () => setVisible(true); window.addEventListener(CHRISTMAS_EVENT, show); return () => window.removeEventListener(CHRISTMAS_EVENT, show); }, []);
  if (!visible) return null;
  return <div className="christmas-unlock" role="status"><Sparkles /><div><strong>Christmas Version desbloqueada!</strong><span>O pombo trouxe o Natal para a cidade. Escolha seu tema no perfil quando quiser.</span></div><button type="button" aria-label="Fechar" onClick={() => setVisible(false)}><X size={18} /></button></div>;
};
export default ChristmasUnlockNotice;
