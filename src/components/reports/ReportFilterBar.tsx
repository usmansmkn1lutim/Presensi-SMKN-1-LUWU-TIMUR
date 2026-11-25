import React, { useState, useEffect, useRef } from 'react';
import {
  SlidersHorizontal,
  Search,
  RotateCcw,
  Calendar,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Building2,
  MapPin,
  User,
  CheckCircle2,
  X,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { AttendanceReportFilter } from '../../types/attendanceReport.types';
import { COMMON_EMPLOYEE_TYPES } from '../../types/employee';
import {
  getMakassarTodayDateString,
  getMakassarFirstDayOfMonthString,
} from '../../services/attendanceReportService';

export type PresetPeriod = 'today' | 'this_week' | 'this_month' | 'custom';
export type ReportBarTab = 'daily' | 'employee' | 'monthly' | 'monthly_recap' | 'detail';

interface ReportFilterBarProps {
  filter: AttendanceReportFilter;
  onApplyFilter: (newFilter: AttendanceReportFilter) => void;
  onResetFilter: () => void;
  departments: { id: string; name: string }[];
  locations: { id: string; name: string }[];
  employees: { id: string; name: string; nip: string | null }[];
  isLoading: boolean;
  activeTab?: ReportBarTab;
  mobileSearchValue?: string;
  onMobileSearchChange?: (q: string) => void;
  employeeTypeFilter?: string;
  onEmployeeTypeChange?: (type: string) => void;
  onResetMobileAll?: (overrides?: {
    filter?: AttendanceReportFilter;
    employeeTypeFilter?: string;
  }) => void;
  dailySelectedDate?: string;
  dailySelectedMonth?: string;
  dailySelectedYear?: string;
  dailyDepartmentId?: string;
  onDailySelectDate?: (dateStr: string) => void;
  onDailyMonthChange?: (year: string, month: string) => void;
  onApplyDailyFilter?: (next: {
    year: string;
    month: string;
    departmentId: string;
  }) => void;
}

const SHORT_DAY_LABELS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];

const MONTH_OPTIONS = [
  { value: '01', label: 'Januari' },
  { value: '02', label: 'Februari' },
  { value: '03', label: 'Maret' },
  { value: '04', label: 'April' },
  { value: '05', label: 'Mei' },
  { value: '06', label: 'Juni' },
  { value: '07', label: 'Juli' },
  { value: '08', label: 'Agustus' },
  { value: '09', label: 'September' },
  { value: '10', label: 'Oktober' },
  { value: '11', label: 'November' },
  { value: '12', label: 'Desember' },
];

function computePresetDates(preset: Exclude<PresetPeriod, 'custom'>): {
  startDate: string;
  endDate: string;
} {
  const todayStr = getMakassarTodayDateString();
  const [y, m, d] = todayStr.split('-').map(Number);

  if (preset === 'today') {
    return { startDate: todayStr, endDate: todayStr };
  }
  if (preset === 'this_week') {
    const todayObj = new Date(y, m - 1, d, 12, 0, 0);
    const dayOfWeek = todayObj.getDay();
    const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const mondayObj = new Date(y, m - 1, d + diffToMonday, 12, 0, 0);
    const my = mondayObj.getFullYear();
    const mm = String(mondayObj.getMonth() + 1).padStart(2, '0');
    const md = String(mondayObj.getDate()).padStart(2, '0');
    return { startDate: `${my}-${mm}-${md}`, endDate: todayStr };
  }
  return {
    startDate: getMakassarFirstDayOfMonthString(),
    endDate: todayStr,
  };
}

function inferPresetFromDates(sDate: string, eDate: string): PresetPeriod {
  const today = computePresetDates('today');
  if (sDate === today.startDate && eDate === today.endDate) return 'today';

  const week = computePresetDates('this_week');
  if (sDate === week.startDate && eDate === week.endDate) return 'this_week';

  const month = computePresetDates('this_month');
  if (sDate === month.startDate && eDate === month.endDate) return 'this_month';

  return 'custom';
}

