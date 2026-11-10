import { describe, it, expect } from 'vitest';
import { EvaluatedStatusResult } from '../services/attendanceStatusService';
import { formatPercentage } from '../components/employees/MonthlyStatisticsSection';

function calculateMonthlyStats(
  matrixData: EvaluatedStatusResult[],
  calendarMonth?: { month: number; year: number }
) {
  let presentOnTime = 0;
  let presentLate = 0;
  let sick = 0;
  let permit = 0;
  let officialDuty = 0;
  let leave = 0;
  let absent = 0;
  let holiday = 0;
  let effectiveWorkingDays = 0;

  const targetMonthPrefix = calendarMonth
    ? `${calendarMonth.year}-${String(calendarMonth.month + 1).padStart(2, '0')}`
    : null;

  const statsData = targetMonthPrefix
    ? matrixData.filter((item) => item.date.startsWith(targetMonthPrefix))
    : matrixData;

  statsData.forEach((item) => {
    if (item.statusLabel === 'Masa Depan') return;

    if (item.status === 'present') {
      effectiveWorkingDays++;
      if (item.substatus === 'late') {
        presentLate++;
      } else {
        presentOnTime++;
      }
    } else if (item.status === 'sick') {
      sick++;
      effectiveWorkingDays++;
    } else if (item.status === 'permit') {
      permit++;
      effectiveWorkingDays++;
    } else if (item.status === 'official_duty') {
      officialDuty++;
      effectiveWorkingDays++;
    } else if (item.status === 'leave') {
      leave++;
      effectiveWorkingDays++;
    } else if (item.status === 'absent') {
      absent++;
      effectiveWorkingDays++;
    } else if (item.status === 'pending') {
      effectiveWorkingDays++;
    } else if (item.status === 'holiday') {
      holiday++;
    }
  });

  const totalPresent = presentOnTime + presentLate;
  const totalAttendance = totalPresent + officialDuty;

  const rawPercentage =
    effectiveWorkingDays > 0 ? (totalAttendance / effectiveWorkingDays) * 100 : null;

  let percentageText = '—';
  let progressBarColor = '#D1D5DB';

  if (rawPercentage !== null) {
    percentageText = formatPercentage(rawPercentage);
    if (rawPercentage >= 75) {
      progressBarColor = '#16A34A';
    } else if (rawPercentage >= 50) {
      progressBarColor = '#F59E0B';
    } else {
      progressBarColor = '#EF4444';
    }
  }

  return {
    totalPresent,
    presentOnTime,
    presentLate,
    sick,
    permit,
    officialDuty,
    leave,
    absent,
    holiday,
    effectiveWorkingDays,
    totalAttendance,
    rawPercentage,
    percentageText,
    progressBarColor,
    totalEvaluatedDays: statsData.length,
  };
}

