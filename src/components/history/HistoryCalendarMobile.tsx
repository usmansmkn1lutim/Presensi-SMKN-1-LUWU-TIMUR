import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  AttendanceHistoryRecord,
  OfficialMonthlyRecapSummary,
} from '../../types/attendanceHistory.types';

interface HistoryCalendarMobileProps {
  onDateSelect: (date: string) => void;
  onMonthChange: (year: number, month: number) => void;
  selectedDate: string;
  currentDate: Date; // {year, month} for calendar view
  records?: AttendanceHistoryRecord[];
  summary?: OfficialMonthlyRecapSummary | null;
  loading?: boolean;
}

export const HistoryCalendarMobile: React.FC<HistoryCalendarMobileProps> = ({
  onDateSelect,
  onMonthChange,
  selectedDate,
  currentDate,
  records = [],
  summary = null,
  loading = false,
}) => {

  const daysInMonth = useMemo(
    () => new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate(),
    [currentDate]
  );
  const firstDayOfMonth = useMemo(
    () => new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay(),
    [currentDate]
  );

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

  const monthName = currentDate.toLocaleDateString('id-ID', {
    month: 'long',
    year: 'numeric',
  });

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  const isSelected = (day: number) => {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
    return dateStr === selectedDate;
  };

  const getDayStyle = (day: number) => {
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), day, 12, 0, 0);
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(d);
    checkDate.setHours(0, 0, 0, 0);

    const isTodayDate = isToday(day);
    const isFutureDate = checkDate > today;
    const selected = isSelected(day);
    const dayOfWeek = d.getDay(); // 0 = Sun, 6 = Sat
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

    const record = records.find((r) => r.attendance_date === dateStr);
    const status = record?.official_status;

    // Status-based background colors (soft background rounded corner with high-contrast text)
    if (status === 'present' || status === 'official_duty') {
      return {
        bg: 'bg-[#ECFDF5] dark:bg-emerald-950/60',
        text: 'text-[#065F46] dark:text-emerald-300 font-semibold',
        border: selected
          ? 'ring-2 ring-offset-1 ring-[#111827] dark:ring-white'
          : isTodayDate
          ? 'border border-[#F97316]'
          : 'border border-transparent',
      };
    }
    if (status === 'sick' || status === 'permit' || status === 'leave') {
      return {
        bg: 'bg-[#FFFBEB] dark:bg-amber-950/60',
        text: 'text-[#92400E] dark:text-amber-300 font-semibold',
        border: selected
          ? 'ring-2 ring-offset-1 ring-[#111827] dark:ring-white'
          : isTodayDate
          ? 'border border-[#F97316]'
          : 'border border-transparent',
      };
    }
    if (status === 'absent') {
      return {
        bg: 'bg-[#FEF2F2] dark:bg-red-950/60',
        text: 'text-[#991B1B] dark:text-red-300 font-semibold',
        border: selected
          ? 'ring-2 ring-offset-1 ring-[#111827] dark:ring-white'
          : isTodayDate
          ? 'border border-[#F97316]'
          : 'border border-transparent',
      };
    }

    // Today without status
    if (isTodayDate) {
      return {
        bg: selected ? 'bg-[#F97316]' : 'bg-white dark:bg-[#1E1E1E]',
        text: selected ? 'text-white font-bold' : 'text-[#F97316] font-bold',
        border: 'border border-[#F97316]',
      };
    }

    // Weekend without status (applies to all months and years, past and future)
    if (isWeekend) {
      return {
        bg: selected ? 'bg-[#F97316]' : 'bg-white dark:bg-[#1E1E1E]',
        text: selected
          ? 'text-white font-semibold'
          : 'text-[#B55654] dark:text-rose-400 font-medium hover:bg-slate-100 dark:hover:bg-zinc-800',
        border: 'border border-transparent',
      };
    }

    // Future weekday dates without status
    if (isFutureDate) {
      return {
        bg: 'bg-white dark:bg-[#1E1E1E]',
        text: 'text-slate-400 dark:text-zinc-600 font-normal hover:bg-slate-50 dark:hover:bg-zinc-800',
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
      bg: 'bg-white dark:bg-[#1E1E1E]',
      text: 'text-slate-700 dark:text-zinc-300 font-medium hover:bg-slate-100 dark:hover:bg-zinc-800',
      border: 'border border-transparent',
    };
  };

  return (
    <div className="bg-white dark:bg-[#1E1E1E] border border-[#E5E7EB] dark:border-[#333] rounded-2xl p-4 shadow-2xs font-sans">
      {/* Header Navigasi Bulan */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() =>
            onMonthChange(currentDate.getFullYear(), currentDate.getMonth() - 1)
          }
          aria-label="Bulan sebelumnya"
          className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-slate-700 dark:text-zinc-300" />
        </button>
        <span className="text-sm font-bold capitalize text-slate-900 dark:text-[#F3F4F6]">{monthName}</span>
        <button
          type="button"
          onClick={() =>
            onMonthChange(currentDate.getFullYear(), currentDate.getMonth() + 1)
          }
          aria-label="Bulan berikutnya"
          className="p-2 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-slate-700 dark:text-zinc-300" />
        </button>
      </div>

      {/* Header Hari */}
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-slate-500 dark:text-zinc-400 mb-2 font-medium">
        {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((d) => (
          <div key={d}>{d}</div>
        ))}
      </div>

      {/* Grid Tanggal Kalender */}
      <div className="grid grid-cols-7 gap-1">
        {days.map((day, idx) => {
          if (!day) return <div key={idx} />;
          const style = getDayStyle(day);

          return (
            <button
              key={idx}
              type="button"
              onClick={() => {
                const d = new Date(
                  currentDate.getFullYear(),
                  currentDate.getMonth(),
                  day
                );
                const dateStr = `${d.getFullYear()}-${String(
                  d.getMonth() + 1
                ).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
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
