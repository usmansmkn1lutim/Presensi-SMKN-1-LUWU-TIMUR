import React from 'react';
import {
  CheckCircle2,
  HeartPulse,
  FileText,
  Briefcase,
  Calendar,
  UserX,
} from 'lucide-react';
import { OfficialMonthlyRecapSummary } from '../../types/attendanceHistory.types';

interface HistoryMonthlyRecapMobileProps {
  summary: OfficialMonthlyRecapSummary | null;
  loading: boolean;
}

export const HistoryMonthlyRecapMobile: React.FC<HistoryMonthlyRecapMobileProps> = ({
  summary,
  loading,
}) => {
  if (loading) {
    return (
      <div className="space-y-2.5 sm:space-y-3 font-sans">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          REKAP KEHADIRAN BULAN INI
        </h3>
        <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="relative bg-white border border-[#E5E7EB] rounded-2xl p-3 sm:p-4 min-h-[96px] sm:min-h-[108px] shadow-2xs animate-pulse flex flex-col items-center justify-center"
            >
              <div className="absolute top-2.5 right-2.5 w-6 h-6 rounded-lg bg-gray-200" />
              <div className="h-7 bg-gray-200 rounded w-10 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-14" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Row 1: Hadir | Sakit | Izin
  // Row 2: Dinas Luar | Cuti | Alpha
  // Exact 3 x 2 order MUST be preserved.
  // ALL icons strictly use Orange Sunset design system color (#F97316).
  const items = [
    {
      key: 'present',
      title: 'Hadir',
      value: summary?.present ?? 0,
      icon: <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#F97316]" />,
    },
    {
      key: 'sick',
      title: 'Sakit',
      value: summary?.sick ?? 0,
      icon: <HeartPulse className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#F97316]" />,
    },
    {
      key: 'permit',
      title: 'Izin',
      value: summary?.permit ?? 0,
      icon: <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#F97316]" />,
    },
    {
      key: 'official_duty',
      title: 'Dinas Luar',
      value: summary?.officialDuty ?? 0,
      icon: <Briefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#F97316]" />,
    },
    {
      key: 'leave',
      title: 'Cuti',
      value: summary?.leave ?? 0,
      icon: <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#F97316]" />,
    },
    {
      key: 'absent',
      title: 'Alpha',
      value: summary?.absent ?? 0,
      icon: <UserX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#F97316]" />,
    },
  ];

  return (
    <div className="space-y-2.5 sm:space-y-3 font-sans">
      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
        REKAP KEHADIRAN BULAN INI
      </h3>
      <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
        {items.map((item) => (
          <div
            key={item.key}
            className="relative bg-white border border-[#E5E7EB] rounded-2xl p-3 sm:p-4 min-h-[96px] sm:min-h-[108px] shadow-2xs flex flex-col items-center justify-center text-center hover:border-slate-300 transition-colors group"
          >
            {/* 1. Icon = pojok kanan atas */}
            <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#FFF7ED] border border-[#FFEDD5] flex items-center justify-center shrink-0">
              {item.icon}
            </div>

            {/* 2. Angka = center secara horizontal & 3. Label = center di bawah angka */}
            <div className="flex flex-col items-center justify-center pt-2 sm:pt-2.5">
              <span className="text-2xl sm:text-3xl font-bold text-[#111827] tracking-tight tabular-nums leading-none">
                {item.value}
              </span>
              <span className="text-xs sm:text-sm font-semibold text-[#6B7280] mt-1.5 leading-none">
                {item.title}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
