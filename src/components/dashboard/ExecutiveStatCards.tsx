import React from 'react';
import {
  Users,
  CheckCircle2,
  Clock,
  FileText,
  UserX,
  MapPin,
  Calendar,
} from 'lucide-react';
import { ExecutiveSummary } from '../../services/dashboardExecutiveService';

export interface ExecutiveStatCardsProps {
  summary: ExecutiveSummary | null;
  loading?: boolean;
  role?: string;
  schoolName?: string;
  currentDateFormatted?: string;
  todayDisplayStatus?: string;
  displayCheckInTime?: string;
  displayCheckOutTime?: string;
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
}) => {
  if (loading) {
    return (
      <div
        className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4"
        aria-busy="true"
        aria-label="Memuat statistik ringkasan eksekutif"
      >
        {[1, 2, 3, 4, 5].map((idx) => (
          <div
            key={idx}
            className="bg-white border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3 animate-pulse"
          >
            <div className="flex items-center justify-between">
              <div className="h-3.5 bg-[#F3F4F6] rounded w-24" />
              <div className="w-9 h-9 rounded-xl bg-[#F3F4F6]" />
            </div>
            <div className="space-y-1.5 pt-1">
              <div className="h-7 bg-[#E5E7EB] rounded w-16" />
              <div className="h-3 bg-[#F3F4F6] rounded w-28" />
            </div>
          </div>
        ))}
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
      icon: CheckCircle2,
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
      icon: Clock,
      iconBg: 'bg-[var(--color-status-late-bg)]',
      iconColor: 'text-[var(--color-status-late)]',
      iconBorder: 'border-[var(--color-status-late-bg)]',
      helperText: 'Melewati toleransi jam masuk',
    },
    {
      key: 'official_duty',
      label: 'Dinas Luar',
      value: summary?.officialDutyToday ?? 0,
      icon: FileText,
      iconBg: 'bg-[var(--color-status-official-duty-bg)]',
      iconColor: 'text-[var(--color-status-official-duty)]',
      iconBorder: 'border-[var(--color-status-official-duty-bg)]',
      helperText: 'Tugas kedinasan luar kantor',
    },
    {
      key: 'sick',
      label: 'Sakit',
      value: summary?.sickToday ?? 0,
      icon: FileText,
      iconBg: 'bg-[var(--color-status-sick-bg)]',
      iconColor: 'text-[var(--color-status-sick)]',
      iconBorder: 'border-[var(--color-status-sick-bg)]',
      helperText: 'Surat keterangan sakit',
    },
    {
      key: 'permission',
      label: 'Izin',
      value: summary?.permissionToday ?? 0,
      icon: FileText,
      iconBg: 'bg-[var(--color-status-permission-bg)]',
      iconColor: 'text-[var(--color-status-permission)]',
      iconBorder: 'border-[var(--color-status-permission-bg)]',
      helperText: 'Izin meninggalkan tugas',
    },
    {
      key: 'leave',
      label: 'Cuti',
      value: summary?.leaveToday ?? 0,
      icon: FileText,
      iconBg: 'bg-[var(--color-status-leave-bg)]',
      iconColor: 'text-[var(--color-status-leave)]',
      iconBorder: 'border-[var(--color-status-leave-bg)]',
      helperText: 'Pengajuan cuti resmi',
    },
    {
      key: 'absent',
      label: 'Alpha',
      value: summary?.absentToday ?? 0,
      icon: UserX,
      iconBg: 'bg-[var(--color-status-absent-bg)]',
      iconColor: 'text-[var(--color-status-absent)]',
      iconBorder: 'border-[var(--color-status-absent-bg)]',
      helperText: absentHelper,
    },
  ];

  const StatCard = ({ card, primary }: { card: StatCardConfig; primary?: boolean }) => {
    const Icon = card.icon;
    return (
      <div
        key={card.key}
        className={`bg-white border border-[#E5E7EB] rounded-2xl shadow-2xs flex flex-col justify-between transition-all duration-150 hover:border-[#D1D5DB] ${
          primary
            ? 'p-4 sm:p-5 w-full flex-none snap-start lg:w-auto lg:shrink lg:h-[136px]'
            : 'p-3 sm:p-4 w-full flex-none snap-start lg:w-auto lg:shrink lg:h-[40px] lg:flex-row lg:items-center lg:gap-3 lg:p-3'
        }`}
      >
        <div className={`flex ${primary ? 'items-center gap-2 mb-2' : 'items-center gap-2.5 flex-1'}`}>
          <Icon className={primary ? 'w-5 h-5 text-[#6B7280]' : 'w-4 h-4 text-[#6B7280]'} />
          <span
            className={`font-medium text-[#6B7280] leading-snug ${
              primary ? 'text-sm' : 'text-xs lg:text-xs'
            }`}
          >
            {card.label}
          </span>
        </div>

        <div className={primary ? '' : 'lg:mt-0'}>
          <div className="flex items-baseline gap-1.5">
            <span
              className={`font-extrabold text-[#111827] tracking-tight ${
                primary ? 'text-2xl sm:text-3xl' : 'text-sm lg:text-sm'
              }`}
            >
              {card.value.toLocaleString('id-ID')}
            </span>
            <span className={`text-xs font-semibold text-[#9CA3AF] ${primary ? '' : 'lg:hidden'}`}>GTK</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section aria-label="Ringkasan Statistik Kehadiran GTK Hari Ini">
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
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-white drop-shadow-2xs">PRESENSI HARI INI</span>
                <div className="flex items-center gap-1.5 text-xs sm:text-sm font-medium text-orange-100/95 shrink-0">
                  <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white shrink-0" />
                  <span>{currentDateFormatted || 'Memuat tanggal...'}</span>
                </div>
              </div>
              <p className="text-base sm:text-lg font-extrabold text-white tracking-tight drop-shadow-2xs">{todayDisplayStatus}</p>
            </div>
            <div className="bg-white rounded-xl py-3 px-2 sm:px-4 shadow-xs text-[#111827] relative z-10">
              <div className="grid grid-cols-2 divide-x divide-slate-200">
                <div className="flex flex-col items-center justify-center text-center px-2">
                  <span className="text-[11px] sm:text-xs font-semibold text-[#6B7280] leading-tight">Check-in</span>
                  <span className="text-sm sm:text-base font-bold text-[#111827] leading-tight mt-1 tabular-nums">{displayCheckInTime}</span>
                </div>
                <div className="flex flex-col items-center justify-center text-center px-2">
                  <span className="text-[11px] sm:text-xs font-semibold text-[#6B7280] leading-tight">Check-out</span>
                  <span className="text-sm sm:text-base font-bold text-[#111827] leading-tight mt-1 tabular-nums">{displayCheckOutTime}</span>
                </div>
              </div>
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
          <div key={colIndex} className="bg-white border border-[#E5E7EB] rounded-2xl shadow-2xs p-3 flex flex-col justify-between gap-2">
            {columnCards.map((card) => {
              const Icon = card.icon;
              return (
                <div key={card.key} className="flex items-center justify-between py-1 border-b last:border-b-0 border-[#F3F4F6] last:pb-0">
                  <div className="flex items-center gap-2">
                    <Icon className="w-3.5 h-3.5 text-[#6B7280]" />
                    <span className="text-[11px] font-medium text-[#6B7280]">{card.label}</span>
                  </div>
                  <span className="text-sm font-bold text-[#111827]">{card.value.toLocaleString('id-ID')}</span>
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
