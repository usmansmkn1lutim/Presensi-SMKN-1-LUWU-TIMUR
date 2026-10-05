import React from 'react';
import { Calendar, Users, CheckCircle2, Clock, LogOut, AlertCircle, Info } from 'lucide-react';
import { DailyAttendanceSummary } from '../../types/attendanceReport.types';
import { Badge } from '../ui/Badge';

interface DailyReportTableProps {
  data: DailyAttendanceSummary[];
  isLoading: boolean;
}

export const DailyReportTable: React.FC<DailyReportTableProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-2xs space-y-3">
        <div className="h-6 bg-gray-100 rounded w-48 animate-pulse mb-4" />
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-10 bg-gray-50 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-12 text-center shadow-2xs">
        <div className="w-12 h-12 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center mx-auto mb-3">
          <Calendar className="w-6 h-6" />
        </div>
        <h4 className="text-base font-bold text-[#111827]">Belum Ada Data Rekap Harian</h4>
        <p className="text-xs text-[#6B7280] max-w-sm mx-auto mt-1">
          Tidak ditemukan rekaman presensi pada rentang tanggal yang dipilih.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-2xs overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-[#F3F4F6] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-[#111827] flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#F97316]" />
            Rekap Kehadiran Harian
          </h3>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Daftar distribusi status kehadiran per tanggal dalam periode
          </p>
        </div>
        <div className="text-xs text-[#6B7280]">
          Total <span className="font-semibold text-[#111827]">{data.length}</span> hari dalam rentang
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#F9FAFB] text-[#4B5563] border-b border-[#E5E7EB] font-semibold text-[11px] uppercase tracking-wider">
              <th className="py-3 px-4">Tanggal</th>
              <th className="py-3 px-3">Hari</th>
              <th className="py-3 px-3">Status Hari</th>
              <th className="py-3 px-3 text-center">Hadir</th>
              <th className="py-3 px-3 text-center">Tepat Waktu</th>
              <th className="py-3 px-3 text-center">Terlambat</th>
              <th className="py-3 px-3 text-center">Check-out</th>
              <th className="py-3 px-3 text-center">Belum Check-out</th>
              <th className="py-3 px-4 text-center">Tidak Hadir</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F3F4F6]">
            {data.map((row) => {
              // Check if weekend (0 = Sunday, 6 = Saturday)
              const [y, m, d] = row.attendanceDate.split('-').map(Number);
              const dayOfWeek = new Date(y, m - 1, d, 12, 0, 0).getDay();
              const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

              return (
                <tr key={row.attendanceDate} className="hover:bg-[#F9FAFB]/70 transition-colors">
                  <td className="py-3 px-4 font-semibold text-[#111827] whitespace-nowrap">
                    {row.dateLabel}
                  </td>
                  <td className="py-3 px-3 text-[#4B5563] whitespace-nowrap font-medium">
                    {row.dayName}
                  </td>
                  <td className="py-3 px-3 whitespace-nowrap">
                    {isWeekend ? (
                      <Badge variant="warning" size="sm">
                        Akhir Pekan
                      </Badge>
                    ) : (
                      <Badge variant="success" size="sm">
                        Hari Kerja
                      </Badge>
                    )}
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-blue-600">
                    {row.totalPresent}
                  </td>
                  <td className="py-3 px-3 text-center font-semibold text-emerald-600">
                    {row.totalOnTime}
                  </td>
                  <td className="py-3 px-3 text-center font-semibold text-amber-600">
                    {row.totalLate}
                  </td>
                  <td className="py-3 px-3 text-center font-semibold text-purple-600">
                    {row.totalCheckedOut}
                  </td>
                  <td className="py-3 px-3 text-center font-semibold text-rose-600">
                    {row.totalNotCheckedOut}
                  </td>
                  <td className="py-3 px-4 text-center text-[#6B7280]">
                    {isWeekend ? (
                      <span className="text-[#9CA3AF] text-[11px] italic">Libur</span>
                    ) : row.totalAbsent > 0 ? (
                      <span className="font-semibold text-rose-500">{row.totalAbsent}</span>
                    ) : (
                      <span className="text-emerald-600 font-semibold">0</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="p-3 bg-[#F9FAFB] border-t border-[#E5E7EB] text-[11px] text-[#6B7280] flex items-center gap-1.5">
        <Info className="w-3.5 h-3.5 text-[#9CA3AF] shrink-0" />
        <span>
          Waktu operasional dan cut-off presensi mengacu pada zona waktu <strong>Asia/Makassar (WITA)</strong>.
        </span>
      </div>
    </div>
  );
};
