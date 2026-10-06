import React from 'react';
import { AttendanceHistoryRecord } from '../../types/attendanceHistory.types';
import { MapPin } from 'lucide-react';

interface HistoryMobileListProps {
  records: AttendanceHistoryRecord[];
  onSelectRecord: (record: AttendanceHistoryRecord) => void;
}

export const HistoryMobileList: React.FC<HistoryMobileListProps> = ({
  records,
  onSelectRecord,
}) => {
  const getDayAndNumber = (dateStr: string) => {
    try {
      const date = new Date(dateStr + 'T00:00:00');
      const dayName = date.toLocaleDateString('id-ID', { weekday: 'long' });
      const dayNum = date.getDate();
      return { dayName, dayNum };
    } catch {
      return { dayName: '', dayNum: dateStr };
    }
  };

  const formatTime = (isoString?: string | null) => {
    if (!isoString) return '—';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).replace(':', '.');
    } catch {
      return '—';
    }
  };

  const calculateTotalHours = (checkInStr?: string | null, checkOutStr?: string | null) => {
    if (!checkInStr || !checkOutStr) return '—';
    try {
      const start = new Date(checkInStr).getTime();
      const end = new Date(checkOutStr).getTime();
      const diffMs = end - start;
      if (diffMs <= 0) return '—';
      const totalMins = Math.floor(diffMs / (1000 * 60));
      const hours = Math.floor(totalMins / 60);
      const mins = totalMins % 60;
      return `${String(hours).padStart(2, '0')}.${String(mins).padStart(2, '0')}`;
    } catch {
      return '—';
    }
  };

  const getStatusLabel = (row: AttendanceHistoryRecord) => {
    const status = (row.official_status || (row.check_in_at ? 'present' : 'absent')).toLowerCase();

    switch (status) {
      case 'present':
        return 'Hadir';
      case 'sick':
        return 'Sakit';
      case 'permit':
        return 'Izin';
      case 'official_duty':
        return 'Dinas Luar';
      case 'leave':
        return 'Cuti';
      case 'absent':
        return 'Alpha';
      default:
        if (row.check_in_at) {
          return 'Hadir';
        }
        return row.status_label || 'Alpha';
    }
  };

  return (
    <div className="md:hidden space-y-3 font-sans">
      {records.map((row) => {
        const locationName =
          row.check_in_location?.name ||
          row.check_out_location?.name ||
          (row.check_in_at ? 'Kantor / TU' : '—');

        const { dayName, dayNum } = getDayAndNumber(row.attendance_date);
        const statusLabel = getStatusLabel(row);

        return (
          <div
            key={row.id}
            onClick={() => onSelectRecord(row)}
            className="bg-white border border-[#E5E7EB] rounded-2xl p-3.5 sm:p-4 shadow-2xs flex items-center gap-3.5 sm:gap-4 hover:border-slate-300 transition-all cursor-pointer group"
          >
            {/* Date Box (Square) */}
            <div className="w-16 h-16 sm:w-[72px] sm:h-[72px] aspect-square rounded-xl bg-[#F97316] text-white shadow-2xs flex flex-col items-center justify-center text-center shrink-0">
              <span className="text-xl sm:text-2xl font-bold text-white tabular-nums leading-none">
                {dayNum}
              </span>
              <span className="text-[10px] sm:text-[11px] font-medium text-white/90 mt-1 capitalize leading-none">
                {dayName}
              </span>
            </div>

            {/* Attendance Information Right Area */}
            <div className="flex-1 min-w-0 space-y-2">
              {/* Statistics Row (3 columns) */}
              <div className="grid grid-cols-3 divide-x divide-slate-100 text-center">
                {/* Check-in */}
                <div className="px-1">
                  <div className="text-xs sm:text-sm font-bold text-slate-900 tabular-nums">
                    {formatTime(row.check_in_at)}
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-slate-500 font-medium mt-0.5">
                    Check-in
                  </div>
                </div>

                {/* Check-out */}
                <div className="px-1">
                  <div className="text-xs sm:text-sm font-bold text-slate-900 tabular-nums">
                    {row.check_out_at ? formatTime(row.check_out_at) : '—'}
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-slate-500 font-medium mt-0.5">
                    Check-out
                  </div>
                </div>

                {/* Total Jam */}
                <div className="px-1">
                  <div className="text-xs sm:text-sm font-bold text-slate-900 tabular-nums">
                    {calculateTotalHours(row.check_in_at, row.check_out_at)}
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-slate-500 font-medium mt-0.5">
                    Total
                  </div>
                </div>
              </div>

              {/* Location & Status Row */}
              <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-100 text-xs">
                {/* Location */}
                <div className="flex items-center gap-1.5 truncate min-w-0">
                  <MapPin className="w-3.5 h-3.5 text-[#F97316] shrink-0" />
                  <span className="truncate text-[11px] sm:text-xs font-medium text-slate-600">
                    {locationName}
                  </span>
                </div>

                {/* Status Plain Text in Orange Sunset at bottom right */}
                <div className="shrink-0">
                  <span className="text-[11px] sm:text-xs font-semibold text-[#F97316]">
                    {statusLabel}
                  </span>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
