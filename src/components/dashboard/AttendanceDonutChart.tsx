import React, { useState, useId } from 'react';
import { PieChart, Calendar, AlertCircle } from 'lucide-react';
import { TodayDonutDistribution } from '../../services/dashboardExecutiveService';
import { ATTENDANCE_STATUS_TOKENS } from '../../config/statusColors';

export interface AttendanceDonutChartProps {
  /**
   * Data distribusi presensi hari ini.
   */
  distribution?: TodayDonutDistribution | null;
  /**
   * Status loading skeleton.
   */
  loading?: boolean;
  /**
   * Label tanggal (contoh: "Senin, 13 Okt 2026").
   */
  dateLabel?: string;
  /**
   * Penanda apakah hari ini akhir pekan atau libur nasional.
   */
  isNonWorkingDay?: boolean;
  /**
   * Nama hari libur jika berlaku.
   */
  holidayName?: string | null;
  /**
   * CSS class tambahan untuk root wrapper.
   */
  className?: string;
}

type DonutCategoryKey = 'hadir' | 'pending' | 'alpha' | 'lainnya';

interface SegmentConfig {
  key: DonutCategoryKey;
  label: string;
  shortLabel: string;
  count: number;
  percentage: number;
  color: string;
  hoverColor: string;
  dotClass: string;
}

