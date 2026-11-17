import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  AlertCircle,
  Users,
  Search,
  SlidersHorizontal,
  LayoutList,
  LayoutGrid,
  X,
} from 'lucide-react';
import { attendanceMonitoringService } from '../../services/attendanceMonitoringService';
import {
  DepartmentOption,
  MonitoringRecord,
  MonitoringSummary,
} from '../../types/attendanceMonitoring.types';

import { MonitoringSummaryCards } from '../../components/monitoring/MonitoringSummaryCards';
import { MonitoringTable } from '../../components/monitoring/MonitoringTable';
import { MonitoringMobileList } from '../../components/monitoring/MonitoringMobileList';
import { MonitoringPhotoModal } from '../../components/monitoring/MonitoringPhotoModal';
import { EmployeePagination } from '../../components/employees/EmployeePagination';
import { Button } from '../../components/ui/Button';

export const AttendanceMonitoringPage: React.FC = () => {
  const getTodayString = () => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  };

  const [date, setDate] = useState<string>(getTodayString());
  const [departmentId, setDepartmentId] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const [departments, setDepartments] = useState<DepartmentOption[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorState, setErrorState] = useState<string | null>(null);

  const [records, setRecords] = useState<MonitoringRecord[]>([]);
  const [summary, setSummary] = useState<MonitoringSummary | null>(null);

  const [viewMode, setViewMode] = useState<'list' | 'card'>('list');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState<boolean>(false);
  const [selectedPhotoRecord, setSelectedPhotoRecord] = useState<MonitoringRecord | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const mobileFilterRef = useRef<HTMLDivElement>(null);

  const todayDateString = getTodayString();
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (date !== todayDateString) count++;
    if (departmentId !== 'all') count++;
    if (statusFilter !== 'all') count++;
    return count;
  }, [date, todayDateString, departmentId, statusFilter]);

  const handleResetMobileFilters = () => {
    setDate(getTodayString());
    setDepartmentId('all');
    setStatusFilter('all');
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        mobileFilterRef.current &&
        !mobileFilterRef.current.contains(event.target as Node)
      ) {
        setIsMobileFilterOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileFilterOpen(false);
      }
    };
    if (isMobileFilterOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileFilterOpen]);

  // Load departments once
  useEffect(() => {
    const loadDepts = async () => {
      const depts = await attendanceMonitoringService.getDepartments();
      setDepartments(depts);
    };
    loadDepts();
  }, []);

  const loadMonitoringData = async () => {
    setLoading(true);
    setErrorState(null);

    try {
      const res = await attendanceMonitoringService.getAttendanceMonitoring({
        date,
        departmentId,
        statusFilter: statusFilter as any,
        searchQuery,
      });

      setRecords(res.records);
      setSummary(res.summary);
    } catch (err: any) {
      console.error('Failed to load attendance monitoring data:', err);
      setErrorState('Data presensi belum dapat dimuat. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
    setSelectedPhotoRecord(null);
  }, [date, departmentId, statusFilter, searchQuery]);

  useEffect(() => {
    loadMonitoringData();
  }, [date, departmentId, statusFilter, searchQuery]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(records.length / pageSize)),
    [records.length, pageSize]
  );

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const paginatedRecords = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return records.slice(startIndex, startIndex + pageSize);
  }, [records, currentPage, pageSize]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-10">
      {/* Page Title */}
      <h1 className="text-xl sm:text-2xl font-bold text-[#111827] tracking-tight">
        Monitoring Presensi
      </h1>

      {/* Desktop Summary Cards (≥1024px) */}
      <div className="hidden lg:block">
        <MonitoringSummaryCards summary={summary} loading={loading} />
      </div>

      {/* Unified Single-Row Toolbar (Mobile, Tablet & Desktop) */}
      <div className="bg-transparent border-0 shadow-none p-0">
        <div className="relative flex items-center gap-2 lg:gap-3 justify-between w-full">
          {/* Integrated Search + Filter Bar */}
          <div className="flex items-center flex-1 min-w-0 bg-white border border-[#E5E7EB] rounded-xl focus-within:border-[#F97316] transition-colors pl-3 pr-1 lg:pr-1.5 gap-1.5 lg:gap-2">
            <Search className="w-4 h-4 text-[#9CA3AF] pointer-events-none shrink-0" />
            <input
              type="text"
              placeholder="Cari pegawai..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full min-w-0 h-9 lg:h-11 text-xs lg:text-sm bg-transparent border-0 focus:outline-none placeholder:text-[#9CA3AF] text-[#111827]"
              aria-label="Cari pegawai"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="text-[#9CA3AF] hover:text-[#111827] cursor-pointer p-0.5 lg:p-1 shrink-0"
                aria-label="Hapus kata kunci pencarian"
              >
                <X className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
              </button>
            )}

            {/* Filter Trigger Button & Popover */}
            <div className="sm:relative shrink-0" ref={mobileFilterRef}>
              <button
                type="button"
                onClick={() => setIsMobileFilterOpen((prev) => !prev)}
                className={`relative inline-flex items-center justify-center w-7.5 h-7.5 lg:w-8 lg:h-8 rounded-lg transition-all cursor-pointer ${
                  activeFilterCount > 0 || isMobileFilterOpen
                    ? 'bg-orange-50 text-[#EA580C]'
                    : 'text-[#6B7280] hover:bg-gray-100 hover:text-[#111827]'
                }`}
                aria-expanded={isMobileFilterOpen}
                aria-label="Buka filter monitoring"
                title="Filter Monitoring"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 px-1 py-0.2 rounded-full text-[8px] font-bold bg-[#F97316] text-white">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {isMobileFilterOpen && (
                <div className="absolute right-0 top-full mt-2 lg:mt-2.5 w-full sm:w-80 lg:w-96 bg-white border border-[#E5E7EB] rounded-2xl shadow-xl p-3.5 lg:p-4 z-30 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between pb-2.5 border-b border-[#F3F4F6]">
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-[#F97316]" />
                      <h4 className="text-xs font-bold text-[#111827]">Filter Monitoring</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsMobileFilterOpen(false)}
                      className="text-[#9CA3AF] hover:text-[#111827] p-1 rounded-lg cursor-pointer"
                      aria-label="Tutup panel filter"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-2.5 py-2 text-xs">
                    <div>
                      <label
                        htmlFor="mobileMonitoringDateInput"
                        className="block text-[10px] font-semibold text-[#6B7280] mb-1"
                      >
                        Tanggal Monitoring
                      </label>
                      <input
                        id="mobileMonitoringDateInput"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="w-full h-8 px-2 bg-white border border-[#E5E7EB] rounded-lg text-xs text-[#111827] focus:outline-none focus:border-[#F97316]"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="mobileMonitoringDepartmentInput"
                        className="block text-[10px] font-semibold text-[#6B7280] mb-1"
                      >
                        Satuan Kerja / Departemen
                      </label>
                      <select
                        id="mobileMonitoringDepartmentInput"
                        value={departmentId}
                        onChange={(e) => setDepartmentId(e.target.value)}
                        className="w-full h-8 px-2 bg-white border border-[#E5E7EB] rounded-lg text-xs text-[#111827] focus:outline-none focus:border-[#F97316]"
                      >
                        <option value="all">Semua Departemen</option>
                        {departments.map((dept) => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label
                        htmlFor="mobileMonitoringStatusInput"
                        className="block text-[10px] font-semibold text-[#6B7280] mb-1"
                      >
                        Status Presensi
                      </label>
                      <select
                        id="mobileMonitoringStatusInput"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        className="w-full h-8 px-2 bg-white border border-[#E5E7EB] rounded-lg text-xs text-[#111827] focus:outline-none focus:border-[#F97316]"
                      >
                        <option value="all">Semua Status Presensi</option>
                        <option value="belum_presensi">Belum Presensi</option>
                        <option value="sudah_masuk">Sudah Masuk</option>
                        <option value="sudah_pulang">Sudah Pulang</option>
                        <option value="on_time">Tepat Waktu</option>
                        <option value="late">Terlambat</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#F3F4F6] flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handleResetMobileFilters}
                      disabled={activeFilterCount === 0}
                      className="text-[11px] font-medium text-red-600 hover:underline disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                    >
                      Reset Filter
                    </button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setIsMobileFilterOpen(false)}
                    >
                      Tutup
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* View Switcher Minimalis (List / Grid) */}
          <div className="flex items-center gap-0.5 lg:gap-1 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('list')}
              className={`p-2 lg:p-2.5 rounded-lg text-xs transition-colors cursor-pointer ${
                viewMode === 'list'
                  ? 'text-[#F97316] font-bold bg-[#FFF7ED]'
                  : 'text-[#6B7280] hover:text-[#111827] hover:bg-gray-100/80'
              }`}
              title="Tampilan List"
              aria-label="Tampilan List"
              aria-pressed={viewMode === 'list'}
            >
              <LayoutList className="w-4 h-4 lg:w-4.5 lg:h-4.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('card')}
              className={`p-2 lg:p-2.5 rounded-lg text-xs transition-colors cursor-pointer ${
                viewMode === 'card'
                  ? 'text-[#F97316] font-bold bg-[#FFF7ED]'
                  : 'text-[#6B7280] hover:text-[#111827] hover:bg-gray-100/80'
              }`}
              title="Tampilan Grid"
              aria-label="Tampilan Grid"
              aria-pressed={viewMode === 'card'}
            >
              <LayoutGrid className="w-4 h-4 lg:w-4.5 lg:h-4.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Error State */}
      {errorState && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-amber-800 space-y-3">
          <div className="flex items-center gap-2 font-bold text-sm">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>Gagal Memuat Data Monitoring</span>
          </div>
          <p className="text-xs leading-relaxed">{errorState}</p>
          <Button
            variant="outline"
            size="sm"
            onClick={loadMonitoringData}
            className="mt-2 text-xs"
          >
            Coba Lagi
          </Button>
        </div>
      )}

      {/* Loading Skeleton / Records Content */}
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
          <h4 className="text-base font-bold text-[#111827]">Tidak Ada Data Presensi</h4>
          <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
            Tidak ditemukan pegawai yang sesuai dengan filter atau kata kunci pencarian pada tanggal ini.
          </p>
        </div>
      ) : !errorState ? (
        /* Records Content */
        <div className="space-y-4">
          {viewMode === 'list' && (
            <MonitoringTable
              records={paginatedRecords}
              onViewPhoto={setSelectedPhotoRecord}
            />
          )}
          <MonitoringMobileList
            records={paginatedRecords}
            viewMode={viewMode}
            onViewPhoto={setSelectedPhotoRecord}
          />

          <EmployeePagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={records.length}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
            pageSizeOptions={[10, 12, 20]}
            showPrefixLabel={false}
          />
        </div>
      ) : null}

      {selectedPhotoRecord && (
        <MonitoringPhotoModal
          record={selectedPhotoRecord}
          onClose={() => setSelectedPhotoRecord(null)}
        />
      )}
    </div>
  );
};
