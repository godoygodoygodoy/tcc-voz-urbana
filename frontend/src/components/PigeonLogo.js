import React from 'react';
import { recordPigeonSound } from '../utils/christmasTheme';

const REQUIRED_CLICKS = 10;
const SEQUENCE_TIMEOUT = 1500;

let clickCount = 0;
let resetTimer;

const PigeonLogo = ({ className }) => {
  const handleClick = (event) => {
    event?.preventDefault();
    event?.stopPropagation();
    clickCount += 1;
    window.clearTimeout(resetTimer);

    if (clickCount >= REQUIRED_CLICKS) {
      const sound = new Audio(`${import.meta.env.BASE_URL}audio/pombo.mp3`);
      void sound.play().then(recordPigeonSound).catch(() => undefined);
      clickCount = 0;
      return;
    }

    resetTimer = window.setTimeout(() => {
      clickCount = 0;
    }, SEQUENCE_TIMEOUT);
  };

  return <span className="pigeon-logo"><img src={`${import.meta.env.BASE_URL}branding/mascote-voz-urbana.png`} alt="Voz Urbana" className={className} onClick={handleClick} role="button" tabIndex={0} aria-label="Interagir com o pombo" onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); handleClick(); } }} /><span className="pigeon-santa-hat" aria-hidden="true" /></span>;
};

export default PigeonLogo;
