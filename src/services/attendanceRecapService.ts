import { supabase } from '../lib/supabase';
import { formatAttendanceError } from './attendanceService';
import { getLocalAttendanceRecords } from './attendanceStorage';
import { DepartmentOption } from '../types/attendanceMonitoring.types';
import {
  DailyTrendPoint,
  DepartmentStatPoint,
  EmployeeAttendanceDetailLog,
  EmployeeRecapRecord,
  GlobalRecapSummary,
  RecapDataResponse,
  RecapFilter,
  RecapStatistics,
} from '../types/attendanceRecap.types';

export const attendanceRecapService = {
  /**
   * Fetches active departments for recap filter
   */
  async getDepartments(): Promise<DepartmentOption[]> {
    const { data, error } = await supabase
      .from('departments')
      .select('id, name')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching departments for recap:', error);
      return [];
    }

    return (data as DepartmentOption[]) || [];
  },

  /**
   * Calculates effective working days (Monday-Friday, excluding holidays) in a date range
   */
  calculateWorkingDays(
    startDateStr: string,
    endDateStr: string,
    holidaySet: Set<string>
  ): number {
    let count = 0;
    const current = new Date(startDateStr + 'T00:00:00');
    const end = new Date(endDateStr + 'T00:00:00');

    while (current <= end) {
      const dayOfWeek = current.getDay(); // 0 = Sunday, 6 = Saturday
      const isoDate = current.toISOString().split('T')[0];

      if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidaySet.has(isoDate)) {
        count++;
      }

      current.setDate(current.getDate() + 1);
    }

    return count;
  },

  /**
   * Helper to format YYYY-MM-DD to "01 Okt"
   */
  formatShortDate(isoDate: string): string {
    try {
      const date = new Date(isoDate + 'T00:00:00');
      return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
    } catch {
      return isoDate;
    }
  },

  /**
   * Fetches recap statistics, summary, and records for active employees in a date range
   */
  async getAttendanceRecap(filter: RecapFilter): Promise<RecapDataResponse> {
    const {
      startDate,
      endDate,
      departmentId = 'all',
      statusFilter = 'all',
      searchQuery = '',
    } = filter;

    if (startDate > endDate) {
      throw new Error('Tanggal mulai tidak boleh lebih besar dari tanggal akhir.');
    }

    // 1. Fetch active employees
    const { data: employeesData, error: empError } = await supabase
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
      .eq('status', 'active')
      .order('full_name', { ascending: true });

    if (empError) {
      console.error('Error fetching employees for recap:', empError);
      throw new Error(formatAttendanceError(empError));
    }

    // 2. Fetch active holidays in the range
    const { data: holidaysData, error: holError } = await supabase
      .from('holidays')
      .select('holiday_date')
      .eq('is_active', true)
      .gte('holiday_date', startDate)
      .lte('holiday_date', endDate);

    if (holError) {
      console.error('Error fetching holidays for recap:', holError);
    }

    const holidaySet = new Set<string>();
    if (holidaysData) {
      holidaysData.forEach((h) => holidaySet.add(h.holiday_date));
    }

    const effectiveWorkingDays = this.calculateWorkingDays(
      startDate,
      endDate,
      holidaySet
    );

    // 3. Fetch attendance records in date range
    const { data: attendanceData, error: attError } = await supabase
      .from('attendance')
      .select(`
        id,
        employee_id,
        attendance_date,
        check_in_at,
        check_out_at,
        check_in_status,
        check_out_status
      `)
      .gte('attendance_date', startDate)
      .lte('attendance_date', endDate);

    let rawAttendance = attendanceData || [];

    if (attError) {
      if ((attError as any).code === 'PGRST205' || (attError as any).message?.includes('schema cache')) {
        rawAttendance = getLocalAttendanceRecords().filter(
          (r) => r.attendance_date >= startDate && r.attendance_date <= endDate
        ) as any;
      } else {
        console.error('Error fetching attendance for recap:', attError);
        throw new Error(formatAttendanceError(attError));
      }
    }

    // Group attendance records by employee_id
    const attendanceByEmployee = new Map<string, any[]>();
    rawAttendance.forEach((att) => {
      const list = attendanceByEmployee.get(att.employee_id) || [];
      list.push(att);
      attendanceByEmployee.set(att.employee_id, list);
    });

    // 4. Build EmployeeRecapRecord array
    const allRecords: EmployeeRecapRecord[] = (employeesData || []).map((emp) => {
      const empAttendance = attendanceByEmployee.get(emp.id) || [];

      const totalAttendance = empAttendance.length;
      const onTimeCount = empAttendance.filter((a) => a.check_in_status === 'on_time').length;
      const lateCount = empAttendance.filter((a) => a.check_in_status === 'late').length;
      const checkedOutCount = empAttendance.filter((a) => a.check_out_at !== null).length;
      const notCheckedOutCount = empAttendance.filter(
        (a) => a.check_in_at !== null && a.check_out_at === null
      ).length;

      const absentCount = Math.max(0, effectiveWorkingDays - totalAttendance);

      const deptObj = Array.isArray(emp.departments)
        ? emp.departments[0]
        : emp.departments;
      const departmentName = deptObj?.name || 'Belum Ditentukan';

      return {
        employeeId: emp.id,
        fullName: emp.full_name,
        nip: emp.nip || null,
        departmentId: emp.department_id || null,
        departmentName,
        effectiveWorkingDays,
        totalAttendance,
        onTimeCount,
        lateCount,
        checkedOutCount,
        notCheckedOutCount,
        absentCount,
      };
    });

    // 5. Apply department filter and search query to records
    let filteredRecords = allRecords;

    if (departmentId && departmentId !== 'all') {
      filteredRecords = filteredRecords.filter((r) => r.departmentId === departmentId);
    }

    if (statusFilter && statusFilter !== 'all') {
      if (statusFilter === 'on_time') {
        filteredRecords = filteredRecords.filter((r) => r.onTimeCount > 0);
      } else if (statusFilter === 'late') {
        filteredRecords = filteredRecords.filter((r) => r.lateCount > 0);
      } else if (statusFilter === 'belum_presensi') {
        filteredRecords = filteredRecords.filter((r) => r.absentCount > 0);
      } else if (statusFilter === 'sudah_checkout') {
        filteredRecords = filteredRecords.filter((r) => r.checkedOutCount > 0);
      } else if (statusFilter === 'belum_checkout') {
        filteredRecords = filteredRecords.filter((r) => r.notCheckedOutCount > 0);
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filteredRecords = filteredRecords.filter((r) => {
        const nameMatch = r.fullName.toLowerCase().includes(q);
        const nipMatch = r.nip ? r.nip.toLowerCase().includes(q) : false;
        return nameMatch || nipMatch;
      });
    }

    // 6. Calculate summary across filtered employees
    const summary: GlobalRecapSummary = {
      totalEmployees: filteredRecords.length,
      effectiveWorkingDays,
      totalAttendance: filteredRecords.reduce((acc, r) => acc + r.totalAttendance, 0),
      onTimeCount: filteredRecords.reduce((acc, r) => acc + r.onTimeCount, 0),
      lateCount: filteredRecords.reduce((acc, r) => acc + r.lateCount, 0),
      absentCount: filteredRecords.reduce((acc, r) => acc + r.absentCount, 0),
      checkedOutCount: filteredRecords.reduce((acc, r) => acc + r.checkedOutCount, 0),
      notCheckedOutCount: filteredRecords.reduce((acc, r) => acc + r.notCheckedOutCount, 0),
    };

    // 7. Compute statistics
    const totalCheckIns = summary.onTimeCount + summary.lateCount;
    const onTimePerc = totalCheckIns > 0 ? (summary.onTimeCount / totalCheckIns) * 100 : 0;
    const latePerc = totalCheckIns > 0 ? (summary.lateCount / totalCheckIns) * 100 : 0;

    const totalAttendanceRecs = summary.totalAttendance;
    const checkedOutPerc =
      totalAttendanceRecs > 0 ? (summary.checkedOutCount / totalAttendanceRecs) * 100 : 0;
    const notCheckedOutPerc =
      totalAttendanceRecs > 0 ? (summary.notCheckedOutCount / totalAttendanceRecs) * 100 : 0;

    // Daily Trend Calculation
    const dailyTrendMap = new Map<string, { onTime: number; late: number; total: number }>();
    const activeEmpIds = new Set(filteredRecords.map((r) => r.employeeId));

    rawAttendance.forEach((att) => {
      if (!activeEmpIds.has(att.employee_id)) return;

      const dateKey = att.attendance_date;
      const current = dailyTrendMap.get(dateKey) || { onTime: 0, late: 0, total: 0 };

      if (att.check_in_status === 'on_time') current.onTime++;
      if (att.check_in_status === 'late') current.late++;
      current.total++;

      dailyTrendMap.set(dateKey, current);
    });

    const dailyTrend: DailyTrendPoint[] = [];
    const currDate = new Date(startDate + 'T00:00:00');
    const endDateObj = new Date(endDate + 'T00:00:00');
    const todayStr = new Date().toISOString().split('T')[0];

    while (currDate <= endDateObj) {
      const isoDate = currDate.toISOString().split('T')[0];
      const dayOfWeek = currDate.getDay();

      // Only plot working days up to today
      if (dayOfWeek !== 0 && dayOfWeek !== 6 && !holidaySet.has(isoDate) && isoDate <= todayStr) {
        const stats = dailyTrendMap.get(isoDate) || { onTime: 0, late: 0, total: 0 };
        const absent = Math.max(0, filteredRecords.length - stats.total);

        dailyTrend.push({
          date: isoDate,
          dateLabel: this.formatShortDate(isoDate),
          onTime: stats.onTime,
          late: stats.late,
          absent,
          totalPresent: stats.total,
        });
      }

      currDate.setDate(currDate.getDate() + 1);
    }

    // Department Stats Calculation
    const deptStatsMap = new Map<
      string,
      { name: string; totalEmp: number; onTime: number; late: number; absent: number; att: number }
    >();

    filteredRecords.forEach((rec) => {
      const deptName = rec.departmentName;
      const current = deptStatsMap.get(deptName) || {
        name: deptName,
        totalEmp: 0,
        onTime: 0,
        late: 0,
        absent: 0,
        att: 0,
      };

      current.totalEmp++;
      current.onTime += rec.onTimeCount;
      current.late += rec.lateCount;
      current.absent += rec.absentCount;
      current.att += rec.totalAttendance;

      deptStatsMap.set(deptName, current);
    });

    const departmentStats: DepartmentStatPoint[] = Array.from(deptStatsMap.entries()).map(
      ([deptId, val]) => ({
        departmentId: deptId,
        departmentName: val.name,
        totalEmployees: val.totalEmp,
        onTime: val.onTime,
        late: val.late,
        absent: val.absent,
        totalAttendance: val.att,
      })
    );

    const statistics: RecapStatistics = {
      checkInStatusStats: {
        onTimeCount: summary.onTimeCount,
        lateCount: summary.lateCount,
        onTimePercentage: Math.round(onTimePerc * 10) / 10,
        latePercentage: Math.round(latePerc * 10) / 10,
      },
      checkOutStatusStats: {
        checkedOutCount: summary.checkedOutCount,
        notCheckedOutCount: summary.notCheckedOutCount,
        checkedOutPercentage: Math.round(checkedOutPerc * 10) / 10,
        notCheckedOutPercentage: Math.round(notCheckedOutPerc * 10) / 10,
      },
      dailyTrend,
      departmentStats,
    };

    return {
      records: filteredRecords,
      summary,
      statistics,
      startDate,
      endDate,
    };
  },

  /**
   * Fetches detailed attendance logs for a single employee in a date range (for Detail Modal)
   */
  async getEmployeeAttendanceLogs(
    employeeId: string,
    startDate: string,
    endDate: string
  ): Promise<EmployeeAttendanceDetailLog[]> {
    const { data, error } = await supabase
      .from('attendance')
      .select(`
        id,
        attendance_date,
        check_in_at,
        check_out_at,
        check_in_status,
        check_out_status
      `)
      .eq('employee_id', employeeId)
      .gte('attendance_date', startDate)
      .lte('attendance_date', endDate)
      .order('attendance_date', { ascending: false });

    if (error) {
      console.error('Error fetching employee attendance detail logs:', error);
      throw new Error(formatAttendanceError(error));
    }

    return (data || []).map((row) => ({
      id: row.id,
      attendanceDate: row.attendance_date,
      checkInAt: row.check_in_at,
      checkOutAt: row.check_out_at,
      checkInStatus: (row.check_in_status as any) || null,
      checkOutStatus: (row.check_out_status as any) || null,
    }));
  },
};
