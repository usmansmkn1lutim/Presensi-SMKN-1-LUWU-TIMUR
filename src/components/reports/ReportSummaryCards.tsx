import React from 'react';
import {
  CheckCircle2,
  Clock,
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
            className="bg-white border border-[#E5E7EB] rounded-2xl p-4 animate-pulse shadow-2xs space-y-2"
          >
            <div className="w-8 h-8 rounded-xl bg-gray-100" />
            <div className="h-4 bg-gray-100 rounded w-16" />
            <div className="h-6 bg-gray-200 rounded w-12" />
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
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      borderColor: 'border-blue-100',
      desc: 'Kehadiran tercatat',
    },
    {
      label: 'Tepat Waktu',
      value: metrics.totalOnTime,
      icon: CheckCircle2,
      bgColor: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      borderColor: 'border-emerald-100',
      desc: 'Sesuai jam kerja',
    },
    {
      label: 'Terlambat',
      value: metrics.totalLate,
      icon: Clock,
      bgColor: 'bg-amber-50',
      iconColor: 'text-amber-600',
      borderColor: 'border-amber-100',
      desc: 'Melewati batas masuk',
    },
    {
      label: 'Sudah Check-out',
      value: metrics.totalCheckedOut,
      icon: LogOut,
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
      borderColor: 'border-purple-100',
      desc: 'Selesai presensi pulang',
    },
    {
      label: 'Belum Check-out',
      value: metrics.totalNotCheckedOut,
      icon: AlertCircle,
      bgColor: 'bg-rose-50',
      iconColor: 'text-rose-600',
      borderColor: 'border-rose-100',
      desc: 'Belum absen pulang',
    },
    {
      label: 'Tingkat Kehadiran',
      value: `${metrics.overallAttendancePercentage}%`,
      icon: Percent,
      bgColor: 'bg-orange-50',
      iconColor: 'text-[#F97316]',
      borderColor: 'border-orange-100',
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
            className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-4 sm:p-4.5 shadow-2xs hover:shadow-xs transition-shadow flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] sm:text-xs font-medium text-[#6B7280]">
                {c.label}
              </span>
              <div className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl ${c.bgColor} flex items-center justify-center shrink-0`}>
                <Icon className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${c.iconColor}`} />
              </div>
            </div>
            <div>
              <div className="text-xl sm:text-2xl font-bold text-[#111827] tracking-tight">
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