export const AttendanceDonutChart: React.FC<AttendanceDonutChartProps> = ({
  distribution,
  loading = false,
  dateLabel,
  isNonWorkingDay = false,
  holidayName,
  className = '',
}) => {
  const chartId = useId();
  const [hoveredKey, setHoveredKey] = useState<DonutCategoryKey | null>(null);

  // Loading skeleton state
  if (loading) {
    return (
      <div
        className={`bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-2xs space-y-5 animate-pulse ${className}`}
        aria-busy="true"
        aria-label="Memuat distribusi presensi hari ini"
      >
        <div className="flex items-center justify-between pb-1 border-b border-slate-100">
          <div className="space-y-1.5">
            <div className="h-5 bg-[#E5E7EB] rounded w-48" />
            <div className="h-3.5 bg-[#F3F4F6] rounded w-32" />
          </div>
          <div className="h-4 bg-[#F3F4F6] rounded w-20" />
        </div>

        <div className="flex flex-col items-center justify-center gap-5 py-2">
          <div className="w-44 h-44 rounded-full border-[18px] border-slate-100 bg-transparent flex items-center justify-center">
            <div className="space-y-1 text-center">
              <div className="h-6 bg-[#E5E7EB] rounded w-14 mx-auto" />
              <div className="h-3 bg-[#F3F4F6] rounded w-16 mx-auto" />
            </div>
          </div>

          <div className="w-full space-y-2">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2 sm:p-2.5 rounded-xl border border-slate-100"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#E5E7EB]" />
                  <div className="h-3.5 bg-[#F3F4F6] rounded w-24" />
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3.5 bg-[#E5E7EB] rounded w-10" />
                  <div className="h-4 bg-[#F3F4F6] rounded w-10" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const total = distribution?.total ?? 0;
  const hadir = distribution?.hadir ?? 0;
  const pending = distribution?.pending ?? 0;
  const alpha = distribution?.alpha ?? distribution?.absent ?? 0;
  const lainnya = distribution?.lainnya ?? distribution?.excused ?? 0;

  const pctHadir = distribution?.percentages?.hadir ?? 0;
  const pctPending = distribution?.percentages?.pending ?? 0;
  const pctAlpha = distribution?.percentages?.alpha ?? 0;
  const pctLainnya = distribution?.percentages?.lainnya ?? 0;

  // Persentase kehadiran terhadap seluruh GTK
  const overallAttendanceRate =
    total > 0 ? Number(((hadir / total) * 100).toFixed(1)) : 0;

  const segments: SegmentConfig[] = [
    {
      key: 'hadir',
      label: 'Hadir (Tepat Waktu / Terlambat / Dinas Luar)',
      shortLabel: 'Hadir',
      count: hadir,
      percentage: pctHadir,
      color: '#F97316',
      hoverColor: '#EA580C',
      dotClass: 'bg-[#F97316]',
    },
    {
      key: 'lainnya',
      label: 'Sakit / Izin / Cuti',
      shortLabel: 'Sakit/Izin/Cuti',
      count: lainnya,
      percentage: pctLainnya,
      color: '#FB923C',
      hoverColor: '#F97316',
      dotClass: 'bg-[#FB923C]',
    },
    {
      key: 'pending',
      label: 'Belum Presensi',
      shortLabel: 'Belum Presensi',
      count: pending,
      percentage: pctPending,
      color: '#FED7AA',
      hoverColor: '#FDBA74',
      dotClass: 'bg-[#FED7AA] border border-amber-200',
    },
    {
      key: 'alpha',
      label: 'Alpha (Tanpa Keterangan)',
      shortLabel: 'Alpha',
      count: alpha,
      percentage: pctAlpha,
      color: '#D3D3D3',
      hoverColor: '#9CA3AF',
      dotClass: 'bg-[#D3D3D3]',
    },
  ];

  // Geometri Donut SVG
  const radius = 68;
  const circumference = 2 * Math.PI * radius; // ~427.2566
  const baseStrokeWidth = 20;
  const activeStrokeWidth = 24;

  // Hitung offset kumulatif untuk stroke-dasharray SVG
  let cumulativePercentage = 0;
  const arcs = segments.map((seg) => {
    // Hindari busur 0% jika nilainya benar-benar 0
    const segPct = total > 0 ? seg.percentage : 0;
    const strokeDash = (segPct / 100) * circumference;
    const strokeOffset = -(cumulativePercentage / 100) * circumference;
    cumulativePercentage += segPct;

    return {
      ...seg,
      strokeDash,
      strokeOffset,
    };
  });

  const activeSegment = hoveredKey
    ? segments.find((s) => s.key === hoveredKey)
    : null;

  return (
    <div
      className={`bg-white border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4 ${className}`}
      aria-labelledby={`${chartId}-title`}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-1 border-b border-slate-100">
        <div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
            <h3
              id={`${chartId}-title`}
              className="text-base font-semibold text-slate-900 tracking-tight"
            >
              Distribusi Presensi Hari Ini
            </h3>
            {dateLabel && (
              <>
                <span className="hidden sm:inline-block text-xs text-slate-400">·</span>
                <span className="text-xs text-slate-500">{dateLabel}</span>
              </>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Proporsi real-time seluruh GTK aktif berdasarkan status presensi
          </p>
        </div>

        {isNonWorkingDay && (
          <div className="self-start sm:self-auto flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200/80 rounded-lg text-[11px] text-amber-800 font-medium shrink-0">
            <Calendar className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>
              {holidayName ? `Libur: ${holidayName}` : 'Akhir Pekan'}
            </span>
          </div>
        )}
      </div>

      {/* Main Content Area */}
      {total === 0 ? (
        <div className="h-56 flex flex-col items-center justify-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200 text-center p-6 my-auto">
          <PieChart className="w-8 h-8 text-slate-400 mb-2" />
          <p className="text-sm font-medium text-slate-700">Belum Ada Presensi</p>
          <p className="text-xs text-slate-500 mt-0.5 max-w-xs">
            Belum ada data presensi tercatat untuk hari ini.
          </p>
        </div>
      ) : (
        <div className="flex flex-col xl:flex-row items-center justify-between gap-5 py-1 my-auto">
          {/* SVG Donut Visual di sisi kiri (desktop) atau atas (mobile/tablet) */}
          <div className="relative w-40 h-40 sm:w-44 sm:h-44 xl:w-44 xl:h-44 shrink-0 select-none flex items-center justify-center">
            <svg
              viewBox="0 0 200 200"
              className="w-full h-full transform -rotate-90 block overflow-visible"
              role="img"
              aria-label={`Grafik donat presensi: ${overallAttendanceRate}% kehadiran`}
            >
              {/* Lingkaran latar belakang netral */}
              <circle
                cx="100"
                cy="100"
                r={radius}
                stroke="#F1F5F9"
                strokeWidth={baseStrokeWidth}
                fill="none"
              />

              {/* Segmen busur donat */}
              {arcs.map((arc) => {
                if (arc.count <= 0) return null;
                const isHovered = hoveredKey === arc.key;

                return (
                  <circle
                    key={arc.key}
                    cx="100"
                    cy="100"
                    r={radius}
                    stroke={isHovered ? arc.hoverColor : arc.color}
                    strokeWidth={isHovered ? activeStrokeWidth : baseStrokeWidth}
                    strokeDasharray={`${arc.strokeDash} ${circumference}`}
                    strokeDashoffset={arc.strokeOffset}
                    strokeLinecap="butt"
                    fill="none"
                    className="cursor-pointer transition-all duration-200"
                    onMouseEnter={() => setHoveredKey(arc.key)}
                    onMouseLeave={() => setHoveredKey(null)}
                  />
                );
              })}
            </svg>

            {/* Konten Bagian Tengah Donut */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2 pointer-events-none">
              {activeSegment ? (
                <div className="space-y-0.5 animate-in fade-in duration-150">
                  <span className="text-[10px] font-medium text-slate-500 block truncate max-w-[95px]">
                    {activeSegment.shortLabel}
                  </span>
                  <span className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight block">
                    {activeSegment.count}
                  </span>
                  <span className="text-[10px] sm:text-[11px] font-semibold text-slate-600 block">
                    {activeSegment.percentage}%
                  </span>
                </div>
              ) : (
                <div className="space-y-0.5 animate-in fade-in duration-150">
                  <span className="text-[11px] text-slate-500 font-medium block">
                    Kehadiran
                  </span>
                  <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight block">
                    {overallAttendanceRate}%
                  </span>
                  <span className="text-[10px] sm:text-[11px] text-slate-400 font-medium block">
                    {hadir} / {total} GTK
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Interactive Legend List di sisi kanan (desktop) atau bawah (mobile/tablet) */}
          <div className="w-full xl:flex-1 space-y-2 min-w-0">
            {segments.map((seg) => {
              const isHovered = hoveredKey === seg.key;

              return (
                <div
                  key={seg.key}
                  onMouseEnter={() => setHoveredKey(seg.key)}
                  onMouseLeave={() => setHoveredKey(null)}
                  className={`flex items-center justify-between gap-2 p-2 sm:p-2.5 rounded-xl border transition-all cursor-pointer ${
                    isHovered
                      ? 'bg-slate-50 border-slate-300 shadow-2xs'
                      : 'border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <div className="flex items-start gap-2 min-w-0 flex-1">
                    <span
                      className={`w-2.5 h-2.5 rounded-full shrink-0 mt-0.5 ${seg.dotClass}`}
                      aria-hidden="true"
                    />
                    <span className="text-xs font-medium text-slate-800 leading-tight break-words">
                      {seg.label}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 self-center">
                    <span className="text-xs font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                      {seg.count}{' '}
                      <span className="font-normal text-slate-400 text-[10px]">
                        GTK
                      </span>
                    </span>
                    <span
                      className={`text-xs font-medium px-1.5 py-0.5 rounded-md min-w-[40px] text-center tabular-nums whitespace-nowrap transition-colors ${
                        isHovered
                          ? 'bg-slate-900 text-white font-semibold'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {seg.percentage}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer Info note */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pt-2 border-t border-slate-100 text-[11px] text-slate-400 mt-auto">
        <div className="flex items-start gap-1.5 min-w-0">
          <AlertCircle className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
          <span className="leading-tight">
            {isNonWorkingDay
              ? 'Hari ini adalah hari non-operasional presensi'
              : 'Presensi fisik tercatat memiliki prioritas atas pengajuan izin'}
          </span>
        </div>
        <span className="shrink-0 self-end sm:self-auto font-medium text-slate-500">
          Total: {total} GTK
        </span>
      </div>
    </div>
  );
};

export default AttendanceDonutChart;
