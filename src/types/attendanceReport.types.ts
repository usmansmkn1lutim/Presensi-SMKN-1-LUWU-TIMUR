/**
 * Types and Data Contracts for Rekap dan Laporan Presensi (PHASE 9B)
 *
 * Strict Single Source of Truth: public.attendance in Supabase PostgreSQL
 */

import {
  OfficialAttendanceStatus,
  AttendanceSubstatus,
} from '../services/attendanceStatusService';

export type { OfficialAttendanceStatus, AttendanceSubstatus };

export interface AttendanceReportFilter {
  startDate: string; // YYYY-MM-DD (inclusive)
  endDate: string;   // YYYY-MM-DD (inclusive)
  employeeId?: string | null;
  departmentId?: string | null;
  checkInStatus?: 'all' | 'on_time' | 'late' | null;
  checkOutStatus?: 'all' | 'operational' | 'after_work' | null;
  officialStatus?: 'all' | OfficialAttendanceStatus | null;
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
  totalSick?: number;
  totalPermit?: number;
  totalOfficialDuty?: number;
  totalLeave?: number;
  totalHoliday?: number;
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
  totalSick?: number;
  totalPermit?: number;
  totalOfficialDuty?: number;
  totalLeave?: number;
  totalHoliday?: number;
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
  totalSick?: number;
  totalPermit?: number;
  totalOfficialDuty?: number;
  totalLeave?: number;
  totalAbsent?: number;
  totalHoliday?: number;
}

/**
 * Detail Attendance Item
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
  officialStatus: OfficialAttendanceStatus;
  officialStatusLabel: string;
  substatus: AttendanceSubstatus;
  substatusLabel: string | null;
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

export interface MonthlyRecapDailyStatus {
  date: string; // YYYY-MM-DD
  status: OfficialAttendanceStatus | 'future';
  code: 'H' | 'T' | 'S' | 'I' | 'DL' | 'C' | 'A' | 'L' | '—';
  notes: string | null;
}

export interface MonthlyRecapRow {
  employeeId: string;
  employeeName: string;
  nip: string | null;
  employeeType: string; // 'PNS' | 'PPPK' | 'HONORER' | 'Tidak diketahui'
  departmentName: string;
  dailyStatuses: { [day: number]: MonthlyRecapDailyStatus };
  totalPresent: number;     // H (total of on_time + late)
  totalLate: number;        // T
  totalSick: number;        // S
  totalPermit: number;      // I
  totalOfficialDuty: number; // DL
  totalLeave: number;       // C
  totalAbsent: number;      // A
  totalHoliday: number;     // L
  effectiveWorkingDays: number;
  attendancePercentage: number | null; // e.g. 92.3 or null
  attendancePercentageLabel: string;   // e.g. "92,3%" or "—"
}

export interface MonthlyRecapReportResponse {
  year: number;
  month: number;
  daysInMonth: number;
  rows: MonthlyRecapRow[];
  summary: {
    totalEmployees: number;
    totalPresent: number;
    totalLate: number;
    totalSick: number;
    totalPermit: number;
    totalOfficialDuty: number;
    totalLeave: number;
    totalAbsent: number;
  };
}
