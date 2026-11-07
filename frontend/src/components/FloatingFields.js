import React, { createPortal } from 'react-dom';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Clock3 } from 'lucide-react';
import { ImagePlus, Upload, X } from 'lucide-react';

const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];
const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

const useFloatingField = (open, setOpen, panelSize = { width: 280, height: 360, matchTriggerWidth: false }) => {
  const ref = useRef(null);
  const panelRef = useRef(null);
  const [position, setPosition] = useState(null);
  const updatePosition = () => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const panelWidth = panelSize.matchTriggerWidth
      ? ref.current.getBoundingClientRect().width
      : panelRef.current?.offsetWidth || panelSize.width;
    const panelHeight = panelRef.current?.offsetHeight || panelSize.height;
    const gap = 8;
    const left = Math.min(Math.max(8, rect.left), Math.max(8, window.innerWidth - panelWidth - 8));
    const below = window.innerHeight - rect.bottom - gap;
    const top = below >= Math.min(panelHeight, window.innerHeight - 16)
      ? rect.bottom + gap
      : Math.max(8, rect.top - panelHeight - gap);
    setPosition({ left, top, width: panelWidth, maxHeight: Math.max(160, window.innerHeight - top - 8) });
  };
  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (!ref.current?.contains(event.target) && !panelRef.current?.contains(event.target)) setOpen(false);
    };
    const escape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    updatePosition();
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', escape);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, setOpen]);
  useLayoutEffect(() => {
    if (open) updatePosition();
  }, [open, panelSize.height, panelSize.width]);
  return { ref, panelRef, position };
};

const FloatingPortal = ({ panelRef, position, className, children, ...props }) => {
  if (!position) return null;
  return createPortal(<div ref={panelRef} className={`floating-portal ${className}`} style={{ left: position.left, top: position.top, width: position.width, maxHeight: position.maxHeight }} {...props}>{children}</div>, document.body);
};

export const FloatingSelect = ({ value, onChange, options, placeholder = 'Selecione uma opção', className = '' }) => {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(Math.max(0, options.findIndex((option) => option.value === value)));
  const { ref, panelRef, position } = useFloatingField(open, setOpen, { width: 240, height: 280, matchTriggerWidth: true });
  const selected = options.find((option) => option.value === value);
  const selectOption = (option) => {
    onChange(option.value);
    setOpen(false);
  };

  return (
    <div ref={ref} className={`floating-field ${className}`}>
      <button type="button" className={`floating-trigger ${open ? 'is-open' : ''}`} onClick={() => { setHighlighted(Math.max(0, options.findIndex((option) => option.value === value))); setOpen((current) => !current); }} onKeyDown={(event) => {
        if (!open && ['ArrowDown', 'ArrowUp'].includes(event.key)) { event.preventDefault(); setOpen(true); return; }
        if (!open) return;
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
          event.preventDefault();
          setHighlighted((current) => (current + (event.key === 'ArrowDown' ? 1 : options.length - 1)) % options.length);
        }
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          if (options[highlighted]) selectOption(options[highlighted]);
        }
      }} aria-haspopup="listbox" aria-expanded={open}>
        <span className={selected ? '' : 'is-placeholder'}>{selected?.label || placeholder}</span>
        <ChevronDown size={16} aria-hidden="true" />
      </button>
      {open && <FloatingPortal panelRef={panelRef} position={position} className="floating-menu" role="listbox" aria-label={placeholder}>
        {options.map((option, index) => <button type="button" role="option" aria-selected={option.value === value} className={`floating-option ${option.value === value ? 'is-selected' : ''} ${index === highlighted ? 'is-highlighted' : ''}`} key={option.value} onMouseEnter={() => setHighlighted(index)} onClick={() => selectOption(option)}><span>{option.label}</span>{option.value === value && <Check size={15} />}</button>)}
      </FloatingPortal>}
    </div>
  );
};