describe('Monthly Attendance Statistics (Tahap 3B & Resolution Finding C)', () => {
  it('0. Format Persentase Maksimal 3 Angka Signifikan', () => {
    expect(formatPercentage(100)).toBe('100%');
    expect(formatPercentage(100.0)).toBe('100%');
    expect(formatPercentage(77.34)).toBe('77.3%');
    expect(formatPercentage(77.3)).toBe('77.3%');
    expect(formatPercentage(12.456)).toBe('12.5%');
    expect(formatPercentage(9.876)).toBe('9.88%');
    expect(formatPercentage(0)).toBe('0%');
    expect(formatPercentage(null)).toBe('—');
  });
  it('1. Total Kehadiran = Hadir Fisik + Dinas Luar', () => {
    const mockData: EvaluatedStatusResult[] = [
      { date: '2026-10-01', status: 'present', substatus: 'on_time' } as EvaluatedStatusResult,
      { date: '2026-10-02', status: 'present', substatus: 'late' } as EvaluatedStatusResult,
      { date: '2026-10-05', status: 'official_duty', substatus: null } as EvaluatedStatusResult,
      { date: '2026-10-06', status: 'sick', substatus: null } as EvaluatedStatusResult,
    ];
    const res = calculateMonthlyStats(mockData);
    expect(res.totalPresent).toBe(2);
    expect(res.officialDuty).toBe(1);
    expect(res.totalAttendance).toBe(3);
    expect(res.effectiveWorkingDays).toBe(4);
  });

  it('2. Evaluasi Warna 90.9% -> Hijau (#16A34A)', () => {
    const mockData: EvaluatedStatusResult[] = [];
    for (let i = 0; i < 909; i++) {
      mockData.push({ date: `2026-10-${i}`, status: 'present', substatus: 'on_time' } as EvaluatedStatusResult);
    }
    for (let i = 0; i < 91; i++) {
      mockData.push({ date: `2026-11-${i}`, status: 'absent', substatus: null } as EvaluatedStatusResult);
    }
    const res = calculateMonthlyStats(mockData);
    expect(res.percentageText).toBe('90.9%');
    expect(res.progressBarColor).toBe('#16A34A');
  });

  it('3. Evaluasi Warna 74.9% -> Kuning (#F59E0B)', () => {
    const mockData: EvaluatedStatusResult[] = [];
    for (let i = 0; i < 749; i++) {
      mockData.push({ date: `2026-10-${i}`, status: 'present', substatus: 'on_time' } as EvaluatedStatusResult);
    }
    for (let i = 0; i < 251; i++) {
      mockData.push({ date: `2026-11-${i}`, status: 'absent', substatus: null } as EvaluatedStatusResult);
    }
    const res = calculateMonthlyStats(mockData);
    expect(res.percentageText).toBe('74.9%');
    expect(res.progressBarColor).toBe('#F59E0B');
  });

  it('4. Evaluasi Warna 50% -> Kuning (#F59E0B)', () => {
    const mockData: EvaluatedStatusResult[] = [
      { date: '2026-10-01', status: 'present', substatus: 'on_time' } as EvaluatedStatusResult,
      { date: '2026-10-02', status: 'absent', substatus: null } as EvaluatedStatusResult,
    ];
    const res = calculateMonthlyStats(mockData);
    expect(res.percentageText).toBe('50%');
    expect(res.progressBarColor).toBe('#F59E0B');
  });

  it('5. Evaluasi Warna 49.9% -> Merah (#EF4444)', () => {
    const mockData: EvaluatedStatusResult[] = [];
    for (let i = 0; i < 499; i++) {
      mockData.push({ date: `2026-10-${i}`, status: 'present', substatus: 'on_time' } as EvaluatedStatusResult);
    }
    for (let i = 0; i < 501; i++) {
      mockData.push({ date: `2026-11-${i}`, status: 'absent', substatus: null } as EvaluatedStatusResult);
    }
    const res = calculateMonthlyStats(mockData);
    expect(res.percentageText).toBe('49.9%');
    expect(res.progressBarColor).toBe('#EF4444');
  });

  it('6. Evaluasi Warna 100% -> Hijau (#16A34A)', () => {
    const mockData: EvaluatedStatusResult[] = [
      { date: '2026-10-01', status: 'present', substatus: 'on_time' } as EvaluatedStatusResult,
      { date: '2026-10-02', status: 'official_duty', substatus: null } as EvaluatedStatusResult,
    ];
    const res = calculateMonthlyStats(mockData);
    expect(res.percentageText).toBe('100%');
    expect(res.progressBarColor).toBe('#16A34A');
  });

  it('7. Hari Efektif Nol -> "—" & Warna Netral (#D1D5DB)', () => {
    const mockData: EvaluatedStatusResult[] = [
      { date: '2026-10-04', status: 'holiday', statusLabel: 'Libur' } as EvaluatedStatusResult,
    ];
    const res = calculateMonthlyStats(mockData);
    expect(res.effectiveWorkingDays).toBe(0);
    expect(res.percentageText).toBe('—');
    expect(res.progressBarColor).toBe('#D1D5DB');
  });

  it('8. Finding C Resolution: Multi-month dataset filters stats strictly by calendarMonth', () => {
    // Multi-month matrixData spanning Oct, Nov, Dec 2026
    const multiMonthData: EvaluatedStatusResult[] = [
      // Oct 2026: 2 present, 0 absent -> 100%
      { date: '2026-10-01', status: 'present', substatus: 'on_time' } as EvaluatedStatusResult,
      { date: '2026-10-02', status: 'present', substatus: 'on_time' } as EvaluatedStatusResult,
      // Nov 2026: 1 present, 1 absent -> 50%
      { date: '2026-11-01', status: 'present', substatus: 'on_time' } as EvaluatedStatusResult,
      { date: '2026-11-02', status: 'absent', substatus: null } as EvaluatedStatusResult,
      // Dec 2026: 0 present, 2 absent -> 0%
      { date: '2026-12-01', status: 'absent', substatus: null } as EvaluatedStatusResult,
      { date: '2026-12-02', status: 'absent', substatus: null } as EvaluatedStatusResult,
    ];

    // Select Nov 2026 (month: 10, year: 2026 [0-indexed 10 = Nov])
    const novStats = calculateMonthlyStats(multiMonthData, { year: 2026, month: 10 });
    expect(novStats.totalEvaluatedDays).toBe(2);
    expect(novStats.effectiveWorkingDays).toBe(2);
    expect(novStats.totalPresent).toBe(1);
    expect(novStats.absent).toBe(1);
    expect(novStats.percentageText).toBe('50%');

    // Switch calendar to Oct 2026 (month: 9, year: 2026 [0-indexed 9 = Oct])
    const octStats = calculateMonthlyStats(multiMonthData, { year: 2026, month: 9 });
    expect(octStats.totalEvaluatedDays).toBe(2);
    expect(octStats.effectiveWorkingDays).toBe(2);
    expect(octStats.totalPresent).toBe(2);
    expect(octStats.absent).toBe(0);
    expect(octStats.percentageText).toBe('100%');
  });

  it('9. Tahap 4 Concentric Ring Ratios: All 4 visual groups ring math verified', () => {
    const mockData: EvaluatedStatusResult[] = [
      { date: '2026-10-01', status: 'present', substatus: 'on_time' } as EvaluatedStatusResult,
      { date: '2026-10-02', status: 'present', substatus: 'late' } as EvaluatedStatusResult,
      { date: '2026-10-05', status: 'official_duty', substatus: null } as EvaluatedStatusResult,
      { date: '2026-10-06', status: 'sick', substatus: null } as EvaluatedStatusResult,
      { date: '2026-10-07', status: 'permit', substatus: null } as EvaluatedStatusResult,
      { date: '2026-10-08', status: 'leave', substatus: null } as EvaluatedStatusResult,
      { date: '2026-10-09', status: 'absent', substatus: null } as EvaluatedStatusResult,
      { date: '2026-10-10', status: 'holiday', statusLabel: 'Libur' } as EvaluatedStatusResult,
    ];
    const stats = calculateMonthlyStats(mockData, { year: 2026, month: 9 });
    expect(stats.effectiveWorkingDays).toBe(7);
    expect(stats.totalAttendance).toBe(3); // 1 on_time + 1 late + 1 official_duty
    
    // Group B Ratios
    const onTimeRatio = (stats.presentOnTime / stats.effectiveWorkingDays) * 100;
    const lateRatio = (stats.presentLate / stats.effectiveWorkingDays) * 100;
    const dutyRatio = (stats.officialDuty / stats.effectiveWorkingDays) * 100;
    expect(onTimeRatio).toBeCloseTo(14.28, 1);
    expect(lateRatio).toBeCloseTo(14.28, 1);
    expect(dutyRatio).toBeCloseTo(14.28, 1);

    // Group C Ratios
    const sickRatio = (stats.sick / stats.effectiveWorkingDays) * 100;
    const permitRatio = (stats.permit / stats.effectiveWorkingDays) * 100;
    const leaveRatio = (stats.leave / stats.effectiveWorkingDays) * 100;
    expect(sickRatio).toBeCloseTo(14.28, 1);
    expect(permitRatio).toBeCloseTo(14.28, 1);
    expect(leaveRatio).toBeCloseTo(14.28, 1);

    // Group D Ratio
    const absentRatio = (stats.absent / stats.effectiveWorkingDays) * 100;
    expect(absentRatio).toBeCloseTo(14.28, 1);
  });
});
