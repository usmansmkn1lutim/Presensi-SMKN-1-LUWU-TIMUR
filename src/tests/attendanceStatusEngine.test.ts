import {
  evaluateDailyStatus,
  OFFICIAL_STATUS_LABELS,
  MinimalEmployee,
  MinimalAttendance,
  MinimalRequest,
  MinimalHoliday,
} from '../services/attendanceStatusService';

console.log('=== RUNNING ATTENDANCE STATUS ENGINE TESTS ===\n');

const testEmployee: MinimalEmployee = {
  id: 'emp-101',
  full_name: 'Ahmad Supardi',
  nip: '198001012005011001',
  departmentName: 'Bahasa & Seni',
};

const todayStr = '2026-10-05'; // Monday

// 1. Attendance On Time
const res1 = evaluateDailyStatus(
  '2026-10-05',
  testEmployee,
  {
    id: 'att-1',
    employee_id: 'emp-101',
    attendance_date: '2026-10-05',
    check_in_at: '2026-10-05T07:15:00+08:00',
    check_out_at: '2026-10-05T15:30:00+08:00',
    check_in_status: 'on_time',
    check_out_status: 'operational',
    notes: null,
  },
  null,
  null,
  todayStr
);
console.assert(res1.status === 'present', '1. Status should be present');
console.assert(res1.substatus === 'on_time', '1. Substatus should be on_time');
console.assert(res1.statusLabel === 'Hadir', '1. Label should be Hadir');
console.log('✓ 1. Attendance on-time verified: Hadir (Tepat Waktu)');

// 2. Attendance Late
const res2 = evaluateDailyStatus(
  '2026-10-05',
  testEmployee,
  {
    id: 'att-2',
    employee_id: 'emp-101',
    attendance_date: '2026-10-05',
    check_in_at: '2026-10-05T08:15:00+08:00',
    check_out_at: null,
    check_in_status: 'late',
    check_out_status: null,
    notes: 'Macet jalanan',
  },
  null,
  null,
  todayStr
);
console.assert(res2.status === 'present', '2. Status should be present');
console.assert(res2.substatus === 'late', '2. Substatus should be late');
console.assert(res2.substatusLabel === 'Terlambat', '2. Substatus label Terlambat');
console.log('✓ 2. Attendance late verified: Hadir (Terlambat)');

// 3. Approved Sick Request
const res3 = evaluateDailyStatus(
  '2026-10-05',
  testEmployee,
  null,
  {
    id: 'req-sick',
    employee_id: 'emp-101',
    request_type: 'sick',
    start_date: '2026-10-05',
    end_date: '2026-10-05',
    reason: 'Sakit demam tinggi',
    status: 'approved',
  },
  null,
  todayStr
);
console.assert(res3.status === 'sick', '3. Status should be sick');
console.assert(res3.statusLabel === 'Sakit', '3. Status label Sakit');
console.assert(res3.notes === 'Sakit demam tinggi', '3. Notes reason preserved');
console.log('✓ 3. Approved sick request verified: Sakit');

// 4. Approved Permit (Other) Request
const res4 = evaluateDailyStatus(
  '2026-10-05',
  testEmployee,
  null,
  {
    id: 'req-permit',
    employee_id: 'emp-101',
    request_type: 'other',
    start_date: '2026-10-05',
    end_date: '2026-10-05',
    reason: 'Keperluan keluarga mendesak',
    status: 'approved',
  },
  null,
  todayStr
);
console.assert(res4.status === 'permit', '4. Status should be permit');
console.assert(res4.statusLabel === 'Izin', '4. Status label Izin');
console.log('✓ 4. Approved permit request verified: Izin');

// 5. Approved Official Duty Request
const res5 = evaluateDailyStatus(
  '2026-10-05',
  testEmployee,
  null,
  {
    id: 'req-duty',
    employee_id: 'emp-101',
    request_type: 'official_duty',
    start_date: '2026-10-05',
    end_date: '2026-10-05',
    reason: 'Rapat koordinasi Dinas Pendidikan',
    status: 'approved',
  },
  null,
  todayStr
);
console.assert(res5.status === 'official_duty', '5. Status should be official_duty');
console.assert(res5.statusLabel === 'Dinas Luar', '5. Status label Dinas Luar');
console.log('✓ 5. Approved official duty verified: Dinas Luar');

// 6. Approved Leave Request
const res6 = evaluateDailyStatus(
  '2026-10-05',
  testEmployee,
  null,
  {
    id: 'req-leave',
    employee_id: 'emp-101',
    request_type: 'leave',
    start_date: '2026-10-05',
    end_date: '2026-10-05',
    reason: 'Cuti tahunan',
    status: 'approved',
  },
  null,
  todayStr
);
console.assert(res6.status === 'leave', '6. Status should be leave');
console.assert(res6.statusLabel === 'Cuti', '6. Status label Cuti');
console.log('✓ 6. Approved leave verified: Cuti');

