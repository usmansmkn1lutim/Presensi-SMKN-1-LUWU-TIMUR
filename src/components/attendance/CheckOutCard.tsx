import React from 'react';
import { LogOut, Clock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { WorkScheduleModel } from '../../types/workSchedule.types';
import { AttendanceModel, EvaluateCheckOutResult } from '../../types/attendance.types';
import { Button } from '../ui/Button';

interface CheckOutCardProps {
  schedule: WorkScheduleModel | null;
  todayAttendance: AttendanceModel | null;
  evalCheckOut: EvaluateCheckOutResult;
  loading: boolean;
  submitting: boolean;
  onCheckOut: () => void;
}

export const CheckOutCard: React.FC<CheckOutCardProps> = ({
  schedule,
  todayAttendance,
  evalCheckOut,
  loading,
  submitting,
  onCheckOut,
}) => {
  if (loading) {
    return (
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-6 shadow-2xs animate-pulse space-y-4">
        <div className="h-4 bg-[#F3F4F6] rounded w-1/3" />
        <div className="h-10 bg-[#F3F4F6] rounded-xl" />
        <div className="h-10 bg-[#F3F4F6] rounded-xl w-full" />
      </div>
    );
  }

  const hasCheckedIn = Boolean(todayAttendance?.check_in_at);
  const hasCheckedOut = Boolean(todayAttendance?.check_out_at);
  const isButtonDisabled = loading || submitting || !hasCheckedIn || hasCheckedOut || !evalCheckOut.allowed;

  const getStatusDisplay = () => {
    if (!hasCheckedIn) {
      return {
        text: 'Anda belum melakukan presensi masuk hari ini.',
        style: 'text-[#6B7280] bg-[#F3F4F6] border-[#E5E7EB]',
        icon: <AlertCircle className="w-4 h-4 text-[#9CA3AF] shrink-0" />,
      };
    }

    if (hasCheckedOut) {
      return {
        text: 'Presensi pulang hari ini sudah tercatat.',
        style: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />,
      };
    }

    if (evalCheckOut.allowed) {
      if (evalCheckOut.status === 'operational') {
        return {
          text: 'Check-out tersedia (Kepulangan Operasional)',
          style: 'text-blue-800 bg-blue-50 border-blue-200',
          icon: <Clock className="w-4 h-4 text-blue-600 shrink-0" />,
        };
      }
      return {
        text: 'Check-out tersedia (Setelah Jam Kerja)',
        style: 'text-emerald-800 bg-emerald-50 border-emerald-200',
        icon: <Clock className="w-4 h-4 text-emerald-600 shrink-0" />,
      };
    }

    return {
      text: evalCheckOut.reason || 'Check-out tidak tersedia saat ini.',
      style: 'text-[#6B7280] bg-[#F3F4F6] border-[#E5E7EB]',
      icon: <AlertCircle className="w-4 h-4 text-[#9CA3AF] shrink-0" />,
    };
  };

  const statusDisplay = getStatusDisplay();

  const formatTime = (timeStr?: string | null) => {
    if (!timeStr) return '-';
    return timeStr.slice(0, 5);
  };

  return (
    <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 shadow-2xs space-y-5 flex flex-col justify-between">
      <div className="space-y-4">
        {/* Title */}
        <div className="flex items-center gap-3 pb-3 border-b border-[#E5E7EB]">
          <div className="w-10 h-10 rounded-xl bg-[#FFF7ED] text-[#F97316] flex items-center justify-center shrink-0 border border-[#FFEDD5]">
            <LogOut className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#111827]">Presensi Pulang</h3>
            <p className="text-xs text-[#6B7280]">Check-out kepulangan pegawai</p>
          </div>
        </div>

        {/* Schedule Info Window */}
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]">
            <span className="text-[#6B7280] block text-[11px]">Jam Operasional</span>
            <span className="font-semibold text-blue-700 mt-0.5 block">
              {formatTime(schedule?.check_out_start_time || schedule?.operational_end_time)} – {formatTime(schedule?.work_end_time)}
            </span>
          </div>
          <div className="p-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]">
            <span className="text-[#6B7280] block text-[11px]">Batas Akhir Pulang</span>
            <span className="font-semibold text-[#111827] mt-0.5 block">
              {formatTime(schedule?.check_out_end_time)}
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
          onClick={onCheckOut}
          disabled={isButtonDisabled}
          isLoading={submitting}
          className="w-full h-11 text-sm font-semibold rounded-xl transition-all"
        >
          <LogOut className="w-4 h-4 mr-2" />
          {hasCheckedOut ? 'Sudah Check-out' : 'Check-out Sekarang'}
        </Button>
      </div>
    </div>
  );
};
