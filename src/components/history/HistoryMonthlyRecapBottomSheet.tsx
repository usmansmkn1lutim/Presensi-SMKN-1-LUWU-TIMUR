import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { X, BarChart3, Clock, CalendarDays, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';
import {
  AttendanceHistoryRecord,
  OfficialMonthlyRecapSummary,
} from '../../types/attendanceHistory.types';

interface HistoryMonthlyRecapBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  currentDate: Date;
  summary: OfficialMonthlyRecapSummary | null;
  records: AttendanceHistoryRecord[];
  loading?: boolean;
}

export const HistoryMonthlyRecapBottomSheet: React.FC<HistoryMonthlyRecapBottomSheetProps> = ({
  isOpen,
  onClose,
  currentDate,
  summary,
  records,
  loading = false,
}) => {
  const [dragY, setDragY] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isClosing, setIsClosing] = useState<boolean>(false);

  const startYRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const isPointerDownRef = useRef<boolean>(false);
  const sheetRef = useRef<HTMLDivElement>(null);

  // Smooth exit transition handler
  const handleClose = useCallback(() => {
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
      setDragY(0);
      setIsDragging(false);
    }, 250);
  }, [isClosing, onClose]);

  // Reset drag states whenever modal opens or closes
  useEffect(() => {
    if (isOpen) {
      setDragY(0);
      setIsDragging(false);
      setIsClosing(false);
    }
  }, [isOpen]);

  // Lock body scroll when modal is open and listen for ESC
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, handleClose]);

  // Swipe-down Pointer Events on Header / Drag Handle area
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only primary button
    if (e.button !== 0) return;

    // Do not initiate drag if tapping on a button or interactive child
    const target = e.target as HTMLElement;
    if (target.closest('button, a, input')) return;

    isPointerDownRef.current = true;
    startYRef.current = e.clientY;
    startTimeRef.current = Date.now();
    setIsDragging(true);

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignore if pointer capture fails
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDownRef.current) return;

    const deltaY = e.clientY - startYRef.current;

    // Upward pull resistance (clamped to prevent awkward upward stretch)
    const clampedY = deltaY < 0 ? Math.max(deltaY * 0.1, -8) : deltaY;
    setDragY(clampedY);
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore
    }

    const deltaY = e.clientY - startYRef.current;
    const duration = Math.max(Date.now() - startTimeRef.current, 1);
    const avgVelocity = deltaY / duration; // px per ms

    // Thresholds:
    // 1. Distance: pulled down >= 100px
    // 2. Velocity: pulled down >= 35px with quick flick (velocity >= 0.45 px/ms)
    const shouldDismiss = deltaY >= 100 || (deltaY >= 35 && avgVelocity >= 0.45);

    if (shouldDismiss) {
      handleClose();
    } else {
      // Revert smoothly
      setDragY(0);
      setIsDragging(false);
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDownRef.current) return;
    isPointerDownRef.current = false;

    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignore
    }

    setDragY(0);
    setIsDragging(false);
  };

  // Formatted period label (e.g. "Oktober 2026")
  const formattedMonthYear = useMemo(() => {
    return currentDate.toLocaleDateString('id-ID', {
      month: 'long',
      year: 'numeric',
    });
  }, [currentDate]);

  // Detailed status counts
  const onTimeCount = useMemo(() => {
    return records.filter(
      (r) => r.official_status === 'present' && r.check_in_status !== 'late'
    ).length;
  }, [records]);

  const lateCount = useMemo(() => {
    return records.filter(
      (r) => r.official_status === 'present' && r.check_in_status === 'late'
    ).length;
  }, [records]);

  const officialDutyCount = useMemo(() => {
    return (
      summary?.officialDuty ??
      records.filter((r) => r.official_status === 'official_duty').length
    );
  }, [records, summary]);

  const sickCount = useMemo(() => {
    return (
      summary?.sick ?? records.filter((r) => r.official_status === 'sick').length
    );
  }, [records, summary]);

  const permitCount = useMemo(() => {
    return (
      summary?.permit ??
      records.filter((r) => r.official_status === 'permit').length
    );
  }, [records, summary]);

  const leaveCount = useMemo(() => {
    return (
      summary?.leave ??
      records.filter((r) => r.official_status === 'leave').length
    );
  }, [records, summary]);

  const absentCount = useMemo(() => {
    return (
      summary?.absent ??
      records.filter((r) => r.official_status === 'absent').length
    );
  }, [records, summary]);

  // Section A Metrics:
  // Total Kehadiran = Hadir tepat waktu + Terlambat + Dinas Luar
  const totalPresent = onTimeCount + lateCount + officialDutyCount;

  // Total Hari Kerja = total of all work-day evaluated statuses (Hadir, Dinas Luar, Sakit, Izin, Cuti, Alfa)
  const totalWorkDays =
    totalPresent + sickCount + permitCount + leaveCount + absentCount;

  // Persentase Kehadiran (%)
  const attendancePercentage =
    totalWorkDays > 0 ? Math.round((totalPresent / totalWorkDays) * 100) : 0;

  // Section B: Horizontal Bar Chart data (7 official statuses - All using Orange Sunset #F97316)
  const chartItems = useMemo(() => {
    const items = [
      {
        label: 'Hadir Tepat Waktu',
        count: onTimeCount,
        colorBg: 'bg-[#F97316]',
      },
      {
        label: 'Terlambat',
        count: lateCount,
        colorBg: 'bg-[#F97316]',
      },
      {
        label: 'Dinas Luar',
        count: officialDutyCount,
        colorBg: 'bg-[#F97316]',
      },
      {
        label: 'Sakit',
        count: sickCount,
        colorBg: 'bg-[#F97316]',
      },
      {
        label: 'Izin',
        count: permitCount,
        colorBg: 'bg-[#F97316]',
      },
      {
        label: 'Cuti',
        count: leaveCount,
        colorBg: 'bg-[#F97316]',
      },
      {
        label: 'Alfa',
        count: absentCount,
        colorBg: 'bg-[#F97316]',
      },
    ];

    const maxVal = Math.max(
      totalWorkDays > 0 ? totalWorkDays : 1,
      ...items.map((i) => i.count)
    );

    return items.map((item) => {
      const pct = maxVal > 0 ? (item.count / maxVal) * 100 : 0;
      return {
        ...item,
        percentage: item.count > 0 ? Math.max(pct, 5) : 0,
      };
    });
  }, [
    onTimeCount,
    lateCount,
    officialDutyCount,
    sickCount,
    permitCount,
    leaveCount,
    absentCount,
    totalWorkDays,
  ]);

  // Section C: Daily detail records sorted chronologically (1st of month to end of month)
  const dailyDetailRecords = useMemo(() => {
    return [...records]
      .filter((r) => {
        return (
          r.official_status &&
          ['present', 'official_duty', 'sick', 'permit', 'leave', 'absent'].includes(
            r.official_status
          )
        );
      })
      .sort((a, b) => a.attendance_date.localeCompare(b.attendance_date));
  }, [records]);

  // Helper date formatter: "Kamis, 01 Okt 2026"
  const formatDayDate = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('-').map(Number);
      const dateObj = new Date(y, m - 1, d);
      return dateObj.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  // Helper time formatter: "07:15 WITA"
  const formatTime = (timeStr: string | null | undefined) => {
    if (!timeStr) return '--:--';
    try {
      if (timeStr.includes('T')) {
        const d = new Date(timeStr);
        return (
          d.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'Asia/Makassar',
          }) + ' WITA'
        );
      }
      return timeStr.slice(0, 5) + ' WITA';
    } catch {
      return timeStr;
    }
  };

  // Helper status badge resolver for daily detail
  const getDailyStatusBadge = (r: AttendanceHistoryRecord) => {
    if (r.official_status === 'present') {
      if (r.check_in_status === 'late') {
        return {
          label: 'Terlambat',
          className: 'bg-amber-50 text-amber-800 border-amber-200',
        };
      }
      return {
        label: 'Tepat Waktu',
        className: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      };
    }
    if (r.official_status === 'official_duty') {
      return {
        label: 'Dinas Luar',
        className: 'bg-blue-50 text-blue-800 border-blue-200',
      };
    }
    if (r.official_status === 'sick') {
      return {
        label: 'Sakit',
        className: 'bg-orange-50 text-[#C2410C] border-orange-200',
      };
    }
    if (r.official_status === 'permit') {
      return {
        label: 'Izin',
        className: 'bg-purple-50 text-purple-800 border-purple-200',
      };
    }
    if (r.official_status === 'leave') {
      return {
        label: 'Cuti',
        className: 'bg-cyan-50 text-cyan-800 border-cyan-200',
      };
    }
    if (r.official_status === 'absent') {
      return {
        label: 'Alfa',
        className: 'bg-rose-50 text-rose-800 border-rose-200',
      };
    }
    return {
      label: r.status_label || 'Hadir',
      className: 'bg-slate-50 text-slate-700 border-slate-200',
    };
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center font-sans">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity duration-250"
        style={{
          opacity: isClosing
            ? 0
            : isDragging && dragY > 0
            ? Math.max(0, 1 - dragY / 320)
            : 1,
        }}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Bottom Sheet Container */}
      <div
        ref={sheetRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="recap-sheet-title"
        style={{
          transform: isClosing
            ? 'translateY(100%)'
            : dragY !== 0
            ? `translateY(${dragY}px)`
            : 'translateY(0)',
          transition: isDragging
            ? 'none'
            : 'transform 250ms cubic-bezier(0.16, 1, 0.3, 1)',
        }}
        className={`relative w-full max-w-2xl bg-white rounded-t-3xl shadow-2xl z-10 max-h-[88vh] flex flex-col overflow-hidden border-t border-slate-200 ${
          !isClosing && !isDragging && dragY === 0 ? 'animate-in slide-in-from-bottom duration-300' : ''
        }`}
      >
        {/* Swipe-down Dismiss Zone: Drag Handle & Header */}
        <div
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          className="w-full cursor-grab active:cursor-grabbing select-none touch-none"
        >
          {/* Grab Handle */}
          <div className="w-full pt-3 pb-2 flex justify-center">
            <div className="w-12 h-1.5 bg-slate-300 rounded-full transition-colors group-hover:bg-slate-400" />
          </div>

          {/* Modal Header */}
          <div className="px-5 pb-3 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-[#F97316] shrink-0">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <h3 id="recap-sheet-title" className="text-base sm:text-lg font-bold text-slate-900 leading-tight">
                  Rekap Kehadiran Bulanan
                </h3>
                <p className="text-xs font-medium text-slate-500 capitalize">
                  Periode: {formattedMonthYear}
                </p>
              </div>
            </div>

            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={handleClose}
              className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              aria-label="Tutup modal rekap"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Modal Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-6 pb-12">
          {loading ? (
            <div className="py-16 text-center space-y-3">
              <div className="w-8 h-8 border-3 border-orange-200 border-t-[#F97316] rounded-full animate-spin mx-auto" />
              <p className="text-xs text-slate-500">Memuat data rekap bulanan...</p>
            </div>
          ) : (
            <>
              {/* SECTION A: RINGKASAN UTAMA */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <CalendarDays className="w-4 h-4 text-slate-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Ringkasan Utama
                  </h4>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {/* Total Hari Kerja */}
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-3.5 text-center">
                    <span className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight block">
                      {totalWorkDays}
                    </span>
                    <span className="text-xs font-semibold text-slate-600 block mt-0.5">
                      Hari Kerja
                    </span>
                  </div>

                  {/* Persentase Kehadiran */}
                  <div className="bg-orange-50/80 border border-orange-100 rounded-2xl p-3.5 text-center">
                    <span className="text-2xl sm:text-3xl font-extrabold text-[#EA580C] tracking-tight block">
                      {attendancePercentage}%
                    </span>
                    <span className="text-xs font-semibold text-orange-900 block mt-0.5">
                      Persentase Kehadiran
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION B: DISTRIBUSI STATUS (HORIZONTAL BAR CHART) */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-slate-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Distribusi Status Kehadiran
                    </h4>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">
                    Total: {totalWorkDays} Hari
                  </span>
                </div>

                <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-2xs space-y-3">
                  {chartItems.map((item) => (
                    <div key={item.label} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-medium text-slate-700">{item.label}</span>
                        <span className="font-bold text-slate-900 tabular-nums">
                          {item.count} <span className="font-normal text-slate-400 text-[11px]">Hari</span>
                        </span>
                      </div>

                      {/* Bar Track */}
                      <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden flex">
                        <div
                          className={`h-full ${item.colorBg} rounded-full transition-all duration-500 ease-out`}
                          style={{
                            width: `${item.percentage}%`,
                            opacity: item.count === 0 ? 0 : 1,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* SECTION C: RINCIAN PRESENSI HARIAN */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-slate-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Rincian Presensi Harian
                    </h4>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">
                    {dailyDetailRecords.length} Catatan
                  </span>
                </div>

                {dailyDetailRecords.length === 0 ? (
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-8 text-center space-y-2">
                    <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-xs font-semibold text-slate-600">
                      Tidak ada catatan presensi pada bulan ini
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Hari libur dan tanggal mendatang tidak dicatat sebagai kehadiran.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {dailyDetailRecords.map((rec) => {
                      const badge = getDailyStatusBadge(rec);
                      const isPresent = rec.official_status === 'present';

                      return (
                        <div
                          key={rec.attendance_date}
                          className="bg-white border border-slate-100 hover:border-slate-200 rounded-xl p-3 shadow-2xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-2.5"
                        >
                          <div className="flex items-start sm:items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-slate-300 mt-1.5 sm:mt-0 shrink-0" />
                            <div>
                              <p className="text-xs font-bold text-slate-900 leading-tight">
                                {formatDayDate(rec.attendance_date)}
                              </p>
                              {rec.notes && rec.official_status !== 'present' && (
                                <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                                  {rec.notes}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between sm:justify-end gap-3 pl-5 sm:pl-0">
                            {/* Check-in & Check-out Times */}
                            <div className="text-[11px] text-slate-500 font-medium flex items-center gap-2">
                              <span>Masuk: <strong className="text-slate-800">{formatTime(rec.check_in_at)}</strong></span>
                              <span className="text-slate-300">•</span>
                              <span>Pulang: <strong className="text-slate-800">{formatTime(rec.check_out_at)}</strong></span>
                            </div>

                            {/* Official Status Badge */}
                            <span
                              className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border shrink-0 ${badge.className}`}
                            >
                              {badge.label}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
