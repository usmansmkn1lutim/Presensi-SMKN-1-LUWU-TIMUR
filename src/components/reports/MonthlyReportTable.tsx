import React from 'react';
import { CalendarRange, Info } from 'lucide-react';
import { MonthlyAttendanceSummary } from '../../types/attendanceReport.types';

interface MonthlyReportTableProps {
  data: MonthlyAttendanceSummary[];
  isLoading: boolean;
}

export const MonthlyReportTable: React.FC<MonthlyReportTableProps> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-2xs space-y-3">
        <div className="h-6 bg-gray-100 rounded w-48 animate-pulse mb-4" />
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-10 bg-gray-50 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-12 text-center shadow-2xs">
        <div className="w-12 h-12 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center mx-auto mb-3">
          <CalendarRange className="w-6 h-6" />
        </div>
        <h4 className="text-base font-bold text-[#111827]">Belum Ada Data Rekap Bulanan</h4>
        <p className="text-xs text-[#6B7280] max-w-sm mx-auto mt-1">
          Tidak ditemukan rekaman presensi pada rentang bulan yang dipilih.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-2xs overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-[#F3F4F6] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-[#111827] flex items-center gap-2">
            <CalendarRange className="w-4 h-4 text-[#F97316]" />
            Rekap Kehadiran Bulanan
          </h3>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Rangkuman tren kehadiran pegawai agregat per bulan kalender
          </p>
        </div>
        <div className="text-xs text-[#6B7280]">
          Total <span className="font-semibold text-[#111827]">{data.length}</span> bulan kalender
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#F9FAFB] text-[#4B5563] border-b border-[#E5E7EB] font-semibold text-[11px] uppercase tracking-wider">
              <th className="py-3 px-4">Bulan</th>
              <th className="py-3 px-3 text-center">Hari Kerja Efektif</th>
              <th className="py-3 px-3 text-center">Total Hadir</th>
              <th className="py-3 px-3 text-center">Tepat Waktu</th>
              <th className="py-3 px-3 text-center">Terlambat</th>
              <th className="py-3 px-3 text-center">Sudah Check-out</th>
              <th className="py-3 px-3 text-center">Belum Check-out</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F3F4F6]">
            {data.map((row) => (
              <tr key={row.month} className="hover:bg-[#F9FAFB]/70 transition-colors">
                <td className="py-3 px-4 font-semibold text-[#111827] whitespace-nowrap">
                  {row.monthLabel}
                </td>
                <td className="py-3 px-3 text-center text-[#6B7280] font-medium">
                  {row.effectiveWorkingDays} hari
                </td>
                <td className="py-3 px-3 text-center font-bold text-blue-600">
                  {row.totalAttendance}
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="p-3 bg-[#F9FAFB] border-t border-[#E5E7EB] text-[11px] text-[#6B7280] flex items-center gap-1.5">
        <Info className="w-3.5 h-3.5 text-[#9CA3AF] shrink-0" />
        <span>
          Pengelompokan bulan berdasarkan tanggal kalender sekolah (<strong>Asia/Makassar</strong>).
        </span>
      </div>
    </div>
  );
};
