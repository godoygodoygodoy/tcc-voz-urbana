import React from 'react';
import ReactDOM from 'react-dom/client';
import Lenis from 'lenis';
import './index.css';
import App from './App';

function AppShell() {
  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - 2 ** (-10 * t)),
      smoothWheel: true,
      smoothTouch: false,
    });

    let animationFrameId;

    const raf = (time) => {
      lenis.raf(time);
      animationFrameId = window.requestAnimationFrame(raf);
    };

    animationFrameId = window.requestAnimationFrame(raf);

    return () => {
      window.cancelAnimationFrame(animationFrameId);
      lenis.destroy();
    };
  }, []);

  return <App />;
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <AppShell />
  </React.StrictMode>
);
