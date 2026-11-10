import { describe, it, expect } from 'vitest';
import {
  evaluateDailyStatus,
  MinimalEmployee,
} from '../services/attendanceStatusService';

describe('Attendance Status Engine (Tahap 3B-1A)', () => {
  const testEmployee: MinimalEmployee = {
    id: 'emp-101',
    full_name: 'Ahmad Supardi',
    nip: '198001012005011001',
    departmentName: 'Bahasa & Seni',
  };

  const todayStr = '2026-10-05'; // Monday

  it('1. Skenario 1: Hari kerja biasa dengan presensi (Hadir - Tepat Waktu)', () => {
    const res = evaluateDailyStatus(
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
      todayStr,
      null,
      new Date('2026-10-05T08:00:00+08:00')
    );
    expect(res.status).toBe('present');
    expect(res.substatus).toBe('on_time');
    expect(res.statusLabel).toBe('Hadir');
  });

  it('2. Skenario 2: Hari kerja biasa dengan pengajuan sakit disetujui (Sakit)', () => {
    const res = evaluateDailyStatus(
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
      todayStr,
      null,
      new Date('2026-10-05T08:00:00+08:00')
    );
    expect(res.status).toBe('sick');
    expect(res.statusLabel).toBe('Sakit');
    expect(res.notes).toBe('Sakit demam tinggi');
  });

  it('3. Skenario 3: Hari kerja biasa dengan pengajuan izin disetujui (Izin)', () => {
    const res = evaluateDailyStatus(
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
      todayStr,
      null,
      new Date('2026-10-05T08:00:00+08:00')
    );
    expect(res.status).toBe('permit');
    expect(res.statusLabel).toBe('Izin');
  });

  it('4. Skenario 4: Hari kerja biasa dengan pengajuan dinas luar disetujui (Dinas Luar)', () => {
    const res = evaluateDailyStatus(
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
      todayStr,
      null,
      new Date('2026-10-05T08:00:00+08:00')
    );
    expect(res.status).toBe('official_duty');
    expect(res.statusLabel).toBe('Dinas Luar');
  });

  it('5. Skenario 5: Hari kerja biasa dengan pengajuan cuti disetujui (Cuti)', () => {
    const res = evaluateDailyStatus(
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
      todayStr,
      null,
      new Date('2026-10-05T08:00:00+08:00')
    );
    expect(res.status).toBe('leave');
    expect(res.statusLabel).toBe('Cuti');
  });

  it('6. Skenario 6: Hari kerja biasa belum presensi & masih toleransi (Pending)', () => {
    const currentTime = new Date();
    currentTime.setHours(7, 0, 0, 0);

    const res = evaluateDailyStatus(
      '2026-10-05',
      testEmployee,
      null,
      null,
      null,
      '2026-10-05',
      {
        id: 'sched-1',
        name: 'Normal Schedule',
        code: 'SCHED01',
        description: null,
        check_in_start_time: '06:30',
        check_in_on_time_end: '07:30',
        check_in_end_time: '10:00',
        work_start_time: '07:30',
        operational_end_time: '15:00',
        work_end_time: '15:30',
        check_out_start_time: '15:00',
        check_out_end_time: '17:00',
        working_days: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
        is_active: true,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
      currentTime
    );
    expect(res.status).toBe('pending');
    expect(res.statusLabel).toBe('Menunggu Presensi');
  });

  it('7. Skenario 7: Hari kerja biasa melewati batas waktu tanpa presensi (Alpha)', () => {
    const res = evaluateDailyStatus(
      '2026-10-05',
      testEmployee,
      null,
      null,
      null,
      todayStr,
      null,
      new Date('2026-10-05T15:00:00+08:00')
    );
    expect(res.status).toBe('absent');
    expect(res.statusLabel).toBe('Alpha');
    expect(res.notes).toBe('Tanpa Keterangan');
  });

  it('8. Skenario 8: Hari libur resmi dengan data presensi tetap "Libur"', () => {
    const res = evaluateDailyStatus(
      '2026-10-05',
      testEmployee,
      {
        id: 'att-stray',
        employee_id: 'emp-101',
        attendance_date: '2026-10-05',
        check_in_at: '2026-10-05T07:10:00+08:00',
        check_out_at: null,
        check_in_status: 'on_time',
        check_out_status: null,
        notes: 'Presensi di hari libur',
      },
      null,
      {
        id: 'hol-1',
        holiday_date: '2026-10-05',
        name: 'Hari Kesaktian Pancasila',
        is_active: true,
      },
      todayStr
    );
    expect(res.status).toBe('holiday');
    expect(res.statusLabel).toBe('Libur');
    expect(res.notes).toBe('Hari Kesaktian Pancasila');
  });

  it('9. Skenario 9: Hari libur resmi dengan pengajuan sakit disetujui tetap "Libur"', () => {
    const res = evaluateDailyStatus(
      '2026-10-05',
      testEmployee,
      null,
      {
        id: 'req-sick-stray',
        employee_id: 'emp-101',
        request_type: 'sick',
        start_date: '2026-10-05',
        end_date: '2026-10-05',
        reason: 'Demam',
        status: 'approved',
      },
      {
        id: 'hol-1',
        holiday_date: '2026-10-05',
        name: 'Hari Kesaktian Pancasila',
        is_active: true,
      },
      todayStr
    );
    expect(res.status).toBe('holiday');
    expect(res.statusLabel).toBe('Libur');
  });

  it('10. Skenario 10: Hari libur resmi dengan pengajuan izin/cuti disetujui tetap "Libur"', () => {
    const res = evaluateDailyStatus(
      '2026-10-05',
      testEmployee,
      null,
      {
        id: 'req-leave-stray',
        employee_id: 'emp-101',
        request_type: 'leave',
        start_date: '2026-10-05',
        end_date: '2026-10-05',
        reason: 'Cuti',
        status: 'approved',
      },
      {
        id: 'hol-1',
        holiday_date: '2026-10-05',
        name: 'Hari Kesaktian Pancasila',
        is_active: true,
      },
      todayStr
    );
    expect(res.status).toBe('holiday');
    expect(res.statusLabel).toBe('Libur');
  });

  it('11. Skenario 11: Akhir pekan dengan data presensi tetap "Libur" (Akhir Pekan)', () => {
    const res = evaluateDailyStatus(
      '2026-10-04', // Sunday
      testEmployee,
      {
        id: 'att-weekend',
        employee_id: 'emp-101',
        attendance_date: '2026-10-04',
        check_in_at: '2026-10-04T08:00:00+08:00',
        check_out_at: null,
        check_in_status: 'on_time',
        check_out_status: null,
        notes: 'Kerja minggu',
      },
      null,
      null,
      todayStr
    );
    expect(res.status).toBe('holiday');
    expect(res.notes).toBe('Akhir Pekan');
  });

  it('12. Skenario 12: Akhir pekan dengan pengajuan disetujui tetap "Libur" (Akhir Pekan)', () => {
    const res = evaluateDailyStatus(
      '2026-10-04', // Sunday
      testEmployee,
      null,
      {
        id: 'req-duty-weekend',
        employee_id: 'emp-101',
        request_type: 'official_duty',
        start_date: '2026-10-04',
        end_date: '2026-10-04',
        reason: 'Dinas luar minggu',
        status: 'approved',
      },
      null,
      todayStr
    );
    expect(res.status).toBe('holiday');
    expect(res.notes).toBe('Akhir Pekan');
  });

  it('13. Skenario 13: Hari libur resmi bertepatan dengan akhir pekan diprioritaskan sebagai 1 libur resmi', () => {
    const res = evaluateDailyStatus(
      '2026-10-04', // Sunday
      testEmployee,
      null,
      null,
      {
        id: 'hol-weekend',
        holiday_date: '2026-10-04',
        name: 'Hari Batik Nasional (Di Akhir Pekan)',
        is_active: true,
      },
      todayStr
    );
    expect(res.status).toBe('holiday');
    expect(res.source).toBe('holiday');
    expect(res.notes).toBe('Hari Batik Nasional (Di Akhir Pekan)');
  });

  it('14. Skenario 14: Hari kerja mendatang tetap status holiday dengan statusLabel "Masa Depan"', () => {
    const res = evaluateDailyStatus('2026-10-12', testEmployee, null, null, null, todayStr);
    expect(res.status).toBe('holiday');
    expect(res.statusLabel).toBe('Masa Depan');
    expect(res.notes).toBe('Jadwal Kerja Mendatang');
  });
});
