import { getLanguage, translate as tr, useI18n } from '../i18n';
import React, { createPortal } from 'react-dom';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Clock3 } from 'lucide-react';
import { ImagePlus, Upload, X } from 'lucide-react';



const useFloatingField = (open, setOpen, panelSize = { width: 280, height: 360, matchTriggerWidth: false }) => {
  const ref = useRef(null);
  const panelRef = useRef(null);
  const [position, setPosition] = useState(null);
  const updatePosition = useCallback(() => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const gap = 8;
    const viewportPadding = 8;
    const requestedWidth = panelSize.matchTriggerWidth
      ? Math.max(rect.width, panelSize.minWidth || 0)
      : panelRef.current?.offsetWidth || panelSize.width;
    const panelWidth = Math.min(requestedWidth, window.innerWidth - viewportPadding * 2);
    const availableBelow = Math.max(0, window.innerHeight - rect.bottom - gap - viewportPadding);
    const availableAbove = Math.max(0, rect.top - gap - viewportPadding);
    const contentHeight = panelRef.current?.scrollHeight || panelSize.height;
    const opensAbove = contentHeight > availableBelow && availableAbove > availableBelow;
    const availableHeight = opensAbove ? availableAbove : availableBelow;
    const maxHeight = Math.max(80, Math.min(contentHeight, availableHeight));
    const top = opensAbove
      ? Math.max(viewportPadding, rect.top - gap - maxHeight)
      : Math.min(window.innerHeight - viewportPadding - maxHeight, rect.bottom + gap);
    const left = Math.min(
      Math.max(viewportPadding, rect.left),
      Math.max(viewportPadding, window.innerWidth - panelWidth - viewportPadding),
    );
    setPosition({ left, top, width: panelWidth, maxHeight });
  }, [panelSize.height, panelSize.matchTriggerWidth, panelSize.minWidth, panelSize.width]);

  useEffect(() => {
    if (!open) {
      setPosition(null);
      return undefined;
    }
    const close = (event) => {
      if (!ref.current?.contains(event.target) && !panelRef.current?.contains(event.target)) setOpen(false);
    };
    const escape = (event) => {
      if (event.key === 'Escape' || event.key === 'Tab' && panelRef.current?.contains(event.target)) {
        if (event.key === 'Tab') event.preventDefault();
        setOpen(false); ref.current?.querySelector('button')?.focus();
      }
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    updatePosition();
    const frame = window.requestAnimationFrame(updatePosition);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', escape);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [open, setOpen, updatePosition]);
  useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
  }, [open, updatePosition]);
  return { ref, panelRef, position };
};

const FloatingPortal = ({ panelRef, position, className, children, ...props }) => {
  const { t } = useI18n();
  useEffect(() => {
    const panel = panelRef.current;
    if (!panel) return undefined;
    const handleWheel = (event) => {
      const target = event.target instanceof Element
        ? event.target.closest('.floating-time-column, .floating-menu, .floating-portal')
        : panel;
      const scrollTarget = target && target.scrollHeight > target.clientHeight ? target : panel;
      if (scrollTarget.scrollHeight <= scrollTarget.clientHeight) return;
      const maxScroll = scrollTarget.scrollHeight - scrollTarget.clientHeight;
      scrollTarget.scrollTop = Math.max(0, Math.min(maxScroll, scrollTarget.scrollTop + event.deltaY));
      event.preventDefault();
      event.stopPropagation();
    };
    panel.addEventListener('wheel', handleWheel, { passive: false });
    return () => panel.removeEventListener('wheel', handleWheel);
  }, [panelRef, position]);

  if (!position) return null;
  return createPortal(<div ref={panelRef} className={`floating-portal context-scroll ${className}`} style={{ left: position.left, top: position.top, width: position.width, maxHeight: position.maxHeight }} {...props}>{children}</div>, document.body);
};

