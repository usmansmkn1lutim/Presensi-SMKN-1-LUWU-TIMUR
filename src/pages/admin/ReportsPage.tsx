import React, { useState, useEffect, useCallback } from 'react';
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

type ReportTab = 'daily' | 'employee' | 'monthly' | 'monthly_recap' | 'detail';

export const ReportsPage: React.FC = () => {
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

  // 3. Filter Actions
  const handleApplyFilter = (newFilter: AttendanceReportFilter) => {
    setFilter(newFilter);
    setDetailPage(1);
    loadReport(newFilter, 1, detailPageSize);
  };

  const handleResetFilter = () => {
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
        attendancePdfExportService.exportMonthlyRecapToPdf(monthlyRecapData, year, month, filter, filterLabels);
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

  const tabLabels: Record<ReportTab, string> = {
    daily: 'Rekap Harian',
    employee: 'Rekap Per Pegawai',
    monthly: 'Rekap Bulanan',
    monthly_recap: 'Rekap Bulanan Grid',
    detail: 'Detail Presensi',
  };

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
    <div className="space-y-5 max-w-7xl mx-auto pb-12">
      {/* 1. Header Banner */}
      <ReportHeader
        onRefresh={() => loadReport(filter, detailPage, detailPageSize)}
        isLoading={isLoading}
        isExporting={isExporting}
        exportingType={exportingType}
        dateRangeLabel={dateRangeLabel}
        activeTabLabel={tabLabels[activeTab]}
        onExportExcel={handleExportExcel}
        onExportPdf={handleExportPdf}
      />

      {/* 2. Export Busy / Toast Indicator */}
      {isExporting && exportMessage && (
        <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4 flex items-center gap-3 text-orange-800 shadow-2xs">
          <Loader2 className="w-5 h-5 text-[#F97316] animate-spin shrink-0" />
          <div>
            <span className="text-xs font-bold">{exportMessage}</span>
            <p className="text-[11px] text-orange-700 mt-0.5">
              Sistem sedang memproses file untuk tab <strong>{tabLabels[activeTab]}</strong>. Harap tunggu sebentar.
            </p>
          </div>
        </div>
      )}

      {/* 3. Export Success Toast */}
      {exportSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3 text-emerald-800 shadow-2xs">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="text-xs font-bold">{exportSuccess}</span>
        </div>
      )}

      {/* 4. Filter Bar */}
      <ReportFilterBar
        filter={filter}
        onApplyFilter={handleApplyFilter}
        onResetFilter={handleResetFilter}
        departments={departments}
        locations={locations}
        employees={employees}
        isLoading={isLoading}
      />

      {/* 5. Error Banner */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-red-800">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-red-100 text-red-600 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold">Peringatan / Kendala Laporan</h4>
              <p className="text-xs text-red-700 mt-0.5">{errorMessage}</p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadReport(filter, detailPage, detailPageSize)}
            className="border-red-300 text-red-700 hover:bg-red-100 self-start sm:self-auto shrink-0"
            leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
          >
            Coba Lagi
          </Button>
        </div>
      )}

      {/* 6. Global Summary Cards */}
      <ReportSummaryCards metrics={reportData?.metrics || null} isLoading={isLoading} />

      {/* 7. Navigation Tabs */}
      <div className="border-b border-[#E5E7EB]">
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
                    ? 'border-[#F97316] text-[#F97316] bg-orange-50/40 rounded-t-xl'
                    : 'border-transparent text-[#6B7280] hover:text-[#111827] hover:border-gray-300'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#F97316]' : 'text-[#9CA3AF]'}`} />
                <span>{tab.label}</span>
                <span
                  className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                    isActive
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-gray-100 text-[#6B7280]'
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 8. Active Tab Content Section */}
      <div className="pt-1">
        {activeTab === 'daily' && (
          <DailyReportTable
            data={reportData?.dailySummaries || []}
            isLoading={isLoading}
          />
        )}

        {activeTab === 'employee' && (
          <EmployeeReportTable
            data={reportData?.employeeSummaries || []}
            isLoading={isLoading}
          />
        )}

        {activeTab === 'monthly' && (
          <MonthlyReportTable
            data={reportData?.monthlySummaries || []}
            isLoading={isLoading}
          />
        )}

        {activeTab === 'monthly_recap' && (
          <MonthlyRecapReportTable
            data={monthlyRecapData}
            isLoading={isLoading || isRecapLoading}
          />
        )}

        {activeTab === 'detail' && (
          <DetailReportTable
            data={reportData?.details || null}
            isLoading={isLoading || isDetailLoading}
            onPageChange={handlePageChange}
            onPageSizeChange={handlePageSizeChange}
          />
        )}
      </div>
    </div>
  );
};
