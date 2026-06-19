export const getPurpleTone = (category = '') => {
  const colors = {
    Asfalto: '#64008b',
    Lixo: '#ff71b8',
    Vegetação: '#2cce03',
    Iluminação: '#e2006a',
    Sinalização: '#12d0f1',
    Saneamento: '#bb46ff',
  };

  return colors[category] || '#7C3AED';
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