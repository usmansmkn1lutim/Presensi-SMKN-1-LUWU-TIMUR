import React from 'react';
import {
  CircleCheck,
  ClockAlert,
  LogOut,
  AlertCircle,
  Users,
  Percent,
} from 'lucide-react';
import { OverallReportMetrics } from '../../types/attendanceReport.types';

interface ReportSummaryCardsProps {
  metrics: OverallReportMetrics | null;
  isLoading: boolean;
}

export const ReportSummaryCards: React.FC<ReportSummaryCardsProps> = ({
  metrics,
  isLoading,
}) => {
  if (isLoading || !metrics) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {[...Array(6)].map((_, i) => (
          <div
            key={i}
            className="bg-white border border-[#E5E7EB] rounded-2xl p-3.5 sm:p-4 animate-pulse shadow-2xs space-y-2"
          >
            <div className="h-3.5 bg-gray-100 rounded w-2/3" />
            <div className="h-6 bg-gray-200 rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      label: 'Total Hadir',
      value: metrics.totalAttendanceRecords,
      icon: Users,
      iconColor: 'text-blue-600',
      desc: 'Kehadiran tercatat',
    },
    {
      label: 'Tepat Waktu',
      value: metrics.totalOnTime,
      icon: CircleCheck,
      iconColor: 'text-emerald-600',
      desc: 'Sesuai jam kerja',
    },
    {
      label: 'Terlambat',
      value: metrics.totalLate,
      icon: ClockAlert,
      iconColor: 'text-amber-600',
      desc: 'Melewati batas masuk',
    },
    {
      label: 'Sudah Check-out',
      value: metrics.totalCheckedOut,
      icon: LogOut,
      iconColor: 'text-purple-600',
      desc: 'Selesai presensi pulang',
    },
    {
      label: 'Belum Check-out',
      value: metrics.totalNotCheckedOut,
      icon: AlertCircle,
      iconColor: 'text-rose-600',
      desc: 'Belum absen pulang',
    },
    {
      label: 'Tingkat Kehadiran',
      value: `${metrics.overallAttendancePercentage}%`,
      icon: Percent,
      iconColor: 'text-[#F97316]',
      desc: `${metrics.effectiveWorkingDays} hari kerja efektif`,
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
      {cards.map((c, idx) => {
        const Icon = c.icon;
        return (
          <div
            key={idx}
            className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-3.5 sm:p-4 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between gap-2"
          >
            {/* Baris Atas: Ikon berdampingan langsung dengan judul indikator */}
            <div className="flex items-center gap-1.5 min-w-0">
              <Icon className={`w-4 h-4 ${c.iconColor} shrink-0`} />
              <span className="text-[11px] sm:text-xs font-medium text-[#6B7280] truncate">
                {c.label}
              </span>
            </div>

            {/* Baris Bawah: Nilai statistik di bawah baris ikon dan judul */}
            <div>
              <div className="text-xl sm:text-2xl font-bold text-[#111827] tracking-tight tabular-nums">
                {c.value}
              </div>
              <p className="text-[10px] sm:text-[11px] text-[#9CA3AF] mt-0.5 truncate">
                {c.desc}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};
