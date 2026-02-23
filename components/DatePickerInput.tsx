import React, { useEffect, useRef } from 'react';
import flatpickr from 'flatpickr';
import 'flatpickr/dist/flatpickr.min.css';
import { Calendar } from 'lucide-react';

interface DatePickerInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  minDate?: string;
  maxDate?: string;
}

const formatDateLocal = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const DatePickerInput: React.FC<DatePickerInputProps> = ({
  value,
  onChange,
  placeholder = 'mm/dd/yyyy',
  className = '',
  minDate,
  maxDate,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const pickerRef = useRef<ReturnType<typeof flatpickr> | null>(null);

  useEffect(() => {
    if (!inputRef.current) return;

    if (pickerRef.current) {
      pickerRef.current.destroy();
    }

    pickerRef.current = flatpickr(inputRef.current, {
      dateFormat: 'Y-m-d',
      defaultDate: value || null,
      allowInput: false,
      disableMobile: true,
      minDate: minDate || undefined,
      maxDate: maxDate || undefined,
      onChange: (selectedDates) => {
        if (selectedDates.length > 0) {
          onChange(formatDateLocal(selectedDates[0]));
          return;
        }
        onChange('');
      },
    });

    return () => {
      if (pickerRef.current) {
        pickerRef.current.destroy();
        pickerRef.current = null;
      }
    };
  }, [onChange, minDate, maxDate]);

  useEffect(() => {
    if (!pickerRef.current) return;
    const current = pickerRef.current.selectedDates[0];
    const currentValue = current ? formatDateLocal(current) : '';
    if (currentValue !== value) {
      pickerRef.current.setDate(value || '', false);
    }
  }, [value]);

  return (
    <div className={`relative ${className}`}>
      <input
        ref={inputRef}
        type="text"
        readOnly
        value={value}
        placeholder={placeholder}
        className="w-full pl-3 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-orange-500/20 cursor-pointer"
      />
      <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 pointer-events-none" />
    </div>
  );
};

export default DatePickerInput;
