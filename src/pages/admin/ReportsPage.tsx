import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Calendar,
  Users,
  CalendarRange,
  FileText,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import {
  attendanceReportService,
  getMakassarTodayDateString,
  getMakassarFirstDayOfMonthString,
  formatMakassarShortDate,
} from '../../services/attendanceReportService';
import {
  attendanceStatusService,
  EvaluatedStatusResult,
} from '../../services/attendanceStatusService';
import { attendanceExcelExportService } from '../../services/attendanceExcelExportService';
import { attendancePdfExportService } from '../../services/attendancePdfExportService';
import {
  AttendanceReportFilter,
  AttendanceReportResponse,
  MonthlyRecapReportResponse,
} from '../../types/attendanceReport.types';
import { ReportHeader } from '../../components/reports/ReportHeader';
import { ReportFilterBar } from '../../components/reports/ReportFilterBar';
import { ReportSummaryCards } from '../../components/reports/ReportSummaryCards';
import { DailyReportTable } from '../../components/reports/DailyReportTable';
import { EmployeeReportTable } from '../../components/reports/EmployeeReportTable';
import { MonthlyReportTable } from '../../components/reports/MonthlyReportTable';
import { DetailReportTable } from '../../components/reports/DetailReportTable';
import { MonthlyRecapReportTable } from '../../components/reports/MonthlyRecapReportTable';
import { Button } from '../../components/ui/Button';
import { useInstitutionSettings } from '../../hooks/useInstitutionSettings';

type ReportTab = 'daily' | 'employee' | 'monthly' | 'monthly_recap' | 'detail';

