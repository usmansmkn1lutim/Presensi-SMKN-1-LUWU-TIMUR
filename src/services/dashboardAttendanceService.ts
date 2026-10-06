import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { attendanceService, formatAttendanceError } from './attendanceService';
import {
  getMakassarFirstDayOfMonthString,
  getMakassarTodayDateString,
  iterateDateRange,
} from './attendanceReportService';

export interface DashboardAttendanceSummary {
  onTimeCount: number;
  lateCount: number;
  approvedRequestDays: number;
  absentCount: number;
  startDate: string;
  endDate: string;
  employeeName: string;
}

export const dashboardAttendanceService = {
  /**
   * Fetches monthly attendance summary for the authenticated logged-in employee.
   *
   * STRICT SINGLE SOURCE OF TRUTH:
   * - public.attendance for check-in status (on_time, late)
   * - public.requests for approved leave/sick/official duty
   * - public.holidays for official school holidays
   * - Calculates effective working days up to today (WITA)
   */
  async getMonthlySummary(): Promise<DashboardAttendanceSummary> {
    if (!isSupabaseConfigured()) {
      throw new Error('Koneksi ke Supabase belum dikonfigurasi.');
    }

    // 1. Resolve employee record for auth.uid()
    const employee = await attendanceService.getCurrentEmployee();

    // 2. Resolve date bounds for current month up to today (Asia/Makassar)
    const startDate = getMakassarFirstDayOfMonthString();
    const endDate = getMakassarTodayDateString();

    // Validate date bounds
    if (startDate > endDate) {
      return {
        onTimeCount: 0,
        lateCount: 0,
        approvedRequestDays: 0,
        absentCount: 0,
        startDate,
        endDate,
        employeeName: employee.full_name,
      };
    }

    // 3. Fetch active holidays in date range
    const { data: holidaysData, error: holError } = await supabase
      .from('holidays')
      .select('holiday_date')
      .eq('is_active', true)
      .gte('holiday_date', startDate)
      .lte('holiday_date', endDate);

    if (holError) {
      console.error('Error fetching holidays for dashboard:', holError);
      throw new Error(formatAttendanceError(holError));
    }

    const holidayDates = new Set<string>();
    if (holidaysData) {
      holidaysData.forEach((h) => holidayDates.add(h.holiday_date));
    }

    // 4. Fetch attendance records for employee in current month up to today
    const { data: attendanceData, error: attError } = await supabase
      .from('attendance')
      .select('id, attendance_date, check_in_status')
      .eq('employee_id', employee.id)
      .gte('attendance_date', startDate)
      .lte('attendance_date', endDate);

    if (attError) {
      console.error('Error fetching attendance for dashboard:', attError);
      throw new Error(formatAttendanceError(attError));
    }

    const attendanceRows = attendanceData || [];
    const attendedDates = new Set<string>();
    let onTimeCount = 0;
    let lateCount = 0;

    attendanceRows.forEach((row) => {
      if (row.attendance_date) {
        attendedDates.add(row.attendance_date);
      }
      if (row.check_in_status === 'on_time') {
        onTimeCount++;
      } else if (row.check_in_status === 'late') {
        lateCount++;
      }
    });

    // 5. Fetch approved requests overlapping current month up to today
    const { data: requestsData, error: reqError } = await supabase
      .from('requests')
      .select('id, request_type, start_date, end_date, status')
      .eq('employee_id', employee.id)
      .eq('status', 'approved')
      .lte('start_date', endDate)
      .gte('end_date', startDate);

    if (reqError) {
      console.error('Error fetching requests for dashboard:', reqError);
      throw new Error(formatAttendanceError(reqError));
    }

    const approvedRequests = requestsData || [];
    const excusedDates = new Set<string>();

    approvedRequests.forEach((req) => {
      // Only count leave, sick, official_duty, or permit requests
      if (['leave', 'sick', 'official_duty', 'permit'].includes(req.request_type)) {
        const reqDates = iterateDateRange(req.start_date, req.end_date);
        reqDates.forEach((dStr) => {
          // Only add dates falling strictly within [startDate .. endDate]
          if (dStr >= startDate && dStr <= endDate) {
            excusedDates.add(dStr);
          }
        });
      }
    });

    // 6. Calculate unexcused absences (Tanpa Keterangan) across effective working days
    const allDatesInRange = iterateDateRange(startDate, endDate);
    let absentCount = 0;

    for (const dStr of allDatesInRange) {
      const [y, m, d] = dStr.split('-').map(Number);
      const dayOfWeek = new Date(y, m - 1, d, 12, 0, 0).getDay(); // 0 = Sun, 6 = Sat

      // Skip Weekends (Saturday & Sunday)
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        continue;
      }

      // Skip Official Holidays
      if (holidayDates.has(dStr)) {
        continue;
      }

      // If employee attended or has an approved leave request, they are not absent
      if (attendedDates.has(dStr) || excusedDates.has(dStr)) {
        continue;
      }

      // Unexcused Absence
      absentCount++;
    }

    return {
      onTimeCount,
      lateCount,
      approvedRequestDays: excusedDates.size,
      absentCount,
      startDate,
      endDate,
      employeeName: employee.full_name,
    };
  },
};
