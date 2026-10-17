import React, { useEffect } from 'react';

const ReactiveAtmosphere = () => {
  useEffect(() => {
    const root = document.documentElement;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) return undefined;

    let frame = 0;
    const updatePointer = (event) => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        root.style.setProperty('--cursor-x', `${(event.clientX / window.innerWidth) * 100}%`);
        root.style.setProperty('--cursor-y', `${(event.clientY / window.innerHeight) * 100}%`);
      });
    };
    const updateScroll = () => {
      root.style.setProperty('--scroll-progress', `${window.scrollY}px`);
    };
    const updateVisibility = () => root.classList.toggle('is-page-hidden', document.hidden);

    window.addEventListener('pointermove', updatePointer, { passive: true });
    window.addEventListener('scroll', updateScroll, { passive: true });
    document.addEventListener('visibilitychange', updateVisibility);
    updateScroll();
    updateVisibility();

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('pointermove', updatePointer);
      window.removeEventListener('scroll', updateScroll);
      document.removeEventListener('visibilitychange', updateVisibility);
      root.classList.remove('is-page-hidden');
    };
  }, []);

  return (
    <div className="reactive-atmosphere" aria-hidden="true">
      <span className="reactive-atmosphere__blob reactive-atmosphere__blob--one" />
      <span className="reactive-atmosphere__blob reactive-atmosphere__blob--two" />
      <span className="reactive-atmosphere__blob reactive-atmosphere__blob--three" />
      <span className="reactive-atmosphere__blob reactive-atmosphere__blob--four" />
      <span className="reactive-atmosphere__blob reactive-atmosphere__blob--five" />
      <span className="reactive-atmosphere__blob reactive-atmosphere__blob--six" />
      <span className="reactive-atmosphere__blob reactive-atmosphere__blob--seven" />
      <span className="reactive-atmosphere__blob reactive-atmosphere__blob--eight" />
      <span className="reactive-atmosphere__blob reactive-atmosphere__blob--nine" />
    </div>
  );
};

export default ReactiveAtmosphere;
