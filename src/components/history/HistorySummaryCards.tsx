import React from 'react';
import { Calendar, CheckCircle2, Clock, LogOut } from 'lucide-react';
import { AttendanceHistorySummary } from '../../types/attendanceHistory.types';

interface HistorySummaryCardsProps {
  summary: AttendanceHistorySummary | null;
  loading: boolean;
}

export const HistorySummaryCards: React.FC<HistorySummaryCardsProps> = ({
  summary,
  loading,
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-4 animate-pulse space-y-2 shadow-2xs"
          >
            <div className="h-3 bg-[#F3F4F6] rounded w-2/3" />
            <div className="h-7 bg-[#F3F4F6] rounded w-1/3" />
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: 'Total Presensi',
      value: summary?.totalAttendance || 0,
      icon: <Calendar className="w-5 h-5 text-[#F97316]" />,
      bgIcon: 'bg-[#FFF7ED] text-[#F97316] border-[#FFEDD5]',
    },
    {
      title: 'Tepat Waktu',
      value: summary?.onTimeCount || 0,
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />,
      bgIcon: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    },
    {
      title: 'Terlambat',
      value: summary?.lateCount || 0,
      icon: <Clock className="w-5 h-5 text-amber-600" />,
      bgIcon: 'bg-amber-50 text-amber-600 border-amber-200',
    },
    {
      title: 'Sudah Check-out',
      value: summary?.checkedOutCount || 0,
      icon: <LogOut className="w-5 h-5 text-blue-600" />,
      bgIcon: 'bg-blue-50 text-blue-600 border-blue-200',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
      {cards.map((card, idx) => (
        <div
          key={idx}
          className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-4 shadow-2xs flex items-center justify-between"
        >
          <div>
            <span className="text-xs text-[#6B7280] block font-medium">{card.title}</span>
            <span className="text-2xl font-bold text-[#111827] mt-1 block">
              {card.value}
            </span>
          </div>
          <div
            className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${card.bgIcon}`}
          >
            {card.icon}
          </div>
        </div>
      ))}
    </div>
  );
};
