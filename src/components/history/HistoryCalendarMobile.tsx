import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AttendanceHistoryRecord } from '../../types/attendanceHistory.types';

interface HistoryCalendarMobileProps {
  onDateSelect: (date: string) => void;
  onMonthChange: (year: number, month: number) => void;
  selectedDate: string;
  currentDate: Date; // {year, month} for calendar view
  records?: AttendanceHistoryRecord[];
}

export const HistoryCalendarMobile: React.FC<HistoryCalendarMobileProps> = ({
  onDateSelect,
  onMonthChange,
  selectedDate,
  currentDate,
  records = [],
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

  const getDayStyle = (day: number) => {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(d);
    checkDate.setHours(0, 0, 0, 0);

    const isTodayDate = isToday(day);
    const isFutureDate = checkDate > today;
    const selected = isSelected(day);
    const dayOfWeek = d.getDay(); // 0 = Sun, 6 = Sat
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const record = records.find(r => r.attendance_date === dateStr);
    const status = record?.official_status;

    // Status-based solid background colors
    if (status === 'present' || status === 'official_duty') {
      return {
        bg: 'bg-[#44C1A3]',
        text: 'text-white font-semibold',
        border: selected ? 'ring-2 ring-offset-1 ring-[#111827]' : 'border border-transparent',
      };
    }
    if (status === 'sick' || status === 'permit' || status === 'leave') {
      return {
        bg: 'bg-[#F59E0B]',
        text: 'text-white font-semibold',
        border: selected ? 'ring-2 ring-offset-1 ring-[#111827]' : 'border border-transparent',
      };
    }
    if (status === 'absent') {
      return {
        bg: 'bg-[#DC2626]',
        text: 'text-white font-semibold',
        border: selected ? 'ring-2 ring-offset-1 ring-[#111827]' : 'border border-transparent',
      };
    }

    // Future dates
    if (isFutureDate) {
      return {
        bg: 'bg-white',
        text: 'text-slate-400 font-normal hover:bg-slate-50',
        border: 'border border-transparent',
      };
    }

    // Today without status
    if (isTodayDate) {
      return {
        bg: selected ? 'bg-[#F97316]' : 'bg-white',
        text: selected ? 'text-white font-bold' : 'text-[#F97316] font-bold',
        border: selected ? 'border border-[#F97316]' : 'border border-[#F97316]',
      };
    }

    // Weekend without status
    if (isWeekend) {
      return {
        bg: selected ? 'bg-[#F97316]' : 'bg-white',
        text: selected ? 'text-white font-semibold' : 'text-[#DC2626] font-medium hover:bg-slate-100',
        border: 'border border-transparent',
      };
    }

    // Selected past date without status
    if (selected) {
      return {
        bg: 'bg-[#F97316]',
        text: 'text-white font-semibold',
        border: 'border border-transparent',
      };
    }

    // Default past date without status
    return {
      bg: 'bg-white',
      text: 'text-slate-700 font-medium hover:bg-slate-100',
      border: 'border border-transparent',
    };
  };

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-2xs">
      <div className="flex items-center justify-between mb-4">
        <button type="button" onClick={() => onMonthChange(currentDate.getFullYear(), currentDate.getMonth() - 1)} aria-label="Bulan sebelumnya" className="p-2 hover:bg-gray-100 rounded-full">
          <ChevronLeft className="w-5 h-5" />
        </button>
        <span className="text-sm font-bold capitalize">{monthName}</span>
        <button type="button" onClick={() => onMonthChange(currentDate.getFullYear(), currentDate.getMonth() + 1)} aria-label="Bulan berikutnya" className="p-2 hover:bg-gray-100 rounded-full">
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-slate-500 mb-2">
        {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map(d => <div key={d}>{d}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day, idx) => {
          if (!day) return <div key={idx} />;
          const style = getDayStyle(day);
          
          return (
            <button
              key={idx}
              type="button"
              onClick={() => {
                  const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
                  const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
                  onDateSelect(dateStr);
              }}
              className={`w-full aspect-square flex items-center justify-center rounded-lg text-xs relative transition-all ${style.bg} ${style.text} ${style.border}`}
            >
              {day}
            </button>
          );
        })}
      </div>
    </div>
  );
};

