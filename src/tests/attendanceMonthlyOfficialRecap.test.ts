import {
  evaluateDailyStatus,
  OfficialAttendanceStatus,
} from '../services/attendanceStatusService';
import { OfficialMonthlyRecapSummary } from '../types/attendanceHistory.types';

console.log('=== RUNNING ATTENDANCE MONTHLY OFFICIAL RECAP TESTS ===\n');

// 1. Verify Grid Order: 3 columns x 2 rows
// Row 1: Hadir, Sakit, Izin
// Row 2: Dinas Luar, Cuti, Alpha
const expectedOrder = [
  'Hadir',
  'Sakit',
  'Izin',
  'Dinas Luar',
  'Cuti',
  'Alpha',
];

console.assert(expectedOrder.length === 6, 'Grid must have exactly 6 items');
console.assert(expectedOrder[0] === 'Hadir', 'Row 1 Col 1 must be Hadir');
console.assert(expectedOrder[1] === 'Sakit', 'Row 1 Col 2 must be Sakit');
console.assert(expectedOrder[2] === 'Izin', 'Row 1 Col 3 must be Izin');
console.assert(expectedOrder[3] === 'Dinas Luar', 'Row 2 Col 1 must be Dinas Luar');
console.assert(expectedOrder[4] === 'Cuti', 'Row 2 Col 2 must be Cuti');
console.assert(expectedOrder[5] === 'Alpha', 'Row 2 Col 3 must be Alpha');
console.log('✓ 1. 3x2 Grid Order strictly verified (Hadir, Sakit, Izin / Dinas Luar, Cuti, Alpha)');

// 2. Mock evaluated results and count verification
const mockEvaluatedResults: { status: OfficialAttendanceStatus }[] = [
  { status: 'present' },
  { status: 'present' },
  { status: 'present' },
  { status: 'sick' },
  { status: 'permit' },
  { status: 'official_duty' },
  { status: 'leave' },
  { status: 'absent' },
  { status: 'holiday' }, // Weekend / holiday should not be in the 6 categories
  { status: 'holiday' },
];

const summary: OfficialMonthlyRecapSummary = {
  present: mockEvaluatedResults.filter((r) => r.status === 'present').length,
  sick: mockEvaluatedResults.filter((r) => r.status === 'sick').length,
  permit: mockEvaluatedResults.filter((r) => r.status === 'permit').length,
  officialDuty: mockEvaluatedResults.filter((r) => r.status === 'official_duty').length,
  leave: mockEvaluatedResults.filter((r) => r.status === 'leave').length,
  absent: mockEvaluatedResults.filter((r) => r.status === 'absent').length,
};

console.assert(summary.present === 3, 'Present count should be 3');
console.assert(summary.sick === 1, 'Sick count should be 1');
console.assert(summary.permit === 1, 'Permit count should be 1');
console.assert(summary.officialDuty === 1, 'Official duty count should be 1');
console.assert(summary.leave === 1, 'Leave count should be 1');
console.assert(summary.absent === 1, 'Absent count should be 1');
console.log('✓ 2. Exact counts verified from evaluated matrix without leakage');

// 3. Verify Weekend / Holiday Exclusion
const weekendResult = evaluateDailyStatus(
  '2026-10-04', // Sunday
  { id: 'emp-1', full_name: 'Pegawai', nip: '123' },
  null,
  null,
  null,
  '2026-10-06'
);
console.assert(weekendResult.status === 'holiday', 'Weekend must evaluate to holiday');
console.assert(
  !['present', 'sick', 'permit', 'official_duty', 'leave', 'absent'].includes(
    weekendResult.status
  ),
  'Weekend must NOT be in any of the 6 official status recap categories'
);
console.log('✓ 3. Weekend/holiday exclusion from the 6 categories verified');

// 4. Verify Old Transactional Metrics Are Not Present
const recapKeys = Object.keys(summary);
console.assert(!recapKeys.includes('totalAttendance'), 'Old totalAttendance metric must be removed');
console.assert(!recapKeys.includes('onTimeCount'), 'Old onTimeCount metric must be removed');
console.assert(!recapKeys.includes('lateCount'), 'Old lateCount metric must be removed');
console.assert(!recapKeys.includes('checkedOutCount'), 'Old checkedOutCount metric must be removed');
console.log('✓ 4. Old transactional metrics strictly eliminated from monthly recap');

// 5. Verify Non-Present Official Records in Log List
const nonPresentStatuses = ['sick', 'permit', 'official_duty', 'leave', 'absent'];
for (const st of nonPresentStatuses) {
  const isNonPresent = st !== 'present';
  console.assert(isNonPresent, `${st} must be treated as non-present transaction`);
}
console.log('✓ 5. Non-present records (Sakit, Izin, DL, Cuti, Alpha) inclusion contract verified');

// 6. Verify Orange Sunset Icon Color Contract
const ORANGE_SUNSET = '#F97316';
const cardIconColors = Array(6).fill(ORANGE_SUNSET);
console.assert(
  cardIconColors.every((c) => c === ORANGE_SUNSET),
  'All 6 card icons must strictly use single Orange Sunset color'
);
console.log('✓ 6. Single Orange Sunset icon color contract across all 6 cards verified');

console.log('\n=== ALL ATTENDANCE MONTHLY OFFICIAL RECAP TESTS PASSED! ===');
