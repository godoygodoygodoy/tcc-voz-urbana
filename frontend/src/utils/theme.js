const categoryPalette = ['#7C3AED', '#9333EA', '#6D28D9', '#A855F7', '#8B5CF6', '#5B21B6', '#C084FC'];

const hashString = (value = '') => String(value)
  .split('')
  .reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 0);

export const getPurpleTone = (seed = 0) => {
  const key = typeof seed === 'number' ? seed : hashString(seed);
  return categoryPalette[key % categoryPalette.length];
};

export const getStatusTone = (status = '') => {
  const tones = {
    ABERTO: 'bg-violet-700 text-white',
    EM_ANDAMENTO: 'bg-violet-500 text-white',
    RESOLVIDO: 'bg-violet-900 text-violet-100',
    REJEITADO: 'bg-zinc-700 text-white',
  };

  return tones[status] || tones.ABERTO;
};