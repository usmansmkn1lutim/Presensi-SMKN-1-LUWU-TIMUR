import React from 'react';
import { MonitoringRecord } from '../../types/attendanceMonitoring.types';
import { User, Building2, LogIn, LogOut } from 'lucide-react';

interface MonitoringMobileListProps {
  records: MonitoringRecord[];
}

export const MonitoringMobileList: React.FC<MonitoringMobileListProps> = ({
  records,
}) => {
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
      {records.map((row) => (
        <div
          key={row.employeeId}
          className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-4 shadow-2xs space-y-3"
        >
          {/* Top Info Header */}
          <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-[#E5E7EB]">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-[#F3F4F6] text-[#6B7280] flex items-center justify-center shrink-0">
                <User className="w-4 h-4 text-[#F97316]" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-[#111827]">{row.fullName}</h4>
                <p className="text-[11px] text-[#6B7280]">
                  NIP: {row.nip || '-'} · {row.departmentName}
                </p>
              </div>
            </div>

            {row.overallStatus === 'belum_presensi' ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                Belum Presensi
              </span>
            ) : row.overallStatus === 'sudah_masuk' ? (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#FFF7ED] text-[#EA580C] border border-[#FFEDD5] shrink-0">
                Sudah Masuk
              </span>
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                Sudah Pulang
              </span>
            )}
          </div>

          {/* Check-in & Check-out Grid */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] space-y-1">
              <div className="flex items-center justify-between text-[11px] text-[#6B7280]">
                <span className="flex items-center gap-1 font-medium">
                  <LogIn className="w-3 h-3 text-[#F97316]" />
                  Masuk
                </span>
                {row.checkInStatus === 'on_time' ? (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1 rounded border border-emerald-200">
                    Tepat Waktu
                  </span>
                ) : row.checkInStatus === 'late' ? (
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-50 px-1 rounded border border-amber-200">
                    Terlambat
                  </span>
                ) : (
                  <span className="text-[#9CA3AF]">-</span>
                )}
              </div>
              <div className="text-sm font-bold text-[#111827]">
                {formatTime(row.checkInAt)}
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] space-y-1">
              <div className="flex items-center justify-between text-[11px] text-[#6B7280]">
                <span className="flex items-center gap-1 font-medium">
                  <LogOut className="w-3 h-3 text-[#F97316]" />
                  Keluar
                </span>
                {row.checkOutStatus === 'operational' ? (
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-1 rounded border border-blue-200">
                    Operasional
                  </span>
                ) : row.checkOutStatus === 'after_work' ? (
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1 rounded border border-emerald-200">
                    Setelah Kerja
                  </span>
                ) : (
                  <span className="text-[10px] text-[#9CA3AF]">Belum</span>
                )}
              </div>
              <div className="text-sm font-bold text-[#111827]">
                {formatTime(row.checkOutAt)}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
