import { supabase } from '../lib/supabase';
import { attendanceService, formatAttendanceError } from './attendanceService';
import {
  AttendanceHistoryFilter,
  AttendanceHistoryRecord,
  AttendanceHistoryResponse,
  AttendanceHistorySummary,
} from '../types/attendanceHistory.types';

export const attendanceHistoryService = {
  /**
   * Fetches attendance history and summary for the authenticated logged-in employee.
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
      console.error('Error fetching attendance history summary:', summaryError);
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
        check_in_location:locations!check_in_location_id(id, name, code),
        check_out_location:locations!check_out_location_id(id, name, code)
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
      console.error('Error fetching attendance history records:', queryError);
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
};
