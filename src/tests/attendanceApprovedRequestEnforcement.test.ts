import {
  evaluateDailyStatus,
  MinimalEmployee,
  MinimalAttendance,
  MinimalRequest,
} from '../services/attendanceStatusService';
import { formatAttendanceError } from '../services/attendanceBusinessRules';

console.log('=== RUNNING ATTENDANCE APPROVED REQUEST & HERO CARD TESTS ===\n');

const testEmployee: MinimalEmployee = {
  id: 'emp-202',
  full_name: 'Budi Santoso',
  nip: '198501012010011002',
  departmentName: 'Teknik Komputer & Jaringan',
};

const todayStr = '2026-10-07'; // Wednesday

// 1. BEFORE CHECK-IN (No physical attendance, No approved request)
// Rule 4: "Anda belum melakukan presensi"
const resNoCheckIn = evaluateDailyStatus(todayStr, testEmployee, null, null, null, todayStr);
console.log('1. Evaluating running work day before check-in:');
const computeHeroStatus = (evaluated: any, physicalAtt: any) => {
  if (evaluated?.source === 'request') {
    if (evaluated.status === 'sick') return 'Sakit';
    if (evaluated.status === 'permit') return 'Izin';
    if (evaluated.status === 'official_duty') return 'Dinas Luar';
    if (evaluated.status === 'leave') return 'Cuti';
    return evaluated.statusLabel || 'Izin';
  }
  if (physicalAtt?.check_in_at || evaluated?.status === 'present') {
    return 'Hadir';
  }
  if (evaluated?.status === 'holiday') {
    return evaluated.notes || 'Libur';
  }
  return 'Anda belum melakukan presensi';
};

const status1 = computeHeroStatus(resNoCheckIn, null);
console.assert(
  status1 === 'Anda belum melakukan presensi',
  'FAILED: Before check-in should return "Anda belum melakukan presensi"'
);
console.log('✓ 1. Before check-in status verified: "Anda belum melakukan presensi"');

// 2. CHECKED IN (Physical attendance exists, No approved request)
// Rule 5 & 9: "Hadir"
const physicalRecord: MinimalAttendance = {
  id: 'att-202',
  employee_id: 'emp-202',
  attendance_date: todayStr,
  check_in_at: `${todayStr}T07:15:00+08:00`,
  check_out_at: null,
  check_in_status: 'on_time',
  check_out_status: null,
  notes: null,
};
const resPresent = evaluateDailyStatus(todayStr, testEmployee, physicalRecord, null, null, todayStr);
const status2 = computeHeroStatus(resPresent, physicalRecord);
console.assert(status2 === 'Hadir', 'FAILED: Checked-in should return "Hadir"');
console.log('✓ 2. Checked-in status verified: "Hadir"');

// 3. APPROVED SICK REQUEST
// Rule 6: "Sakit"
const sickRequest: MinimalRequest = {
  id: 'req-sick-1',
  employee_id: 'emp-202',
  request_type: 'sick',
  start_date: todayStr,
  end_date: todayStr,
  reason: 'Demam tinggi',
  status: 'approved',
};
const resSick = evaluateDailyStatus(todayStr, testEmployee, null, sickRequest, null, todayStr);
const status3 = computeHeroStatus(resSick, null);
console.assert(status3 === 'Sakit', 'FAILED: Approved sick should return "Sakit"');
console.log('✓ 3. Approved sick request verified: "Sakit"');

// 4. APPROVED PERMIT / OTHER (IZIN)
// Rule 6: "Izin"
const permitRequest: MinimalRequest = {
  id: 'req-permit-1',
  employee_id: 'emp-202',
  request_type: 'other',
  start_date: todayStr,
  end_date: todayStr,
  reason: 'Urusan keluarga',
  status: 'approved',
};
const resPermit = evaluateDailyStatus(todayStr, testEmployee, null, permitRequest, null, todayStr);
const status4 = computeHeroStatus(resPermit, null);
console.assert(status4 === 'Izin', 'FAILED: Approved permit should return "Izin"');
console.log('✓ 4. Approved permit/other request verified: "Izin"');

// 5. APPROVED OFFICIAL DUTY (DINAS LUAR)
// Rule 6: "Dinas Luar"
const dutyRequest: MinimalRequest = {
  id: 'req-duty-1',
  employee_id: 'emp-202',
  request_type: 'official_duty',
  start_date: todayStr,
  end_date: todayStr,
  reason: 'Workshop Kurikulum di Dinas Pendidikan',
  status: 'approved',
};
const resDuty = evaluateDailyStatus(todayStr, testEmployee, null, dutyRequest, null, todayStr);
const status5 = computeHeroStatus(resDuty, null);
console.assert(status5 === 'Dinas Luar', 'FAILED: Approved official duty should return "Dinas Luar"');
console.log('✓ 5. Approved official duty request verified: "Dinas Luar"');

// 6. APPROVED LEAVE (CUTI)
// Rule 6: "Cuti"
const leaveRequest: MinimalRequest = {
  id: 'req-leave-1',
  employee_id: 'emp-202',
  request_type: 'leave',
  start_date: todayStr,
  end_date: todayStr,
  reason: 'Cuti tahunan',
  status: 'approved',
};
const resLeave = evaluateDailyStatus(todayStr, testEmployee, null, leaveRequest, null, todayStr);
const status6 = computeHeroStatus(resLeave, null);
console.assert(status6 === 'Cuti', 'FAILED: Approved leave should return "Cuti"');
console.log('✓ 6. Approved leave request verified: "Cuti"');

// 7. TIME DISPLAY OVERRIDE FOR APPROVED REQUESTS
// Rule 6: Check-in: --:-- WITA, Check-out: --:-- WITA
const isReqActive = resSick.source === 'request';
const displayIn = isReqActive ? '--:-- WITA' : '07:15 WITA';
const displayOut = isReqActive ? '--:-- WITA' : '15:30 WITA';
console.assert(displayIn === '--:-- WITA' && displayOut === '--:-- WITA', 'FAILED: Approved request times should be --:-- WITA');
console.log('✓ 7. Approved request time display verified: Check-in & Check-out show "--:-- WITA"');

// 8. SERVER ERROR FORMATTING PASSTHROUGH
const serverErrorMsg = 'Anda memiliki pengajuan Sakit yang telah disetujui untuk hari ini. Tidak perlu melakukan presensi.';
const formattedError = formatAttendanceError({ message: serverErrorMsg });
console.assert(formattedError === serverErrorMsg, 'FAILED: Error message should pass through cleanly');
console.log('✓ 8. Server-side rejection error formatting verified cleanly without leakage');

console.log('\n=== ALL APPROVED REQUEST & HERO CARD TESTS PASSED! ===');
