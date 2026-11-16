import React, { useEffect, useRef } from 'react';
import { subscribeAnimation } from '../utils/motion';
export default function StoryProgress({
  storyId,
  paused,
  video,
  onComplete
}) {
  const bar = useRef(null),
    elapsed = useRef(0),
    complete = useRef(onComplete);
  complete.current = onComplete;
  useEffect(() => {
    elapsed.current = 0;
    if (bar.current) bar.current.style.transform = 'scaleX(0)';
  }, [storyId]);
  useEffect(() => {
    if (paused) return undefined;
    return subscribeAnimation((_, delta) => {
      let ratio;
      if (video) {
        const media = video.current;
        if (!media || !Number.isFinite(media.duration) || !media.duration || media.paused) return;
        ratio = media.currentTime / media.duration;
      } else {
        elapsed.current += delta * 1000;
        ratio = elapsed.current / 7000;
      }
      if (bar.current) bar.current.style.transform = `scaleX(${Math.min(1, ratio)})`;
      if (!video && ratio >= 1) {
        complete.current();
        return false;
      }
    }, 30);
  }, [storyId, paused, video]);
  return <div className="story-progress" aria-hidden="true"><span ref={bar} /></div>;
}
