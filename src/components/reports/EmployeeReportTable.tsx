import React, { useState } from 'react';
import {
  Users,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileSpreadsheet,
  Download,
} from 'lucide-react';
import { EmployeeAttendanceSummary } from '../../types/attendanceReport.types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface EmployeeReportTableProps {
  data: EmployeeAttendanceSummary[];
  isLoading: boolean;
  onExportExcel: () => void;
  onExportPdf: () => void;
  isExporting: boolean;
  exportingType: 'excel' | 'pdf' | null;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
}

type SortableEmployeeField =
  | 'attendancePercentage'
  | 'totalPresentIncludingOfficialDuty';

function getDisplayTotalHadir(row: EmployeeAttendanceSummary): number {
  return (
    row.totalPresentIncludingOfficialDuty ??
    row.totalOnTime + row.totalLate + (row.totalOfficialDuty ?? 0)
  );
}

function formatIndonesianPercentage(value: number): string {
  const safe = Number.isFinite(value) ? value : 0;
  const rounded = Math.round(safe * 10) / 10;
  return Number.isInteger(rounded)
    ? `${rounded}%`
    : `${rounded.toFixed(1).replace('.', ',')}%`;
}

const AttendanceSummaryVisual: React.FC<{ row: EmployeeAttendanceSummary }> = ({ row }) => {
  const hadir = getDisplayTotalHadir(row);
  const sakitIzinCuti = (row.totalSick ?? 0) + (row.totalPermit ?? 0) + (row.totalLeave ?? 0);
  const alfa = row.totalAbsent ?? 0;
  const totalCategories = hadir + sakitIzinCuti + alfa;
  const hasEvaluatedDays = totalCategories > 0;

  const hadirPct = hasEvaluatedDays ? (hadir / totalCategories) * 100 : 0;
  const sakitIzinCutiPct = hasEvaluatedDays ? (sakitIzinCuti / totalCategories) * 100 : 0;
  const alfaPct = hasEvaluatedDays ? (alfa / totalCategories) * 100 : 0;

  const displayPerc = hasEvaluatedDays
    ? formatIndonesianPercentage(row.attendancePercentage)
    : '0%';

  let percTextClass = 'text-[#6B7280] dark:text-[#A3A3A3]';
  if (hasEvaluatedDays) {
    if (row.attendancePercentage < 75) percTextClass = 'text-rose-600 dark:text-rose-400';
    else if (row.attendancePercentage < 90) percTextClass = 'text-amber-600 dark:text-amber-400';
    else percTextClass = 'text-emerald-600 dark:text-emerald-400';
  }

  return (
    <div className="space-y-1.5 min-w-0">
      {/* Persentase Utama */}
      <div className="flex items-baseline gap-1.5">
        <span className={`text-sm sm:text-base font-bold tabular-nums leading-none ${percTextClass}`}>
          {displayPerc}
        </span>
        <span className="text-[11px] sm:text-xs font-medium text-[#6B7280] dark:text-[#A3A3A3]">
          Kehadiran
        </span>
      </div>

      {/* Segment Bar Horizontal 3 Kategori */}
      <div
        className="w-full h-2 rounded-full bg-[#E5E7EB] dark:bg-[#404040] overflow-hidden flex"
        role="img"
        aria-label={`Komposisi kehadiran: Hadir ${hadir} hari, Sakit/Izin/Cuti ${sakitIzinCuti} hari, Alfa ${alfa} hari`}
      >
        {hasEvaluatedDays && (
          <>
            {hadir > 0 && (
              <div
                className="h-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${hadirPct}%` }}
              />
            )}
            {sakitIzinCuti > 0 && (
              <div
                className="h-full bg-amber-400 transition-all duration-300"
                style={{ width: `${sakitIzinCutiPct}%` }}
              />
            )}
            {alfa > 0 && (
              <div
                className="h-full bg-rose-500 transition-all duration-300"
                style={{ width: `${alfaPct}%` }}
              />
            )}
          </>
        )}
      </div>

      {/* Legenda Satu Baris Rata Kiri */}
      <div className="flex flex-nowrap items-center justify-start gap-2 min-[360px]:gap-3 sm:gap-4 text-[10px] min-[360px]:text-[11px] sm:text-xs text-[#6B7280] dark:text-[#A3A3A3] overflow-x-auto [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        <span className="inline-flex items-center gap-1 whitespace-nowrap shrink-0">
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <span>Hadir</span>
          <span className="font-semibold text-[#111827] dark:text-[#F9FAFB] tabular-nums">{hadir}</span>
          <span className="min-[360px]:hidden">hr</span>
          <span className="hidden min-[360px]:inline">hari</span>
        </span>
        <span className="inline-flex items-center gap-1 whitespace-nowrap shrink-0">
          <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
          <span>Sakit/Izin/Cuti</span>
          <span className="font-semibold text-[#111827] dark:text-[#F9FAFB] tabular-nums">{sakitIzinCuti}</span>
          <span className="min-[360px]:hidden">hr</span>
          <span className="hidden min-[360px]:inline">hari</span>
        </span>
        <span className="inline-flex items-center gap-1 whitespace-nowrap shrink-0">
          <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
          <span>Alfa</span>
          <span className="font-semibold text-[#111827] dark:text-[#F9FAFB] tabular-nums">{alfa}</span>
          <span className="min-[360px]:hidden">hr</span>
          <span className="hidden min-[360px]:inline">hari</span>
        </span>
      </div>
    </div>
  );
};

