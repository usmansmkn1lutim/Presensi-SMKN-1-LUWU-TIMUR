import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { formatAttendanceError } from './attendanceService';
import {
  attendanceStatusService,
  EvaluatedStatusResult,
} from './attendanceStatusService';
import {
  AttendanceDetailItem,
  AttendanceReportFilter,
  AttendanceReportResponse,
  DailyAttendanceSummary,
  EmployeeAttendanceSummary,
  MonthlyAttendanceSummary,
  OverallReportMetrics,
  PaginatedAttendanceDetailResponse,
  MonthlyRecapRow,
  MonthlyRecapReportResponse,
} from '../types/attendanceReport.types';

/**
 * Pure Calendar Date & Timezone Utilities for Asia/Makassar (WITA, UTC+8)
 */
export function getMakassarTodayDateString(): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Makassar',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return formatter.format(new Date());
  } catch {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
}

export function getMakassarFirstDayOfMonthString(): string {
  const today = getMakassarTodayDateString();
  const parts = today.split('-');
  return `${parts[0]}-${parts[1]}-01`;
}

export function formatMakassarTime(isoString?: string | null): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return '-';
    return new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Makassar',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);
  } catch {
    return '-';
  }
}

export function formatMakassarShortDate(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d, 12, 0, 0);
    return new Intl.DateTimeFormat('id-ID', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(dateObj);
  } catch {
    return dateStr;
  }
}

export function getDayNameIndonesian(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d, 12, 0, 0);
    return new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(dateObj);
  } catch {
    return '';
  }
}

export function getMonthLabelIndonesian(monthStr: string): string {
  try {
    const [y, m] = monthStr.split('-').map(Number);
    const dateObj = new Date(y, m - 1, 1, 12, 0, 0);
    return new Intl.DateTimeFormat('id-ID', {
      month: 'long',
      year: 'numeric',
    }).format(dateObj);
  } catch {
    return monthStr;
  }
}

/**
 * Generates an inclusive calendar date list [startDate .. endDate]
 * without timezone/UTC conversion offset.
 */
export function iterateDateRange(startDateStr: string, endDateStr: string): string[] {
  const result: string[] = [];
  const [sY, sM, sD] = startDateStr.split('-').map(Number);
  const [eY, eM, eD] = endDateStr.split('-').map(Number);

  const curr = new Date(sY, sM - 1, sD, 12, 0, 0);
  const end = new Date(eY, eM - 1, eD, 12, 0, 0);

  while (curr <= end) {
    const y = curr.getFullYear();
    const m = String(curr.getMonth() + 1).padStart(2, '0');
    const d = String(curr.getDate()).padStart(2, '0');
    result.push(`${y}-${m}-${d}`);
    curr.setDate(curr.getDate() + 1);
  }
  return result;
}

/**
 * Attendance Report Service (PHASE 9B)
 *
 * STRICT SINGLE SOURCE OF TRUTH:
 * Authoritative source: public.attendance via Supabase PostgreSQL.
 * NEVER reads from or relies upon browser localStorage.
 */
