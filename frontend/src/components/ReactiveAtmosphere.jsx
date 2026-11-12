import React, { useEffect, useRef } from 'react';
import { subscribeAnimation, useMotionBudget } from '../utils/motion';

const ReactiveAtmosphere = React.memo(() => {
  const ref = useRef(null);
  const { reduced, lowPower } = useMotionBudget();
  useEffect(() => {
    if (reduced) return undefined;
    const blobs = [...ref.current.querySelectorAll('.reactive-atmosphere__blob')];
    let cancel;
    let pointer;
    const updatePointer = event => {
      pointer = { x: (event.clientX / innerWidth - .5) * 100, y: (event.clientY / innerHeight - .5) * 100 };
      if (cancel) return;
      cancel = subscribeAnimation(() => {
        for (const [index, blob] of blobs.entries()) {
          const sign = index === 1 ? -1 : 1;
          blob.style.translate = `${(pointer.x * sign).toFixed(1)}% ${(pointer.y * sign).toFixed(1)}%`;
        }
        cancel = null;
        return false;
      }, lowPower ? 30 : 60);
    };
    window.addEventListener('pointermove', updatePointer, { passive: true });
    return () => { cancel?.();window.removeEventListener('pointermove', updatePointer); };
  }, [reduced, lowPower]);
  return <div ref={ref} className="reactive-atmosphere" aria-hidden="true">
    {['one','two','three','four','five','six','seven','eight','nine'].map(name => <span key={name} className={`reactive-atmosphere__blob reactive-atmosphere__blob--${name}`} />)}
  </div>;
});
export default ReactiveAtmosphere;
