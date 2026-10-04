import { supabase } from '../lib/supabase';
import { EmployeeRow } from '../types/database.types';
import { WorkScheduleModel } from '../types/workSchedule.types';
import { LocationModel } from '../types/location.types';
import {
  AttendanceModel,
  EvaluateCheckInResult,
  EvaluateCheckOutResult,
  CheckInPayload,
  CheckOutPayload,
} from '../types/attendance.types';
import { workScheduleService } from './workScheduleService';
import { locationService } from './locationService';
import {
  getLocalDateString,
  evaluateCheckIn,
  evaluateCheckOut,
  formatAttendanceError,
} from './attendanceBusinessRules';

export {
  getLocalDateString,
  getDayKeyFromDate,
  parseTimeToMinutes,
  dateToMinutes,
  formatAttendanceError,
  evaluateCheckIn,
  evaluateCheckOut,
} from './attendanceBusinessRules';

// ----------------------------------------------------------------------------
// Personal Attendance Service Implementation
// ----------------------------------------------------------------------------

export const attendanceService = {
  /**
   * Resolves the active employee record associated with the authenticated user profile.
   *
   * Personal attendance eligibility is determined STRICTLY by employee record linkage:
   *   authenticated user (auth.uid()) -> profiles.id -> employees.profile_id
   *
   * Applies identically across all roles (super_admin, admin, headmaster, employee).
   * NO fallback to unlinked employees, arbitrary active employees, or role-based auto-linking.
   */
  async getCurrentEmployee(): Promise<EmployeeRow> {
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      throw new Error('Sesi telah berakhir. Silakan login kembali.');
    }

    // Direct, strict lookup: employees.profile_id = user.id
    const { data: employee, error: employeeError } = await supabase
      .from('employees')
      .select('*')
      .eq('profile_id', user.id)
      .maybeSingle();

    if (employeeError) {
      console.error('Error fetching employee record:', employeeError);
      throw new Error(formatAttendanceError(employeeError));
    }

    if (!employee) {
      throw new Error('Akun Anda belum terhubung dengan data pegawai.');
    }

    if (employee.status !== 'active') {
      throw new Error('Akun pegawai Anda sedang tidak aktif.');
    }

    return employee as EmployeeRow;
  },

  /**
   * Fetches the single active school work schedule.
   */
  async getActiveWorkSchedule(): Promise<WorkScheduleModel> {
    const sched = await workScheduleService.getActiveWorkSchedule();
    if (!sched) {
      throw new Error('Jadwal kerja sekolah belum dikonfigurasi atau sedang tidak aktif.');
    }
    return sched;
  },

  /**
   * Fetches the primary active attendance location.
   */
  async getActiveAttendanceLocation(): Promise<LocationModel> {
    const locs = await locationService.getActiveLocations();
    const primary = locs.find((l) => l.isAttendanceEnabled) || locs[0];
    if (!primary) {
      throw new Error('Lokasi presensi sekolah belum dikonfigurasi atau sedang tidak aktif.');
    }
    return primary;
  },

  /**
   * Fetches today's attendance record for the authenticated employee.
   */
  async getTodayAttendance(): Promise<AttendanceModel | null> {
    const employee = await this.getCurrentEmployee();
    const todayStr = getLocalDateString(new Date());

    const { data, error } = await supabase
      .from('attendance')
      .select('*')
      .eq('employee_id', employee.id)
      .eq('attendance_date', todayStr)
      .maybeSingle();

    if (error) {
      if ((error as any).code === 'PGRST205' || (error as any).message?.includes('schema cache')) {
        return null;
      }
      console.error("Error fetching today's attendance:", error);
      throw new Error(formatAttendanceError(error));
    }

    return (data as AttendanceModel) || null;
  },

  /**
   * Evaluates check-in eligibility given the current time and active work schedule.
   */
  evaluateCheckIn(now: Date, schedule: WorkScheduleModel | null): EvaluateCheckInResult {
    if (!schedule) {
      return {
        allowed: false,
        status: null,
        reason: 'Jadwal kerja belum dikonfigurasi.',
      };
    }
    return evaluateCheckIn(now, schedule);
  },

  /**
   * Evaluates check-out eligibility given the current time, schedule, and today's attendance record.
   */
  evaluateCheckOut(
    now: Date,
    schedule: WorkScheduleModel | null,
    todayAttendance: AttendanceModel | null
  ): EvaluateCheckOutResult {
    if (!schedule) {
      return {
        allowed: false,
        status: null,
        reason: 'Jadwal kerja belum dikonfigurasi.',
      };
    }
    return evaluateCheckOut(now, schedule, todayAttendance);
  },

  /**
   * Submits a Check-In record for the authenticated employee.
   */
  async checkIn(payload: CheckInPayload): Promise<AttendanceModel> {
    const employee = await this.getCurrentEmployee();
    const schedule = await this.getActiveWorkSchedule();
    const location = await this.getActiveAttendanceLocation();

    const now = new Date();
    const todayStr = getLocalDateString(now);

    // 1. Re-evaluate check-in rules server-side
    const evalResult = this.evaluateCheckIn(now, schedule);
    if (!evalResult.allowed) {
      throw new Error(evalResult.reason);
    }

    // 2. Check if check-in already recorded today
    const existing = await this.getTodayAttendance();
    if (existing && existing.check_in_at) {
      throw new Error('Anda sudah melakukan presensi masuk hari ini.');
    }

    // 3. Insert or update attendance record
    const recordPayload = {
      employee_id: employee.id,
      attendance_date: todayStr,
      check_in_at: now.toISOString(),
      check_in_status: evalResult.status,
      check_in_location_id: location.id,
      check_in_latitude: payload.latitude ?? null,
      check_in_longitude: payload.longitude ?? null,
      notes: payload.notes ? payload.notes.trim() : null,
    };

    const { data, error } = await supabase
      .from('attendance')
      .upsert(recordPayload, { onConflict: 'employee_id,attendance_date' })
      .select()
      .single();

    if (error) {
      console.error('Error recording check-in:', error);
      throw new Error(formatAttendanceError(error));
    }

    return data as AttendanceModel;
  },

  /**
   * Submits a Check-Out record for the authenticated employee.
   */
  async checkOut(payload: CheckOutPayload): Promise<AttendanceModel> {
    const employee = await this.getCurrentEmployee();
    const schedule = await this.getActiveWorkSchedule();
    const location = await this.getActiveAttendanceLocation();

    const now = new Date();

    // 1. Re-evaluate check-out rules server-side
    const existing = await this.getTodayAttendance();
    const evalResult = this.evaluateCheckOut(now, schedule, existing);

    if (!evalResult.allowed) {
      throw new Error(evalResult.reason);
    }

    if (!existing || !existing.id) {
      throw new Error('Catatan presensi masuk tidak ditemukan.');
    }

    // 2. Update existing attendance record
    const updatePayload = {
      check_out_at: now.toISOString(),
      check_out_status: evalResult.status,
      check_out_location_id: location.id,
      check_out_latitude: payload.latitude ?? null,
      check_out_longitude: payload.longitude ?? null,
      notes: payload.notes ? payload.notes.trim() : existing.notes,
    };

    const { data, error } = await supabase
      .from('attendance')
      .update(updatePayload)
      .eq('id', existing.id)
      .select()
      .single();

    if (error) {
      console.error('Error recording check-out:', error);
      throw new Error(formatAttendanceError(error));
    }

    return data as AttendanceModel;
  },
};
