import React from 'react';

const REQUIRED_CLICKS = 10;
const SEQUENCE_TIMEOUT = 1500;

let clickCount = 0;
let resetTimer;

const PigeonLogo = ({ className }) => {
  const handleClick = () => {
    clickCount += 1;
    window.clearTimeout(resetTimer);

    if (clickCount >= REQUIRED_CLICKS) {
      const sound = new Audio('/audio/pombo.mp3');
      void sound.play();
      clickCount = 0;
      return;
    }

    resetTimer = window.setTimeout(() => {
      clickCount = 0;
    }, SEQUENCE_TIMEOUT);
  };

  return (
    <img
      src="/branding/mascote-voz-urbana.png"
      alt="Voz Urbana"
      className={className}
      onClick={handleClick}
    />
  );
};

export default PigeonLogo;