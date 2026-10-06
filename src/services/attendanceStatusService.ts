import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { formatAttendanceError } from './attendanceService';
import {
  getMakassarTodayDateString,
  iterateDateRange,
} from './attendanceReportService';

export type OfficialAttendanceStatus =
  | 'present'       // Hadir
  | 'sick'          // Sakit
  | 'permit'        // Izin
  | 'official_duty' // Dinas Luar
  | 'leave'         // Cuti
  | 'absent'        // Alpha / Tanpa Keterangan
  | 'holiday';      // Libur

export type AttendanceSubstatus = 'on_time' | 'late' | null;

export const OFFICIAL_STATUS_LABELS: Record<OfficialAttendanceStatus, string> = {
  present: 'Hadir',
  sick: 'Sakit',
  permit: 'Izin',
  official_duty: 'Dinas Luar',
  leave: 'Cuti',
  absent: 'Alpha',
  holiday: 'Libur',
};

export const SUBSTATUS_LABELS: Record<'on_time' | 'late', string> = {
  on_time: 'Tepat Waktu',
  late: 'Terlambat',
};

export interface EvaluatedStatusResult {
  date: string; // YYYY-MM-DD
  employeeId: string;
  employeeName: string;
  nip: string | null;
  departmentName: string;
  status: OfficialAttendanceStatus;
  statusLabel: string; // 'Hadir' | 'Sakit' | 'Izin' | 'Dinas Luar' | 'Cuti' | 'Alpha' | 'Libur'
  substatus: AttendanceSubstatus;
  substatusLabel: string | null; // 'Tepat Waktu' | 'Terlambat' | null
  notes: string | null;
  checkInAt: string | null;
  checkOutAt: string | null;
  checkInLocation: string | null;
  checkOutLocation: string | null;
  source: 'attendance' | 'request' | 'holiday' | 'calendar';
  sourceId: string | null;
}

export interface MinimalEmployee {
  id: string;
  full_name: string;
  nip: string | null;
  departmentName?: string | null;
}

export interface MinimalAttendance {
  id: string;
  employee_id: string | null;
  attendance_date: string;
  check_in_at: string | null;
  check_out_at: string | null;
  check_in_status: 'on_time' | 'late' | null;
  check_out_status: 'operational' | 'after_work' | null;
  notes: string | null;
  check_in_location?: { name: string } | null;
  check_out_location?: { name: string } | null;
}

export interface MinimalRequest {
  id: string;
  employee_id: string | null;
  request_type: 'leave' | 'sick' | 'official_duty' | 'other';
  start_date: string;
  end_date: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
}

export interface MinimalHoliday {
  id?: string;
  holiday_date: string;
  name: string;
  is_active?: boolean;
}

/**
 * Pure Deterministic Evaluation Engine for Employee Daily Attendance Status
 */
