import React from 'react';
import { LogIn, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { WorkScheduleModel } from '../../types/workSchedule.types';
import { AttendanceModel, EvaluateCheckInResult } from '../../types/attendance.types';
import { Button } from '../ui/Button';

interface CheckInCardProps {
  schedule: WorkScheduleModel | null;
  todayAttendance: AttendanceModel | null;
  evalCheckIn: EvaluateCheckInResult;
  loading: boolean;
  submitting: boolean;
  disabled?: boolean;
  onCheckIn: () => void;
}

export const CheckInCard: React.FC<CheckInCardProps> = ({
  schedule,
  todayAttendance,
  evalCheckIn,
  loading,
  submitting,
  disabled = false,
  onCheckIn,
}) => {
  if (loading) {
    return (
      <div className="bg-[#FFFFFF] dark:bg-[#262626] border border-[#E5E7EB] dark:border-[#404040] rounded-2xl p-6 shadow-2xs animate-pulse space-y-4">
        <div className="h-4 bg-[#F3F4F6] dark:bg-[#303030] rounded w-1/3" />
        <div className="h-10 bg-[#F3F4F6] dark:bg-[#303030] rounded-xl" />
        <div className="h-10 bg-[#F3F4F6] dark:bg-[#303030] rounded-xl w-full" />
      </div>
    );
  }

  const hasCheckedIn = Boolean(todayAttendance?.check_in_at);
  const isButtonDisabled = loading || submitting || disabled || hasCheckedIn || !evalCheckIn.allowed;

  const getStatusDisplay = () => {
    if (hasCheckedIn) {
      return {
        text: 'Presensi masuk hari ini sudah tercatat.',
        style: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60',
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />,
      };
    }

    if (evalCheckIn.allowed) {
      if (evalCheckIn.status === 'on_time') {
        return {
          text: 'Check-in tersedia (Kategori Tepat Waktu)',
          style: 'text-[#EA580C] dark:text-orange-300 bg-[#FFF7ED] dark:bg-[#431F0B] border-[#FFEDD5] dark:border-[#9A3412]/60',
          icon: <Clock className="w-4 h-4 text-[#F97316] shrink-0" />,
        };
      }
      return {
        text: 'Check-in tersedia (Kategori Terlambat)',
        style: 'text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60',
        icon: <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />,
      };
    }

    return {
      text: evalCheckIn.reason || 'Check-in tidak tersedia saat ini.',
      style: 'text-[#6B7280] dark:text-[#A3A3A3] bg-[#F3F4F6] dark:bg-[#303030] border-[#E5E7EB] dark:border-[#404040]',
      icon: <AlertCircle className="w-4 h-4 text-[#9CA3AF] dark:text-[#737373] shrink-0" />,
    };
  };

  const statusDisplay = getStatusDisplay();

  const formatTime = (timeStr?: string | null) => {
    if (!timeStr) return '-';
    return timeStr.slice(0, 5);
  };

  return (
    <div className="bg-[#FFFFFF] dark:bg-[#262626] border border-[#E5E7EB] dark:border-[#404040] rounded-2xl p-5 sm:p-6 shadow-2xs space-y-5 flex flex-col justify-between">
      <div className="space-y-4">
        {/* Title */}
        <div className="flex items-center gap-3 pb-3 border-b border-[#E5E7EB] dark:border-[#404040]">
          <div className="w-10 h-10 rounded-xl bg-[#FFF7ED] dark:bg-[#431F0B] text-[#F97316] flex items-center justify-center shrink-0 border border-[#FFEDD5] dark:border-[#9A3412]/50">
            <LogIn className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Presensi Masuk</h3>
            <p className="text-xs text-[#6B7280] dark:text-[#A3A3A3]">Check-in kehadiran harian pegawai</p>
          </div>
        </div>

        {/* Schedule Info Window */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-[#F9FAFB] dark:bg-[#303030] border border-[#E5E7EB] dark:border-[#404040]">
            <span className="text-[#6B7280] dark:text-[#A3A3A3] block text-[11px]">Jendela Check-in</span>
            <span className="font-semibold text-[#111827] dark:text-[#F9FAFB] mt-0.5 block">
              {formatTime(schedule?.check_in_start_time)} – {formatTime(schedule?.check_in_end_time)}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-[#F9FAFB] dark:bg-[#303030] border border-[#E5E7EB] dark:border-[#404040]">
            <span className="text-[#6B7280] dark:text-[#A3A3A3] block text-[11px]">Tepat Waktu Sampai</span>
            <span className="font-semibold text-emerald-700 dark:text-emerald-400 mt-0.5 block">
              {formatTime(schedule?.check_in_on_time_end)}
            </span>
          </div>
        </div>

        {/* Status Message Banner */}
        <div
          className={`p-3 rounded-xl border flex items-center gap-2.5 text-xs font-medium ${statusDisplay.style}`}
        >
          {statusDisplay.icon}
          <span>{statusDisplay.text}</span>
        </div>
      </div>

      {/* Action Button */}
      <div className="pt-2">
        <Button
          onClick={onCheckIn}
          disabled={isButtonDisabled}
          isLoading={submitting}
          leftIcon={<LogIn className="w-4 h-4" />}
          className="w-full h-11 text-sm font-semibold rounded-xl transition-all"
        >
          {hasCheckedIn ? 'Sudah Check-in' : 'Check-in Sekarang'}
        </Button>
      </div>
    </div>
  );
};
