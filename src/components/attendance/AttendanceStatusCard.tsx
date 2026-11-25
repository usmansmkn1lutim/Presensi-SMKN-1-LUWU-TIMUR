import React from 'react';
import { Clock, CheckCircle2, AlertCircle, LogIn, LogOut, User } from 'lucide-react';
import { AttendanceModel } from '../../types/attendance.types';
import { EmployeeRow } from '../../types/database.types';

interface AttendanceStatusCardProps {
  todayAttendance: AttendanceModel | null;
  employee: EmployeeRow | null;
  loading: boolean;
}

export const AttendanceStatusCard: React.FC<AttendanceStatusCardProps> = ({
  todayAttendance,
  employee,
  loading,
}) => {
  if (loading) {
    return (
      <div className="bg-[#FFFFFF] dark:bg-[#262626] border border-[#E5E7EB] dark:border-[#404040] rounded-2xl p-6 shadow-2xs animate-pulse space-y-4">
        <div className="h-4 bg-[#F3F4F6] dark:bg-[#303030] rounded w-1/4" />
        <div className="h-8 bg-[#F3F4F6] dark:bg-[#303030] rounded w-1/2" />
        <div className="grid grid-cols-2 gap-4 pt-2">
          <div className="h-16 bg-[#F3F4F6] dark:bg-[#303030] rounded-xl" />
          <div className="h-16 bg-[#F3F4F6] dark:bg-[#303030] rounded-xl" />
        </div>
      </div>
    );
  }

  const hasCheckIn = Boolean(todayAttendance?.check_in_at);
  const hasCheckOut = Boolean(todayAttendance?.check_out_at);

  const formatTime = (isoString?: string | null) => {
    if (!isoString) return '-';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    } catch {
      return '-';
    }
  };

  const getStatusBadge = () => {
    if (!hasCheckIn) {
      return {
        label: 'Belum Presensi',
        bg: 'bg-[#F3F4F6] dark:bg-[#303030]',
        border: 'border-[#E5E7EB] dark:border-[#404040]',
        text: 'text-[#6B7280] dark:text-[#A3A3A3]',
        dot: 'bg-[#9CA3AF] dark:bg-[#737373]',
      };
    }
    if (hasCheckIn && !hasCheckOut) {
      return {
        label: 'Sudah Check-in',
        bg: 'bg-[#FFF7ED] dark:bg-[#431F0B]',
        border: 'border-[#FFEDD5] dark:border-[#9A3412]/60',
        text: 'text-[#EA580C] dark:text-orange-400',
        dot: 'bg-[#F97316]',
      };
    }
    return {
      label: 'Sudah Check-out',
      bg: 'bg-emerald-50 dark:bg-emerald-950/40',
      border: 'border-emerald-200 dark:border-emerald-800/60',
      text: 'text-emerald-700 dark:text-emerald-400',
      dot: 'bg-emerald-500',
    };
  };

  const badge = getStatusBadge();

  return (
    <div className="bg-[#FFFFFF] dark:bg-[#262626] border border-[#E5E7EB] dark:border-[#404040] rounded-2xl p-5 sm:p-6 shadow-2xs space-y-5">
      {/* Top Banner & Employee Info */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E5E7EB] dark:border-[#404040]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#FFF7ED] dark:bg-[#431F0B] text-[#F97316] flex items-center justify-center shrink-0 border border-[#FFEDD5] dark:border-[#9A3412]/50">
            <User className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#111827] dark:text-[#F9FAFB]">
              {employee?.full_name || 'Pegawai Sekolah'}
            </h3>
            <p className="text-xs text-[#6B7280] dark:text-[#A3A3A3]">
              NIP: {employee?.nip || '-'} · NIK: {employee?.nik || '-'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold ${badge.bg} ${badge.border} ${badge.text}`}
          >
            <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
            {badge.label}
          </span>
        </div>
      </div>

      {/* Grid Summary for Check-in & Check-out */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Check-in Summary */}
        <div className="p-4 rounded-xl bg-[#F9FAFB] dark:bg-[#303030] border border-[#E5E7EB] dark:border-[#404040] space-y-2">
          <div className="flex items-center justify-between text-xs text-[#6B7280] dark:text-[#A3A3A3]">
            <span className="flex items-center gap-1.5 font-medium">
              <LogIn className="w-4 h-4 text-[#F97316]" />
              Presensi Masuk
            </span>
            {hasCheckIn && (
              <span
                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                  todayAttendance?.check_in_status === 'on_time'
                    ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                    : 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300'
                }`}
              >
                {todayAttendance?.check_in_status === 'on_time' ? 'Tepat Waktu' : 'Terlambat'}
              </span>
            )}
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-bold text-[#111827] dark:text-[#F9FAFB]">
              {formatTime(todayAttendance?.check_in_at)}
            </span>
            <span className="text-xs text-[#9CA3AF] dark:text-[#737373]">
              {hasCheckIn ? 'Waktu Tercatat' : 'Belum Check-in'}
            </span>
          </div>
        </div>

        {/* Check-out Summary */}
        <div className="p-4 rounded-xl bg-[#F9FAFB] dark:bg-[#303030] border border-[#E5E7EB] dark:border-[#404040] space-y-2">
          <div className="flex items-center justify-between text-xs text-[#6B7280] dark:text-[#A3A3A3]">
            <span className="flex items-center gap-1.5 font-medium">
              <LogOut className="w-4 h-4 text-[#F97316]" />
              Presensi Pulang
            </span>
            {hasCheckOut && (
              <span
                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                  todayAttendance?.check_out_status === 'operational'
                    ? 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300'
                    : 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300'
                }`}
              >
                {todayAttendance?.check_out_status === 'operational'
                  ? 'Jam Operasional'
                  : 'Setelah Jam Kerja'}
              </span>
            )}
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl sm:text-2xl font-bold text-[#111827] dark:text-[#F9FAFB]">
              {formatTime(todayAttendance?.check_out_at)}
            </span>
            <span className="text-xs text-[#9CA3AF] dark:text-[#737373]">
              {hasCheckOut ? 'Waktu Tercatat' : 'Belum Check-out'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