const toDate = (value) => {
  if (!value) return new Date();
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
};
const dateValue = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const FloatingDatePicker = ({ value, onChange, placeholder = 'Selecione uma data' }) => {
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(() => toDate(value));
  const { ref, panelRef, position } = useFloatingField(open, setOpen, { width: 276, height: 300 });
  const days = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1);
    const start = new Date(first);
    start.setDate(1 - first.getDay());
    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(start);
      day.setDate(start.getDate() + index);
      return day;
    });
  }, [month]);
  const today = dateValue(new Date());
  const label = value ? toDate(value).toLocaleDateString('pt-BR') : placeholder;
  const choose = (day) => {
    onChange(dateValue(day));
    setOpen(false);
  };

  return (
    <div ref={ref} className="floating-field">
      <button type="button" className={`floating-trigger ${open ? 'is-open' : ''}`} onClick={() => setOpen((current) => !current)} aria-haspopup="dialog" aria-expanded={open}><span className={value ? '' : 'is-placeholder'}>{label}</span><CalendarDays size={16} /></button>
      {open && <FloatingPortal panelRef={panelRef} position={position} className="floating-calendar" role="dialog" aria-label="Selecionar data">
        <div className="floating-calendar-head"><button type="button" aria-label="Mês anterior" onClick={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}><ChevronLeft size={17} /></button><strong>{monthNames[month.getMonth()]} {month.getFullYear()}</strong><button type="button" aria-label="Próximo mês" onClick={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}><ChevronRight size={17} /></button></div>
        <div className="floating-calendar-week">{weekDays.map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div>
        <div className="floating-calendar-grid">{days.map((day) => { const current = dateValue(day); const outside = day.getMonth() !== month.getMonth(); return <button type="button" key={current} className={`floating-day ${outside ? 'is-outside' : ''} ${current === today ? 'is-today' : ''} ${current === value ? 'is-selected' : ''}`} onClick={() => choose(day)}>{day.getDate()}</button>; })}</div>
      </FloatingPortal>}
    </div>
  );
};

export const FloatingTimePicker = ({ value, onChange, placeholder = 'Selecione uma hora' }) => {
  const [open, setOpen] = useState(false);
  const { ref, panelRef, position } = useFloatingField(open, setOpen, { width: 220, height: 240 });
  const [hour, minute] = (value || '12:00').split(':').map(Number);
  const hours = Array.from({ length: 24 }, (_, index) => index);
  const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
  const choose = (nextHour, nextMinute) => onChange(`${String(nextHour).padStart(2, '0')}:${String(nextMinute).padStart(2, '0')}`);
  return (
    <div ref={ref} className="floating-field">
      <button type="button" className={`floating-trigger ${open ? 'is-open' : ''}`} onClick={() => setOpen((current) => !current)} aria-haspopup="dialog" aria-expanded={open}><span className={value ? '' : 'is-placeholder'}>{value || placeholder}</span><Clock3 size={16} /></button>
      {open && <FloatingPortal panelRef={panelRef} position={position} className="floating-time" role="dialog" aria-label="Selecionar hora"><div className="floating-time-column"><strong>Hora</strong>{hours.map((item) => <button type="button" key={item} className={item === hour ? 'is-selected' : ''} onClick={() => choose(item, minute)}>{String(item).padStart(2, '0')}</button>)}</div><div className="floating-time-column"><strong>Minuto</strong>{minutes.map((item) => <button type="button" key={item} className={item === minute ? 'is-selected' : ''} onClick={() => choose(hour, item)}>{String(item).padStart(2, '0')}</button>)}</div><button type="button" className="floating-time-done" onClick={() => setOpen(false)}>Concluir</button></FloatingPortal>}
    </div>
  );
};

export const UploadField = ({ id, accept, multiple = false, onChange, files = [], maxFiles, maxSizeMb = 5, label = 'Selecionar arquivos', hint = '' }) => {
  const inputRef = useRef(null);
  const names = files.map((file) => file.name).join(', ');
  return (
    <div className="upload-field">
      <input ref={inputRef} id={id} type="file" accept={accept} multiple={multiple} onChange={onChange} className="upload-field-input" />
      <button type="button" className="upload-field-button" onClick={() => inputRef.current?.click()}><ImagePlus size={18} /><span>{label}</span><Upload size={15} /></button>
      <div className="upload-field-meta"><span>{files.length ? `${files.length} arquivo(s): ${names}` : 'Nenhum arquivo selecionado'}</span>{(maxFiles || maxSizeMb) && <small>{maxFiles ? `Até ${maxFiles} arquivo(s)` : ''}{maxFiles && maxSizeMb ? ' · ' : ''}{maxSizeMb ? `${maxSizeMb} MB por arquivo` : ''}</small>}</div>
      {files.length > 0 && <div className="upload-field-list">{files.map((file, index) => <span key={`${file.name}-${index}`}><ImagePlus size={13} />{file.name}<button type="button" aria-label={`Remover ${file.name}`} onClick={() => { const next = files.filter((_, fileIndex) => fileIndex !== index); onChange({ target: { files: next, value: '' } }); }}><X size={13} /></button></span>)}</div>}
      {hint && <p className="upload-field-hint">{hint}</p>}
    </div>
  );
};
