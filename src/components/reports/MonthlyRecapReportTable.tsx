import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  HelpCircle,
  TrendingUp,
  FileSpreadsheet,
  Download,
} from 'lucide-react';
import {
  MonthlyRecapReportResponse,
  MonthlyRecapRow,
} from '../../types/attendanceReport.types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface MonthlyRecapReportTableProps {
  data: MonthlyRecapReportResponse | null;
  isLoading: boolean;
  onExportExcel: () => void;
  onExportPdf: () => void;
  isExporting: boolean;
  exportingType: 'excel' | 'pdf' | null;
}

export const MonthlyRecapReportTable: React.FC<MonthlyRecapReportTableProps> = ({
  data,
  isLoading,
  onExportExcel,
  onExportPdf,
  isExporting,
  exportingType,
}) => {
  const [localSearch, setLocalSearch] = useState<string>('');
  const [employeeTypeFilter, setEmployeeTypeFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);

  if (isLoading) {
    return (
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-2xs space-y-4">
        <div className="h-6 bg-gray-100 rounded w-48 animate-pulse mb-4" />
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-50 rounded-xl animate-pulse" />
          ))}
        </div>
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-10 bg-gray-50 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data || data.rows.length === 0) {
    return (
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-12 text-center shadow-2xs">
        <div className="w-12 h-12 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center mx-auto mb-3">
          <Users className="w-6 h-6" />
        </div>
        <h4 className="text-base font-bold text-[#111827]">Belum Ada Data Rekap Bulanan</h4>
        <p className="text-xs text-[#6B7280] max-w-sm mx-auto mt-1">
          Tidak ditemukan data rekap harian pegawai untuk bulan dan filter yang ditentukan.
        </p>
      </div>
    );
  }

  // Filter rows locally (pre-pagination)
  const filteredRows = data.rows.filter((row) => {
    // Search NIP/Name
    if (localSearch.trim()) {
      const q = localSearch.toLowerCase().trim();
      const nameMatch = row.employeeName.toLowerCase().includes(q);
      const nipMatch = row.nip ? row.nip.toLowerCase().includes(q) : false;
      if (!nameMatch && !nipMatch) return false;
    }

    // Employee Type Filter
    if (employeeTypeFilter !== 'all') {
      if (row.employeeType !== employeeTypeFilter) return false;
    }

    return true;
  });

  // Calculate dynamic summaries based on the FILTERED rows (entire dataset, not just page)
  const aggregatedStats = filteredRows.reduce(
    (acc, row) => {
      acc.totalPresent += row.totalPresent;
      acc.totalLate += row.totalLate;
      acc.totalSick += row.totalSick;
      acc.totalPermit += row.totalPermit;
      acc.totalOfficialDuty += row.totalOfficialDuty;
      acc.totalLeave += row.totalLeave;
      acc.totalAbsent += row.totalAbsent;
      return acc;
    },
    {
      totalPresent: 0,
      totalLate: 0,
      totalSick: 0,
      totalPermit: 0,
      totalOfficialDuty: 0,
      totalLeave: 0,
      totalAbsent: 0,
    }
  );

  // Pagination on sorted and filtered rows
  const totalRecords = filteredRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
  const paginatedRows = filteredRows.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Date columns headers list
  const dayNumbers = Array.from({ length: data.daysInMonth }, (_, i) => i + 1);

  // Render Status cell code badge
  const renderCellBadge = (code: string, notes: string | null) => {
    const base =
      'w-6 h-6 flex items-center justify-center font-bold text-[10px] rounded-md transition-all select-none';

    switch (code) {
      case 'H':
        return (
          <span
            className={`${base} bg-emerald-50 text-emerald-700 border border-emerald-200`}
            title="Hadir — Tepat Waktu"
          >
            H
          </span>
        );
      case 'T':
        return (
          <span
            className={`${base} bg-amber-50 text-amber-700 border border-amber-200`}
            title={`Hadir — Terlambat${notes ? `: ${notes}` : ''}`}
          >
            T
          </span>
        );
      case 'S':
        return (
          <span
            className={`${base} bg-blue-50 text-blue-700 border border-blue-200`}
            title={`Sakit${notes ? `: ${notes}` : ''}`}
          >
            S
          </span>
        );
      case 'I':
        return (
          <span
            className={`${base} bg-indigo-50 text-indigo-700 border border-indigo-200`}
            title={`Izin${notes ? `: ${notes}` : ''}`}
          >
            I
          </span>
        );
      case 'DL':
        return (
          <span
            className={`${base} bg-purple-50 text-purple-700 border border-purple-200`}
            title={`Dinas Luar${notes ? `: ${notes}` : ''}`}
          >
            DL
          </span>
        );
      case 'C':
        return (
          <span
            className={`${base} bg-teal-50 text-teal-700 border border-teal-200`}
            title={`Cuti${notes ? `: ${notes}` : ''}`}
          >
            C
          </span>
        );
      case 'A':
        return (
          <span
            className={`${base} bg-red-50 text-red-700 border border-red-200`}
            title="Alpha (Tanpa Keterangan)"
          >
            A
          </span>
        );
      case 'L':
        return (
          <span
            className={`${base} bg-gray-50 text-gray-500 border border-gray-200`}
            title={`Libur / Akhir Pekan${notes ? `: ${notes}` : ''}`}
          >
            L
          </span>
        );
      case '—':
      default:
        return (
          <span
            className={`${base} bg-gray-50/50 text-gray-300 border border-gray-100`}
            title="Masa Depan / Belum Terjadi"
          >
            —
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Summary Cards (PHASE 9G - M) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        {/* Total Pegawai */}
        <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl p-3 shadow-2xs space-y-1">
          <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">Total Pegawai</p>
          <p className="text-xl font-bold text-[#111827]">{totalRecords}</p>
        </div>
        {/* Hadir */}
        <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3 shadow-2xs space-y-1">
          <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">Hadir (H)</p>
          <p className="text-xl font-bold text-emerald-950">{aggregatedStats.totalPresent}</p>
        </div>
        {/* Terlambat */}
        <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3 shadow-2xs space-y-1">
          <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">Terlambat (T)</p>
          <p className="text-xl font-bold text-amber-950">{aggregatedStats.totalLate}</p>
        </div>
        {/* Sakit */}
        <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3 shadow-2xs space-y-1">
          <p className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">Sakit (S)</p>
          <p className="text-xl font-bold text-blue-950">{aggregatedStats.totalSick}</p>
        </div>
        {/* Izin */}
        <div className="bg-indigo-50/60 border border-indigo-200 rounded-xl p-3 shadow-2xs space-y-1">
          <p className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider">Izin (I)</p>
          <p className="text-xl font-bold text-indigo-950">{aggregatedStats.totalPermit}</p>
        </div>
        {/* Dinas Luar */}
        <div className="bg-purple-50/60 border border-purple-200 rounded-xl p-3 shadow-2xs space-y-1">
          <p className="text-[10px] font-bold text-purple-800 uppercase tracking-wider">Dinas (DL)</p>
          <p className="text-xl font-bold text-purple-950">{aggregatedStats.totalOfficialDuty}</p>
        </div>
        {/* Cuti */}
        <div className="bg-teal-50/60 border border-teal-200 rounded-xl p-3 shadow-2xs space-y-1">
          <p className="text-[10px] font-bold text-teal-800 uppercase tracking-wider">Cuti (C)</p>
          <p className="text-xl font-bold text-teal-950">{aggregatedStats.totalLeave}</p>
        </div>
        {/* Alpha */}
        <div className="bg-red-50/60 border border-red-200 rounded-xl p-3 shadow-2xs space-y-1">
          <p className="text-[10px] font-bold text-red-800 uppercase tracking-wider">Alpha (A)</p>
          <p className="text-xl font-bold text-red-950">{aggregatedStats.totalAbsent}</p>
        </div>
      </div>

        {/* 2. Main Table & Toolbar */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-2xs overflow-hidden">
          {/* Toolbar */}
          <div className="p-4 sm:p-5 border-b border-[#F3F4F6] flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white">
            <div>
              <h3 className="text-sm sm:text-base font-bold text-[#111827] flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-[#F97316]" />
                Matriks Kehadiran Bulanan Pegawai
              </h3>
              <p className="text-xs text-[#6B7280] mt-0.5">
                Rincian kehadiran harian tanggal 1–{data.daysInMonth} beserta rangkuman status administratif pegawai
              </p>
            </div>
  
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Local NIP/Name search */}
              <div className="relative w-full sm:w-40">
                <Search className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nama / NIP..."
                  value={localSearch}
                  onChange={(e) => {
                    setLocalSearch(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
                />
              </div>
  
              {/* Local Employee Type Filter */}
              <select
                value={employeeTypeFilter}
                onChange={(e) => {
                  setEmployeeTypeFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-2.5 py-1.5 text-xs font-semibold text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
              >
                <option value="all">Semua Tipe</option>
                <option value="PNS">PNS</option>
                <option value="PPPK">PPPK</option>
                <option value="HONORER">HONORER</option>
                <option value="Tidak diketahui">Tidak diketahui</option>
              </select>

              {/* Export Buttons */}
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

        {/* Legend Panel */}
        <div className="bg-gray-50 border-b border-[#F3F4F6] px-4 py-2.5 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] text-[#6B7280] font-medium leading-none">
          <span className="font-semibold text-[#374151]">Keterangan Cell:</span>
          <span className="flex items-center gap-1">
            <span className="font-bold text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-100">H</span> Hadir
          </span>
          <span className="flex items-center gap-1">
            <span className="font-bold text-amber-600 bg-amber-50 px-1 py-0.5 rounded border border-amber-100">T</span> Terlambat
          </span>
          <span className="flex items-center gap-1">
            <span className="font-bold text-blue-600 bg-blue-50 px-1 py-0.5 rounded border border-blue-100">S</span> Sakit
          </span>
          <span className="flex items-center gap-1">
            <span className="font-bold text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded border border-indigo-100">I</span> Izin
          </span>
          <span className="flex items-center gap-1">
            <span className="font-bold text-purple-600 bg-purple-50 px-1 py-0.5 rounded border border-purple-100">DL</span> Dinas Luar
          </span>
          <span className="flex items-center gap-1">
            <span className="font-bold text-teal-600 bg-teal-50 px-1 py-0.5 rounded border border-teal-100">C</span> Cuti
          </span>
          <span className="flex items-center gap-1">
            <span className="font-bold text-red-600 bg-red-50 px-1 py-0.5 rounded border border-red-100">A</span> Alpha
          </span>
          <span className="flex items-center gap-1">
            <span className="font-bold text-gray-500 bg-gray-100 px-1 py-0.5 rounded border border-gray-200">L</span> Libur
          </span>
          <span className="flex items-center gap-1 text-gray-400">
            <span className="font-bold text-gray-300 bg-gray-50 px-1 py-0.5 rounded">—</span> Belum terjadi
          </span>
        </div>

        {/* Responsive Grid with Sticky Headers & Sticky Left Columns */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-[#F9FAFB] text-[#4B5563] border-b border-[#E5E7EB] font-bold text-[10px] uppercase tracking-wider">
                {/* Sticky Left Headers */}
                <th className="sticky left-0 z-20 bg-[#F9FAFB] py-3.5 px-3 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] text-center min-w-[45px]">No</th>
                <th className="sticky left-[45px] z-20 bg-[#F9FAFB] py-3.5 px-4 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] min-w-[150px]">Nama Pegawai</th>
                <th className="sticky left-[195px] z-20 bg-[#F9FAFB] py-3.5 px-3 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] min-w-[90px]">Status</th>

                {/* Day Matrix Columns */}
                {dayNumbers.map((d) => (
                  <th key={d} className="py-3.5 px-1 text-center min-w-[34px]">{d}</th>
                ))}

                {/* Summary Count Headers */}
                <th className="py-3.5 px-2 text-center min-w-[50px] bg-emerald-50 text-emerald-800">H</th>
                <th className="py-3.5 px-2 text-center min-w-[50px] bg-amber-50 text-amber-800">T</th>
                <th className="py-3.5 px-2 text-center min-w-[50px] bg-blue-50 text-blue-800">S</th>
                <th className="py-3.5 px-2 text-center min-w-[50px] bg-indigo-50 text-indigo-800">I</th>
                <th className="py-3.5 px-2 text-center min-w-[55px] bg-purple-50 text-purple-800">DL</th>
                <th className="py-3.5 px-2 text-center min-w-[50px] bg-teal-50 text-teal-800">C</th>
                <th className="py-3.5 px-2 text-center min-w-[50px] bg-red-50 text-red-800">A</th>
                <th className="py-3.5 px-3 text-center min-w-[70px] bg-orange-50 text-orange-800 font-bold border-l border-[#E5E7EB]">%</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F4F6] bg-white">
              {paginatedRows.map((row, index) => {
                const rowIndex = (currentPage - 1) * pageSize + index + 1;
                const percVal = row.attendancePercentage;

                let percBadgeVariant: 'success' | 'warning' | 'danger' = 'success';
                if (percVal !== null) {
                  if (percVal < 75) percBadgeVariant = 'danger';
                  else if (percVal < 90) percBadgeVariant = 'warning';
                }

                return (
                  <tr key={row.employeeId} className="hover:bg-[#F9FAFB] transition-colors">
                    {/* Sticky Left Data Cells */}
                    <td className="sticky left-0 z-10 bg-white font-mono font-bold text-center py-3 px-3 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] text-[#6B7280]">
                      {rowIndex}
                    </td>
                    <td className="sticky left-[45px] z-10 bg-white py-3 px-4 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                      <div className="font-bold text-[#111827] truncate max-w-[140px]" title={row.employeeName}>
                        {row.employeeName}
                      </div>
                      <div className="text-[10px] text-[#6B7280] font-mono leading-tight">
                        NIP: {row.nip || '—'}
                      </div>
                    </td>
                    <td className="sticky left-[195px] z-10 bg-white py-3 px-3 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                      <Badge variant="default" size="sm" className="font-semibold px-2 py-0.5 text-[10px]">
                        {row.employeeType}
                      </Badge>
                    </td>

                    {/* Day Matrix Status Cells */}
                    {dayNumbers.map((d) => {
                      const dayStatus = row.dailyStatuses[d] || { code: '—', notes: null };
                      return (
                        <td key={d} className="py-3 px-1 text-center">
                          <div className="flex justify-center">
                            {renderCellBadge(dayStatus.code, dayStatus.notes)}
                          </div>
                        </td>
                      );
                    })}

                    {/* Summary Count Values */}
                    <td className="py-3 px-2 text-center font-bold text-[#111827] bg-emerald-50/30">{row.totalPresent}</td>
                    <td className="py-3 px-2 text-center font-semibold text-[#111827] bg-amber-50/30">{row.totalLate}</td>
                    <td className="py-3 px-2 text-center text-[#4B5563] bg-blue-50/30">{row.totalSick}</td>
                    <td className="py-3 px-2 text-center text-[#4B5563] bg-indigo-50/30">{row.totalPermit}</td>
                    <td className="py-3 px-2 text-center text-[#4B5563] bg-purple-50/30">{row.totalOfficialDuty}</td>
                    <td className="py-3 px-2 text-center text-[#4B5563] bg-teal-50/30">{row.totalLeave}</td>
                    <td className="py-3 px-2 text-center font-bold text-red-600 bg-red-50/30">{row.totalAbsent}</td>

                    {/* Percentage Display */}
                    <td className="py-3 px-3 text-center border-l border-[#E5E7EB] bg-orange-50/30">
                      {percVal !== null ? (
                        <Badge variant={percBadgeVariant} size="sm" className="font-mono font-bold text-[11px] px-2 py-0.5">
                          {row.attendancePercentageLabel}
                        </Badge>
                      ) : (
                        <span className="text-gray-400 font-bold">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer Pagination Controls */}
        <div className="p-4 bg-white border-t border-[#F3F4F6] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#6B7280]">
          <div className="flex items-center gap-2">
            <span>Tampilkan baris:</span>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setCurrentPage(1);
              }}
              className="bg-white border border-[#E5E7EB] rounded-lg px-2.5 py-1 text-xs text-[#111827] font-semibold focus:outline-none focus:ring-1 focus:ring-[#F97316]"
            >
              <option value={15}>15 baris</option>
              <option value={30}>30 baris</option>
              <option value={50}>50 baris</option>
            </select>
            <span>
              Menampilkan <strong className="text-[#111827]">{paginatedRows.length}</strong> dari{' '}
              <strong className="text-[#111827]">{totalRecords}</strong> pegawai
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg border border-[#E5E7EB] hover:bg-[#F9FAFB] disabled:opacity-40 disabled:hover:bg-transparent transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 text-[#4B5563]" />
            </button>
            <span className="font-semibold text-[#111827]">
              Halaman {currentPage} dari {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg border border-[#E5E7EB] hover:bg-[#F9FAFB] disabled:opacity-40 disabled:hover:bg-transparent transition-all cursor-pointer"
            >
              <ChevronRight className="w-4 h-4 text-[#4B5563]" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
