import React, { useState, useId } from 'react';
import { BarChart3, Calendar, Info } from 'lucide-react';
import { TrendPoint } from '../../services/dashboardExecutiveService';
import { ATTENDANCE_STATUS_TOKENS } from '../../config/statusColors';

export type TrendRange = '1W' | '4W';

export interface AttendanceTrendChartProps {
  /**
   * Data tren 7 hari terakhir (1W).
   */
  weeklyTrend?: TrendPoint[];
  /**
   * Data tren 30 hari terakhir (4W).
   */
  monthlyTrend?: TrendPoint[];
  /**
   * Direct array override jika komponen dikontrol sepenuhnya dari luar.
   */
  data?: TrendPoint[];
  /**
   * Rentang aktif saat ini (controlled mode).
   */
  range?: TrendRange;
  /**
   * Callback saat user mengganti rentang 1W / 4W.
   */
  onRangeChange?: (range: TrendRange) => void;
  /**
   * Total GTK aktif sebagai patokan batas atas skala visual (opsional).
   */
  totalActiveGtk?: number;
  /**
   * Status loading skeleton.
   */
  loading?: boolean;
  /**
   * CSS class tambahan untuk root wrapper.
   */
  className?: string;
}

export const AttendanceTrendChart: React.FC<AttendanceTrendChartProps> = ({
  weeklyTrend = [],
  monthlyTrend = [],
  data,
  range: controlledRange,
  onRangeChange,
  totalActiveGtk,
  loading = false,
  className = '',
}) => {
  const chartId = useId();
  const safeChartId = chartId.replace(/[^a-zA-Z0-9_-]/g, '_');
  const [internalRange, setInternalRange] = useState<TrendRange>('1W');
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const activeRange = controlledRange ?? internalRange;

  const handleRangeChange = (newRange: TrendRange) => {
    setHoveredIndex(null);
    if (!controlledRange) {
      setInternalRange(newRange);
    }
    onRangeChange?.(newRange);
  };

  // Tentukan dataset aktif berdasarkan prop data atau range yang dipilih
  const rawTrendData: TrendPoint[] =
    data !== undefined
      ? data
      : activeRange === '1W'
      ? weeklyTrend
      : monthlyTrend;

  // Hanya tampilkan hari kerja (Senin - Jumat dan bukan hari libur kalender)
  const workingDaysOnly = rawTrendData.filter(
    (point) => !point.isWeekend && !point.isHoliday
  );

  // Jika hasil filter kosong (misal periode libur panjang), tetap gunakan rawTrendData agar chart tidak blank
  const trendData: TrendPoint[] =
    workingDaysOnly.length > 0 ? workingDaysOnly : rawTrendData;

  // Loading skeleton state
  if (loading) {
    return (
      <div
        className={`bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-2xs space-y-5 animate-pulse ${className}`}
        aria-busy="true"
        aria-label="Memuat grafik tren presensi"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1.5">
            <div className="h-5 bg-[#E5E7EB] rounded w-44" />
            <div className="h-3.5 bg-[#F3F4F6] rounded w-64" />
          </div>
          <div className="h-9 bg-[#F3F4F6] rounded-xl w-36" />
        </div>

        <div className="h-64 bg-slate-50/70 rounded-xl flex items-end justify-between p-6 gap-2">
          {[40, 65, 80, 50, 75, 85, 60].map((h, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-2">
              <div
                className="w-full max-w-[36px] bg-[#E5E7EB] rounded-t"
                style={{ height: `${h}%` }}
              />
              <div className="h-3 bg-[#F3F4F6] rounded w-8" />
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-1">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[#E5E7EB]" />
              <div className="h-3 bg-[#F3F4F6] rounded w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Parameter geometri SVG
  const svgWidth = 800;
  const svgHeight = 240;
  const paddingLeft = 44;
  const paddingRight = 20;
  const paddingTop = 18;
  const paddingBottom = 42;
  const plotWidth = svgWidth - paddingLeft - paddingRight;
  const plotHeight = svgHeight - paddingTop - paddingBottom;

  // Hitung skala maksimum stacked bar
  const maxStackValue = trendData.reduce((max, point) => {
    const totalDay =
      (point.hadirCount ?? point.presentCount ?? 0) +
      (point.pendingCount ?? 0) +
      (point.alphaCount ?? point.absentCount ?? 0) +
      (point.lainnyaCount ?? point.excusedCount ?? 0);
    return Math.max(max, totalDay);
  }, 0);

  const baselineMax = Math.max(totalActiveGtk || 0, maxStackValue);
  // Bulatkan ke kelipatan 5 atau 10 terdekat untuk Y-axis yang rapi
  const calculateYMax = (rawMax: number): number => {
    if (rawMax <= 0) return 10;
    if (rawMax <= 10) return 10;
    if (rawMax <= 25) return 25;
    if (rawMax <= 50) return 50;
    const remainder = rawMax % 10;
    return remainder === 0 ? rawMax : rawMax + (10 - remainder);
  };

  const yMax = calculateYMax(baselineMax);
  const yTicks = [
    { label: `${yMax}`, val: yMax },
    { label: `${Math.round(yMax * 0.75)}`, val: yMax * 0.75 },
    { label: `${Math.round(yMax * 0.5)}`, val: yMax * 0.5 },
    { label: `${Math.round(yMax * 0.25)}`, val: yMax * 0.25 },
    { label: '0', val: 0 },
  ];

  const count = trendData.length;
  const slotWidth = count > 0 ? plotWidth / count : plotWidth;
  // Bar width lebih lebar untuk 1W (7 hari) dan proporsional untuk 4W (30 hari)
  const barWidth = count <= 7 ? Math.min(38, slotWidth * 0.45) : Math.max(9, slotWidth * 0.65);

  const hoveredPoint = hoveredIndex !== null ? trendData[hoveredIndex] : null;

  return (
    <div
      className={`bg-white border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4 ${className}`}
      aria-labelledby={`${chartId}-title`}
    >
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <h3
              id={`${chartId}-title`}
              className="text-base font-semibold text-slate-900 tracking-tight"
            >
              Tren Kehadiran GTK
            </h3>
            <span className="hidden sm:inline-block text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-500 font-medium">
              {activeRange === '1W' ? '7 Hari Terakhir (Hari Kerja)' : '30 Hari Terakhir (Hari Kerja)'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Komposisi kumulatif hadir, belum presensi, alpha, dan lainnya pada hari kerja
          </p>
        </div>

        {/* Filter Toggle Segmented Control */}
        <div
          className="inline-flex items-center self-start sm:self-auto p-1 bg-slate-100/90 rounded-xl border border-slate-200/60"
          role="group"
          aria-label="Pilihan rentang tren presensi"
        >
          <button
            type="button"
            onClick={() => handleRangeChange('1W')}
            aria-pressed={activeRange === '1W'}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
              activeRange === '1W'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            1W <span className="hidden md:inline">(7 Hari)</span>
          </button>
          <button
            type="button"
            onClick={() => handleRangeChange('4W')}
            aria-pressed={activeRange === '4W'}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
              activeRange === '4W'
                ? 'bg-white text-slate-900 shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            4W <span className="hidden md:inline">(30 Hari)</span>
          </button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-slate-600 pt-0.5">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-xs bg-[#39805A]" aria-hidden="true" />
          <span>Hadir</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-xs bg-[#64748B]" aria-hidden="true" />
          <span>Belum Presensi</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-xs bg-[#F4382C]" aria-hidden="true" />
          <span>Alpha</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-xs bg-[#8669AC]" aria-hidden="true" />
          <span>Lainnya (Sakit/Izin/Cuti)</span>
        </div>
      </div>

      {/* Chart Canvas Area */}
      {count === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200 text-center p-6">
          <BarChart3 className="w-8 h-8 text-slate-400 mb-2" />
          <p className="text-sm font-medium text-slate-700">Belum Ada Data Tren</p>
          <p className="text-xs text-slate-500 mt-0.5 max-w-sm">
            Data presensi untuk rentang tanggal ini belum tersedia dalam sistem.
          </p>
        </div>
      ) : (
        <div className="relative w-full overflow-visible select-none">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-auto overflow-visible block"
            role="img"
            aria-label="Grafik tren kehadiran GTK"
          >
            {/* Definitions: Clip paths untuk rounded corners pada seluruh stacked bar */}
            <defs>
              {trendData.map((point, index) => {
                const centerX = paddingLeft + (index + 0.5) * slotWidth;
                const barX = centerX - barWidth / 2;
                const hadirH = ((point.hadirCount ?? point.presentCount ?? 0) / yMax) * plotHeight;
                const pendingH = ((point.pendingCount ?? 0) / yMax) * plotHeight;
                const alphaH = ((point.alphaCount ?? point.absentCount ?? 0) / yMax) * plotHeight;
                const lainnyaH = ((point.lainnyaCount ?? point.excusedCount ?? 0) / yMax) * plotHeight;
                const totalBarHeight = hadirH + pendingH + alphaH + lainnyaH;
                const totalBarTop = paddingTop + plotHeight - totalBarHeight;
                const barRadius = Math.max(2, Math.min(Math.round(barWidth * 0.2), 6));

                return (
                  <clipPath
                    key={`clip-${point.date}-${index}`}
                    id={`${safeChartId}-bar-clip-${index}`}
                  >
                    <rect
                      x={barX}
                      y={totalBarTop}
                      width={barWidth}
                      height={totalBarHeight}
                      rx={barRadius}
                      ry={barRadius}
                    />
                  </clipPath>
                );
              })}
            </defs>

            {/* Grid Lines & Y-Axis Labels */}
            {yTicks.map((tick, idx) => {
              const y = paddingTop + plotHeight - (tick.val / yMax) * plotHeight;
              return (
                <g key={idx}>
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={svgWidth - paddingRight}
                    y2={y}
                    stroke="#F1F5F9"
                    strokeWidth="1"
                    strokeDasharray={idx === yTicks.length - 1 ? 'none' : '3 3'}
                  />
                  <text
                    x={paddingLeft - 8}
                    y={y + 3.5}
                    textAnchor="end"
                    fontSize="10"
                    fill="#94A3B8"
                    fontFamily="inherit"
                  >
                    {tick.label}
                  </text>
                </g>
              );
            })}

            {/* Bars and Columns */}
            {trendData.map((point, index) => {
              const centerX = paddingLeft + (index + 0.5) * slotWidth;
              const barX = centerX - barWidth / 2;
              const isHovered = hoveredIndex === index;
              const isNonWorkingDay = point.isWeekend || point.isHoliday;

              // Hitung ketinggian setiap stack
              const hadirH = ((point.hadirCount ?? point.presentCount ?? 0) / yMax) * plotHeight;
              const pendingH = ((point.pendingCount ?? 0) / yMax) * plotHeight;
              const alphaH = ((point.alphaCount ?? point.absentCount ?? 0) / yMax) * plotHeight;
              const lainnyaH = ((point.lainnyaCount ?? point.excusedCount ?? 0) / yMax) * plotHeight;
              const totalBarHeight = hadirH + pendingH + alphaH + lainnyaH;

              // Titik awal dari bawah ke atas
              let currentBottom = paddingTop + plotHeight;

              const hadirY = currentBottom - hadirH;
              currentBottom = hadirY;

              const pendingY = currentBottom - pendingH;
              currentBottom = pendingY;

              const alphaY = currentBottom - alphaH;
              currentBottom = alphaY;

              const lainnyaY = currentBottom - lainnyaH;

              // Tentukan apakah label X-axis ditampilkan (hindari tabrakan di 4W)
              let showXLabel = true;
              if (activeRange === '4W') {
                showXLabel =
                  index === 0 ||
                  index === count - 1 ||
                  index % 5 === 0;
              }

              return (
                <g
                  key={point.date}
                  className="cursor-pointer transition-opacity duration-150"
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  role="graphics-symbol"
                  aria-label={`${point.dayName}, ${point.shortDate}: ${point.hadirCount ?? point.presentCount} hadir`}
                >
                  {/* Kolom latar belakang untuk akhir pekan / hari libur */}
                  {isNonWorkingDay && (
                    <rect
                      x={centerX - slotWidth / 2 + 1}
                      y={paddingTop}
                      width={Math.max(2, slotWidth - 2)}
                      height={plotHeight}
                      fill="#F8FAFC"
                      rx="3"
                    />
                  )}

                  {/* Highlight hover column */}
                  {isHovered && (
                    <rect
                      x={centerX - slotWidth / 2 + 1}
                      y={paddingTop}
                      width={Math.max(2, slotWidth - 2)}
                      height={plotHeight}
                      fill="#F1F5F9"
                      fillOpacity="0.8"
                      rx="4"
                    />
                  )}

                  {/* Stack Segments with Rounded Outer Corners via SVG clipPath */}
                  {totalBarHeight > 0 && (
                    <g clipPath={`url(#${safeChartId}-bar-clip-${index})`}>
                      {/* 1. Hadir (#39805A) */}
                      {hadirH > 0 && (
                        <rect
                          x={barX}
                          y={hadirY}
                          width={barWidth}
                          height={hadirH}
                          fill="#39805A"
                          className="transition-all duration-150"
                        />
                      )}

                      {/* 2. Belum Presensi (#64748B) */}
                      {pendingH > 0 && (
                        <rect
                          x={barX}
                          y={pendingY}
                          width={barWidth}
                          height={pendingH}
                          fill="#64748B"
                          className="transition-all duration-150"
                        />
                      )}

                      {/* 3. Alpha (#F4382C) */}
                      {alphaH > 0 && (
                        <rect
                          x={barX}
                          y={alphaY}
                          width={barWidth}
                          height={alphaH}
                          fill="#F4382C"
                          className="transition-all duration-150"
                        />
                      )}

                      {/* 4. Lainnya (#8669AC) */}
                      {lainnyaH > 0 && (
                        <rect
                          x={barX}
                          y={lainnyaY}
                          width={barWidth}
                          height={lainnyaH}
                          fill="#8669AC"
                          className="transition-all duration-150"
                        />
                      )}
                    </g>
                  )}

                  {/* X-Axis Label */}
                  {showXLabel && (
                    <g>
                      <text
                        x={centerX}
                        y={paddingTop + plotHeight + 16}
                        textAnchor="middle"
                        fontSize={activeRange === '1W' ? '11' : '10'}
                        fontWeight={isHovered ? '600' : '500'}
                        fill={isHovered ? '#0F172A' : '#64748B'}
                        fontFamily="inherit"
                      >
                        {activeRange === '1W'
                          ? point.dayName.slice(0, 3)
                          : point.shortDate.split(' ')[0]}
                      </text>
                      {activeRange === '1W' && (
                        <text
                          x={centerX}
                          y={paddingTop + plotHeight + 28}
                          textAnchor="middle"
                          fontSize="9.5"
                          fill={isNonWorkingDay ? '#94A3B8' : '#94A3B8'}
                          fontFamily="inherit"
                        >
                          {point.shortDate}
                        </text>
                      )}
                    </g>
                  )}

                  {/* Transparan touch/click target overlay */}
                  <rect
                    x={centerX - slotWidth / 2}
                    y={paddingTop}
                    width={slotWidth}
                    height={plotHeight + paddingBottom}
                    fill="transparent"
                  />
                </g>
              );
            })}
          </svg>

          {/* Interactive Floating Tooltip */}
          {hoveredPoint && hoveredIndex !== null && (() => {
            const ratio = count > 1 ? hoveredIndex / (count - 1) : 0.5;
            let transformClass = '-translate-x-1/2';
            if (ratio < 0.25) {
              transformClass = 'translate-x-0';
            } else if (ratio > 0.75) {
              transformClass = '-translate-x-full';
            }

            return (
              <div
                className={`absolute z-30 pointer-events-none transform ${transformClass} transition-all duration-75`}
                style={{
                  left: `${
                    ((paddingLeft + (hoveredIndex + 0.5) * slotWidth) / svgWidth) * 100
                  }%`,
                  top: '4px',
                }}
              >
                <div className="bg-slate-900/95 text-white backdrop-blur-xs rounded-lg px-2.5 py-1.5 shadow-xl text-[11px] space-y-1 border border-slate-700/60 min-w-[170px]">
                  {/* Header Tooltip */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-700/80 pb-1">
                    <div className="font-medium text-slate-100 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>
                        {hoveredPoint.dayName}, {hoveredPoint.shortDate}
                      </span>
                    </div>
                    {hoveredPoint.isHoliday ? (
                      <span className="text-[9px] bg-rose-900/80 text-rose-200 px-1 py-0.2 rounded-xs">
                        Libur
                      </span>
                    ) : hoveredPoint.isWeekend ? (
                      <span className="text-[9px] bg-slate-800 text-slate-300 px-1 py-0.2 rounded-xs">
                        Weekend
                      </span>
                    ) : null}
                  </div>

                  {/* Komposisi Presensi */}
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-xs bg-[#39805A] shrink-0" />
                        Hadir:
                      </span>
                      <span className="font-semibold text-white">
                        {hoveredPoint.hadirCount ?? hoveredPoint.presentCount} GTK
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-xs bg-[#64748B] shrink-0" />
                        Belum Presensi:
                      </span>
                      <span className="font-semibold text-white">
                        {hoveredPoint.pendingCount ?? 0} GTK
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-xs bg-[#F4382C] shrink-0" />
                        Alpha:
                      </span>
                      <span className="font-semibold text-white">
                        {hoveredPoint.alphaCount ?? hoveredPoint.absentCount} GTK
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-xs bg-[#8669AC] shrink-0" />
                        Lainnya:
                      </span>
                      <span className="font-semibold text-white">
                        {hoveredPoint.lainnyaCount ?? hoveredPoint.excusedCount} GTK
                      </span>
                    </div>
                  </div>

                  {/* Ringkasan Kehadiran */}
                  <div className="border-t border-slate-700/80 pt-1 flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">Tingkat Hadir:</span>
                    <span className="font-bold text-emerald-400">
                      {hoveredPoint.attendanceRate}%
                    </span>
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Footer Info note */}
      <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-[11px] text-slate-400 mt-auto">
        <div className="flex items-center gap-1.5">
          <Info className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <span>
            {activeRange === '1W'
              ? 'Menampilkan hari kerja (Senin–Jumat) dalam rentang 7 hari terakhir'
              : 'Menampilkan hari kerja (Senin–Jumat) dalam rentang 30 hari terakhir'}
          </span>
        </div>
        <span className="hidden sm:inline shrink-0">Satuan: Jumlah GTK</span>
      </div>
    </div>
  );
};

export default AttendanceTrendChart;
