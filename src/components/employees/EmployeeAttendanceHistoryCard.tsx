import React, { useState, useEffect, useMemo } from 'react';
import {
  CalendarCheck,
  Calendar,
  Filter,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Briefcase,
  FileText,
  XCircle,
  HelpCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  MapPin,
} from 'lucide-react';
import {
  attendanceStatusService,
  EvaluatedStatusResult,
  OfficialAttendanceStatus,
  OFFICIAL_STATUS_LABELS,
} from '../../services/attendanceStatusService';
import {
  getMakassarTodayDateString,
  getMakassarFirstDayOfMonthString,
  formatMakassarTime,
  formatMakassarShortDate,
  getDayNameIndonesian,
} from '../../services/attendanceReportService';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';

export type PeriodOption =
  | 'this_month'
  | 'last_month'
  | '3_months'
  | '6_months'
  | 'this_year'
  | 'custom';

export interface EmployeeAttendanceHistoryCardProps {
  employeeId: string;
}

export const EmployeeAttendanceHistoryCard: React.FC<EmployeeAttendanceHistoryCardProps> = ({
  employeeId,
}) => {
  const todayStr = useMemo(() => getMakassarTodayDateString(), []);

  // Filter States
  const [period, setPeriod] = useState<PeriodOption>('this_month');
  const [customStartDate, setCustomStartDate] = useState<string>(getMakassarFirstDayOfMonthString());
  const [customEndDate, setCustomEndDate] = useState<string>(todayStr);
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Data & Fetching States
  const [matrixData, setMatrixData] = useState<EvaluatedStatusResult[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination States
  const [pageSize, setPageSize] = useState<number>(15);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Compute Start & End dates based on Period
  const { startDate, endDate } = useMemo(() => {
    const today = getMakassarTodayDateString();
    const [yearNum, monthNum] = today.split('-').map(Number);

    if (period === 'this_month') {
      return {
        startDate: getMakassarFirstDayOfMonthString(),
        endDate: today,
      };
    }

    if (period === 'last_month') {
      let lmYear = yearNum;
      let lmMonth = monthNum - 1;
      if (lmMonth === 0) {
        lmMonth = 12;
        lmYear -= 1;
      }
      const lmMonthStr = String(lmMonth).padStart(2, '0');
      const lastDay = new Date(lmYear, lmMonth, 0).getDate();
      return {
        startDate: `${lmYear}-${lmMonthStr}-01`,
        endDate: `${lmYear}-${lmMonthStr}-${String(lastDay).padStart(2, '0')}`,
      };
    }

    if (period === '3_months') {
      let m = monthNum - 2;
      let y = yearNum;
      if (m <= 0) {
        m += 12;
        y -= 1;
      }
      return {
        startDate: `${y}-${String(m).padStart(2, '0')}-01`,
        endDate: today,
      };
    }

    if (period === '6_months') {
      let m = monthNum - 5;
      let y = yearNum;
      if (m <= 0) {
        m += 12;
        y -= 1;
      }
      return {
        startDate: `${y}-${String(m).padStart(2, '0')}-01`,
        endDate: today,
      };
    }

    if (period === 'this_year') {
      return {
        startDate: `${yearNum}-01-01`,
        endDate: today,
      };
    }

    // Custom
    return {
      startDate: customStartDate || getMakassarFirstDayOfMonthString(),
      endDate: customEndDate || today,
    };
  }, [period, customStartDate, customEndDate]);

  // Load Data
  const loadAttendanceHistory = async () => {
    if (!employeeId) return;
    setIsLoading(true);
    setError(null);
    try {
      const results = await attendanceStatusService.getEvaluatedMatrix(
        startDate,
        endDate,
        employeeId
      );
      setMatrixData(results);
      setCurrentPage(1);
    } catch (err) {
      console.error('Error loading employee attendance history card matrix:', err);
      setError(err instanceof Error ? err.message : 'Gagal memuat riwayat presensi.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAttendanceHistory();
  }, [employeeId, startDate, endDate]);

  // Overall Statistics calculated over full period dataset
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

    matrixData.forEach((item) => {
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
      } else if (item.status === 'holiday') {
        holiday++;
      }
    });

    const totalPresent = presentOnTime + presentLate;

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
      totalEvaluatedDays: matrixData.length,
    };
  }, [matrixData]);

  // Filter dataset for table
  const filteredData = useMemo(() => {
    return matrixData.filter((item) => {
      // Exclude future dates if any
      if (item.statusLabel === 'Masa Depan') return false;

      if (statusFilter === 'all') return true;
      if (statusFilter === 'present') return item.status === 'present';
      if (statusFilter === 'on_time') return item.status === 'present' && item.substatus === 'on_time';
      if (statusFilter === 'late') return item.status === 'present' && item.substatus === 'late';
      if (statusFilter === 'sick') return item.status === 'sick';
      if (statusFilter === 'permit') return item.status === 'permit';
      if (statusFilter === 'official_duty') return item.status === 'official_duty';
      if (statusFilter === 'leave') return item.status === 'leave';
      if (statusFilter === 'absent') return item.status === 'absent';
      if (statusFilter === 'holiday') return item.status === 'holiday';

      return item.status === statusFilter;
    });
  }, [matrixData, statusFilter]);

  // Sort descending by date (most recent first)
  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredData]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(sortedData.length / pageSize));
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedData.slice(start, start + pageSize);
  }, [sortedData, currentPage, pageSize]);

  // Helper Badge Render for Status
  const renderStatusBadge = (item: EvaluatedStatusResult) => {
    if (item.status === 'present') {
      if (item.substatus === 'late') {
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            Hadir — Terlambat
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
          Hadir — Tepat Waktu
        </span>
      );
    }

    if (item.status === 'sick') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          <FileText className="w-3 h-3 text-blue-600" />
          Sakit
        </span>
      );
    }

    if (item.status === 'permit') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
          <FileText className="w-3 h-3 text-indigo-600" />
          Izin
        </span>
      );
    }

    if (item.status === 'official_duty') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
          <Briefcase className="w-3 h-3 text-purple-600" />
          Dinas Luar
        </span>
      );
    }

    if (item.status === 'leave') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-teal-50 text-teal-700 border border-teal-200">
          <Calendar className="w-3 h-3 text-teal-600" />
          Cuti
        </span>
      );
    }

    if (item.status === 'absent') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-red-50 text-red-700 border border-red-200">
          <XCircle className="w-3 h-3 text-red-600" />
          Alpha
        </span>
      );
    }

    if (item.status === 'holiday') {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#F3F4F6] text-[#4B5563] border border-[#E5E7EB]">
          <Calendar className="w-3 h-3 text-[#6B7280]" />
          Libur
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-gray-50 text-gray-600 border border-gray-200">
        {item.statusLabel}
      </span>
    );
  };

  return (
    <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-6 space-y-6 shadow-2xs">
      {/* Header Title & Main Filters */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-2.5 text-[#F97316]">
          <div className="p-2 rounded-xl bg-[#FFF7ED] border border-orange-200">
            <CalendarCheck className="w-5 h-5 text-[#F97316]" />
          </div>
          <div>
            <h3 className="text-base font-bold text-[#111827]">
              Riwayat Kehadiran
            </h3>
            <p className="text-xs text-[#6B7280]">
              Catatan presensi resmi, perizinan, dan status kehadiran harian pegawai.
            </p>
          </div>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Periode Selector */}
          <div className="flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-[#6B7280] shrink-0" />
            <select
              value={period}
              onChange={(e) => {
                setPeriod(e.target.value as PeriodOption);
                setCurrentPage(1);
              }}
              className="bg-white border border-[#E5E7EB] rounded-xl px-3 py-1.5 text-xs font-semibold text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#F97316]"
            >
              <option value="this_month">Bulan Ini</option>
              <option value="last_month">Bulan Lalu</option>
              <option value="3_months">3 Bulan</option>
              <option value="6_months">6 Bulan</option>
              <option value="this_year">Tahun Ini</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-4 h-4 text-[#6B7280] shrink-0" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-white border border-[#E5E7EB] rounded-xl px-3 py-1.5 text-xs font-semibold text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#F97316]"
            >
              <option value="all">Semua Status</option>
              <option value="present">Semua Hadir</option>
              <option value="on_time">Hadir — Tepat Waktu</option>
              <option value="late">Hadir — Terlambat</option>
              <option value="sick">Sakit</option>
              <option value="permit">Izin</option>
              <option value="official_duty">Dinas Luar</option>
              <option value="leave">Cuti</option>
              <option value="absent">Alpha</option>
              <option value="holiday">Libur</option>
            </select>
          </div>
        </div>
      </div>

      {/* Custom Date Inputs if Custom Selected */}
      {period === 'custom' && (
        <div className="p-3.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] flex flex-wrap items-center gap-4 text-xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#374151]">Mulai:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="bg-white border border-[#E5E7EB] rounded-lg px-2.5 py-1 text-xs text-[#111827] font-mono focus:outline-none focus:ring-2 focus:ring-[#F97316]"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#374151]">Sampai:</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="bg-white border border-[#E5E7EB] rounded-lg px-2.5 py-1 text-xs text-[#111827] font-mono focus:outline-none focus:ring-2 focus:ring-[#F97316]"
            />
          </div>
        </div>
      )}

      {/* Summary Statistics Grid */}
      {!isLoading && !error && (
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {/* Hadir */}
          <div className="p-3 rounded-xl bg-emerald-50/60 border border-emerald-200/80 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-emerald-800">
              <span>Hadir</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <p className="text-lg font-bold text-emerald-900">{stats.totalPresent}</p>
            <div className="text-[10px] text-emerald-700 font-medium leading-tight">
              <span>Tepat: {stats.presentOnTime}</span> • <span>Lambat: {stats.presentLate}</span>
            </div>
          </div>

          {/* Sakit */}
          <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200/80 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-blue-800">
              <span>Sakit</span>
              <FileText className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <p className="text-lg font-bold text-blue-900">{stats.sick}</p>
            <p className="text-[10px] text-blue-700">Hari</p>
          </div>

          {/* Izin */}
          <div className="p-3 rounded-xl bg-indigo-50/60 border border-indigo-200/80 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-indigo-800">
              <span>Izin</span>
              <FileText className="w-3.5 h-3.5 text-indigo-600" />
            </div>
            <p className="text-lg font-bold text-indigo-900">{stats.permit}</p>
            <p className="text-[10px] text-indigo-700">Hari</p>
          </div>

          {/* Dinas Luar */}
          <div className="p-3 rounded-xl bg-purple-50/60 border border-purple-200/80 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-purple-800">
              <span>Dinas Luar</span>
              <Briefcase className="w-3.5 h-3.5 text-purple-600" />
            </div>
            <p className="text-lg font-bold text-purple-900">{stats.officialDuty}</p>
            <p className="text-[10px] text-purple-700">Hari</p>
          </div>

          {/* Cuti */}
          <div className="p-3 rounded-xl bg-teal-50/60 border border-teal-200/80 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-teal-800">
              <span>Cuti</span>
              <Calendar className="w-3.5 h-3.5 text-teal-600" />
            </div>
            <p className="text-lg font-bold text-teal-900">{stats.leave}</p>
            <p className="text-[10px] text-teal-700">Hari</p>
          </div>

          {/* Alpha */}
          <div className="p-3 rounded-xl bg-red-50/60 border border-red-200/80 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-red-800">
              <span>Alpha</span>
              <XCircle className="w-3.5 h-3.5 text-red-600" />
            </div>
            <p className="text-lg font-bold text-red-900">{stats.absent}</p>
            <p className="text-[10px] text-red-700">Tanpa Ket.</p>
          </div>

          {/* Libur */}
          <div className="p-3 rounded-xl bg-gray-50 border border-gray-200 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-gray-700">
              <span>Libur</span>
              <Calendar className="w-3.5 h-3.5 text-gray-500" />
            </div>
            <p className="text-lg font-bold text-gray-900">{stats.holiday}</p>
            <p className="text-[10px] text-gray-500">Hari</p>
          </div>

          {/* Total Hari Kerja */}
          <div className="p-3 rounded-xl bg-[#FFF7ED] border border-orange-200 space-y-1">
            <div className="flex items-center justify-between text-[11px] font-semibold text-[#C2410C]">
              <span>Hari Kerja</span>
              <Clock className="w-3.5 h-3.5 text-[#F97316]" />
            </div>
            <p className="text-lg font-bold text-[#9A3412]">{stats.effectiveWorkingDays}</p>
            <p className="text-[10px] text-[#C2410C]">Hari Efektif</p>
          </div>
        </div>
      )}

      {/* Main Table Content / Loading / Error / Empty States */}
      {isLoading ? (
        <div className="min-h-[220px] flex flex-col items-center justify-center gap-3 py-10">
          <div className="w-7 h-7 border-3 border-[#F97316] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-[#6B7280]">Memuat riwayat kehadiran resmi...</p>
        </div>
      ) : error ? (
        <div className="p-6 rounded-2xl bg-red-50 border border-red-200 text-center space-y-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-red-900">Gagal Memuat Riwayat</h4>
            <p className="text-xs text-red-700 mt-1">{error}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadAttendanceHistory}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            className="border-red-300 text-red-800 hover:bg-red-100"
          >
            Coba Lagi
          </Button>
        </div>
      ) : sortedData.length === 0 ? (
        <div className="min-h-[180px] flex flex-col items-center justify-center text-center p-8 bg-[#F9FAFB] rounded-2xl border border-dashed border-[#D1D5DB] space-y-2">
          <div className="w-10 h-10 rounded-2xl bg-[#E5E7EB] text-[#6B7280] flex items-center justify-center">
            <CalendarCheck className="w-5 h-5" />
          </div>
          <h4 className="text-xs font-bold text-[#374151]">
            Belum ada riwayat kehadiran pada periode ini.
          </h4>
          <p className="text-[11px] text-[#6B7280]">
            Tidak ditemukan catatan presensi atau status kehadiran yang sesuai dengan filter pilihan Anda.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Table Container */}
          <div className="overflow-x-auto rounded-xl border border-[#E5E7EB]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB] text-[#374151] font-bold uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-4 min-w-[130px]">Tanggal & Hari</th>
                  <th className="py-3 px-4 min-w-[160px]">Status Resmi</th>
                  <th className="py-3 px-4 min-w-[160px]">Keterangan / Alasan</th>
                  <th className="py-3 px-4 min-w-[100px] text-center">Check-in</th>
                  <th className="py-3 px-4 min-w-[100px] text-center">Check-out</th>
                  <th className="py-3 px-4 min-w-[140px]">Lokasi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB] bg-white text-[#111827]">
                {paginatedData.map((item) => {
                  const dayName = getDayNameIndonesian(item.date);
                  const shortDate = formatMakassarShortDate(item.date);

                  return (
                    <tr key={item.date} className="hover:bg-[#F9FAFB] transition-colors">
                      {/* Tanggal & Hari */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="font-bold text-[#111827]">{shortDate}</div>
                        <div className="text-[11px] text-[#6B7280]">{dayName}</div>
                      </td>

                      {/* Status Resmi & Substatus */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {renderStatusBadge(item)}
                      </td>

                      {/* Keterangan / Alasan */}
                      <td className="py-3 px-4 text-[#4B5563]">
                        {item.notes || '—'}
                      </td>

                      {/* Check-in */}
                      <td className="py-3 px-4 text-center font-mono font-semibold text-[#111827]">
                        {formatMakassarTime(item.checkInAt)}
                      </td>

                      {/* Check-out */}
                      <td className="py-3 px-4 text-center font-mono font-semibold text-[#111827]">
                        {formatMakassarTime(item.checkOutAt)}
                      </td>

                      {/* Lokasi */}
                      <td className="py-3 px-4 text-[#4B5563]">
                        {item.checkInLocation || item.checkOutLocation ? (
                          <div className="inline-flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-[#F97316] shrink-0" />
                            <span>{item.checkInLocation || item.checkOutLocation}</span>
                          </div>
                        ) : (
                          '—'
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 text-xs text-[#6B7280]">
            <div className="flex items-center gap-2">
              <span>Tampilkan:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-[#E5E7EB] rounded-lg px-2 py-1 text-xs text-[#111827] font-semibold focus:outline-none focus:ring-1 focus:ring-[#F97316]"
              >
                <option value={15}>15 baris</option>
                <option value={30}>30 baris</option>
                <option value={50}>50 baris</option>
              </select>
              <span>
                dari <strong className="text-[#111827]">{sortedData.length}</strong> total catatan
              </span>
            </div>

            <div className="flex items-center gap-1.5 self-end sm:self-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 min-w-[32px] justify-center"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <span className="font-semibold text-[#111827] px-2">
                Halaman {currentPage} dari {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 min-w-[32px] justify-center"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
