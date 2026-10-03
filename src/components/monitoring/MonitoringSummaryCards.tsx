import React from 'react';
import { Users, UserCheck, Clock, AlertTriangle, UserX, LogOut } from 'lucide-react';
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
      icon: <Users className="w-4 h-4 text-[#111827]" />,
      bgIcon: 'bg-[#F3F4F6] text-[#111827] border-[#E5E7EB]',
    },
    {
      title: 'Sudah Presensi',
      value: summary?.presentCount || 0,
      icon: <UserCheck className="w-4 h-4 text-[#F97316]" />,
      bgIcon: 'bg-[#FFF7ED] text-[#F97316] border-[#FFEDD5]',
    },
    {
      title: 'Tepat Waktu',
      value: summary?.onTimeCount || 0,
      icon: <Clock className="w-4 h-4 text-emerald-600" />,
      bgIcon: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    },
    {
      title: 'Terlambat',
      value: summary?.lateCount || 0,
      icon: <AlertTriangle className="w-4 h-4 text-amber-600" />,
      bgIcon: 'bg-amber-50 text-amber-600 border-amber-200',
    },
    {
      title: 'Belum Presensi',
      value: summary?.absentCount || 0,
      icon: <UserX className="w-4 h-4 text-rose-600" />,
      bgIcon: 'bg-rose-50 text-rose-600 border-rose-200',
    },
    {
      title: 'Sudah Pulang',
      value: summary?.checkedOutCount || 0,
      icon: <LogOut className="w-4 h-4 text-blue-600" />,
      bgIcon: 'bg-blue-50 text-blue-600 border-blue-200',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-3.5 shadow-2xs flex items-center justify-between"
        >
          <div>
            <span className="text-[11px] text-[#6B7280] block font-medium">
              {card.title}
            </span>
            <span className="text-xl font-bold text-[#111827] mt-0.5 block">
              {card.value}
            </span>
          </div>
          <div
            className={`w-8 h-8 rounded-xl border flex items-center justify-center shrink-0 ${card.bgIcon}`}
          >
            {card.icon}
          </div>
        </div>
      ))}
    </div>
  );
};
