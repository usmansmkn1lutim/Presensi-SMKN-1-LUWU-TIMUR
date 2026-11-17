import React from 'react';

interface ReportHeaderProps {
  onRefresh?: () => void;
  isLoading?: boolean;
  isExporting?: boolean;
  dateRangeLabel?: string;
  activeTabLabel?: string;
}

export const ReportHeader: React.FC<ReportHeaderProps> = () => {
  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-bold text-[#111827] tracking-tight">
        Rekap dan Laporan Presensi
      </h1>
    </div>
  );
};
