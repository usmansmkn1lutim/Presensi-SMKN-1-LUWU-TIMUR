import React from 'react';
import {
  Users,
  CircleCheck,
  ClockAlert,
  BriefcaseBusiness,
  Thermometer,
  FileCheck,
  CalendarDays,
  UserRoundX,
  MapPin,
  Calendar,
} from 'lucide-react';
import { ExecutiveSummary } from '../../services/dashboardExecutiveService';
import { formatMakassarTime } from '../../services/attendanceReportService';

export interface ExecutiveStatCardsProps {
  summary: ExecutiveSummary | null;
  loading?: boolean;
  role?: string;
  schoolName?: string;
  currentDateFormatted?: string;
  todayDisplayStatus?: string;
  displayCheckInTime?: string;
  displayCheckOutTime?: string;
  dateLabel?: string;
  lastUpdated?: string;
  presentWithDutyCount?: number;
  checkInOnTimeEnd?: string;
}

interface StatCardConfig {
  key: string;
  label: string;
  value: number;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  iconBorder: string;
  helperText?: string;
}

export const ExecutiveStatCards: React.FC<ExecutiveStatCardsProps> = ({
  summary,
  loading = false,
  role,
  schoolName = 'SMK Negeri 1 Luwu Timur',
  currentDateFormatted = '',
  todayDisplayStatus = 'Belum presensi',
  displayCheckInTime = '--:-- WITA',
  displayCheckOutTime = '--:-- WITA',
  dateLabel,
  lastUpdated,
  presentWithDutyCount,
  checkInOnTimeEnd,
}) => {
  const isAdminOrSuperAdmin = role === 'admin' || role === 'super_admin';

  if (loading) {
    const mobileSkeletonCount = role === 'headmaster' ? 8 : 8;
    return (
      <div aria-busy="true" aria-label="Memuat statistik ringkasan eksekutif">
        {/* Mobile/Tablet Carousel Skeleton (< lg) */}
        <div className="lg:hidden flex overflow-x-auto snap-x snap-mandatory gap-3.5 sm:gap-4 pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {role === 'headmaster' && (
            <div className="bg-white dark:bg-[#262626] border border-[#E5E7EB] dark:border-[#404040] rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3.5 w-full flex-none snap-start min-h-[240px] sm:min-h-[244px] flex flex-col justify-between animate-pulse">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2.5 border-b border-[#F3F4F6] dark:border-[#303030]">
                <div className="h-5 bg-[#E5E7EB] dark:bg-[#404040] rounded w-44" />
                <div className="h-3.5 bg-[#F3F4F6] dark:bg-[#303030] rounded w-28" />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="h-3.5 bg-[#F3F4F6] dark:bg-[#303030] rounded w-28" />
                  <div className="h-3.5 bg-[#F3F4F6] dark:bg-[#303030] rounded w-32" />
                </div>
                <div className="h-5 bg-[#E5E7EB] dark:bg-[#404040] rounded w-40" />
              </div>
              <div className="bg-[#F9FAFB] dark:bg-[#303030] rounded-xl py-3 px-4 border border-[#F3F4F6] dark:border-[#404040]">
                <div className="grid grid-cols-2 divide-x divide-[#E5E7EB] dark:divide-[#404040]">
                  <div className="flex flex-col items-center gap-1.5 px-2">
                    <div className="h-3 bg-[#E5E7EB] dark:bg-[#404040] rounded w-14" />
                    <div className="h-4 bg-[#D1D5DB] dark:bg-[#525252] rounded w-20" />
                  </div>
                  <div className="flex flex-col items-center gap-1.5 px-2">
                    <div className="h-3 bg-[#E5E7EB] dark:bg-[#404040] rounded w-14" />
                    <div className="h-4 bg-[#D1D5DB] dark:bg-[#525252] rounded w-20" />
                  </div>
                </div>
              </div>
            </div>
          )}
          {isAdminOrSuperAdmin && (
            <div className="bg-white dark:bg-[#262626] border border-[#E5E7EB] dark:border-[#404040] rounded-2xl p-4 sm:p-5 shadow-2xs w-full flex-none snap-start min-h-[240px] sm:min-h-[244px] flex flex-col justify-between animate-pulse">
              <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#F3F4F6] dark:border-[#303030]">
                <div className="h-4 bg-[#E5E7EB] dark:bg-[#404040] rounded w-28" />
                <div className="h-5 bg-[#F3F4F6] dark:bg-[#303030] rounded-md w-20" />
              </div>
              <div className="space-y-3 py-2">
                <div className="h-4 bg-[#F3F4F6] dark:bg-[#303030] rounded w-32" />
                <div className="h-8 bg-[#E5E7EB] dark:bg-[#404040] rounded w-44" />
                <div className="h-2.5 bg-[#F3F4F6] dark:bg-[#303030] rounded-full w-full" />
              </div>
              <div className="pt-2.5 border-t border-[#F3F4F6] dark:border-[#303030]">
                <div className="h-3.5 bg-[#F3F4F6] dark:bg-[#303030] rounded w-52" />
              </div>
            </div>
          )}
          {Array.from({ length: mobileSkeletonCount }).map((_, idx) => (
            <div
              key={idx}
              className="bg-white dark:bg-[#262626] border border-[#E5E7EB] dark:border-[#404040] rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between w-full flex-none snap-start min-h-[240px] sm:min-h-[244px] animate-pulse"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded-md bg-[#F3F4F6] dark:bg-[#303030] shrink-0" />
                <div className="h-4 bg-[#F3F4F6] dark:bg-[#303030] rounded w-28" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <div className="h-8 bg-[#E5E7EB] dark:bg-[#404040] rounded w-14" />
                <div className="h-3.5 bg-[#F3F4F6] dark:bg-[#303030] rounded w-8" />
              </div>
            </div>
          ))}
        </div>

        {/* Desktop 4-Column Grid Skeleton (>= lg) */}
        <div className="hidden lg:grid grid-cols-4 gap-4">
          {[1, 2].map((idx) => (
            <div
              key={`primary-skeleton-${idx}`}
              className="bg-white dark:bg-[#262626] border border-[#E5E7EB] dark:border-[#404040] rounded-2xl p-5 shadow-2xs flex flex-col justify-between h-[136px] animate-pulse"
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-5 h-5 rounded-md bg-[#F3F4F6] dark:bg-[#303030] shrink-0" />
                <div className="h-4 bg-[#F3F4F6] dark:bg-[#303030] rounded w-28" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <div className="h-8 bg-[#E5E7EB] dark:bg-[#404040] rounded w-14" />
                <div className="h-3.5 bg-[#F3F4F6] dark:bg-[#303030] rounded w-8" />
              </div>
            </div>
          ))}
          {[1, 2].map((colIdx) => (
            <div
              key={`combined-skeleton-${colIdx}`}
              className="bg-white dark:bg-[#262626] border border-[#E5E7EB] dark:border-[#404040] rounded-2xl shadow-2xs p-3 flex flex-col justify-between gap-2 animate-pulse"
            >
              {[1, 2, 3].map((rowIdx) => (
                <div
                  key={rowIdx}
                  className="flex items-center justify-between py-1 border-b last:border-b-0 border-[#F3F4F6] dark:border-[#303030] last:pb-0"
                >
                  <div className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 rounded bg-[#F3F4F6] dark:bg-[#303030]" />
                    <div className="h-3 bg-[#F3F4F6] dark:bg-[#303030] rounded w-20" />
                  </div>
                  <div className="h-4 bg-[#E5E7EB] dark:bg-[#404040] rounded w-6" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  const isWeekend = summary?.isWeekendToday ?? false;
  const isHoliday = summary?.isHolidayToday ?? false;
  const isNonWorkingDay = isWeekend || isHoliday;

  // Teks pembantu dinamis berdasarkan kalender operasional hari berjalan
  const absentHelper = isNonWorkingDay
    ? summary?.holidayNameToday
      ? `Hari Libur: ${summary.holidayNameToday}`
      : 'Hari libur / akhir pekan'
    : 'Belum presensi / tanpa keterangan';

  const cards: StatCardConfig[] = [
    {
      key: 'total_gtk',
      label: 'Total GTK Aktif',
      value: summary?.totalActiveGtk ?? 0,
      icon: Users,
      iconBg: 'bg-[var(--color-status-total-bg)]',
      iconColor: 'text-[var(--color-status-total)]',
      iconBorder: 'border-[var(--color-status-total-bg)]',
      helperText: 'Pendidik & tenaga kependidikan',
    },
    {
      key: 'on_time',
      label: 'Hadir Tepat Waktu',
      value: summary?.onTimeToday ?? 0,
      icon: CircleCheck,
      iconBg: 'bg-[var(--color-status-present-bg)]',
      iconColor: 'text-[var(--color-status-present)]',
      iconBorder: 'border-[var(--color-status-present-bg)]',
      helperText:
        summary && summary.presentToday > 0
          ? `${summary.onTimeRate}% dari total hadir`
          : 'Presensi masuk tepat waktu',
    },
    {
      key: 'late',
      label: 'Terlambat',
      value: summary?.lateToday ?? 0,
      icon: ClockAlert,
      iconBg: 'bg-[var(--color-status-late-bg)]',
      iconColor: 'text-[var(--color-status-late)]',
      iconBorder: 'border-[var(--color-status-late-bg)]',
      helperText: 'Melewati toleransi jam masuk',
    },
    {
      key: 'official_duty',
      label: 'Dinas Luar',
      value: summary?.officialDutyToday ?? 0,
      icon: BriefcaseBusiness,
      iconBg: 'bg-[var(--color-status-official-duty-bg)]',
      iconColor: 'text-[var(--color-status-official-duty)]',
      iconBorder: 'border-[var(--color-status-official-duty-bg)]',
      helperText: 'Tugas kedinasan luar kantor',
    },
    {
      key: 'sick',
      label: 'Sakit',
      value: summary?.sickToday ?? 0,
      icon: Thermometer,
      iconBg: 'bg-[var(--color-status-sick-bg)]',
      iconColor: 'text-[var(--color-status-sick)]',
      iconBorder: 'border-[var(--color-status-sick-bg)]',
      helperText: 'Surat keterangan sakit',
    },
    {
      key: 'permission',
      label: 'Izin',
      value: summary?.permissionToday ?? 0,
      icon: FileCheck,
      iconBg: 'bg-[var(--color-status-permission-bg)]',
      iconColor: 'text-[var(--color-status-permission)]',
      iconBorder: 'border-[var(--color-status-permission-bg)]',
      helperText: 'Izin meninggalkan tugas',
    },
    {
      key: 'leave',
      label: 'Cuti',
      value: summary?.leaveToday ?? 0,
      icon: CalendarDays,
      iconBg: 'bg-[var(--color-status-leave-bg)]',
      iconColor: 'text-[var(--color-status-leave)]',
      iconBorder: 'border-[var(--color-status-leave-bg)]',
      helperText: 'Pengajuan cuti resmi',
    },
    {
      key: 'absent',
      label: 'Alpha',
      value: summary?.absentToday ?? 0,
      icon: UserRoundX,
      iconBg: 'bg-[var(--color-status-absent-bg)]',
      iconColor: 'text-[var(--color-status-absent)]',
      iconBorder: 'border-[var(--color-status-absent-bg)]',
      helperText: absentHelper,
    },
  ];

  const totalGtk = summary?.totalActiveGtk ?? 0;
  const hadirCount = presentWithDutyCount ?? 0;
  const attendanceRate = summary?.attendanceRate ?? 0;
  const progressPercent = Math.min(100, Math.max(0, attendanceRate));

  const rawMakassarTime = formatMakassarTime(lastUpdated);
  const formattedUpdateTime = rawMakassarTime !== '-' ? rawMakassarTime.replace(':', '.') : '--.--';

  const formatOnTimeLimit = (timeStr?: string | null): string => {
    if (!timeStr) return '07.30';
    const parts = timeStr.trim().split(':');
    if (parts.length >= 2) {
      return `${parts[0].padStart(2, '0')}.${parts[1].padStart(2, '0')}`;
    }
    return '07.30';
  };
  const onTimeLimitLabel = formatOnTimeLimit(checkInOnTimeEnd);

  const StatCard = ({ card, primary }: { card: StatCardConfig; primary?: boolean }) => {
    const Icon = card.icon;
    const adminMobileHeightClass =
      primary && isAdminOrSuperAdmin ? 'min-h-[240px] sm:min-h-[244px] lg:min-h-0 ' : '';
    return (
      <div
        key={card.key}
        className={`bg-white dark:bg-[#262626] border border-[#E5E7EB] dark:border-[#404040] rounded-2xl shadow-2xs flex flex-col justify-between transition-all duration-150 hover:border-[#D1D5DB] dark:hover:border-[#525252] ${
          primary
            ? `${adminMobileHeightClass}p-4 sm:p-5 w-full flex-none snap-start lg:w-auto lg:shrink lg:h-[136px]`
            : 'p-3 sm:p-4 w-full flex-none snap-start lg:w-auto lg:shrink lg:h-[40px] lg:flex-row lg:items-center lg:gap-3 lg:p-3'
        }`}
      >
        <div className={`flex ${primary ? 'items-center gap-2 mb-2' : 'items-center gap-2.5 flex-1'}`}>
          <Icon className={primary ? `w-5 h-5 ${card.iconColor}` : `w-4 h-4 ${card.iconColor}`} />
          <span
            className={`font-medium text-[#6B7280] dark:text-[#A3A3A3] leading-snug ${
              primary ? 'text-sm' : 'text-xs lg:text-xs'
            }`}
          >
            {card.label}
          </span>
        </div>

        <div className={primary ? '' : 'lg:mt-0'}>
          <div className="flex items-baseline gap-1.5">
            <span
              className={`font-extrabold text-[#111827] dark:text-[#F9FAFB] tracking-tight ${
                primary ? 'text-2xl sm:text-3xl' : 'text-sm lg:text-sm'
              }`}
            >
              {card.value.toLocaleString('id-ID')}
            </span>
            <span className={`text-xs font-semibold text-[#9CA3AF] dark:text-[#737373] ${primary ? '' : 'lg:hidden'}`}>GTK</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section aria-label="Ringkasan Statistik Kehadiran GTK Hari Ini" className="dashboard-status-tokens">
      {/* Mobile/Tablet Carousel */}
      <div className="lg:hidden flex overflow-x-auto snap-x snap-mandatory gap-3.5 sm:gap-4 pb-2 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {role === 'headmaster' && (
          <div className="relative overflow-hidden bg-gradient-to-br from-[#FB923C] via-[#F97316] to-[#EA580C] text-white rounded-2xl p-4 sm:p-5 shadow-md space-y-3.5 font-sans w-full flex-none snap-start">
            <div className="absolute inset-0 opacity-12 pointer-events-none overflow-hidden rounded-2xl">
              <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
                <defs>
                  <pattern id="geometric-pattern-headmaster-card" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M0 20 L20 0 L40 20 L20 40 Z" fill="none" stroke="currentColor" strokeWidth="1" />
                    <circle cx="20" cy="20" r="2" fill="currentColor" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#geometric-pattern-headmaster-card)" className="text-white" />
              </svg>
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2.5 border-b border-white/20 relative z-10">
              <h3 className="font-bold text-base sm:text-lg text-white tracking-tight drop-shadow-2xs">{schoolName}</h3>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-white/95">
                <MapPin className="w-3.5 h-3.5 text-white shrink-0" />
                <span>Malili, Luwu Timur</span>
              </div>
            </div>
            <div className="pt-0.5 pb-0.5 relative z-10 space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
                <span className="text-[11px] sm:text-sm font-bold uppercase tracking-normal sm:tracking-wider text-white drop-shadow-2xs whitespace-nowrap">PRESENSI HARI INI</span>
                <div className="flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-sm font-medium text-orange-100/95 shrink-0">
                  <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-white shrink-0" />
                  <span>{currentDateFormatted || 'Memuat tanggal...'}</span>
                </div>
              </div>
              <p className="text-base sm:text-lg font-extrabold text-white tracking-tight drop-shadow-2xs">{todayDisplayStatus}</p>
            </div>
            <div className="bg-white dark:bg-[#262626] rounded-xl py-3 px-2 sm:px-4 shadow-xs text-[#111827] dark:text-[#F9FAFB] relative z-10">
              <div className="grid grid-cols-2 divide-x divide-slate-200 dark:divide-[#404040]">
                <div className="flex flex-col items-center justify-center text-center px-2">
                  <span className="text-[11px] sm:text-xs font-semibold text-[#6B7280] dark:text-[#A3A3A3] leading-tight">Check-in</span>
                  <span className="text-sm sm:text-base font-bold text-[#111827] dark:text-[#F9FAFB] leading-tight mt-1 tabular-nums">{displayCheckInTime}</span>
                </div>
                <div className="flex flex-col items-center justify-center text-center px-2">
                  <span className="text-[11px] sm:text-xs font-semibold text-[#6B7280] dark:text-[#A3A3A3] leading-tight">Check-out</span>
                  <span className="text-sm sm:text-base font-bold text-[#111827] dark:text-[#F9FAFB] leading-tight mt-1 tabular-nums">{displayCheckOutTime}</span>
                </div>
              </div>
            </div>
          </div>
        )}
        {isAdminOrSuperAdmin && (
          <div className="relative overflow-hidden bg-gradient-to-br from-[#FB923C] via-[#F97316] to-[#EA580C] text-white rounded-2xl p-4 sm:p-5 shadow-md font-sans w-full flex-none snap-start min-h-[240px] sm:min-h-[244px] flex flex-col justify-between">
            <div className="absolute inset-0 opacity-12 pointer-events-none overflow-hidden rounded-2xl">
              <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
                <defs>
                  <pattern id="geometric-pattern-admin-attendance-card" width="40" height="40" patternUnits="userSpaceOnUse">
                    <path d="M0 20 L20 0 L40 20 L20 40 Z" fill="none" stroke="currentColor" strokeWidth="1" />
                    <circle cx="20" cy="20" r="2" fill="currentColor" />
                  </pattern>
                </defs>
                <rect width="100%" height="100%" fill="url(#geometric-pattern-admin-attendance-card)" className="text-white" />
              </svg>
            </div>

            {/* A. Baris atas: Tanggal operasional & badge Update HH.mm */}
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-white/20 relative z-10">
              <div className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-white/95 min-w-0">
                <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white shrink-0" />
                <span className="truncate">{dateLabel || currentDateFormatted || '-'}</span>
              </div>
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-white/15 border border-white/20 text-[11px] sm:text-xs font-semibold text-white tabular-nums shrink-0">
                Update {formattedUpdateTime}
              </span>
            </div>

            {/* B. Bagian utama: Judul, jumlah hadir/total, dan progress bar */}
            <div className="relative z-10 space-y-2.5 my-auto py-2">
              <p className="text-xs sm:text-sm font-bold text-orange-50 tracking-tight">
                Kehadiran hari ini
              </p>
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight tabular-nums drop-shadow-2xs">
                  {hadirCount.toLocaleString('id-ID')}
                </span>
                <span className="text-sm sm:text-base font-semibold text-orange-50/95">
                  dari {totalGtk.toLocaleString('id-ID')} pegawai
                </span>
              </div>
              <div
                className="w-full h-2 sm:h-2.5 bg-white/25 rounded-full overflow-hidden"
                role="progressbar"
                aria-valuenow={progressPercent}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label={`Persentase kehadiran hari ini ${attendanceRate}%`}
              >
                <div
                  className="h-full bg-white rounded-full transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* C. Bagian bawah: Persentase & batas tepat waktu */}
            <div className="pt-2.5 border-t border-white/20 relative z-10">
              <p className="text-xs sm:text-[13px] font-medium text-orange-50/95 tabular-nums">
                {attendanceRate}% hadir · Batas tepat waktu {onTimeLimitLabel}
              </p>
            </div>
          </div>
        )}
        {cards.map((card) => <StatCard key={card.key} card={card} primary />)}
      </div>

      {/* Desktop Grid */}
      <div className="hidden lg:grid grid-cols-4 gap-4">
        {/* Col 1: Total GTK */}
        <StatCard card={cards[0]} primary />
        {/* Col 2: On Time */}
        <StatCard card={cards[1]} primary />
        
        {/* Col 3 & 4: Combined Secondary Cards */}
        {[
          [cards[2], cards[3], cards[4]], // Col 3
          [cards[5], cards[6], cards[7]], // Col 4
        ].map((columnCards, colIndex) => (
          <div key={colIndex} className="bg-white dark:bg-[#262626] border border-[#E5E7EB] dark:border-[#404040] rounded-2xl shadow-2xs p-3 flex flex-col justify-between gap-2">
            {columnCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.key} className="flex items-center justify-between py-1 border-b last:border-b-0 border-[#F3F4F6] dark:border-[#303030] last:pb-0">
                  <div className="flex items-center gap-2">
                    <Icon className={`w-3.5 h-3.5 ${card.iconColor}`} />
                    <span className="text-[11px] font-medium text-[#6B7280] dark:text-[#A3A3A3]">{card.label}</span>
                  </div>
                  <span className="text-sm font-bold text-[#111827] dark:text-[#F9FAFB]">{card.value.toLocaleString('id-ID')}</span>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </section>
  );
};

export default ExecutiveStatCards;
