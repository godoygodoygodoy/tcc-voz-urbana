const purplePalette = ['#4C1D95', '#6D28D9', '#7C3AED', '#8B5CF6', '#A855F7', '#C084FC'];

const hashString = (value = '') => String(value)
  .split('')
  .reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 0);

export const getPurpleTone = (seed = 0) => {
  const key = typeof seed === 'number' ? seed : hashString(seed);
  return purplePalette[key % purplePalette.length];
};

export const getStatusTone = (status = '') => {
  const tones = {
    open: 'bg-violet-600 text-white',
    in_progress: 'bg-violet-500 text-white',
    resolved: 'bg-violet-300 text-zinc-950',
    closed: 'bg-violet-950 text-white',
  };

  return tones[status] || tones.open;
};