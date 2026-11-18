import React, { useState } from 'react';
import {
  FileText,
  MapPin,
  ChevronLeft,
  ChevronRight,
  Building2,
  FileSpreadsheet,
  Download,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import {
  AttendanceDetailItem,
  PaginatedAttendanceDetailResponse,
} from '../../types/attendanceReport.types';
import { Badge } from '../ui/Badge';
import { StatusBadge } from '../ui/StatusBadge';
import { Button } from '../ui/Button';
import { AttendanceStatusTokenKey } from '../../config/statusColors';

interface DetailReportTableProps {
  data: PaginatedAttendanceDetailResponse | null;
  isLoading: boolean;
  onPageChange: (newPage: number) => void;
  onPageSizeChange: (newPageSize: number) => void;
  onExportExcel: () => void;
  onExportPdf: () => void;
  isExporting: boolean;
  exportingType: 'excel' | 'pdf' | null;
  hasActiveFilter?: boolean;
}

const OFFICIAL_STATUS_TOKEN_MAP: Record<
  Exclude<AttendanceDetailItem['officialStatus'], 'present'>,
  AttendanceStatusTokenKey
> = {
  official_duty: 'officialDuty',
  sick: 'sick',
  permit: 'permit',
  leave: 'leave',
  absent: 'absent',
  pending: 'pending',
  holiday: 'neutral',
};

export const DetailReportTable: React.FC<DetailReportTableProps> = ({
  data,
  isLoading,
  onPageChange,
  onPageSizeChange,
  onExportExcel,
  onExportPdf,
  isExporting,
  exportingType,
  hasActiveFilter = false,
}) => {
  // Default sorting: Newest -> Oldest (descending by timestamp)
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  if (isLoading) {
    return (
      <>
        <div className="lg:hidden bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-2xs space-y-3">
          <div className="h-5 bg-gray-100 rounded w-36 animate-pulse" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-50 rounded-xl animate-pulse" />
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

  if (!data || data.records.length === 0) {
    return (
      <>
        <div className="lg:hidden bg-white border border-[#E5E7EB] rounded-2xl p-6 text-center shadow-2xs">
          <div className="w-10 h-10 rounded-xl bg-gray-50 text-gray-400 flex items-center justify-center mx-auto mb-2.5">
            <FileText className="w-5 h-5" />
          </div>
          <h4 className="text-sm font-bold text-[#111827]">
            {hasActiveFilter ? 'Tidak Ada Log yang Cocok' : 'Belum Ada Rincian Presensi'}
          </h4>
          <p className="text-xs text-[#6B7280] max-w-xs mx-auto mt-1">
            {hasActiveFilter
              ? 'Tidak ditemukan log presensi yang sesuai dengan pencarian atau filter aktif.'
              : 'Tidak ditemukan catatan transaksi presensi individual pada periode ini.'}
          </p>
        </div>
        <div className="hidden lg:block bg-white border border-[#E5E7EB] rounded-2xl p-12 text-center shadow-2xs">
          <div className="w-12 h-12 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center mx-auto mb-3">
            <FileText className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-[#111827]">Belum Ada Rincian Presensi</h4>
          <p className="text-xs text-[#6B7280] max-w-sm mx-auto mt-1">
            Tidak ditemukan catatan transaksi presensi individual pada filter yang ditentukan.
          </p>
        </div>
      </>
    );
  }

  const { records, totalCount, page, pageSize, totalPages } = data;

  // Sort records chronologically based on checkInAt / attendanceDate
  const sortedRecords = [...records].sort((a, b) => {
    const timeA = a.checkInAt || `${a.attendanceDate}T00:00:00`;
    const timeB = b.checkInAt || `${b.attendanceDate}T00:00:00`;
    const cmp = timeA.localeCompare(timeB);
    return sortAsc ? cmp : -cmp;
  });

  const toggleSort = () => {
    setSortAsc(!sortAsc);
  };

  const renderCheckInBadge = (status: 'on_time' | 'late' | null) => {
    if (status === 'on_time') {
      return (
        <StatusBadge statusKey="onTime" size="sm">
          Tepat Waktu
        </StatusBadge>
      );
    }
    if (status === 'late') {
      return (
        <StatusBadge statusKey="late" size="sm">
          Terlambat
        </StatusBadge>
      );
    }
    return (
      <Badge variant="default" size="sm">
        -
      </Badge>
    );
  };

  const renderCheckOutBadge = (
    status: 'operational' | 'after_work' | null,
    checkOutAt: string | null
  ) => {
    if (!checkOutAt) {
      return (
        <Badge variant="danger" size="sm">
          Belum Pulang
        </Badge>
      );
    }
    if (status === 'operational') {
      return (
        <Badge variant="info" size="sm">
          Jam Operasional
        </Badge>
      );
    }
    if (status === 'after_work') {
      return (
        <Badge variant="primary" size="sm">
          Jam Pulang
        </Badge>
      );
    }
    return (
      <Badge variant="success" size="sm">
        Selesai
      </Badge>
    );
  };

  const renderOfficialStatusBadge = (row: AttendanceDetailItem) => {
    if (row.officialStatus === 'present') {
      return renderCheckInBadge(row.checkInStatus);
    }
    const tokenKey = OFFICIAL_STATUS_TOKEN_MAP[row.officialStatus] || 'neutral';
    return (
      <StatusBadge statusKey={tokenKey} size="sm">
        {row.officialStatusLabel}
      </StatusBadge>
    );
  };

  const startItem = (page - 1) * pageSize + 1;
  const endItem = Math.min(page * pageSize, totalCount);

  return (
    <>
      {/* Mobile & Tablet (<lg): Compact List View */}
      <div className="lg:hidden bg-white border border-[#E5E7EB] rounded-2xl shadow-2xs overflow-hidden">
        {/* Compact Data Header */}
        <div className="px-4 py-3 border-b border-[#E5E7EB] flex items-center justify-between gap-2 bg-white">
          <span className="text-xs font-bold text-[#111827]">{totalCount} log</span>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleSort}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#E5E7EB] bg-[#F9FAFB] text-[11px] font-medium text-[#374151] cursor-pointer"
            >
              <span>Tanggal</span>
              {sortAsc ? (
                <ArrowUp className="w-3 h-3 text-[#F97316]" />
              ) : (
                <ArrowDown className="w-3 h-3 text-[#F97316]" />
              )}
            </button>
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

        {/* Log List Items */}
        <div className="divide-y divide-[#E5E7EB]">
          {sortedRecords.map((row) => {
            const isHistorical = !row.employeeId || row.employeeName.includes('(Arsip)');
            const isPresent = row.officialStatus === 'present';

            return (
              <div key={row.attendanceId} className="px-4 py-3 space-y-1.5">
                {/* Row 1: Employee & Status */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[#111827] flex items-center gap-1.5 flex-wrap">
                      <span className="truncate">{row.employeeName}</span>
                      {isHistorical && (
                        <Badge variant="warning" size="sm">
                          Arsip
                        </Badge>
                      )}
                    </div>
                    <div className="text-[11px] text-[#6B7280] truncate">
                      {row.attendanceDate} · {row.departmentName}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 flex-wrap justify-end">
                    {renderOfficialStatusBadge(row)}
                    {isPresent && !row.checkOutAt && (
                      <Badge variant="danger" size="sm">
                        Belum Pulang
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Row 2: Physical Check-In / Check-Out OR Non-Physical Notes */}
                {isPresent ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[11px] text-[#4B5563]">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[#6B7280] shrink-0">Masuk:</span>
                      <span className="font-semibold text-blue-600 shrink-0">
                        {row.checkInTimeFormatted} WITA
                      </span>
                      {row.checkInLocation && (
                        <span className="inline-flex items-center gap-0.5 text-[#6B7280] truncate">
                          <MapPin className="w-3 h-3 shrink-0 text-[#9CA3AF]" />
                          <span className="truncate">{row.checkInLocation}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[#6B7280] shrink-0">Pulang:</span>
                      <span className="font-semibold text-purple-600 shrink-0">
                        {row.checkOutAt ? `${row.checkOutTimeFormatted} WITA` : '-'}
                      </span>
                      {row.checkOutLocation && (
                        <span className="inline-flex items-center gap-0.5 text-[#6B7280] truncate">
                          <MapPin className="w-3 h-3 shrink-0 text-[#9CA3AF]" />
                          <span className="truncate">{row.checkOutLocation}</span>
                        </span>
                      )}
                    </div>
                  </div>
                ) : null}

                {row.notes && (
                  <p className="text-[11px] text-[#6B7280] line-clamp-2">
                    Catatan: {row.notes}
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Compact Local Pagination Controls */}
        <div className="px-4 py-3 bg-[#F9FAFB] border-t border-[#E5E7EB] flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#6B7280]">
          <div className="flex items-center gap-2">
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              aria-label="Baris per halaman"
              className="bg-white border border-[#E5E7EB] rounded-lg px-2 py-1 text-[11px] font-semibold text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
            >
              <option value={15}>15 / hal</option>
              <option value={30}>30 / hal</option>
              <option value={50}>50 / hal</option>
            </select>
            <span>
              <strong className="text-[#111827]">{startItem}-{endItem}</strong> dari{' '}
              <strong className="text-[#111827]">{totalCount}</strong>
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              aria-label="Halaman sebelumnya"
              className="p-1.5 rounded-lg border border-[#E5E7EB] bg-white text-[#374151] disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
            <span className="font-semibold text-[#111827] px-1">
              {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              aria-label="Halaman berikutnya"
              className="p-1.5 rounded-lg border border-[#E5E7EB] bg-white text-[#374151] disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Desktop (>=lg): Unchanged Original Table View */}
      <div className="hidden lg:block bg-white border border-[#E5E7EB] rounded-2xl shadow-2xs overflow-hidden">
        {/* Table Header and Counter */}
        <div className="p-4 sm:p-5 border-b border-[#F3F4F6] flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-sm sm:text-base font-bold text-[#111827] flex items-center gap-2">
              <FileText className="w-4 h-4 text-[#F97316]" />
              Detail Rincian Presensi
            </h3>
            <p className="text-xs text-[#6B7280] mt-0.5">
              Log individual presensi masuk dan pulang pegawai beserta titik lokasi
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
              <span>Baris per halaman:</span>
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg px-2 py-1 text-xs text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
              >
                <option value={15}>15</option>
                <option value={30}>30</option>
                <option value={50}>50</option>
              </select>
            </div>
            <span className="text-xs font-semibold text-[#111827] mr-1">
              Total {totalCount} log
            </span>

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

        {/* Responsive Table */}
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
                        ? 'Tanggal dan Waktu, urutan terlama ke terbaru. Klik untuk mengubah ke terbaru ke terlama.'
                        : 'Tanggal dan Waktu, urutan terbaru ke terlama. Klik untuk mengubah ke terlama ke terbaru.'
                    }
                  >
                    <span>Tanggal & Waktu</span>
                    {sortAsc ? (
                      <ArrowUp className="w-3.5 h-3.5 text-[#F97316] transition-transform" />
                    ) : (
                      <ArrowDown className="w-3.5 h-3.5 text-[#F97316] transition-transform" />
                    )}
                  </button>
                </th>
                <th className="py-3 px-3">Pegawai</th>
                <th className="py-3 px-3">Departemen</th>
                <th className="py-3 px-3">Jam Masuk</th>
                <th className="py-3 px-3">Status Masuk</th>
                <th className="py-3 px-3">Lokasi Masuk</th>
                <th className="py-3 px-3">Jam Pulang</th>
                <th className="py-3 px-3">Status Pulang</th>
                <th className="py-3 px-3">Lokasi Pulang</th>
                <th className="py-3 px-4">Catatan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F3F4F6]">
              {sortedRecords.map((row) => {
                const isHistorical = !row.employeeId || row.employeeName.includes('(Arsip)');

                return (
                  <tr key={row.attendanceId} className="hover:bg-[#F9FAFB]/70 transition-colors">
                    <td className="py-3 px-4 font-medium text-[#111827] whitespace-nowrap">
                      {row.attendanceDate}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      <div className="font-semibold text-[#111827] flex items-center gap-1.5">
                        <span>{row.employeeName}</span>
                        {isHistorical && (
                          <Badge variant="warning" size="sm">
                            Arsip
                          </Badge>
                        )}
                      </div>
                      <div className="text-[11px] text-[#6B7280]">
                        {row.nip ? `NIP: ${row.nip}` : 'NIP: -'}
                      </div>
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap text-[#4B5563]">
                      <div className="flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-[#9CA3AF]" />
                        <span>{row.departmentName}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 font-semibold text-blue-600 whitespace-nowrap">
                      {row.checkInTimeFormatted} WITA
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      {renderCheckInBadge(row.checkInStatus)}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap text-[#4B5563]">
                      {row.checkInLocation ? (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#9CA3AF]" />
                          <span className="truncate max-w-[130px]">{row.checkInLocation}</span>
                        </div>
                      ) : (
                        <span className="text-[#9CA3AF]">-</span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-semibold text-purple-600 whitespace-nowrap">
                      {row.checkOutAt ? `${row.checkOutTimeFormatted} WITA` : '-'}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap">
                      {renderCheckOutBadge(row.checkOutStatus, row.checkOutAt)}
                    </td>
                    <td className="py-3 px-3 whitespace-nowrap text-[#4B5563]">
                      {row.checkOutLocation ? (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#9CA3AF]" />
                          <span className="truncate max-w-[130px]">{row.checkOutLocation}</span>
                        </div>
                      ) : (
                        <span className="text-[#9CA3AF]">-</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[#6B7280] max-w-[180px] truncate">
                      {row.notes || '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="p-3 sm:p-4 bg-[#F9FAFB] border-t border-[#E5E7EB] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-[#6B7280]">
            Menampilkan{' '}
            <span className="font-semibold text-[#111827]">
              {(page - 1) * pageSize + 1}
            </span>{' '}
            -{' '}
            <span className="font-semibold text-[#111827]">
              {Math.min(page * pageSize, totalCount)}
            </span>{' '}
            dari <span className="font-semibold text-[#111827]">{totalCount}</span> data
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
            >
              Sebelumnya
            </Button>
            <span className="text-xs font-semibold px-2 py-1 text-[#374151]">
              {page} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
            >
              Berikutnya
            </Button>
          </div>
        </div>
      </div>
    </>
  );
};

