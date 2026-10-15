import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { formatAttendanceError } from './attendanceService';
import {
  getMakassarTodayDateString,
  formatMakassarShortDate,
  getDayNameIndonesian,
  getMonthLabelIndonesian,
  iterateDateRange,
} from './attendanceReportService';

export interface ExecutiveSummary {
  totalActiveGtk: number;
  presentToday: number;
  onTimeToday: number;
  lateToday: number;
  excusedToday: number;
  officialDutyToday: number;
  sickToday: number;
  permissionToday: number;
  leaveToday: number;
  /**
   * Jumlah GTK aktif yang belum melakukan check-in dan tidak memiliki pengajuan izin/cuti/dinas yang disetujui.
   * Pada jam operasional hari berjalan, ini merefleksikan "Belum Presensi".
   * Setelah batas akhir operasional presensi, status ini merefleksikan "Tanpa Keterangan / Alpa".
   */
  absentToday: number;
  onTimeRate: number; // Persentase ketepatan waktu dari seluruh GTK yang hadir (0-100)
  attendanceRate: number; // Persentase kehadiran dari seluruh total GTK aktif (0-100)
  isWeekendToday?: boolean;
  isHolidayToday?: boolean;
  holidayNameToday?: string | null;
}

export interface TodayDonutDistribution {
  onTime: number;
  late: number;
  excused: number;
  absent: number;
  total: number;
  percentages: {
    onTime: number;
    late: number;
    excused: number;
    absent: number;
  };
}

export interface TrendPoint {
  date: string; // YYYY-MM-DD
  dayName: string; // Senin, Selasa, dst
  shortDate: string; // 13 Okt
  isHoliday: boolean;
  isWeekend: boolean;
  presentCount: number;
  onTimeCount: number;
  lateCount: number;
  excusedCount: number;
  absentCount: number;
  attendanceRate: number; // Persentase (0-100)
}

export interface LeaderboardItem {
  employeeId: string;
  fullName: string;
  nip: string | null;
  departmentName: string;
  photoUrl: string | null;
  attendanceCount: number;
  onTimeCount: number;
  lateCount: number;
  excusedCount: number;
  absentCount: number;
  disciplineScore: number; // Rasio on-time terhadap total kehadiran (0-100)
}

export interface DisciplineLeaderboard {
  topDisciplined: LeaderboardItem[];
  topLate: LeaderboardItem[];
  monthLabel: string;
}

export interface ExecutiveDashboardData {
  date: string;
  dateLabel: string;
  summary: ExecutiveSummary;
  donutDistribution: TodayDonutDistribution;
  weeklyTrend: TrendPoint[];
  monthlyTrend: TrendPoint[];
  leaderboard: DisciplineLeaderboard;
  lastUpdated: string;
}

/**
 * Returns past N calendar dates ending on targetDate (YYYY-MM-DD) inclusive
 */
function getPastNDates(targetDateStr: string, n = 7): string[] {
  const [y, m, d] = targetDateStr.split('-').map(Number);
  const targetDateObj = new Date(y, m - 1, d, 12, 0, 0);
  const result: string[] = [];

  for (let i = n - 1; i >= 0; i--) {
    const cur = new Date(targetDateObj);
    cur.setDate(targetDateObj.getDate() - i);
    const yr = cur.getFullYear();
    const mo = String(cur.getMonth() + 1).padStart(2, '0');
    const da = String(cur.getDate()).padStart(2, '0');
    result.push(`${yr}-${mo}-${da}`);
  }

  return result;
}

/**
 * Derives the first day of the month string (YYYY-MM-01) for any given YYYY-MM-DD
 */
function getFirstDayOfMonthForDate(dateStr: string): string {
  const parts = dateStr.split('-');
  return `${parts[0]}-${parts[1]}-01`;
}

/**
 * Format date string to short label like "13 Okt"
 */
