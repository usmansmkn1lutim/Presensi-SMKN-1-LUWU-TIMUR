import React, { useMemo } from 'react';
import {
  CalendarCheck,
  Calendar,
  CheckCircle2,
  ClockAlert,
  BriefcaseBusiness,
  Thermometer,
  FileCheck,
  CalendarDays,
  UserX,
} from 'lucide-react';
import { EvaluatedStatusResult } from '../../services/attendanceStatusService';

export const MONTH_NAMES_INDONESIAN = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export function formatPercentage(value: number | null): string {
  if (value === null || value === undefined || isNaN(value)) {
    return '—';
  }
  if (value === 0) {
    return '0%';
  }
  const precisionStr = value.toPrecision(3);
  const num = Number(precisionStr);
  return `${num}%`;
}

// ============================================================================
// 1. CHART PERTAMA: SEGMENTED SEMI-CIRCLE GAUGE (180° Arc Rotated 90°)
// ============================================================================
interface SegmentedSemiCircleGaugeProps {
  percentage: number;
  percentageText: string;
  totalAttendance: number;
  effectiveWorkingDays: number;
  segmentsCount?: number;
}

const SegmentedSemiCircleGauge: React.FC<SegmentedSemiCircleGaugeProps> = ({
  percentage,
  percentageText,
  totalAttendance,
  effectiveWorkingDays,
  segmentsCount = 18,
}) => {
  // Geometric center of the SVG container
  const cx = 110;
  const cy = 110;
  const radius = 82;
  const barWidth = 7;
  const barHeight = 18;

  const clampedPercentage = Math.min(100, Math.max(0, percentage || 0));
  const activeSegments = Math.round((clampedPercentage / 100) * segmentsCount);

  // Rotated 90° geometry: angle goes from -90° (top 12 o'clock) to +90° (bottom 6 o'clock)
  const segments = useMemo(() => {
    const items = [];
    for (let i = 0; i < segmentsCount; i++) {
      const fraction = (i + 0.5) / segmentsCount;
      const angleDeg = -90 + fraction * 180;
      const isActive = i < activeSegments;
      items.push({
        index: i,
        angleDeg,
        color: isActive ? '#FF5722' : '#E2E8F0', // Sunset Orange #FF5722 for active, #E2E8F0 for inactive
      });
    }
    return items;
  }, [segmentsCount, activeSegments]);

  return (
    <div className="flex flex-col items-center justify-center w-full max-w-[210px] mx-auto space-y-1">
      <div className="relative w-full aspect-[220/200] flex items-center justify-center">
        <svg viewBox="0 0 220 220" className="w-full h-full overflow-visible">
          {/* Radial Rectangle Segments along 90° Rotated 180° Arc */}
          {segments.map((seg) => (
            <g key={seg.index} transform={`translate(${cx}, ${cy}) rotate(${seg.angleDeg})`}>
              <rect
                x={-barWidth / 2}
                y={-radius - barHeight / 2}
                width={barWidth}
                height={barHeight}
                rx={2.5}
                fill={seg.color}
                className="transition-colors duration-300"
              />
            </g>
          ))}

          {/* Center Display: Exactly centered at geometric center (cx = 110, cy = 110) */}
          <text
            x={cx}
            y={cy - 6}
            textAnchor="middle"
            dominantBaseline="central"
            className="text-2xl font-black fill-[#111827] tracking-tight"
            style={{ fontSize: '26px', fontWeight: 900 }}
          >
            {percentageText}
          </text>
          <text
            x={cx}
            y={cy + 18}
            textAnchor="middle"
            dominantBaseline="central"
            className="text-[11px] font-bold fill-[#6B7280]"
            style={{ fontSize: '11px', fontWeight: 700 }}
          >
            {totalAttendance} dari {effectiveWorkingDays} Hari Efektif
          </text>
        </svg>
      </div>
    </div>
  );
};

// ============================================================================
// 2. CHART KEDUA: RADIAL BAR CHART DENGAN LEGENDA TERHUBUNG GEOMETRIS (DEKAT DIAMETER)
// ============================================================================
interface RadialBarChartWithLegendProps {
  hadirPct: number;
  perizinanPct: number;
  tanpaKetPct: number;
  effectiveWorkingDays: number;
}

