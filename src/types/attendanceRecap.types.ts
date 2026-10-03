export interface EmployeeRecapRecord {
  employeeId: string;
  fullName: string;
  nip: string | null;
  departmentId: string | null;
  departmentName: string;
  effectiveWorkingDays: number;
  totalAttendance: number;
  onTimeCount: number;
  lateCount: number;
  checkedOutCount: number;
  notCheckedOutCount: number;
  absentCount: number;
}

export interface GlobalRecapSummary {
  totalEmployees: number;
  effectiveWorkingDays: number;
  totalAttendance: number;
  onTimeCount: number;
  lateCount: number;
  absentCount: number;
  checkedOutCount: number;
  notCheckedOutCount: number;
}

export interface DailyTrendPoint {
  date: string; // YYYY-MM-DD
  dateLabel: string; // e.g., '01 Okt'
  onTime: number;
  late: number;
  absent: number;
  totalPresent: number;
}

export interface DepartmentStatPoint {
  departmentId: string;
  departmentName: string;
  totalEmployees: number;
  onTime: number;
  late: number;
  absent: number;
  totalAttendance: number;
}

export interface RecapStatistics {
  checkInStatusStats: {
    onTimeCount: number;
    lateCount: number;
    onTimePercentage: number;
    latePercentage: number;
  };
  checkOutStatusStats: {
    checkedOutCount: number;
    notCheckedOutCount: number;
    checkedOutPercentage: number;
    notCheckedOutPercentage: number;
  };
  dailyTrend: DailyTrendPoint[];
  departmentStats: DepartmentStatPoint[];
}

export interface RecapFilter {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  departmentId?: string; // 'all' or department UUID
  statusFilter?: 'all' | 'on_time' | 'late' | 'belum_presensi' | 'sudah_checkout' | 'belum_checkout';
  searchQuery?: string;
}

export interface RecapDataResponse {
  records: EmployeeRecapRecord[];
  summary: GlobalRecapSummary;
  statistics: RecapStatistics;
  startDate: string;
  endDate: string;
}

export interface EmployeeAttendanceDetailLog {
  id: string;
  attendanceDate: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  checkInStatus: 'on_time' | 'late' | null;
  checkOutStatus: 'operational' | 'after_work' | null;
}
