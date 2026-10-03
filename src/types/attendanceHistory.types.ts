import { AttendanceModel } from './attendance.types';

export interface AttendanceLocationInfo {
  id: string;
  name: string;
  code: string;
}

export interface AttendanceHistoryRecord extends AttendanceModel {
  check_in_location?: AttendanceLocationInfo | null;
  check_out_location?: AttendanceLocationInfo | null;
}

export interface AttendanceHistorySummary {
  totalAttendance: number;
  onTimeCount: number;
  lateCount: number;
  checkedOutCount: number;
}

export interface AttendanceHistoryFilter {
  startDate: string; // YYYY-MM-DD
  endDate: string; // YYYY-MM-DD
  statusFilter?: 'all' | 'on_time' | 'late';
  checkoutFilter?: 'all' | 'checked_out' | 'not_checked_out';
  page?: number;
  pageSize?: number;
}

export interface AttendanceHistoryResponse {
  records: AttendanceHistoryRecord[];
  summary: AttendanceHistorySummary;
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
