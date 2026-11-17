export interface MonitoringRecord {
  employeeId: string;
  fullName: string;
  nip: string | null;
  photoUrl?: string | null;
  positionName?: string | null;
  departmentId: string | null;
  departmentName: string;
  attendanceId: string | null;
  attendanceDate: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  checkInStatus: 'on_time' | 'late' | null;
  checkOutStatus: 'operational' | 'after_work' | null;
  overallStatus: 'belum_presensi' | 'sudah_masuk' | 'sudah_pulang';
  checkInPhotoPath?: string | null;
  checkOutPhotoPath?: string | null;
  requestType?: 'official_duty' | 'sick' | 'other' | 'leave' | null;
  requestStatus?: 'approved' | 'pending' | null;
}

export interface MonitoringSummary {
  totalEmployees: number;
  presentCount: number;
  onTimeCount: number;
  lateCount: number;
  absentCount: number;
  checkedOutCount: number;
}

export interface DepartmentOption {
  id: string;
  name: string;
}

export interface MonitoringFilter {
  date: string; // YYYY-MM-DD
  departmentId?: string; // 'all' or department UUID
  statusFilter?: 'all' | 'belum_presensi' | 'sudah_masuk' | 'sudah_pulang' | 'on_time' | 'late';
  searchQuery?: string; // name or NIP search
}

export interface MonitoringDataResponse {
  records: MonitoringRecord[];
  summary: MonitoringSummary;
  date: string;
}