const RadialBarChartWithLegend: React.FC<RadialBarChartWithLegendProps> = ({
  hadirPct,
  perizinanPct,
  tanpaKetPct,
  effectiveWorkingDays,
}) => {
  // SVG Dimensions & Geometry
  // Radial chart centered at geometric center of 340px SVG: cx = 170, cy = 80
  const cx = 170;
  const cy = 80;
  const strokeWidth = 8.5;

  const R_hadir = 65;
  const R_perizinan = 47;
  const R_tanpaKet = 29;

  // Top centerline Y-coordinates for the 3 concentric rings:
  // Hadir (Outer ring): Y = cy - R_hadir = 80 - 65 = 15
  // Perizinan (Middle ring): Y = cy - R_perizinan = 80 - 47 = 33
  // Tanpa Ket. (Inner ring): Y = cy - R_tanpaKet = 80 - 29 = 51
  const Y_hadir = cy - R_hadir; // 15
  const Y_perizinan = cy - R_perizinan; // 33
  const Y_tanpaKet = cy - R_tanpaKet; // 51

  // Shifted Legend X positions (relative to cx = 170):
  const X_name = 7;
  const X_pct = 137;
  const X_icon = 153;

  // Ring arc calculations (270° arcs)
  const calcArc = (pct: number, r: number) => {
    const circumference = 2 * Math.PI * r;
    const trackLength = 0.75 * circumference;
    const clamped = Math.min(100, Math.max(0, pct || 0));
    const progressLength = (clamped / 100) * trackLength;
    return { circumference, trackLength, progressLength };
  };

  const arcHadir = calcArc(hadirPct, R_hadir);
  const arcPerizinan = calcArc(perizinanPct, R_perizinan);
  const arcTanpaKet = calcArc(tanpaKetPct, R_tanpaKet);

  return (
    <div className="w-full flex justify-center items-center">
      <div className="relative w-full max-w-[360px] aspect-[340/160]">
        <svg viewBox="0 0 340 160" className="w-full h-full overflow-visible">
          {/* ==================================================================== */}
          {/* LEGENDA DENGAN IKON MENDEKATI DIAMETER CHART RADIAL (TANPA GARIS PUTUS-PUTUS) */}
          {/* ==================================================================== */}

          {/* Baris 1: Hadir (Terluar - Y_hadir = 15) */}
          <g transform={`translate(0, ${Y_hadir})`}>
            {/* Nama Kategori */}
            <text x={X_name} y={4} textAnchor="start" className="text-xs font-bold fill-[#374151]" style={{ fontSize: '12px', fontWeight: 700 }}>
              Hadir
            </text>
            {/* Persentase (Rata Kanan) */}
            <text x={X_pct} y={4} textAnchor="end" className="text-xs font-mono font-bold fill-[#111827]" style={{ fontSize: '12px', fontWeight: 700 }}>
              {formatPercentage(hadirPct)}
            </text>
            {/* Ikon Hijau */}
            <circle cx={X_icon} cy={0} r={6} fill="#10B981" />
            <path d={`M ${X_icon - 3} 0 L ${X_icon - 1} 2 L ${X_icon + 3} -2`} fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </g>

          {/* Baris 2: Perizinan (Tengah - Y_perizinan = 33) */}
          <g transform={`translate(0, ${Y_perizinan})`}>
            {/* Nama Kategori */}
            <text x={X_name} y={4} textAnchor="start" className="text-xs font-bold fill-[#374151]" style={{ fontSize: '12px', fontWeight: 700 }}>
              Perizinan
            </text>
            {/* Persentase (Rata Kanan) */}
            <text x={X_pct} y={4} textAnchor="end" className="text-xs font-mono font-bold fill-[#111827]" style={{ fontSize: '12px', fontWeight: 700 }}>
              {formatPercentage(perizinanPct)}
            </text>
            {/* Ikon Kuning */}
            <circle cx={X_icon} cy={0} r={6} fill="#F59E0B" />
            <rect x={X_icon - 2.5} y={-3} width={5} height={6} rx={1} fill="none" stroke="#FFFFFF" strokeWidth="1.2" />
          </g>

          {/* Baris 3: Tanpa Ket. (Terdalam - Y_tanpaKet = 51) */}
          <g transform={`translate(0, ${Y_tanpaKet})`}>
            {/* Nama Kategori */}
            <text x={X_name} y={4} textAnchor="start" className="text-xs font-bold fill-[#374151]" style={{ fontSize: '12px', fontWeight: 700 }}>
              Tanpa Ket.
            </text>
            {/* Persentase (Rata Kanan) */}
            <text x={X_pct} y={4} textAnchor="end" className="text-xs font-mono font-bold fill-[#111827]" style={{ fontSize: '12px', fontWeight: 700 }}>
              {formatPercentage(tanpaKetPct)}
            </text>
            {/* Ikon Merah */}
            <circle cx={X_icon} cy={0} r={6} fill="#EF4444" />
            <path d={`M ${X_icon - 2.5} -2.5 L ${X_icon + 2.5} 2.5 M ${X_icon + 2.5} -2.5 L ${X_icon - 2.5} 2.5`} fill="none" stroke="#FFFFFF" strokeWidth="1.5" strokeLinecap="round" />
          </g>

          {/* ==================================================================== */}
          {/* RADIAL CHART SEBELAH KANAN — 3 JALUR CONCENTRIC RINGS (270° ARCS) */}
          {/* ==================================================================== */}

          {/* Track 1: Hadir (Terluar - Green #10B981) */}
          <circle
            cx={cx}
            cy={cy}
            r={R_hadir}
            fill="none"
            stroke="#E2E8F0"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcHadir.trackLength} ${arcHadir.circumference}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${cx} ${cy})`}
          />
          {arcHadir.progressLength > 0 && (
            <circle
              cx={cx}
              cy={cy}
              r={R_hadir}
              fill="none"
              stroke="#10B981"
              strokeWidth={strokeWidth}
              strokeDasharray={`${arcHadir.progressLength} ${arcHadir.circumference}`}
              strokeLinecap="round"
              transform={`rotate(-90 ${cx} ${cy})`}
              className="transition-all duration-500 ease-out"
            />
          )}

          {/* Track 2: Perizinan (Tengah - Amber #F59E0B) */}
          <circle
            cx={cx}
            cy={cy}
            r={R_perizinan}
            fill="none"
            stroke="#E2E8F0"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcPerizinan.trackLength} ${arcPerizinan.circumference}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${cx} ${cy})`}
          />
          {arcPerizinan.progressLength > 0 && (
            <circle
              cx={cx}
              cy={cy}
              r={R_perizinan}
              fill="none"
              stroke="#F59E0B"
              strokeWidth={strokeWidth}
              strokeDasharray={`${arcPerizinan.progressLength} ${arcPerizinan.circumference}`}
              strokeLinecap="round"
              transform={`rotate(-90 ${cx} ${cy})`}
              className="transition-all duration-500 ease-out"
            />
          )}

          {/* Track 3: Tanpa Ket. (Terdalam - Red #EF4444) */}
          <circle
            cx={cx}
            cy={cy}
            r={R_tanpaKet}
            fill="none"
            stroke="#E2E8F0"
            strokeWidth={strokeWidth}
            strokeDasharray={`${arcTanpaKet.trackLength} ${arcTanpaKet.circumference}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${cx} ${cy})`}
          />
          {arcTanpaKet.progressLength > 0 && (
            <circle
              cx={cx}
              cy={cy}
              r={R_tanpaKet}
              fill="none"
              stroke="#EF4444"
              strokeWidth={strokeWidth}
              strokeDasharray={`${arcTanpaKet.progressLength} ${arcTanpaKet.circumference}`}
              strokeLinecap="round"
              transform={`rotate(-90 ${cx} ${cy})`}
              className="transition-all duration-500 ease-out"
            />
          )}

          {/* Center Info in Radial Ring */}
          <text x={cx} y={cy + 2} textAnchor="middle" className="text-sm font-black fill-[#111827]" style={{ fontSize: '14px', fontWeight: 800 }}>
            {effectiveWorkingDays > 0 ? `${effectiveWorkingDays} H` : '—'}
          </text>
        </svg>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT: MONTHLY STATISTICS SECTION
