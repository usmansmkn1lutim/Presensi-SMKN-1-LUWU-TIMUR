import React from 'react';
import { Users, UserCheck, CircleCheck, ClockAlert, UserRoundX, LogOut } from 'lucide-react';
import { MonitoringSummary } from '../../types/attendanceMonitoring.types';

interface MonitoringSummaryCardsProps {
  summary: MonitoringSummary | null;
  loading: boolean;
}

export const MonitoringSummaryCards: React.FC<MonitoringSummaryCardsProps> = ({
  summary,
  loading,
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-4 animate-pulse space-y-2 shadow-2xs"
          >
            <div className="h-3 bg-[#F3F4F6] rounded w-2/3" />
            <div className="h-6 bg-[#F3F4F6] rounded w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: 'Total Pegawai',
      value: summary?.totalEmployees || 0,
      icon: <Users className="w-4 h-4 text-[#111827] shrink-0" />,
    },
    {
      title: 'Sudah Presensi',
      value: summary?.presentCount || 0,
      icon: <UserCheck className="w-4 h-4 text-[#F97316] shrink-0" />,
    },
    {
      title: 'Tepat Waktu',
      value: summary?.onTimeCount || 0,
      icon: <CircleCheck className="w-4 h-4 text-emerald-600 shrink-0" />,
    },
    {
      title: 'Terlambat',
      value: summary?.lateCount || 0,
      icon: <ClockAlert className="w-4 h-4 text-amber-600 shrink-0" />,
    },
    {
      title: 'Belum Presensi',
      value: summary?.absentCount || 0,
      icon: <UserRoundX className="w-4 h-4 text-rose-600 shrink-0" />,
    },
    {
      title: 'Sudah Pulang',
      value: summary?.checkedOutCount || 0,
      icon: <LogOut className="w-4 h-4 text-blue-600 shrink-0" />,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-3.5 shadow-2xs flex flex-col justify-between gap-1.5"
        >
          <div className="flex items-center gap-1.5 min-w-0">
            {card.icon}
            <span className="text-[11px] text-[#6B7280] font-medium truncate">
              {card.title}
            </span>
          </div>
          <span className="text-xl font-bold text-[#111827] block tabular-nums">
            {card.value}
          </span>
        </div>
      ))}
    </div>
  );
};
