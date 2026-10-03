import React from 'react';
import { AttendanceHistoryRecord } from '../../types/attendanceHistory.types';
import { LogIn, LogOut, MapPin, ChevronRight } from 'lucide-react';

interface HistoryMobileListProps {
  records: AttendanceHistoryRecord[];
  onSelectRecord: (record: AttendanceHistoryRecord) => void;
}

export const HistoryMobileList: React.FC<HistoryMobileListProps> = ({
  records,
  onSelectRecord,
}) => {
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr + 'T00:00:00');
      return date.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatTime = (isoString?: string | null) => {
    if (!isoString) return '-';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    } catch {
      return '-';
    }
  };

  return (
    <div className="md:hidden space-y-3">
      {records.map((row) => {
        const locationName =
          row.check_in_location?.name ||
          row.check_out_location?.name ||
          'Kantor/TU';

        return (
          <div
            key={row.id}
            onClick={() => onSelectRecord(row)}
            className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-4 shadow-2xs space-y-3 active:bg-[#F9FAFB] transition-colors cursor-pointer"
          >
            {/* Header: Date & Location */}
            <div className="flex items-center justify-between pb-2.5 border-b border-[#E5E7EB]">
              <span className="text-xs font-bold text-[#111827]">
                {formatDate(row.attendance_date)}
              </span>
              <span className="text-[11px] text-[#6B7280] flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[#F97316]" />
                {locationName}
              </span>
            </div>

            {/* Check-in & Check-out Grid */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* Check-in */}
              <div className="p-2.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] space-y-1">
                <div className="flex items-center justify-between text-[11px] text-[#6B7280]">
                  <span className="flex items-center gap-1 font-medium">
                    <LogIn className="w-3 h-3 text-[#F97316]" />
                    Masuk
                  </span>
                  {row.check_in_status === 'on_time' ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      Tepat Waktu
                    </span>
                  ) : row.check_in_status === 'late' ? (
                    <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                      Terlambat
                    </span>
                  ) : (
                    <span className="text-[#9CA3AF]">-</span>
                  )}
                </div>
                <div className="text-sm font-bold text-[#111827]">
                  {formatTime(row.check_in_at)}
                </div>
              </div>

              {/* Check-out */}
              <div className="p-2.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] space-y-1">
                <div className="flex items-center justify-between text-[11px] text-[#6B7280]">
                  <span className="flex items-center gap-1 font-medium">
                    <LogOut className="w-3 h-3 text-[#F97316]" />
                    Pulang
                  </span>
                  {row.check_out_status === 'operational' ? (
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                      Operasional
                    </span>
                  ) : row.check_out_status === 'after_work' ? (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                      Setelah Kerja
                    </span>
                  ) : (
                    <span className="text-[10px] text-[#9CA3AF]">Belum</span>
                  )}
                </div>
                <div className="text-sm font-bold text-[#111827]">
                  {row.check_out_at ? formatTime(row.check_out_at) : '-'}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end text-[11px] text-[#F97316] font-semibold pt-0.5">
              <span>Lihat Detail</span>
              <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </div>
          </div>
        );
      })}
    </div>
  );
};
