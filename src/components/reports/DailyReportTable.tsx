import React, { useState } from 'react';
import {
  Calendar,
  AlertCircle,
  Info,
  FileSpreadsheet,
  Download,
  ArrowUp,
  ArrowDown,
  RotateCcw,
} from 'lucide-react';
import { DailyAttendanceSummary } from '../../types/attendanceReport.types';
import { EvaluatedStatusResult } from '../../services/attendanceStatusService';
import {
  formatMakassarShortDate,
  formatMakassarTime,
} from '../../services/attendanceReportService';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface DailyReportTableProps {
  data: DailyAttendanceSummary[];
  isLoading: boolean;
  onExportExcel: () => void;
  onExportPdf: () => void;
  isExporting: boolean;
  exportingType: 'excel' | 'pdf' | null;
  dailySelectedDate?: string;
  dailyEvaluatedRecords?: EvaluatedStatusResult[];
  isDailyLoading?: boolean;
  dailyError?: string | null;
  onRetryDaily?: () => void;
}

function formatDailyTime(isoString?: string | null): string {
  if (!isoString) return '--:--';
  const formatted = formatMakassarTime(isoString);
  if (!formatted || formatted === '-') return '--:--';
  return `${formatted} WITA`;
}

function getDailyStatusBadgeMeta(row: EvaluatedStatusResult): {
  label: string;
  className: string;
} {
  if (row.status === 'present') {
    if (row.substatus === 'late') {
      return {
        label: row.substatusLabel || 'Terlambat',
        className: 'bg-amber-50 text-amber-700 border-amber-200',
      };
    }
    return {
      label: row.substatusLabel || 'Tepat Waktu',
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };
  }
  if (row.status === 'official_duty') {
    return {
      label: row.statusLabel || 'Dinas Luar',
      className: 'bg-purple-50 text-purple-700 border-purple-200',
    };
  }
  if (row.status === 'sick') {
    return {
      label: row.statusLabel || 'Sakit',
      className: 'bg-blue-50 text-blue-700 border-blue-200',
    };
  }
  if (row.status === 'permit') {
    return {
      label: row.statusLabel || 'Izin',
      className: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    };
  }
  if (row.status === 'leave') {
    return {
      label: row.statusLabel || 'Cuti',
      className: 'bg-teal-50 text-teal-700 border-teal-200',
    };
  }
  if (row.status === 'absent') {
    return {
      label: row.statusLabel || 'Alfa',
      className: 'bg-red-50 text-red-700 border-red-200',
    };
  }
  if (row.status === 'pending') {
    return {
      label: row.statusLabel || 'Menunggu Presensi',
      className: 'bg-orange-50 text-orange-700 border-orange-200',
    };
  }
  return {
    label: row.statusLabel || 'Libur',
    className: 'bg-gray-100 text-gray-600 border-gray-200',
  };
}