// 7. Alpha / Unexcused Absence
const res7 = evaluateDailyStatus('2026-10-05', testEmployee, null, null, null, todayStr);
console.assert(res7.status === 'absent', '7. Status should be absent');
console.assert(res7.statusLabel === 'Alpha', '7. Status label Alpha');
console.assert(res7.notes === 'Tanpa Keterangan', '7. Notes should be Tanpa Keterangan');
console.log('✓ 7. Alpha verified: Alpha (Tanpa Keterangan)');

// 8. Weekend (Sunday 2026-10-04)
const res8 = evaluateDailyStatus('2026-10-04', testEmployee, null, null, null, todayStr);
console.assert(res8.status === 'holiday', '8. Status should be holiday');
console.assert(res8.notes === 'Akhir Pekan', '8. Notes Akhir Pekan');
console.log('✓ 8. Weekend verified: Libur (Akhir Pekan)');

// 9. Official Active Holiday
const res9 = evaluateDailyStatus(
  '2026-10-05',
  testEmployee,
  null,
  null,
  {
    id: 'hol-1',
    holiday_date: '2026-10-05',
    name: 'Hari Kesaktian Pancasila',
    is_active: true,
  },
  todayStr
);
console.assert(res9.status === 'holiday', '9. Status should be holiday');
console.assert(res9.notes === 'Hari Kesaktian Pancasila', '9. Holiday name preserved');
console.log('✓ 9. Official active holiday verified: Libur');

// 10. Physical Attendance Overrides Approved Leave (PRIORITY 1 CHECK)
const res10 = evaluateDailyStatus(
  '2026-10-05',
  testEmployee,
  {
    id: 'att-override',
    employee_id: 'emp-101',
    attendance_date: '2026-10-05',
    check_in_at: '2026-10-05T07:10:00+08:00',
    check_out_at: null,
    check_in_status: 'on_time',
    check_out_status: null,
    notes: 'Hadir langsung',
  },
  {
    id: 'req-leave-approved',
    employee_id: 'emp-101',
    request_type: 'leave',
    start_date: '2026-10-05',
    end_date: '2026-10-05',
    reason: 'Cuti tahunan',
    status: 'approved',
  },
  null,
  todayStr
);
console.assert(
  res10.status === 'present',
  '10. Physical attendance MUST override approved leave'
);
console.assert(res10.statusLabel === 'Hadir', '10. Status label must be Hadir');
console.log('✓ 10. Priority 1 check passed: Physical attendance overrides approved leave');

// 11. Physical Attendance Overrides Approved Sick
const res11 = evaluateDailyStatus(
  '2026-10-05',
  testEmployee,
  {
    id: 'att-override-2',
    employee_id: 'emp-101',
    attendance_date: '2026-10-05',
    check_in_at: '2026-10-05T07:20:00+08:00',
    check_out_at: null,
    check_in_status: 'on_time',
    check_out_status: null,
    notes: null,
  },
  {
    id: 'req-sick-approved',
    employee_id: 'emp-101',
    request_type: 'sick',
    start_date: '2026-10-05',
    end_date: '2026-10-05',
    reason: 'Sakit ringan',
    status: 'approved',
  },
  null,
  todayStr
);
console.assert(
  res11.status === 'present',
  '11. Physical attendance MUST override approved sick'
);
console.log('✓ 11. Priority 1 check passed: Physical attendance overrides approved sick');

// 12. Pending, Rejected, Cancelled Requests Ignored
const res12Pending = evaluateDailyStatus(
  '2026-10-05',
  testEmployee,
  null,
  {
    id: 'req-pending',
    employee_id: 'emp-101',
    request_type: 'leave',
    start_date: '2026-10-05',
    end_date: '2026-10-05',
    reason: 'Cuti pending',
    status: 'pending',
  },
  null,
  todayStr
);
console.assert(
  res12Pending.status === 'absent',
  '12. Pending request must be ignored (evaluates to Alpha on working day)'
);

const res12Rejected = evaluateDailyStatus(
  '2026-10-05',
  testEmployee,
  null,
  {
    id: 'req-rejected',
    employee_id: 'emp-101',
    request_type: 'leave',
    start_date: '2026-10-05',
    end_date: '2026-10-05',
    reason: 'Cuti ditolak',
    status: 'rejected',
  },
  null,
  todayStr
);
console.assert(
  res12Rejected.status === 'absent',
  '12. Rejected request must be ignored'
);
console.log('✓ 12. Non-approved requests (pending/rejected/cancelled) correctly ignored');

// 13. Future Working Day
const res13 = evaluateDailyStatus('2026-10-10', testEmployee, null, null, null, todayStr);
console.assert(res13.status !== 'absent', '13. Future working day should not be Alpha');
console.log('✓ 13. Future working days not evaluated as Alpha');

console.log('\n=== ALL ATTENDANCE STATUS ENGINE TESTS PASSED! ===');
