export const STORY_WIDTH = 1080,
  STORY_HEIGHT = 1920;
export const storyFonts = {
  Modern: 'Arial, sans-serif',
  Classic: 'Georgia, serif',
  Signature: 'cursive',
  Editor: 'monospace'
};
export const storyEffects = {
  normal: 'none',
  mono: 'grayscale(1)',
  warm: 'sepia(.45) saturate(1.25)',
  vivid: 'saturate(1.7) contrast(1.08)',
  vintage: 'sepia(.65) contrast(.9)',
  bright: 'brightness(1.3)',
  cool: 'hue-rotate(20deg) saturate(.8)',
  mirror: 'none',
  blur: 'blur(3px)'
};
export const newElement = (type, properties = {}) => ({
  id: crypto.randomUUID(),
  type,
  text: '',
  x: 540,
  y: 960,
  width: .65,
  size: 64,
  font: 'Modern',
  color: '#ffffff',
  fill: null,
  align: 'center',
  rotation: 0,
  opacity: 1,
  ...properties
});
export const toComposition = (elements, effect = 'normal', intensity = 1) => ({
  version: 1,
  effect,
  intensity,
  elements: elements.map(({
    x,
    y,
    angle,
    ...element
  }) => ({
    ...element,
    x: x / 1080,
    y: y / 1920,
    rotation: element.rotation ?? angle ?? 0
  }))
});
export const fromComposition = composition => (composition?.elements || []).map(element => ({
  ...element,
  x: element.x * 1080,
  y: element.y * 1920
}));
export function mediaEffect(effect, intensity = 1) {
  const n = Math.max(0, Math.min(1, intensity));
  return {
    filter: effect === 'mono' ? `grayscale(${n})` : effect === 'warm' ? `sepia(${.45 * n}) saturate(${1 + .25 * n})` : effect === 'vivid' ? `saturate(${1 + .7 * n}) contrast(${1 + .08 * n})` : effect === 'vintage' ? `sepia(${.65 * n}) contrast(${1 - .1 * n})` : effect === 'bright' ? `brightness(${1 + .3 * n})` : effect === 'cool' ? `hue-rotate(${20 * n}deg) saturate(${1 - .2 * n})` : effect === 'blur' ? `blur(${3 * n}px)` : 'none',
    transform: effect === 'mirror' ? 'scaleX(-1)' : undefined
  };
}
