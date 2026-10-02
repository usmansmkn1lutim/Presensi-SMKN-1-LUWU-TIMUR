import React, { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  Info,
  CalendarOff,
  Edit2,
  Power,
} from 'lucide-react';
import {
  HolidayModel,
  HOLIDAY_TYPE_CONFIG,
} from '../../types/holiday.types';

interface HolidayCalendarViewProps {
  holidays: HolidayModel[];
  selectedYear: number;
  onYearChange: (year: number) => void;
  canManage: boolean;
  onEdit: (holiday: HolidayModel) => void;
  onToggleStatus: (holiday: HolidayModel) => void;
}

const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

const DAY_NAMES = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

export const HolidayCalendarView: React.FC<HolidayCalendarViewProps> = ({
  holidays,
  selectedYear,
  onYearChange,
  canManage,
  onEdit,
  onToggleStatus,
}) => {
  // Current displayed month (0 = Jan, 11 = Dec)
  const [currentMonth, setCurrentMonth] = useState<number>(() => {
    const now = new Date();
    // If selectedYear is current year, default to current month; otherwise January
    return now.getFullYear() === selectedYear ? now.getMonth() : 0;
  });

  // Selected date on the calendar grid ('YYYY-MM-DD' or null)
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Map of holidays by date 'YYYY-MM-DD'
  const holidaysByDate = useMemo(() => {
    const map = new Map<string, HolidayModel[]>();
    for (const h of holidays) {
      const existing = map.get(h.holidayDate) || [];
      existing.push(h);
      map.set(h.holidayDate, existing);
    }
    return map;
  }, [holidays]);

  // Holidays in the currently viewed month
  const monthlyHolidays = useMemo(() => {
    const monthPrefix = `${selectedYear}-${String(currentMonth + 1).padStart(2, '0')}`;
    return holidays.filter((h) => h.holidayDate.startsWith(monthPrefix));
  }, [holidays, selectedYear, currentMonth]);

  // Calendar matrix calculation for the month
  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(selectedYear, currentMonth, 1);
    const lastDayOfMonth = new Date(selectedYear, currentMonth + 1, 0);

    const totalDays = lastDayOfMonth.getDate();
    // getDay(): 0 = Sun, 1 = Mon ... 6 = Sat -> convert to Monday-first (0 = Mon, 6 = Sun)
    const rawStartDay = firstDayOfMonth.getDay();
    const startOffset = rawStartDay === 0 ? 6 : rawStartDay - 1;

    const cells: {
      dayNumber: number | null;
      dateString: string | null;
      isCurrentMonth: boolean;
      holidays: HolidayModel[];
    }[] = [];

    // Empty padding cells for days before the 1st
    for (let i = 0; i < startOffset; i++) {
      cells.push({
        dayNumber: null,
        dateString: null,
        isCurrentMonth: false,
        holidays: [],
      });
    }

    // Days of the month
    for (let day = 1; day <= totalDays; day++) {
      const dateString = `${selectedYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(
        day
      ).padStart(2, '0')}`;
      const dayHolidays = holidaysByDate.get(dateString) || [];
      cells.push({
        dayNumber: day,
        dateString,
        isCurrentMonth: true,
        holidays: dayHolidays,
      });
    }

    return cells;
  }, [selectedYear, currentMonth, holidaysByDate]);

  // Month navigation handlers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      onYearChange(selectedYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
    setSelectedDate(null);
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      onYearChange(selectedYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
    setSelectedDate(null);
  };

  // Selected date's holidays
  const selectedDateHolidays = selectedDate ? holidaysByDate.get(selectedDate) || [] : [];

  const formatDisplayDate = (isoDate: string) => {
    try {
      const parts = isoDate.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return new Intl.DateTimeFormat('id-ID', {
          dateStyle: 'full',
        }).format(d);
      }
      return isoDate;
    } catch {
      return isoDate;
    }
  };

  return (
    <div className="space-y-6">
      {/* Calendar Header / Month Switcher */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#F97316] flex items-center justify-center shrink-0">
            <CalendarIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-[#111827]">
              {MONTH_NAMES[currentMonth]} {selectedYear}
            </h3>
            <p className="text-xs text-[#6B7280]">
              {monthlyHolidays.length} hari libur terdaftar di bulan ini
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={handlePrevMonth}
            className="p-2 rounded-xl border border-[#E5E7EB] hover:bg-zinc-50 text-[#374151] transition-colors cursor-pointer"
            title="Bulan Sebelumnya"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <select
            value={currentMonth}
            onChange={(e) => {
              setCurrentMonth(Number(e.target.value));
              setSelectedDate(null);
            }}
            className="px-3 py-2 text-xs font-semibold bg-white border border-[#E5E7EB] rounded-xl text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316] transition-all cursor-pointer"
          >
            {MONTH_NAMES.map((name, idx) => (
              <option key={name} value={idx}>
                {name}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleNextMonth}
            className="p-2 rounded-xl border border-[#E5E7EB] hover:bg-zinc-50 text-[#374151] transition-colors cursor-pointer"
            title="Bulan Berikutnya"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-2xs overflow-hidden">
        {/* Day of Week Header */}
        <div className="grid grid-cols-7 border-b border-[#E5E7EB] bg-zinc-50/80 text-center text-[11px] font-bold text-[#6B7280] uppercase tracking-wider py-2.5">
          {DAY_NAMES.map((day, idx) => (
            <div
              key={day}
              className={idx >= 5 ? 'text-red-500 font-extrabold' : 'text-[#6B7280]'}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 divide-x divide-y divide-[#E5E7EB]">
          {calendarCells.map((cell, idx) => {
            if (!cell.isCurrentMonth || !cell.dateString) {
              return (
                <div
                  key={`empty-${idx}`}
                  className="min-h-[72px] sm:min-h-[96px] bg-zinc-50/40 p-2 text-zinc-300"
                />
              );
            }

            const hasHolidays = cell.holidays.length > 0;
            const isSelected = selectedDate === cell.dateString;
            const dayOfWeek = (idx % 7);
            const isWeekend = dayOfWeek >= 5;

            return (
              <button
                key={cell.dateString}
                type="button"
                onClick={() => setSelectedDate(cell.dateString)}
                className={`min-h-[72px] sm:min-h-[96px] p-2 text-left transition-all relative flex flex-col justify-between cursor-pointer focus:outline-none ${
                  isSelected
                    ? 'bg-orange-50/70 ring-2 ring-[#F97316] ring-inset z-10'
                    : hasHolidays
                    ? 'bg-red-50/20 hover:bg-red-50/40'
                    : 'hover:bg-zinc-50/80'
                }`}
              >
                {/* Date Number */}
                <div className="flex items-center justify-between">
                  <span
                    className={`inline-flex items-center justify-center w-6 h-6 text-xs rounded-full font-bold ${
                      isSelected
                        ? 'bg-[#F97316] text-white'
                        : hasHolidays || isWeekend
                        ? 'text-red-600'
                        : 'text-[#111827]'
                    }`}
                  >
                    {cell.dayNumber}
                  </span>

                  {hasHolidays && (
                    <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" />
                  )}
                </div>

                {/* Holiday names preview on cell (desktop only) */}
                <div className="space-y-1 mt-1 hidden sm:block">
                  {cell.holidays.slice(0, 2).map((h) => {
                    const cfg = HOLIDAY_TYPE_CONFIG[h.holidayType] || HOLIDAY_TYPE_CONFIG.other;
                    return (
                      <div
                        key={h.id}
                        className={`text-[10px] font-semibold truncate px-1.5 py-0.5 rounded ${cfg.badgeClass}`}
                        title={h.name}
                      >
                        {h.name}
                      </div>
                    );
                  })}
                  {cell.holidays.length > 2 && (
                    <div className="text-[9px] text-[#6B7280] font-medium pl-1">
                      +{cell.holidays.length - 2} lainnya
                    </div>
                  )}
                </div>

                {/* Mobile indicators */}
                <div className="sm:hidden flex flex-wrap gap-1 mt-1">
                  {cell.holidays.map((h) => {
                    const cfg = HOLIDAY_TYPE_CONFIG[h.holidayType] || HOLIDAY_TYPE_CONFIG.other;
                    return (
                      <span
                        key={h.id}
                        className={`w-1.5 h-1.5 rounded-full ${cfg.dotClass}`}
                      />
                    );
                  })}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Date Details Card */}
      {selectedDate && (
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-2xs space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#9CA3AF]">
                Detail Tanggal Terpilih
              </span>
              <h4 className="text-sm font-bold text-[#111827] mt-0.5">
                {formatDisplayDate(selectedDate)}
              </h4>
            </div>
            <button
              type="button"
              onClick={() => setSelectedDate(null)}
              className="text-xs text-[#6B7280] hover:text-[#111827] font-semibold cursor-pointer"
            >
              Tutup
            </button>
          </div>

          {selectedDateHolidays.length === 0 ? (
            <div className="py-4 text-center text-xs text-[#6B7280] flex items-center justify-center gap-2">
              <Info className="w-4 h-4 text-[#9CA3AF]" />
              <span>Tidak ada hari libur pada tanggal ini (hari kerja normal).</span>
            </div>
          ) : (
            <div className="space-y-2.5">
              {selectedDateHolidays.map((h) => {
                const cfg = HOLIDAY_TYPE_CONFIG[h.holidayType] || HOLIDAY_TYPE_CONFIG.other;
                return (
                  <div
                    key={h.id}
                    className="p-3.5 bg-zinc-50 border border-[#E5E7EB] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-[#111827]">{h.name}</span>
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.badgeClass}`}
                        >
                          {cfg.label}
                        </span>
                        {h.isActive ? (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                            Aktif
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-200 text-zinc-600">
                            Nonaktif
                          </span>
                        )}
                      </div>
                      {h.description && (
                        <p className="text-xs text-[#6B7280]">{h.description}</p>
                      )}
                    </div>

                    {canManage && (
                      <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                        <button
                          type="button"
                          onClick={() => onEdit(h)}
                          className="p-1.5 text-[#6B7280] hover:text-[#F97316] hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
                          title="Edit Hari Libur"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => onToggleStatus(h)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            h.isActive
                              ? 'text-[#6B7280] hover:text-red-600 hover:bg-red-50'
                              : 'text-emerald-600 hover:bg-emerald-50'
                          }`}
                          title={h.isActive ? 'Nonaktifkan Hari Libur' : 'Aktifkan Hari Libur'}
                        >
                          <Power className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Monthly Holidays Summary List below calendar */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-2xs space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF]">
          Daftar Libur Bulan {MONTH_NAMES[currentMonth]} {selectedYear}
        </h4>

        {monthlyHolidays.length === 0 ? (
          <p className="text-xs text-[#6B7280] py-2">
            Tidak ada hari libur di bulan {MONTH_NAMES[currentMonth]} {selectedYear}.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {monthlyHolidays.map((h) => {
              const cfg = HOLIDAY_TYPE_CONFIG[h.holidayType] || HOLIDAY_TYPE_CONFIG.other;
              return (
                <div
                  key={h.id}
                  className="p-3.5 bg-zinc-50 border border-[#E5E7EB] rounded-xl flex items-start justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <p className="text-xs font-semibold text-[#F97316]">
                      {formatDisplayDate(h.holidayDate)}
                    </p>
                    <p className="font-bold text-sm text-[#111827] truncate">
                      {h.name}
                    </p>
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.badgeClass}`}
                      >
                        {cfg.label}
                      </span>
                      {h.isActive ? (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                          Aktif
                        </span>
                      ) : (
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-200 text-zinc-600">
                          Nonaktif
                        </span>
                      )}
                    </div>
                  </div>

                  {canManage && (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => onEdit(h)}
                        className="p-1.5 text-[#6B7280] hover:text-[#F97316] hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit Hari Libur"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onToggleStatus(h)}
                        className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                          h.isActive
                            ? 'text-[#6B7280] hover:text-red-600 hover:bg-red-50'
                            : 'text-emerald-600 hover:bg-emerald-50'
                        }`}
                        title={h.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
