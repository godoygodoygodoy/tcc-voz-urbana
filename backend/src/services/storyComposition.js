import { socialError } from './socialGraph.js';
export const STORY_EFFECTS = ['normal', 'mono', 'warm', 'vivid', 'vintage', 'bright', 'cool', 'mirror', 'blur'];
export const INTERACTIVE_STICKERS = ['poll', 'question', 'slider', 'countdown'];
const fail = () => {
  throw socialError(400, 'storyCompositionInvalid');
};
const number = (value, min, max) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max ? value : fail();
const text = (value, max = 500) => typeof value === 'string' && value.length <= max ? value : fail();
export function safeStoryLink(value) {
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || url.username || url.password || url.href.length > 1000) fail();
    return url.href;
  } catch {
    return fail();
  }
}
// Persist only a versioned, bounded document. Never HTML, CSS, arbitrary media URLs,
// provider secrets, script or user-selected remote fetch targets.
export function validateComposition(input) {
  if (input == null || input === '') return null;
  let value = input;
  try {
    if (typeof input === 'string') value = JSON.parse(input);
  } catch {
    fail();
  }
  if (!value || JSON.stringify(value).length > 100000 || value.version !== 1 || !Array.isArray(value.elements) || value.elements.length > 30) fail();
  const ids = new Set();
  const elements = value.elements.map(item => {
    if (!item || !['giphy', 'text', 'emoji', 'link', 'hashtag', 'location', 'mention', 'music', ...INTERACTIVE_STICKERS].includes(item.type)) fail();
    const id = text(item.id, 64);
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(id) || ids.has(id)) fail();
    ids.add(id);
    const result = {
      id,
      type: item.type,
      x: number(item.x, 0, 1),
      y: number(item.y, 0, 1),
      width: number(item.width, .05, 1),
      rotation: number(item.rotation, -180, 180),
      opacity: number(item.opacity, 0, 1),
      text: text(item.text, 500),
      color: /^#[a-fA-F0-9]{6}$/.test(item.color) ? item.color : fail(),
      size: number(item.size, 16, 160),
      font: ['Modern', 'Classic', 'Signature', 'Editor'].includes(item.font) ? item.font : fail(),
      align: ['left', 'center', 'right'].includes(item.align) ? item.align : fail(),
      fill: item.fill === null ? null : /^#[a-fA-F0-9]{6}$/.test(item.fill) ? item.fill : fail()
    };
    if (item.type === 'giphy') {
      result.giphyId = text(item.giphyId, 64);
      if (!/^[a-zA-Z0-9]{1,64}$/.test(result.giphyId)) fail();
    }
    if (item.type === 'link') result.url = safeStoryLink(item.url);
    if (item.type === 'mention') result.userId = text(item.userId, 36);
    if (item.type === 'music') {
      if (item.provider !== 'apple') fail();
      result.provider = 'apple';
      result.catalogId = text(item.catalogId, 64);
      if (!/^\d+$/.test(result.catalogId)) fail();
    }
    if (item.type === 'poll') {
      if (!Array.isArray(item.options) || item.options.length < 2 || item.options.length > 4) fail();
      result.options = item.options.map(option => text(option, 100));
      if (new Set(result.options).size !== result.options.length || result.options.some(option => !option.trim())) fail();
    }
    if (item.type === 'slider') result.emoji = text(item.emoji, 16);
    if (item.type === 'countdown') {
      const end = new Date(item.endsAt);
      if (!Number.isFinite(+end) || +end > Date.now() + 366 * 86400000 || +end <= Date.now()) fail();
      result.endsAt = end.toISOString();
    }
    return result;
  });
  const effect = STORY_EFFECTS.includes(value.effect) ? value.effect : fail();
  return {
    version: 1,
    effect,
    intensity: number(value.intensity ?? 1, 0, 1),
    elements
  };
}
export function validateStickerAnswer(element, value) {
  if (element.type === 'poll') return number(value, 0, element.options.length - 1) === Math.floor(value) ? value : fail();
  if (element.type === 'slider') return number(value, 0, 100);
  if (element.type === 'question') {
    const answer = text(value, 1000).trim();
    return answer || fail();
  }
  if (element.type === 'countdown' && value === true) return true;
  return fail();
}
