import React, { useRef } from 'react';

const AvatarPicker = ({
  value,
  onChange,
  positionX,
  positionY,
  onPositionChange,
  title = 'Foto de perfil',
  subtitle = 'Escolha uma imagem e ajuste o enquadramento.',
}) => {
  const fileInputRef = useRef(null);

  const handleSelectFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      onChange(reader.result?.toString() || '');
    };
    reader.readAsDataURL(file);
  };

  const clearPhoto = () => {
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4 rounded-3xl border border-white/10 bg-[#080b14] p-5 text-white shadow-[0_18px_60px_rgba(0,0,0,0.25)]">
      <div className="flex items-center gap-4">
        <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/15 bg-white/6">
          {value ? (
            <img
              src={value}
              alt="Foto de perfil"
              className="h-full w-full object-cover"
              style={{ objectPosition: `${positionX}% ${positionY}%` }}
            />
          ) : (
            <div className="text-center text-xs uppercase tracking-[0.24em] text-white/35">
              Sem foto
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-white">{title}</p>
          <p className="mt-1 text-sm leading-6 text-white/55">{subtitle}</p>

          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-full bg-white px-4 py-2 text-sm font-black text-zinc-950 transition hover:bg-violet-50"
            >
              Selecionar foto
            </button>
            {value ? (
              <button
                type="button"
                onClick={clearPhoto}
                className="rounded-full border border-white/12 bg-white/6 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/12"
              >
                Remover
              </button>
            ) : null}
          </div>
        </div>
      </div>

      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleSelectFile} />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span className="block text-white/60">Posição horizontal</span>
          <input
            type="range"
            min="0"
            max="100"
            value={positionX}
            onChange={(event) => onPositionChange({ x: Number(event.target.value), y: positionY })}
            className="w-full accent-violet-400"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="block text-white/60">Posição vertical</span>
          <input
            type="range"
            min="0"
            max="100"
            value={positionY}
            onChange={(event) => onPositionChange({ x: positionX, y: Number(event.target.value) })}
            className="w-full accent-violet-400"
          />
        </label>
      </div>
    </div>
  );
};

export default AvatarPicker;
