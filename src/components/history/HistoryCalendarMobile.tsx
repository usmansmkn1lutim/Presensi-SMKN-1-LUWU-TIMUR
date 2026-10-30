import React, { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';
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
  const [showDetails, setShowDetails] = useState<boolean>(false);

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
    const d = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
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
        bg: 'bg-[#ECFDF5]',
        text: 'text-[#065F46] font-semibold',
        border: selected
          ? 'ring-2 ring-offset-1 ring-[#111827]'
          : isTodayDate
          ? 'border border-[#F97316]'
          : 'border border-transparent',
      };
    }
    if (status === 'sick' || status === 'permit' || status === 'leave') {
      return {
        bg: 'bg-[#FFFBEB]',
        text: 'text-[#92400E] font-semibold',
        border: selected
          ? 'ring-2 ring-offset-1 ring-[#111827]'
          : isTodayDate
          ? 'border border-[#F97316]'
          : 'border border-transparent',
      };
    }
    if (status === 'absent') {
      return {
        bg: 'bg-[#FEF2F2]',
        text: 'text-[#991B1B] font-semibold',
        border: selected
          ? 'ring-2 ring-offset-1 ring-[#111827]'
          : isTodayDate
          ? 'border border-[#F97316]'
          : 'border border-transparent',
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
        border: 'border border-[#F97316]',
      };
    }

    // Weekend without status
    if (isWeekend) {
      return {
        bg: selected ? 'bg-[#F97316]' : 'bg-white',
        text: selected
          ? 'text-white font-semibold'
          : 'text-[#B55654] font-medium hover:bg-slate-100',
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

  // Rincian 7 Status (dihitung berdasarkan record tanggal unik)
  const onTimeCount = useMemo(() => {
    return records.filter(
      (r) => r.official_status === 'present' && r.check_in_status === 'on_time'
    ).length;
  }, [records]);

  const lateCount = useMemo(() => {
    return records.filter(
      (r) => r.official_status === 'present' && r.check_in_status === 'late'
    ).length;
  }, [records]);

  const officialDutyCount = useMemo(() => {
    return records.filter((r) => r.official_status === 'official_duty').length;
  }, [records]);

  const sickCount = useMemo(() => {
    return records.filter((r) => r.official_status === 'sick').length;
  }, [records]);

  const permitCount = useMemo(() => {
    return records.filter((r) => r.official_status === 'permit').length;
  }, [records]);

  const leaveCount = useMemo(() => {
    return records.filter((r) => r.official_status === 'leave').length;
  }, [records]);

  const absentCount = useMemo(() => {
    return records.filter((r) => r.official_status === 'absent').length;
  }, [records]);

  // Tiga Indikator Utama:
  // - Kehadiran = Hadir Tepat Waktu + Terlambat + Dinas Luar
  // - Berizin = Sakit + Izin + Cuti
  // - Alfa = Alpha
  const presenceCount =
    (summary?.present ?? (onTimeCount + lateCount)) +
    (summary?.officialDuty ?? officialDutyCount);
  const permittedCount =
    (summary?.sick ?? sickCount) +
    (summary?.permit ?? permitCount) +
    (summary?.leave ?? leaveCount);
  const alfaCount = summary?.absent ?? absentCount;

  const detailItems = [
    { label: 'Hadir Tepat Waktu', count: onTimeCount },
    { label: 'Terlambat', count: lateCount },
    { label: 'Dinas Luar', count: summary?.officialDuty ?? officialDutyCount },
    { label: 'Sakit', count: summary?.sick ?? sickCount },
    { label: 'Izin', count: summary?.permit ?? permitCount },
    { label: 'Cuti', count: summary?.leave ?? leaveCount },
    { label: 'Alpha', count: summary?.absent ?? absentCount },
  ];

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-2xs font-sans">
      {/* Header Navigasi Bulan */}
      <div className="flex items-center justify-between mb-4">
        <button
          type="button"
          onClick={() =>
            onMonthChange(currentDate.getFullYear(), currentDate.getMonth() - 1)
          }
          aria-label="Bulan sebelumnya"
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-slate-700" />
        </button>
        <span className="text-sm font-bold capitalize text-slate-900">{monthName}</span>
        <button
          type="button"
          onClick={() =>
            onMonthChange(currentDate.getFullYear(), currentDate.getMonth() + 1)
          }
          aria-label="Bulan berikutnya"
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-slate-700" />
        </button>
      </div>

      {/* Header Hari */}
      <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-slate-500 mb-2 font-medium">
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

      {/* Rekap Kehadiran Bulan Ini (Dalam Satu Card yang Sama) */}
      <div className="border-t border-[#E5E7EB] pt-4 mt-4">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
          Rekap Kehadiran Bulan Ini
        </h4>

        {/* Tiga Indikator Utama dalam satu baris */}
        <div className="grid grid-cols-3 gap-2">
          {/* 1. Kehadiran: #ECFDF5, teks #065F46 */}
          <div className="bg-[#ECFDF5] text-[#065F46] rounded-xl p-2.5 sm:p-3 text-center flex flex-col items-center justify-center">
            <span className="text-xl sm:text-2xl font-bold leading-none">
              {loading ? '-' : presenceCount}
            </span>
            <span className="text-[11px] sm:text-xs font-semibold mt-1 leading-tight">
              Kehadiran
            </span>
          </div>

          {/* 2. Berizin: #FFFBEB, teks #92400E */}
          <div className="bg-[#FFFBEB] text-[#92400E] rounded-xl p-2.5 sm:p-3 text-center flex flex-col items-center justify-center">
            <span className="text-xl sm:text-2xl font-bold leading-none">
              {loading ? '-' : permittedCount}
            </span>
            <span className="text-[11px] sm:text-xs font-semibold mt-1 leading-tight">
              Berizin
            </span>
          </div>

          {/* 3. Alfa: #FEF2F2, teks #991B1B */}
          <div className="bg-[#FEF2F2] text-[#991B1B] rounded-xl p-2.5 sm:p-3 text-center flex flex-col items-center justify-center">
            <span className="text-xl sm:text-2xl font-bold leading-none">
              {loading ? '-' : alfaCount}
            </span>
            <span className="text-[11px] sm:text-xs font-semibold mt-1 leading-tight">
              Alfa
            </span>
          </div>
        </div>

        {/* Aksi Buka/Tutup Rincian */}
        <div className="mt-3 flex justify-center">
          <button
            type="button"
            onClick={() => setShowDetails((prev) => !prev)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 transition-colors py-1.5 px-3 rounded-lg hover:bg-slate-100"
            aria-expanded={showDetails}
          >
            <span>{showDetails ? 'Tutup rincian' : 'Lihat rincian'}</span>
            {showDetails ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-500" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
            )}
          </button>
        </div>

        {/* Rincian Tujuh Status (Daftar teks sederhana, bukan card terpisah) */}
        {showDetails && (
          <div className="mt-2 pt-2 border-t border-slate-100 divide-y divide-slate-100">
            {detailItems.map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between py-1.5 px-1 text-xs text-slate-600"
              >
                <span>{item.label}</span>
                <span className="font-semibold text-slate-900">
                  {loading ? '-' : item.count}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
