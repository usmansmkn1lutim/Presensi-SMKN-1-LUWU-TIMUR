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
  hasActiveFilter?: boolean;
}

export const MonthlyReportTable: React.FC<MonthlyReportTableProps> = ({
  data,
  isLoading,
  onExportExcel,
  onExportPdf,
  isExporting,
  exportingType,
  hasActiveFilter = false,
}) => {
  // Default sorting: Newest -> Oldest (descending by month YYYY-MM)
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  if (isLoading) {
    return (
      <>
        <div className="lg:hidden space-y-3 py-1">
          <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB] dark:border-[#404040]">
            <div className="h-4 bg-gray-200 dark:bg-[#303030] rounded w-20 animate-pulse" />
            <div className="flex gap-2">
              <div className="h-8 bg-gray-200 dark:bg-[#303030] rounded-xl w-16 animate-pulse" />
              <div className="h-8 bg-gray-200 dark:bg-[#303030] rounded-xl w-16 animate-pulse" />
            </div>
          </div>
          {[...Array(3)].map((_, i) => (
            <div key={i} className="py-3 border-b border-[#E5E7EB] dark:border-[#404040] space-y-2 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-[#303030] rounded w-36" />
              <div className="grid grid-cols-3 gap-2">
                <div className="h-3 bg-gray-100 dark:bg-[#171717] rounded" />
                <div className="h-3 bg-gray-100 dark:bg-[#171717] rounded" />
                <div className="h-3 bg-gray-100 dark:bg-[#171717] rounded" />
              </div>
            </div>
          ))}
        </div>

        <div className="hidden lg:block bg-white dark:bg-[#262626] border border-[#E5E7EB] dark:border-[#404040] rounded-2xl p-6 shadow-2xs space-y-3">
          <div className="h-6 bg-gray-100 dark:bg-[#303030] rounded w-48 animate-pulse mb-4" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-50 dark:bg-[#171717] rounded-xl animate-pulse" />
          ))}
        </div>
      </>
    );
  }

  if (data.length === 0) {
    return (
      <>
        <div className="lg:hidden py-10 px-4 text-center">
          <CalendarRange className="w-6 h-6 text-[#9CA3AF] dark:text-[#6B7280] mx-auto mb-2" />
          <p className="text-sm font-semibold text-[#111827] dark:text-[#F9FAFB]">
            {hasActiveFilter ? 'Hasil Tidak Ditemukan' : 'Belum Ada Data Rekap Bulanan'}
          </p>
          <p className="text-xs text-[#6B7280] dark:text-[#A3A3A3] mt-1">
            {hasActiveFilter
              ? 'Tidak ada rekap bulanan yang sesuai dengan pencarian atau filter aktif.'
              : 'Tidak ditemukan rekaman presensi pada rentang bulan yang dipilih.'}
          </p>
        </div>

        <div className="hidden lg:block bg-white dark:bg-[#262626] border border-[#E5E7EB] dark:border-[#404040] rounded-2xl p-12 text-center shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-[#171717] text-gray-400 dark:text-[#6B7280] flex items-center justify-center mx-auto mb-3">
            <CalendarRange className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Belum Ada Data Rekap Bulanan</h4>
          <p className="text-xs text-[#6B7280] dark:text-[#A3A3A3] max-w-sm mx-auto mt-1">
            Tidak ditemukan rekaman presensi pada rentang bulan yang dipilih.
          </p>
        </div>
      </>
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
    <>
      {/* Mobile & Tablet (<1024px) Compact List View */}
      <div className="lg:hidden space-y-2">
        {/* Header Area Data */}
        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#E5E7EB] dark:border-[#404040]">
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-semibold text-[#6B7280] dark:text-[#A3A3A3] whitespace-nowrap">
              {data.length} bulan
            </span>
            <button
              type="button"
              onClick={toggleSort}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-[#262626] border border-[#E5E7EB] dark:border-[#404040] text-[11px] font-semibold text-[#374151] dark:text-[#E5E7EB] hover:bg-gray-50 dark:hover:bg-[#303030] cursor-pointer"
              aria-label={
                sortAsc
                  ? 'Bulan, urutan terlama ke terbaru. Klik untuk ubah.'
                  : 'Bulan, urutan terbaru ke terlama. Klik untuk ubah.'
              }
            >
              <span>Bulan</span>
              {sortAsc ? (
                <ArrowUp className="w-3 h-3 text-[#F97316]" />
              ) : (
                <ArrowDown className="w-3 h-3 text-[#F97316]" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              variant="secondary"
              size="sm"
              onClick={onExportExcel}
              disabled={isLoading || isExporting}
              isLoading={isExporting && exportingType === 'excel'}
              leftIcon={<FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />}
              className="border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 font-semibold text-xs py-1 px-2.5"
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
              className="border border-rose-200 dark:border-rose-800/50 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-800 dark:text-rose-300 font-semibold text-xs py-1 px-2.5"
            >
              PDF
            </Button>
          </div>
        </div>

        {/* List Items */}
        <div className="divide-y divide-[#E5E7EB] dark:divide-[#404040]">
          {sortedData.map((row) => (
            <div key={row.month} className="py-3 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs sm:text-sm font-bold text-[#111827] dark:text-[#F9FAFB] truncate">
                  {row.monthLabel}
                </p>
                <span className="text-[11px] font-medium text-[#6B7280] dark:text-[#A3A3A3] shrink-0">
                  {row.effectiveWorkingDays} hari kerja efektif
                </span>
              </div>

              <div className="grid grid-cols-3 sm:grid-cols-6 gap-x-3 gap-y-1.5 text-[11px]">
                <div>
                  <span className="text-[#6B7280] dark:text-[#A3A3A3] block">Hari Efektif</span>
                  <span className="font-semibold text-[#111827] dark:text-[#F9FAFB] tabular-nums">{row.effectiveWorkingDays} hr</span>
                </div>
                <div>
                  <span className="text-[#6B7280] dark:text-[#A3A3A3] block">Total Hadir</span>
                  <span className="font-bold text-[#111827] dark:text-[#F9FAFB] tabular-nums">{row.totalAttendance}</span>
                </div>
                <div>
                  <span className="text-[#6B7280] dark:text-[#A3A3A3] block">Tepat Waktu</span>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400 tabular-nums">{row.totalOnTime}</span>
                </div>
                <div>
                  <span className="text-[#6B7280] dark:text-[#A3A3A3] block">Terlambat</span>
                  <span className="font-semibold text-amber-700 dark:text-amber-400 tabular-nums">{row.totalLate}</span>
                </div>
                <div>
                  <span className="text-[#6B7280] dark:text-[#A3A3A3] block">Check-out</span>
                  <span className="font-semibold text-purple-700 dark:text-purple-400 tabular-nums">{row.totalCheckedOut}</span>
                </div>
                <div>
                  <span className="text-[#6B7280] dark:text-[#A3A3A3] block">Belum Pulang</span>
                  <span className="font-semibold text-rose-700 dark:text-rose-400 tabular-nums">{row.totalNotCheckedOut}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Desktop (>=1024px) Table View */}
      <div className="hidden lg:block bg-white dark:bg-[#262626] border border-[#E5E7EB] dark:border-[#404040] rounded-2xl shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-[#F3F4F6] dark:border-[#404040] flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-[#111827] dark:text-[#F9FAFB] flex items-center gap-2">
              <CalendarRange className="w-4 h-4 text-[#F97316]" />
              Rekap Kehadiran Bulanan
            </h3>
            <p className="text-xs text-[#6B7280] dark:text-[#A3A3A3] mt-0.5">
              Rangkuman tren kehadiran pegawai agregat per bulan kalender
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="text-xs text-[#6B7280] dark:text-[#A3A3A3] mr-1.5 hidden sm:block">
              Total <span className="font-semibold text-[#111827] dark:text-[#F9FAFB]">{data.length}</span> bulan
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={onExportExcel}
              disabled={isLoading || isExporting}
              isLoading={isExporting && exportingType === 'excel'}
              leftIcon={<FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />}
              className="border border-emerald-200 dark:border-emerald-800/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 font-semibold text-xs py-1.5"
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
              className="border border-rose-200 dark:border-rose-800/50 hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-800 dark:text-rose-300 font-semibold text-xs py-1.5"
            >
              PDF
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F9FAFB] dark:bg-[#303030] text-[#4B5563] dark:text-[#A3A3A3] border-b border-[#E5E7EB] dark:border-[#404040] font-semibold text-[11px] uppercase tracking-wider">
                <th
                  scope="col"
                  aria-sort={sortAsc ? 'ascending' : 'descending'}
                  className="py-2 px-4 select-none"
                >
                  <button
                    type="button"
                    onClick={toggleSort}
                    className="group inline-flex items-center gap-1.5 font-semibold uppercase tracking-wider text-[11px] text-[#4B5563] dark:text-[#A3A3A3] hover:text-[#111827] dark:hover:text-[#F9FAFB] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] rounded transition-colors py-1 cursor-pointer"
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
            <tbody className="divide-y divide-[#F3F4F6] dark:divide-[#404040]">
              {sortedData.map((row) => (
                <tr key={row.month} className="hover:bg-[#F9FAFB]/70 dark:hover:bg-[#303030]/70 transition-colors">
                  <td className="py-3 px-4 font-semibold text-[#111827] dark:text-[#F9FAFB] whitespace-nowrap">
                    {row.monthLabel}
                  </td>
                  <td className="py-3 px-3 text-center text-[#6B7280] dark:text-[#A3A3A3] font-medium">
                    {row.effectiveWorkingDays} hari
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-blue-600 dark:text-blue-400">
                    {row.totalAttendance}
                  </td>
                  <td className="py-3 px-3 text-center font-semibold text-emerald-600 dark:text-emerald-400">
                    {row.totalOnTime}
                  </td>
                  <td className="py-3 px-3 text-center font-semibold text-amber-600 dark:text-amber-400">
                    {row.totalLate}
                  </td>
                  <td className="py-3 px-3 text-center font-semibold text-purple-600 dark:text-purple-400">
                    {row.totalCheckedOut}
                  </td>
                  <td className="py-3 px-3 text-center font-semibold text-rose-600 dark:text-rose-400">
                    {row.totalNotCheckedOut}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-[#F9FAFB] dark:bg-[#171717] border-t border-[#E5E7EB] dark:border-[#404040] text-[11px] text-[#6B7280] dark:text-[#A3A3A3] flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-[#9CA3AF] dark:text-[#6B7280] shrink-0" />
          <span>
            Pengelompokan bulan berdasarkan tanggal kalender sekolah (<strong className="dark:text-[#F9FAFB]">Asia/Makassar</strong>).
          </span>
        </div>
      </div>
    </>
  );
};
