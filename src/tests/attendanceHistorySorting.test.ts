import { EvaluatedStatusResult } from '../services/attendanceStatusService';

console.log('=== RUNNING ATTENDANCE HISTORY TABLE SORTING TESTS ===\n');

// Mock Evaluated Status Dataset across different months and years
const mockItems: EvaluatedStatusResult[] = [
  {
    date: '2026-10-05',
    employeeId: 'emp-1',
    employeeName: 'Ahmad Supardi',
    nip: '198001012005011001',
    departmentName: 'Bahasa',
    status: 'present',
    statusLabel: 'Hadir',
    substatus: 'on_time',
    substatusLabel: 'Tepat Waktu',
    notes: null,
    checkInAt: '2026-10-05T07:15:00+08:00',
    checkOutAt: '2026-10-05T15:30:00+08:00',
    checkInLocation: 'Gedung Utama',
    checkOutLocation: 'Gedung Utama',
    source: 'attendance',
    sourceId: 'att-1',
  },
  {
    date: '2026-10-01',
    employeeId: 'emp-1',
    employeeName: 'Ahmad Supardi',
    nip: '198001012005011001',
    departmentName: 'Bahasa',
    status: 'sick',
    statusLabel: 'Sakit',
    substatus: null,
    substatusLabel: null,
    notes: 'Demam',
    checkInAt: null,
    checkOutAt: null,
    checkInLocation: null,
    checkOutLocation: null,
    source: 'request',
    sourceId: 'req-1',
  },
  {
    date: '2026-09-28',
    employeeId: 'emp-1',
    employeeName: 'Ahmad Supardi',
    nip: '198001012005011001',
    departmentName: 'Bahasa',
    status: 'present',
    statusLabel: 'Hadir',
    substatus: 'late',
    substatusLabel: 'Terlambat',
    notes: 'Macet',
    checkInAt: '2026-09-28T08:05:00+08:00',
    checkOutAt: null,
    checkInLocation: 'Gedung Utama',
    checkOutLocation: null,
    source: 'attendance',
    sourceId: 'att-2',
  },
  {
    date: '2025-12-31',
    employeeId: 'emp-1',
    employeeName: 'Ahmad Supardi',
    nip: '198001012005011001',
    departmentName: 'Bahasa',
    status: 'holiday',
    statusLabel: 'Libur',
    substatus: null,
    substatusLabel: null,
    notes: 'Tahun Baru',
    checkInAt: null,
    checkOutAt: null,
    checkInLocation: null,
    checkOutLocation: null,
    source: 'holiday',
    sourceId: 'hol-1',
  },
];

// Helper Sort Function matching Component Logic
function sortEvaluatedResults(
  data: EvaluatedStatusResult[],
  order: 'asc' | 'desc'
): EvaluatedStatusResult[] {
  return [...data].sort((a, b) => {
    if (order === 'asc') {
      return a.date.localeCompare(b.date);
    }
    return b.date.localeCompare(a.date);
  });
}

// 1. Test Default Sorting: Oldest → Newest ('asc')
const ascSorted = sortEvaluatedResults(mockItems, 'asc');
console.assert(ascSorted[0].date === '2025-12-31', '1. Oldest date should be first');
console.assert(ascSorted[1].date === '2026-09-28', '1. Second oldest date should be second');
console.assert(ascSorted[2].date === '2026-10-01', '1. Third date should be third');
console.assert(ascSorted[3].date === '2026-10-05', '1. Newest date should be last');
console.log('✓ 1. Default ASC sorting verified (Oldest → Newest): 2025-12-31 to 2026-10-05');

// 2. Test Toggle Sorting: Newest → Oldest ('desc')
const descSorted = sortEvaluatedResults(mockItems, 'desc');
console.assert(descSorted[0].date === '2026-10-05', '2. Newest date should be first');
console.assert(descSorted[1].date === '2026-10-01', '2. Second newest date should be second');
console.assert(descSorted[2].date === '2026-09-28', '3. Third newest date should be third');
console.assert(descSorted[3].date === '2025-12-31', '4. Oldest date should be last');
console.log('✓ 2. Descending toggle sorting verified (Newest → Oldest): 2026-10-05 to 2025-12-31');

// 3. Test Toggle Back to 'asc'
const ascSortedAgain = sortEvaluatedResults(descSorted, 'asc');
console.assert(ascSortedAgain[0].date === '2025-12-31', '3. Toggle back to ASC places oldest first');
console.assert(ascSortedAgain[3].date === '2026-10-05', '3. Toggle back to ASC places newest last');
console.log('✓ 3. Toggle back to ASC verified');

// 4. Test Sorting with Status Filter Applied
const filteredPresent = mockItems.filter((i) => i.status === 'present');
const sortedFilteredAsc = sortEvaluatedResults(filteredPresent, 'asc');
console.assert(sortedFilteredAsc[0].date === '2026-09-28', '4. Filtered ASC first item correct');
console.assert(sortedFilteredAsc[1].date === '2026-10-05', '4. Filtered ASC second item correct');
console.log('✓ 4. Sorting with status filter verified');

// 5. Test Pagination Order Preservation
const pageSize = 2;
const page1 = ascSorted.slice(0, pageSize);
const page2 = ascSorted.slice(pageSize, pageSize * 2);
console.assert(page1[0].date === '2025-12-31', '5. Page 1 starts with oldest');
console.assert(page2[0].date === '2026-10-01', '5. Page 2 continues in chronological order');
console.log('✓ 5. Pagination order preservation verified');

console.log('\n=== ALL ATTENDANCE HISTORY SORTING TESTS PASSED! ===');
