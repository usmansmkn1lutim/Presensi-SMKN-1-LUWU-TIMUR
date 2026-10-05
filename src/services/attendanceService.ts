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
  CheckInRpcResult,
  CheckOutRpcResult,
} from '../types/attendance.types';
import { workScheduleService } from './workScheduleService';
import { locationService } from './locationService';
import {
  findLocalAttendance,
  saveLocalAttendance,
} from './attendanceStorage';
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
   * STRICT: Only returns a location that is active and attendance-enabled.
   * Never falls back to non-attendance enabled locations.
   */
  async getActiveAttendanceLocation(): Promise<LocationModel> {
    const locs = await locationService.getActiveAttendanceLocations();
    const primary = locs.find((l) => l.isActive && l.isAttendanceEnabled);
    if (!primary) {
      throw new Error('Belum ada titik presensi yang aktif. Silakan hubungi administrator sekolah.');
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
        return findLocalAttendance(employee.id, todayStr);
      }
      console.error("Error fetching today's attendance:", error);
      throw new Error(formatAttendanceError(error));
    }

    if (data) {
      saveLocalAttendance(data as AttendanceModel);
      return data as AttendanceModel;
    }

    return findLocalAttendance(employee.id, todayStr);
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
   * Submits a Check-In record for the authenticated employee via secure Supabase RPC.
   * Server RPC enforces employee validation, schedule, holiday, radius, and time calculations.
   */
  async checkIn(payload: CheckInPayload): Promise<AttendanceModel> {
    const latitude = payload.latitude ?? null;
    const longitude = payload.longitude ?? null;

    if (latitude === null || longitude === null) {
      throw new Error('Koordinat lokasi tidak valid. Pastikan GPS perangkat Anda aktif.');
    }

    const { data, error } = await supabase.rpc('check_in', {
      user_latitude: latitude,
      user_longitude: longitude,
    });

    if (error) {
      console.error('Error executing check_in RPC:', error);
      throw new Error(formatAttendanceError(error));
    }

    const rpcResult = (Array.isArray(data) ? data[0] : data) as CheckInRpcResult;
    if (!rpcResult || !rpcResult.attendance_id) {
      throw new Error('Respons presensi masuk tidak valid.');
    }

    const mappedRecord: AttendanceModel = {
      id: rpcResult.attendance_id,
      employee_id: rpcResult.employee_id || '',
      attendance_date: rpcResult.attendance_date,
      check_in_at: rpcResult.check_in_at,
      check_out_at: null,
      check_in_status: rpcResult.check_in_status,
      check_out_status: null,
      check_in_location_id: rpcResult.location_id,
      check_out_location_id: null,
      check_in_latitude: latitude,
      check_in_longitude: longitude,
      check_out_latitude: null,
      check_out_longitude: null,
      notes: payload.notes ? payload.notes.trim() : null,
      created_at: rpcResult.check_in_at,
      updated_at: rpcResult.check_in_at,
    };

    saveLocalAttendance(mappedRecord);
    return mappedRecord;
  },

  /**
   * Submits a Check-Out record for the authenticated employee via secure Supabase RPC.
   * Server RPC enforces employee validation, schedule, holiday, radius, and time calculations.
   */
  async checkOut(payload: CheckOutPayload): Promise<AttendanceModel> {
    const latitude = payload.latitude ?? null;
    const longitude = payload.longitude ?? null;

    if (latitude === null || longitude === null) {
      throw new Error('Koordinat lokasi tidak valid. Pastikan GPS perangkat Anda aktif.');
    }

    const existing = await this.getTodayAttendance();

    const { data, error } = await supabase.rpc('check_out', {
      user_latitude: latitude,
      user_longitude: longitude,
    });

    if (error) {
      console.error('Error executing check_out RPC:', error);
      throw new Error(formatAttendanceError(error));
    }

    const rpcResult = (Array.isArray(data) ? data[0] : data) as CheckOutRpcResult;
    if (!rpcResult || !rpcResult.attendance_id) {
      throw new Error('Respons presensi pulang tidak valid.');
    }

    const mappedRecord: AttendanceModel = {
      id: rpcResult.attendance_id,
      employee_id: existing?.employee_id || rpcResult.employee_id || '',
      attendance_date: rpcResult.attendance_date,
      check_in_at: rpcResult.check_in_at || existing?.check_in_at || null,
      check_out_at: rpcResult.check_out_at,
      check_in_status: existing?.check_in_status || null,
      check_out_status: rpcResult.check_out_status,
      check_in_location_id: existing?.check_in_location_id || rpcResult.location_id,
      check_out_location_id: rpcResult.location_id,
      check_in_latitude: existing?.check_in_latitude ?? null,
      check_in_longitude: existing?.check_in_longitude ?? null,
      check_out_latitude: latitude,
      check_out_longitude: longitude,
      notes: payload.notes ? payload.notes.trim() : existing?.notes || null,
      created_at: existing?.created_at || rpcResult.check_in_at,
      updated_at: rpcResult.check_out_at,
    };

    saveLocalAttendance(mappedRecord);
    return mappedRecord;
  },
};
