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

// Helper component for single 270° Arc Ring (Group A & Group D)
const SingleArcRing270: React.FC<{
  percentage: number;
  color: string;
  size?: number;
  strokeWidth?: number;
  centerContent?: React.ReactNode;
  icon?: React.ReactNode;
}> = ({ percentage, color, size = 135, strokeWidth = 8, centerContent, icon }) => {
  const center = size / 2;
  const radius = center - strokeWidth - 4;
  const circumference = 2 * Math.PI * radius;
  const trackLength = 0.75 * circumference;

  const clampedPercentage = Math.min(100, Math.max(0, percentage || 0));
  const progressLength = (clampedPercentage / 100) * trackLength;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        {/* Background Track Arc (270° with 90° gap in top-left) */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#E5E7EB"
          strokeWidth={strokeWidth}
          strokeDasharray={`${trackLength} ${circumference}`}
          strokeLinecap="round"
          transform={`rotate(-90 ${center} ${center})`}
        />
        {/* Progress Fill Arc */}
        {progressLength > 0 && (
          <circle
            cx={center}
            cy={center}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={`${progressLength} ${circumference}`}
            strokeLinecap="round"
            transform={`rotate(-90 ${center} ${center})`}
            className="transition-all duration-500 ease-out"
          />
        )}
      </svg>

      {/* Top-Left Gap Icon */}
      {icon && (
        <div className="absolute top-0.5 left-0.5 transform -translate-x-0.5 -translate-y-0.5 bg-white rounded-full p-1 shadow-2xs border border-[#E5E7EB]">
          {icon}
        </div>
      )}

      {/* Center Content */}
      {centerContent && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
          {centerContent}
        </div>
      )}
    </div>
  );
};

// Helper component for Triple Concentric 270° Arc Rings (Group B & Group C)
interface RingLayer {
  percentage: number;
  color: string;
}

