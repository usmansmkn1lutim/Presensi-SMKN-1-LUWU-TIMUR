import { WorkScheduleModel } from '../types/workSchedule.types';
import {
  AttendanceModel,
  EvaluateCheckInResult,
  EvaluateCheckOutResult,
} from '../types/attendance.types';

// ----------------------------------------------------------------------------
// Pure Helper Utilities for Timezone & Business Rules
// ----------------------------------------------------------------------------

/**
 * Returns YYYY-MM-DD local date string for school operational date comparisons.
 */
export const getLocalDateString = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Returns lowercase English day key for matching with schedule.working_days
 */
export const getDayKeyFromDate = (date: Date): string => {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[date.getDay()];
};

/**
 * Converts "HH:mm" or "HH:mm:ss" string into total minutes from midnight.
 */
export const parseTimeToMinutes = (timeStr?: string | null): number => {
  if (!timeStr) return 0;
  const parts = timeStr.trim().split(':');
  const hours = parseInt(parts[0], 10) || 0;
  const minutes = parseInt(parts[1], 10) || 0;
  return hours * 60 + minutes;
};

/**
 * Converts a Date object into total minutes from midnight local time.
 */
export const dateToMinutes = (date: Date): number => {
  return date.getHours() * 60 + date.getMinutes();
};

/**
 * Formats Supabase or system errors into clear Indonesian messages for attendance transactions.
 */
export const formatAttendanceError = (error: unknown): string => {
  if (!error) return 'Terjadi kesalahan sistem yang tidak diketahui.';

  if (typeof error === 'string') return error;

  const err = error as { code?: string; message?: string; details?: string };
  const message = err.message || '';
  const details = err.details || '';
  const combined = `${message} ${details}`.toLowerCase();

  if (err.code === '23505' || combined.includes('attendance_employee_date_key') || combined.includes('unique')) {
    return 'Presensi masuk hari ini sudah tercatat.';
  }

  if (err.code === '42501' || combined.includes('permission denied') || combined.includes('row-level security')) {
    return 'Anda tidak memiliki izin untuk melakukan transaksi presensi.';
  }

  if (err.code === 'PGRST205' || combined.includes('pgrst205') || combined.includes('schema cache')) {
    return 'Tabel presensi belum tersedia di database atau sedang dalam pembaruan schema cache.';
  }

  if (combined.includes('failed to fetch') || combined.includes('network') || combined.includes('timeout')) {
    return 'Koneksi bermasalah. Silakan periksa jaringan internet Anda dan coba lagi.';
  }

  // Filter out internal database / SQL details if any leaked
  const isInternalLeak =
    combined.includes('security definer') ||
    combined.includes('search_path') ||
    combined.includes('plpgsql') ||
    combined.includes('syntax error') ||
    combined.includes('pg_temp') ||
    combined.includes('pg_catalog') ||
    combined.includes('stack trace') ||
    combined.includes('pgrst') ||
    combined.includes('relation "') ||
    combined.includes('function ') ||
    combined.includes('column ');

  if (message && !isInternalLeak) {
    return message;
  }

  return 'Gagal memproses data presensi. Silakan coba lagi.';
};

// ----------------------------------------------------------------------------
// Pure Business Rules Evaluation Functions
// ----------------------------------------------------------------------------

/**
 * Evaluates whether check-in is allowed at current time based on active work schedule.
 */
export const evaluateCheckIn = (
  currentTime: Date,
  schedule: WorkScheduleModel
): EvaluateCheckInResult => {
  // 1. Working Day Check (Monday - Friday)
  const dayKey = getDayKeyFromDate(currentTime);
  const workingDays = schedule.working_days || [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
  ];

  if (!workingDays.includes(dayKey) || dayKey === 'saturday' || dayKey === 'sunday') {
    return {
      allowed: false,
      status: null,
      reason: 'Hari ini bukan hari kerja.',
    };
  }

  // 2. Time Window Check
  const currentMins = dateToMinutes(currentTime);
  const startMins = parseTimeToMinutes(schedule.check_in_start_time); // e.g. 06:30 -> 390
  const onTimeEndMins = parseTimeToMinutes(schedule.check_in_on_time_end); // e.g. 07:30 -> 450
  const endMins = parseTimeToMinutes(schedule.check_in_end_time); // e.g. 10:00 -> 600

  if (currentMins < startMins) {
    return {
      allowed: false,
      status: null,
      reason: 'Check-in belum dibuka.',
    };
  }

  if (currentMins >= startMins && currentMins <= onTimeEndMins) {
    return {
      allowed: true,
      status: 'on_time',
    };
  }

  if (currentMins > onTimeEndMins && currentMins <= endMins) {
    return {
      allowed: true,
      status: 'late',
    };
  }

  return {
    allowed: false,
    status: null,
    reason: 'Waktu check-in telah berakhir.',
  };
};

/**
 * Evaluates whether check-out is allowed at current time based on active work schedule and existing check-in.
 */
export const evaluateCheckOut = (
  currentTime: Date,
  schedule: WorkScheduleModel,
  existingAttendance: AttendanceModel | null
): EvaluateCheckOutResult => {
  // 1. Must have an existing check-in record
  if (!existingAttendance || !existingAttendance.check_in_at) {
    return {
      allowed: false,
      status: null,
      reason: 'Anda belum melakukan presensi masuk hari ini.',
    };
  }

  // 2. Must not have checked out already today
  if (existingAttendance.check_out_at) {
    return {
      allowed: false,
      status: null,
      reason: 'Presensi pulang hari ini sudah tercatat.',
    };
  }

  // 3. Time Window Check
  const currentMins = dateToMinutes(currentTime);
  const startMins = parseTimeToMinutes(
    schedule.check_out_start_time || schedule.operational_end_time
  ); // e.g. 15:00 -> 900
  const officialWorkEndMins = parseTimeToMinutes(schedule.work_end_time); // e.g. 15:30 -> 930
  const endMins = parseTimeToMinutes(schedule.check_out_end_time); // e.g. 17:00 -> 1020

  if (currentMins < startMins) {
    return {
      allowed: false,
      status: null,
      reason: 'Check-out belum dibuka.',
    };
  }

  // Operational Departure Window (15:00 - 15:30)
  if (currentMins >= startMins && currentMins <= officialWorkEndMins) {
    return {
      allowed: true,
      status: 'operational',
    };
  }

  // After Official Work Hours Window (15:31 - 17:00)
  if (currentMins > officialWorkEndMins && currentMins <= endMins) {
    return {
      allowed: true,
      status: 'after_work',
    };
  }

  return {
    allowed: false,
    status: null,
    reason: 'Waktu check-out telah berakhir.',
  };
};
