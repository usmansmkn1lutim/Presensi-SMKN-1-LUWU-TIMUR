import {
  getMakassarTodayDateString,
  getMakassarFirstDayOfMonthString,
  formatMakassarTime,
  formatMakassarShortDate,
  getDayNameIndonesian,
  getMonthLabelIndonesian,
  iterateDateRange,
  attendanceReportService,
} from '../services/attendanceReportService';
import { AttendanceReportFilter } from '../types/attendanceReport.types';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

console.log('=== RUNNING ATTENDANCE REPORT SERVICE & TIMEZONE TESTS ===');

// 1. Test Date Range Iteration (Inclusive, No UTC Shift)
console.log('--- 1. DATE RANGE ITERATION ---');
const dateList = iterateDateRange('2026-10-01', '2026-10-05');
assert(dateList.length === 5, 'Date range 2026-10-01 to 2026-10-05 must have exactly 5 days');
assert(dateList[0] === '2026-10-01', 'First day must be 2026-10-01');
assert(dateList[1] === '2026-10-02', 'Second day must be 2026-10-02');
assert(dateList[2] === '2026-10-03', 'Third day must be 2026-10-03');
assert(dateList[3] === '2026-10-04', 'Fourth day must be 2026-10-04');
assert(dateList[4] === '2026-10-05', 'Fifth day must be 2026-10-05');
console.log('✓ Inclusive date range iteration passed without date shifts');

// Single day range
const singleDateList = iterateDateRange('2026-10-01', '2026-10-01');
assert(singleDateList.length === 1 && singleDateList[0] === '2026-10-01', 'Single date range must yield exactly 1 day');
console.log('✓ Single date range passed');

// 2. Test Timezone Asia/Makassar Formatting
console.log('--- 2. TIMEZONE & LOCALE FORMATTING ---');
const todayStr = getMakassarTodayDateString();
assert(/^\d{4}-\d{2}-\d{2}$/.test(todayStr), 'Makassar today date must match YYYY-MM-DD format');
console.log(`✓ Makassar today string verified: ${todayStr}`);

const firstDay = getMakassarFirstDayOfMonthString();
assert(firstDay.endsWith('-01'), 'First day of month must end with -01');
console.log(`✓ Makassar first day of month: ${firstDay}`);

// Test UTC to Makassar Time (UTC+8)
// 2026-10-05T00:30:00.000Z in UTC is 08:30 in Makassar (UTC+8)
const formattedTime = formatMakassarTime('2026-10-05T00:30:00.000Z');
assert(formattedTime === '08.30' || formattedTime === '08:30', `Expected 08.30 or 08:30, got ${formattedTime}`);
console.log(`✓ Makassar timestamp conversion verified: 00:30 UTC -> ${formattedTime} WITA`);

// Null / invalid timestamp handling
assert(formatMakassarTime(null) === '-', 'Null timestamp must return dash');
assert(formatMakassarTime(undefined) === '-', 'Undefined timestamp must return dash');
console.log('✓ Safe null timestamp handling verified');

// 3. Test Working Days Calculation (excludes Sat, Sun, Holidays)
console.log('--- 3. WORKING DAYS CALCULATION ---');
// 2026-10-01 is Thursday
// 2026-10-02 is Friday
// 2026-10-03 is Saturday
// 2026-10-04 is Sunday
// 2026-10-05 is Monday
// Total working days = 3 (Thu, Fri, Mon)
const holidaySet = new Set<string>();
holidaySet.add('2026-10-02'); // Friday is a holiday
const workDaysWithHoliday = attendanceReportService.calculateWorkingDays('2026-10-01', '2026-10-05', holidaySet);
assert(workDaysWithHoliday === 2, `Expected 2 working days (Thu & Mon), got ${workDaysWithHoliday}`);
console.log('✓ Working days calculation correctly excludes weekends and designated holidays');

// 4. Test Indonesian Day and Month Labels
console.log('--- 4. INDONESIAN LABELS ---');
const dayName = getDayNameIndonesian('2026-10-05');
assert(dayName.toLowerCase() === 'senin', `Expected Senin for 2026-10-05, got ${dayName}`);
console.log(`✓ Day name: ${dayName}`);

const monthLabel = getMonthLabelIndonesian('2026-10');
assert(monthLabel.toLowerCase().includes('oktober'), `Expected Oktober 2026, got ${monthLabel}`);
console.log(`✓ Month label: ${monthLabel}`);

console.log('=== ALL ATTENDANCE REPORT SERVICE TESTS PASSED! ===');
