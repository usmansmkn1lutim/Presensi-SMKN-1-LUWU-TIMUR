import React, { useState } from 'react';
import {
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  FileSpreadsheet,
  Download,
} from 'lucide-react';
import { MonthlyRecapReportResponse } from '../../types/attendanceReport.types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface MonthlyRecapReportTableProps {
  data: MonthlyRecapReportResponse | null;
  isLoading: boolean;
  onExportExcel: () => void;
  onExportPdf: () => void;
  isExporting: boolean;
  exportingType: 'excel' | 'pdf' | null;
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  employeeTypeFilter?: string;
  onEmployeeTypeChange?: (type: string) => void;
  currentPage?: number;
  onPageChange?: (page: number) => void;
}

export const MonthlyRecapReportTable: React.FC<MonthlyRecapReportTableProps> = ({
  data,
  isLoading,
  onExportExcel,
  onExportPdf,
  isExporting,
  exportingType,
  searchQuery,
  onSearchChange,
  employeeTypeFilter: controlledEmployeeType,
  onEmployeeTypeChange,
  currentPage: controlledCurrentPage,
  onPageChange,
}) => {
  const [localSearch, setLocalSearch] = useState<string>('');
  const [localEmployeeTypeFilter, setLocalEmployeeTypeFilter] = useState<string>('all');
  const [localCurrentPage, setLocalCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(15);

  const effectiveSearch = searchQuery !== undefined ? searchQuery : localSearch;
  const effectiveEmployeeType =
    controlledEmployeeType !== undefined ? controlledEmployeeType : localEmployeeTypeFilter;
  const effectiveCurrentPage =
    controlledCurrentPage !== undefined ? controlledCurrentPage : localCurrentPage;

  const handleSearchChange = (q: string) => {
    if (onSearchChange) {
      onSearchChange(q);
    } else {
      setLocalSearch(q);
      setLocalCurrentPage(1);
    }
  };

  const handleEmployeeTypeChange = (type: string) => {
    if (onEmployeeTypeChange) {
      onEmployeeTypeChange(type);
    } else {
      setLocalEmployeeTypeFilter(type);
      setLocalCurrentPage(1);
    }
  };

  const handlePageChange = (nextPage: number) => {
    if (onPageChange) {
      onPageChange(nextPage);
    } else {
      setLocalCurrentPage(nextPage);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 lg:p-6 shadow-2xs space-y-4">
        <div className="h-5 lg:h-6 bg-gray-100 rounded w-40 lg:w-48 animate-pulse mb-4" />
        <div className="hidden lg:grid lg:grid-cols-8 gap-3">
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
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 lg:p-12 text-center shadow-2xs">
        <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center mx-auto mb-2.5 lg:mb-3">
          <Users className="w-5 h-5 lg:w-6 lg:h-6" />
        </div>
        <h4 className="text-sm lg:text-base font-bold text-[#111827]">
          Belum Ada Data Rekap Bulanan
        </h4>
        <p className="text-xs text-[#6B7280] max-w-sm mx-auto mt-1">
          Tidak ditemukan data rekap harian pegawai untuk bulan dan filter yang ditentukan.
        </p>
      </div>
    );
  }

  // Filter rows locally (pre-pagination)
  const filteredRows = data.rows.filter((row) => {
    // Search NIP/Name
    if (effectiveSearch.trim()) {
      const q = effectiveSearch.toLowerCase().trim();
      const nameMatch = row.employeeName.toLowerCase().includes(q);
      const nipMatch = row.nip ? row.nip.toLowerCase().includes(q) : false;
      if (!nameMatch && !nipMatch) return false;
    }

    // Employee Type Filter
    if (effectiveEmployeeType !== 'all') {
      if (row.employeeType !== effectiveEmployeeType) return false;
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
  const safePage = Math.min(Math.max(1, effectiveCurrentPage), totalPages);
  const paginatedRows = filteredRows.slice(
    (safePage - 1) * pageSize,
    safePage * pageSize
  );

  // Date columns headers list
  const dayNumbers = Array.from({ length: data.daysInMonth }, (_, i) => i + 1);

  // Render Status cell code badge (colors aligned 1:1 with legend indicators)
  const renderCellBadge = (code: string, notes: string | null) => {
    const cellStyleMap: Record<string, { className: string; label: string }> = {
      H: {
        className: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
        label: 'Hadir — Tepat Waktu',
      },
      T: {
        className: 'bg-amber-50 text-amber-600 border border-amber-100',
        label: 'Hadir — Terlambat',
      },
      DL: {
        className: 'bg-purple-50 text-purple-600 border border-purple-100',
        label: 'Dinas Luar',
      },
      S: {
        className: 'bg-blue-50 text-blue-600 border border-blue-100',
        label: 'Sakit',
      },
      I: {
        className: 'bg-indigo-50 text-indigo-600 border border-indigo-100',
        label: 'Izin',
      },
      C: {
        className: 'bg-teal-50 text-teal-600 border border-teal-100',
        label: 'Cuti',
      },
      A: {
        className: 'bg-red-50 text-red-600 border border-red-100',
        label: 'Alfa (Tanpa Keterangan)',
      },
      L: {
        className: 'bg-gray-100 text-gray-500 border border-gray-200',
        label: 'Libur / Akhir Pekan',
      },
    };

    if (code === '—' || !cellStyleMap[code]) {
      return (
        <span
          className="w-6 h-6 flex items-center justify-center font-bold text-[10px] rounded-md bg-gray-50 text-gray-300"
          title="Belum"
        >
          —
        </span>
      );
    }

    const config = cellStyleMap[code];
    return (
      <span
        className={`w-6 h-6 flex items-center justify-center font-bold text-[10px] rounded-md ${config.className}`}
        title={`${config.label}${notes ? `: ${notes}` : ''}`}
      >
        {code}
      </span>
    );
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      {/* 1. Summary Cards (PHASE 9G - M) - Desktop Only */}
      <div className="hidden lg:grid lg:grid-cols-8 gap-3">
        {/* Total Pegawai */}
        <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-xl p-3 shadow-2xs space-y-1">
          <p className="text-[10px] font-bold text-[#6B7280] uppercase tracking-wider">
            Total Pegawai
          </p>
          <p className="text-xl font-bold text-[#111827]">{totalRecords}</p>
        </div>
        {/* Hadir */}
        <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3 shadow-2xs space-y-1">
          <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
            Hadir (H)
          </p>
          <p className="text-xl font-bold text-emerald-950">{aggregatedStats.totalPresent}</p>
        </div>
        {/* Terlambat */}
        <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3 shadow-2xs space-y-1">
          <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
            Terlambat (T)
          </p>
          <p className="text-xl font-bold text-amber-950">{aggregatedStats.totalLate}</p>
        </div>
        {/* Sakit */}
        <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3 shadow-2xs space-y-1">
          <p className="text-[10px] font-bold text-blue-800 uppercase tracking-wider">
            Sakit (S)
          </p>
          <p className="text-xl font-bold text-blue-950">{aggregatedStats.totalSick}</p>
        </div>
        {/* Izin */}
        <div className="bg-indigo-50/60 border border-indigo-200 rounded-xl p-3 shadow-2xs space-y-1">
          <p className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider">
            Izin (I)
          </p>
          <p className="text-xl font-bold text-indigo-950">{aggregatedStats.totalPermit}</p>
        </div>
        {/* Dinas Luar */}
        <div className="bg-purple-50/60 border border-purple-200 rounded-xl p-3 shadow-2xs space-y-1">
          <p className="text-[10px] font-bold text-purple-800 uppercase tracking-wider">
            Dinas (DL)
          </p>
          <p className="text-xl font-bold text-purple-950">{aggregatedStats.totalOfficialDuty}</p>
        </div>
        {/* Cuti */}
        <div className="bg-teal-50/60 border border-teal-200 rounded-xl p-3 shadow-2xs space-y-1">
          <p className="text-[10px] font-bold text-teal-800 uppercase tracking-wider">
            Cuti (C)
          </p>
          <p className="text-xl font-bold text-teal-950">{aggregatedStats.totalLeave}</p>
        </div>
        {/* Alpha */}
        <div className="bg-red-50/60 border border-red-200 rounded-xl p-3 shadow-2xs space-y-1">
          <p className="text-[10px] font-bold text-red-800 uppercase tracking-wider">
            Alpha (A)
          </p>
          <p className="text-xl font-bold text-red-950">{aggregatedStats.totalAbsent}</p>
        </div>
      </div>

      {/* 2. Main Table & Toolbar */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-2xs overflow-hidden">
        {/* Compact Mobile/Tablet Data Header */}
        <div className="lg:hidden px-4 py-3 border-b border-[#E5E7EB] flex items-center justify-between gap-2 bg-white">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#111827]">{totalRecords} pegawai</span>
            {totalRecords !== data.rows.length && (
              <span className="text-[11px] text-[#6B7280]">dari {data.rows.length}</span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
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

        {/* Desktop Toolbar */}
        <div className="hidden lg:flex p-4 sm:p-5 border-b border-[#F3F4F6] flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-[#111827] flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-[#F97316]" />
              Matriks Kehadiran Bulanan Pegawai
            </h3>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Rincian kehadiran harian tanggal 1–{data.daysInMonth} beserta rangkuman status
              administratif pegawai
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Local NIP/Name search */}
            <div className="relative w-full sm:w-40">
              <Search className="w-3.5 h-3.5 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari nama / NIP..."
                value={effectiveSearch}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
              />
            </div>

            {/* Local Employee Type Filter */}
            <select
              value={effectiveEmployeeType}
              onChange={(e) => handleEmployeeTypeChange(e.target.value)}
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

        {/* Legend Panel: lowered one row with 2 structured rows, inline without card bg on <lg */}
        <div className="bg-transparent border-0 px-4 pt-4 pb-2.5 text-[10px] lg:bg-gray-50 lg:border-b lg:border-[#F3F4F6] lg:px-4 lg:pt-4 lg:pb-3 lg:text-[11px] text-[#6B7280] font-medium leading-none space-y-2">
          <div className="font-semibold text-[#374151]">Keterangan Cell:</div>
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 lg:gap-x-4">
              <span className="flex items-center gap-1">
                <span className="font-bold text-emerald-600 bg-emerald-50 px-1 py-0.5 rounded border border-emerald-100">
                  H
                </span>{' '}
                Hadir
              </span>
              <span className="flex items-center gap-1">
                <span className="font-bold text-amber-600 bg-amber-50 px-1 py-0.5 rounded border border-amber-100">
                  T
                </span>{' '}
                Terlambat
              </span>
              <span className="flex items-center gap-1">
                <span className="font-bold text-purple-600 bg-purple-50 px-1 py-0.5 rounded border border-purple-100">
                  DL
                </span>{' '}
                Dinas Luar
              </span>
              <span className="flex items-center gap-1">
                <span className="font-bold text-blue-600 bg-blue-50 px-1 py-0.5 rounded border border-blue-100">
                  S
                </span>{' '}
                Sakit
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 lg:gap-x-4">
              <span className="flex items-center gap-1">
                <span className="font-bold text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded border border-indigo-100">
                  I
                </span>{' '}
                Izin
              </span>
              <span className="flex items-center gap-1">
                <span className="font-bold text-teal-600 bg-teal-50 px-1 py-0.5 rounded border border-teal-100">
                  C
                </span>{' '}
                Cuti
              </span>
              <span className="flex items-center gap-1">
                <span className="font-bold text-red-600 bg-red-50 px-1 py-0.5 rounded border border-red-100">
                  A
                </span>{' '}
                Alfa
              </span>
              <span className="flex items-center gap-1">
                <span className="font-bold text-gray-500 bg-gray-100 px-1 py-0.5 rounded border border-gray-200">
                  L
                </span>{' '}
                Libur
              </span>
              <span className="flex items-center gap-1 text-gray-400">
                <span className="font-bold text-gray-300 bg-gray-50 px-1 py-0.5 rounded">—</span>{' '}
                Belum
              </span>
            </div>
          </div>
        </div>

        {filteredRows.length === 0 ? (
          <div className="p-8 text-center border-t border-[#F3F4F6]">
            <p className="text-xs font-semibold text-[#111827]">
              Pegawai Tidak Ditemukan
            </p>
            <p className="text-[11px] text-[#6B7280] mt-1">
              Tidak ada data rekap bulanan yang sesuai dengan pencarian atau filter tipe pegawai.
            </p>
          </div>
        ) : (
          <>
            {/* Responsive Grid with Sticky Headers & Sticky Left Columns */}
            <div className="overflow-x-auto border-t border-[#F3F4F6] lg:border-t-0">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-[#F9FAFB] text-[#4B5563] border-b border-[#E5E7EB] font-bold text-[10px] uppercase tracking-wider">
                    {/* Sticky Left Headers */}
                    <th className="sticky left-0 z-20 bg-[#F9FAFB] w-[38px] min-w-[38px] max-w-[38px] py-3 px-1.5 lg:w-auto lg:min-w-[45px] lg:max-w-none lg:py-3.5 lg:px-3 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] text-center">
                      No
                    </th>
                    <th className="sticky left-[38px] lg:left-[45px] z-20 bg-[#F9FAFB] w-[132px] min-w-[132px] max-w-[132px] py-3 px-2.5 lg:w-auto lg:min-w-[150px] lg:max-w-none lg:py-3.5 lg:px-4 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                      Nama Pegawai
                    </th>
                    <th className="hidden lg:table-cell sticky left-[195px] z-20 bg-[#F9FAFB] py-3.5 px-3 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] min-w-[90px]">
                      Status
                    </th>

                    {/* Day Matrix Columns */}
                    {dayNumbers.map((d) => (
                      <th key={d} className="py-3 lg:py-3.5 px-1 text-center min-w-[34px]">
                        {d}
                      </th>
                    ))}

                    {/* Summary Count Headers (9 columns) */}
                    <th className="py-3 lg:py-3.5 px-2.5 text-center whitespace-nowrap min-w-[88px] bg-emerald-50 text-emerald-800">
                      Hadir (Total)
                    </th>
                    <th className="py-3 lg:py-3.5 px-2.5 text-center whitespace-nowrap min-w-[88px] bg-emerald-50 text-emerald-800">
                      Tepat Waktu
                    </th>
                    <th className="py-3 lg:py-3.5 px-2.5 text-center whitespace-nowrap min-w-[78px] bg-amber-50 text-amber-800">
                      Terlambat
                    </th>
                    <th className="py-3 lg:py-3.5 px-2.5 text-center whitespace-nowrap min-w-[82px] bg-purple-50 text-purple-800">
                      Dinas Luar
                    </th>
                    <th className="py-3 lg:py-3.5 px-2.5 text-center whitespace-nowrap min-w-[58px] bg-blue-50 text-blue-800">
                      Sakit
                    </th>
                    <th className="py-3 lg:py-3.5 px-2.5 text-center whitespace-nowrap min-w-[54px] bg-indigo-50 text-indigo-800">
                      Izin
                    </th>
                    <th className="py-3 lg:py-3.5 px-2.5 text-center whitespace-nowrap min-w-[54px] bg-teal-50 text-teal-800">
                      Cuti
                    </th>
                    <th className="py-3 lg:py-3.5 px-2.5 text-center whitespace-nowrap min-w-[54px] bg-red-50 text-red-800">
                      Alfa
                    </th>
                    <th className="py-3 lg:py-3.5 px-3 text-center whitespace-nowrap min-w-[84px] bg-orange-50 text-orange-800 font-bold border-l border-[#E5E7EB]">
                      Persentase
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3F4F6] bg-white">
                  {paginatedRows.map((row, index) => {
                    const rowIndex = (safePage - 1) * pageSize + index + 1;
                    const percVal = row.attendancePercentage;

                    let percBadgeVariant: 'success' | 'warning' | 'danger' = 'success';
                    if (percVal !== null) {
                      if (percVal < 75) percBadgeVariant = 'danger';
                      else if (percVal < 90) percBadgeVariant = 'warning';
                    }

                    return (
                      <tr key={row.employeeId} className="hover:bg-[#F9FAFB] transition-colors">
                        {/* Sticky Left Data Cells */}
                        <td className="sticky left-0 z-10 bg-white w-[38px] min-w-[38px] max-w-[38px] font-mono font-bold text-center py-2.5 px-1.5 lg:w-auto lg:min-w-0 lg:max-w-none lg:py-3 lg:px-3 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] text-[#6B7280]">
                          {rowIndex}
                        </td>
                        <td className="sticky left-[38px] lg:left-[45px] z-10 bg-white w-[132px] min-w-[132px] max-w-[132px] py-2.5 px-2.5 lg:w-auto lg:min-w-0 lg:max-w-none lg:py-3 lg:px-4 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                          <div
                            className="font-bold text-[#111827] truncate max-w-[112px] lg:max-w-[140px]"
                            title={row.employeeName}
                          >
                            {row.employeeName}
                          </div>
                          <div className="hidden lg:block text-[10px] text-[#6B7280] font-mono leading-tight">
                            NIP: {row.nip || '—'}
                          </div>
                        </td>
                        <td className="hidden lg:table-cell sticky left-[195px] z-10 bg-white py-3 px-3 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                          <Badge
                            variant="default"
                            size="sm"
                            className="font-semibold px-2 py-0.5 text-[10px]"
                          >
                            {row.employeeType}
                          </Badge>
                        </td>

                        {/* Day Matrix Status Cells */}
                        {dayNumbers.map((d) => {
                          const dayStatus = row.dailyStatuses[d] || { code: '—', notes: null };
                          return (
                            <td key={d} className="py-2.5 lg:py-3 px-1 text-center">
                              <div className="flex justify-center">
                                {renderCellBadge(dayStatus.code, dayStatus.notes)}
                              </div>
                            </td>
                          );
                        })}

                        {/* Summary Count Values (9 columns) */}
                        <td className="py-2.5 lg:py-3 px-2.5 text-center font-bold text-[#111827] bg-emerald-50/30">
                          {row.totalPresent + row.totalOfficialDuty}
                        </td>
                        <td className="py-2.5 lg:py-3 px-2.5 text-center font-semibold text-[#111827] bg-emerald-50/30">
                          {Math.max(0, row.totalPresent - row.totalLate)}
                        </td>
                        <td className="py-2.5 lg:py-3 px-2.5 text-center font-semibold text-[#111827] bg-amber-50/30">
                          {row.totalLate}
                        </td>
                        <td className="py-2.5 lg:py-3 px-2.5 text-center text-[#4B5563] bg-purple-50/30">
                          {row.totalOfficialDuty}
                        </td>
                        <td className="py-2.5 lg:py-3 px-2.5 text-center text-[#4B5563] bg-blue-50/30">
                          {row.totalSick}
                        </td>
                        <td className="py-2.5 lg:py-3 px-2.5 text-center text-[#4B5563] bg-indigo-50/30">
                          {row.totalPermit}
                        </td>
                        <td className="py-2.5 lg:py-3 px-2.5 text-center text-[#4B5563] bg-teal-50/30">
                          {row.totalLeave}
                        </td>
                        <td className="py-2.5 lg:py-3 px-2.5 text-center font-bold text-red-600 bg-red-50/30">
                          {row.totalAbsent}
                        </td>

                        {/* Percentage Display */}
                        <td className="py-2.5 lg:py-3 px-3 text-center border-l border-[#E5E7EB] bg-orange-50/30">
                          {percVal !== null ? (
                            <Badge
                              variant={percBadgeVariant}
                              size="sm"
                              className="font-mono font-bold text-[11px] px-2 py-0.5"
                            >
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
            <div className="px-4 py-3 lg:p-4 bg-[#F9FAFB] lg:bg-white border-t border-[#E5E7EB] lg:border-[#F3F4F6] flex flex-wrap items-center justify-between gap-2.5 lg:gap-3 text-[11px] lg:text-xs text-[#6B7280]">
              <div className="flex items-center gap-2">
                <span className="hidden lg:inline">Tampilkan baris:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    handlePageChange(1);
                  }}
                  aria-label="Baris per halaman"
                  className="bg-white border border-[#E5E7EB] rounded-lg px-2 lg:px-2.5 py-1 text-[11px] lg:text-xs text-[#111827] font-semibold focus:outline-none focus:ring-1 focus:ring-[#F97316]"
                >
                  <option value={15}>15 baris</option>
                  <option value={30}>30 baris</option>
                  <option value={50}>50 baris</option>
                </select>
                <span>
                  <span className="hidden lg:inline">Menampilkan </span>
                  <strong className="text-[#111827]">{paginatedRows.length}</strong> dari{' '}
                  <strong className="text-[#111827]">{totalRecords}</strong>
                  <span className="hidden lg:inline"> pegawai</span>
                </span>
              </div>

              <div className="flex items-center gap-1.5 lg:gap-2">
                <button
                  type="button"
                  onClick={() => handlePageChange(Math.max(1, safePage - 1))}
                  disabled={safePage === 1}
                  aria-label="Halaman sebelumnya"
                  className="p-1.5 rounded-lg border border-[#E5E7EB] bg-white hover:bg-[#F9FAFB] disabled:opacity-40 disabled:hover:bg-transparent transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-[#4B5563]" />
                </button>
                <span className="font-semibold text-[#111827]">
                  <span className="hidden lg:inline">Halaman </span>
                  {safePage} <span className="hidden lg:inline">dari</span>
                  <span className="lg:hidden">/</span> {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => handlePageChange(Math.min(totalPages, safePage + 1))}
                  disabled={safePage === totalPages}
                  aria-label="Halaman berikutnya"
                  className="p-1.5 rounded-lg border border-[#E5E7EB] bg-white hover:bg-[#F9FAFB] disabled:opacity-40 disabled:hover:bg-transparent transition-all cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-[#4B5563]" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

