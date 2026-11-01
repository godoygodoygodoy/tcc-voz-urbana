import React, { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Clock3 } from 'lucide-react';

const monthNames = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];
const weekDays = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

const useFloatingField = (open, setOpen) => {
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (event) => {
      if (!ref.current?.contains(event.target)) setOpen(false);
    };
    const escape = (event) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', close);
      document.removeEventListener('keydown', escape);
    };
  }, [open, setOpen]);
  return ref;
};

export const FloatingSelect = ({ value, onChange, options, placeholder = 'Selecione uma opção', className = '' }) => {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(Math.max(0, options.findIndex((option) => option.value === value)));
  const ref = useFloatingField(open, setOpen);
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
      {open && <div className="floating-menu" role="listbox" aria-label={placeholder}>
        {options.map((option, index) => <button type="button" role="option" aria-selected={option.value === value} className={`floating-option ${option.value === value ? 'is-selected' : ''} ${index === highlighted ? 'is-highlighted' : ''}`} key={option.value} onMouseEnter={() => setHighlighted(index)} onClick={() => selectOption(option)}><span>{option.label}</span>{option.value === value && <Check size={15} />}</button>)}
      </div>}
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
  const ref = useFloatingField(open, setOpen);
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
      {open && <div className="floating-calendar" role="dialog" aria-label="Selecionar data">
        <div className="floating-calendar-head"><button type="button" aria-label="Mês anterior" onClick={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))}><ChevronLeft size={17} /></button><strong>{monthNames[month.getMonth()]} {month.getFullYear()}</strong><button type="button" aria-label="Próximo mês" onClick={() => setMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))}><ChevronRight size={17} /></button></div>
        <div className="floating-calendar-week">{weekDays.map((day, index) => <span key={`${day}-${index}`}>{day}</span>)}</div>
        <div className="floating-calendar-grid">{days.map((day) => { const current = dateValue(day); const outside = day.getMonth() !== month.getMonth(); return <button type="button" key={current} className={`floating-day ${outside ? 'is-outside' : ''} ${current === today ? 'is-today' : ''} ${current === value ? 'is-selected' : ''}`} onClick={() => choose(day)}>{day.getDate()}</button>; })}</div>
      </div>}
    </div>
  );
};

export const FloatingTimePicker = ({ value, onChange, placeholder = 'Selecione uma hora' }) => {
  const [open, setOpen] = useState(false);
  const ref = useFloatingField(open, setOpen);
  const [hour, minute] = (value || '12:00').split(':').map(Number);
  const hours = Array.from({ length: 24 }, (_, index) => index);
  const minutes = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
  const choose = (nextHour, nextMinute) => onChange(`${String(nextHour).padStart(2, '0')}:${String(nextMinute).padStart(2, '0')}`);
  return (
    <div ref={ref} className="floating-field">
      <button type="button" className={`floating-trigger ${open ? 'is-open' : ''}`} onClick={() => setOpen((current) => !current)} aria-haspopup="dialog" aria-expanded={open}><span className={value ? '' : 'is-placeholder'}>{value || placeholder}</span><Clock3 size={16} /></button>
      {open && <div className="floating-time" role="dialog" aria-label="Selecionar hora"><div className="floating-time-column"><strong>Hora</strong>{hours.map((item) => <button type="button" key={item} className={item === hour ? 'is-selected' : ''} onClick={() => choose(item, minute)}>{String(item).padStart(2, '0')}</button>)}</div><div className="floating-time-column"><strong>Minuto</strong>{minutes.map((item) => <button type="button" key={item} className={item === minute ? 'is-selected' : ''} onClick={() => choose(hour, item)}>{String(item).padStart(2, '0')}</button>)}</div><button type="button" className="floating-time-done" onClick={() => setOpen(false)}>Concluir</button></div>}
    </div>
  );
};
