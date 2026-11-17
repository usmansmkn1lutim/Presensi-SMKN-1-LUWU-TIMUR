import { supabase } from '../lib/supabase';
import { formatAttendanceError } from './attendanceService';
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
        photo_url,
        status,
        department_id,
        position_id,
        departments (
          id,
          name
        ),
        positions (
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
        check_out_location_id,
        check_in_photo_path,
        check_out_photo_path
      `)
      .eq('attendance_date', date);

    if (attError) {
      console.error('Error fetching attendance for monitoring from database:', attError);
      throw new Error(formatAttendanceError(attError));
    }

    // 2b. Query approved & pending requests covering the selected date
    const { data: requestsData, error: reqError } = await supabase
      .from('requests')
      .select('id, employee_id, request_type, status, submitted_at, created_at')
      .in('status', ['approved', 'pending'])
      .lte('start_date', date)
      .gte('end_date', date)
      .order('created_at', { ascending: false });

    if (reqError) {
      console.error('Error fetching requests for monitoring:', reqError);
    }

    const effectiveAttendanceData = attendanceData || [];

    // Map attendance by employee_id for fast lookup
    const attendanceMap = new Map<string, any>();
    effectiveAttendanceData.forEach((att) => {
      if (att.employee_id) {
        attendanceMap.set(att.employee_id, att);
      }
    });

    // Map requests by employee_id, prioritizing approved over pending if overlapping
    const requestMap = new Map<
      string,
      {
        requestType: 'official_duty' | 'sick' | 'other' | 'leave';
        requestStatus: 'approved' | 'pending';
      }
    >();
    (requestsData || []).forEach((req) => {
      if (!req.employee_id) return;
      const reqStatus = req.status as 'approved' | 'pending';
      const reqType = req.request_type as 'official_duty' | 'sick' | 'other' | 'leave';
      const existing = requestMap.get(req.employee_id);
      if (!existing || (existing.requestStatus === 'pending' && reqStatus === 'approved')) {
        requestMap.set(req.employee_id, {
          requestType: reqType,
          requestStatus: reqStatus,
        });
      }
    });

    // 3. Combine active employees with attendance & request records
    const allRecords: MonitoringRecord[] = (employeesData || []).map((emp) => {
      const att = attendanceMap.get(emp.id);
      const req = requestMap.get(emp.id);

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

      // Position name extraction (real data only, no fallback placeholder)
      const posObj = Array.isArray((emp as any).positions)
        ? (emp as any).positions[0]
        : (emp as any).positions;
      const positionName = posObj?.name ? String(posObj.name).trim() : null;

      return {
        employeeId: emp.id,
        fullName: emp.full_name,
        nip: emp.nip || null,
        photoUrl: emp.photo_url || null,
        positionName: positionName || null,
        departmentId: emp.department_id || null,
        departmentName,
        attendanceId: att?.id || null,
        attendanceDate: date,
        checkInAt: att?.check_in_at || null,
        checkOutAt: att?.check_out_at || null,
        checkInStatus: (att?.check_in_status as 'on_time' | 'late' | null) || null,
        checkOutStatus: (att?.check_out_status as 'operational' | 'after_work' | null) || null,
        overallStatus,
        checkInPhotoPath: att?.check_in_photo_path || null,
        checkOutPhotoPath: att?.check_out_photo_path || null,
        requestType: req?.requestType || null,
        requestStatus: req?.requestStatus || null,
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
