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
  | 'totalPresentIncludingOfficialDuty'
  | 'totalLate';

function getDisplayTotalHadir(row: EmployeeAttendanceSummary): number {
  return (
    row.totalPresentIncludingOfficialDuty ??
    row.totalOnTime + row.totalLate + (row.totalOfficialDuty ?? 0)
  );
}

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
        <div className="lg:hidden bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-2xs space-y-3">
          <div className="h-5 bg-gray-100 rounded w-36 animate-pulse" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-50 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="hidden lg:block bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-2xs space-y-3">
          <div className="h-6 bg-gray-100 rounded w-48 animate-pulse mb-4" />
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-10 bg-gray-50 rounded-xl animate-pulse" />
          ))}
        </div>
      </>
    );
  }

  if (data.length === 0) {
    return (
      <>
        <div className="lg:hidden bg-white border border-[#E5E7EB] rounded-2xl p-6 text-center shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-gray-50 text-gray-400 flex items-center justify-center mx-auto mb-2.5">
            <Users className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-[#111827]">Belum Ada Data Rekap Pegawai</h4>
          <p className="text-xs text-[#6B7280] max-w-xs mx-auto mt-1">
            {effectiveSearch.trim()
              ? 'Tidak ada data pegawai yang sesuai dengan pencarian.'
              : 'Tidak ditemukan data kehadiran pegawai pada filter yang ditentukan.'}
          </p>
        </div>
        <div className="hidden lg:block bg-white border border-[#E5E7EB] rounded-2xl p-12 text-center shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center mx-auto mb-3">
            <Users className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-[#111827]">Belum Ada Data Rekap Pegawai</h4>
          <p className="text-xs text-[#6B7280] max-w-sm mx-auto mt-1">
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
    } else if (sortField === 'totalLate') {
      valA = a.totalLate;
      valB = b.totalLate;
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
      {/* Mobile & Tablet (<lg): Compact List View */}
      <div className="lg:hidden bg-white border border-[#E5E7EB] rounded-2xl shadow-2xs overflow-hidden">
        {/* Compact Data Header */}
        <div className="px-4 py-3 border-b border-[#E5E7EB] flex flex-wrap items-center justify-between gap-2 bg-white">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#111827]">
              {sorted.length} pegawai
            </span>
            {effectiveSearch.trim() && sorted.length !== data.length && (
              <span className="text-[11px] text-[#6B7280]">dari {data.length}</span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <div className="inline-flex items-center border border-[#E5E7EB] rounded-lg bg-[#F9FAFB] overflow-hidden">
              <select
                value={sortField}
                onChange={(e) => {
                  setSortField(e.target.value as SortableEmployeeField);
                  setSortAsc(false);
                }}
                aria-label="Urutkan rekap pegawai"
                className="bg-transparent pl-2 pr-1 py-1 text-[11px] font-medium text-[#374151] focus:outline-none"
              >
                <option value="attendancePercentage">Persentase</option>
                <option value="totalPresentIncludingOfficialDuty">Total Hadir</option>
                <option value="totalLate">Telat</option>
              </select>
              <button
                type="button"
                onClick={() => setSortAsc((prev) => !prev)}
                aria-label={sortAsc ? 'Urutan naik' : 'Urutan turun'}
                className="px-1.5 py-1 border-l border-[#E5E7EB] text-[#6B7280] hover:text-[#111827] cursor-pointer"
              >
                {sortAsc ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />}
              </button>
            </div>

            <button
              type="button"
              onClick={onExportExcel}
              disabled={isLoading || isExporting}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-emerald-200 bg-emerald-50/50 text-emerald-800 text-[11px] font-semibold disabled:opacity-50 cursor-pointer"
            >
              <FileSpreadsheet className="w-3 h-3 text-emerald-600" />
              <span>{isExporting && exportingType === 'excel' ? '...' : 'Excel'}</span>
            </button>
            <button
              type="button"
              onClick={onExportPdf}
              disabled={isLoading || isExporting}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-rose-200 bg-rose-50/50 text-rose-800 text-[11px] font-semibold disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-3 h-3 text-rose-600" />
              <span>{isExporting && exportingType === 'pdf' ? '...' : 'PDF'}</span>
            </button>
          </div>
        </div>

        {sorted.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-xs font-semibold text-[#111827]">
              Pegawai Tidak Ditemukan
            </p>
            <p className="text-[11px] text-[#6B7280] mt-1">
              Tidak ada data yang cocok dengan pencarian &ldquo;{effectiveSearch}&rdquo;.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#E5E7EB]">
            {sorted.map((row) => {
              const isHistorical = row.employeeName.includes('(Arsip)');
              const perc = row.attendancePercentage;
              const totalHadir = getDisplayTotalHadir(row);
              const totalOfficialDuty = row.totalOfficialDuty ?? 0;
              const totalSick = row.totalSick ?? 0;
              const totalPermit = row.totalPermit ?? 0;
              const totalLeave = row.totalLeave ?? 0;

              let percColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
              if (perc < 75) percColor = 'text-red-700 bg-red-50 border-red-200';
              else if (perc < 90) percColor = 'text-amber-700 bg-amber-50 border-amber-200';

              const metricItems = [
                { label: 'Total Hadir', value: totalHadir, highlight: true, valueClass: 'text-[#F97316]' },
                { label: 'Tepat', value: row.totalOnTime, highlight: false, valueClass: 'text-emerald-600' },
                { label: 'Telat', value: row.totalLate, highlight: false, valueClass: 'text-amber-600' },
                { label: 'Dinas Luar', value: totalOfficialDuty, highlight: false, valueClass: 'text-purple-600' },
                { label: 'Sakit', value: totalSick, highlight: false, valueClass: 'text-blue-600' },
                { label: 'Izin', value: totalPermit, highlight: false, valueClass: 'text-indigo-600' },
                { label: 'Cuti', value: totalLeave, highlight: false, valueClass: 'text-teal-600' },
                {
                  label: 'Alfa',
                  value: row.totalAbsent,
                  highlight: false,
                  valueClass: row.totalAbsent > 0 ? 'text-rose-500' : 'text-[#111827]',
                },
              ];

              return (
                <div key={row.employeeId} className="px-3.5 sm:px-4 py-3 space-y-2.5">
                  {/* Top Line: Employee Identity (Name + Position) & Percentage */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-7 h-7 rounded-full bg-[#FFF7ED] text-[#EA580C] font-bold text-xs flex items-center justify-center shrink-0">
                        {row.employeeName.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-semibold text-[#111827] flex items-center gap-1.5 flex-wrap">
                          <span className="truncate">{row.employeeName}</span>
                          {isHistorical && (
                            <Badge variant="warning" size="sm">
                              Arsip
                            </Badge>
                          )}
                        </div>
                        <div className="text-[11px] text-[#6B7280] truncate">
                          {row.positionName || '-'}
                        </div>
                      </div>
                    </div>

                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold border shrink-0 ${percColor}`}
                    >
                      {perc}%
                    </span>
                  </div>

                  {/* 8 Attendance Summary Categories */}
                  <div className="grid grid-cols-4 sm:grid-cols-8 gap-1.5">
                    {metricItems.map((item) => (
                      <div
                        key={item.label}
                        className={`min-w-0 rounded-lg border px-1 py-1.5 text-center ${
                          item.highlight
                            ? 'bg-white border-[#F97316]/35'
                            : 'bg-[#F9FAFB] border-[#F3F4F6]'
                        }`}
                      >
                        <div className={`text-xs sm:text-sm font-bold leading-none tabular-nums ${item.valueClass}`}>
                          {item.value}
                        </div>
                        <div className="text-[9.5px] sm:text-[10px] font-medium text-[#6B7280] leading-tight tracking-[-0.01em] sm:tracking-normal mt-1">
                          {item.label}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="px-4 py-2.5 bg-[#F9FAFB] border-t border-[#E5E7EB] text-[11px] text-[#6B7280]">
          Hari kerja efektif mengecualikan Sabtu, Minggu, &amp; Hari Libur
        </div>
      </div>

      {/* Desktop (>=lg): Clean 8-Category Table View (Nama + Jabatan, tanpa NIP/Departemen/Pulang/Belum Pulang/Hari Kerja) */}
      <div className="hidden lg:block bg-white border border-[#E5E7EB] rounded-2xl shadow-2xs overflow-hidden">
        {/* Table Header and Search */}
        <div className="p-4 sm:p-5 border-b border-[#F3F4F6] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-[#111827] flex items-center gap-2">
              <Users className="w-4 h-4 text-[#F97316]" />
              Rekap Kehadiran Per Pegawai
            </h3>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Akumulasi delapan kategori kehadiran dan persentase kehadiran per pegawai
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <div className="relative w-full sm:w-48">
              <Search className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari pegawai di tabel..."
                value={effectiveSearch}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
              />
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
                <th className="py-3 px-4">Pegawai</th>
                <th
                  className="py-3 px-3 text-center cursor-pointer hover:text-[#111827]"
                  onClick={() => handleToggleSort('totalPresentIncludingOfficialDuty')}
                >
                  <div className="inline-flex items-center gap-1">
                    <span>Total Hadir</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-3 text-center">Tepat</th>
                <th
                  className="py-3 px-3 text-center cursor-pointer hover:text-[#111827]"
                  onClick={() => handleToggleSort('totalLate')}
                >
                  <div className="inline-flex items-center gap-1">
                    <span>Telat</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
                <th className="py-3 px-3 text-center">Dinas Luar</th>
                <th className="py-3 px-3 text-center">Sakit</th>
                <th className="py-3 px-3 text-center">Izin</th>
                <th className="py-3 px-3 text-center">Cuti</th>
                <th className="py-3 px-3 text-center">Alfa</th>
                <th
                  className="py-3 px-4 text-center cursor-pointer hover:text-[#111827]"
                  onClick={() => handleToggleSort('attendancePercentage')}
                >
                  <div className="inline-flex items-center gap-1">
                    <span>Persentase</span>
                    <ArrowUpDown className="w-3 h-3" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F4F6]">
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-10 px-4 text-center text-xs text-[#6B7280]">
                    Tidak ada pegawai yang cocok dengan pencarian &ldquo;{effectiveSearch}&rdquo;.
                  </td>
                </tr>
              ) : (
                sorted.map((row) => {
                  const isHistorical = row.employeeName.includes('(Arsip)');
                  const perc = row.attendancePercentage;
                  const totalHadir = getDisplayTotalHadir(row);
                  const totalOfficialDuty = row.totalOfficialDuty ?? 0;
                  const totalSick = row.totalSick ?? 0;
                  const totalPermit = row.totalPermit ?? 0;
                  const totalLeave = row.totalLeave ?? 0;

                  let percColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
                  if (perc < 75) percColor = 'text-red-700 bg-red-50 border-red-200';
                  else if (perc < 90) percColor = 'text-amber-700 bg-amber-50 border-amber-200';

                  return (
                    <tr key={row.employeeId} className="hover:bg-[#F9FAFB]/70 transition-colors">
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-[#FFF7ED] text-[#EA580C] font-bold text-xs flex items-center justify-center shrink-0">
                            {row.employeeName.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-semibold text-[#111827] flex items-center gap-1.5">
                              <span>{row.employeeName}</span>
                              {isHistorical && (
                                <Badge variant="warning" size="sm">
                                  Arsip
                                </Badge>
                              )}
                            </div>
                            <div className="text-[11px] text-[#6B7280]">
                              {row.positionName || '-'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-[#F97316] tabular-nums">
                        {totalHadir}
                      </td>
                      <td className="py-3 px-3 text-center font-semibold text-emerald-600 tabular-nums">
                        {row.totalOnTime}
                      </td>
                      <td className="py-3 px-3 text-center font-semibold text-amber-600 tabular-nums">
                        {row.totalLate}
                      </td>
                      <td className="py-3 px-3 text-center font-semibold text-purple-600 tabular-nums">
                        {totalOfficialDuty}
                      </td>
                      <td className="py-3 px-3 text-center font-semibold text-blue-600 tabular-nums">
                        {totalSick}
                      </td>
                      <td className="py-3 px-3 text-center font-semibold text-indigo-600 tabular-nums">
                        {totalPermit}
                      </td>
                      <td className="py-3 px-3 text-center font-semibold text-teal-600 tabular-nums">
                        {totalLeave}
                      </td>
                      <td className="py-3 px-3 text-center tabular-nums">
                        {row.totalAbsent > 0 ? (
                          <span className="font-semibold text-rose-500">{row.totalAbsent}</span>
                        ) : (
                          <span className="text-[#6B7280] font-semibold">0</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold border ${percColor}`}
                        >
                          {perc}%
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-[#F9FAFB] border-t border-[#E5E7EB] text-[11px] text-[#6B7280] flex items-center justify-between">
          <span>Menampilkan {sorted.length} dari total {data.length} pegawai</span>
          <span>Hari kerja efektif mengecualikan Sabtu, Minggu, &amp; Hari Libur</span>
        </div>
      </div>
    </>
  );
};

