import { AttendanceModel } from '../types/attendance.types';

const LOCAL_STORAGE_ATTENDANCE_KEY = 'smkn1_attendance_records_fallback';
let inMemoryRecords: AttendanceModel[] = [];

/**
 * Retrieves all locally cached or fallback attendance records
 */
export function getLocalAttendanceRecords(): AttendanceModel[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = localStorage.getItem(LOCAL_STORAGE_ATTENDANCE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    }
  } catch (err) {
    console.warn('Failed to read attendance records from localStorage:', err);
  }
  return [...inMemoryRecords];
}

/**
 * Persists attendance records to localStorage and memory
 */
export function saveLocalAttendanceRecords(records: AttendanceModel[]): void {
  inMemoryRecords = [...records];
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(LOCAL_STORAGE_ATTENDANCE_KEY, JSON.stringify(records));
    }
  } catch (err) {
    console.warn('Failed to write attendance records to localStorage:', err);
  }
}

/**
 * Finds today's or a specific date's attendance record for an employee
 */
export function findLocalAttendance(employeeId: string, dateStr: string): AttendanceModel | null {
  const records = getLocalAttendanceRecords();
  return records.find((r) => r.employee_id === employeeId && r.attendance_date === dateStr) || null;
}

/**
 * Inserts or updates an attendance record in localStorage
 */
export function saveLocalAttendance(record: AttendanceModel): void {
  const records = getLocalAttendanceRecords();
  const index = records.findIndex(
    (r) => r.employee_id === record.employee_id && r.attendance_date === record.attendance_date
  );

  if (index !== -1) {
    records[index] = {
      ...records[index],
      ...record,
      updated_at: new Date().toISOString(),
    };
  } else {
    records.unshift(record);
  }

  saveLocalAttendanceRecords(records);
}

/**
 * Deletes an attendance record from localStorage and memory (purges stale/invalid cache)
 * Ensures non-authoritative local cache is discarded when database confirms no record exists.
 */
export function deleteLocalAttendance(employeeId: string, dateStr: string): void {
  const records = getLocalAttendanceRecords();
  const filtered = records.filter(
    (r) => !(r.employee_id === employeeId && r.attendance_date === dateStr)
  );
  saveLocalAttendanceRecords(filtered);
}
