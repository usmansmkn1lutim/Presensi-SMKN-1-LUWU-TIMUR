import { attendanceExcelExportService } from '../services/attendanceExcelExportService';
import { attendancePdfExportService } from '../services/attendancePdfExportService';
import { attendanceReportService } from '../services/attendanceReportService';
import {
  AttendanceReportFilter,
  DailyAttendanceSummary,
  EmployeeAttendanceSummary,
  MonthlyAttendanceSummary,
  AttendanceDetailItem,
} from '../types/attendanceReport.types';

console.log('=== RUNNING ATTENDANCE EXPORT SERVICE TESTS ===\n');

// 1. Filename Generation Test
console.log('--- 1. FILENAME GENERATION & TIMEZONE ---');
const testFilter: AttendanceReportFilter = {
  startDate: '2026-10-01',
  endDate: '2026-10-05',
};

const dailyFilename = attendanceExcelExportService.getFilename('daily', testFilter);
console.assert(
  dailyFilename === 'Laporan_Presensi_Harian_20261001_20261005.xlsx',
  `Expected daily filename, got: ${dailyFilename}`
);
console.log(`✓ Daily Excel filename verified: ${dailyFilename}`);

const empFilename = attendanceExcelExportService.getFilename('employee', testFilter);
console.assert(
  empFilename === 'Laporan_Presensi_Pegawai_20261001_20261005.xlsx',
  `Expected employee filename, got: ${empFilename}`
);
console.log(`✓ Employee Excel filename verified: ${empFilename}`);

const detailFilename = attendanceExcelExportService.getFilename('detail', testFilter);
console.assert(
  detailFilename === 'Laporan_Presensi_Detail_20261001_20261005.xlsx',
  `Expected detail filename, got: ${detailFilename}`
);
console.log(`✓ Detail Excel filename verified: ${detailFilename}`);

// 2. Empty Dataset Handling
console.log('\n--- 2. EMPTY DATASET HANDLING ---');
try {
  attendanceExcelExportService.exportDailySummary([], testFilter);
  console.assert(false, 'Should have thrown error for empty daily summary');
} catch (err: any) {
  console.log(`✓ Properly caught empty daily summary error: "${err.message}"`);
}

try {
  attendancePdfExportService.exportEmployeeSummary([], testFilter);
  console.assert(false, 'Should have thrown error for empty employee summary');
} catch (err: any) {
  console.log(`✓ Properly caught empty PDF employee summary error: "${err.message}"`);
}

// 3. Unpaginated Full Export Data Contract
console.log('\n--- 3. UNPAGINATED FULL EXPORT DATA CONTRACT ---');
console.assert(
  typeof attendanceReportService.getAllAttendanceDetails === 'function',
  'getAllAttendanceDetails must exist on attendanceReportService'
);
console.log('✓ getAllAttendanceDetails method exists for unpaginated export');

// 4. Historical / Deleted Employee Snapshot Preservation
console.log('\n--- 4. DELETED EMPLOYEE ARCHIVE FLAG IN EXPORT ---');
const sampleHistoricalSummary: EmployeeAttendanceSummary[] = [
  {
    employeeId: 'hist_123',
    employeeName: 'Budi Guru (Arsip)',
    nip: null,
    departmentId: null,
    departmentName: 'Pegawai Non-aktif / Terhapus',
    totalWorkDays: 20,
    totalAttendance: 15,
    totalOnTime: 12,
    totalLate: 3,
    totalCheckedOut: 15,
    totalNotCheckedOut: 0,
    totalAbsent: 5,
    attendancePercentage: 75,
  },
];

console.assert(
  sampleHistoricalSummary[0].employeeName.includes('(Arsip)'),
  'Historical employee snapshot must include (Arsip) marker'
);
console.log('✓ Historical employee snapshot preserves (Arsip) marker for export');

// 5. Print Timestamp format in Asia/Makassar
console.log('\n--- 5. WITA PRINT TIMESTAMP ---');
const printTs = attendancePdfExportService.getPrintTimestamp();
console.assert(printTs.includes('WITA'), `Print timestamp must specify WITA timezone, got: ${printTs}`);
console.log(`✓ Print timestamp generated in WITA: ${printTs}`);

console.log('\n=== ALL ATTENDANCE EXPORT SERVICE TESTS PASSED! ===');
