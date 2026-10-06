import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui/Button';

interface HistoryCalendarMobileProps {
  onDateSelect: (date: string) => void;
  onMonthChange: (year: number, month: number) => void;
  selectedDate: string;
  currentDate: Date; // {year, month} for calendar view
}

export const HistoryCalendarMobile: React.FC<HistoryCalendarMobileProps> = ({
  onDateSelect,
  onMonthChange,
  selectedDate,
  currentDate,
}) => {
  const daysInMonth = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate(), [currentDate]);
  const firstDayOfMonth = useMemo(() => new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay(), [currentDate]);

  const days = useMemo(() => {
    const daysArray = [];
    // Adjust for Monday start (0=Sun, 1=Mon... -> 0=Mon, 6=Sun)
    const startDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;
    
    for (let i = 0; i < startDay; i++) {
      daysArray.push(null);
    }
    for (let i = 1; i <= daysInMonth; i++) {
      daysArray.push(i);
    }
    return daysArray;
  }, [daysInMonth, firstDayOfMonth]);

  const monthName = currentDate.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });

  const isToday = (day: number) => {
    const today = new Date();
    return day === today.getDate() && currentDate.getMonth() === today.getMonth() && currentDate.getFullYear() === today.getFullYear();
  };

  const isSelected = (day: number) => {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return dateStr === selectedDate;
  };

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-2xs">
      <div className="flex items-center justify-between mb-4">
        <button type="button" onClick={() => onMonthChange(currentDate.getFullYear(), currentDate.getMonth())} aria-label="Bulan sebelumnya" className="p-2 hover:bg-gray-100 rounded-full">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-sm font-bold capitalize">{monthName}</span>
        <button type="button" onClick={() => onMonthChange(currentDate.getFullYear(), currentDate.getMonth() + 2)} aria-label="Bulan berikutnya" className="p-2 hover:bg-gray-100 rounded-full">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-slate-500 mb-2">
        {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map(d => <div key={d}>{d}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day, idx) => {
          if (!day) return <div key={idx} />;
          const selected = isSelected(day);
          const today = isToday(day);
          
          return (
            <button
              key={idx}
              type="button"
              onClick={() => {
                  const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                  const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                  onDateSelect(dateStr);
              }}
              className={`w-full aspect-square flex items-center justify-center rounded-lg text-xs font-medium relative
                ${selected ? 'bg-[#F97316] text-white' : today ? 'border border-[#F97316] text-[#F97316]' : 'text-slate-700 hover:bg-slate-100'}
              `}
            >
              {day}
              {today && !selected && <span className="absolute bottom-1 w-1 h-1 bg-[#F97316] rounded-full" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};
