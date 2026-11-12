import React, { useEffect, useRef, useState } from 'react';

// Reserve the same layout before loading optional maps or other below-fold content.
export default function ViewportLoad({ children, minHeight = 300, className = '', rootMargin = '350px' }) {
  const ref = useRef(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    if (!('IntersectionObserver' in window)) { setReady(true);return undefined; }
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { setReady(true);observer.disconnect(); } }, { rootMargin });
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [rootMargin]);
  return <div ref={ref} className={className} style={{ minHeight }}>{ready ? children : <div className="deferred-surface" style={{ minHeight }} aria-hidden="true" />}</div>;
}