export const DailyReportTable: React.FC<DailyReportTableProps> = ({
  data,
  isLoading,
  onExportExcel,
  onExportPdf,
  isExporting,
  exportingType,
  dailySelectedDate,
  dailyEvaluatedRecords = [],
  isDailyLoading = false,
  dailyError = null,
  onRetryDaily,
}) => {
  // Default sorting: Newest -> Oldest (descending by attendanceDate) for Desktop Table
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Sort data chronologically by attendanceDate (Desktop)
  const sortedData = [...data].sort((a, b) => {
    const cmp = a.attendanceDate.localeCompare(b.attendanceDate);
    return sortAsc ? cmp : -cmp;
  });

  const toggleSort = () => {
    setSortAsc(!sortAsc);
  };

  // Compute 8-category daily summary for Mobile/Tablet (<1024px)
  // Hadir = Tepat Waktu + Terlambat + Dinas Luar (disjoint sets, no double counting)
  let onTimeCount = 0;
  let lateCount = 0;
  let officialDutyCount = 0;
  let sickCount = 0;
  let permitCount = 0;
  let leaveCount = 0;
  let absentCount = 0;

  for (const r of dailyEvaluatedRecords) {
    if (r.status === 'present') {
      if (r.substatus === 'late') {
        lateCount++;
      } else if (r.substatus === 'on_time') {
        onTimeCount++;
      }
    } else if (r.status === 'official_duty') {
      officialDutyCount++;
    } else if (r.status === 'sick') {
      sickCount++;
    } else if (r.status === 'permit') {
      permitCount++;
    } else if (r.status === 'leave') {
      leaveCount++;
    } else if (r.status === 'absent') {
      absentCount++;
    }
  }

  const presentTotalCount = onTimeCount + lateCount + officialDutyCount;
  const allEightCategoriesZero =
    !isDailyLoading &&
    !dailyError &&
    dailyEvaluatedRecords.length > 0 &&
    presentTotalCount === 0 &&
    onTimeCount === 0 &&
    lateCount === 0 &&
    officialDutyCount === 0 &&
    sickCount === 0 &&
    permitCount === 0 &&
    leaveCount === 0 &&
    absentCount === 0;

  const summaryItems = [
    { label: 'Hadir', value: presentTotalCount, highlight: true },
    { label: 'Tepat', value: onTimeCount, highlight: false },
    { label: 'Telat', value: lateCount, highlight: false },
    { label: 'Dinas Luar', value: officialDutyCount, highlight: false },
    { label: 'Sakit', value: sickCount, highlight: false },
    { label: 'Izin', value: permitCount, highlight: false },
    { label: 'Cuti', value: leaveCount, highlight: false },
    { label: 'Alfa', value: absentCount, highlight: false },
  ];

  return (
    <>
      {/* Mobile & Tablet (<1024px): 8 Standalone Summary Cards + Daily Employee List */}
      <div className="lg:hidden space-y-3">
        {/* 1. Ringkasan Delapan Kategori (8 card mandiri, 4 kolom x 2 baris tanpa card induk) */}
        <div
          aria-label="Ringkasan presensi harian"
          className="grid grid-cols-4 gap-1.5 sm:gap-2"
        >
          {summaryItems.map((item) => (
            <div
              key={item.label}
              className={`min-w-0 rounded-xl border px-1 py-2 sm:px-2 sm:py-2.5 text-center ${
                item.highlight
                  ? 'bg-white border-[#F97316]/40'
                  : 'bg-white border-[#E5E7EB]'
              }`}
            >
              {isDailyLoading ? (
                <div className="h-5 w-7 bg-gray-200 rounded mx-auto animate-pulse mb-1" />
              ) : (
                <div
                  className={`text-base sm:text-lg font-bold leading-none tabular-nums ${
                    item.highlight ? 'text-[#F97316]' : 'text-[#111827]'
                  }`}
                >
                  {item.value}
                </div>
              )}
              <div className="text-[10px] sm:text-[11px] font-medium text-[#6B7280] leading-tight tracking-[-0.01em] sm:tracking-normal mt-1">
                {item.label}
              </div>
            </div>
          ))}
        </div>

        {/* 2. Daftar Pegawai Harian (Fokus Utama) */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-2xs overflow-hidden">
          {/* Header & Export Global Controls */}
          <div className="px-4 py-3 border-b border-[#E5E7EB] space-y-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs font-bold text-[#111827] truncate">
                  {dailySelectedDate ? formatMakassarShortDate(dailySelectedDate) : 'Daftar Pegawai'}
                </div>
                <div className="text-[11px] text-[#6B7280] tabular-nums">
                  {isDailyLoading
                    ? 'Memuat data pegawai...'
                    : `${dailyEvaluatedRecords.length} pegawai`}
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={onExportExcel}
                  disabled={isLoading || isExporting}
                  title="Ekspor Excel sesuai periode filter laporan"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-emerald-200 bg-emerald-50/50 text-emerald-800 text-[11px] font-semibold disabled:opacity-50 cursor-pointer"
                >
                  <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
                  <span>{isExporting && exportingType === 'excel' ? '...' : 'Excel'}</span>
                </button>
                <button
                  type="button"
                  onClick={onExportPdf}
                  disabled={isLoading || isExporting}
                  title="Ekspor PDF sesuai periode filter laporan"
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-rose-200 bg-rose-50/50 text-rose-800 text-[11px] font-semibold disabled:opacity-50 cursor-pointer"
                >
                  <Download className="w-3 h-3 text-rose-600" />
                  <span>{isExporting && exportingType === 'pdf' ? '...' : 'PDF'}</span>
                </button>
              </div>
            </div>

            <p className="text-[10px] text-[#6B7280]">
              Ekspor Excel/PDF mengikuti rentang periode filter laporan global.
            </p>
          </div>

          {/* Content States: Loading / Error / Empty / Employee Rows */}
          {isDailyLoading ? (
            <div className="divide-y divide-[#F3F4F6]">
              {[...Array(6)].map((_, idx) => (
                <div key={idx} className="px-4 py-3 space-y-2 animate-pulse">
                  <div className="flex items-center justify-between gap-2">
                    <div className="h-3.5 bg-gray-200 rounded w-40" />
                    <div className="h-5 bg-gray-100 rounded-full w-20" />
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="h-3 bg-gray-100 rounded w-24" />
                    <div className="h-3 bg-gray-100 rounded w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : dailyError ? (
            <div className="p-6 text-center space-y-3">
              <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#111827]">Gagal Memuat Data Harian</p>
                <p className="text-[11px] text-[#6B7280] mt-1">{dailyError}</p>
              </div>
              {onRetryDaily && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onRetryDaily}
                  leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                >
                  Coba Lagi
                </Button>
              )}
            </div>
          ) : dailyEvaluatedRecords.length === 0 ? (
            <div className="py-10 px-4 text-center">
              <Calendar className="w-6 h-6 text-[#9CA3AF] mx-auto mb-2" />
              <p className="text-sm font-semibold text-[#111827]">Belum Ada Data Pegawai</p>
              <p className="text-xs text-[#6B7280] mt-1">
                Tidak ditemukan data presensi pegawai pada tanggal dan satuan kerja yang dipilih.
              </p>
            </div>
          ) : (
            <>
              {allEightCategoriesZero && (
                <div className="px-4 py-2.5 bg-[#F9FAFB] border-b border-[#E5E7EB] text-[11px] text-[#6B7280]">
                  Seluruh delapan kategori ringkasan bernilai 0 pada tanggal ini (hari libur atau
                  belum ada presensi tercatat).
                </div>
              )}

              <div className="divide-y divide-[#F3F4F6]">
                {dailyEvaluatedRecords.map((row) => {
                  const statusMeta = getDailyStatusBadgeMeta(row);
                  const checkInText = formatDailyTime(row.checkInAt);
                  const checkOutText = formatDailyTime(row.checkOutAt);

                  return (
                    <div key={row.employeeId} className="px-4 py-3 space-y-1.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-xs sm:text-sm font-semibold text-[#111827] truncate">
                            {row.employeeName}
                          </p>
                        </div>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border shrink-0 ${statusMeta.className}`}
                        >
                          {statusMeta.label}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#6B7280] tabular-nums">
                        <span>
                          Masuk:{' '}
                          <span className="font-semibold text-[#111827]">{checkInText}</span>
                        </span>
                        <span>
                          Pulang:{' '}
                          <span className="font-semibold text-[#111827]">{checkOutText}</span>
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Desktop (>=1024px) Table View - Unchanged */}
      {isLoading ? (
        <div className="hidden lg:block bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-2xs space-y-3">
          <div className="h-6 bg-gray-100 rounded w-48 animate-pulse mb-4" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-50 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : data.length === 0 ? (
        <div className="hidden lg:block bg-white border border-[#E5E7EB] rounded-2xl p-12 text-center shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center mx-auto mb-3">
            <Calendar className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-[#111827]">Belum Ada Data Rekap Harian</h4>
          <p className="text-xs text-[#6B7280] max-w-sm mx-auto mt-1">
            Tidak ditemukan rekaman presensi pada rentang tanggal yang dipilih.
          </p>
        </div>
      ) : (
        <div className="hidden lg:block bg-white border border-[#E5E7EB] rounded-2xl shadow-2xs overflow-hidden">
          <div className="p-4 sm:p-5 border-b border-[#F3F4F6] flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[#111827] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#F97316]" />
                Rekap Kehadiran Harian
              </h3>
              <p className="text-xs text-[#6B7280] mt-0.5">
                Daftar distribusi status kehadiran per tanggal dalam periode
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="text-xs text-[#6B7280] mr-1.5 hidden sm:block">
                Total <span className="font-semibold text-[#111827]">{data.length}</span> hari
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
                          ? 'Tanggal, urutan terlama ke terbaru. Klik untuk mengubah ke terbaru ke terlama.'
                          : 'Tanggal, urutan terbaru ke terlama. Klik untuk mengubah ke terlama ke terbaru.'
                      }
                    >
                      <span>Tanggal</span>
                      {sortAsc ? (
                        <ArrowUp className="w-3.5 h-3.5 text-[#F97316] transition-transform" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-[#F97316] transition-transform" />
                      )}
                    </button>
                  </th>
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
                {sortedData.map((row) => {
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
      )}
    </>
  );
};
