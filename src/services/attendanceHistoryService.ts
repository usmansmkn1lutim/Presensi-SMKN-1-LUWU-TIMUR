import { supabase } from '../lib/supabase';
import { attendanceService, formatAttendanceError, getLocalDateString } from './attendanceService';
import { attendanceStatusService } from './attendanceStatusService';
import {
  AttendanceHistoryFilter,
  AttendanceHistoryRecord,
  AttendanceHistoryResponse,
  AttendanceHistorySummary,
  OfficialMonthlyRecapSummary,
  OfficialMonthlyRecapResponse,
} from '../types/attendanceHistory.types';

export const attendanceHistoryService = {
  /**
   * Fetches attendance history and summary for the authenticated logged-in employee.
   * STRICT SINGLE SOURCE OF TRUTH: Queries public.attendance directly from Supabase PostgreSQL.
   * NEVER accepts employee_id from caller as authorization source.
   */
  async getAttendanceHistory(
    filter: AttendanceHistoryFilter
  ): Promise<AttendanceHistoryResponse> {
    const employee = await attendanceService.getCurrentEmployee();

    const {
      startDate,
      endDate,
      statusFilter = 'all',
      checkoutFilter = 'all',
      page = 1,
      pageSize = 15,
    } = filter;

    // Validate date range
    if (startDate > endDate) {
      throw new Error('Tanggal mulai tidak boleh lebih besar dari tanggal akhir.');
    }

    // 1. Fetch overall summary stats for the date range
    const { data: summaryRows, error: summaryError } = await supabase
      .from('attendance')
      .select('id, check_in_status, check_out_at')
      .eq('employee_id', employee.id)
      .gte('attendance_date', startDate)
      .lte('attendance_date', endDate);

    if (summaryError) {
      console.error('Error fetching attendance history summary from database:', summaryError);
      throw new Error(formatAttendanceError(summaryError));
    }

    const summary: AttendanceHistorySummary = {
      totalAttendance: summaryRows?.length || 0,
      onTimeCount: summaryRows?.filter((r) => r.check_in_status === 'on_time').length || 0,
      lateCount: summaryRows?.filter((r) => r.check_in_status === 'late').length || 0,
      checkedOutCount: summaryRows?.filter((r) => r.check_out_at !== null).length || 0,
    };

    // 2. Build paginated query
    let query = supabase
      .from('attendance')
      .select(
        `
        *,
        check_in_location:locations!check_in_location_id (
          id,
          name,
          code
        ),
        check_out_location:locations!check_out_location_id (
          id,
          name,
          code
        )
      `,
        { count: 'exact' }
      )
      .eq('employee_id', employee.id)
      .gte('attendance_date', startDate)
      .lte('attendance_date', endDate)
      .order('attendance_date', { ascending: false });

    // Apply optional status filters
    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('check_in_status', statusFilter);
    }

    if (checkoutFilter === 'checked_out') {
      query = query.not('check_out_at', 'is', null);
    } else if (checkoutFilter === 'not_checked_out') {
      query = query.is('check_out_at', null);
    }

    // Range pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data: recordsData, count, error: queryError } = await query;

    if (queryError) {
      console.error('Error fetching attendance history records from database:', queryError);
      throw new Error(formatAttendanceError(queryError));
    }

    const totalCount = count || 0;
    const totalPages = Math.ceil(totalCount / pageSize) || 1;

    return {
      records: (recordsData as unknown as AttendanceHistoryRecord[]) || [],
      summary,
      totalCount,
      page,
      pageSize,
      totalPages,
    };
  },

  /**
   * Evaluates official attendance status recap for the active calendar month
   * using the canonical official attendance status engine.
   */
  async getMonthlyOfficialStatusRecap(
    year: number,
    month: number,
    employeeId?: string
  ): Promise<OfficialMonthlyRecapResponse> {
    const empId = employeeId || (await attendanceService.getCurrentEmployee()).id;
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = getLocalDateString(firstDay);
    const endDate = getLocalDateString(lastDay);

    const matrix = await attendanceStatusService.getEvaluatedMatrix(
      startDate,
      endDate,
      empId
    );

    const summary: OfficialMonthlyRecapSummary = {
      present: matrix.filter((r) => r.status === 'present').length,
      sick: matrix.filter((r) => r.status === 'sick').length,
      permit: matrix.filter((r) => r.status === 'permit').length,
      officialDuty: matrix.filter((r) => r.status === 'official_duty').length,
      leave: matrix.filter((r) => r.status === 'leave').length,
      absent: matrix.filter((r) => r.status === 'absent').length,
    };

    const records: AttendanceHistoryRecord[] = matrix
      .filter((r) => r.status !== 'holiday')
      .sort((a, b) => b.date.localeCompare(a.date))
      .map((r) => ({
        id: r.sourceId || `eval-${r.date}`,
        employee_id: empId,
        attendance_date: r.date,
        check_in_at: r.checkInAt,
        check_out_at: r.checkOutAt,
        check_in_status: r.substatus,
        check_out_status: r.checkOutAt ? 'operational' : null,
        check_in_location_id: null,
        check_out_location_id: null,
        check_in_latitude: null,
        check_in_longitude: null,
        check_out_latitude: null,
        check_out_longitude: null,
        notes: r.notes,
        check_in_location: r.checkInLocation
          ? { id: '', name: r.checkInLocation, code: '' }
          : null,
        check_out_location: r.checkOutLocation
          ? { id: '', name: r.checkOutLocation, code: '' }
          : null,
        official_status: r.status,
        status_label: r.statusLabel,
        created_at: r.date,
        updated_at: r.date,
      }));

    return {
      summary,
      records,
    };
  },
};
