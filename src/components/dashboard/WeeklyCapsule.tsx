import React from 'react';
import { CheckCircle2, HeartPulse, FileText, Briefcase, Calendar, UserX } from 'lucide-react';

interface WeeklyCapsuleProps {
  loading: boolean;
  weeklySummary: {
    present: number;
    sick: number;
    permit: number;
    officialDuty: number;
    leave: number;
    absent: number;
  } | null;
}

export const WeeklyCapsule: React.FC<WeeklyCapsuleProps> = ({ loading, weeklySummary }) => {
  const weeklyItems = [
    { key: 'present', title: 'Hadir', value: weeklySummary?.present ?? 0, icon: <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#F97316]" /> },
    { key: 'sick', title: 'Sakit', value: weeklySummary?.sick ?? 0, icon: <HeartPulse className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#F97316]" /> },
    { key: 'permit', title: 'Izin', value: weeklySummary?.permit ?? 0, icon: <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#F97316]" /> },
    { key: 'official_duty', title: 'Dinas Luar', value: weeklySummary?.officialDuty ?? 0, icon: <Briefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#F97316]" /> },
    { key: 'leave', title: 'Cuti', value: weeklySummary?.leave ?? 0, icon: <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#F97316]" /> },
    { key: 'absent', title: 'Alpha', value: weeklySummary?.absent ?? 0, icon: <UserX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#F97316]" /> },
  ];

  return (
    <div className="space-y-2.5 sm:space-y-3 font-sans">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          REKAP PRESENSI MINGGU INI
        </h2>
        <span className="text-[11px] text-[#9CA3AF]">Senin s/d Hari Ini</span>
      </div>

      <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
        {weeklyItems.map((item) => (
          <div
            key={item.key}
            className="relative bg-white border border-[#E5E7EB] rounded-2xl p-3 sm:p-4 min-h-[96px] sm:min-h-[108px] shadow-2xs flex flex-col items-center justify-center text-center group"
          >
            <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#FFF7ED] border border-[#FFEDD5] flex items-center justify-center shrink-0">
              {item.icon}
            </div>

            <div className="flex flex-col items-center justify-center pt-2 sm:pt-2.5">
              <span className="text-2xl sm:text-3xl font-bold text-[#111827] tracking-tight tabular-nums leading-none">
                {loading ? (
                  <span className="animate-pulse inline-block w-6 h-6 bg-slate-200 rounded" />
                ) : (
                  item.value
                )}
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
