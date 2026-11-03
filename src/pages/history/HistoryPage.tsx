import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarCheck,
  AlertCircle,
  RefreshCw,
  UserX,
  Users,
  BarChart3,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { attendanceHistoryService } from '../../services/attendanceHistoryService';
import { getLocalDateString } from '../../services/attendanceService';
import {
  AttendanceHistoryRecord,
  AttendanceHistorySummary,
  OfficialMonthlyRecapSummary,
} from '../../types/attendanceHistory.types';
import { HistorySummaryCards } from '../../components/history/HistorySummaryCards';
import { HistoryFilterBar } from '../../components/history/HistoryFilterBar';
import { HistoryTable } from '../../components/history/HistoryTable';
import { HistoryCalendarMobile } from '../../components/history/HistoryCalendarMobile';
import { HistoryDetailModal } from '../../components/history/HistoryDetailModal';
import { AttendanceSelfieCard } from '../../components/history/AttendanceSelfieCard';
import { HistoryMonthlyRecapBottomSheet } from '../../components/history/HistoryMonthlyRecapBottomSheet';
import { Button } from '../../components/ui/Button';

export const HistoryPage: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const isAdminRole = Boolean(profile && ['super_admin', 'admin'].includes(profile.role));

  const getTodayString = () => {
    return getLocalDateString(new Date());
  };

  const getFirstDayOfMonthString = () => {
    const d = new Date();
    d.setDate(1);
    return getLocalDateString(d);
  };

  const getLastDayOfMonthString = () => {
    const d = new Date();
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    return getLocalDateString(lastDay);
  };

  const [startDate, setStartDate] = useState<string>(getFirstDayOfMonthString());
  const [endDate, setEndDate] = useState<string>(getLastDayOfMonthString());
  
  // Calendar state and active selected date
  const [currentCalendarDate, setCurrentCalendarDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(getTodayString());
  const [selectedDayRecord, setSelectedDayRecord] = useState<AttendanceHistoryRecord | null>(null);
  const [loadingDayRecord, setLoadingDayRecord] = useState<boolean>(false);

  // Mobile official attendance status monthly recap and records state
  const [monthlyOfficialSummary, setMonthlyOfficialSummary] = useState<OfficialMonthlyRecapSummary | null>(null);
  const [monthlyOfficialRecords, setMonthlyOfficialRecords] = useState<AttendanceHistoryRecord[]>([]);
  const [monthlyOfficialLoading, setMonthlyOfficialLoading] = useState<boolean>(true);
  const [isRecapModalOpen, setIsRecapModalOpen] = useState<boolean>(false);
  
  const [statusFilter, setStatusFilter] = useState<'all' | 'on_time' | 'late'>('all');
  const [checkoutFilter, setCheckoutFilter] = useState<
    'all' | 'checked_out' | 'not_checked_out'
  >('all');

  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize] = useState<number>(15);

  const [loading, setLoading] = useState<boolean>(true);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [isUnlinked, setIsUnlinked] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [records, setRecords] = useState<AttendanceHistoryRecord[]>([]);
  const [summary, setSummary] = useState<AttendanceHistorySummary | null>(null);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(1);

  const [selectedRecord, setSelectedRecord] = useState<AttendanceHistoryRecord | null>(
    null
  );

  const fetchHistoryData = async (
    sDate = startDate,
    eDate = endDate,
    sFilter = statusFilter,
    cFilter = checkoutFilter,
    page = currentPage
  ) => {
    if (sDate > eDate) {
      setValidationError('Tanggal mulai tidak boleh lebih besar dari tanggal akhir.');
      return;
    }

    setValidationError(null);
    setLoading(true);
    setErrorState(null);
    setIsUnlinked(false);

    try {
      const res = await attendanceHistoryService.getAttendanceHistory({
        startDate: sDate,
        endDate: eDate,
        statusFilter: sFilter,
        checkoutFilter: cFilter,
        page,
        pageSize,
      });

      setRecords(res.records);
      setSummary(res.summary);
      setTotalCount(res.totalCount);
      setTotalPages(res.totalPages);
    } catch (err: any) {
      const msg = err?.message || 'Gagal memuat riwayat presensi.';
      if (
        !msg.includes('Sesi telah berakhir') &&
        !msg.includes('tidak memiliki data pegawai')
      ) {
        console.error('Failed to fetch personal attendance history:', err);
      }
      setErrorState(msg);

      if (
        msg.includes('belum terhubung') ||
        msg.includes('tidak ditemukan') ||
        msg.includes('belum dikaitkan') ||
        msg.includes('tidak memiliki data pegawai')
      ) {
        setIsUnlinked(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyOfficialRecap = async (year: number, month: number) => {
    setMonthlyOfficialLoading(true);
    try {
      const res = await attendanceHistoryService.getMonthlyOfficialStatusRecap(year, month);
      setMonthlyOfficialSummary(res.summary);
      setMonthlyOfficialRecords(res.records);
    } catch (err: any) {
      const msg = err?.message || '';
      if (
        !msg.includes('Sesi telah berakhir') &&
        !msg.includes('tidak memiliki data pegawai')
      ) {
        console.error('Failed to fetch monthly official status recap:', err);
      }
      setMonthlyOfficialSummary({
        present: 0,
        sick: 0,
        permit: 0,
        officialDuty: 0,
        leave: 0,
        absent: 0,
      });
      setMonthlyOfficialRecords([]);
    } finally {
      setMonthlyOfficialLoading(false);
    }
  };

  useEffect(() => {
    fetchHistoryData(startDate, endDate, statusFilter, checkoutFilter, currentPage);
  }, [currentPage]);

  useEffect(() => {
    fetchMonthlyOfficialRecap(
      currentCalendarDate.getFullYear(),
      currentCalendarDate.getMonth()
    );
  }, []);

  // Calendar logic
  const handleDateSelect = (date: string) => {
    setSelectedDate(date);
  };

  const handleMonthChange = (year: number, month: number) => {
    setCurrentCalendarDate(new Date(year, month, 1));
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const newStart = getLocalDateString(firstDay);
    const newEnd = getLocalDateString(lastDay);
    setStartDate(newStart);
    setEndDate(newEnd);
    setSelectedDate(newStart);
    fetchHistoryData(newStart, newEnd, statusFilter, checkoutFilter, 1);
    fetchMonthlyOfficialRecap(year, month);
  };

  // Synchronize and fetch authoritative attendance record for the selected date
  useEffect(() => {
    let isCancelled = false;
    const targetDate = selectedDate;

    if (!targetDate) {
      setSelectedDayRecord(null);
      return;
    }

    // 1. Immediate optimistic sync from cached monthly records
    const cachedRecord = monthlyOfficialRecords.find(
      (r) => r.attendance_date === targetDate
    );
    setSelectedDayRecord(cachedRecord || null);

    // If user is unlinked, admin role (no personal employee records), or not logged in, skip network call
    if (isAdminRole || isUnlinked || !user) {
      return;
    }

    // 2. Fetch authoritative complete record directly by date to guarantee photos and locations
    const fetchFullDayRecord = async () => {
      setLoadingDayRecord(true);
      try {
        const knownEmpId = monthlyOfficialRecords[0]?.employee_id || records[0]?.employee_id;
        const fullRecord = await attendanceHistoryService.getAttendanceRecordByDate(
          targetDate,
          knownEmpId
        );
        if (!isCancelled) {
          if (fullRecord && fullRecord.attendance_date === targetDate) {
            setSelectedDayRecord({
              ...(cachedRecord || {}),
              ...fullRecord,
              official_status:
                cachedRecord?.official_status ||
                (fullRecord.check_in_at ? 'present' : undefined),
              status_label:
                cachedRecord?.status_label ||
                (fullRecord.check_in_at ? 'Hadir' : undefined),
            });
          } else if (!fullRecord && cachedRecord) {
            setSelectedDayRecord(cachedRecord);
          } else if (!fullRecord) {
            setSelectedDayRecord(null);
          }
        }
      } catch (err: any) {
        const msg = err?.message || '';
        if (
          !msg.includes('Sesi telah berakhir') &&
          !msg.includes('tidak memiliki data pegawai') &&
          !msg.includes('tidak ditemukan')
        ) {
          console.error('Failed to fetch full attendance record for date:', err);
        }
      } finally {
        if (!isCancelled) {
          setLoadingDayRecord(false);
        }
      }
    };

    fetchFullDayRecord();

    return () => {
      isCancelled = true;
    };
  }, [selectedDate, monthlyOfficialRecords, records, isAdminRole, isUnlinked, user]);

  const handleApplyFilters = (filters: {
    startDate: string;
    endDate: string;
    statusFilter: 'all' | 'on_time' | 'late';
    checkoutFilter: 'all' | 'checked_out' | 'not_checked_out';
  }) => {
    setStartDate(filters.startDate);
    setEndDate(filters.endDate);
    setStatusFilter(filters.statusFilter);
    setCheckoutFilter(filters.checkoutFilter);
    setCurrentPage(1);

    fetchHistoryData(
      filters.startDate,
      filters.endDate,
      filters.statusFilter,
      filters.checkoutFilter,
      1
    );
  };

  const handleQuickFilter = (key: 'this_month' | 'last_month' | 'last_7_days') => {
    const today = new Date();
    let newStart = '';
    let newEnd = getLocalDateString(today);

    if (key === 'this_month') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      newStart = getLocalDateString(firstDay);
    } else if (key === 'last_month') {
      const firstDayLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const lastDayLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
      newStart = getLocalDateString(firstDayLastMonth);
      newEnd = getLocalDateString(lastDayLastMonth);
    } else if (key === 'last_7_days') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(today.getDate() - 6);
      newStart = getLocalDateString(sevenDaysAgo);
    }

    setStartDate(newStart);
    setEndDate(newEnd);
    setCurrentPage(1);

    fetchHistoryData(newStart, newEnd, statusFilter, checkoutFilter, 1);
  };

  const handleRefresh = () => {
    fetchHistoryData(startDate, endDate, statusFilter, checkoutFilter, currentPage);
    fetchMonthlyOfficialRecap(
      currentCalendarDate.getFullYear(),
      currentCalendarDate.getMonth()
    );
  };

  const startRecordNum = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRecordNum = Math.min(currentPage * pageSize, totalCount);

  // Evaluated status indicators for Check-in and Check-out selfie cards
  const selfieIndicators = useMemo(() => {
    const activeRecord =
      selectedDayRecord?.attendance_date === selectedDate
        ? selectedDayRecord
        : monthlyOfficialRecords.find((r) => r.attendance_date === selectedDate);

    if (!activeRecord) {
      return {
        checkInLabel: undefined,
        checkInClass: undefined,
        checkOutLabel: undefined,
        checkOutClass: undefined,
      };
    }

    const official = activeRecord.official_status;

    // 1. Kondisi Tidak Hadir / Tugas Luar (berlaku untuk kedua card)
    if (official === 'official_duty') {
      return {
        checkInLabel: 'Dinas Luar',
        checkInClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
        checkOutLabel: 'Dinas Luar',
        checkOutClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
      };
    }

    if (official === 'sick') {
      return {
        checkInLabel: 'Sakit',
        checkInClass: 'bg-amber-50 text-amber-800 border border-amber-200',
        checkOutLabel: 'Sakit',
        checkOutClass: 'bg-amber-50 text-amber-800 border border-amber-200',
      };
    }

    if (official === 'permit') {
      return {
        checkInLabel: 'Izin',
        checkInClass: 'bg-amber-50 text-amber-800 border border-amber-200',
        checkOutLabel: 'Izin',
        checkOutClass: 'bg-amber-50 text-amber-800 border border-amber-200',
      };
    }

    if (official === 'leave') {
      return {
        checkInLabel: 'Cuti',
        checkInClass: 'bg-amber-50 text-amber-800 border border-amber-200',
        checkOutLabel: 'Cuti',
        checkOutClass: 'bg-amber-50 text-amber-800 border border-amber-200',
      };
    }

    if (official === 'absent') {
      return {
        checkInLabel: 'Alfa',
        checkInClass: 'bg-rose-50 text-rose-700 border border-rose-200',
        checkOutLabel: 'Alfa',
        checkOutClass: 'bg-rose-50 text-rose-700 border border-rose-200',
      };
    }

    // Belum ada status final (misal: pending, holiday, atau tanggal belum dievaluasi)
    if (official === 'pending' || official === 'holiday') {
      return {
        checkInLabel: undefined,
        checkInClass: undefined,
        checkOutLabel: undefined,
        checkOutClass: undefined,
      };
    }

    // 2. Kondisi Presensi Fisik (Hadir)
    let checkInLabel: string | undefined;
    let checkInClass: string | undefined;

    if (activeRecord.check_in_status === 'on_time') {
      checkInLabel = 'Tepat Waktu';
      checkInClass = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    } else if (activeRecord.check_in_status === 'late') {
      checkInLabel = 'Terlambat';
      checkInClass = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    } else if (activeRecord.check_in_at) {
      checkInLabel = 'Tepat Waktu';
      checkInClass = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    }

    let checkOutLabel: string | undefined;
    let checkOutClass: string | undefined;

    if (activeRecord.check_out_status === 'operational') {
      checkOutLabel = 'Jam Operasional';
      checkOutClass = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    } else if (activeRecord.check_out_status === 'after_work') {
      checkOutLabel = 'Setelah Jam Kerja';
      checkOutClass = 'bg-emerald-50 text-emerald-700 border border-emerald-200';
    }

    return {
      checkInLabel,
      checkInClass,
      checkOutLabel,
      checkOutClass,
    };
  }, [selectedDayRecord, selectedDate, monthlyOfficialRecords]);

  // Label periode bulan dan tahun aktif untuk tombol rekap
  const calendarMonthYearLabel = useMemo(() => {
    return currentCalendarDate.toLocaleDateString('id-ID', {
      month: 'long',
      year: 'numeric',
    });
  }, [currentCalendarDate]);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* 1. Mobile & Tablet Heading (Point 1 & 2: Intro banner removed on mobile/tablet) */}
      <div className="lg:hidden">
        <h1 className="text-xl sm:text-2xl font-bold text-[#111827] tracking-tight font-sans">
          Riwayat Presensi
        </h1>
      </div>

      {/* Header Banner (Desktop Only - Untouched) */}
      <div className="hidden lg:flex bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 shadow-2xs flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF] flex items-center gap-1.5">
            <CalendarCheck className="w-3.5 h-3.5 text-[#F97316]" />
            Catatan Kehadiran Pegawai
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-[#111827] mt-0.5">
            Riwayat Presensi
          </h2>
          <p className="text-xs sm:text-sm text-[#6B7280] mt-1">
            Daftar riwayat presensi masuk dan pulang pribadi
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={loading}
          className="text-xs self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Segarkan
        </Button>
      </div>

      {/* Desktop View: Summary Cards & Filter Bar */}
      <div className="hidden lg:block space-y-6">
        <HistorySummaryCards summary={summary} loading={loading} />
        <HistoryFilterBar
          startDate={startDate}
          endDate={endDate}
          statusFilter={statusFilter}
          checkoutFilter={checkoutFilter}
          validationError={validationError}
          onApply={handleApplyFilters}
          onQuickFilter={handleQuickFilter}
          onRefresh={handleRefresh}
          loading={loading}
        />
      </div>

      {/* Mobile & Tablet View: Calendar-First Layout */}
      <div className="lg:hidden space-y-4 sm:space-y-5">
        {/* 1. Card Kalender Mobile */}
        <HistoryCalendarMobile
          onDateSelect={handleDateSelect}
          onMonthChange={handleMonthChange}
          selectedDate={selectedDate || ''}
          currentDate={currentCalendarDate}
          records={monthlyOfficialRecords}
          summary={monthlyOfficialSummary}
          loading={monthlyOfficialLoading}
        />

        {/* 2 & 3. Card Foto Selfie Check-in & Check-out tepat di bawah kalender */}
        <div className="space-y-3 font-sans">
          <AttendanceSelfieCard
            type="check_in"
            photoPath={
              selectedDayRecord?.attendance_date === selectedDate
                ? selectedDayRecord.check_in_photo_path
                : null
            }
            time={
              selectedDayRecord?.attendance_date === selectedDate
                ? selectedDayRecord.check_in_at
                : null
            }
            date={selectedDate}
            locationName={
              selectedDayRecord?.attendance_date === selectedDate
                ? selectedDayRecord.check_in_location?.name
                : null
            }
            statusLabel={selfieIndicators.checkInLabel}
            statusClassName={selfieIndicators.checkInClass}
          />
          <AttendanceSelfieCard
            type="check_out"
            photoPath={
              selectedDayRecord?.attendance_date === selectedDate
                ? selectedDayRecord.check_out_photo_path
                : null
            }
            time={
              selectedDayRecord?.attendance_date === selectedDate
                ? selectedDayRecord.check_out_at
                : null
            }
            date={selectedDate}
            locationName={
              selectedDayRecord?.attendance_date === selectedDate
                ? selectedDayRecord.check_out_location?.name
                : null
            }
            statusLabel={selfieIndicators.checkOutLabel}
            statusClassName={selfieIndicators.checkOutClass}
          />
        </div>

        {/* 4. Tombol Akses Ringkas Rekap Kehadiran Bulanan */}
        <button
          type="button"
          onClick={() => setIsRecapModalOpen(true)}
          className="w-full min-h-[48px] py-3 px-4 bg-[#FFFFFF] border border-[#E5E7EB] hover:border-[#F97316] rounded-2xl shadow-2xs flex items-center justify-between text-left transition-all group active:scale-[0.99] touch-manipulation cursor-pointer"
          aria-haspopup="dialog"
          aria-expanded={isRecapModalOpen}
        >
          <div className="flex items-center gap-3">
            <BarChart3 className="w-5 h-5 text-[#F97316] shrink-0" />
            <div>
              <div className="text-xs sm:text-sm font-bold text-slate-900 group-hover:text-[#EA580C] transition-colors leading-tight">
                Rekap Kehadiran Bulanan
              </div>
              <p className="text-[11px] font-medium text-slate-500 capitalize leading-tight mt-0.5">
                Statistik & rincian ({calendarMonthYearLabel})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 text-xs font-bold text-white bg-[#F97316] px-3 py-1.5 rounded-xl shadow-2xs shrink-0 group-hover:bg-[#EA580C] transition-colors">
            <span>Buka</span>
            <ChevronRight className="w-3.5 h-3.5 text-white" />
          </div>
        </button>
      </div>

      {/* UNLINKED ACCOUNT STATE (FINDING-03 Fix) */}
      {isUnlinked ? (
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-2xs">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 border border-amber-300 flex items-center justify-center mx-auto">
            <UserX className="w-7 h-7" />
          </div>

          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-base sm:text-lg font-bold text-amber-950">
              Akun Anda Belum Terhubung dengan Data Pegawai
            </h3>
            <p className="text-xs sm:text-sm text-amber-800 leading-relaxed">
              Akun login Anda belum ditautkan ke profil pegawai sekolah pada SIM Master Pegawai.
            </p>
            <p className="text-xs text-amber-700/90 pt-1">
              Hubungi Administrator untuk menautkan akun Anda di Manajemen Pegawai agar dapat melihat riwayat presensi pribadi.
            </p>
          </div>

          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <Button variant="outline" size="sm" onClick={handleRefresh} className="text-xs">
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Segarkan Halaman
            </Button>
            {isAdminRole && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/employees')}
                className="text-xs bg-[#F97316] hover:bg-[#EA580C] text-white"
              >
                <Users className="w-3.5 h-3.5 mr-1.5" />
                Manajemen Pegawai
              </Button>
            )}
          </div>
        </div>
      ) : errorState ? (
        /* Generic Error State */
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-amber-800 space-y-3">
          <div className="flex items-center gap-2 font-bold text-sm">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>Gagal Memuat Riwayat Presensi</span>
          </div>
          <p className="text-xs leading-relaxed">{errorState}</p>
          <Button variant="outline" size="sm" onClick={handleRefresh} className="mt-2 text-xs">
            Coba Lagi
          </Button>
        </div>
      ) : (
        /* Desktop Records Content */
        <div className="hidden lg:block space-y-4">
          {loading ? (
            <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-6 shadow-2xs space-y-4 animate-pulse">
              <div className="h-4 bg-[#F3F4F6] rounded w-1/4" />
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-12 bg-[#F3F4F6] rounded-xl" />
                ))}
              </div>
            </div>
          ) : records.length === 0 ? (
            <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-10 text-center shadow-2xs space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#F3F4F6] text-[#9CA3AF] flex items-center justify-center mx-auto">
                <CalendarCheck className="w-6 h-6 text-[#9CA3AF]" />
              </div>
              <h4 className="text-base font-bold text-[#111827]">
                Belum Ada Riwayat Presensi
              </h4>
              <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
                Belum ada data presensi pada periode yang dipilih. Silakan pilih rentang tanggal lain.
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <HistoryTable records={records} onSelectRecord={setSelectedRecord} />

              {/* Desktop Pagination Controls */}
              <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-4 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#6B7280]">
                <span>
                  Menampilkan <strong className="text-[#111827]">{startRecordNum}</strong>–
                  <strong className="text-[#111827]">{endRecordNum}</strong> dari{' '}
                  <strong className="text-[#111827]">{totalCount}</strong> presensi
                </span>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1 || loading}
                    className="text-xs"
                  >
                    Sebelumnya
                  </Button>
                  <span className="text-[#111827] font-semibold px-2">
                    {currentPage} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages || loading}
                    className="text-xs"
                  >
                    Selanjutnya
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Detail Modal */}
      <HistoryDetailModal record={selectedRecord} onClose={() => setSelectedRecord(null)} />

      {/* Monthly Attendance Recap Bottom Sheet Modal (Mobile & Tablet) */}
      <HistoryMonthlyRecapBottomSheet
        isOpen={isRecapModalOpen}
        onClose={() => setIsRecapModalOpen(false)}
        currentDate={currentCalendarDate}
        summary={monthlyOfficialSummary}
        records={monthlyOfficialRecords}
        loading={monthlyOfficialLoading}
      />
    </div>
  );
};
