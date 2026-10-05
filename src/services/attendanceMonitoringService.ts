import { supabase } from '../lib/supabase';
import { formatAttendanceError } from './attendanceService';
import { getLocalAttendanceRecords } from './attendanceStorage';
import {
  DepartmentOption,
  MonitoringDataResponse,
  MonitoringFilter,
  MonitoringRecord,
  MonitoringSummary,
} from '../types/attendanceMonitoring.types';

export const attendanceMonitoringService = {
  /**
   * Fetches active departments for monitoring filter dropdown
   */
  async getDepartments(): Promise<DepartmentOption[]> {
    const { data, error } = await supabase
      .from('departments')
      .select('id, name')
      .order('name', { ascending: true });

    if (error) {
      console.error('Error fetching departments for monitoring:', error);
      return [];
    }

    return (data as DepartmentOption[]) || [];
  },

  /**
   * Fetches monitoring data and summary for a given date
   */
  async getAttendanceMonitoring(
    filter: MonitoringFilter
  ): Promise<MonitoringDataResponse> {
    const {
      date,
      departmentId = 'all',
      statusFilter = 'all',
      searchQuery = '',
    } = filter;

    // 1. Query all active employees
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
      console.error('Error fetching employees for monitoring:', empError);
      throw new Error(formatAttendanceError(empError));
    }

    // 2. Query attendance records for the selected date
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
        check_in_location_id,
        check_out_location_id
      `)
      .eq('attendance_date', date);

    let effectiveAttendanceData = attendanceData || [];

    if (attError) {
      if ((attError as any).code === 'PGRST205' || (attError as any).message?.includes('schema cache')) {
        effectiveAttendanceData = getLocalAttendanceRecords().filter((r) => r.attendance_date === date) as any;
      } else {
        console.error('Error fetching attendance for monitoring:', attError);
        throw new Error(formatAttendanceError(attError));
      }
    }

    // Map attendance by employee_id for fast lookup
    const attendanceMap = new Map<string, any>();
    effectiveAttendanceData.forEach((att) => {
      if (att.employee_id) {
        attendanceMap.set(att.employee_id, att);
      }
    });

    // 3. Combine active employees with attendance records
    const allRecords: MonitoringRecord[] = (employeesData || []).map((emp) => {
      const att = attendanceMap.get(emp.id);

      const hasCheckIn = Boolean(att?.check_in_at);
      const hasCheckOut = Boolean(att?.check_out_at);

      let overallStatus: 'belum_presensi' | 'sudah_masuk' | 'sudah_pulang' = 'belum_presensi';
      if (hasCheckIn && !hasCheckOut) {
        overallStatus = 'sudah_masuk';
      } else if (hasCheckIn && hasCheckOut) {
        overallStatus = 'sudah_pulang';
      }

      // Department name extraction
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
        attendanceId: att?.id || null,
        attendanceDate: date,
        checkInAt: att?.check_in_at || null,
        checkOutAt: att?.check_out_at || null,
        checkInStatus: (att?.check_in_status as 'on_time' | 'late' | null) || null,
        checkOutStatus: (att?.check_out_status as 'operational' | 'after_work' | null) || null,
        overallStatus,
      };
    });

    // 4. Calculate overall summary across all active employees for this date
    const summary: MonitoringSummary = {
      totalEmployees: allRecords.length,
      presentCount: allRecords.filter((r) => r.overallStatus !== 'belum_presensi').length,
      onTimeCount: allRecords.filter((r) => r.checkInStatus === 'on_time').length,
      lateCount: allRecords.filter((r) => r.checkInStatus === 'late').length,
      absentCount: allRecords.filter((r) => r.overallStatus === 'belum_presensi').length,
      checkedOutCount: allRecords.filter((r) => r.checkOutAt !== null).length,
    };

    // 5. Apply filters & search to records
    let filteredRecords = allRecords;

    // Filter by department
    if (departmentId && departmentId !== 'all') {
      filteredRecords = filteredRecords.filter((r) => r.departmentId === departmentId);
    }

    // Filter by attendance status
    if (statusFilter && statusFilter !== 'all') {
      if (statusFilter === 'belum_presensi') {
        filteredRecords = filteredRecords.filter((r) => r.overallStatus === 'belum_presensi');
      } else if (statusFilter === 'sudah_masuk') {
        filteredRecords = filteredRecords.filter((r) => r.overallStatus === 'sudah_masuk');
      } else if (statusFilter === 'sudah_pulang') {
        filteredRecords = filteredRecords.filter((r) => r.overallStatus === 'sudah_pulang');
      } else if (statusFilter === 'on_time') {
        filteredRecords = filteredRecords.filter((r) => r.checkInStatus === 'on_time');
      } else if (statusFilter === 'late') {
        filteredRecords = filteredRecords.filter((r) => r.checkInStatus === 'late');
      }
    }

    // Filter by search query (name or NIP)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      filteredRecords = filteredRecords.filter((r) => {
        const nameMatch = r.fullName.toLowerCase().includes(q);
        const nipMatch = r.nip ? r.nip.toLowerCase().includes(q) : false;
        return nameMatch || nipMatch;
      });
    }

    return {
      records: filteredRecords,
      summary,
      date,
    };
  },
};
