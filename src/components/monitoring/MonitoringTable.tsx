import React from 'react';
import { MonitoringRecord } from '../../types/attendanceMonitoring.types';
import { User, Building2 } from 'lucide-react';

interface MonitoringTableProps {
  records: MonitoringRecord[];
}

export const MonitoringTable: React.FC<MonitoringTableProps> = ({ records }) => {
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
    <div className="hidden md:block bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-2xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB] text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
              <th className="py-3.5 px-4">Pegawai</th>
              <th className="py-3.5 px-4">Departemen</th>
              <th className="py-3.5 px-4">Status Presensi</th>
              <th className="py-3.5 px-4">Masuk</th>
              <th className="py-3.5 px-4">Status Masuk</th>
              <th className="py-3.5 px-4">Keluar</th>
              <th className="py-3.5 px-4">Status Keluar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#E5E7EB] text-xs text-[#111827]">
            {records.map((row) => (
              <tr key={row.employeeId} className="hover:bg-[#F9FAFB] transition-colors">
                {/* Pegawai */}
                <td className="py-3.5 px-4 font-medium text-[#111827]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-[#F3F4F6] text-[#6B7280] flex items-center justify-center shrink-0">
                      <User className="w-4 h-4 text-[#F97316]" />
                    </div>
                    <div>
                      <span className="font-bold block text-[#111827]">
                        {row.fullName}
                      </span>
                      <span className="text-[11px] text-[#6B7280] block">
                        NIP: {row.nip || '-'}
                      </span>
                    </div>
                  </div>
                </td>

                {/* Departemen */}
                <td className="py-3.5 px-4 text-[#6B7280]">
                  <span className="inline-flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-[#9CA3AF]" />
                    {row.departmentName}
                  </span>
                </td>

                {/* Status Overall */}
                <td className="py-3.5 px-4">
                  {row.overallStatus === 'belum_presensi' ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                      Belum Presensi
                    </span>
                  ) : row.overallStatus === 'sudah_masuk' ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-[#FFF7ED] text-[#EA580C] border border-[#FFEDD5]">
                      Sudah Masuk
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      Sudah Pulang
                    </span>
                  )}
                </td>

                {/* Jam Masuk */}
                <td className="py-3.5 px-4 font-semibold text-[#111827]">
                  {formatTime(row.checkInAt)}
                </td>

                {/* Status Masuk */}
                <td className="py-3.5 px-4">
                  {row.checkInStatus === 'on_time' ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Tepat Waktu
                    </span>
                  ) : row.checkInStatus === 'late' ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                      Terlambat
                    </span>
                  ) : (
                    <span className="text-[#9CA3AF]">-</span>
                  )}
                </td>

                {/* Jam Keluar */}
                <td className="py-3.5 px-4 font-semibold text-[#111827]">
                  {formatTime(row.checkOutAt)}
                </td>

                {/* Status Keluar */}
                <td className="py-3.5 px-4">
                  {row.checkOutStatus === 'operational' ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                      Jam Operasional
                    </span>
                  ) : row.checkOutStatus === 'after_work' ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      Setelah Jam Kerja
                    </span>
                  ) : (
                    <span className="text-[#9CA3AF]">-</span>
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
