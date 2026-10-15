import React, { useState, useId, useRef, useEffect } from 'react';
import { TrendingUp, Calendar, Info, Filter, ChevronDown, Check } from 'lucide-react';
import { TrendPoint } from '../../services/dashboardExecutiveService';

export type TrendPeriodKey = 'this_week' | 'this_month' | 'last_month';
export type TrendRange = '1W' | '4W' | TrendPeriodKey;

export interface TrendPeriodOption {
  key: TrendPeriodKey;
  label: string;
  hint?: string;
  description: string;
}

export const TREND_PERIOD_OPTIONS: TrendPeriodOption[] = [
  {
    key: 'this_week',
    label: 'Minggu ini',
    hint: 'Senin – Jumat',
    description: '5 Hari Kerja (Senin–Jumat)',
  },
  {
    key: 'this_month',
    label: 'Bulan ini',
    hint: 'Hari kerja bulan berjalan',
    description: 'Hari Kerja Bulan Ini',
  },
  {
    key: 'last_month',
    label: 'Bulan lalu',
    hint: 'Hari kerja bulan kemarin',
    description: 'Hari Kerja Bulan Lalu',
  },
];

export type TrendStatusKey = 'hadir' | 'lainnya' | 'pending' | 'alpha';

export interface TrendStatusOption {
  key: TrendStatusKey;
  label: string;
  color: string;
  getValue: (point: TrendPoint) => number;
}

export const TREND_STATUS_OPTIONS: TrendStatusOption[] = [
  {
    key: 'hadir',
    label: 'Hadir',
    color: '#F97316',
    getValue: (p) => p.hadirCount ?? p.presentCount ?? 0,
  },
  {
    key: 'lainnya',
    label: 'Sakit / Izin / Cuti',
    color: '#FB923C',
    getValue: (p) => p.lainnyaCount ?? p.excusedCount ?? 0,
  },
  {
    key: 'pending',
    label: 'Belum Presensi',
    color: '#FED7AA',
    getValue: (p) => p.pendingCount ?? 0,
  },
  {
    key: 'alpha',
    label: 'Alpha',
    color: '#D3D3D3',
    getValue: (p) => p.alphaCount ?? p.absentCount ?? 0,
  },
];

export interface AttendanceTrendChartProps {
  weeklyTrend?: TrendPoint[];
  monthlyTrend?: TrendPoint[];
  thisWeekTrend?: TrendPoint[];
  thisMonthTrend?: TrendPoint[];
  lastMonthTrend?: TrendPoint[];
  data?: TrendPoint[];
  period?: TrendPeriodKey;
  onPeriodChange?: (period: TrendPeriodKey) => void;
  range?: TrendRange;
  onRangeChange?: (range: TrendRange) => void;
  totalActiveGtk?: number;
  loading?: boolean;
  className?: string;
}

function generateSmoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return '';
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

  let path = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = i === 0 ? points[0] : points[i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i + 2 < points.length ? points[i + 2] : p2;

    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return path;
}