export const EmployeeReportTable: React.FC<EmployeeReportTableProps> = ({
  data,
  isLoading,
  onExportExcel,
  onExportPdf,
  isExporting,
  exportingType,
  searchQuery,
  onSearchChange,
}) => {
  const [sortField, setSortField] = useState<SortableEmployeeField>('attendancePercentage');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [localSearch, setLocalSearch] = useState<string>('');

  const effectiveSearch = searchQuery !== undefined ? searchQuery : localSearch;
  const handleSearchChange = (q: string) => {
    if (onSearchChange) {
      onSearchChange(q);
    } else {
      setLocalSearch(q);
    }
  };

  if (isLoading) {
    return (
      <>
        <div className="lg:hidden bg-white dark:bg-[#262626] border border-[#E5E7EB] dark:border-[#404040] rounded-2xl p-4 shadow-2xs space-y-3">
          <div className="h-5 bg-gray-100 dark:bg-[#303030] rounded w-36 animate-pulse" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-50 dark:bg-[#171717] rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="hidden lg:block bg-white dark:bg-[#262626] border border-[#E5E7EB] dark:border-[#404040] rounded-2xl p-6 shadow-2xs space-y-3">
          <div className="h-6 bg-gray-100 dark:bg-[#303030] rounded w-48 animate-pulse mb-4" />
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-12 bg-gray-50 dark:bg-[#171717] rounded-xl animate-pulse" />
          ))}
        </div>
      </>
    );
  }

  if (data.length === 0) {
    return (
      <>
        <div className="lg:hidden bg-white dark:bg-[#262626] border border-[#E5E7EB] dark:border-[#404040] rounded-2xl p-6 text-center shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-gray-50 dark:bg-[#171717] text-gray-400 dark:text-[#6B7280] flex items-center justify-center mx-auto mb-2.5">
            <Users className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-[#111827] dark:text-[#F9FAFB]">Belum Ada Data Rekap Pegawai</h4>
          <p className="text-xs text-[#6B7280] dark:text-[#A3A3A3] max-w-xs mx-auto mt-1">
            {effectiveSearch.trim()
              ? 'Tidak ada data pegawai yang sesuai dengan pencarian.'
              : 'Tidak ditemukan data kehadiran pegawai pada filter yang ditentukan.'}
          </p>
        </div>
        <div className="hidden lg:block bg-white dark:bg-[#262626] border border-[#E5E7EB] dark:border-[#404040] rounded-2xl p-12 text-center shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-gray-50 dark:bg-[#171717] text-gray-400 dark:text-[#6B7280] flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Belum Ada Data Rekap Pegawai</h4>
          <p className="text-xs text-[#6B7280] dark:text-[#A3A3A3] max-w-sm mx-auto mt-1">
            Tidak ditemukan data kehadiran pegawai pada filter yang ditentukan.
          </p>
        </div>
      </>
    );
  }

  // Filter local search: nama pegawai (+ hidden NIP preservation), tanpa departemen
  const filtered = data.filter((row) => {
    if (!effectiveSearch.trim()) return true;
    const q = effectiveSearch.toLowerCase().trim();
    const nameMatch = row.employeeName.toLowerCase().includes(q);
    const nipMatch = row.nip ? row.nip.toLowerCase().includes(q) : false;
    return nameMatch || nipMatch;
  });

  // Sort rows
  const sorted = [...filtered].sort((a, b) => {
    let valA = 0;
    let valB = 0;

    if (sortField === 'totalPresentIncludingOfficialDuty') {
      valA = getDisplayTotalHadir(a);
      valB = getDisplayTotalHadir(b);
    } else {
      valA = a.attendancePercentage;
      valB = b.attendancePercentage;
    }

    return sortAsc ? valA - valB : valB - valA;
  });

  const handleToggleSort = (field: SortableEmployeeField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false); // default desc for numbers
    }
  };

  return (
    <>
      {/* Mobile & Tablet (<lg): Compact List View with Unified Attendance Summary */}
      <div className="lg:hidden bg-white dark:bg-[#262626] border border-[#E5E7EB] dark:border-[#404040] rounded-2xl shadow-2xs overflow-hidden">
        {/* Compact Data Header */}
        <div className="px-4 py-3 border-b border-[#E5E7EB] dark:border-[#404040] flex flex-wrap items-center justify-between gap-2 bg-white dark:bg-[#262626]">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#111827] dark:text-[#F9FAFB]">
              {sorted.length} pegawai
            </span>
            {effectiveSearch.trim() && sorted.length !== data.length && (
              <span className="text-[11px] text-[#6B7280] dark:text-[#A3A3A3]">dari {data.length}</span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <div className="inline-flex items-center border border-[#E5E7EB] dark:border-[#404040] rounded-lg bg-[#F9FAFB] dark:bg-[#171717] overflow-hidden">
              <select
                value={sortField}
                onChange={(e) => {
                  setSortField(e.target.value as SortableEmployeeField);
                  setSortAsc(false);
                }}
                aria-label="Urutkan rekap pegawai"
                className="bg-transparent pl-2 pr-1 py-1 text-[11px] font-medium text-[#374151] dark:text-[#E5E7EB] focus:outline-none"
              >
                <option value="attendancePercentage">Persentase</option>
                <option value="totalPresentIncludingOfficialDuty">Total Hadir</option>
              </select>
              <button
                type="button"
                onClick={() => setSortAsc((prev) => !prev)}
                aria-label={sortAsc ? 'Urutan naik' : 'Urutan turun'}
                className="px-1.5 py-1 border-l border-[#E5E7EB] dark:border-[#404040] text-[#6B7280] dark:text-[#A3A3A3] hover:text-[#111827] dark:hover:text-[#F9FAFB] cursor-pointer"
              >
                {sortAsc ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
              </button>
            </div>

            <button
              type="button"
              onClick={onExportExcel}
              disabled={isLoading || isExporting}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-emerald-200 dark:border-emerald-800/50 bg-emerald-50/50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 text-[11px] font-semibold disabled:opacity-50 cursor-pointer"
            >
              <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
              <span>{isExporting && exportingType === 'excel' ? '...' : 'Excel'}</span>
            </button>
            <button
              type="button"
              onClick={onExportPdf}
              disabled={isLoading || isExporting}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-rose-200 dark:border-rose-800/50 bg-rose-50/50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 text-[11px] font-semibold disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-3 h-3 text-rose-600" />
              <span>{isExporting && exportingType === 'pdf' ? '...' : 'PDF'}</span>
            </button>
          </div>
        </div>

        {sorted.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-xs font-semibold text-[#111827] dark:text-[#F9FAFB]">
              Pegawai Tidak Ditemukan
            </p>
            <p className="text-[11px] text-[#6B7280] dark:text-[#A3A3A3] mt-1">
              Tidak ada data yang cocok dengan pencarian &ldquo;{effectiveSearch}&rdquo;.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#E5E7EB] dark:divide-[#404040]">
            {sorted.map((row) => {
              const isHistorical = row.employeeName.includes('(Arsip)');

              return (
                <div key={row.employeeId} className="px-3.5 sm:px-4 py-3 space-y-2.5">
                  {/* Employee Identity (Name + Position) */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-[#FFF7ED] dark:bg-[#431F0B] text-[#EA580C] dark:text-[#F97316] font-bold text-xs flex items-center justify-center shrink-0">
                      {row.employeeName.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs sm:text-sm font-semibold text-[#111827] dark:text-[#F9FAFB] flex items-center gap-1.5 flex-wrap">
                        <span className="truncate">{row.employeeName}</span>
                        {isHistorical && (
                          <Badge variant="warning" size="sm">
                            Arsip
                          </Badge>
                        )}
                      </div>
                      <div className="text-[11px] text-[#6B7280] dark:text-[#A3A3A3] truncate">
                        {row.positionName || '-'}
                      </div>
                    </div>
                  </div>

                  {/* Unified Attendance Summary */}
                  <AttendanceSummaryVisual row={row} />
                </div>
              );
            })}
          </div>
        )}

        <div className="px-4 py-2.5 bg-[#F9FAFB] dark:bg-[#171717] border-t border-[#E5E7EB] dark:border-[#404040] text-[11px] text-[#6B7280] dark:text-[#A3A3A3]">
          Hari kerja efektif mengecualikan Sabtu, Minggu, &amp; Hari Libur
        </div>
      </div>

      {/* Desktop (>=lg): Simplified 2-Column Table (Identitas Pegawai + Ringkasan Kehadiran) */}
      <div className="hidden lg:block bg-white dark:bg-[#262626] border border-[#E5E7EB] dark:border-[#404040] rounded-2xl shadow-2xs overflow-hidden">
        {/* Table Header and Search */}
        <div className="p-4 sm:p-5 border-b border-[#F3F4F6] dark:border-[#404040] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-[#111827] dark:text-[#F9FAFB] flex items-center gap-2">
              <Users className="w-4 h-4 text-[#F97316]" />
              Rekap Kehadiran Per Pegawai
            </h3>
            <p className="text-xs text-[#6B7280] dark:text-[#A3A3A3] mt-0.5">
              Ringkasan persentase dan komposisi kehadiran per pegawai
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative w-full sm:w-48">
              <Search className="w-3.5 h-3.5 text-[#9CA3AF] dark:text-[#6B7280] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari pegawai di tabel..."
                value={effectiveSearch}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full bg-[#F9FAFB] dark:bg-[#171717] border border-[#E5E7EB] dark:border-[#404040] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#111827] dark:text-[#F9FAFB] focus:outline-none focus:ring-1 focus:ring-[#F97316] placeholder:text-[#9CA3AF] dark:placeholder:text-[#6B7280]"
              />
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
                <th className="py-3 px-4 w-[36%]">Pegawai</th>
                <th className="py-3 px-4">
                  <div className="flex items-center justify-between gap-3">
                    <span>Ringkasan Kehadiran</span>
                    <div className="inline-flex items-center gap-2 normal-case tracking-normal font-medium">
                      <button
                        type="button"
                        onClick={() => handleToggleSort('attendancePercentage')}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] cursor-pointer transition-colors ${
                          sortField === 'attendancePercentage'
                            ? 'bg-orange-50 dark:bg-[#431F0B]/50 border-orange-200 dark:border-orange-800/50 text-[#EA580C] dark:text-[#F97316] font-semibold'
                            : 'bg-white dark:bg-[#262626] border-[#E5E7EB] dark:border-[#404040] text-[#6B7280] dark:text-[#A3A3A3] hover:text-[#111827] dark:hover:text-[#F9FAFB]'
                        }`}
                      >
                        <span>Persentase</span>
                        {sortField === 'attendancePercentage' ? (
                          sortAsc ? (
                            <ArrowUp className="w-3 h-3" />
                          ) : (
                            <ArrowDown className="w-3 h-3" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3" />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleSort('totalPresentIncludingOfficialDuty')}
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] cursor-pointer transition-colors ${
                          sortField === 'totalPresentIncludingOfficialDuty'
                            ? 'bg-orange-50 dark:bg-[#431F0B]/50 border-orange-200 dark:border-orange-800/50 text-[#EA580C] dark:text-[#F97316] font-semibold'
                            : 'bg-white dark:bg-[#262626] border-[#E5E7EB] dark:border-[#404040] text-[#6B7280] dark:text-[#A3A3A3] hover:text-[#111827] dark:hover:text-[#F9FAFB]'
                        }`}
                      >
                        <span>Total Hadir</span>
                        {sortField === 'totalPresentIncludingOfficialDuty' ? (
                          sortAsc ? (
                            <ArrowUp className="w-3 h-3" />
                          ) : (
                            <ArrowDown className="w-3 h-3" />
                          )
                        ) : (
                          <ArrowUpDown className="w-3 h-3" />
                        )}
                      </button>
                    </div>
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F4F6] dark:divide-[#404040]">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={2} className="py-10 px-4 text-center text-xs text-[#6B7280] dark:text-[#A3A3A3]">
                    Tidak ada pegawai yang cocok dengan pencarian &ldquo;{effectiveSearch}&rdquo;.
                  </td>
                </tr>
              ) : (
                sorted.map((row) => {
                  const isHistorical = row.employeeName.includes('(Arsip)');

                  return (
                    <tr key={row.employeeId} className="hover:bg-[#F9FAFB]/70 dark:hover:bg-[#303030]/70 transition-colors">
                      <td className="py-3.5 px-4 align-middle whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-[#FFF7ED] dark:bg-[#431F0B] text-[#EA580C] dark:text-[#F97316] font-bold text-xs flex items-center justify-center shrink-0">
                            {row.employeeName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-[#111827] dark:text-[#F9FAFB] flex items-center gap-1.5">
                              <span>{row.employeeName}</span>
                              {isHistorical && (
                                <Badge variant="warning" size="sm">
                                  Arsip
                                </Badge>
                              )}
                            </div>
                            <div className="text-[11px] text-[#6B7280] dark:text-[#A3A3A3]">
                              {row.positionName || '-'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 align-middle">
                        <AttendanceSummaryVisual row={row} />
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-[#F9FAFB] dark:bg-[#171717] border-t border-[#E5E7EB] dark:border-[#404040] text-[11px] text-[#6B7280] dark:text-[#A3A3A3] flex items-center justify-between">
          <span>Menampilkan {sorted.length} dari total {data.length} pegawai</span>
          <span>Hari kerja efektif mengecualikan Sabtu, Minggu, &amp; Hari Libur</span>
        </div>
      </div>
    </>
  );
};

