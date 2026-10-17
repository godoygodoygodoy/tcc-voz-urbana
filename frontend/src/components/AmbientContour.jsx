import React, { useEffect, useRef, useState } from 'react';

const paths = [
  'M-120 180 C 80 20, 220 360, 420 180 S 780 40, 980 220 S 1330 360, 1550 120',
  'M-160 520 C 90 280, 260 690, 520 470 S 900 260, 1120 520 S 1420 720, 1640 430',
  'M-180 850 C 120 620, 300 980, 560 760 S 930 560, 1180 820 S 1460 1000, 1660 760',
  'M-100 1080 C 180 820, 380 1180, 620 960 S 980 800, 1210 1020 S 1460 1200, 1720 920',
];

const AmbientContour = ({ variant = 'violet' }) => {
  const ref = useRef(null);
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const element = ref.current;
    if (!element || !('IntersectionObserver' in window)) return undefined;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), { rootMargin: '180px 0px' });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
  <div ref={ref} className={`ambient-contour ambient-contour--${variant} ${visible ? 'is-visible' : 'is-paused'}`} aria-hidden="true">
    <svg viewBox="0 0 1500 1100" preserveAspectRatio="none">
      {paths.map((path, index) => (
        <path
          key={path}
          d={path}
          className="ambient-contour__line"
          style={{ '--contour-index': index }}
        />
      ))}
    </svg>
    <span className="ambient-contour__orb ambient-contour__orb--one" />
    <span className="ambient-contour__orb ambient-contour__orb--two" />
    <span className="ambient-contour__orb ambient-contour__orb--three" />
    <span className="ambient-contour__orb ambient-contour__orb--four" />
    <span className="ambient-contour__orb ambient-contour__orb--five" />
    <span className="ambient-contour__orb ambient-contour__orb--six" />
  </div>
  );
};

export default AmbientContour;
