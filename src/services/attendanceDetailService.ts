import { supabase } from '../lib/supabase';
import { formatAttendanceError } from './attendanceService';

export interface AttendanceDetailData {
  employee: {
    id: string;
    fullName: string;
    nip: string | null;
    departmentName: string;
    positionName: string;
  };
  attendanceDate: string; // YYYY-MM-DD
  overallStatus: 'belum_presensi' | 'sudah_masuk' | 'sudah_pulang';
  checkIn: {
    time: string | null;
    timeFormatted: string;
    status: 'on_time' | 'late' | null;
    statusLabel: string;
    locationName: string;
  };
  checkOut: {
    time: string | null;
    timeFormatted: string;
    status: 'operational' | 'after_work' | null;
    statusLabel: string;
    locationName: string;
  };
  notes: string | null;
}

export const attendanceDetailService = {
  /**
   * Helper to format ISO timestamp to local HH:mm
   */
  formatTime(isoString?: string | null): string {
    if (!isoString) return '-';
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
    } catch {
      return '-';
    }
  },

  /**
   * Fetches full snapshot detail of an employee's attendance for a specific date
   */
  async getAttendanceDetail(
    employeeId: string,
    attendanceDate: string
  ): Promise<AttendanceDetailData> {
    // 1. Fetch Employee with Department and Position
    const { data: empData, error: empError } = await supabase
      .from('employees')
      .select(`
        id,
        nip,
        full_name,
        department_id,
        position_id,
        departments ( id, name ),
        positions ( id, name )
      `)
      .eq('id', employeeId)
      .single();

    if (empError || !empData) {
      console.error('Error fetching employee for attendance detail:', empError);
      throw new Error('Data pegawai tidak ditemukan.');
    }

    const deptObj = Array.isArray(empData.departments)
      ? empData.departments[0]
      : empData.departments;
    const posObj = Array.isArray(empData.positions)
      ? empData.positions[0]
      : empData.positions;

    const employeeInfo = {
      id: empData.id,
      fullName: empData.full_name,
      nip: empData.nip || null,
      departmentName: deptObj?.name || 'Belum Ditentukan',
      positionName: posObj?.name || 'Belum Ditentukan',
    };

    // 2. Fetch Attendance Record
    const { data: attData, error: attError } = await supabase
      .from('attendance')
      .select(`
        id,
        attendance_date,
        check_in_at,
        check_out_at,
        check_in_status,
        check_out_status,
        check_in_location_id,
        check_out_location_id,
        notes
      `)
      .eq('employee_id', employeeId)
      .eq('attendance_date', attendanceDate)
      .maybeSingle();

    if (attError) {
      console.error('Error fetching attendance record detail:', attError);
      throw new Error(formatAttendanceError(attError));
    }

    // Default response if no attendance record exists for this date
    if (!attData) {
      return {
        employee: employeeInfo,
        attendanceDate,
        overallStatus: 'belum_presensi',
        checkIn: {
          time: null,
          timeFormatted: '-',
          status: null,
          statusLabel: 'Belum Presensi',
          locationName: 'Lokasi tidak tersedia',
        },
        checkOut: {
          time: null,
          timeFormatted: '-',
          status: null,
          statusLabel: 'Belum Check-out',
          locationName: 'Lokasi tidak tersedia',
        },
        notes: null,
      };
    }

    // 3. Fetch Locations if Location IDs exist
    const locationIds = [
      attData.check_in_location_id,
      attData.check_out_location_id,
    ].filter(Boolean) as string[];

    const locationMap = new Map<string, string>();

    if (locationIds.length > 0) {
      const { data: locsData } = await supabase
        .from('locations')
        .select('id, name, code')
        .in('id', locationIds);

      if (locsData) {
        locsData.forEach((loc) => {
          const label = loc.code ? `${loc.name} (${loc.code})` : loc.name;
          locationMap.set(loc.id, label);
        });
      }
    }

    // Determine Overall Status
    let overallStatus: 'belum_presensi' | 'sudah_masuk' | 'sudah_pulang' = 'belum_presensi';
    if (attData.check_out_at) {
      overallStatus = 'sudah_pulang';
    } else if (attData.check_in_at) {
      overallStatus = 'sudah_masuk';
    }

    // Map Check-in Status Label
    let checkInStatusLabel = '-';
    if (attData.check_in_status === 'on_time') {
      checkInStatusLabel = 'Tepat Waktu';
    } else if (attData.check_in_status === 'late') {
      checkInStatusLabel = 'Terlambat';
    } else if (!attData.check_in_at) {
      checkInStatusLabel = 'Belum Presensi';
    }

    // Map Check-out Status Label
    let checkOutStatusLabel = '-';
    if (attData.check_out_status === 'operational') {
      checkOutStatusLabel = 'Jam Operasional';
    } else if (attData.check_out_status === 'after_work') {
      checkOutStatusLabel = 'Setelah Jam Kerja';
    } else if (!attData.check_out_at) {
      checkOutStatusLabel = 'Belum Check-out';
    }

    const checkInLocationName = attData.check_in_location_id
      ? locationMap.get(attData.check_in_location_id) || 'Lokasi tidak tersedia'
      : 'Lokasi tidak tersedia';

    const checkOutLocationName = attData.check_out_location_id
      ? locationMap.get(attData.check_out_location_id) || 'Lokasi tidak tersedia'
      : 'Lokasi tidak tersedia';

    return {
      employee: employeeInfo,
      attendanceDate: attData.attendance_date,
      overallStatus,
      checkIn: {
        time: attData.check_in_at,
        timeFormatted: this.formatTime(attData.check_in_at),
        status: (attData.check_in_status as any) || null,
        statusLabel: checkInStatusLabel,
        locationName: checkInLocationName,
      },
      checkOut: {
        time: attData.check_out_at,
        timeFormatted: this.formatTime(attData.check_out_at),
        status: (attData.check_out_status as any) || null,
        statusLabel: checkOutStatusLabel,
        locationName: checkOutLocationName,
      },
      notes: attData.notes || null,
    };
  },
};
