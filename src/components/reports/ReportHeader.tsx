import React from 'react';
import { RefreshCw, FileText, Calendar, FileSpreadsheet, Download, Loader2 } from 'lucide-react';
import { Button } from '../ui/Button';

interface ReportHeaderProps {
  onRefresh: () => void;
  isLoading: boolean;
  isExporting: boolean;
  exportingType: 'excel' | 'pdf' | null;
  dateRangeLabel: string;
  activeTabLabel: string;
  onExportExcel: () => void;
  onExportPdf: () => void;
}

export const ReportHeader: React.FC<ReportHeaderProps> = ({
  onRefresh,
  isLoading,
  isExporting,
  exportingType,
  dateRangeLabel,
  activeTabLabel,
  onExportExcel,
  onExportPdf,
}) => {
  return (
    <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
      <div>
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FFF7ED] text-[#EA580C] border border-orange-200">
            <FileText className="w-3.5 h-3.5 text-[#F97316]" />
            Laporan Kehadiran Resmi
          </span>
          <span className="inline-flex items-center gap-1 text-xs text-[#6B7280]">
            <Calendar className="w-3.5 h-3.5 text-[#9CA3AF]" />
            {dateRangeLabel}
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-[#111827] bg-gray-100 px-2 py-0.5 rounded-md">
            Tab: {activeTabLabel}
          </span>
        </div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#111827] tracking-tight">
          Rekap dan Laporan Presensi
        </h1>
        <p className="text-xs sm:text-sm text-[#6B7280] mt-0.5">
          Rekapitulasi data kehadiran pegawai sekolah
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isLoading || isExporting}
          leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />}
        >
          Muat Ulang
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={onExportExcel}
          disabled={isLoading || isExporting}
          isLoading={isExporting && exportingType === 'excel'}
          leftIcon={<FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />}
          className="border border-emerald-200 hover:bg-emerald-50 text-emerald-800 font-semibold"
        >
          Export Excel
        </Button>

        <Button
          variant="secondary"
          size="sm"
          onClick={onExportPdf}
          disabled={isLoading || isExporting}
          isLoading={isExporting && exportingType === 'pdf'}
          leftIcon={<Download className="w-3.5 h-3.5 text-rose-600" />}
          className="border border-rose-200 hover:bg-rose-50 text-rose-800 font-semibold"
        >
          Export PDF
        </Button>
      </div>
    </div>
  );
};