export const ReportFilterBar: React.FC<ReportFilterBarProps> = ({
  filter,
  onApplyFilter,
  onResetFilter,
  departments,
  locations,
  employees,
  isLoading,
  activeTab = 'daily',
  mobileSearchValue = '',
  onMobileSearchChange,
  employeeTypeFilter = 'all',
  onEmployeeTypeChange,
  onResetMobileAll,
  dailySelectedDate,
  dailySelectedMonth,
  dailySelectedYear,
  dailyDepartmentId = 'all',
  onDailySelectDate,
  onDailyMonthChange,
  onApplyDailyFilter,
}) => {
  // Desktop filter states
  const [selectedPreset, setSelectedPreset] = useState<PresetPeriod>('this_month');
  const [startDate, setStartDate] = useState<string>(filter.startDate);
  const [endDate, setEndDate] = useState<string>(filter.endDate);
  const [employeeId, setEmployeeId] = useState<string>(filter.employeeId || 'all');
  const [departmentId, setDepartmentId] = useState<string>(filter.departmentId || 'all');
  const [locationId, setLocationId] = useState<string>(filter.locationId || 'all');
  const [checkInStatus, setCheckInStatus] = useState<string>(filter.checkInStatus || 'all');
  const [checkOutStatus, setCheckOutStatus] = useState<string>(filter.checkOutStatus || 'all');
  const [searchQuery, setSearchQuery] = useState<string>(filter.searchQuery || '');
  const [isAdvancedOpen, setIsAdvancedOpen] = useState<boolean>(false);

  // Sync desktop states only when filter prop changes externally
  const prevFilterRef = useRef<AttendanceReportFilter>(filter);
  useEffect(() => {
    const prev = prevFilterRef.current;
    if (prev === filter) return;

    const datesChanged = prev.startDate !== filter.startDate || prev.endDate !== filter.endDate;
    prevFilterRef.current = filter;

    setStartDate(filter.startDate);
    setEndDate(filter.endDate);
    setEmployeeId(filter.employeeId || 'all');
    setDepartmentId(filter.departmentId || 'all');
    setLocationId(filter.locationId || 'all');
    setCheckInStatus(filter.checkInStatus || 'all');
    setCheckOutStatus(filter.checkOutStatus || 'all');
    setSearchQuery(filter.searchQuery || '');

    if (datesChanged) {
      setSelectedPreset(inferPresetFromDates(filter.startDate, filter.endDate));
    }
  }, [filter]);

  // Mobile & Tablet Contextual Filter Panel states
  const [isPanelOpen, setIsPanelOpen] = useState<boolean>(false);
  const [draftPreset, setDraftPreset] = useState<PresetPeriod>('this_month');
  const [draftStartDate, setDraftStartDate] = useState<string>(filter.startDate);
  const [draftEndDate, setDraftEndDate] = useState<string>(filter.endDate);
  const [draftMonth, setDraftMonth] = useState<string>(filter.startDate.slice(5, 7));
  const [draftYear, setDraftYear] = useState<string>(filter.startDate.slice(0, 4));
  const [draftDepartmentId, setDraftDepartmentId] = useState<string>(filter.departmentId || 'all');
  const [draftEmployeeId, setDraftEmployeeId] = useState<string>(filter.employeeId || 'all');
  const [draftCheckInStatus, setDraftCheckInStatus] = useState<string>(
    filter.checkInStatus || 'all'
  );
  const [draftCheckOutStatus, setDraftCheckOutStatus] = useState<string>(
    filter.checkOutStatus || 'all'
  );
  const [draftLocationId, setDraftLocationId] = useState<string>(filter.locationId || 'all');
  const [draftEmployeeType, setDraftEmployeeType] = useState<string>(employeeTypeFilter);
  const [draftDailyMonth, setDraftDailyMonth] = useState<string>(
    dailySelectedMonth || filter.startDate.slice(5, 7)
  );
  const [draftDailyYear, setDraftDailyYear] = useState<string>(
    dailySelectedYear || filter.startDate.slice(0, 4)
  );
  const [draftDailyDepartmentId, setDraftDailyDepartmentId] = useState<string>(
    dailyDepartmentId || 'all'
  );
  const [wasResetDraft, setWasResetDraft] = useState<boolean>(false);
  const [didChangeRecapMonth, setDidChangeRecapMonth] = useState<boolean>(false);
  const [dateError, setDateError] = useState<string | null>(null);
  const dailyPillRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    setIsPanelOpen(false);
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== 'daily' || !dailySelectedDate) return;
    const activeEl = dailyPillRefs.current[dailySelectedDate];
    if (activeEl) {
      activeEl.scrollIntoView({
        behavior: 'smooth',
        inline: 'center',
        block: 'nearest',
      });
    }
  }, [activeTab, dailySelectedDate, dailySelectedMonth, dailySelectedYear]);

  useEffect(() => {
    if (!isPanelOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsPanelOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPanelOpen]);

  const openMobileFilterPanel = () => {
    setDraftPreset(inferPresetFromDates(filter.startDate, filter.endDate));
    setDraftStartDate(filter.startDate);
    setDraftEndDate(filter.endDate);
    setDraftMonth(filter.startDate.slice(5, 7));
    setDraftYear(filter.startDate.slice(0, 4));
    setDraftDepartmentId(filter.departmentId || 'all');
    setDraftEmployeeId(filter.employeeId || 'all');
    setDraftCheckInStatus(filter.checkInStatus || 'all');
    setDraftCheckOutStatus(filter.checkOutStatus || 'all');
    setDraftLocationId(filter.locationId || 'all');
    setDraftEmployeeType(employeeTypeFilter);
    setDraftDailyMonth(dailySelectedMonth || getMakassarTodayDateString().slice(5, 7));
    setDraftDailyYear(dailySelectedYear || getMakassarTodayDateString().slice(0, 4));
    setDraftDailyDepartmentId(dailyDepartmentId || 'all');
    setWasResetDraft(false);
    setDidChangeRecapMonth(false);
    setDateError(null);
    setIsPanelOpen(true);
  };

  // Computes preset date range in Asia/Makassar (Desktop)
  const handleSelectPreset = (preset: PresetPeriod) => {
    setSelectedPreset(preset);
    if (preset === 'custom') return;

    const { startDate: newStart, endDate: newEnd } = computePresetDates(preset);
    setStartDate(newStart);
    setEndDate(newEnd);
    triggerApply(
      newStart,
      newEnd,
      employeeId,
      departmentId,
      locationId,
      checkInStatus,
      checkOutStatus,
      searchQuery
    );
  };

  const triggerApply = (
    sDate: string,
    eDate: string,
    eId: string,
    dId: string,
    lId: string,
    ciS: string,
    coS: string,
    search: string
  ) => {
    onApplyFilter({
      startDate: sDate,
      endDate: eDate,
      employeeId: eId === 'all' ? null : eId,
      departmentId: dId === 'all' ? null : dId,
      locationId: lId === 'all' ? null : lId,
      checkInStatus: ciS === 'all' ? null : (ciS as any),
      checkOutStatus: coS === 'all' ? null : (coS as any),
      searchQuery: search.trim() || undefined,
    });
  };

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (startDate > endDate) {
      alert('Tanggal mulai tidak boleh lebih besar dari tanggal akhir.');
      return;
    }

    onApplyFilter({
      startDate,
      endDate,
      employeeId: employeeId === 'all' ? null : employeeId,
      departmentId: departmentId === 'all' ? null : departmentId,
      locationId: locationId === 'all' ? null : locationId,
      checkInStatus: checkInStatus === 'all' ? null : (checkInStatus as any),
      checkOutStatus: checkOutStatus === 'all' ? null : (checkOutStatus as any),
      searchQuery: searchQuery.trim() || undefined,
    });
  };

  const handleReset = () => {
    const defStart = getMakassarFirstDayOfMonthString();
    const defEnd = getMakassarTodayDateString();
    setSelectedPreset('this_month');
    setStartDate(defStart);
    setEndDate(defEnd);
    setEmployeeId('all');
    setDepartmentId('all');
    setLocationId('all');
    setCheckInStatus('all');
    setCheckOutStatus('all');
    setSearchQuery('');
    onResetFilter();
  };

  // Mobile/Tablet Draft Handlers
  const handleSelectDraftPreset = (preset: PresetPeriod) => {
    setDraftPreset(preset);
    setDateError(null);
    if (preset === 'custom') return;
    const { startDate: newStart, endDate: newEnd } = computePresetDates(preset);
    setDraftStartDate(newStart);
    setDraftEndDate(newEnd);
  };

  const handleResetDraft = () => {
    const defStart = getMakassarFirstDayOfMonthString();
    const defEnd = getMakassarTodayDateString();
    if (activeTab === 'daily') {
      setDraftDailyMonth(defEnd.slice(5, 7));
      setDraftDailyYear(defEnd.slice(0, 4));
      setDraftDailyDepartmentId('all');
      setDateError(null);
      return;
    }
    setDraftPreset('this_month');
    setDraftStartDate(defStart);
    setDraftEndDate(defEnd);
    setDraftMonth(defStart.slice(5, 7));
    setDraftYear(defStart.slice(0, 4));
    setDraftDepartmentId('all');
    setDraftEmployeeId('all');
    setDraftCheckInStatus('all');
    setDraftCheckOutStatus('all');
    setDraftLocationId('all');
    setDraftEmployeeType('all');
    setWasResetDraft(true);
    setDidChangeRecapMonth(false);
    setDateError(null);
  };

  const handleApplyDraft = () => {
    if (activeTab === 'daily') {
      onApplyDailyFilter?.({
        year: draftDailyYear,
        month: draftDailyMonth,
        departmentId: draftDailyDepartmentId,
      });
      setIsPanelOpen(false);
      return;
    }

    if (activeTab !== 'monthly_recap' && draftStartDate > draftEndDate) {
      setDateError('Tanggal mulai tidak boleh lebih besar dari tanggal akhir.');
      return;
    }

    const defStart = getMakassarFirstDayOfMonthString();
    const defEnd = getMakassarTodayDateString();

    const baseFilter: AttendanceReportFilter = wasResetDraft
      ? {
          startDate: defStart,
          endDate: defEnd,
          employeeId: null,
          departmentId: null,
          locationId: null,
          checkInStatus: null,
          checkOutStatus: null,
          searchQuery: undefined,
        }
      : { ...filter };

    let nextFilter: AttendanceReportFilter;

    if (activeTab === 'monthly_recap') {
      let nextStartDate = baseFilter.startDate;
      let nextEndDate = baseFilter.endDate;
      if (didChangeRecapMonth) {
        const yNum = Number(draftYear);
        const mNum = Number(draftMonth);
        const lastDay = new Date(yNum, mNum, 0).getDate();
        nextStartDate = `${draftYear}-${draftMonth}-01`;
        nextEndDate = `${draftYear}-${draftMonth}-${String(lastDay).padStart(2, '0')}`;
      }
      nextFilter = {
        ...baseFilter,
        startDate: nextStartDate,
        endDate: nextEndDate,
        departmentId: draftDepartmentId === 'all' ? null : draftDepartmentId,
      };
      onEmployeeTypeChange?.(draftEmployeeType);
    } else {
      nextFilter = {
        ...baseFilter,
        startDate: draftStartDate,
        endDate: draftEndDate,
        departmentId: draftDepartmentId === 'all' ? null : draftDepartmentId,
        employeeId:
          activeTab === 'employee' || activeTab === 'monthly' || activeTab === 'detail'
            ? draftEmployeeId === 'all'
              ? null
              : draftEmployeeId
            : baseFilter.employeeId,
        checkInStatus:
          activeTab === 'monthly' || activeTab === 'detail'
            ? draftCheckInStatus === 'all'
              ? null
              : (draftCheckInStatus as any)
            : baseFilter.checkInStatus,
        checkOutStatus:
          activeTab === 'monthly'
            ? draftCheckOutStatus === 'all'
              ? null
              : (draftCheckOutStatus as any)
            : baseFilter.checkOutStatus,
        locationId:
          activeTab === 'monthly'
            ? draftLocationId === 'all'
              ? null
              : draftLocationId
            : baseFilter.locationId,
      };
    }

    if (wasResetDraft && onResetMobileAll) {
      onResetMobileAll({
        filter: nextFilter,
        employeeTypeFilter: draftEmployeeType,
      });
    } else {
      onApplyFilter(nextFilter);
    }

    setIsPanelOpen(false);
  };

  // Count active contextual filters for mobile/tablet badge
  const defStart = getMakassarFirstDayOfMonthString();
  const defEnd = getMakassarTodayDateString();
  const isDefaultPeriod = filter.startDate === defStart && filter.endDate === defEnd;

  const effectiveDailyYear = dailySelectedYear || defEnd.slice(0, 4);
  const effectiveDailyMonth = dailySelectedMonth || defEnd.slice(5, 7);
  const effectiveDailyDate = dailySelectedDate || defEnd;

  let activeFilterCount = 0;
  if (activeTab === 'daily') {
    if (
      effectiveDailyYear !== defEnd.slice(0, 4) ||
      effectiveDailyMonth !== defEnd.slice(5, 7)
    ) {
      activeFilterCount++;
    }
    if (dailyDepartmentId && dailyDepartmentId !== 'all') activeFilterCount++;
  } else if (activeTab === 'employee') {
    if (!isDefaultPeriod) activeFilterCount++;
    if (filter.departmentId) activeFilterCount++;
    if (filter.employeeId) activeFilterCount++;
  } else if (activeTab === 'monthly') {
    if (!isDefaultPeriod) activeFilterCount++;
    if (filter.departmentId) activeFilterCount++;
    if (filter.employeeId) activeFilterCount++;
    if (filter.checkInStatus) activeFilterCount++;
    if (filter.checkOutStatus) activeFilterCount++;
    if (filter.locationId) activeFilterCount++;
  } else if (activeTab === 'detail') {
    if (!isDefaultPeriod) activeFilterCount++;
    if (filter.departmentId) activeFilterCount++;
    if (filter.employeeId) activeFilterCount++;
    if (filter.checkInStatus) activeFilterCount++;
  } else if (activeTab === 'monthly_recap') {
    if (filter.startDate.slice(0, 7) !== defStart.slice(0, 7)) activeFilterCount++;
    if (filter.departmentId) activeFilterCount++;
    if (employeeTypeFilter && employeeTypeFilter !== 'all') activeFilterCount++;
  }

  // Year options for Bulan/Tahun selector
  const currentMakassarYear = Number(defStart.slice(0, 4));
  const yearSet = new Set<number>([
    currentMakassarYear - 3,
    currentMakassarYear - 2,
    currentMakassarYear - 1,
    currentMakassarYear,
    currentMakassarYear + 1,
    Number(draftYear) || currentMakassarYear,
    Number(draftDailyYear) || currentMakassarYear,
  ]);
  const yearOptions = Array.from(yearSet).sort((a, b) => b - a);

  // Pill Calendar items for Tab Harian Mobile/Tablet (<lg)
  const dailyYearNum = Number(effectiveDailyYear);
  const dailyMonthNum = Number(effectiveDailyMonth);
  const dailyDaysInMonth = new Date(dailyYearNum, dailyMonthNum, 0).getDate();
  const dailyMonthLabel =
    MONTH_OPTIONS.find((m) => m.value === effectiveDailyMonth)?.label || effectiveDailyMonth;
  const dailyCalendarDays = Array.from({ length: dailyDaysInMonth }, (_, idx) => {
    const dayNum = idx + 1;
    const dayStr = String(dayNum).padStart(2, '0');
    const dateStr = `${effectiveDailyYear}-${effectiveDailyMonth}-${dayStr}`;
    const weekdayIndex = new Date(dailyYearNum, dailyMonthNum - 1, dayNum, 12, 0, 0).getDay();
    return {
      dayNum,
      dateStr,
      dayShort: SHORT_DAY_LABELS[weekdayIndex],
    };
  });

  const handleStepDailyMonth = (delta: -1 | 1) => {
    let nextMonth = dailyMonthNum + delta;
    let nextYear = dailyYearNum;
    if (nextMonth < 1) {
      nextMonth = 12;
      nextYear -= 1;
    } else if (nextMonth > 12) {
      nextMonth = 1;
      nextYear += 1;
    }
    onDailyMonthChange?.(String(nextYear), String(nextMonth).padStart(2, '0'));
  };

  const searchPlaceholder =
    activeTab === 'employee'
      ? 'Cari pegawai, NIP, departemen...'
      : 'Cari nama atau NIP...';

  const renderContextualPanelBody = () => {
    if (activeTab === 'daily') {
      return (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#374151] dark:text-[#E5E7EB]">Bulan &amp; Tahun</label>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={draftDailyMonth}
                onChange={(e) => setDraftDailyMonth(e.target.value)}
                aria-label="Bulan"
                className="w-full bg-[#F9FAFB] dark:bg-[#171717] border border-[#E5E7EB] dark:border-[#404040] rounded-xl px-3 py-2 text-xs text-[#111827] dark:text-[#F9FAFB] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
              >
                {MONTH_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <select
                value={draftDailyYear}
                onChange={(e) => setDraftDailyYear(e.target.value)}
                aria-label="Tahun"
                className="w-full bg-[#F9FAFB] dark:bg-[#171717] border border-[#E5E7EB] dark:border-[#404040] rounded-xl px-3 py-2 text-xs text-[#111827] dark:text-[#F9FAFB] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#374151] dark:text-[#E5E7EB] mb-1">Satuan Kerja</label>
            <select
              value={draftDailyDepartmentId}
              onChange={(e) => setDraftDailyDepartmentId(e.target.value)}
              aria-label="Satuan Kerja"
              className="w-full bg-[#F9FAFB] dark:bg-[#171717] border border-[#E5E7EB] dark:border-[#404040] rounded-xl px-3 py-2 text-xs text-[#111827] dark:text-[#F9FAFB] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
            >
              <option value="all">Semua Satuan Kerja</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Periode: employee, monthly, detail */}
        {activeTab !== 'monthly_recap' && (
          <div className="space-y-2.5">
            <label className="block text-xs font-semibold text-[#374151] dark:text-[#E5E7EB]">Periode</label>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  { id: 'today', label: 'Hari Ini' },
                  { id: 'this_week', label: 'Minggu Ini' },
                  { id: 'this_month', label: 'Bulan Ini' },
                  { id: 'custom', label: 'Rentang Tanggal' },
                ] as const
              ).map((p) => {
                const active = draftPreset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectDraftPreset(p.id)}
                    className={`px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer border ${
                      active
                        ? 'bg-[#F97316] text-white border-[#F97316] font-semibold'
                        : 'bg-[#F9FAFB] dark:bg-[#171717] text-[#4B5563] dark:text-[#A3A3A3] border-[#E5E7EB] dark:border-[#404040] hover:bg-[#F3F4F6] dark:hover:bg-[#303030] dark:hover:text-[#F9FAFB]'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {draftPreset === 'custom' && (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <label className="block text-[11px] font-medium text-[#6B7280] dark:text-[#A3A3A3] mb-1">Dari</label>
                  <input
                    type="date"
                    value={draftStartDate}
                    onChange={(e) => {
                      setDraftStartDate(e.target.value);
                      setDateError(null);
                    }}
                    className="w-full bg-[#F9FAFB] dark:bg-[#171717] border border-[#E5E7EB] dark:border-[#404040] rounded-xl px-2.5 py-2 text-xs text-[#111827] dark:text-[#F9FAFB] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#6B7280] dark:text-[#A3A3A3] mb-1">Sampai</label>
                  <input
                    type="date"
                    value={draftEndDate}
                    onChange={(e) => {
                      setDraftEndDate(e.target.value);
                      setDateError(null);
                    }}
                    className="w-full bg-[#F9FAFB] dark:bg-[#171717] border border-[#E5E7EB] dark:border-[#404040] rounded-xl px-2.5 py-2 text-xs text-[#111827] dark:text-[#F9FAFB] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
                  />
                </div>
              </div>
            )}

            {dateError && (
              <p className="text-[11px] font-medium text-red-600 dark:text-red-400">{dateError}</p>
            )}
          </div>
        )}

        {/* Bulan / Tahun: monthly_recap only */}
        {activeTab === 'monthly_recap' && (
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#374151] dark:text-[#E5E7EB]">Bulan &amp; Tahun</label>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={draftMonth}
                onChange={(e) => {
                  setDraftMonth(e.target.value);
                  setDidChangeRecapMonth(true);
                }}
                aria-label="Bulan"
                className="w-full bg-[#F9FAFB] dark:bg-[#171717] border border-[#E5E7EB] dark:border-[#404040] rounded-xl px-3 py-2 text-xs text-[#111827] dark:text-[#F9FAFB] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
              >
                {MONTH_OPTIONS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <select
                value={draftYear}
                onChange={(e) => {
                  setDraftYear(e.target.value);
                  setDidChangeRecapMonth(true);
                }}
                aria-label="Tahun"
                className="w-full bg-[#F9FAFB] dark:bg-[#171717] border border-[#E5E7EB] dark:border-[#404040] rounded-xl px-3 py-2 text-xs text-[#111827] dark:text-[#F9FAFB] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
              >
                {yearOptions.map((y) => (
                  <option key={y} value={String(y)}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Satuan Kerja */}
        <div>
          <label className="block text-xs font-semibold text-[#374151] dark:text-[#E5E7EB] mb-1">Satuan Kerja</label>
          <select
            value={draftDepartmentId}
            onChange={(e) => setDraftDepartmentId(e.target.value)}
            className="w-full bg-[#F9FAFB] dark:bg-[#171717] border border-[#E5E7EB] dark:border-[#404040] rounded-xl px-3 py-2 text-xs text-[#111827] dark:text-[#F9FAFB] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
          >
            <option value="all">Semua Satuan Kerja</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>

      {/* Pegawai: employee, monthly, detail */}
      {(activeTab === 'employee' || activeTab === 'monthly' || activeTab === 'detail') && (
        <div>
          <label className="block text-xs font-semibold text-[#374151] dark:text-[#E5E7EB] mb-1">Pegawai</label>
          <select
            value={draftEmployeeId}
            onChange={(e) => setDraftEmployeeId(e.target.value)}
            className="w-full bg-[#F9FAFB] dark:bg-[#171717] border border-[#E5E7EB] dark:border-[#404040] rounded-xl px-3 py-2 text-xs text-[#111827] dark:text-[#F9FAFB] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
          >
            <option value="all">Semua Pegawai ({employees.length})</option>
            {employees.map((emp) => (
              <option key={emp.id} value={emp.id}>
                {emp.name} {emp.nip ? `(${emp.nip})` : ''}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Status Presensi (checkInStatus): monthly, detail */}
      {(activeTab === 'monthly' || activeTab === 'detail') && (
        <div>
          <label className="block text-xs font-semibold text-[#374151] dark:text-[#E5E7EB] mb-1">
            Status Presensi
          </label>
          <select
            value={draftCheckInStatus}
            onChange={(e) => setDraftCheckInStatus(e.target.value)}
            className="w-full bg-[#F9FAFB] dark:bg-[#171717] border border-[#E5E7EB] dark:border-[#404040] rounded-xl px-3 py-2 text-xs text-[#111827] dark:text-[#F9FAFB] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
          >
            <option value="all">Semua Status Presensi</option>
            <option value="on_time">Tepat Waktu</option>
            <option value="late">Terlambat</option>
          </select>
        </div>
      )}

      {/* Status Check-out & Lokasi: monthly only */}
      {activeTab === 'monthly' && (
        <>
          <div>
            <label className="block text-xs font-semibold text-[#374151] dark:text-[#E5E7EB] mb-1">
              Status Check-out
            </label>
            <select
              value={draftCheckOutStatus}
              onChange={(e) => setDraftCheckOutStatus(e.target.value)}
              className="w-full bg-[#F9FAFB] dark:bg-[#171717] border border-[#E5E7EB] dark:border-[#404040] rounded-xl px-3 py-2 text-xs text-[#111827] dark:text-[#F9FAFB] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
            >
              <option value="all">Semua Status Check-out</option>
              <option value="operational">Jam Operasional</option>
              <option value="after_work">Jam Pulang</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#374151] dark:text-[#E5E7EB] mb-1">Lokasi</label>
            <select
              value={draftLocationId}
              onChange={(e) => setDraftLocationId(e.target.value)}
              className="w-full bg-[#F9FAFB] dark:bg-[#171717] border border-[#E5E7EB] dark:border-[#404040] rounded-xl px-3 py-2 text-xs text-[#111827] dark:text-[#F9FAFB] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
            >
              <option value="all">Semua Lokasi</option>
              {locations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>
        </>
      )}

      {/* Jenis Pegawai: monthly_recap only */}
      {activeTab === 'monthly_recap' && (
        <div>
          <label className="block text-xs font-semibold text-[#374151] dark:text-[#E5E7EB] mb-1">Jenis Pegawai</label>
          <select
            value={draftEmployeeType}
            onChange={(e) => setDraftEmployeeType(e.target.value)}
            className="w-full bg-[#F9FAFB] dark:bg-[#171717] border border-[#E5E7EB] dark:border-[#404040] rounded-xl px-3 py-2 text-xs text-[#111827] dark:text-[#F9FAFB] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
          >
            <option value="all">Semua Tipe</option>
            {COMMON_EMPLOYEE_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
            <option value="Tidak diketahui">Tidak diketahui</option>
          </select>
        </div>
      )}
    </div>
    );
  };

  return (
    <>
      {/* Mobile & Tablet (<lg): Daily Pill Calendar OR Unified Search + Filter Bar */}
      <div className="lg:hidden space-y-2.5">
        <div className="relative">
          {activeTab === 'daily' ? (
            <div className="flex items-center justify-between gap-2">
              {/* Calendar Header: Prev Month | Bulan Tahun | Next Month */}
              <div className="inline-flex items-center gap-1 bg-white dark:bg-[#262626] border border-[#E5E7EB] dark:border-[#404040] rounded-xl px-1.5 py-1 shadow-2xs">
                <button
                  type="button"
                  onClick={() => handleStepDailyMonth(-1)}
                  aria-label="Bulan sebelumnya"
                  className="p-1 rounded-lg text-[#4B5563] dark:text-[#A3A3A3] hover:bg-[#F9FAFB] dark:hover:bg-[#303030] hover:text-[#111827] dark:hover:text-[#F9FAFB] cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-2 text-xs font-bold text-[#111827] dark:text-[#F9FAFB] whitespace-nowrap select-none">
                  {dailyMonthLabel} {effectiveDailyYear}
                </span>
                <button
                  type="button"
                  onClick={() => handleStepDailyMonth(1)}
                  aria-label="Bulan berikutnya"
                  className="p-1 rounded-lg text-[#4B5563] dark:text-[#A3A3A3] hover:bg-[#F9FAFB] dark:hover:bg-[#303030] hover:text-[#111827] dark:hover:text-[#F9FAFB] cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              {/* Filter Trigger (Bulan, Tahun, Satuan Kerja) */}
              <button
                type="button"
                onClick={() => (isPanelOpen ? setIsPanelOpen(false) : openMobileFilterPanel())}
                aria-label="Filter laporan"
                aria-expanded={isPanelOpen}
                className={`p-2 rounded-xl border shrink-0 transition-colors cursor-pointer shadow-2xs ${
                  isPanelOpen || activeFilterCount > 0
                    ? 'bg-orange-50/70 dark:bg-[#431F0B]/50 border-[#F97316] text-[#F97316]'
                    : 'bg-white dark:bg-[#262626] border-[#E5E7EB] dark:border-[#404040] text-[#6B7280] dark:text-[#A3A3A3] hover:text-[#374151] dark:hover:text-[#F9FAFB] hover:bg-[#F9FAFB] dark:hover:bg-[#303030]'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-white dark:bg-[#262626] border border-[#E5E7EB] dark:border-[#404040] rounded-xl pl-3 pr-1.5 py-1 shadow-2xs focus-within:ring-1 focus-within:ring-[#F97316]">
              <Search className="w-4 h-4 text-[#9CA3AF] dark:text-[#6B7280] shrink-0 pointer-events-none" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={mobileSearchValue}
                onChange={(e) => onMobileSearchChange?.(e.target.value)}
                className="flex-1 min-w-0 bg-transparent py-1.5 text-xs text-[#111827] dark:text-[#F9FAFB] placeholder:text-[#9CA3AF] dark:placeholder:text-[#6B7280] focus:outline-none"
              />
              {mobileSearchValue && (
                <button
                  type="button"
                  onClick={() => onMobileSearchChange?.('')}
                  aria-label="Hapus pencarian"
                  className="p-1 text-[#9CA3AF] dark:text-[#6B7280] hover:text-[#374151] dark:hover:text-[#F9FAFB] shrink-0 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              <span className="h-4 w-px bg-[#E5E7EB] dark:bg-[#404040] shrink-0" aria-hidden="true" />

              {/* Unified Filter Icon Trigger */}
              <button
                type="button"
                onClick={() => (isPanelOpen ? setIsPanelOpen(false) : openMobileFilterPanel())}
                aria-label="Filter laporan"
                aria-expanded={isPanelOpen}
                className={`p-1.5 rounded-lg shrink-0 transition-colors cursor-pointer ${
                  isPanelOpen || activeFilterCount > 0
                    ? 'text-[#F97316] hover:bg-orange-50 dark:hover:bg-[#431F0B]/40'
                    : 'text-[#6B7280] dark:text-[#A3A3A3] hover:text-[#374151] dark:hover:text-[#F9FAFB] hover:bg-[#F9FAFB] dark:hover:bg-[#303030]'
                }`}
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Tablet Popover (768px - <1024px) */}
        {isPanelOpen && (
          <div className="hidden md:block lg:hidden">
            <div
              className="fixed inset-0 z-40"
              onClick={() => setIsPanelOpen(false)}
              aria-hidden="true"
            />
            <div
              role="dialog"
              aria-label="Filter Laporan"
              className="absolute right-0 top-full mt-2 z-50 w-[380px] max-h-[75vh] bg-white dark:bg-[#262626] border border-[#E5E7EB] dark:border-[#404040] rounded-2xl shadow-xl flex flex-col overflow-hidden"
            >
              <div className="px-4 py-3 border-b border-[#F3F4F6] dark:border-[#404040] flex items-center justify-between">
                <h4 className="text-sm font-bold text-[#111827] dark:text-[#F9FAFB]">Filter Laporan</h4>
                <button
                  type="button"
                  onClick={() => setIsPanelOpen(false)}
                  aria-label="Tutup filter"
                  className="p-1 rounded-lg text-[#6B7280] dark:text-[#A3A3A3] hover:bg-[#F3F4F6] dark:hover:bg-[#303030] dark:hover:text-[#F9FAFB] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 overflow-y-auto flex-1">{renderContextualPanelBody()}</div>

              <div className="px-4 py-3 border-t border-[#F3F4F6] dark:border-[#404040] bg-[#F9FAFB] dark:bg-[#171717] flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResetDraft}
                  leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                >
                  Reset
                </Button>
                <Button type="button" variant="primary" size="sm" onClick={handleApplyDraft}>
                  Terapkan
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Mobile Bottom Sheet (<768px) */}
        {isPanelOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
            <div
              className="fixed inset-0 bg-black/40"
              onClick={() => setIsPanelOpen(false)}
              aria-hidden="true"
            />
            <div
              role="dialog"
              aria-label="Filter Laporan"
              className="relative z-10 bg-white dark:bg-[#262626] rounded-t-2xl max-h-[85vh] flex flex-col shadow-xl border-t dark:border-[#404040]"
            >
              <div className="pt-2.5 pb-1 flex justify-center">
                <span className="w-10 h-1 rounded-full bg-gray-300 dark:bg-[#525252]" />
              </div>
              <div className="px-4 py-2.5 border-b border-[#F3F4F6] dark:border-[#404040] flex items-center justify-between">
                <h4 className="text-sm font-bold text-[#111827] dark:text-[#F9FAFB]">Filter Laporan</h4>
                <button
                  type="button"
                  onClick={() => setIsPanelOpen(false)}
                  aria-label="Tutup filter"
                  className="p-1 rounded-lg text-[#6B7280] dark:text-[#A3A3A3] hover:bg-[#F3F4F6] dark:hover:bg-[#303030] dark:hover:text-[#F9FAFB] cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-4 overflow-y-auto flex-1">{renderContextualPanelBody()}</div>

              <div className="px-4 py-3 border-t border-[#F3F4F6] dark:border-[#404040] bg-white dark:bg-[#262626] grid grid-cols-2 gap-2.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResetDraft}
                  leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                  className="w-full justify-center"
                >
                  Reset
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleApplyDraft}
                  className="w-full justify-center"
                >
                  Terapkan
                </Button>
              </div>
            </div>
          </div>
        )}
        </div>

        {/* Horizontal Pill Calendar (Tab Harian <1024px) */}
        {activeTab === 'daily' && (
          <div
            className="overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden pb-0.5"
            aria-label="Kalender tanggal harian"
          >
            <div className="flex items-center gap-1.5 min-w-max">
              {dailyCalendarDays.map((item) => {
                const isSelected = item.dateStr === effectiveDailyDate;
                const isToday = item.dateStr === defEnd;
                return (
                  <button
                    key={item.dateStr}
                    ref={(el) => {
                      dailyPillRefs.current[item.dateStr] = el;
                    }}
                    type="button"
                    onClick={() => onDailySelectDate?.(item.dateStr)}
                    aria-pressed={isSelected}
                    className={`min-w-[44px] px-2.5 py-1.5 rounded-xl border flex flex-col items-center justify-center transition-colors cursor-pointer shrink-0 ${
                      isSelected
                        ? 'bg-[#F97316] border-[#F97316] text-white'
                        : 'bg-white dark:bg-[#262626] border-[#E5E7EB] dark:border-[#404040] text-[#6B7280] dark:text-[#A3A3A3] hover:border-[#D1D5DB] dark:hover:border-[#525252]'
                    }`}
                  >
                    <span
                      className={`text-[10px] leading-tight ${
                        isSelected ? 'text-white/90 font-medium' : 'text-[#6B7280] dark:text-[#A3A3A3] font-medium'
                      }`}
                    >
                      {item.dayShort}
                    </span>
                    <span
                      className={`text-xs font-bold leading-snug tabular-nums ${
                        isSelected
                          ? 'text-white'
                          : isToday
                            ? 'text-[#F97316]'
                            : 'text-[#374151] dark:text-[#E5E7EB]'
                      }`}
                    >
                      {item.dayNum}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Desktop (>=lg): Unchanged Original Filter Card */}
      <div className="hidden lg:block bg-[#FFFFFF] dark:bg-[#262626] border border-[#E5E7EB] dark:border-[#404040] rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
        <form onSubmit={handleApply} className="space-y-4">
          {/* Preset Period Buttons & Custom Range */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[#F3F4F6] dark:border-[#404040]">
            {/* Preset Buttons */}
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-xs font-semibold text-[#6B7280] dark:text-[#A3A3A3] mr-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#9CA3AF] dark:text-[#6B7280]" />
                Periode:
              </span>
              {(
                [
                  { id: 'today', label: 'Hari Ini' },
                  { id: 'this_week', label: 'Minggu Ini' },
                  { id: 'this_month', label: 'Bulan Ini' },
                  { id: 'custom', label: 'Custom' },
                ] as const
              ).map((p) => {
                const active = selectedPreset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => handleSelectPreset(p.id)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                      active
                        ? 'bg-[#F97316] text-white shadow-xs font-semibold'
                        : 'bg-[#F9FAFB] dark:bg-[#171717] text-[#4B5563] dark:text-[#A3A3A3] hover:bg-[#F3F4F6] dark:hover:bg-[#303030] dark:hover:text-[#F9FAFB] border border-[#E5E7EB] dark:border-[#404040]'
                    }`}
                  >
                    {p.label}
                  </button>
                );
              })}
            </div>

            {/* Date Picker Controls (Native YYYY-MM-DD in Asia/Makassar) */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-[#6B7280] dark:text-[#A3A3A3]">Dari:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setStartDate(e.target.value);
                    setSelectedPreset('custom');
                    triggerApply(
                      e.target.value,
                      endDate,
                      employeeId,
                      departmentId,
                      locationId,
                      checkInStatus,
                      checkOutStatus,
                      searchQuery
                    );
                  }}
                  className="bg-[#F9FAFB] dark:bg-[#171717] border border-[#E5E7EB] dark:border-[#404040] rounded-xl px-2.5 py-1.5 text-xs text-[#111827] dark:text-[#F9FAFB] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
                />
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-[#6B7280] dark:text-[#A3A3A3]">Sampai:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setEndDate(e.target.value);
                    setSelectedPreset('custom');
                    triggerApply(
                      startDate,
                      e.target.value,
                      employeeId,
                      departmentId,
                      locationId,
                      checkInStatus,
                      checkOutStatus,
                      searchQuery
                    );
                  }}
                  className="bg-[#F9FAFB] dark:bg-[#171717] border border-[#E5E7EB] dark:border-[#404040] rounded-xl px-2.5 py-1.5 text-xs text-[#111827] dark:text-[#F9FAFB] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
                />
              </div>
            </div>
          </div>

          {/* Quick Search & Filter Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {/* Search Query */}
            <div>
              <label className="block text-[11px] font-semibold text-[#6B7280] dark:text-[#A3A3A3] mb-1 flex items-center gap-1">
                <Search className="w-3 h-3 text-[#9CA3AF] dark:text-[#6B7280]" />
                Cari Nama / NIP
              </label>
              <input
                type="text"
                placeholder="Ketik nama atau NIP..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  triggerApply(
                    startDate,
                    endDate,
                    employeeId,
                    departmentId,
                    locationId,
                    checkInStatus,
                    checkOutStatus,
                    e.target.value
                  );
                }}
                className="w-full bg-[#F9FAFB] dark:bg-[#171717] border border-[#E5E7EB] dark:border-[#404040] rounded-xl px-3 py-2 text-xs text-[#111827] dark:text-[#F9FAFB] focus:outline-none focus:ring-1 focus:ring-[#F97316] placeholder:text-[#9CA3AF] dark:placeholder:text-[#6B7280]"
              />
            </div>

            {/* Pegawai Dropdown */}
            <div>
              <label className="block text-[11px] font-semibold text-[#6B7280] dark:text-[#A3A3A3] mb-1 flex items-center gap-1">
                <User className="w-3 h-3 text-[#9CA3AF] dark:text-[#6B7280]" />
                Pegawai
              </label>
              <select
                value={employeeId}
                onChange={(e) => {
                  setEmployeeId(e.target.value);
                  triggerApply(
                    startDate,
                    endDate,
                    e.target.value,
                    departmentId,
                    locationId,
                    checkInStatus,
                    checkOutStatus,
                    searchQuery
                  );
                }}
                className="w-full bg-[#F9FAFB] dark:bg-[#171717] border border-[#E5E7EB] dark:border-[#404040] rounded-xl px-3 py-2 text-xs text-[#111827] dark:text-[#F9FAFB] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
              >
                <option value="all">Semua Pegawai ({employees.length})</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} {emp.nip ? `(${emp.nip})` : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Masuk */}
            <div>
              <label className="block text-[11px] font-semibold text-[#6B7280] dark:text-[#A3A3A3] mb-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-[#9CA3AF] dark:text-[#6B7280]" />
                Status Masuk
              </label>
              <select
                value={checkInStatus}
                onChange={(e) => {
                  setCheckInStatus(e.target.value);
                  triggerApply(
                    startDate,
                    endDate,
                    employeeId,
                    departmentId,
                    locationId,
                    e.target.value,
                    checkOutStatus,
                    searchQuery
                  );
                }}
                className="w-full bg-[#F9FAFB] dark:bg-[#171717] border border-[#E5E7EB] dark:border-[#404040] rounded-xl px-3 py-2 text-xs text-[#111827] dark:text-[#F9FAFB] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
              >
                <option value="all">Semua Status Masuk</option>
                <option value="on_time">Tepat Waktu</option>
                <option value="late">Terlambat</option>
              </select>
            </div>

            {/* Status Pulang */}
            <div>
              <label className="block text-[11px] font-semibold text-[#6B7280] dark:text-[#A3A3A3] mb-1 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-[#9CA3AF] dark:text-[#6B7280]" />
                Status Pulang
              </label>
              <select
                value={checkOutStatus}
                onChange={(e) => {
                  setCheckOutStatus(e.target.value);
                  triggerApply(
                    startDate,
                    endDate,
                    employeeId,
                    departmentId,
                    locationId,
                    checkInStatus,
                    e.target.value,
                    searchQuery
                  );
                }}
                className="w-full bg-[#F9FAFB] dark:bg-[#171717] border border-[#E5E7EB] dark:border-[#404040] rounded-xl px-3 py-2 text-xs text-[#111827] dark:text-[#F9FAFB] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
              >
                <option value="all">Semua Status Pulang</option>
                <option value="operational">Jam Operasional</option>
                <option value="after_work">Jam Pulang</option>
              </select>
            </div>
          </div>

          {/* Advanced Filters Toggle */}
          {isAdvancedOpen && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[#F3F4F6] dark:border-[#404040]">
              {/* Departemen */}
              <div>
                <label className="block text-[11px] font-semibold text-[#6B7280] dark:text-[#A3A3A3] mb-1 flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-[#9CA3AF] dark:text-[#6B7280]" />
                  Departemen / Unit
                </label>
                <select
                  value={departmentId}
                  onChange={(e) => {
                    setDepartmentId(e.target.value);
                    triggerApply(
                      startDate,
                      endDate,
                      employeeId,
                      e.target.value,
                      locationId,
                      checkInStatus,
                      checkOutStatus,
                      searchQuery
                    );
                  }}
                  className="w-full bg-[#F9FAFB] dark:bg-[#171717] border border-[#E5E7EB] dark:border-[#404040] rounded-xl px-3 py-2 text-xs text-[#111827] dark:text-[#F9FAFB] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
                >
                  <option value="all">Semua Departemen</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Lokasi Presensi */}
              <div>
                <label className="block text-[11px] font-semibold text-[#6B7280] dark:text-[#A3A3A3] mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-[#9CA3AF] dark:text-[#6B7280]" />
                  Lokasi Presensi
                </label>
                <select
                  value={locationId}
                  onChange={(e) => {
                    setLocationId(e.target.value);
                    triggerApply(
                      startDate,
                      endDate,
                      employeeId,
                      departmentId,
                      e.target.value,
                      checkInStatus,
                      checkOutStatus,
                      searchQuery
                    );
                  }}
                  className="w-full bg-[#F9FAFB] dark:bg-[#171717] border border-[#E5E7EB] dark:border-[#404040] rounded-xl px-3 py-2 text-xs text-[#111827] dark:text-[#F9FAFB] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
                >
                  <option value="all">Semua Lokasi</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Action Buttons & Advanced Toggle */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
              className="text-xs text-[#F97316] hover:text-[#EA580C] font-semibold flex items-center gap-1 self-start cursor-pointer"
            >
              <span>
                {isAdvancedOpen ? 'Tutup Filter Tambahan' : 'Filter Departemen & Lokasi'}
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform ${isAdvancedOpen ? 'rotate-180' : ''}`}
              />
            </button>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReset}
                disabled={isLoading}
                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
              >
                Reset
              </Button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
};