export function evaluateDailyStatus(
  date: string,
  employee: MinimalEmployee,
  attendance: MinimalAttendance | null,
  approvedRequest: MinimalRequest | null,
  holiday: MinimalHoliday | null,
  todayStr: string = getMakassarTodayDateString()
): EvaluatedStatusResult {
  const deptName = employee.departmentName || 'Satuan Pendidikan';

  // PRIORITAS 1: PHYSICAL ATTENDANCE
  if (attendance) {
    const isLate = attendance.check_in_status === 'late';
    const substatus: AttendanceSubstatus = isLate ? 'late' : 'on_time';
    return {
      date,
      employeeId: employee.id,
      employeeName: employee.full_name,
      nip: employee.nip,
      departmentName: deptName,
      status: 'present',
      statusLabel: OFFICIAL_STATUS_LABELS.present,
      substatus,
      substatusLabel: SUBSTATUS_LABELS[substatus],
      notes: attendance.notes || null,
      checkInAt: attendance.check_in_at,
      checkOutAt: attendance.check_out_at,
      checkInLocation: attendance.check_in_location?.name || null,
      checkOutLocation: attendance.check_out_location?.name || null,
      source: 'attendance',
      sourceId: attendance.id,
    };
  }

  // PRIORITAS 2: APPROVED REQUEST
  if (approvedRequest && approvedRequest.status === 'approved') {
    let status: OfficialAttendanceStatus = 'leave';
    if (approvedRequest.request_type === 'sick') {
      status = 'sick';
    } else if (approvedRequest.request_type === 'official_duty') {
      status = 'official_duty';
    } else if (approvedRequest.request_type === 'other') {
      status = 'permit';
    } else if (approvedRequest.request_type === 'leave') {
      status = 'leave';
    }

    return {
      date,
      employeeId: employee.id,
      employeeName: employee.full_name,
      nip: employee.nip,
      departmentName: deptName,
      status,
      statusLabel: OFFICIAL_STATUS_LABELS[status],
      substatus: null,
      substatusLabel: null,
      notes: approvedRequest.reason || OFFICIAL_STATUS_LABELS[status],
      checkInAt: null,
      checkOutAt: null,
      checkInLocation: null,
      checkOutLocation: null,
      source: 'request',
      sourceId: approvedRequest.id,
    };
  }

  // PRIORITAS 3: OFFICIAL ACTIVE HOLIDAY
  if (holiday && (holiday.is_active !== false)) {
    return {
      date,
      employeeId: employee.id,
      employeeName: employee.full_name,
      nip: employee.nip,
      departmentName: deptName,
      status: 'holiday',
      statusLabel: OFFICIAL_STATUS_LABELS.holiday,
      substatus: null,
      substatusLabel: null,
      notes: holiday.name,
      checkInAt: null,
      checkOutAt: null,
      checkInLocation: null,
      checkOutLocation: null,
      source: 'holiday',
      sourceId: holiday.id || null,
    };
  }

  // PRIORITAS 4: WEEKEND
  const [y, m, d] = date.split('-').map(Number);
  const dayOfWeek = new Date(y, m - 1, d, 12, 0, 0).getDay(); // 0 = Sun, 6 = Sat
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    return {
      date,
      employeeId: employee.id,
      employeeName: employee.full_name,
      nip: employee.nip,
      departmentName: deptName,
      status: 'holiday',
      statusLabel: OFFICIAL_STATUS_LABELS.holiday,
      substatus: null,
      substatusLabel: null,
      notes: 'Akhir Pekan',
      checkInAt: null,
      checkOutAt: null,
      checkInLocation: null,
      checkOutLocation: null,
      source: 'calendar',
      sourceId: null,
    };
  }

  // PRIORITAS 5: ALPHA / TANPA KETERANGAN (Only for working days up to today)
  if (date <= todayStr) {
    return {
      date,
      employeeId: employee.id,
      employeeName: employee.full_name,
      nip: employee.nip,
      departmentName: deptName,
      status: 'absent',
      statusLabel: OFFICIAL_STATUS_LABELS.absent,
      substatus: null,
      substatusLabel: null,
      notes: 'Tanpa Keterangan',
      checkInAt: null,
      checkOutAt: null,
      checkInLocation: null,
      checkOutLocation: null,
      source: 'calendar',
      sourceId: null,
    };
  }

  // FUTURE WORKING DAY (No status evaluated yet)
  return {
    date,
    employeeId: employee.id,
    employeeName: employee.full_name,
    nip: employee.nip,
    departmentName: deptName,
    status: 'holiday',
    statusLabel: 'Masa Depan',
    substatus: null,
    substatusLabel: null,
    notes: 'Jadwal Kerja Mendatang',
    checkInAt: null,
    checkOutAt: null,
    checkInLocation: null,
    checkOutLocation: null,
    source: 'calendar',
    sourceId: null,
  };
}

