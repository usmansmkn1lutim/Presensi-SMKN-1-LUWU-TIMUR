import React, { useState } from 'react';
import { CalendarRange, Info, FileSpreadsheet, Download, ArrowUp, ArrowDown } from 'lucide-react';
import { MonthlyAttendanceSummary } from '../../types/attendanceReport.types';
import { Button } from '../ui/Button';

interface MonthlyReportTableProps {
  data: MonthlyAttendanceSummary[];
  isLoading: boolean;
  onExportExcel: () => void;
  onExportPdf: () => void;
  isExporting: boolean;
  exportingType: 'excel' | 'pdf' | null;
}

export const MonthlyReportTable: React.FC<MonthlyReportTableProps> = ({
  data,
  isLoading,
  onExportExcel,
  onExportPdf,
  isExporting,
  exportingType,
}) => {
  // Default sorting: Newest -> Oldest (descending by month YYYY-MM)
  const [sortAsc, setSortAsc] = useState<boolean>(false);

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

  // Sort data chronologically by month (YYYY-MM)
  const sortedData = [...data].sort((a, b) => {
    const cmp = a.month.localeCompare(b.month);
    return sortAsc ? cmp : -cmp;
  });

  const toggleSort = () => {
    setSortAsc(!sortAsc);
  };

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-2xs overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-[#F3F4F6] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm sm:text-base font-bold text-[#111827] flex items-center gap-2">
            <CalendarRange className="w-4 h-4 text-[#F97316]" />
            Rekap Kehadiran Bulanan
          </h3>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Rangkuman tren kehadiran pegawai agregat per bulan kalender
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="text-xs text-[#6B7280] mr-1.5 hidden sm:block">
            Total <span className="font-semibold text-[#111827]">{data.length}</span> bulan
          </div>
          <Button
            variant="secondary"
            size="sm"
            onClick={onExportExcel}
            disabled={isLoading || isExporting}
            isLoading={isExporting && exportingType === 'excel'}
            leftIcon={<FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />}
            className="border border-emerald-200 hover:bg-emerald-50 text-emerald-800 font-semibold text-xs py-1.5"
          >
            Excel
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={onExportPdf}
            disabled={isLoading || isExporting}
            isLoading={isExporting && exportingType === 'pdf'}
            leftIcon={<Download className="w-3.5 h-3.5 text-rose-600" />}
            className="border border-rose-200 hover:bg-rose-50 text-rose-800 font-semibold text-xs py-1.5"
          >
            PDF
          </Button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="bg-[#F9FAFB] text-[#4B5563] border-b border-[#E5E7EB] font-semibold text-[11px] uppercase tracking-wider">
              <th
                scope="col"
                aria-sort={sortAsc ? 'ascending' : 'descending'}
                className="py-2 px-4 select-none"
              >
                <button
                  type="button"
                  onClick={toggleSort}
                  className="group inline-flex items-center gap-1.5 font-semibold uppercase tracking-wider text-[11px] text-[#4B5563] hover:text-[#111827] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] rounded transition-colors py-1 cursor-pointer"
                  aria-label={
                    sortAsc
                      ? 'Bulan, urutan terlama ke terbaru. Klik untuk mengubah ke terbaru ke terlama.'
                      : 'Bulan, urutan terbaru ke terlama. Klik untuk mengubah ke terlama ke terbaru.'
                  }
                >
                  <span>Bulan</span>
                  {sortAsc ? (
                    <ArrowUp className="w-3.5 h-3.5 text-[#F97316] transition-transform" />
                  ) : (
                    <ArrowDown className="w-3.5 h-3.5 text-[#F97316] transition-transform" />
                  )}
                </button>
              </th>
              <th className="py-3 px-3 text-center">Hari Kerja Efektif</th>
              <th className="py-3 px-3 text-center">Total Hadir</th>
              <th className="py-3 px-3 text-center">Tepat Waktu</th>
              <th className="py-3 px-3 text-center">Terlambat</th>
              <th className="py-3 px-3 text-center">Sudah Check-out</th>
              <th className="py-3 px-3 text-center">Belum Check-out</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#F3F4F6]">
            {sortedData.map((row) => (
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