// ============================================================================
export interface MonthlyStatisticsSectionProps {
  matrixData: EvaluatedStatusResult[];
  isLoading: boolean;
  error: string | null;
  statsMonth: {
    month: number; // 0-11
    year: number;
  };
  onStatsMonthChange: (statsMonth: { month: number; year: number }) => void;
}

export const MonthlyStatisticsSection: React.FC<MonthlyStatisticsSectionProps> = ({
  matrixData,
  isLoading,
  error,
  statsMonth,
  onStatsMonthChange,
}) => {
  // Compute statistics strictly for statsMonth using original formulas
  const stats = useMemo(() => {
    let presentOnTime = 0;
    let presentLate = 0;
    let sick = 0;
    let permit = 0;
    let officialDuty = 0;
    let leave = 0;
    let absent = 0;
    let holiday = 0;
    let effectiveWorkingDays = 0;

    const targetMonthPrefix = `${statsMonth.year}-${String(statsMonth.month + 1).padStart(2, '0')}`;
    const statsData = matrixData.filter((item) => item.date.startsWith(targetMonthPrefix));

    statsData.forEach((item) => {
      // Exclude future dates from effective days calculation
      if (item.statusLabel === 'Masa Depan') return;

      if (item.status === 'present') {
        effectiveWorkingDays++;
        if (item.substatus === 'late') {
          presentLate++;
        } else {
          presentOnTime++;
        }
      } else if (item.status === 'sick') {
        sick++;
        effectiveWorkingDays++;
      } else if (item.status === 'permit') {
        permit++;
        effectiveWorkingDays++;
      } else if (item.status === 'official_duty') {
        officialDuty++;
        effectiveWorkingDays++;
      } else if (item.status === 'leave') {
        leave++;
        effectiveWorkingDays++;
      } else if (item.status === 'absent') {
        absent++;
        effectiveWorkingDays++;
      } else if (item.status === 'pending') {
        effectiveWorkingDays++;
      } else if (item.status === 'holiday') {
        holiday++;
      }
    });

    const totalPresent = presentOnTime + presentLate;
    const totalAttendance = totalPresent + officialDuty;

    const rawPercentage =
      effectiveWorkingDays > 0 ? (totalAttendance / effectiveWorkingDays) * 100 : null;

    let percentageText = '—';
    let progressBarColor = '#D1D5DB';

    if (rawPercentage !== null) {
      percentageText = formatPercentage(rawPercentage);
      if (rawPercentage >= 75) {
        progressBarColor = '#16A34A';
      } else if (rawPercentage >= 50) {
        progressBarColor = '#F59E0B';
      } else {
        progressBarColor = '#EF4444';
      }
    }

    // Category group percentages
    const hadirPct =
      effectiveWorkingDays > 0 ? (totalAttendance / effectiveWorkingDays) * 100 : 0;
    const perizinanPct =
      effectiveWorkingDays > 0
        ? ((sick + permit + leave) / effectiveWorkingDays) * 100
        : 0;
    const tanpaKetPct =
      effectiveWorkingDays > 0 ? (absent / effectiveWorkingDays) * 100 : 0;

    return {
      totalPresent,
      presentOnTime,
      presentLate,
      sick,
      permit,
      officialDuty,
      leave,
      absent,
      holiday,
      effectiveWorkingDays,
      totalAttendance,
      rawPercentage,
      percentageText,
      progressBarColor,
      hadirPct,
      perizinanPct,
      tanpaKetPct,
      totalEvaluatedDays: statsData.length,
    };
  }, [matrixData, statsMonth]);

  return (
    <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
      {/* Header: Title & Dropdown Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#FFF7ED] border border-orange-200 text-[#F97316]">
            <CalendarCheck className="w-4 h-4 sm:w-5 sm:h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#111827]">
              Statistik Kehadiran Bulanan
            </h2>
          </div>
        </div>

        {/* Independent Month & Year Dropdown Filters */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Calendar className="w-4 h-4 text-[#6B7280] shrink-0" />
          {/* Month Selector */}
          <select
            value={statsMonth.month}
            onChange={(e) =>
              onStatsMonthChange({
                ...statsMonth,
                month: Number(e.target.value),
              })
            }
            className="bg-white border border-[#E5E7EB] rounded-xl px-3 py-1.5 text-xs font-semibold text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#F97316] cursor-pointer"
          >
            {MONTH_NAMES_INDONESIAN.map((name, idx) => (
              <option key={idx} value={idx}>
                {name}
              </option>
            ))}
          </select>

          {/* Year Selector */}
          <select
            value={statsMonth.year}
            onChange={(e) =>
              onStatsMonthChange({
                ...statsMonth,
                year: Number(e.target.value),
              })
            }
            className="bg-white border border-[#E5E7EB] rounded-xl px-3 py-1.5 text-xs font-semibold text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#F97316] cursor-pointer"
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Content State: Loading, Error, or Redesigned Dual Visual Charts */}
      {isLoading ? (
        <div className="min-h-[150px] flex flex-col items-center justify-center gap-3 py-6">
          <div className="w-7 h-7 border-3 border-[#F97316] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-[#6B7280]">Memuat statistik kehadiran...</p>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-center text-xs text-red-700">
          Gagal memuat statistik kehadiran: {error}
        </div>
      ) : (
        <div className="space-y-5 pt-0">
          {/* Dual Main Charts (Single Card, No Nested Sub-Cards, No Dividers) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start py-1">
            
            {/* CHART 1: SEGMENTED SEMI-CIRCLE GAUGE (180° Rotated 90°) */}
            <div className="flex flex-col items-center justify-start space-y-3">
              <h3 className="text-xs font-bold text-[#374151] uppercase tracking-wider text-center h-4 flex items-center justify-center">
                Persentase Kehadiran
              </h3>

              <SegmentedSemiCircleGauge
                percentage={stats.rawPercentage || 0}
                percentageText={stats.percentageText}
                totalAttendance={stats.totalAttendance}
                effectiveWorkingDays={stats.effectiveWorkingDays}
                segmentsCount={18}
              />
            </div>

            {/* CHART 2: RADIAL BAR CHART (CENTERED) */}
            <div className="flex flex-col items-center justify-start space-y-3">
              <h3 className="text-xs font-bold text-[#374151] uppercase tracking-wider text-center h-4 flex items-center justify-center">
                Distribusi Kategori Kehadiran
              </h3>

              <RadialBarChartWithLegend
                hadirPct={stats.hadirPct}
                perizinanPct={stats.perizinanPct}
                tanpaKetPct={stats.tanpaKetPct}
                effectiveWorkingDays={stats.effectiveWorkingDays}
              />
            </div>

          </div>

          {/* Rincian Sub-Kategori Kehadiran (Breakdown Stats Bar) */}
          <div className="p-3 sm:p-3.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 sm:gap-3 text-center text-xs">
            <div className="space-y-0.5">
              <span className="text-[10px] text-emerald-700 font-semibold flex items-center justify-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-[#10B981]" /> Tepat Waktu
              </span>
              <p className="font-bold text-[#111827] text-sm">{stats.presentOnTime}</p>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-amber-700 font-semibold flex items-center justify-center gap-1">
                <ClockAlert className="w-3 h-3 text-[#F59E0B]" /> Terlambat
              </span>
              <p className="font-bold text-[#111827] text-sm">{stats.presentLate}</p>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-purple-700 font-semibold flex items-center justify-center gap-1">
                <BriefcaseBusiness className="w-3 h-3 text-purple-600" /> Dinas Luar
              </span>
              <p className="font-bold text-[#111827] text-sm">{stats.officialDuty}</p>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-blue-700 font-semibold flex items-center justify-center gap-1">
                <Thermometer className="w-3 h-3 text-blue-600" /> Sakit
              </span>
              <p className="font-bold text-[#111827] text-sm">{stats.sick}</p>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-indigo-700 font-semibold flex items-center justify-center gap-1">
                <FileCheck className="w-3 h-3 text-indigo-600" /> Izin
              </span>
              <p className="font-bold text-[#111827] text-sm">{stats.permit}</p>
            </div>
            <div className="space-y-0.5">
              <span className="text-[10px] text-teal-700 font-semibold flex items-center justify-center gap-1">
                <CalendarDays className="w-3 h-3 text-teal-600" /> Cuti
              </span>
              <p className="font-bold text-[#111827] text-sm">{stats.leave}</p>
            </div>
            <div className="space-y-0.5 col-span-2 sm:col-span-1">
              <span className="text-[10px] text-red-700 font-semibold flex items-center justify-center gap-1">
                <UserX className="w-3 h-3 text-[#EF4444]" /> Tanpa Ket.
              </span>
              <p className="font-bold text-[#111827] text-sm">{stats.absent}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
