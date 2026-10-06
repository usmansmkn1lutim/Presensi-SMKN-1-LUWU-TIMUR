import React from 'react';
import { AttendanceHistoryRecord } from '../../types/attendanceHistory.types';
import { MapPin, Info } from 'lucide-react';

interface HistoryTableProps {
  records: AttendanceHistoryRecord[];
  onSelectRecord: (record: AttendanceHistoryRecord) => void;
}

export const HistoryTable: React.FC<HistoryTableProps> = ({
  records,
  onSelectRecord,
}) => {
  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr + 'T00:00:00');
      return date.toLocaleDateString('id-ID', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
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
    <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-2xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB] text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
              <th className="py-3.5 px-4">Tanggal</th>
              <th className="py-3.5 px-4">Check-in</th>
              <th className="py-3.5 px-4">Status Masuk</th>
              <th className="py-3.5 px-4">Check-out</th>
              <th className="py-3.5 px-4">Status Pulang</th>
              <th className="py-3.5 px-4">Lokasi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB] text-xs text-[#111827]">
            {records.map((row) => {
              const locationName =
                row.check_in_location?.name ||
                row.check_out_location?.name ||
                'Kantor/TU';

              return (
                <tr
                  key={row.id}
                  onClick={() => onSelectRecord(row)}
                  className="hover:bg-[#F9FAFB] transition-colors cursor-pointer"
                >
                  {/* Tanggal */}
                  <td className="py-3.5 px-4 font-semibold text-[#111827]">
                    {formatDate(row.attendance_date)}
                  </td>

                  {/* Check-in Time */}
                  <td className="py-3.5 px-4 font-medium text-[#111827]">
                    {formatTime(row.check_in_at)}
                  </td>

                  {/* Check-in Status Badge */}
                  <td className="py-3.5 px-4">
                    {row.check_in_status === 'on_time' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Tepat Waktu
                      </span>
                    ) : row.check_in_status === 'late' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                        Terlambat
                      </span>
                    ) : (
                      <span className="text-[#9CA3AF]">-</span>
                    )}
                  </td>

                  {/* Check-out Time */}
                  <td className="py-3.5 px-4 font-medium text-[#111827]">
                    {row.check_out_at ? (
                      formatTime(row.check_out_at)
                    ) : (
                      <span className="text-[#9CA3AF]">Belum Check-out</span>
                    )}
                  </td>

                  {/* Check-out Status Badge */}
                  <td className="py-3.5 px-4">
                    {row.check_out_status === 'operational' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                        Jam Operasional
                      </span>
                    ) : row.check_out_status === 'after_work' ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Setelah Jam Kerja
                      </span>
                    ) : (
                      <span className="text-[#9CA3AF]">Belum Check-out</span>
                    )}
                  </td>

                  {/* Lokasi */}
                  <td className="py-3.5 px-4 text-[#6B7280]">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-[#F97316]" />
                      {locationName}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