export const ReportsPage: React.FC = () => {
  const institutionSettings = useInstitutionSettings();

  // Initial default filter (Current Month in Asia/Makassar)
  const [filter, setFilter] = useState<AttendanceReportFilter>({
    startDate: getMakassarFirstDayOfMonthString(),
    endDate: getMakassarTodayDateString(),
    employeeId: null,
    departmentId: null,
    locationId: null,
    checkInStatus: null,
    checkOutStatus: null,
    searchQuery: undefined,
  });

  const [activeTab, setActiveTab] = useState<ReportTab>('daily');
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [locations, setLocations] = useState<{ id: string; name: string }[]>([]);
  const [employees, setEmployees] = useState<{ id: string; name: string; nip: string | null }[]>([]);

  const [reportData, setReportData] = useState<AttendanceReportResponse | null>(null);
  const [monthlyRecapData, setMonthlyRecapData] = useState<MonthlyRecapReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRecapLoading, setIsRecapLoading] = useState<boolean>(false);
  const [isDetailLoading, setIsDetailLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Export State & Feedback
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportingType, setExportingType] = useState<'excel' | 'pdf' | null>(null);
  const [exportMessage, setExportMessage] = useState<string | null>(null);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  const [detailPage, setDetailPage] = useState<number>(1);
  const [detailPageSize, setDetailPageSize] = useState<number>(15);

  // Controlled client-side & unified mobile/tablet search states
  const [employeeSearch, setEmployeeSearch] = useState<string>('');
  const [recapSearch, setRecapSearch] = useState<string>('');
  const [recapEmployeeType, setRecapEmployeeType] = useState<string>('all');
  const [recapPage, setRecapPage] = useState<number>(1);
  const [mobileGlobalSearch, setMobileGlobalSearch] = useState<string>(filter.searchQuery || '');

  // Isolated Local State & LRU Cache for Tab Harian Mobile/Tablet (<1024px)
  const initialTodayWita = getMakassarTodayDateString();
  const [dailySelectedDate, setDailySelectedDate] = useState<string>(initialTodayWita);
  const [dailySelectedMonth, setDailySelectedMonth] = useState<string>(initialTodayWita.slice(5, 7));
  const [dailySelectedYear, setDailySelectedYear] = useState<string>(initialTodayWita.slice(0, 4));
  const [dailyDepartmentId, setDailyDepartmentId] = useState<string>('all');
  const [dailyEvaluatedRecords, setDailyEvaluatedRecords] = useState<EvaluatedStatusResult[]>([]);
  const [isDailyEvalLoading, setIsDailyEvalLoading] = useState<boolean>(false);
  const [dailyEvalError, setDailyEvalError] = useState<string | null>(null);

  const dailyCacheRef = useRef<Map<string, EvaluatedStatusResult[]>>(new Map());
  const dailyInFlightRef = useRef<Map<string, Promise<EvaluatedStatusResult[]>>>(new Map());
  const dailyRequestIdRef = useRef<number>(0);

  const latestFilterRef = useRef<AttendanceReportFilter>(filter);
  latestFilterRef.current = filter;
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMobileGlobalSearch(filter.searchQuery || '');
  }, [filter.searchQuery]);

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

  // 1. Load Filter Selectors (departments, locations, employees)
  useEffect(() => {
    let mounted = true;
    const fetchOptions = async () => {
      try {
        const [depts, locs, emps] = await Promise.all([
          attendanceReportService.getDepartments(),
          attendanceReportService.getLocations(),
          attendanceReportService.getEmployees(),
        ]);
        if (mounted) {
          setDepartments(depts);
          setLocations(locs);
          setEmployees(emps);
        }
      } catch (err) {
        console.error('Error loading filter options:', err);
      }
    };
    fetchOptions();
    return () => {
      mounted = false;
    };
  }, []);

  // 2. Main Report Loader
  const loadReport = useCallback(
    async (
      activeFilter: AttendanceReportFilter = filter,
      page: number = detailPage,
      pageSize: number = detailPageSize
    ) => {
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const response = await attendanceReportService.getFullReport(
          activeFilter,
          page,
          pageSize
        );
        setReportData(response);
      } catch (err: any) {
        console.error('Failed to load attendance report:', err);
        setErrorMessage(
          err.message ||
            'Terjadi kesalahan saat memuat data laporan presensi. Silakan periksa koneksi dan coba lagi.'
        );
      } finally {
        setIsLoading(false);
      }
    },
    [filter, detailPage, detailPageSize]
  );

  // Load initial report on mount
  useEffect(() => {
    loadReport(filter, 1, detailPageSize);
  }, []);

  // 2.5. Monthly Recap Loader (PHASE 9G)
  useEffect(() => {
    if (activeTab !== 'monthly_recap') return;

    let mounted = true;
    const loadRecap = async () => {
      setIsRecapLoading(true);
      try {
        const [year, month] = filter.startDate.split('-').map(Number);
        const data = await attendanceReportService.getMonthlyRecapReport(year, month, {
          departmentId: filter.departmentId,
        });
        if (mounted) {
          setMonthlyRecapData(data);
        }
      } catch (err) {
        console.error('Failed to load monthly recap grid:', err);
      } finally {
        if (mounted) {
          setIsRecapLoading(false);
        }
      }
    };

    loadRecap();
    return () => {
      mounted = false;
    };
  }, [activeTab, filter.startDate, filter.departmentId]);

  // 2.6. Daily Mobile/Tablet Per-Date Evaluated Loader with LRU Cache (max 31), In-Flight Dedup & Stale Guard
  const loadDailyEvaluated = useCallback(
    async (targetDate: string, targetDeptId: string) => {
      const normalizedDept = targetDeptId || 'all';
      const cacheKey = `${targetDate}:${normalizedDept}`;

      const cache = dailyCacheRef.current;
      if (cache.has(cacheKey)) {
        const cached = cache.get(cacheKey)!;
        // Refresh LRU recency
        cache.delete(cacheKey);
        cache.set(cacheKey, cached);
        dailyRequestIdRef.current += 1;
        setDailyEvaluatedRecords(cached);
        setDailyEvalError(null);
        setIsDailyEvalLoading(false);
        return;
      }

      const reqId = ++dailyRequestIdRef.current;
      setIsDailyEvalLoading(true);
      setDailyEvalError(null);
      setDailyEvaluatedRecords([]);

      let inFlightPromise = dailyInFlightRef.current.get(cacheKey);
      if (!inFlightPromise) {
        inFlightPromise = attendanceStatusService.getEvaluatedMatrix(
          targetDate,
          targetDate,
          null,
          normalizedDept === 'all' ? null : normalizedDept
        );
        dailyInFlightRef.current.set(cacheKey, inFlightPromise);
      }

      try {
        const rows = await inFlightPromise;

        // Store valid response in 31-entry LRU cache even if request became stale
        const currentCache = dailyCacheRef.current;
        if (currentCache.has(cacheKey)) {
          currentCache.delete(cacheKey);
        } else if (currentCache.size >= 31) {
          const oldestKey = currentCache.keys().next().value;
          if (oldestKey !== undefined) {
            currentCache.delete(oldestKey);
          }
        }
        currentCache.set(cacheKey, rows);

        if (dailyRequestIdRef.current === reqId) {
          setDailyEvaluatedRecords(rows);
          setDailyEvalError(null);
          setIsDailyEvalLoading(false);
        }
      } catch (err: any) {
        if (dailyRequestIdRef.current === reqId) {
          setDailyEvaluatedRecords([]);
          setDailyEvalError(
            err?.message || 'Gagal memuat data presensi harian. Silakan coba lagi.'
          );
          setIsDailyEvalLoading(false);
        }
      } finally {
        if (dailyInFlightRef.current.get(cacheKey) === inFlightPromise) {
          dailyInFlightRef.current.delete(cacheKey);
        }
      }
    },
    []
  );

  useEffect(() => {
    if (activeTab !== 'daily') return;
    loadDailyEvaluated(dailySelectedDate, dailyDepartmentId);
  }, [activeTab, dailySelectedDate, dailyDepartmentId, loadDailyEvaluated]);

  const handleDailyMonthChange = (nextYear: string, nextMonth: string) => {
    const todayStr = getMakassarTodayDateString();
    const currentYear = todayStr.slice(0, 4);
    const currentMonth = todayStr.slice(5, 7);
    const nextDate =
      nextYear === currentYear && nextMonth === currentMonth
        ? todayStr
        : `${nextYear}-${nextMonth}-01`;

    setDailySelectedYear(nextYear);
    setDailySelectedMonth(nextMonth);
    setDailySelectedDate(nextDate);
  };

  const handleApplyDailyMobileFilter = (next: {
    year: string;
    month: string;
    departmentId: string;
  }) => {
    const monthChanged =
      next.year !== dailySelectedYear || next.month !== dailySelectedMonth;

    setDailyDepartmentId(next.departmentId || 'all');

    if (monthChanged) {
      handleDailyMonthChange(next.year, next.month);
    }
  };

  // 3. Filter Actions
  const handleApplyFilter = (newFilter: AttendanceReportFilter) => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = null;
    }
    setFilter(newFilter);
    setDetailPage(1);
    loadReport(newFilter, 1, detailPageSize);
  };

  const applyFilterRef = useRef(handleApplyFilter);
  applyFilterRef.current = handleApplyFilter;

  const handleResetFilter = () => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = null;
    }
    const defaultFilter: AttendanceReportFilter = {
      startDate: getMakassarFirstDayOfMonthString(),
      endDate: getMakassarTodayDateString(),
      employeeId: null,
      departmentId: null,
      locationId: null,
      checkInStatus: null,
      checkOutStatus: null,
      searchQuery: undefined,
    };
    setFilter(defaultFilter);
    setDetailPage(1);
    loadReport(defaultFilter, 1, detailPageSize);
  };

  const handleResetMobileAll = (overrides?: {
    filter?: AttendanceReportFilter;
    employeeTypeFilter?: string;
  }) => {
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
      searchDebounceRef.current = null;
    }
    setEmployeeSearch('');
    setRecapSearch('');
    setRecapPage(1);
    setRecapEmployeeType(overrides?.employeeTypeFilter ?? 'all');
    setMobileGlobalSearch('');

    if (overrides?.filter) {
      handleApplyFilter(overrides.filter);
    } else {
      handleResetFilter();
    }
  };

  const handleRecapEmployeeTypeChange = (type: string) => {
    setRecapEmployeeType(type);
    setRecapPage(1);
  };

  const mobileSearchValue =
    activeTab === 'employee'
      ? employeeSearch
      : activeTab === 'monthly_recap'
        ? recapSearch
        : mobileGlobalSearch;

  const handleMobileSearchChange = (q: string) => {
    if (activeTab === 'employee') {
      setEmployeeSearch(q);
      return;
    }
    if (activeTab === 'monthly_recap') {
      setRecapSearch(q);
      setRecapPage(1);
      return;
    }

    setMobileGlobalSearch(q);
    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }
    searchDebounceRef.current = setTimeout(() => {
      applyFilterRef.current({
        ...latestFilterRef.current,
        searchQuery: q.trim() || undefined,
      });
    }, 300);
  };

  // 4. Pagination handlers for Detail Tab
  const handlePageChange = async (newPage: number) => {
    setDetailPage(newPage);
    if (!reportData) return;

    setIsDetailLoading(true);
    try {
      const pagedDetails = await attendanceReportService.getAttendanceDetails(
        filter,
        newPage,
        detailPageSize
      );
      setReportData((prev) => (prev ? { ...prev, details: pagedDetails } : null));
    } catch (err) {
      console.error('Error navigating detail page:', err);
    } finally {
      setIsDetailLoading(false);
    }
  };

  const handlePageSizeChange = async (newPageSize: number) => {
    setDetailPageSize(newPageSize);
    setDetailPage(1);
    if (!reportData) return;

    setIsDetailLoading(true);
    try {
      const pagedDetails = await attendanceReportService.getAttendanceDetails(
        filter,
        1,
        newPageSize
      );
      setReportData((prev) => (prev ? { ...prev, details: pagedDetails } : null));
    } catch (err) {
      console.error('Error changing detail page size:', err);
    } finally {
      setIsDetailLoading(false);
    }
  };

  // 5. Export Actions
  const handleExportExcel = async () => {
    if (isExporting) return;
    if (activeTab === 'monthly_recap') {
      if (!monthlyRecapData) return;
    } else {
      if (!reportData) return;
    }

    setIsExporting(true);
    setExportingType('excel');
    setExportMessage('Menyiapkan file Excel...');
    setExportSuccess(null);
    setErrorMessage(null);

    try {
      if (activeTab === 'daily' && reportData) {
        attendanceExcelExportService.exportDailySummary(reportData.dailySummaries, filter);
      } else if (activeTab === 'employee' && reportData) {
        attendanceExcelExportService.exportEmployeeSummary(reportData.employeeSummaries, filter);
      } else if (activeTab === 'monthly' && reportData) {
        attendanceExcelExportService.exportMonthlySummary(reportData.monthlySummaries, filter);
      } else if (activeTab === 'detail' && reportData) {
        // Fetch ALL details without pagination limit
        const allDetails = await attendanceReportService.getAllAttendanceDetails(filter);
        attendanceExcelExportService.exportAttendanceDetails(allDetails, filter);
      } else if (activeTab === 'monthly_recap' && monthlyRecapData) {
        const [year, month] = filter.startDate.split('-').map(Number);
        attendanceExcelExportService.exportMonthlyRecapToExcel(monthlyRecapData, year, month);
      }
      setExportSuccess('Export Excel berhasil dibuat.');
      setTimeout(() => setExportSuccess(null), 4000);
    } catch (err: any) {
      console.error('Export Excel error:', err);
      setErrorMessage(err.message || 'Gagal mengekspor file Excel. Silakan coba lagi.');
    } finally {
      setIsExporting(false);
      setExportingType(null);
      setExportMessage(null);
    }
  };

  const handleExportPdf = async () => {
    if (isExporting) return;
    if (activeTab === 'monthly_recap') {
      if (!monthlyRecapData) return;
    } else {
      if (!reportData) return;
    }

    setIsExporting(true);
    setExportingType('pdf');
    setExportMessage('Menyiapkan file PDF...');
    setExportSuccess(null);
    setErrorMessage(null);

    const empLabel = employees.find((e) => e.id === filter.employeeId)?.name;
    const deptLabel = departments.find((d) => d.id === filter.departmentId)?.name;
    const locLabel = locations.find((l) => l.id === filter.locationId)?.name;

    const filterLabels = {
      employee: empLabel,
      department: deptLabel,
      location: locLabel,
    };

    try {
      if (activeTab === 'daily' && reportData) {
        attendancePdfExportService.exportDailySummary(reportData.dailySummaries, filter, filterLabels);
      } else if (activeTab === 'employee' && reportData) {
        attendancePdfExportService.exportEmployeeSummary(reportData.employeeSummaries, filter, filterLabels);
      } else if (activeTab === 'monthly' && reportData) {
        attendancePdfExportService.exportMonthlySummary(reportData.monthlySummaries, filter, filterLabels);
      } else if (activeTab === 'detail' && reportData) {
        // Fetch ALL details without pagination limit
        const allDetails = await attendanceReportService.getAllAttendanceDetails(filter);
        attendancePdfExportService.exportAttendanceDetails(allDetails, filter, filterLabels);
      } else if (activeTab === 'monthly_recap' && monthlyRecapData) {
        const [year, month] = filter.startDate.split('-').map(Number);
        await attendancePdfExportService.exportMonthlyRecapToPdf(
          monthlyRecapData,
          year,
          month,
          filter,
          filterLabels,
          institutionSettings.schoolLogo
        );
      }
      setExportSuccess('Export PDF berhasil dibuat.');
      setTimeout(() => setExportSuccess(null), 4000);
    } catch (err: any) {
      console.error('Export PDF error:', err);
      setErrorMessage(err.message || 'Gagal mengekspor file PDF. Silakan coba lagi.');
    } finally {
      setIsExporting(false);
      setExportingType(null);
      setExportMessage(null);
    }
  };

  const dateRangeLabel = `${formatMakassarShortDate(filter.startDate)} - ${formatMakassarShortDate(filter.endDate)}`;

  const defStart = getMakassarFirstDayOfMonthString();
  const defEnd = getMakassarTodayDateString();
  const hasActiveFilter = Boolean(
    filter.startDate !== defStart ||
      filter.endDate !== defEnd ||
      filter.employeeId ||
      filter.departmentId ||
      filter.locationId ||
      filter.checkInStatus ||
      filter.checkOutStatus ||
      filter.searchQuery ||
      (activeTab === 'employee' && employeeSearch.trim()) ||
      (activeTab === 'monthly_recap' && (recapSearch.trim() || recapEmployeeType !== 'all'))
  );

  const tabLabels: Record<ReportTab, string> = {
    daily: 'Rekap Harian',
    employee: 'Rekap Per Pegawai',
    monthly: 'Rekap Bulanan',
    monthly_recap: 'Rekap Bulanan Grid',
    detail: 'Detail Presensi',
  };

  const mobilePillTabs: { id: ReportTab; label: string }[] = [
    { id: 'daily', label: 'Harian' },
    { id: 'employee', label: 'Pegawai' },
    { id: 'monthly', label: 'Bulanan' },
    { id: 'monthly_recap', label: 'Bulanan Grid' },
    { id: 'detail', label: 'Detail' },
  ];

  const tabItems = [
    {
      id: 'daily' as const,
      label: 'Rekap Harian',
      icon: Calendar,
      count: reportData?.dailySummaries.length || 0,
    },
    {
      id: 'employee' as const,
      label: 'Rekap Per Pegawai',
      icon: Users,
      count: reportData?.employeeSummaries.length || 0,
    },
    {
      id: 'monthly' as const,
      label: 'Rekap Bulanan',
      icon: CalendarRange,
      count: reportData?.monthlySummaries.length || 0,
    },
    {
      id: 'monthly_recap' as const,
      label: 'Rekap Bulanan Grid',
      icon: CalendarRange,
      count: monthlyRecapData?.rows.length || 0,
    },
    {
      id: 'detail' as const,
      label: 'Detail Presensi',
      icon: FileText,
      count: reportData?.details.totalCount || 0,
    },
  ];

  return (
    <div className="space-y-4 lg:space-y-5 max-w-7xl mx-auto pb-2 lg:pb-12">
      {/* 1. Header Banner */}
      <ReportHeader
        onRefresh={() => loadReport(filter, detailPage, detailPageSize)}
        isLoading={isLoading}
        isExporting={isExporting}
        dateRangeLabel={dateRangeLabel}
        activeTabLabel={tabLabels[activeTab]}
      />

      {/* 2. Export Busy / Toast Indicator */}
      {isExporting && exportMessage && (
        <div className="bg-orange-50 dark:bg-[#431F0B]/40 border border-orange-200 dark:border-orange-800/50 rounded-2xl p-4 flex items-center gap-3 text-orange-800 dark:text-orange-200 shadow-2xs">
          <Loader2 className="w-5 h-5 text-[#F97316] animate-spin shrink-0" />
          <div>
            <span className="text-xs font-bold">{exportMessage}</span>
            <p className="text-[11px] text-orange-700 dark:text-orange-300 mt-0.5">
              Sistem sedang memproses file untuk tab <strong>{tabLabels[activeTab]}</strong>. Harap tunggu sebentar.
            </p>
          </div>
        </div>
      )}

      {/* 3. Export Success Toast */}
      {exportSuccess && (
        <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 rounded-2xl p-4 flex items-center gap-3 text-emerald-800 dark:text-emerald-200 shadow-2xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="text-xs font-bold">{exportSuccess}</span>
        </div>
      )}

      {/* 4. Filter Bar & Mobile Tabs (On <lg, pill tabs always appear below active tab control area) */}
      <div className="flex flex-col gap-4 lg:gap-5">
        <div className="order-1 lg:order-none">
          <ReportFilterBar
            filter={filter}
            onApplyFilter={handleApplyFilter}
            onResetFilter={handleResetFilter}
            departments={departments}
            locations={locations}
            employees={employees}
            isLoading={isLoading}
            activeTab={activeTab}
            mobileSearchValue={mobileSearchValue}
            onMobileSearchChange={handleMobileSearchChange}
            employeeTypeFilter={recapEmployeeType}
            onEmployeeTypeChange={handleRecapEmployeeTypeChange}
            onResetMobileAll={handleResetMobileAll}
            dailySelectedDate={dailySelectedDate}
            dailySelectedMonth={dailySelectedMonth}
            dailySelectedYear={dailySelectedYear}
            dailyDepartmentId={dailyDepartmentId}
            onDailySelectDate={setDailySelectedDate}
            onDailyMonthChange={handleDailyMonthChange}
            onApplyDailyFilter={handleApplyDailyMobileFilter}
          />
        </div>

        {/* 5. Error Banner */}
        {errorMessage && (
          <div className="order-3 lg:order-none bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/50 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-red-800 dark:text-red-200">
            <div className="flex items-start sm:items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900/60 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold">Peringatan / Kendala Laporan</h4>
                <p className="text-xs text-red-700 dark:text-red-300 mt-0.5">{errorMessage}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadReport(filter, detailPage, detailPageSize)}
              className="border-red-300 dark:border-red-800/60 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-950/50 self-start sm:self-auto shrink-0"
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              Coba Lagi
            </Button>
          </div>
        )}

        {/* 6. Global Summary Cards (Desktop Only) */}
        <div className="hidden lg:block">
          <ReportSummaryCards metrics={reportData?.metrics || null} isLoading={isLoading} />
        </div>

        {/* 7. Navigation Tabs */}
        {/* Mobile & Tablet (<lg): Horizontal Scrollable Pill Tabs */}
        <div
          className={`lg:hidden order-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
            activeTab === 'daily' ? 'pt-3 border-t border-[#E5E7EB] dark:border-[#404040]' : ''
          }`}
        >
          <div className="flex items-center gap-2 min-w-max">
            {mobilePillTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  disabled={isExporting}
                  className={`px-3.5 py-1.5 rounded-full text-xs whitespace-nowrap shrink-0 transition-colors cursor-pointer disabled:opacity-60 ${
                    isActive
                      ? 'bg-[#F97316] text-white font-semibold'
                      : 'bg-[#F3F4F6] dark:bg-[#303030] text-[#6B7280] dark:text-[#A3A3A3] font-medium hover:text-[#111827] dark:hover:text-[#F9FAFB]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Desktop (>=lg): Unchanged Original Underline Tabs */}
        <div className="hidden lg:block border-b border-[#E5E7EB] dark:border-[#404040]">
          <div className="flex items-center gap-2 overflow-x-auto pb-px">
            {tabItems.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  disabled={isExporting}
                  className={`flex items-center gap-2 px-4 py-2.5 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors cursor-pointer disabled:opacity-60 ${
                    isActive
                      ? 'border-[#F97316] text-[#F97316] bg-orange-50/40 dark:bg-[#431F0B]/30 rounded-t-xl'
                      : 'border-transparent text-[#6B7280] dark:text-[#A3A3A3] hover:text-[#111827] dark:hover:text-[#F9FAFB] hover:border-gray-300 dark:hover:border-[#525252]'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-[#F97316]' : 'text-[#9CA3AF] dark:text-[#737373]'}`} />
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                      isActive
                        ? 'bg-orange-100 dark:bg-[#431F0B] text-orange-800 dark:text-orange-300'
                        : 'bg-gray-100 dark:bg-[#303030] text-[#6B7280] dark:text-[#A3A3A3]'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 8. Active Tab Content Section */}
      <div className="pt-0 lg:pt-1">
        {activeTab === 'daily' && (
          <DailyReportTable
            data={reportData?.dailySummaries || []}
            isLoading={isLoading}
            onExportExcel={handleExportExcel}
            onExportPdf={handleExportPdf}
            isExporting={isExporting}
            exportingType={exportingType}
            dailySelectedDate={dailySelectedDate}
            dailyEvaluatedRecords={dailyEvaluatedRecords}
            isDailyLoading={isDailyEvalLoading}
            dailyError={dailyEvalError}
            onRetryDaily={() => loadDailyEvaluated(dailySelectedDate, dailyDepartmentId)}
          />
        )}

        {activeTab === 'employee' && (
          <EmployeeReportTable
            data={reportData?.employeeSummaries || []}
            isLoading={isLoading}
            onExportExcel={handleExportExcel}
            onExportPdf={handleExportPdf}
            isExporting={isExporting}
            exportingType={exportingType}
            searchQuery={employeeSearch}
            onSearchChange={setEmployeeSearch}
          />
        )}

        {activeTab === 'monthly' && (
          <MonthlyReportTable
            data={reportData?.monthlySummaries || []}
            isLoading={isLoading}
            onExportExcel={handleExportExcel}
            onExportPdf={handleExportPdf}
            isExporting={isExporting}
            exportingType={exportingType}
            hasActiveFilter={hasActiveFilter}
          />
        )}

        {activeTab === 'monthly_recap' && (
          <MonthlyRecapReportTable
            data={monthlyRecapData}
            isLoading={isLoading || isRecapLoading}
            onExportExcel={handleExportExcel}
            onExportPdf={handleExportPdf}
            isExporting={isExporting}
            exportingType={exportingType}
            searchQuery={recapSearch}
            onSearchChange={(q) => {
              setRecapSearch(q);
              setRecapPage(1);
            }}
            employeeTypeFilter={recapEmployeeType}
            onEmployeeTypeChange={handleRecapEmployeeTypeChange}
            currentPage={recapPage}
            onPageChange={setRecapPage}
          />
        )}

        {activeTab === 'detail' && (
          <DetailReportTable
            data={reportData?.details || null}
            isLoading={isLoading || isDetailLoading}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
            onExportExcel={handleExportExcel}
            onExportPdf={handleExportPdf}
            isExporting={isExporting}
            exportingType={exportingType}
            hasActiveFilter={hasActiveFilter}
          />
        )}
      </div>
    </div>
  );
};

