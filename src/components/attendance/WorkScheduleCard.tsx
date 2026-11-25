import React from 'react';
import { Calendar, Clock, Info } from 'lucide-react';
import { WorkScheduleModel } from '../../types/workSchedule.types';

interface WorkScheduleCardProps {
  schedule: WorkScheduleModel | null;
  loading: boolean;
}

export const WorkScheduleCard: React.FC<WorkScheduleCardProps> = ({
  schedule,
  loading,
}) => {
  if (loading) {
    return (
      <div className="bg-[#FFFFFF] dark:bg-[#262626] border border-[#E5E7EB] dark:border-[#404040] rounded-2xl p-6 shadow-2xs animate-pulse space-y-4">
        <div className="h-4 bg-[#F3F4F6] dark:bg-[#303030] rounded w-1/3" />
        <div className="grid grid-cols-2 gap-3">
          <div className="h-12 bg-[#F3F4F6] dark:bg-[#303030] rounded-xl" />
          <div className="h-12 bg-[#F3F4F6] dark:bg-[#303030] rounded-xl" />
        </div>
      </div>
    );
  }

  const formatTime = (timeStr?: string | null) => {
    if (!timeStr) return '-';
    return timeStr.slice(0, 5);
  };

  if (!schedule) {
    return (
      <div className="bg-[#FFFFFF] dark:bg-[#262626] border border-[#E5E7EB] dark:border-[#404040] rounded-2xl p-5 sm:p-6 shadow-2xs space-y-3">
        <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 text-xs font-semibold">
          <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span>Jadwal kerja aktif belum dikonfigurasi.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#FFFFFF] dark:bg-[#262626] border border-[#E5E7EB] dark:border-[#404040] rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
      <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] dark:border-[#404040]">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-[#F3F4F6] dark:bg-[#303030] text-[#111827] dark:text-[#F9FAFB] flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4 text-[#F97316]" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#111827] dark:text-[#F9FAFB]">{schedule.name}</h4>
            <p className="text-[11px] text-[#6B7280] dark:text-[#A3A3A3]">Hari Kerja: Senin – Jumat</p>
          </div>
        </div>
        <span className="inline-flex items-center px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 text-[11px] font-semibold border border-emerald-200 dark:border-emerald-800/60">
          Aktif
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-[#F9FAFB] dark:bg-[#303030] border border-[#E5E7EB] dark:border-[#404040]">
          <span className="text-[#6B7280] dark:text-[#A3A3A3] block text-[11px]">Check-in</span>
          <span className="font-semibold text-[#111827] dark:text-[#F9FAFB] mt-0.5 block">
            {formatTime(schedule.check_in_start_time)} – {formatTime(schedule.check_in_end_time)}
          </span>
        </div>
        <div className="p-3 rounded-xl bg-[#F9FAFB] dark:bg-[#303030] border border-[#E5E7EB] dark:border-[#404040]">
          <span className="text-[#6B7280] dark:text-[#A3A3A3] block text-[11px]">Tepat Waktu</span>
          <span className="font-semibold text-emerald-700 dark:text-emerald-400 mt-0.5 block">
            Sampai {formatTime(schedule.check_in_on_time_end)}
          </span>
        </div>
        <div className="p-3 rounded-xl bg-[#F9FAFB] dark:bg-[#303030] border border-[#E5E7EB] dark:border-[#404040]">
          <span className="text-[#6B7280] dark:text-[#A3A3A3] block text-[11px]">Jam Kerja Resmi</span>
          <span className="font-semibold text-[#111827] dark:text-[#F9FAFB] mt-0.5 block">
            {formatTime(schedule.work_start_time)} – {formatTime(schedule.work_end_time)}
          </span>
        </div>
        <div className="p-3 rounded-xl bg-[#F9FAFB] dark:bg-[#303030] border border-[#E5E7EB] dark:border-[#404040]">
          <span className="text-[#6B7280] dark:text-[#A3A3A3] block text-[11px]">Kepulangan Operasional</span>
          <span className="font-semibold text-blue-700 dark:text-blue-400 mt-0.5 block">
            Mulai {formatTime(schedule.operational_end_time)}
          </span>
        </div>
      </div>
    </div>
  );
};
