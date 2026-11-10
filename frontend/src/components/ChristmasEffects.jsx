import React from 'react';
import { useChristmasTheme, setChristmasEffects } from '../utils/christmasTheme';
import { createPortal } from 'react-dom';
import { useLocation } from 'react-router-dom';

const ChristmasGarlands = () => {
  const { pathname } = useLocation();
  const [targets, setTargets] = React.useState([]);
  React.useEffect(() => {
    const update = () => {
      const next = [...document.querySelectorAll('section[id], .site-footer, .site-panel, .feed-sidebar')]
        .filter(element => element.getBoundingClientRect().width > 0)
        .filter((element, index, all) => !all.some(other => other !== element && other.contains(element)))
        .slice(0, 16);
      setTargets(current => current.length === next.length && current.every((element, index) => element === next[index]) ? current : next);
    };
    update();
    const observer = new MutationObserver(update);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [pathname]);
  return targets.map((target, index) => createPortal(
    <div className="christmas-garland" aria-hidden="true">
      <div className="christmas-garland-pine" />
      <div className="christmas-lights christmas-lights--section">{Array.from({ length: 16 }, (_, bulb) => <i key={bulb} />)}</div>
      <span className="christmas-garland-bow">✦</span>
    </div>, target, `garland-${index}`));
};
export const ChristmasEffects = () => {
  const { theme, effects } = useChristmasTheme();
  if (theme !== 'christmas') return null;
  return <>
    <div className="christmas-effects" aria-hidden="true">
      <div className="christmas-lights">{Array.from({ length: 30 }, (_, index) => <i key={index} />)}</div>
      {effects && <div className="christmas-snow">{Array.from({ length: 80 }, (_, index) => <span key={index} style={{ '--snow-left': `${(index * 37.7) % 100}%`, '--snow-delay': `${index * -0.73}s`, '--snow-duration': `${10 + index % 11}s`, '--snow-size': `${2 + index % 5}px` }} />)}</div>}
    </div>
    <ChristmasGarlands />
    <button className="christmas-effects-toggle" type="button" aria-pressed={effects} onClick={() => setChristmasEffects(!effects)}>{effects ? '❄ Pausar efeitos' : '❄ Ativar efeitos'}</button>
  </>;
};
export const NativityFooter = () => <footer className="site-footer">
  <svg className="nativity" viewBox="0 0 260 150" role="img" aria-labelledby="nativity-title">
    <title id="nativity-title">Nascimento de Jesus: Maria e José junto ao menino na manjedoura, sob a estrela de Belém</title>
    <defs><radialGradient id="nativity-light"><stop stopColor="#f5cf75" stopOpacity=".28"/><stop offset="1" stopColor="#f5cf75" stopOpacity="0"/></radialGradient></defs>
    <ellipse cx="130" cy="100" rx="105" ry="49" fill="url(#nativity-light)"/>
    <g fill="none" stroke="#b58a51" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"><path d="M34 70 130 30 226 70M50 65v71m160-71v71M40 138h180"/><path d="M58 65 130 35 202 65" strokeWidth="1"/></g>
    <path className="nativity-star" d="m130 3 4 12 12 4-12 4-4 12-4-12-12-4 12-4Z" fill="#ffe3a0"/>
    <g fill="#e7c78f"><circle cx="88" cy="83" r="10"/><circle cx="172" cy="78" r="10"/></g>
    <path d="M66 127q1-40 22-34 18 8 22 34" fill="#376b65" stroke="#91b3a0" strokeWidth="1.5"/>
    <path d="M151 127q1-46 21-38 20 8 22 38" fill="#80553c" stroke="#ceac78" strokeWidth="1.5"/>
    <path d="M188 91v42" stroke="#d1ad74" strokeWidth="3" strokeLinecap="round"/>
    <ellipse cx="130" cy="113" rx="24" ry="10" fill="#fff1cc"/><circle cx="121" cy="110" r="5" fill="#e7c78f"/>
    <path d="m106 118 10 12h28l10-12Zm8 23 29-17m-26 0 29 17" fill="none" stroke="#d2a05a" strokeWidth="3" strokeLinecap="round"/>
    <path d="m27 113 2 3m203-18 3 2M62 39l2 2m132-6 2 2" stroke="#f5cf75" strokeWidth="2"/>
  </svg>
  <p>© Voz Urbana 2026 - Sua voz melhora a cidade</p>
  <small>Celebramos o nascimento de Jesus Cristo</small>
</footer>;
