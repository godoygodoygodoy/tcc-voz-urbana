import React from 'react';
import { unlockChristmas, isChristmasUnlocked } from '../utils/christmasTheme';

const REQUIRED_CLICKS = 10;
const SEQUENCE_TIMEOUT = 1500;

let clickCount = 0;
let resetTimer;

const PigeonLogo = ({ className }) => {
  const handleClick = () => {
    clickCount += 1;
    window.clearTimeout(resetTimer);

    if (clickCount >= REQUIRED_CLICKS) {
      const sound = new Audio(`${import.meta.env.BASE_URL}audio/pombo.mp3`);
      void sound.play().catch(() => undefined);
      if (!isChristmasUnlocked()) {
        const sounds = Number(localStorage.getItem('voz-urbana-pigeon-sounds') || 0) + 1;
        localStorage.setItem('voz-urbana-pigeon-sounds', String(sounds));
        if (sounds >= 3) unlockChristmas();
      }
      clickCount = 0;
      return;
    }

    resetTimer = window.setTimeout(() => {
      clickCount = 0;
    }, SEQUENCE_TIMEOUT);
  };

  return <span className="pigeon-logo"><img src={`${import.meta.env.BASE_URL}branding/mascote-voz-urbana.png`} alt="Voz Urbana" className={className} onClick={handleClick} /><span className="pigeon-santa-hat" aria-hidden="true" /></span>;
};

export default PigeonLogo;