export const attendanceStatusService = {
  /**
   * Generates a complete deterministic matrix of daily evaluated attendance records
   * across employees and date ranges.
   */
  async getEvaluatedMatrix(
    startDate: string,
    endDate: string,
    employeeIdFilter?: string | null,
    departmentIdFilter?: string | null
  ): Promise<EvaluatedStatusResult[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }

    const todayStr = getMakassarTodayDateString();

    // 1. Fetch holidays
    const { data: holidaysData, error: holError } = await supabase
      .from('holidays')
      .select('id, holiday_date, name, is_active')
      .eq('is_active', true)
      .gte('holiday_date', startDate)
      .lte('holiday_date', endDate);

    if (holError) {
      console.error('Error fetching holidays for status engine:', holError);
      throw new Error(formatAttendanceError(holError));
    }

    const holidayMap = new Map<string, MinimalHoliday>();
    (holidaysData || []).forEach((h) => {
      holidayMap.set(h.holiday_date, h);
    });

    // 2. Fetch active employees
    let empQuery = supabase
      .from('employees')
      .select(`
        id,
        nip,
        full_name,
        status,
        department_id,
        departments (
          id,
          name
        )
      `)
      .order('full_name', { ascending: true });

    if (departmentIdFilter && departmentIdFilter !== 'all') {
      empQuery = empQuery.eq('department_id', departmentIdFilter);
    }

    if (employeeIdFilter && employeeIdFilter !== 'all') {
      empQuery = empQuery.eq('id', employeeIdFilter);
    }

    const { data: employeesData, error: empError } = await empQuery;

    if (empError) {
      console.error('Error fetching employees for status engine:', empError);
      throw new Error(formatAttendanceError(empError));
    }

    const activeEmployees: MinimalEmployee[] = (employeesData || [])
      .filter((e) => e.status === 'active')
      .map((e) => {
        const deptObj = Array.isArray(e.departments) ? e.departments[0] : e.departments;
        return {
          id: e.id,
          full_name: e.full_name,
          nip: e.nip || null,
          departmentName: deptObj?.name || 'Satuan Pendidikan',
        };
      });

    if (activeEmployees.length === 0) {
      return [];
    }

    const employeeIds = activeEmployees.map((e) => e.id);

    // 3. Fetch attendance records
    const { data: attendanceData, error: attError } = await supabase
      .from('attendance')
      .select(`
        id,
        employee_id,
        attendance_date,
        check_in_at,
        check_out_at,
        check_in_status,
        check_out_status,
        notes,
        check_in_location:locations!check_in_location_id (name),
        check_out_location:locations!check_out_location_id (name)
      `)
      .in('employee_id', employeeIds)
      .gte('attendance_date', startDate)
      .lte('attendance_date', endDate);

    if (attError) {
      console.error('Error fetching attendance for status engine:', attError);
      throw new Error(formatAttendanceError(attError));
    }

    // Map key: "employeeId:date" -> MinimalAttendance
    const attendanceMap = new Map<string, MinimalAttendance>();
    (attendanceData || []).forEach((att) => {
      if (att.employee_id && att.attendance_date) {
        const key = `${att.employee_id}:${att.attendance_date}`;
        attendanceMap.set(key, att as unknown as MinimalAttendance);
      }
    });

    // 4. Fetch approved requests
    const { data: requestsData, error: reqError } = await supabase
      .from('requests')
      .select('id, employee_id, request_type, start_date, end_date, reason, status')
      .in('employee_id', employeeIds)
      .eq('status', 'approved')
      .lte('start_date', endDate)
      .gte('end_date', startDate);

    if (reqError) {
      console.error('Error fetching requests for status engine:', reqError);
      throw new Error(formatAttendanceError(reqError));
    }

    // Map key: "employeeId:date" -> MinimalRequest
    const requestMap = new Map<string, MinimalRequest>();
    (requestsData || []).forEach((req) => {
      if (req.employee_id) {
        const dateRange = iterateDateRange(req.start_date, req.end_date);
        dateRange.forEach((dStr) => {
          if (dStr >= startDate && dStr <= endDate) {
            const key = `${req.employee_id}:${dStr}`;
            // If overlapping approved requests exist, retain first encountered
            if (!requestMap.has(key)) {
              requestMap.set(key, req as MinimalRequest);
            }
          }
        });
      }
    });

    // 5. Build full evaluated matrix
    const datesInRange = iterateDateRange(startDate, endDate);
    const results: EvaluatedStatusResult[] = [];

    for (const emp of activeEmployees) {
      for (const dStr of datesInRange) {
        const key = `${emp.id}:${dStr}`;
        const att = attendanceMap.get(key) || null;
        const req = requestMap.get(key) || null;
        const hol = holidayMap.get(dStr) || null;

        const evaluated = evaluateDailyStatus(dStr, emp, att, req, hol, todayStr);
        results.push(evaluated);
      }
    }

    return results;
  },
};