export const attendanceReportService = {
  /**
   * Fetches active departments for filtering
   */
  async getDepartments(): Promise<{ id: string; name: string }[]> {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .from('departments')
      .select('id, name')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching departments for report:', error);
      return [];
    }

    return (data || []) as { id: string; name: string }[];
  },

  /**
   * Fetches active school locations for filtering
   */
  async getLocations(): Promise<{ id: string; name: string }[]> {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .from('locations')
      .select('id, name')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching locations for report:', error);
      return [];
    }

    return (data || []) as { id: string; name: string }[];
  },

  /**
   * Fetches employees for filter selector
   */
  async getEmployees(): Promise<{ id: string; name: string; nip: string | null }[]> {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .from('employees')
      .select('id, full_name, nip')
      .order('full_name', { ascending: true });

    if (error) {
      console.error('Error fetching employees list for report:', error);
      return [];
    }

    return (data || []).map((e) => ({
      id: e.id,
      name: e.full_name,
      nip: e.nip || null,
    }));
  },

  /**
   * Calculates effective working days (Monday-Friday, excluding official holidays)
   */
  calculateWorkingDays(
    startDateStr: string,
    endDateStr: string,
    holidaySet: Set<string>
  ): number {
    const dates = iterateDateRange(startDateStr, endDateStr);
    let count = 0;

    for (const isoDate of dates) {
      const [y, m, d] = isoDate.split('-').map(Number);
      const dayOfWeek = new Date(y, m - 1, d, 12, 0, 0).getDay(); // 0 = Sun, 6 = Sat

      if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidaySet.has(isoDate)) {
        count++;
      }
    }

    return count;
  },

  /**
   * Core query to retrieve raw attendance records and related metadata within date range
   */
  async fetchRawAttendanceRecords(filter: AttendanceReportFilter) {
    if (!isSupabaseConfigured()) {
      return { attendanceRows: [], activeEmployees: [], holidaySet: new Set<string>() };
    }

    const { startDate, endDate, employeeId, checkInStatus, checkOutStatus, locationId } = filter;

    if (startDate > endDate) {
      throw new Error('Tanggal mulai tidak boleh lebih besar dari tanggal akhir.');
    }

    // 1. Fetch active holidays in date range
    const { data: holidaysData, error: holError } = await supabase
      .from('holidays')
      .select('holiday_date')
      .eq('is_active', true)
      .gte('holiday_date', startDate)
      .lte('holiday_date', endDate);

    if (holError) {
      console.error('Error fetching holidays for report:', holError);
    }

    const holidaySet = new Set<string>();
    if (holidaysData) {
      holidaysData.forEach((h) => holidaySet.add(h.holiday_date));
    }

    // 2. Fetch active employees
    let empQuery = supabase
      .from('employees')
      .select(`
        id,
        nip,
        full_name,
        status,
        department_id,
        departments (
          id,
          name
        )
      `)
      .order('full_name', { ascending: true });

    if (filter.departmentId && filter.departmentId !== 'all') {
      empQuery = empQuery.eq('department_id', filter.departmentId);
    }

    if (employeeId && employeeId !== 'all') {
      empQuery = empQuery.eq('id', employeeId);
    }

    const { data: employeesData, error: empError } = await empQuery;

    if (empError) {
      console.error('Error fetching employees for report:', empError);
      throw new Error(formatAttendanceError(empError));
    }

    const activeEmployees = (employeesData || []).filter((e) => e.status === 'active');

    // 3. Build Attendance Query
    let query = supabase
      .from('attendance')
      .select(`
        id,
        employee_id,
        employee_name_snapshot,
        attendance_date,
        check_in_at,
        check_out_at,
        check_in_status,
        check_out_status,
        check_in_location_id,
        check_out_location_id,
        notes,
        employees:employees!attendance_employee_id_fkey (
          id,
          full_name,
          nip,
          department_id,
          status,
          departments (
            id,
            name
          )
        ),
        check_in_location:locations!check_in_location_id (
          id,
          name
        ),
        check_out_location:locations!check_out_location_id (
          id,
          name
        )
      `)
      .gte('attendance_date', startDate)
      .lte('attendance_date', endDate);

    if (employeeId && employeeId !== 'all') {
      query = query.eq('employee_id', employeeId);
    }

    if (checkInStatus && checkInStatus !== 'all') {
      query = query.eq('check_in_status', checkInStatus);
    }

    if (checkOutStatus && checkOutStatus !== 'all') {
      query = query.eq('check_out_status', checkOutStatus);
    }

    if (locationId && locationId !== 'all') {
      query = query.or(
        `check_in_location_id.eq.${locationId},check_out_location_id.eq.${locationId}`
      );
    }

    query = query.order('attendance_date', { ascending: false });

    const { data: attendanceData, error: attError } = await query;

    if (attError) {
      console.error('Error fetching attendance for report from database:', attError);
      throw new Error(formatAttendanceError(attError));
    }

    let rows = attendanceData || [];

    // Filter by department if specified
    if (filter.departmentId && filter.departmentId !== 'all') {
      rows = rows.filter((r: any) => {
        const empDeptId = r.employees?.department_id;
        return empDeptId === filter.departmentId;
      });
    }

    // Filter by searchQuery (name / NIP)
    if (filter.searchQuery && filter.searchQuery.trim()) {
      const q = filter.searchQuery.toLowerCase().trim();
      rows = rows.filter((r: any) => {
        const empName = (
          r.employees?.full_name ||
          r.employee_name_snapshot ||
          ''
        ).toLowerCase();
        const nip = (r.employees?.nip || '').toLowerCase();
        return empName.includes(q) || nip.includes(q);
      });
    }

    return {
      attendanceRows: rows,
      activeEmployees,
      holidaySet,
    };
  },

  /**
   * Generates Daily Summary
   * Minimal fields: attendanceDate, totalEmployees, totalPresent, totalLate, totalCheckedOut, totalNotCheckedOut
   */
  async getDailySummary(filter: AttendanceReportFilter): Promise<DailyAttendanceSummary[]> {
    const { attendanceRows, activeEmployees } = await this.fetchRawAttendanceRecords(filter);
    const dateList = iterateDateRange(filter.startDate, filter.endDate);

    const rowsByDate = new Map<string, any[]>();
    attendanceRows.forEach((r) => {
      const list = rowsByDate.get(r.attendance_date) || [];
      list.push(r);
      rowsByDate.set(r.attendance_date, list);
    });

    const totalActiveCount = activeEmployees.length;

    // Build summaries for all dates in range descending
    const dailySummaries: DailyAttendanceSummary[] = dateList
      .reverse()
      .map((dateStr) => {
        const rowsForDate = rowsByDate.get(dateStr) || [];
        const totalPresent = rowsForDate.length;
        const totalLate = rowsForDate.filter((r) => r.check_in_status === 'late').length;
        const totalOnTime = rowsForDate.filter((r) => r.check_in_status === 'on_time').length;
        const totalCheckedOut = rowsForDate.filter((r) => r.check_out_at !== null).length;
        const totalNotCheckedOut = rowsForDate.filter(
          (r) => r.check_in_at !== null && r.check_out_at === null
        ).length;
        const totalAbsent = Math.max(0, totalActiveCount - totalPresent);

        return {
          attendanceDate: dateStr,
          dateLabel: formatMakassarShortDate(dateStr),
          dayName: getDayNameIndonesian(dateStr),
          totalEmployees: totalActiveCount,
          totalPresent,
          totalLate,
          totalOnTime,
          totalCheckedOut,
          totalNotCheckedOut,
          totalAbsent,
        };
      });

    return dailySummaries;
  },

  /**
   * Generates Per-Employee Summary
   * Minimal fields: employeeId, employeeName, totalAttendance, totalLate, totalCheckedOut, totalNotCheckedOut
   */
  async getEmployeeSummary(filter: AttendanceReportFilter): Promise<EmployeeAttendanceSummary[]> {
    const { attendanceRows, activeEmployees, holidaySet } =
      await this.fetchRawAttendanceRecords(filter);

    const totalWorkDays = this.calculateWorkingDays(
      filter.startDate,
      filter.endDate,
      holidaySet
    );

    const attendanceByEmployee = new Map<string, any[]>();
    attendanceRows.forEach((r) => {
      const empId = r.employee_id || `hist_${r.employee_name_snapshot}`;
      const list = attendanceByEmployee.get(empId) || [];
      list.push(r);
      attendanceByEmployee.set(empId, list);
    });

    // 1. Process active employees
    const activeSummaries: EmployeeAttendanceSummary[] = activeEmployees.map((emp) => {
      const records = attendanceByEmployee.get(emp.id) || [];
      const totalAttendance = records.length;
      const totalOnTime = records.filter((r) => r.check_in_status === 'on_time').length;
      const totalLate = records.filter((r) => r.check_in_status === 'late').length;
      const totalCheckedOut = records.filter((r) => r.check_out_at !== null).length;
      const totalNotCheckedOut = records.filter(
        (r) => r.check_in_at !== null && r.check_out_at === null
      ).length;
      const totalAbsent = Math.max(0, totalWorkDays - totalAttendance);
      const attendancePercentage =
        totalWorkDays > 0 ? Math.round((totalAttendance / totalWorkDays) * 1000) / 10 : 0;

      const deptObj = Array.isArray(emp.departments)
        ? emp.departments[0]
        : emp.departments;
      const departmentName = deptObj?.name || 'Belum Ditentukan';

      return {
        employeeId: emp.id,
        employeeName: emp.full_name,
        nip: emp.nip || null,
        departmentId: emp.department_id || null,
        departmentName,
        totalWorkDays,
        totalAttendance,
        totalOnTime,
        totalLate,
        totalCheckedOut,
        totalNotCheckedOut,
        totalAbsent,
        attendancePercentage,
      };
    });

    // 2. Include historical employees whose records exist in this period but employee_id was set to NULL
    const activeEmpIdSet = new Set(activeEmployees.map((e) => e.id));
    const historicalRows = attendanceRows.filter(
      (r) => !r.employee_id || !activeEmpIdSet.has(r.employee_id)
    );

    const historicalGroups = new Map<string, any[]>();
    historicalRows.forEach((r) => {
      const key = r.employee_name_snapshot || 'Pegawai Terhapus';
      const list = historicalGroups.get(key) || [];
      list.push(r);
      historicalGroups.set(key, list);
    });

    const historicalSummaries: EmployeeAttendanceSummary[] = Array.from(
      historicalGroups.entries()
    ).map(([name, records]) => {
      const totalAttendance = records.length;
      const totalOnTime = records.filter((r) => r.check_in_status === 'on_time').length;
      const totalLate = records.filter((r) => r.check_in_status === 'late').length;
      const totalCheckedOut = records.filter((r) => r.check_out_at !== null).length;
      const totalNotCheckedOut = records.filter(
        (r) => r.check_in_at !== null && r.check_out_at === null
      ).length;
      const totalAbsent = Math.max(0, totalWorkDays - totalAttendance);
      const attendancePercentage =
        totalWorkDays > 0 ? Math.round((totalAttendance / totalWorkDays) * 1000) / 10 : 0;

      return {
        employeeId: records[0]?.employee_id || `hist_${name}`,
        employeeName: `${name} (Arsip)`,
        nip: null,
        departmentId: null,
        departmentName: 'Pegawai Non-aktif / Terhapus',
        totalWorkDays,
        totalAttendance,
        totalOnTime,
        totalLate,
        totalCheckedOut,
        totalNotCheckedOut,
        totalAbsent,
        attendancePercentage,
      };
    });

    return [...activeSummaries, ...historicalSummaries];
  },

  /**
   * Generates Monthly Summary grouped by attendance_date in Asia/Makassar
   * Minimal fields: month, totalAttendance, totalLate, totalCheckedOut, totalNotCheckedOut
   */
  async getMonthlySummary(filter: AttendanceReportFilter): Promise<MonthlyAttendanceSummary[]> {
    const { attendanceRows, holidaySet } = await this.fetchRawAttendanceRecords(filter);

    const monthsMap = new Map<string, any[]>();
    attendanceRows.forEach((r) => {
      const monthKey = r.attendance_date.substring(0, 7); // YYYY-MM
      const list = monthsMap.get(monthKey) || [];
      list.push(r);
      monthsMap.set(monthKey, list);
    });

    // If no records, populate month from filter range
    const startMonth = filter.startDate.substring(0, 7);
    const endMonth = filter.endDate.substring(0, 7);
    if (!monthsMap.has(startMonth)) monthsMap.set(startMonth, []);
    if (!monthsMap.has(endMonth)) monthsMap.set(endMonth, []);

    const monthlySummaries: MonthlyAttendanceSummary[] = Array.from(monthsMap.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([monthKey, records]) => {
        const totalAttendance = records.length;
        const totalOnTime = records.filter((r) => r.check_in_status === 'on_time').length;
        const totalLate = records.filter((r) => r.check_in_status === 'late').length;
        const totalCheckedOut = records.filter((r) => r.check_out_at !== null).length;
        const totalNotCheckedOut = records.filter(
          (r) => r.check_in_at !== null && r.check_out_at === null
        ).length;

        // Estimate month working days
        const monthStart = `${monthKey}-01`;
        const lastDay = new Date(
          Number(monthKey.substring(0, 4)),
          Number(monthKey.substring(5, 7)),
          0
        ).getDate();
        const monthEnd = `${monthKey}-${String(lastDay).padStart(2, '0')}`;
        const effectiveWorkingDays = this.calculateWorkingDays(
          monthStart,
          monthEnd,
          holidaySet
        );

        return {
          month: monthKey,
          monthLabel: getMonthLabelIndonesian(monthKey),
          totalAttendance,
          totalOnTime,
          totalLate,
          totalCheckedOut,
          totalNotCheckedOut,
          effectiveWorkingDays,
        };
      });

    return monthlySummaries;
  },

  /**
   * Generates Paginated Official Attendance Details via Centralized Status Engine
   */
  async getAttendanceDetails(
    filter: AttendanceReportFilter,
    page: number = 1,
    pageSize: number = 15
  ): Promise<PaginatedAttendanceDetailResponse> {
    const evaluatedMatrix = await attendanceStatusService.getEvaluatedMatrix(
      filter.startDate,
      filter.endDate,
      filter.employeeId,
      filter.departmentId
    );

    let filtered = evaluatedMatrix;

    // Filter by official status if specified
    if (filter.officialStatus && filter.officialStatus !== 'all') {
      filtered = filtered.filter((r) => r.status === filter.officialStatus);
    }

    // Filter by check-in substatus if specified
    if (filter.checkInStatus && filter.checkInStatus !== 'all') {
      filtered = filtered.filter((r) => r.substatus === filter.checkInStatus);
    }

    // Filter by search query (name or NIP)
    if (filter.searchQuery && filter.searchQuery.trim()) {
      const q = filter.searchQuery.toLowerCase().trim();
      filtered = filtered.filter((r) => {
        const nameMatch = r.employeeName.toLowerCase().includes(q);
        const nipMatch = r.nip ? r.nip.toLowerCase().includes(q) : false;
        return nameMatch || nipMatch;
      });
    }

    // Sort by date descending, then employeeName ascending
    filtered.sort((a, b) => {
      const dateCmp = b.date.localeCompare(a.date);
      if (dateCmp !== 0) return dateCmp;
      return a.employeeName.localeCompare(b.employeeName);
    });

    const totalCount = filtered.length;
    const totalPages = Math.ceil(totalCount / pageSize) || 1;
    const from = (page - 1) * pageSize;
    const to = from + pageSize;
    const pagedMatrix = filtered.slice(from, to);

    const records: AttendanceDetailItem[] = pagedMatrix.map((item) => ({
      attendanceId: item.sourceId || `eval_${item.employeeId}_${item.date}`,
      employeeId: item.employeeId,
      employeeName: item.employeeName,
      nip: item.nip,
      departmentName: item.departmentName,
      attendanceDate: item.date,
      checkInAt: item.checkInAt,
      checkInTimeFormatted: formatMakassarTime(item.checkInAt),
      checkInStatus: item.substatus,
      checkInStatusLabel: item.substatusLabel || '-',
      checkInLocation: item.checkInLocation,
      checkOutAt: item.checkOutAt,
      checkOutTimeFormatted: formatMakassarTime(item.checkOutAt),
      checkOutStatus: null,
      checkOutStatusLabel: '-',
      checkOutLocation: item.checkOutLocation,
      notes: item.notes,
      officialStatus: item.status,
      officialStatusLabel: item.statusLabel,
      substatus: item.substatus,
      substatusLabel: item.substatusLabel,
    }));

    return {
      records,
      totalCount,
      page,
      pageSize,
      totalPages,
    };
  },

  /**
   * Fetches All Attendance Details without pagination limits (for Full Export)
   */
  async getAllAttendanceDetails(filter: AttendanceReportFilter): Promise<AttendanceDetailItem[]> {
    const res = await this.getAttendanceDetails(filter, 1, 1000000);
    return res.records;
  },

  /**
   * Fetches Full Combined Report Data Bundle
   */
  async getFullReport(
    filter: AttendanceReportFilter,
    page: number = 1,
    pageSize: number = 15
  ): Promise<AttendanceReportResponse> {
    const [dailySummaries, employeeSummaries, monthlySummaries, details] = await Promise.all([
      this.getDailySummary(filter),
      this.getEmployeeSummary(filter),
      this.getMonthlySummary(filter),
      this.getAttendanceDetails(filter, page, pageSize),
    ]);

    const totalRecords = details.totalCount;
    const totalOnTime = employeeSummaries.reduce((sum, e) => sum + e.totalOnTime, 0);
    const totalLate = employeeSummaries.reduce((sum, e) => sum + e.totalLate, 0);
    const totalCheckedOut = employeeSummaries.reduce((sum, e) => sum + e.totalCheckedOut, 0);
    const totalNotCheckedOut = employeeSummaries.reduce((sum, e) => sum + e.totalNotCheckedOut, 0);
    const effectiveWorkingDays =
      employeeSummaries.length > 0 ? employeeSummaries[0].totalWorkDays : 0;

    const totalPossibleAttendances = employeeSummaries.length * effectiveWorkingDays;
    const overallAttendancePercentage =
      totalPossibleAttendances > 0
        ? Math.round((totalRecords / totalPossibleAttendances) * 1000) / 10
        : 0;

    const metrics: OverallReportMetrics = {
      totalEmployees: employeeSummaries.length,
      effectiveWorkingDays,
      totalAttendanceRecords: totalRecords,
      totalOnTime,
      totalLate,
      totalCheckedOut,
      totalNotCheckedOut,
      overallAttendancePercentage,
    };

    return {
      filter,
      metrics,
      dailySummaries,
      employeeSummaries,
      monthlySummaries,
      details,
    };
  },

  /**
   * Generates a monthly employee matrix recap dataset for a specified year and month (PHASE 9G)
   */
  async getMonthlyRecapReport(
    year: number,
    month: number,
    filter: {
      departmentId?: string | null;
      employeeType?: string | null;
      searchQuery?: string;
    } = {}
  ): Promise<MonthlyRecapReportResponse> {
    if (!isSupabaseConfigured()) {
      return {
        year,
        month,
        daysInMonth: new Date(year, month, 0).getDate(),
        rows: [],
        summary: {
          totalEmployees: 0,
          totalPresent: 0,
          totalLate: 0,
          totalSick: 0,
          totalPermit: 0,
          totalOfficialDuty: 0,
          totalLeave: 0,
          totalAbsent: 0,
        },
      };
    }

    const daysInMonth = new Date(year, month, 0).getDate();
    const startDateStr = `${year}-${String(month).padStart(2, '0')}-01`;
    const endDateStr = `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
    const todayStr = getMakassarTodayDateString();

    // 1. Fetch evaluated matrix for the whole month, filtered by department
    const matrixData = await attendanceStatusService.getEvaluatedMatrix(
      startDateStr,
      endDateStr,
      null,
      filter.departmentId || null
    );

    // 2. Fetch employee types
    const { data: employeesData, error: empError } = await supabase
      .from('employees')
      .select('id, employee_type');

    if (empError) {
      console.error('Error fetching employee types for recap:', empError);
    }

    const typeMap = new Map<string, string>();
    (employeesData || []).forEach((e) => {
      typeMap.set(e.id, e.employee_type || '');
    });

    // 3. Group evaluated status matrix by employee ID
    const employeeRowsMap = new Map<string, {
      employeeId: string;
      employeeName: string;
      nip: string | null;
      departmentName: string;
      dailyStatuses: { [day: number]: any };
    }>();

    matrixData.forEach((item) => {
      const empId = item.employeeId;
      if (!employeeRowsMap.has(empId)) {
        employeeRowsMap.set(empId, {
          employeeId: empId,
          employeeName: item.employeeName,
          nip: item.nip,
          departmentName: item.departmentName,
          dailyStatuses: {},
        });
      }

      const dayNumber = Number(item.date.split('-')[2]);
      let statusValue = item.status;
      let codeValue: 'H' | 'T' | 'S' | 'I' | 'DL' | 'C' | 'A' | 'L' | '—' = '—';

      if (item.date > todayStr) {
        statusValue = 'future' as any;
        codeValue = '—';
      } else {
        if (item.status === 'present') {
          codeValue = item.substatus === 'late' ? 'T' : 'H';
        } else if (item.status === 'sick') {
          codeValue = 'S';
        } else if (item.status === 'permit') {
          codeValue = 'I';
        } else if (item.status === 'official_duty') {
          codeValue = 'DL';
        } else if (item.status === 'leave') {
          codeValue = 'C';
        } else if (item.status === 'absent') {
          codeValue = 'A';
        } else if (item.status === 'holiday') {
          codeValue = 'L';
        }
      }

      employeeRowsMap.get(empId)!.dailyStatuses[dayNumber] = {
        date: item.date,
        status: statusValue,
        code: codeValue,
        notes: item.notes,
      };
    });

    // 4. Build MonthlyRecapRow list
    const rows: MonthlyRecapRow[] = [];

    employeeRowsMap.forEach((emp) => {
      const rawType = typeMap.get(emp.employeeId);
      const employeeType = normalizeEmployeeType(rawType);

      // Apply Employee Type Filter
      if (
        filter.employeeType &&
        filter.employeeType !== 'all' &&
        employeeType !== filter.employeeType
      ) {
        return;
      }

      // Apply Search Query Filter (Name or NIP)
      if (filter.searchQuery) {
        const query = filter.searchQuery.toLowerCase().trim();
        const matchesName = emp.employeeName.toLowerCase().includes(query);
        const matchesNip = emp.nip ? emp.nip.includes(query) : false;
        if (!matchesName && !matchesNip) {
          return;
        }
      }

      // Calculate summaries for this employee
      let totalPresent = 0; // H + T
      let totalLate = 0;    // T
      let totalSick = 0;    // S
      let totalPermit = 0;  // I
      let totalOfficialDuty = 0; // DL
      let totalLeave = 0;   // C
      let totalAbsent = 0;  // A
      let totalHoliday = 0; // L
      let effectiveWorkingDays = 0;

      for (let d = 1; d <= daysInMonth; d++) {
        const dayStatus = emp.dailyStatuses[d];
        if (!dayStatus) {
          // If status is missing, default to future
          emp.dailyStatuses[d] = {
            date: `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
            status: 'future',
            code: '—',
            notes: null,
          };
          continue;
        }

        if (dayStatus.status !== 'future') {
          if (dayStatus.code === 'H' || dayStatus.code === 'T') {
            totalPresent++;
            if (dayStatus.code === 'T') {
              totalLate++;
            }
          } else if (dayStatus.code === 'S') {
            totalSick++;
          } else if (dayStatus.code === 'I') {
            totalPermit++;
          } else if (dayStatus.code === 'DL') {
            totalOfficialDuty++;
          } else if (dayStatus.code === 'C') {
            totalLeave++;
          } else if (dayStatus.code === 'A') {
            totalAbsent++;
          } else if (dayStatus.code === 'L') {
            totalHoliday++;
          }

          // Effective working day: not holiday
          if (dayStatus.status !== 'holiday') {
            effectiveWorkingDays++;
          }
        }
      }

      // Compute Percentage
      let attendancePercentage: number | null = null;
      let attendancePercentageLabel = '—';

      if (effectiveWorkingDays > 0) {
        // (Hadir + Dinas Luar) / Hari Kerja Efektif * 100
        const presentAndDuty = totalPresent + totalOfficialDuty;
        const percentage = Math.min(100, (presentAndDuty / effectiveWorkingDays) * 100);
        attendancePercentage = Math.round(percentage * 10) / 10; // 1 decimal place
        attendancePercentageLabel = attendancePercentage.toFixed(1).replace('.', ',') + '%';
      }

      rows.push({
        employeeId: emp.employeeId,
        employeeName: emp.employeeName,
        nip: emp.nip,
        employeeType,
        departmentName: emp.departmentName,
        dailyStatuses: emp.dailyStatuses,
        totalPresent,
        totalLate,
        totalSick,
        totalPermit,
        totalOfficialDuty,
        totalLeave,
        totalAbsent,
        totalHoliday,
        effectiveWorkingDays,
        attendancePercentage,
        attendancePercentageLabel,
      });
    });

    // 5. Default Sorting: Employee Name A-Z
    rows.sort((a, b) => a.employeeName.localeCompare(b.employeeName));

    // 6. Calculate Global Aggregated Summaries over ALL filtered rows
    let globalPresent = 0;
    let globalLate = 0;
    let globalSick = 0;
    let globalPermit = 0;
    let globalOfficialDuty = 0;
    let globalLeave = 0;
    let globalAbsent = 0;

    rows.forEach((row) => {
      globalPresent += row.totalPresent;
      globalLate += row.totalLate;
      globalSick += row.totalSick;
      globalPermit += row.totalPermit;
      globalOfficialDuty += row.totalOfficialDuty;
      globalLeave += row.totalLeave;
      globalAbsent += row.totalAbsent;
    });

    return {
      year,
      month,
      daysInMonth,
      rows,
      summary: {
        totalEmployees: rows.length,
        totalPresent: globalPresent,
        totalLate: globalLate,
        totalSick: globalSick,
        totalPermit: globalPermit,
        totalOfficialDuty: globalOfficialDuty,
        totalLeave: globalLeave,
        totalAbsent: globalAbsent,
      },
    };
  },
};

function normalizeEmployeeType(type: string | null | undefined): string {
  if (!type) return 'Tidak diketahui';
  const t = type.trim().toUpperCase();
  if (t === 'PNS') return 'PNS';
  if (t === 'PPPK') return 'PPPK';
  if (t === 'GTT' || t === 'PTT' || t === 'HONORER' || t.includes('GTT') || t.includes('PTT') || t.includes('HONORER')) {
    return 'HONORER';
  }
  return 'Tidak diketahui';
}
