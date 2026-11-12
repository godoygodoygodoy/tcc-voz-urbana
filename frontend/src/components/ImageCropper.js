import { useI18n } from '../i18n';
import React, { useEffect, useMemo, useState } from 'react';

export const IMAGE_ASPECTS = [
  { value: '1:1', label: '1:1', ratio: 1 },
  { value: '16:9', label: '16:9', ratio: 16 / 9 },
  { value: '9:16', label: '9:16', ratio: 9 / 16 },
  { value: '4:5', label: '4:5', ratio: 4 / 5 },
  { value: '5:4', label: '5:4', ratio: 5 / 4 },
];

const ImageCropper = ({ file, initialAspect = '1:1', onConfirm, onCancel }) => {
  const { t } = useI18n();
  const [aspect, setAspect] = useState(initialAspect);
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [drag, setDrag] = useState(null);
  const [source, setSource] = useState('');
  const selected = IMAGE_ASPECTS.find((item) => item.value === aspect) || IMAGE_ASPECTS[0];

  useEffect(() => {
    const url = URL.createObjectURL(file); setSource(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const confirm = () => {
    const image = new Image();
    image.onload = () => {
      const width = 1080;
      const height = Math.round(width / selected.ratio);
      const scale = Math.max(width / image.width, height / image.height) * zoom;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext('2d');
      context.drawImage(image, width / 2 + position.x - image.width * scale / 2, height / 2 + position.y - image.height * scale / 2, image.width * scale, image.height * scale);
      canvas.toBlob((blob) => {
        if (blob) onConfirm(new File([blob], file.name.replace(/\.[^.]+$/, '') + '-crop.jpg', { type: 'image/jpeg' }), aspect);
      }, 'image/jpeg', 0.9);
    };
    image.src = source;
  };

  return <div className="fixed inset-0 z-[1600] grid place-items-center bg-black/80 p-4" role="dialog" aria-modal="true" aria-label={t("Editar enquadramento da imagem")}>
    <div className="site-panel w-full max-w-xl rounded-2xl p-5">
      <div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-bold">{t("Ajustar imagem")}</h2><button type="button" onClick={onCancel} aria-label={t("Fechar")}>×</button></div>
      <div className="mx-auto max-h-[55vh] w-full max-w-[420px] overflow-hidden rounded-xl border border-violet-400/40 bg-black" style={{ aspectRatio: selected.ratio }}>
        <img src={source} alt={t("Prévia para enquadramento")} draggable="false" className="h-full w-full select-none object-contain" onPointerDown={(event) => setDrag({ x: event.clientX, y: event.clientY, position })} onPointerMove={(event) => drag && setPosition({ x: drag.position.x + event.clientX - drag.x, y: drag.position.y + event.clientY - drag.y })} onPointerUp={() => setDrag(null)} onPointerLeave={() => setDrag(null)} style={{ transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})` }} />
      </div>
      <div className="mt-4 flex flex-wrap gap-2">{IMAGE_ASPECTS.map((item) => <button type="button" key={item.value} onClick={() => setAspect(item.value)} className={`rounded-lg border px-3 py-1 text-xs ${aspect === item.value ? 'border-violet-400 bg-violet-500/25' : 'border-white/15'}`}>{item.label}</button>)}</div>
      <label className="mt-4 block text-xs text-white/60">{t("Zoom")}<input type="range" min="1" max="3" step="0.05" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} className="mt-2 w-full" /></label>
      <div className="mt-5 flex justify-end gap-3"><button type="button" onClick={onCancel}>{t("Cancelar")}</button><button type="button" onClick={confirm} className="feed-create-submit px-4 py-2">{t("Confirmar")}</button></div>
    </div>
  </div>;
};

export default ImageCropper;
