import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, AlertCircle, Users, RefreshCw, Info } from 'lucide-react';
import { attendanceRecapService } from '../../services/attendanceRecapService';
import {
  getMakassarTodayDateString,
  getMakassarFirstDayOfMonthString,
} from '../../services/attendanceReportService';
import { DepartmentOption } from '../../types/attendanceMonitoring.types';
import {
  EmployeeRecapRecord,
  GlobalRecapSummary,
  RecapStatistics,
} from '../../types/attendanceRecap.types';

import { RecapSummaryCards } from '../../components/recap/RecapSummaryCards';
import { RecapFilterBar } from '../../components/recap/RecapFilterBar';
import { RecapStatisticsSection } from '../../components/recap/RecapStatisticsSection';
import { RecapTable } from '../../components/recap/RecapTable';
import { RecapMobileList } from '../../components/recap/RecapMobileList';
import { RecapDetailModal } from '../../components/recap/RecapDetailModal';
import { AttendanceDetailDrawerModal } from '../../components/recap/AttendanceDetailDrawerModal';
import { Button } from '../../components/ui/Button';

export const AttendanceRecapPage: React.FC = () => {
  const [startDate, setStartDate] = useState<string>(getMakassarFirstDayOfMonthString());
  const [endDate, setEndDate] = useState<string>(getMakassarTodayDateString());
  const [departmentId, setDepartmentId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorState, setErrorState] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const [records, setRecords] = useState<EmployeeRecapRecord[]>([]);
  const [summary, setSummary] = useState<GlobalRecapSummary | null>(null);
  const [statistics, setStatistics] = useState<RecapStatistics | null>(null);

  // Modal 1: Log recap breakdown modal for employee across date range
  const [selectedRecapEmployee, setSelectedRecapEmployee] = useState<EmployeeRecapRecord | null>(
    null
  );

  // Modal 2: Single date snapshot detail modal
  const [snapshotEmployeeId, setSnapshotEmployeeId] = useState<string | null>(null);
  const [snapshotDate, setSnapshotDate] = useState<string>(getMakassarTodayDateString());

  // Load departments once
  useEffect(() => {
    const loadDepts = async () => {
      const depts = await attendanceRecapService.getDepartments();
      setDepartments(depts);
    };
    loadDepts();
  }, []);

  const loadRecapData = async (
    sDate = startDate,
    eDate = endDate,
    deptId = departmentId,
    statFilt = statusFilter,
    query = searchQuery
  ) => {
    if (sDate > eDate) {
      setValidationError('Tanggal mulai tidak boleh lebih besar dari tanggal akhir.');
      return;
    }

    setValidationError(null);
    setLoading(true);
    setErrorState(null);

    try {
      const res = await attendanceRecapService.getAttendanceRecap({
        startDate: sDate,
        endDate: eDate,
        departmentId: deptId,
        statusFilter: statFilt as any,
        searchQuery: query,
      });

      setRecords(res.records);
      setSummary(res.summary);
      setStatistics(res.statistics);
    } catch (err: any) {
      console.error('Failed to load attendance recap data:', err);
      setErrorState(err?.message || 'Data rekap presensi belum dapat dimuat. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRecapData(startDate, endDate, departmentId, statusFilter, searchQuery);
  }, []);

  const handleApplyFilters = (filters: {
    startDate: string;
    endDate: string;
    departmentId: string;
    statusFilter: string;
    searchQuery: string;
  }) => {
    setStartDate(filters.startDate);
    setEndDate(filters.endDate);
    setDepartmentId(filters.departmentId);
    setStatusFilter(filters.statusFilter);
    setSearchQuery(filters.searchQuery);

    loadRecapData(
      filters.startDate,
      filters.endDate,
      filters.departmentId,
      filters.statusFilter,
      filters.searchQuery
    );
  };

  const handlePresetChange = (
    preset: 'today' | 'last_7_days' | 'this_month' | 'last_month' | 'this_year'
  ) => {
    const todayStr = getMakassarTodayDateString();
    const [y, m, d] = todayStr.split('-').map(Number);
    let newStart = todayStr;
    let newEnd = todayStr;

    if (preset === 'today') {
      newStart = todayStr;
      newEnd = todayStr;
    } else if (preset === 'last_7_days') {
      const past = new Date(y, m - 1, d - 6, 12, 0, 0);
      const py = past.getFullYear();
      const pm = String(past.getMonth() + 1).padStart(2, '0');
      const pd = String(past.getDate()).padStart(2, '0');
      newStart = `${py}-${pm}-${pd}`;
      newEnd = todayStr;
    } else if (preset === 'this_month') {
      newStart = `${y}-${String(m).padStart(2, '0')}-01`;
      newEnd = todayStr;
    } else if (preset === 'last_month') {
      const firstDayLastMonth = new Date(y, m - 2, 1, 12, 0, 0);
      const lastDayLastMonth = new Date(y, m - 1, 0, 12, 0, 0);
      const lmy = firstDayLastMonth.getFullYear();
      const lmm = String(firstDayLastMonth.getMonth() + 1).padStart(2, '0');
      const lmdEnd = String(lastDayLastMonth.getDate()).padStart(2, '0');
      newStart = `${lmy}-${lmm}-01`;
      newEnd = `${lmy}-${lmm}-${lmdEnd}`;
    } else if (preset === 'this_year') {
      newStart = `${y}-01-01`;
      newEnd = todayStr;
    }

    setStartDate(newStart);
    setEndDate(newEnd);

    loadRecapData(newStart, newEnd, departmentId, statusFilter, searchQuery);
  };

  const handleResetFilter = () => {
    const defStart = getMakassarFirstDayOfMonthString();
    const defEnd = getMakassarTodayDateString();

    setStartDate(defStart);
    setEndDate(defEnd);
    setDepartmentId('all');
    setStatusFilter('all');
    setSearchQuery('');

    loadRecapData(defStart, defEnd, 'all', 'all', '');
  };

  const handleRefresh = () => {
    loadRecapData(startDate, endDate, departmentId, statusFilter, searchQuery);
  };

  const handleInspectDateDetail = (employeeId: string, date: string) => {
    setSnapshotEmployeeId(employeeId);
    setSnapshotDate(date);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* Header Banner */}
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF] flex items-center gap-1.5">
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#F97316]" />
            Laporan & Analisis Kehadiran Pegawai
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-[#111827] mt-0.5">
            Rekap dan Laporan Presensi
          </h2>
          <p className="text-xs sm:text-sm text-[#6B7280] mt-1">
            Rekapitulasi kehadiran pegawai sekolah, tren harian, dan laporan rincian presensi
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
          Segarkan Data
        </Button>
      </div>

      {/* Summary Cards */}
      <RecapSummaryCards summary={summary} loading={loading} />

      {/* Filter Bar */}
      <RecapFilterBar
        startDate={startDate}
        endDate={endDate}
        departmentId={departmentId}
        statusFilter={statusFilter}
        searchQuery={searchQuery}
        departments={departments}
        loading={loading}
        validationError={validationError}
        onApplyFilter={handleApplyFilters}
        onPresetChange={handlePresetChange}
        onResetFilter={handleResetFilter}
        onRefresh={handleRefresh}
      />

      {/* Error State */}
      {errorState && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-amber-800 space-y-3">
          <div className="flex items-center gap-2 font-bold text-sm">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>Gagal Memuat Rekap Presensi</span>
          </div>
          <p className="text-xs leading-relaxed">{errorState}</p>
          <Button variant="outline" size="sm" onClick={handleRefresh} className="mt-2 text-xs">
            Coba Lagi
          </Button>
        </div>
      )}

      {/* Statistics Section */}
      <RecapStatisticsSection statistics={statistics} loading={loading} />

      {/* Loading Skeleton / Content */}
      {loading ? (
        <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-6 shadow-2xs space-y-4 animate-pulse">
          <div className="h-4 bg-[#F3F4F6] rounded w-1/4" />
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-12 bg-[#F3F4F6] rounded-xl" />
            ))}
          </div>
        </div>
      ) : !errorState && records.length === 0 ? (
        /* Empty State */
        <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-10 text-center shadow-2xs space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#F3F4F6] text-[#9CA3AF] flex items-center justify-center mx-auto">
            <Users className="w-6 h-6 text-[#9CA3AF]" />
          </div>
          <h4 className="text-base font-bold text-[#111827]">Tidak Ada Data Rekap</h4>
          <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
            Tidak ditemukan pegawai yang sesuai dengan filter atau kata kunci pencarian pada periode ini.
          </p>
        </div>
      ) : !errorState ? (
        /* Records Content */
        <div className="space-y-4">
          <RecapTable records={records} onSelectEmployee={setSelectedRecapEmployee} />
          <RecapMobileList records={records} onSelectEmployee={setSelectedRecapEmployee} />

          <div className="text-xs text-[#6B7280] text-right font-medium pr-1">
            Menampilkan rekap untuk <strong className="text-[#111827]">{records.length}</strong> pegawai
          </div>
        </div>
      ) : null}

      {/* Modal 1: Read-Only Recap Period Breakdown Modal */}
      <RecapDetailModal
        record={selectedRecapEmployee}
        startDate={startDate}
        endDate={endDate}
        onInspectDateDetail={handleInspectDateDetail}
        onClose={() => setSelectedRecapEmployee(null)}
      />

      {/* Modal 2: Read-Only Single Date Snapshot Detail Modal */}
      <AttendanceDetailDrawerModal
        employeeId={snapshotEmployeeId}
        initialDate={snapshotDate}
        startDate={startDate}
        endDate={endDate}
        onClose={() => setSnapshotEmployeeId(null)}
      />

      {/* Footer Info */}
      <div className="p-4 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] flex items-start gap-3 text-xs text-[#6B7280]">
        <Info className="w-4 h-4 text-[#F97316] shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-[#111827]">Informasi Detail Read-Only:</span> Seluruh
          rincian detail presensi bersifat read-only untuk keperluan verifikasi operasional dan
          transparansi data kehadiran.
        </div>
      </div>
    </div>
  );
};