export const AttendanceTrendChart: React.FC<AttendanceTrendChartProps> = ({
  weeklyTrend = [],
  monthlyTrend = [],
  thisWeekTrend = [],
  thisMonthTrend = [],
  lastMonthTrend = [],
  data,
  period: controlledPeriod,
  onPeriodChange,
  range: controlledRange,
  onRangeChange,
  totalActiveGtk,
  loading = false,
  className = '',
}) => {
  const chartId = useId();
  const safeChartId = chartId.replace(/[^a-zA-Z0-9_-]/g, '_');

  // Single-select Status Filter State (Default: 'hadir')
  const [selectedStatus, setSelectedStatus] = useState<TrendStatusKey>('hadir');
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // Period Filter State (Default: 'this_week')
  const [internalPeriod, setInternalPeriod] = useState<TrendPeriodKey>('this_week');
  const [isPeriodOpen, setIsPeriodOpen] = useState(false);
  const periodRef = useRef<HTMLDivElement>(null);

  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Close dropdowns on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (filterRef.current && !filterRef.current.contains(target)) {
        setIsFilterOpen(false);
      }
      if (periodRef.current && !periodRef.current.contains(target)) {
        setIsPeriodOpen(false);
      }
    };
    if (isFilterOpen || isPeriodOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isFilterOpen, isPeriodOpen]);

  // Resolve active period with backwards compatibility for `range` prop ('1W' | '4W')
  const activePeriod: TrendPeriodKey =
    controlledPeriod ??
    (controlledRange === '4W'
      ? 'this_month'
      : controlledRange === '1W'
      ? 'this_week'
      : (controlledRange as TrendPeriodKey | undefined)) ??
    internalPeriod;

  const activePeriodOption =
    TREND_PERIOD_OPTIONS.find((p) => p.key === activePeriod) || TREND_PERIOD_OPTIONS[0];

  const handleSelectPeriod = (newPeriod: TrendPeriodKey) => {
    setHoveredIndex(null);
    setIsPeriodOpen(false);
    if (!controlledPeriod && !controlledRange) {
      setInternalPeriod(newPeriod);
    }
    onPeriodChange?.(newPeriod);
    onRangeChange?.(newPeriod === 'this_week' ? '1W' : '4W');
  };

  const handleSelectStatus = (key: TrendStatusKey) => {
    setSelectedStatus(key);
    setIsFilterOpen(false);
    setHoveredIndex(null);
  };

  const activeOption =
    TREND_STATUS_OPTIONS.find((o) => o.key === selectedStatus) || TREND_STATUS_OPTIONS[0];

  // Resolve raw data for the selected period
  let rawTrendData: TrendPoint[] = [];
  if (data !== undefined) {
    rawTrendData = data;
  } else if (activePeriod === 'this_week') {
    rawTrendData =
      thisWeekTrend.length > 0
        ? thisWeekTrend
        : weeklyTrend.length > 0
        ? weeklyTrend.filter((p) => !p.isWeekend).slice(-5)
        : [];
  } else if (activePeriod === 'this_month') {
    rawTrendData =
      thisMonthTrend.length > 0
        ? thisMonthTrend
        : monthlyTrend.length > 0
        ? monthlyTrend.filter((p) => !p.isWeekend)
        : [];
  } else if (activePeriod === 'last_month') {
    rawTrendData = lastMonthTrend;
  }

  // Filter Senin - Jumat (hilangkan weekend jika ada)
  const trendData = rawTrendData.filter((point) => !point.isWeekend);

  if (loading) {
    return (
      <div className={`bg-white border border-[#E5E7EB] rounded-2xl p-5 shadow-2xs space-y-5 animate-pulse ${className}`}>
        <div className="flex justify-between items-center">
          <div className="h-5 bg-[#E5E7EB] rounded w-44" />
          <div className="h-9 bg-[#F3F4F6] rounded-xl w-36" />
        </div>
        <div className="h-64 bg-slate-50/70 rounded-xl" />
      </div>
    );
  }

  const svgWidth = 800;
  const svgHeight = 240;
  const paddingLeft = 44;
  const paddingRight = 20;
  const paddingTop = 18;
  const paddingBottom = 42;
  const plotWidth = svgWidth - paddingLeft - paddingRight;
  const plotHeight = svgHeight - paddingTop - paddingBottom;

  // Hitung nilai maksimum berdasarkan kategori tunggal yang aktif
  const maxVal = trendData.reduce((max, point) => {
    return Math.max(max, activeOption.getValue(point));
  }, 0);

  const baselineMax = Math.max(
    activeOption.key === 'hadir' ? (totalActiveGtk || 0) : 10,
    maxVal
  );

  const calculateYMax = (rawMax: number): number => {
    if (rawMax <= 0) return 5;
    if (rawMax <= 5) return 5;
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

  // Points untuk garis status aktif
  const points = trendData.map((point, index) => {
    const x = paddingLeft + (index + 0.5) * slotWidth;
    const val = activeOption.getValue(point);
    const y = paddingTop + plotHeight - (yMax > 0 ? (val / yMax) * plotHeight : 0);
    return { x, y, val };
  });

  const linePath = generateSmoothPath(points);
  const firstX = points.length > 0 ? points[0].x : paddingLeft;
  const lastX = points.length > 0 ? points[points.length - 1].x : paddingLeft + plotWidth;
  const bottomY = paddingTop + plotHeight;
  const areaPath = points.length > 0 ? `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z` : '';

  const hoveredPoint = hoveredIndex !== null && trendData[hoveredIndex] ? trendData[hoveredIndex] : null;

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
              {activePeriodOption.description}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Grafik tren harian kategori <span className="font-semibold text-slate-700">{activeOption.label}</span> pada hari kerja efektif ({activePeriodOption.label.toLowerCase()})
          </p>
        </div>

        {/* Action Controls: Status Filter & Period Filter Dropdowns */}
        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          {/* Status Single-select Filter Dropdown */}
          <div className="relative" ref={filterRef}>
            <button
              type="button"
              onClick={() => {
                setIsFilterOpen((prev) => !prev);
                setIsPeriodOpen(false);
              }}
              aria-expanded={isFilterOpen}
              aria-haspopup="true"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200/80 rounded-xl transition-all cursor-pointer shadow-2xs"
            >
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <span
                className="w-2 h-2 rounded-full shrink-0"
                style={{ backgroundColor: activeOption.color }}
              />
              <span>{activeOption.label}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isFilterOpen ? 'rotate-180' : ''}`} />
            </button>

            {isFilterOpen && (
              <div className="absolute right-0 mt-1.5 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Pilih Status
                </div>

                <div className="py-1 px-1 space-y-0.5">
                  {TREND_STATUS_OPTIONS.map((opt) => {
                    const isSelected = selectedStatus === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => handleSelectStatus(opt.key)}
                        className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs transition-colors cursor-pointer text-left ${
                          isSelected
                            ? 'bg-orange-50 font-semibold text-slate-900'
                            : 'text-slate-600 hover:bg-slate-50 font-medium'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: opt.color }}
                          />
                          <span>{opt.label}</span>
                        </div>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-orange-600 stroke-[2.5]" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Period Filter Dropdown (Minggu ini / Bulan ini / Bulan lalu) */}
          <div className="relative" ref={periodRef}>
            <button
              type="button"
              onClick={() => {
                setIsPeriodOpen((prev) => !prev);
                setIsFilterOpen(false);
              }}
              aria-expanded={isPeriodOpen}
              aria-haspopup="true"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-50 hover:bg-slate-100 text-slate-800 border border-slate-200/80 rounded-xl transition-all cursor-pointer shadow-2xs"
            >
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>{activePeriodOption.label}</span>
              <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isPeriodOpen ? 'rotate-180' : ''}`} />
            </button>

            {isPeriodOpen && (
              <div className="absolute right-0 mt-1.5 w-48 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Pilih Periode
                </div>

                <div className="py-1 px-1 space-y-0.5">
                  {TREND_PERIOD_OPTIONS.map((opt) => {
                    const isSelected = activePeriod === opt.key;
                    return (
                      <button
                        key={opt.key}
                        type="button"
                        onClick={() => handleSelectPeriod(opt.key)}
                        className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition-colors cursor-pointer text-left ${
                          isSelected
                            ? 'bg-orange-50 font-semibold text-slate-900'
                            : 'text-slate-600 hover:bg-slate-50 font-medium'
                        }`}
                      >
                        <div className="flex flex-col">
                          <span>{opt.label}</span>
                          {opt.hint && (
                            <span className="text-[10px] text-slate-400 font-normal mt-0.5">
                              {opt.hint}
                            </span>
                          )}
                        </div>
                        {isSelected && (
                          <Check className="w-3.5 h-3.5 text-orange-600 stroke-[2.5] shrink-0 ml-2" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dynamic Single-Status Legend */}
      <div className="flex items-center gap-2 text-xs text-slate-600 pt-0.5">
        <div className="flex items-center gap-1.5">
          <span
            className="w-3.5 h-1 rounded-full shrink-0"
            style={{ backgroundColor: activeOption.color }}
            aria-hidden="true"
          />
          <span className="font-semibold text-slate-800">{activeOption.label}</span>
          <span className="text-slate-400 text-[11px]">(Garis & Area Shadow)</span>
        </div>
      </div>

      {/* Chart Canvas Area */}
      {count === 0 ? (
        <div className="h-64 flex flex-col items-center justify-center bg-slate-50/50 rounded-xl border border-dashed border-slate-200 text-center p-6">
          <Calendar className="w-8 h-8 text-slate-400 mb-2 stroke-[1.5]" />
          <p className="text-sm font-medium text-slate-700">
            Belum Ada Data untuk {activePeriodOption.label}
          </p>
          <p className="text-xs text-slate-500 mt-0.5 max-w-sm">
            Tidak ditemukan catatan presensi pada hari kerja efektif untuk periode yang dipilih.
          </p>
        </div>
      ) : (
        <div className="relative w-full overflow-hidden select-none">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-56 sm:h-64 overflow-visible"
            aria-hidden="true"
          >
            {/* Gradient definition for active status color */}
            <defs>
              <linearGradient id={`${safeChartId}-gradient`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={activeOption.color} stopOpacity="0.32" />
                <stop offset="70%" stopColor={activeOption.color} stopOpacity="0.08" />
                <stop offset="100%" stopColor={activeOption.color} stopOpacity="0.00" />
              </linearGradient>
            </defs>

            {/* Background Grid Lines & Y-Axis Labels */}
            {yTicks.map((tick, i) => {
              const y = paddingTop + plotHeight - (yMax > 0 ? (tick.val / yMax) * plotHeight : 0);
              return (
                <g key={`ytick-${i}`}>
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={paddingLeft + plotWidth}
                    y2={y}
                    stroke="#F1F5F9"
                    strokeWidth="1"
                    strokeDasharray={tick.val === 0 ? 'none' : '3 3'}
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

            {/* Area Gradient Shadow dinamis di bawah kurva */}
            {areaPath && (
              <path
                d={areaPath}
                fill={`url(#${safeChartId}-gradient)`}
                className="transition-all duration-300"
              />
            )}

            {/* Smooth Line tunggal dinamis (Strictly NO CIRCLE MARKERS) */}
            {linePath && (
              <path
                d={linePath}
                fill="none"
                stroke={activeOption.color}
                strokeWidth="2.75"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="transition-all duration-300"
              />
            )}

            {/* Hover vertical guide line */}
            {hoveredIndex !== null && (
              <line
                x1={paddingLeft + (hoveredIndex + 0.5) * slotWidth}
                y1={paddingTop}
                x2={paddingLeft + (hoveredIndex + 0.5) * slotWidth}
                y2={paddingTop + plotHeight}
                stroke={activeOption.color}
                strokeWidth="1.5"
                strokeDasharray="3 3"
                opacity="0.6"
              />
            )}

            {/* Interaction Hit Targets (Strictly NO CIRCLE DOTS) */}
            {trendData.map((point, index) => {
              const slotLeft = paddingLeft + index * slotWidth;
              const x = slotLeft + slotWidth / 2;
              const isHovered = hoveredIndex === index;

              // Tentukan apakah label X axis ditampilkan
              const shouldShowLabel =
                activePeriod === 'this_week' ||
                count <= 7 ||
                index === 0 ||
                index === count - 1 ||
                index % Math.max(1, Math.floor(count / 5)) === 0;

              return (
                <g
                  key={point.date}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <rect
                    x={slotLeft}
                    y={paddingTop}
                    width={slotWidth}
                    height={plotHeight}
                    fill="transparent"
                  />
                  {/* X-Axis Label */}
                  {shouldShowLabel && (
                    <text
                      x={x}
                      y={paddingTop + plotHeight + 16}
                      textAnchor="middle"
                      fontSize={activePeriod === 'this_week' ? '11' : '10'}
                      fontWeight={isHovered ? '600' : '500'}
                      fill={isHovered ? '#0F172A' : '#64748B'}
                      fontFamily="inherit"
                    >
                      {activePeriod === 'this_week' ? point.dayName.slice(0, 3) : point.shortDate}
                    </text>
                  )}
                </g>
              );
            })}
          </svg>

          {/* Interactive Floating Tooltip (Kategori Aktif, NO CIRCLES) */}
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
                <div className="bg-slate-900/95 text-white backdrop-blur-xs rounded-lg px-2.5 py-1.5 shadow-xl text-[11px] space-y-1 border border-slate-700/60 min-w-[160px]">
                  {/* Header Tooltip */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-700/80 pb-1">
                    <div className="font-medium text-slate-100 flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400 shrink-0" />
                      <span>
                        {hoveredPoint.dayName}, {hoveredPoint.shortDate}
                      </span>
                    </div>
                  </div>

                  {/* Nilai Kategori Aktif */}
                  <div className="space-y-0.5">
                    <div className="flex items-center justify-between text-slate-300">
                      <span className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-xs shrink-0"
                          style={{ backgroundColor: activeOption.color }}
                        />
                        {activeOption.label}:
                      </span>
                      <span className="font-semibold text-white">
                        {activeOption.getValue(hoveredPoint)} GTK
                      </span>
                    </div>
                  </div>

                  {/* Ringkasan Tingkat Kehadiran jika Hadir aktif */}
                  {activeOption.key === 'hadir' && (
                    <div className="border-t border-slate-700/80 pt-1 flex items-center justify-between text-[10px]">
                      <span className="text-slate-400">Tingkat Hadir:</span>
                      <span className="font-bold text-emerald-400">
                        {hoveredPoint.attendanceRate}%
                      </span>
                    </div>
                  )}
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
            {activePeriod === 'this_week'
              ? 'Menampilkan 5 hari kerja efektif minggu ini (Senin–Jumat)'
              : activePeriod === 'this_month'
              ? `Menampilkan ${trendData.length} hari kerja efektif bulan ini`
              : `Menampilkan ${trendData.length} hari kerja efektif bulan lalu`}
          </span>
        </div>
        <span className="hidden sm:inline shrink-0">Satuan: Jumlah GTK</span>
      </div>
    </div>
  );
};

export default AttendanceTrendChart;
