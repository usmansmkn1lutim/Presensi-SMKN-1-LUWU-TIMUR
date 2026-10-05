/**
 * Types and Data Contracts for Rekap dan Laporan Presensi (PHASE 9B)
 *
 * Strict Single Source of Truth: public.attendance in Supabase PostgreSQL
 */

export interface AttendanceReportFilter {
  startDate: string; // YYYY-MM-DD (inclusive)
  endDate: string;   // YYYY-MM-DD (inclusive)
  employeeId?: string | null;
  departmentId?: string | null;
  checkInStatus?: 'all' | 'on_time' | 'late' | null;
  checkOutStatus?: 'all' | 'operational' | 'after_work' | null;
  locationId?: string | null;
  searchQuery?: string;
}

/**
 * Daily Summary Record
 * Minimal fields: attendanceDate, totalEmployees, totalPresent, totalLate, totalCheckedOut, totalNotCheckedOut
 */
export interface DailyAttendanceSummary {
  attendanceDate: string; // YYYY-MM-DD
  dateLabel: string;      // e.g. "01 Okt 2026"
  dayName: string;       // e.g. "Senin"
  totalEmployees: number; // total active employees on that date
  totalPresent: number;   // rows present on that date
  totalLate: number;      // check_in_status === 'late'
  totalOnTime: number;    // check_in_status === 'on_time'
  totalCheckedOut: number; // check_out_at IS NOT NULL
  totalNotCheckedOut: number; // check_in_at IS NOT NULL && check_out_at IS NULL
  totalAbsent: number;    // Math.max(0, totalEmployees - totalPresent)
}

/**
 * Per-Employee Summary Record
 * Minimal fields: employeeId, employeeName, totalAttendance, totalLate, totalCheckedOut, totalNotCheckedOut
 */
export interface EmployeeAttendanceSummary {
  employeeId: string;
  employeeName: string;
  nip: string | null;
  departmentId: string | null;
  departmentName: string;
  totalWorkDays: number;
  totalAttendance: number;
  totalOnTime: number;
  totalLate: number;
  totalCheckedOut: number;
  totalNotCheckedOut: number;
  totalAbsent: number;
  attendancePercentage: number; // 0 - 100
}

/**
 * Monthly Summary Record
 * Minimal fields: month, totalAttendance, totalLate, totalCheckedOut, totalNotCheckedOut
 */
export interface MonthlyAttendanceSummary {
  month: string;      // YYYY-MM
  monthLabel: string; // e.g. "Oktober 2026"
  totalAttendance: number;
  totalOnTime: number;
  totalLate: number;
  totalCheckedOut: number;
  totalNotCheckedOut: number;
  effectiveWorkingDays: number;
}

/**
 * Detail Attendance Item
 * Minimal fields: attendanceId, employeeId, employeeName, attendanceDate, checkInAt, checkInStatus, checkInLocation, checkOutAt, checkOutStatus, checkOutLocation, notes
 */
export interface AttendanceDetailItem {
  attendanceId: string;
  employeeId: string | null;
  employeeName: string; // from employee.full_name or fallback employee_name_snapshot
  nip: string | null;
  departmentName: string;
  attendanceDate: string; // YYYY-MM-DD
  checkInAt: string | null;
  checkInTimeFormatted: string; // e.g. "07:15" WITA
  checkInStatus: 'on_time' | 'late' | null;
  checkInStatusLabel: string;
  checkInLocation: string | null;
  checkOutAt: string | null;
  checkOutTimeFormatted: string; // e.g. "15:30" WITA
  checkOutStatus: 'operational' | 'after_work' | null;
  checkOutStatusLabel: string;
  checkOutLocation: string | null;
  notes: string | null;
}

/**
 * Paginated Attendance Detail Result
 */
export interface PaginatedAttendanceDetailResponse {
  records: AttendanceDetailItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

/**
 * Global Summary Overview for Reports
 */
export interface OverallReportMetrics {
  totalEmployees: number;
  effectiveWorkingDays: number;
  totalAttendanceRecords: number;
  totalOnTime: number;
  totalLate: number;
  totalCheckedOut: number;
  totalNotCheckedOut: number;
  overallAttendancePercentage: number;
}

/**
 * Full Report Response Bundle
 */
export interface AttendanceReportResponse {
  filter: AttendanceReportFilter;
  metrics: OverallReportMetrics;
  dailySummaries: DailyAttendanceSummary[];
  employeeSummaries: EmployeeAttendanceSummary[];
  monthlySummaries: MonthlyAttendanceSummary[];
  details: PaginatedAttendanceDetailResponse;
}
