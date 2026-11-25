import React from 'react';
import { MonitoringRecord } from '../../types/attendanceMonitoring.types';
import { Building2, Images } from 'lucide-react';
import { UserAvatar } from '../ui/UserAvatar';

interface MonitoringTableProps {
  records: MonitoringRecord[];
  onViewPhoto?: (record: MonitoringRecord) => void;
}

export const MonitoringTable: React.FC<MonitoringTableProps> = ({ records, onViewPhoto }) => {
  const hasAnyPhoto = (row: MonitoringRecord) => {
    const checkIn = row.checkInPhotoPath ? row.checkInPhotoPath.trim() : '';
    const checkOut = row.checkOutPhotoPath ? row.checkOutPhotoPath.trim() : '';
    return Boolean(checkIn || checkOut);
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
    <div className="hidden lg:block bg-[#FFFFFF] dark:bg-[#262626] border border-[#E5E7EB] dark:border-[#404040] rounded-2xl overflow-hidden shadow-2xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#F9FAFB] dark:bg-[#303030] border-b border-[#E5E7EB] dark:border-[#404040] text-[11px] font-bold text-[#6B7280] dark:text-[#A3A3A3] uppercase tracking-wider">
              <th className="py-3.5 px-4">Pegawai</th>
              <th className="py-3.5 px-4">Departemen</th>
              <th className="py-3.5 px-4">Status Presensi</th>
              <th className="py-3.5 px-4">Masuk</th>
              <th className="py-3.5 px-4">Status Masuk</th>
              <th className="py-3.5 px-4">Keluar</th>
              <th className="py-3.5 px-4">Status Keluar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB] dark:divide-[#404040] text-xs text-[#111827] dark:text-[#F9FAFB]">
            {records.map((row) => (
              <tr key={row.employeeId} className="hover:bg-[#F9FAFB] dark:hover:bg-[#303030]/50 transition-colors">
                {/* Pegawai */}
                <td className="py-3.5 px-4 font-medium text-[#111827] dark:text-[#F9FAFB]">
                  <div className="flex items-center justify-between gap-2.5">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <UserAvatar
                        photoUrl={row.photoUrl}
                        name={row.fullName}
                        className="w-8 h-8 rounded-full object-cover border border-[#E5E7EB] dark:border-[#404040] shrink-0"
                      />
                      <div className="min-w-0">
                        <span className="font-bold block text-[#111827] dark:text-[#F9FAFB] truncate">
                          {row.fullName}
                        </span>
                        {row.positionName && (
                          <span className="text-[11px] text-[#6B7280] dark:text-[#A3A3A3] block truncate">
                            {row.positionName}
                          </span>
                        )}
                      </div>
                    </div>
                    {hasAnyPhoto(row) && onViewPhoto && (
                      <button
                        type="button"
                        onClick={() => onViewPhoto(row)}
                        className="w-8 h-8 rounded-lg bg-[#FFF7ED] dark:bg-[#431F0B] hover:bg-[#FFEDD5] dark:hover:bg-[#5C2B10] text-[#F97316] dark:text-[#FDBA74] border border-[#FFEDD5] dark:border-[#9A3412]/60 flex items-center justify-center transition-colors shrink-0 cursor-pointer"
                        title="Lihat foto presensi"
                        aria-label={`Lihat foto presensi ${row.fullName}`}
                      >
                        <Images className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>

                {/* Departemen */}
                <td className="py-3.5 px-4 text-[#6B7280] dark:text-[#A3A3A3]">
                  <span className="inline-flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#9CA3AF] dark:text-[#A3A3A3]" />
                    {row.departmentName}
                  </span>
                </td>

                {/* Status Overall */}
                <td className="py-3.5 px-4">
                  {row.overallStatus === 'belum_presensi' ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/50">
                      Belum Presensi
                    </span>
                  ) : row.overallStatus === 'sudah_masuk' ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-[#FFF7ED] dark:bg-[#431F0B] text-[#EA580C] dark:text-[#FDBA74] border border-[#FFEDD5] dark:border-[#9A3412]/60">
                      Sudah Masuk
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50">
                      Sudah Pulang
                    </span>
                  )}
                </td>

                {/* Jam Masuk */}
                <td className="py-3.5 px-4 font-semibold text-[#111827] dark:text-[#F9FAFB]">
                  {formatTime(row.checkInAt)}
                </td>

                {/* Status Masuk */}
                <td className="py-3.5 px-4">
                  {row.checkInStatus === 'on_time' ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                      Tepat Waktu
                    </span>
                  ) : row.checkInStatus === 'late' ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/50">
                      Terlambat
                    </span>
                  ) : (
                    <span className="text-[#9CA3AF] dark:text-[#A3A3A3]">-</span>
                  )}
                </td>

                {/* Jam Keluar */}
                <td className="py-3.5 px-4 font-semibold text-[#111827] dark:text-[#F9FAFB]">
                  {formatTime(row.checkOutAt)}
                </td>

                {/* Status Keluar */}
                <td className="py-3.5 px-4">
                  {row.checkOutStatus === 'operational' ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/50">
                      Jam Operasional
                    </span>
                  ) : row.checkOutStatus === 'after_work' ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/50">
                      Setelah Jam Kerja
                    </span>
                  ) : (
                    <span className="text-[#9CA3AF] dark:text-[#A3A3A3]">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