export const FloatingSelect = ({ value, onChange, options, placeholder = tr("Selecione uma opção"), className = '' }) => {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(Math.max(0, options.findIndex((option) => option.value === value)));
  const { ref, panelRef, position } = useFloatingField(open, setOpen, {
    width: 240,
    height: 280,
    matchTriggerWidth: true,
    minWidth: 220,
  });
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

export const FloatingDatePicker = ({ value, onChange, placeholder = tr("Selecione uma data") }) => {
  const { t } = useI18n();
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
  const label = value ? toDate(value).toLocaleDateString(getLanguage()) : placeholder;
  const choose = (day) => {
    onChange(dateValue(day));
    setOpen(false);
  };

  return (
    <div ref={ref} className="floating-field">
      <button type="button" className={`floating-trigger ${open ? 'is-open' : ''}`} onClick={() => setOpen((current) => !current)} aria-haspopup="dialog" aria-expanded={open}><span className={value ? '' : 'is-placeholder'}>{label}</span><CalendarDays size={16} /></button>
      {open && <FloatingPortal panelRef={panelRef} position={position} className="floating-calendar" role="dialog" aria-label={t("Selecionar data")}>
        <div className="floating-calendar-head"><button type="button" aria-label={t("Mês anterior")} onClick={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}><ChevronLeft size={17} /></button><strong>{new Intl.DateTimeFormat(getLanguage(), { month: 'long' }).format(month)} {month.getFullYear()}</strong><button type="button" aria-label={t("Próximo mês")} onClick={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}><ChevronRight size={17} /></button></div>
        <div className="floating-calendar-week">{Array.from({ length: 7 }, (_, index) => new Intl.DateTimeFormat(getLanguage(), { weekday: 'narrow' }).format(new Date(2024, 0, 7 + index))).map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div>
        <div className="floating-calendar-grid">{days.map((day) => { const current = dateValue(day); const outside = day.getMonth() !== month.getMonth(); return <button type="button" key={current} className={`floating-day ${outside ? 'is-outside' : ''} ${current === today ? 'is-today' : ''} ${current === value ? 'is-selected' : ''}`} onClick={() => choose(day)}>{day.getDate()}</button>; })}</div>
      </FloatingPortal>}
    </div>
  );
};

export const FloatingTimePicker = ({ value, onChange, placeholder = tr("Selecione uma hora") }) => {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const { ref, panelRef, position } = useFloatingField(open, setOpen, { width: 220, height: 240 });
  const [hour, minute] = (value || '12:00').split(':').map(Number);
  const hours = Array.from({ length: 24 }, (_, index) => index);
  const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
  const choose = (nextHour, nextMinute) => onChange(`${String(nextHour).padStart(2, '0')}:${String(nextMinute).padStart(2, '0')}`);
  return (
    <div ref={ref} className="floating-field">
      <button type="button" className={`floating-trigger ${open ? 'is-open' : ''}`} onClick={() => setOpen((current) => !current)} aria-haspopup="dialog" aria-expanded={open}><span className={value ? '' : 'is-placeholder'}>{value || placeholder}</span><Clock3 size={16} /></button>
      {open && <FloatingPortal panelRef={panelRef} position={position} className="floating-time" role="dialog" aria-label={t("Selecionar hora")}><div className="floating-time-column"><strong>{t("Hora")}</strong>{hours.map((item) => <button type="button" key={item} className={item === hour ? 'is-selected' : ''} onClick={() => choose(item, minute)}>{String(item).padStart(2, '0')}</button>)}</div><div className="floating-time-column"><strong>{t("Minuto")}</strong>{minutes.map((item) => <button type="button" key={item} className={item === minute ? 'is-selected' : ''} onClick={() => choose(hour, item)}>{String(item).padStart(2, '0')}</button>)}</div><button type="button" className="floating-time-done" onClick={() => setOpen(false)}>{t("Concluir")}</button></FloatingPortal>}
    </div>
  );
};

export const UploadField = ({ id, accept, multiple = false, onChange, files = [], maxFiles, maxSizeMb = 5, label = tr("Selecionar arquivos"), hint = '' }) => {
  const { t } = useI18n();
  const inputRef = useRef(null);
  const names = files.map((file) => file.name).join(', ');
  return (
    <div className="upload-field">
      <input ref={inputRef} id={id} type="file" accept={accept} multiple={multiple} onChange={onChange} className="upload-field-input" />
      <button type="button" className="upload-field-button" onClick={() => inputRef.current?.click()}><ImagePlus size={18} /><span>{label}</span><Upload size={15} /></button>
      <div className="upload-field-meta"><span>{files.length ? t('{count} arquivo(s): {names}', { count: files.length, names }) : t("Nenhum arquivo selecionado")}</span>{(maxFiles || maxSizeMb) && <small>{maxFiles ? t('Até {count} arquivo(s)', { count: maxFiles }) : ''}{maxFiles && maxSizeMb ? ' · ' : ''}{maxSizeMb ? t('{size} MB por arquivo', { size: maxSizeMb }) : ''}</small>}</div>
      {files.length > 0 && <div className="upload-field-list">{files.map((file, index) => <span key={`${file.name}-${index}`}><ImagePlus size={13} />{file.name}<button type="button" aria-label={t('Remover {name}', { name: file.name })} onClick={() => { const next = files.filter((_, fileIndex) => fileIndex !== index); onChange({ target: { files: next, value: '' } }); }}><X size={13} /></button></span>)}</div>}
      {hint && <p className="upload-field-hint">{hint}</p>}
    </div>
  );
};
