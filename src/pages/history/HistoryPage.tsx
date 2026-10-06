import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CalendarCheck,
  AlertCircle,
  RefreshCw,
  UserX,
  Users,
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
import { HistoryMonthlyRecapMobile } from '../../components/history/HistoryMonthlyRecapMobile';
import { HistoryFilterBar } from '../../components/history/HistoryFilterBar';
import { HistoryTable } from '../../components/history/HistoryTable';
import { HistoryMobileList } from '../../components/history/HistoryMobileList';
import { HistoryCalendarMobile } from '../../components/history/HistoryCalendarMobile';
import { HistoryDetailModal } from '../../components/history/HistoryDetailModal';
import { Button } from '../../components/ui/Button';

export const HistoryPage: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

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
  
  // New state for Calendar
  const [currentCalendarDate, setCurrentCalendarDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Mobile official attendance status monthly recap and records state
  const [monthlyOfficialSummary, setMonthlyOfficialSummary] = useState<OfficialMonthlyRecapSummary | null>(null);
  const [monthlyOfficialRecords, setMonthlyOfficialRecords] = useState<AttendanceHistoryRecord[]>([]);
  const [monthlyOfficialLoading, setMonthlyOfficialLoading] = useState<boolean>(true);
  
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
      console.error('Failed to fetch personal attendance history:', err);
      const msg = err?.message || 'Gagal memuat riwayat presensi.';
      setErrorState(msg);

      if (
        msg.includes('belum terhubung') ||
        msg.includes('tidak ditemukan') ||
        msg.includes('belum dikaitkan')
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
      console.error('Failed to fetch monthly official status recap:', err);
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
    setSelectedDate((prev) => (prev === date ? null : date));
  };

  const handleMonthChange = (year: number, month: number) => {
    setCurrentCalendarDate(new Date(year, month, 1));
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const newStart = getLocalDateString(firstDay);
    const newEnd = getLocalDateString(lastDay);
    setStartDate(newStart);
    setEndDate(newEnd);
    setSelectedDate(null);
    fetchHistoryData(newStart, newEnd, statusFilter, checkoutFilter, 1);
    fetchMonthlyOfficialRecap(year, month);
  };

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

  const isAdminRole = profile && ['super_admin', 'admin'].includes(profile.role);
  const startRecordNum = totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRecordNum = Math.min(currentPage * pageSize, totalCount);

  const displayedMobileRecords = selectedDate
    ? monthlyOfficialRecords.filter((r) => r.attendance_date === selectedDate)
    : monthlyOfficialRecords;

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      {/* 1. Mobile & Tablet Heading (Point 1 & 2: Intro banner removed on mobile/tablet) */}
      <div className="md:hidden">
        <h1 className="text-xl sm:text-2xl font-bold text-[#111827] tracking-tight font-sans">
          Riwayat Presensi
        </h1>
      </div>

      {/* Header Banner (Desktop Only - Untouched) */}
      <div className="hidden md:flex bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 shadow-2xs flex-col sm:flex-row sm:items-center justify-between gap-4">
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
      <div className="hidden md:block space-y-6">
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
      <div className="md:hidden space-y-5 sm:space-y-6">
        {/* Card Kalender */}
        <HistoryCalendarMobile
          onDateSelect={handleDateSelect}
          onMonthChange={handleMonthChange}
          selectedDate={selectedDate || ''}
          currentDate={currentCalendarDate}
        />

        {/* REKAP KEHADIRAN BULAN INI */}
        <HistoryMonthlyRecapMobile
          summary={monthlyOfficialSummary}
          loading={monthlyOfficialLoading}
        />

        {/* RIWAYAT KEHADIRAN ANDA */}
        <div className="space-y-3 font-sans">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            RIWAYAT KEHADIRAN ANDA
          </h3>
          {monthlyOfficialLoading ? (
            <div className="space-y-3 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-gray-100 rounded-2xl" />
              ))}
            </div>
          ) : displayedMobileRecords.length === 0 ? (
            <div className="bg-white border border-[#E5E7EB] rounded-2xl p-8 text-center text-xs text-slate-500">
              Tidak ada catatan presensi pada periode ini.
            </div>
          ) : (
            <HistoryMobileList
              records={displayedMobileRecords}
              onSelectRecord={setSelectedRecord}
            />
          )}
        </div>
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
        <div className="hidden md:block space-y-4">
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
    </div>
  );
};
