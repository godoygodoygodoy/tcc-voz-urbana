import React from 'react';

export const ChristmasEffects = () => <div className="christmas-effects" aria-hidden="true"><div className="christmas-lights">{Array.from({ length: 18 }, (_, index) => <i key={index} />)}</div><div className="christmas-snow">{Array.from({ length: 26 }, (_, index) => <span key={index} style={{ '--snow-left': `${index * 3.85 + 1}%`, '--snow-delay': `${index * -0.47}s` }} />)}</div></div>;

export const NativityFooter = () => <footer className="site-footer"><div className="nativity" aria-label="Manjedoura com o nascimento de Jesus"><span className="nativity-star">✦</span><span className="nativity-roof">⌂</span><span className="nativity-family">♢</span><span className="nativity-manger">⌒</span></div><p>© Voz Urbana 2026 - Sua voz melhora a cidade</p><small>Celebramos o nascimento de Jesus Cristo</small></footer>;
