import React from 'react';
import {
  FileText,
  MapPin,
  Clock,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Building2,
  FileSpreadsheet,
  Download,
} from 'lucide-react';
import {
  AttendanceDetailItem,
  PaginatedAttendanceDetailResponse,
} from '../../types/attendanceReport.types';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

interface DetailReportTableProps {
  data: PaginatedAttendanceDetailResponse | null;
  isLoading: boolean;
  onPageChange: (newPage: number) => void;
  onPageSizeChange: (newPageSize: number) => void;
  onExportExcel: () => void;
  onExportPdf: () => void;
  isExporting: boolean;
  exportingType: 'excel' | 'pdf' | null;
}

export const DetailReportTable: React.FC<DetailReportTableProps> = ({
  data,
  isLoading,
  onPageChange,
  onPageSizeChange,
  onExportExcel,
  onExportPdf,
  isExporting,
  exportingType,
}) => {
  if (isLoading) {
    return (
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-2xs space-y-3">
        <div className="h-6 bg-gray-100 rounded w-48 animate-pulse mb-4" />
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-10 bg-gray-50 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  if (!data || data.records.length === 0) {
    return (
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-12 text-center shadow-2xs">
        <div className="w-12 h-12 rounded-2xl bg-gray-50 text-gray-400 flex items-center justify-center mx-auto mb-3">
          <FileText className="w-6 h-6" />
        </div>
        <h4 className="text-base font-bold text-[#111827]">Belum Ada Rincian Presensi</h4>
        <p className="text-xs text-[#6B7280] max-w-sm mx-auto mt-1">
          Tidak ditemukan catatan transaksi presensi individual pada filter yang ditentukan.
        </p>
      </div>
    );
  }

  const { records, totalCount, page, pageSize, totalPages } = data;

  const renderCheckInBadge = (status: 'on_time' | 'late' | null) => {
    if (status === 'on_time') {
      return (
        <Badge variant="success" size="sm">
          Tepat Waktu
        </Badge>
      );
    }
    if (status === 'late') {
      return (
        <Badge variant="warning" size="sm">
          Terlambat
        </Badge>
      );
    }
    return (
      <Badge variant="default" size="sm">
        -
      </Badge>
    );
  };

  const renderCheckOutBadge = (status: 'operational' | 'after_work' | null, checkOutAt: string | null) => {
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

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-2xs overflow-hidden">
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
              <th className="py-3 px-4">Tanggal</th>
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
            {records.map((row) => {
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
  );
};
