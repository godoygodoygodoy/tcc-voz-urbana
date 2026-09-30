const categoryPalette = [
  '#E4572E', '#168AAD', '#2A9D8F', '#E9C46A', '#7B2CBF',
  '#D7263D', '#3A86FF', '#F77F00', '#8338EC', '#06D6A0',
];

const hashString = (value = '') => String(value)
  .split('')
  .reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) >>> 0, 0);

// Indexes are used in legends so adjacent categories never repeat a color.
export const getPurpleTone = (seed = 0, index) => {
  if (Number.isInteger(index)) return categoryPalette[Math.abs(index) % categoryPalette.length];
  const key = typeof seed === 'number' ? seed : hashString(seed);
  return categoryPalette[key % categoryPalette.length];
};

export const getStatusTone = (status = '') => {
  const tones = {
    ABERTO: 'bg-red-600 text-white',
    EM_ANDAMENTO: 'bg-amber-500 text-zinc-950',
    RESOLVIDO: 'bg-emerald-600 text-white',
    REJEITADO: 'bg-zinc-700 text-white',
  };

  return tones[status] || tones.open;
};
