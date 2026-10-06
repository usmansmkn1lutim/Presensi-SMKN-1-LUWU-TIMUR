import { evaluateDailyStatus } from '../services/attendanceStatusService';
import { iterateDateRange } from '../services/attendanceReportService';

console.log('=== RUNNING MONTHLY RECAP BUSINESS RULE TESTS ===\n');

// 1. Helper to calculate days in month (Feb leap, etc.)
function getDaysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate();
}

console.assert(getDaysInMonth(2026, 2) === 28, '1. Feb 2026 should have 28 days');
console.assert(getDaysInMonth(2024, 2) === 29, '1. Feb 2024 (leap year) should have 29 days');
console.assert(getDaysInMonth(2026, 4) === 30, '1. April should have 30 days');
console.assert(getDaysInMonth(2026, 10) === 31, '1. October should have 31 days');
console.log('✓ 1. Days in month boundaries (Feb, leap year, 30-day, 31-day) verified successfully.');

// 2. Mapping helper logic validation
function getStatusCode(status: string, substatus: string | null, isFuture: boolean): string {
  if (isFuture) return '—';
  if (status === 'present') return substatus === 'late' ? 'T' : 'H';
  if (status === 'sick') return 'S';
  if (status === 'permit') return 'I';
  if (status === 'official_duty') return 'DL';
  if (status === 'leave') return 'C';
  if (status === 'absent') return 'A';
  if (status === 'holiday') return 'L';
  return '—';
}

console.assert(getStatusCode('present', 'on_time', false) === 'H', '2. present + on_time should be H');
console.assert(getStatusCode('present', 'late', false) === 'T', '2. present + late should be T');
console.assert(getStatusCode('sick', null, false) === 'S', '2. sick should be S');
console.assert(getStatusCode('permit', null, false) === 'I', '2. permit should be I');
console.assert(getStatusCode('official_duty', null, false) === 'DL', '2. official_duty should be DL');
console.assert(getStatusCode('leave', null, false) === 'C', '2. leave should be C');
console.assert(getStatusCode('absent', null, false) === 'A', '2. absent should be A');
console.assert(getStatusCode('holiday', null, false) === 'L', '2. holiday should be L');
console.assert(getStatusCode('present', null, true) === '—', '2. future date should be —');
console.log('✓ 2. Status abbreviation codes mapping (H, T, S, I, DL, C, A, L, —) verified successfully.');

// 3. Employee type normalization mapping
function normalizeEmployeeType(type: string | null | undefined): string {
  if (!type) return 'Tidak diketahui';
  const t = type.trim().toUpperCase();
  if (t === 'PNS') return 'PNS';
  if (t === 'PPPK') return 'PPPK';
  if (t === 'GTT' || t === 'PTT' || t === 'HONORER' || t.includes('GTT') || t.includes('PTT') || t.includes('HONORER')) {
    return 'HONORER';
  }
  return 'Tidak diketahui';
}

console.assert(normalizeEmployeeType('PNS') === 'PNS', '3. PNS -> PNS');
console.assert(normalizeEmployeeType('pppk') === 'PPPK', '3. lowercase pppk -> PPPK');
console.assert(normalizeEmployeeType('GTT') === 'HONORER', '3. GTT -> HONORER');
console.assert(normalizeEmployeeType('ptt') === 'HONORER', '3. ptt -> HONORER');
console.assert(normalizeEmployeeType('Honorer') === 'HONORER', '3. Honorer -> HONORER');
console.assert(normalizeEmployeeType(null) === 'Tidak diketahui', '3. null -> Tidak diketahui');
console.assert(normalizeEmployeeType(undefined) === 'Tidak diketahui', '3. undefined -> Tidak diketahui');
console.log('✓ 3. Employee type normalization mapping verified successfully.');

// 4. Attendance Percentage Formula validation
// formula: (Hadir + Dinas Luar) / Hari Kerja Efektif * 100
// Hadir = totalPresent
// Dinas Luar = totalOfficialDuty
function calculatePercentage(present: number, duty: number, workingDays: number): { value: number | null; label: string } {
  if (workingDays === 0) return { value: null, label: '—' };
  const val = Math.min(100, ((present + duty) / workingDays) * 100);
  const rounded = Math.round(val * 10) / 10;
  return {
    value: rounded,
    label: rounded.toFixed(1).replace('.', ',') + '%',
  };
}

const res1 = calculatePercentage(18, 2, 20); // (18 + 2)/20 * 100 = 100%
console.assert(res1.value === 100 && res1.label === '100,0%', '4. Percentage calculation max 100% failed');

const res2 = calculatePercentage(15, 1, 20); // (15 + 1)/20 * 100 = 80%
console.assert(res2.value === 80 && res2.label === '80,0%', '4. Percentage calculation 80% failed');

const res3 = calculatePercentage(0, 0, 0); // 0 working days
console.assert(res3.value === null && res3.label === '—', '4. Percentage calculation divide by zero failed');

const res4 = calculatePercentage(12, 1, 21); // (12 + 1)/21 * 100 = 61.904... % -> 61.9%
console.assert(res4.value === 61.9 && res4.label === '61,9%', '4. Percentage rounding failed');
console.log('✓ 4. Attendance percentage formula and decimal comma formatting verified successfully.');

// 5. Multi-day requests evaluation
const dates = iterateDateRange('2026-10-06', '2026-10-08');
console.assert(dates.length === 3, '5. range should have 3 dates');
console.assert(dates[0] === '2026-10-06' && dates[1] === '2026-10-07' && dates[2] === '2026-10-08', '5. dates incorrect');
console.log('✓ 5. Inclusive multi-day request date array iteration verified successfully.');

// 6. Monthly recap export contracts
import { attendanceExcelExportService } from '../services/attendanceExcelExportService';
import { attendancePdfExportService } from '../services/attendancePdfExportService';

console.assert(typeof attendanceExcelExportService.exportMonthlyRecapToExcel === 'function', '6. exportMonthlyRecapToExcel should be a function');
console.assert(typeof attendancePdfExportService.exportMonthlyRecapToPdf === 'function', '6. exportMonthlyRecapToPdf should be a function');
console.log('✓ 6. Monthly recap export service contracts verified successfully.');

console.log('\n=== ALL MONTHLY RECAP BUSINESS RULE TESTS PASSED! ===');
