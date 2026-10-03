import {
  evaluateCheckIn,
  evaluateCheckOut,
} from '../services/attendanceBusinessRules';
import { WorkScheduleModel } from '../types/workSchedule.types';
import { AttendanceModel } from '../types/attendance.types';

// Mock active school work schedule matching Phase 5C-2 default
const mockSchedule: WorkScheduleModel = {
  id: '00000000-0000-0000-0000-000000000001',
  name: 'Jadwal Kerja Sekolah',
  code: 'SCHOOL_DEFAULT',
  description: 'Jadwal standar sekolah',
  check_in_start_time: '06:30:00',
  check_in_on_time_end: '07:30:00',
  check_in_end_time: '10:00:00',
  work_start_time: '07:30:00',
  operational_end_time: '15:00:00',
  work_end_time: '15:30:00',
  check_out_start_time: '15:00:00',
  check_out_end_time: '17:00:00',
  working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  is_active: true,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// Helper to create Date on a specific Monday (2026-10-05) at specific HH:mm
const createTestDate = (timeStr: string, isWeekend = false): Date => {
  const dateStr = isWeekend ? '2026-10-04' : '2026-10-05'; // 2026-10-04 is Sunday, 2026-10-05 is Monday
  return new Date(`${dateStr}T${timeStr}:00`);
};

console.log('=== RUNNING ATTENDANCE BUSINESS RULES TESTS ===\n');

// 1. CHECK-IN TESTS
console.log('--- CHECK-IN SCENARIOS ---');

// Weekend (Sunday)
const resWeekend = evaluateCheckIn(createTestDate('07:00', true), mockSchedule);
console.assert(
  !resWeekend.allowed && resWeekend.reason === 'Hari ini bukan hari kerja.',
  'FAILED: Weekend check-in should be disallowed'
);
console.log('✓ Weekend check-in disallowed ("Hari ini bukan hari kerja.")');

// Sebelum 06:30 (e.g. 06:20)
const resEarlyCheckIn = evaluateCheckIn(createTestDate('06:20'), mockSchedule);
console.assert(
  !resEarlyCheckIn.allowed && resEarlyCheckIn.reason === 'Check-in belum dibuka.',
  'FAILED: Before 06:30 should return "Check-in belum dibuka."'
);
console.log('✓ 06:20 check-in disallowed ("Check-in belum dibuka.")');

// 06:30 (start)
const resStartOnTime = evaluateCheckIn(createTestDate('06:30'), mockSchedule);
console.assert(
  resStartOnTime.allowed && resStartOnTime.status === 'on_time',
  'FAILED: 06:30 should be allowed as on_time'
);
console.log('✓ 06:30 check-in allowed ("on_time")');

// 07:30 (end of on_time)
const resEndOnTime = evaluateCheckIn(createTestDate('07:30'), mockSchedule);
console.assert(
  resEndOnTime.allowed && resEndOnTime.status === 'on_time',
  'FAILED: 07:30 should be allowed as on_time'
);
console.log('✓ 07:30 check-in allowed ("on_time")');

// 07:31 (late)
const resLateStart = evaluateCheckIn(createTestDate('07:31'), mockSchedule);
console.assert(
  resLateStart.allowed && resLateStart.status === 'late',
  'FAILED: 07:31 should be allowed as late'
);
console.log('✓ 07:31 check-in allowed ("late")');

// 10:00 (end of late)
const resLateEnd = evaluateCheckIn(createTestDate('10:00'), mockSchedule);
console.assert(
  resLateEnd.allowed && resLateEnd.status === 'late',
  'FAILED: 10:00 should be allowed as late'
);
console.log('✓ 10:00 check-in allowed ("late")');

// 10:01 (closed)
const resClosedCheckIn = evaluateCheckIn(createTestDate('10:01'), mockSchedule);
console.assert(
  !resClosedCheckIn.allowed && resClosedCheckIn.reason === 'Waktu check-in telah berakhir.',
  'FAILED: 10:01 check-in should be closed'
);
console.log('✓ 10:01 check-in closed ("Waktu check-in telah berakhir.")');

// 2. CHECK-OUT TESTS
console.log('\n--- CHECK-OUT SCENARIOS ---');

const mockAttendanceCheckedIn: AttendanceModel = {
  id: 'att-123',
  employee_id: 'emp-123',
  attendance_date: '2026-10-05',
  check_in_at: '2026-10-05T07:15:00Z',
  check_out_at: null,
  check_in_status: 'on_time',
  check_out_status: null,
  check_in_location_id: 'loc-123',
  check_out_location_id: null,
  check_in_latitude: -2.5,
  check_in_longitude: 121.2,
  check_out_latitude: null,
  check_out_longitude: null,
  notes: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

// No check-in
const resNoCheckIn = evaluateCheckOut(createTestDate('15:00'), mockSchedule, null);
console.assert(
  !resNoCheckIn.allowed && resNoCheckIn.reason === 'Anda belum melakukan presensi masuk hari ini.',
  'FAILED: Check-out without check-in should be disallowed'
);
console.log('✓ Check-out without check-in disallowed');

// Already checked out
const mockAttendanceAlreadyCheckedOut: AttendanceModel = {
  ...mockAttendanceCheckedIn,
  check_out_at: '2026-10-05T15:05:00Z',
  check_out_status: 'operational',
};
const resAlreadyCheckedOut = evaluateCheckOut(
  createTestDate('15:10'),
  mockSchedule,
  mockAttendanceAlreadyCheckedOut
);
console.assert(
  !resAlreadyCheckedOut.allowed &&
    resAlreadyCheckedOut.reason === 'Presensi pulang hari ini sudah tercatat.',
  'FAILED: Duplicate check-out should be disallowed'
);
console.log('✓ Duplicate check-out disallowed');

// Sebelum 15:00 (e.g. 14:59)
const resEarlyCheckOut = evaluateCheckOut(
  createTestDate('14:59'),
  mockSchedule,
  mockAttendanceCheckedIn
);
console.assert(
  !resEarlyCheckOut.allowed && resEarlyCheckOut.reason === 'Check-out belum dibuka.',
  'FAILED: Before 15:00 should return "Check-out belum dibuka."'
);
console.log('✓ 14:59 check-out disallowed ("Check-out belum dibuka.")');

// 15:00 (operational start)
const resOpStart = evaluateCheckOut(
  createTestDate('15:00'),
  mockSchedule,
  mockAttendanceCheckedIn
);
console.assert(
  resOpStart.allowed && resOpStart.status === 'operational',
  'FAILED: 15:00 should be allowed as "operational"'
);
console.log('✓ 15:00 check-out allowed ("operational")');

// 15:30 (operational end / official work end)
const resOpEnd = evaluateCheckOut(
  createTestDate('15:30'),
  mockSchedule,
  mockAttendanceCheckedIn
);
console.assert(
  resOpEnd.allowed && resOpEnd.status === 'operational',
  'FAILED: 15:30 should be allowed as "operational"'
);
console.log('✓ 15:30 check-out allowed ("operational")');

// 15:31 (after_work start)
const resAfterWorkStart = evaluateCheckOut(
  createTestDate('15:31'),
  mockSchedule,
  mockAttendanceCheckedIn
);
console.assert(
  resAfterWorkStart.allowed && resAfterWorkStart.status === 'after_work',
  'FAILED: 15:31 should be allowed as "after_work"'
);
console.log('✓ 15:31 check-out allowed ("after_work")');

// 17:00 (after_work end)
const resAfterWorkEnd = evaluateCheckOut(
  createTestDate('17:00'),
  mockSchedule,
  mockAttendanceCheckedIn
);
console.assert(
  resAfterWorkEnd.allowed && resAfterWorkEnd.status === 'after_work',
  'FAILED: 17:00 should be allowed as "after_work"'
);
console.log('✓ 17:00 check-out allowed ("after_work")');

// 17:01 (closed)
const resClosedCheckOut = evaluateCheckOut(
  createTestDate('17:01'),
  mockSchedule,
  mockAttendanceCheckedIn
);
console.assert(
  !resClosedCheckOut.allowed && resClosedCheckOut.reason === 'Waktu check-out telah berakhir.',
  'FAILED: 17:01 check-out should be closed'
);
console.log('✓ 17:01 check-out closed ("Waktu check-out telah berakhir.")');

console.log('\n=== ALL TEST SCENARIOS PASSED SUCCESSFULLY! ===');