const TripleArcRing270: React.FC<{
  layers: [RingLayer, RingLayer, RingLayer];
  size?: number;
  strokeWidth?: number;
  centerContent?: React.ReactNode;
}> = ({ layers, size = 135, strokeWidth = 5.5, centerContent }) => {
  const center = size / 2;
  const gap = 3.5;

  const radiuses = [
    center - strokeWidth - 4,
    center - strokeWidth * 2 - gap - 4,
    center - strokeWidth * 3 - gap * 2 - 4,
  ];

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        {layers.map((layer, idx) => {
          const r = radiuses[idx];
          const circumference = 2 * Math.PI * r;
          const trackLength = 0.75 * circumference;
          const clamped = Math.min(100, Math.max(0, layer.percentage || 0));
          const progressLength = (clamped / 100) * trackLength;

          return (
            <g key={idx}>
              {/* Background Track Arc */}
              <circle
                cx={center}
                cy={center}
                r={r}
                fill="none"
                stroke="#E5E7EB"
                strokeWidth={strokeWidth}
                strokeDasharray={`${trackLength} ${circumference}`}
                strokeLinecap="round"
                transform={`rotate(-90 ${center} ${center})`}
              />
              {/* Progress Fill Arc */}
              {progressLength > 0 && (
                <circle
                  cx={center}
                  cy={center}
                  r={r}
                  fill="none"
                  stroke={layer.color}
                  strokeWidth={strokeWidth}
                  strokeDasharray={`${progressLength} ${circumference}`}
                  strokeLinecap="round"
                  transform={`rotate(-90 ${center} ${center})`}
                  className="transition-all duration-500 ease-out"
                />
              )}
            </g>
          );
        })}
      </svg>

      {/* Center Content */}
      {centerContent && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-2">
          {centerContent}
        </div>
      )}
    </div>
  );
};

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
  // Compute statistics strictly for statsMonth
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
      totalEvaluatedDays: statsData.length,
    };
  }, [matrixData, statsMonth]);

  const monthLabel = MONTH_NAMES_INDONESIAN[statsMonth.month] || '';

  return (
    <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-6 shadow-2xs space-y-6">
      {/* Header: Title, Active Context & Dropdown Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#FFF7ED] border border-orange-200 text-[#F97316]">
            <CalendarCheck className="w-5 h-5" />
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
            className="bg-white border border-[#E5E7EB] rounded-xl px-3 py-1.5 text-xs font-semibold text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#F97316]"
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
            className="bg-white border border-[#E5E7EB] rounded-xl px-3 py-1.5 text-xs font-semibold text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#F97316]"
          >
            {[2024, 2025, 2026, 2027].map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Content State: Loading, Error, or 4 Circular Multi-Layer Progress Rings 270° */}
      {isLoading ? (
        <div className="min-h-[160px] flex flex-col items-center justify-center gap-3 py-6">
          <div className="w-7 h-7 border-3 border-[#F97316] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-[#6B7280]">Memuat statistik kehadiran...</p>
        </div>
      ) : error ? (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-center text-xs text-red-700">
          Gagal memuat statistik kehadiran: {error}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 items-start pt-2">
          
          {/* Kelompok A: Persentase Kehadiran */}
          <div className="flex flex-col items-center text-center space-y-2 p-2">
            <SingleArcRing270
              percentage={stats.rawPercentage || 0}
              color="#F97316"
              size={135}
              strokeWidth={8}
              centerContent={
                <span className="text-xl sm:text-2xl font-extrabold text-[#111827] tracking-tight">
                  {stats.percentageText}
                </span>
              }
            />
            <div className="space-y-0.5">
              <h4 className="text-xs font-bold text-[#374151] uppercase tracking-wider">
                Persentase Kehadiran
              </h4>
              <p className="text-[11px] text-[#6B7280] font-medium">
                {stats.totalAttendance} dari {stats.effectiveWorkingDays} Hari Efektif
              </p>
            </div>
          </div>

          {/* Kelompok B: Status Hadir */}
          <div className="flex flex-col items-center text-center space-y-2 p-2">
            <TripleArcRing270
              layers={[
                {
                  percentage: stats.effectiveWorkingDays > 0 ? (stats.presentOnTime / stats.effectiveWorkingDays) * 100 : 0,
                  color: '#10B981', // Emerald main
                },
                {
                  percentage: stats.effectiveWorkingDays > 0 ? (stats.presentLate / stats.effectiveWorkingDays) * 100 : 0,
                  color: '#34D399', // Emerald medium
                },
                {
                  percentage: stats.effectiveWorkingDays > 0 ? (stats.officialDuty / stats.effectiveWorkingDays) * 100 : 0,
                  color: '#6EE7B7', // Emerald light
                },
              ]}
              size={135}
              strokeWidth={5.5}
              centerContent={
                <span className="text-xl sm:text-2xl font-extrabold text-emerald-900 tracking-tight">
                  {stats.effectiveWorkingDays > 0 ? stats.totalAttendance : '—'}
                </span>
              }
            />
            <div className="space-y-1 w-full max-w-[160px]">
              <h4 className="text-xs font-bold text-[#374151] uppercase tracking-wider">
                Status Hadir
              </h4>
              <div className="text-[10px] space-y-1 text-left text-[#4B5563] pt-0.5">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#10B981] shrink-0" />
                    Tepat Waktu
                  </span>
                  <span className="font-bold text-[#111827]">{stats.presentOnTime}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <ClockAlert className="w-3.5 h-3.5 text-[#34D399] shrink-0" />
                    Terlambat
                  </span>
                  <span className="font-bold text-[#111827]">{stats.presentLate}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <BriefcaseBusiness className="w-3.5 h-3.5 text-[#6EE7B7] shrink-0" />
                    Dinas Luar
                  </span>
                  <span className="font-bold text-[#111827]">{stats.officialDuty}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Kelompok C: Perizinan */}
          <div className="flex flex-col items-center text-center space-y-2 p-2">
            <TripleArcRing270
              layers={[
                {
                  percentage: stats.effectiveWorkingDays > 0 ? (stats.sick / stats.effectiveWorkingDays) * 100 : 0,
                  color: '#F59E0B', // Amber main
                },
                {
                  percentage: stats.effectiveWorkingDays > 0 ? (stats.permit / stats.effectiveWorkingDays) * 100 : 0,
                  color: '#FBBF24', // Amber medium
                },
                {
                  percentage: stats.effectiveWorkingDays > 0 ? (stats.leave / stats.effectiveWorkingDays) * 100 : 0,
                  color: '#FDE68A', // Amber light
                },
              ]}
              size={135}
              strokeWidth={5.5}
              centerContent={
                <span className="text-xl sm:text-2xl font-extrabold text-amber-900 tracking-tight">
                  {stats.effectiveWorkingDays > 0 ? stats.sick + stats.permit + stats.leave : '—'}
                </span>
              }
            />
            <div className="space-y-1 w-full max-w-[160px]">
              <h4 className="text-xs font-bold text-[#374151] uppercase tracking-wider">
                Perizinan
              </h4>
              <div className="text-[10px] space-y-1 text-left text-[#4B5563] pt-0.5">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <Thermometer className="w-3.5 h-3.5 text-[#F59E0B] shrink-0" />
                    Sakit
                  </span>
                  <span className="font-bold text-[#111827]">{stats.sick}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <FileCheck className="w-3.5 h-3.5 text-[#FBBF24] shrink-0" />
                    Izin
                  </span>
                  <span className="font-bold text-[#111827]">{stats.permit}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <CalendarDays className="w-3.5 h-3.5 text-[#FDE68A] shrink-0" />
                    Cuti
                  </span>
                  <span className="font-bold text-[#111827]">{stats.leave}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Kelompok D: Alfa */}
          <div className="flex flex-col items-center text-center space-y-2 p-2">
            <SingleArcRing270
              percentage={stats.effectiveWorkingDays > 0 ? (stats.absent / stats.effectiveWorkingDays) * 100 : 0}
              color="#EF4444"
              size={135}
              strokeWidth={8}
              centerContent={
                <span className="text-xl sm:text-2xl font-extrabold text-red-600 tracking-tight">
                  {stats.effectiveWorkingDays > 0 ? stats.absent : '—'}
                </span>
              }
            />
            <div className="space-y-1 w-full max-w-[160px]">
              <h4 className="text-xs font-bold text-[#374151] uppercase tracking-wider">
                Alfa
              </h4>
              <div className="text-[10px] space-y-1 text-left text-[#4B5563] pt-0.5">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 font-medium">
                    <UserX className="w-3.5 h-3.5 text-[#EF4444] shrink-0" />
                    Tanpa Keterangan
                  </span>
                  <span className="font-bold text-[#111827]">{stats.absent}</span>
                </div>
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
