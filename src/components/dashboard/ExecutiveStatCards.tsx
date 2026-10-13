import React from 'react';
import {
  Users,
  CheckCircle2,
  Clock,
  FileText,
  UserX,
} from 'lucide-react';
import { ExecutiveSummary } from '../../services/dashboardExecutiveService';

export interface ExecutiveStatCardsProps {
  summary: ExecutiveSummary | null;
  loading?: boolean;
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
      iconBg: 'bg-slate-50',
      iconColor: 'text-slate-700',
      iconBorder: 'border-slate-200',
      helperText: 'Pendidik & tenaga kependidikan',
    },
    {
      key: 'on_time',
      label: 'Hadir Tepat Waktu',
      value: summary?.onTimeToday ?? 0,
      icon: CheckCircle2,
      iconBg: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
      iconBorder: 'border-emerald-200',
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
      iconBg: 'bg-amber-50',
      iconColor: 'text-amber-600',
      iconBorder: 'border-amber-200',
      helperText: 'Melewati toleransi jam masuk',
    },
    {
      key: 'excused',
      label: 'Izin / Sakit / Dinas / Cuti',
      value: summary?.excusedToday ?? 0,
      icon: FileText,
      iconBg: 'bg-orange-50',
      iconColor: 'text-[#F97316]',
      iconBorder: 'border-orange-200',
      helperText: 'Pengajuan resmi disetujui',
    },
    {
      key: 'absent',
      label: 'Belum Presensi',
      value: summary?.absentToday ?? 0,
      icon: UserX,
      iconBg: 'bg-rose-50',
      iconColor: 'text-rose-600',
      iconBorder: 'border-rose-200',
      helperText: absentHelper,
    },
  ];

  return (
    <section aria-label="Ringkasan Statistik Kehadiran GTK Hari Ini">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.key}
              className="bg-white border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 shadow-2xs flex flex-col justify-between transition-all duration-150 hover:border-[#D1D5DB]"
            >
              <div className="flex items-start justify-between gap-3">
                <span className="text-xs sm:text-[13px] font-medium text-[#6B7280] leading-snug line-clamp-2">
                  {card.label}
                </span>
                <div
                  className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${card.iconBg} ${card.iconColor} ${card.iconBorder}`}
                  aria-hidden="true"
                >
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div className="mt-3 sm:mt-4">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-extrabold text-[#111827] tracking-tight">
                    {card.value.toLocaleString('id-ID')}
                  </span>
                  <span className="text-xs font-semibold text-[#9CA3AF]">
                    GTK
                  </span>
                </div>
                {card.helperText && (
                  <p className="text-[11px] text-[#9CA3AF] mt-1 leading-normal truncate">
                    {card.helperText}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default ExecutiveStatCards;
