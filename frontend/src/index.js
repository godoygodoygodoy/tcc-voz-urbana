import { I18nProvider } from './i18n';
import React from 'react';
import ReactDOM from 'react-dom/client';
import Lenis from 'lenis';
import './index.css';
import App from './App';
import { syncSiteTheme } from './utils/christmasTheme';
import { subscribeAnimation, useMotionBudget } from './utils/motion';
syncSiteTheme();

function AppShell() {
  const { hidden, reduced } = useMotionBudget();
  React.useEffect(() => {
    if (hidden || reduced) return undefined;
    const lenis = new Lenis({ duration: 1.1, easing: t => Math.min(1, 1.001 - 2 ** (-10 * t)), smoothWheel: true, smoothTouch: false });
    let stop;
    const wake = () => {
      if (stop) return;
      stop = subscribeAnimation(time => {
        lenis.raf(time);
        if (lenis.isScrolling !== 'smooth') { stop = null;return false; }
        return true;
      });
    };
    const offWheel = lenis.on('virtual-scroll', wake);
    const offScroll = lenis.on('scroll', wake);
    return () => { stop?.();offWheel();offScroll();lenis.destroy(); };
  }, [hidden, reduced]);
  return <I18nProvider><App /></I18nProvider>;
}
ReactDOM.createRoot(document.getElementById('root')).render(<React.StrictMode><AppShell /></React.StrictMode>);