function formatShortDateLabel(isoDate: string): string {
  try {
    const [y, m, d] = isoDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d, 12, 0, 0);
    return new Intl.DateTimeFormat('id-ID', {
      day: 'numeric',
      month: 'short',
    }).format(dateObj);
  } catch {
    return isoDate;
  }
}

/**
 * Executive Dashboard Data Service
 * Single source of truth for super_admin, admin, and headmaster managerial dashboard.
 */
export const dashboardExecutiveService = {
  /**
   * Fetches the complete aggregated dashboard executive payload in a single coordinated query set.
   * Avoids waterfall round-trips and keeps data completely consistent.
   */
  async getExecutiveDashboardData(targetDate?: string): Promise<ExecutiveDashboardData> {
    if (!isSupabaseConfigured()) {
      throw new Error('Koneksi ke Supabase belum dikonfigurasi.');
    }

    const todayDate = targetDate || getMakassarTodayDateString();
    const monthStart = getFirstDayOfMonthForDate(todayDate);
    const past7Days = getPastNDates(todayDate, 7);
    const past30Days = getPastNDates(todayDate, 30);

    // Minimum start date covering both the past 30 days and current month-to-date
    const minStartDate = past30Days[0] < monthStart ? past30Days[0] : monthStart;

    try {
      // 1. Fetch active employees with departments
      const { data: employeesData, error: empError } = await supabase
        .from('employees')
        .select(`
          id,
          nip,
          full_name,
          status,
          department_id,
          photo_url,
          departments (
            id,
            name
          )
        `)
        .eq('status', 'active')
        .order('full_name', { ascending: true });

      if (empError) {
        console.error('Error fetching employees for executive dashboard:', empError);
        throw new Error(formatAttendanceError(empError));
      }

      const activeEmployees = employeesData || [];
      const totalActiveGtk = activeEmployees.length;

      // 2. Fetch active holidays in range
      const { data: holidaysData, error: holError } = await supabase
        .from('holidays')
        .select('holiday_date, description')
        .eq('is_active', true)
        .gte('holiday_date', minStartDate)
        .lte('holiday_date', todayDate);

      if (holError) {
        console.warn('Error fetching holidays for executive dashboard:', holError);
      }

      const holidaySet = new Set<string>();
      const holidayMap = new Map<string, string>();
      (holidaysData || []).forEach((h) => {
        if (h.holiday_date) {
          holidaySet.add(h.holiday_date);
          holidayMap.set(h.holiday_date, h.description || 'Hari Libur');
        }
      });

      // 3. Fetch attendance in range
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
        .gte('attendance_date', minStartDate)
        .lte('attendance_date', todayDate);

      if (attError) {
        console.error('Error fetching attendance for executive dashboard:', attError);
        throw new Error(formatAttendanceError(attError));
      }

      const attendanceRows = attendanceData || [];

      // 4. Fetch approved requests overlapping range
      const { data: requestsData, error: reqError } = await supabase
        .from('requests')
        .select('id, employee_id, request_type, start_date, end_date, status')
        .eq('status', 'approved')
        .lte('start_date', todayDate)
        .gte('end_date', minStartDate);

      if (reqError) {
        console.warn('Error fetching requests for executive dashboard:', reqError);
      }

      const approvedRequests = requestsData || [];

      // Map: date -> Map<employee_id, attendanceRow>
      const attendanceByDateAndEmp = new Map<string, Map<string, any>>();
      attendanceRows.forEach((row) => {
        const empId = row.employee_id;
        if (!row.attendance_date || !empId) return;
        let dayMap = attendanceByDateAndEmp.get(row.attendance_date);
        if (!dayMap) {
          dayMap = new Map();
          attendanceByDateAndEmp.set(row.attendance_date, dayMap);
        }
        dayMap.set(empId, row);
      });

      // Map: date -> Set<employee_id> with approved requests
      const excusedByDate = new Map<string, Set<string>>();
      const requestTypeByDateAndEmp = new Map<string, Map<string, string>>();
      approvedRequests.forEach((req) => {
        const empId = req.employee_id;
        if (!empId || !req.start_date || !req.end_date) return;
        const overlappingDates = iterateDateRange(
          req.start_date < minStartDate ? minStartDate : req.start_date,
          req.end_date > todayDate ? todayDate : req.end_date
        );
        overlappingDates.forEach((d) => {
          let s = excusedByDate.get(d);
          if (!s) {
            s = new Set();
            excusedByDate.set(d, s);
          }
          s.add(empId);

          let empMap = requestTypeByDateAndEmp.get(d);
          if (!empMap) {
            empMap = new Map();
            requestTypeByDateAndEmp.set(d, empMap);
          }
          empMap.set(empId, req.request_type);
        });
      });

      // ==========================================
      // SECTION A: SUMMARY TODAY (Cards 1-5)
      // ==========================================
      const [tY, tM, tD] = todayDate.split('-').map(Number);
      const todayDayOfWeek = new Date(tY, tM - 1, tD, 12, 0, 0).getDay();
      const isWeekendToday = todayDayOfWeek === 0 || todayDayOfWeek === 6;
      const isHolidayToday = holidaySet.has(todayDate);
      const holidayNameToday = holidayMap.get(todayDate) || null;

      const todayAttendanceMap = attendanceByDateAndEmp.get(todayDate) || new Map();
      const todayExcusedSet = excusedByDate.get(todayDate) || new Set();
      const todayRequestMap = requestTypeByDateAndEmp.get(todayDate) || new Map();

      let presentToday = 0;
      let onTimeToday = 0;
      let lateToday = 0;
      let excusedToday = 0;
      let officialDutyToday = 0;
      let sickToday = 0;
      let permissionToday = 0;
      let leaveToday = 0;
      let absentToday = 0;

      activeEmployees.forEach((emp) => {
        const att = todayAttendanceMap.get(emp.id);
        // Prioritas 1: Presensi Fisik Tercatat (Physical Attendance Precedence)
        if (att && att.check_in_at) {
          presentToday++;
          if (att.check_in_status === 'late') {
            lateToday++;
          } else {
            // Default on_time jika tidak late
            onTimeToday++;
          }
        }
        // Prioritas 2: Pengajuan Izin/Cuti/Dinas yang Disetujui (Approved Request)
        else if (todayExcusedSet.has(emp.id)) {
          excusedToday++;
          const reqType = todayRequestMap.get(emp.id);
          if (reqType === 'official_duty') {
            officialDutyToday++;
          } else if (reqType === 'sick') {
            sickToday++;
          } else if (reqType === 'leave') {
            leaveToday++;
          } else {
            permissionToday++;
          }
        }
        // Prioritas 3: Belum Presensi / Tanpa Keterangan
        else {
          absentToday++;
        }
      });

      const onTimeRate =
        presentToday > 0 ? Number(((onTimeToday / presentToday) * 100).toFixed(1)) : 0;
      const attendanceRate =
        totalActiveGtk > 0 ? Number(((presentToday / totalActiveGtk) * 100).toFixed(1)) : 0;

      const summary: ExecutiveSummary = {
        totalActiveGtk,
        presentToday,
        onTimeToday,
        lateToday,
        excusedToday,
        officialDutyToday,
        sickToday,
        permissionToday,
        leaveToday,
        absentToday,
        onTimeRate,
        attendanceRate,
        isWeekendToday,
        isHolidayToday,
        holidayNameToday,
      };

      // ==========================================
      // SECTION B: TODAY DONUT DISTRIBUTION
      // ==========================================
      const totalPie = totalActiveGtk > 0 ? totalActiveGtk : 1;
      const donutDistribution: TodayDonutDistribution = {
        onTime: onTimeToday,
        late: lateToday,
        excused: excusedToday,
        absent: absentToday,
        total: totalActiveGtk,
        percentages: {
          onTime: Number(((onTimeToday / totalPie) * 100).toFixed(1)),
          late: Number(((lateToday / totalPie) * 100).toFixed(1)),
          excused: Number(((excusedToday / totalPie) * 100).toFixed(1)),
          absent: Number(((absentToday / totalPie) * 100).toFixed(1)),
        },
      };

      // ==========================================
      // HELPER: BUILD TREND POINT
      // ==========================================
      const buildTrendPoint = (dStr: string): TrendPoint => {
        const [y, m, d] = dStr.split('-').map(Number);
        const dayOfWeek = new Date(y, m - 1, d, 12, 0, 0).getDay(); // 0 Sun, 6 Sat
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isHoliday = holidaySet.has(dStr);

        const dayAttMap = attendanceByDateAndEmp.get(dStr) || new Map();
        const dayExcSet = excusedByDate.get(dStr) || new Set();

        let pCount = 0;
        let otCount = 0;
        let lCount = 0;
        let eCount = 0;
        let abCount = 0;

        activeEmployees.forEach((emp) => {
          const att = dayAttMap.get(emp.id);
          if (att && att.check_in_at) {
            pCount++;
            if (att.check_in_status === 'late') {
              lCount++;
            } else {
              otCount++;
            }
          } else if (dayExcSet.has(emp.id)) {
            eCount++;
          } else {
            // Hanya dihitung alpa jika merupakan hari kerja aktif
            if (!isWeekend && !isHoliday) {
              abCount++;
            }
          }
        });

        // Persentase kehadiran terhadap total GTK aktif
        const attRate =
          totalActiveGtk > 0 ? Number(((pCount / totalActiveGtk) * 100).toFixed(1)) : 0;

        return {
          date: dStr,
          dayName: getDayNameIndonesian(dStr),
          shortDate: formatShortDateLabel(dStr),
          isHoliday,
          isWeekend,
          presentCount: pCount,
          onTimeCount: otCount,
          lateCount: lCount,
          excusedCount: eCount,
          absentCount: abCount,
          attendanceRate: attRate,
        };
      };

      // SECTION C: WEEKLY TREND (Past 7 Days inclusive)
      const weeklyTrend: TrendPoint[] = past7Days.map((dStr) => buildTrendPoint(dStr));

      // SECTION D: MONTHLY TREND (Past 30 Days inclusive)
      const monthlyTrend: TrendPoint[] = past30Days.map((dStr) => buildTrendPoint(dStr));

      // ==========================================
      // SECTION E: DISCIPLINE LEADERBOARD (Month-to-Date)
      // ==========================================
      const monthDates = iterateDateRange(monthStart, todayDate);

      const leaderboardItems: LeaderboardItem[] = activeEmployees.map((emp) => {
        let attendanceCount = 0;
        let onTimeCount = 0;
        let lateCount = 0;
        let excusedCount = 0;
        let absentCount = 0;

        monthDates.forEach((dStr) => {
          const [y, m, d] = dStr.split('-').map(Number);
          const dayOfWeek = new Date(y, m - 1, d, 12, 0, 0).getDay();
          const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
          const isHoliday = holidaySet.has(dStr);

          const dayAttMap = attendanceByDateAndEmp.get(dStr);
          const att = dayAttMap ? dayAttMap.get(emp.id) : null;
          const dayExcSet = excusedByDate.get(dStr);
          const isExcused = dayExcSet ? dayExcSet.has(emp.id) : false;

          if (att && att.check_in_at) {
            attendanceCount++;
            if (att.check_in_status === 'late') {
              lateCount++;
            } else {
              onTimeCount++;
            }
          } else if (isExcused) {
            excusedCount++;
          } else if (!isWeekend && !isHoliday) {
            absentCount++;
          }
        });

        // Skor Disiplin: rasio ketepatan waktu terhadap total hari hadir (0-100)
        // Jika belum hadir sama sekali, skor 0
        const disciplineScore =
          attendanceCount > 0 ? Number(((onTimeCount / attendanceCount) * 100).toFixed(1)) : 0;

        const deptObj = Array.isArray(emp.departments)
          ? emp.departments[0]
          : emp.departments;
        const departmentName = deptObj?.name || 'Belum Ditentukan';

        return {
          employeeId: emp.id,
          fullName: emp.full_name,
          nip: emp.nip || null,
          departmentName,
          photoUrl: emp.photo_url || null,
          attendanceCount,
          onTimeCount,
          lateCount,
          excusedCount,
          absentCount,
          disciplineScore,
        };
      });

      // Top 5 Terdisiplin:
      // Syarat adil: Pegawai harus memiliki riwayat kehadiran (attendanceCount > 0)
      // agar pegawai cuti/izin sebulan penuh tidak masuk nominasi secara keliru.
      // Prioritas urutan (Multi-level Tie-Breaker):
      // 1. onTimeCount terbanyak (jumlah hadir tepat waktu)
      // 2. disciplineScore tertinggi (persentase ketepatan waktu)
      // 3. lateCount terendah (keterlambatan paling sedikit)
      // 4. attendanceCount tertinggi (total dedikasi kehadiran)
      // 5. Nama lengkap alfabetis
      const topDisciplined = [...leaderboardItems]
        .filter((item) => item.attendanceCount > 0)
        .sort((a, b) => {
          if (b.onTimeCount !== a.onTimeCount) return b.onTimeCount - a.onTimeCount;
          if (b.disciplineScore !== a.disciplineScore) return b.disciplineScore - a.disciplineScore;
          if (a.lateCount !== b.lateCount) return a.lateCount - b.lateCount;
          if (b.attendanceCount !== a.attendanceCount) return b.attendanceCount - a.attendanceCount;
          return a.fullName.localeCompare(b.fullName);
        })
        .slice(0, 5);

      // Top 5 Paling Sering Terlambat:
      // Hanya menghitung GTK yang memiliki riwayat terlambat (lateCount > 0).
      // Prioritas urutan:
      // 1. lateCount terbanyak
      // 2. attendanceCount terbanyak
      // 3. Nama lengkap alfabetis
      const topLate = [...leaderboardItems]
        .filter((item) => item.lateCount > 0)
        .sort((a, b) => {
          if (b.lateCount !== a.lateCount) return b.lateCount - a.lateCount;
          if (b.attendanceCount !== a.attendanceCount) return b.attendanceCount - a.attendanceCount;
          return a.fullName.localeCompare(b.fullName);
        })
        .slice(0, 5);

      const leaderboard: DisciplineLeaderboard = {
        topDisciplined,
        topLate,
        monthLabel: getMonthLabelIndonesian(monthStart),
      };

      return {
        date: todayDate,
        dateLabel: formatMakassarShortDate(todayDate),
        summary,
        donutDistribution,
        weeklyTrend,
        monthlyTrend,
        leaderboard,
        lastUpdated: new Date().toISOString(),
      };
    } catch (error: any) {
      console.error('Error compiling executive dashboard data:', error);
      throw new Error(error?.message || 'Gagal memuat data dashboard eksekutif.');
    }
  },

  /**
   * Fetches only the executive summary cards data for a given date
   */
  async getSummary(date?: string): Promise<ExecutiveSummary> {
    const data = await this.getExecutiveDashboardData(date);
    return data.summary;
  },

  /**
   * Fetches attendance trends (week or month)
   */
  async getTrends(
    range: 'week' | 'month' = 'week',
    targetDate?: string
  ): Promise<TrendPoint[]> {
    const data = await this.getExecutiveDashboardData(targetDate);
    return range === 'week' ? data.weeklyTrend : data.monthlyTrend;
  },

  /**
   * Fetches the leaderboard for the current month
   */
  async getLeaderboard(targetDate?: string): Promise<DisciplineLeaderboard> {
    const data = await this.getExecutiveDashboardData(targetDate);
    return data.leaderboard;
  },
};
