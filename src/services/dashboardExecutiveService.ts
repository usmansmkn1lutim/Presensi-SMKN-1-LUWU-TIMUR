import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { formatAttendanceError } from './attendanceService';
import { evaluateDailyStatus } from './attendanceStatusService';
import { workScheduleService } from './workScheduleService';
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
  hadir: number;
  pending: number;
  alpha: number;
  lainnya: number;
  total: number;
  percentages: {
    hadir: number;
    pending: number;
    alpha: number;
    lainnya: number;
  };
  onTime: number;
  late: number;
  excused: number;
  absent: number;
}

export interface TrendPoint {
  date: string; // YYYY-MM-DD
  dayName: string; // Senin, Selasa, dst
  shortDate: string; // 13 Okt
  isHoliday: boolean;
  isWeekend: boolean;
  hadirCount: number;
  pendingCount: number;
  alphaCount: number;
  lainnyaCount: number;
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
  thisWeekTrend: TrendPoint[];
  thisMonthTrend: TrendPoint[];
  lastMonthTrend: TrendPoint[];
  leaderboard: DisciplineLeaderboard;
  lastUpdated: string;
}

/**
 * Returns Monday through Friday dates (YYYY-MM-DD) for the calendar week containing targetDateStr.
 * Monday is strictly treated as the start of the week, Saturday and Sunday are excluded.
 */
export function getWeekDatesMonToFri(targetDateStr: string): string[] {
  const [y, m, d] = targetDateStr.split('-').map(Number);
  const targetDateObj = new Date(y, m - 1, d, 12, 0, 0);
  const day = targetDateObj.getDay(); // 0 = Sunday, 1 = Monday, ... 6 = Saturday
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(targetDateObj);
  monday.setDate(targetDateObj.getDate() + diffToMonday);

  const dates: string[] = [];
  for (let i = 0; i < 5; i++) {
    const cur = new Date(monday);
    cur.setDate(monday.getDate() + i);
    const yr = cur.getFullYear();
    const mo = String(cur.getMonth() + 1).padStart(2, '0');
    const da = String(cur.getDate()).padStart(2, '0');
    dates.push(`${yr}-${mo}-${da}`);
  }
  return dates;
}

/**
 * Returns all working days (Monday - Friday) in the specified year and month.
 * Saturday and Sunday are strictly excluded.
 * If maxDateStr is provided and falls within that month, only working days up to maxDateStr are returned.
 */
export function getMonthWorkDays(year: number, month: number, maxDateStr?: string): string[] {
  const totalDaysInMonth = new Date(year, month, 0).getDate();
  let limitDay = totalDaysInMonth;

  if (maxDateStr) {
    const [maxY, maxM, maxD] = maxDateStr.split('-').map(Number);
    if (maxY === year && maxM === month) {
      limitDay = Math.min(totalDaysInMonth, maxD);
    } else if (year > maxY || (year === maxY && month > maxM)) {
      limitDay = 0;
    }
  }

  const dates: string[] = [];
  for (let d = 1; d <= limitDay; d++) {
    const cur = new Date(year, month - 1, d, 12, 0, 0);
    const dayOfWeek = cur.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      const yr = cur.getFullYear();
      const mo = String(cur.getMonth() + 1).padStart(2, '0');
      const da = String(cur.getDate()).padStart(2, '0');
      dates.push(`${yr}-${mo}-${da}`);
    }
  }
  return dates;
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

    const [tYear, tMonth] = todayDate.split('-').map(Number);
    const lastMonthYear = tMonth === 1 ? tYear - 1 : tYear;
    const lastMonthNumber = tMonth === 1 ? 12 : tMonth - 1;
    const lastMonthStart = `${lastMonthYear}-${String(lastMonthNumber).padStart(2, '0')}-01`;

    // Minimum start date covering previous month (for "Bulan lalu"), current month, and this week
    const minStartDate = lastMonthStart < past30Days[0] ? lastMonthStart : past30Days[0];

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

      // Fetch active work schedule and request objects for robust evaluation
      const activeSchedule = await workScheduleService.getActiveWorkSchedule();
      const holidayObjectByDate = new Map<string, any>();
      (holidaysData || []).forEach((h) => {
        if (h.holiday_date) {
          holidayObjectByDate.set(h.holiday_date, h);
        }
      });

      const requestByDateAndEmp = new Map<string, Map<string, any>>();
      approvedRequests.forEach((req) => {
        const empId = req.employee_id;
        if (!empId || !req.start_date || !req.end_date) return;
        const overlappingDates = iterateDateRange(
          req.start_date < minStartDate ? minStartDate : req.start_date,
          req.end_date > todayDate ? todayDate : req.end_date
        );
        overlappingDates.forEach((d) => {
          let empMap = requestByDateAndEmp.get(d);
          if (!empMap) {
            empMap = new Map();
            requestByDateAndEmp.set(d, empMap);
          }
          empMap.set(empId, req);
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
      const todayRequestMap = requestByDateAndEmp.get(todayDate) || new Map();
      const todayHolidayObj = holidayObjectByDate.get(todayDate) || null;
      const currentTime = new Date();

      let presentToday = 0;
      let onTimeToday = 0;
      let lateToday = 0;
      let excusedToday = 0;
      let officialDutyToday = 0;
      let sickToday = 0;
      let permissionToday = 0;
      let leaveToday = 0;
      let absentToday = 0;

      let hadirToday = 0;
      let pendingToday = 0;
      let alphaToday = 0;
      let lainnyaToday = 0;

      activeEmployees.forEach((emp) => {
        const att = todayAttendanceMap.get(emp.id) || null;
        const req = todayRequestMap.get(emp.id) || null;
        const evaluated = evaluateDailyStatus(
          todayDate,
          emp,
          att,
          req,
          todayHolidayObj,
          todayDate,
          activeSchedule,
          currentTime
        );

        // Legacy summary metrics for stat cards
        if (att && att.check_in_at) {
          presentToday++;
          if (att.check_in_status === 'late') {
            lateToday++;
          } else {
            onTimeToday++;
          }
        } else if (req && req.status === 'approved') {
          excusedToday++;
          if (req.request_type === 'official_duty') {
            officialDutyToday++;
          } else if (req.request_type === 'sick') {
            sickToday++;
          } else if (req.request_type === 'leave') {
            leaveToday++;
          } else {
            permissionToday++;
          }
        } else if (evaluated.status === 'absent') {
          absentToday++;
        }

        // 4 Categories mapping
        if (evaluated.status === 'present' || evaluated.status === 'official_duty') {
          hadirToday++;
        } else if (evaluated.status === 'pending') {
          pendingToday++;
        } else if (evaluated.status === 'absent') {
          alphaToday++;
        } else if (
          evaluated.status === 'sick' ||
          evaluated.status === 'permit' ||
          evaluated.status === 'leave'
        ) {
          lainnyaToday++;
        }
      });

      const onTimeRate =
        presentToday > 0 ? Number(((onTimeToday / presentToday) * 100).toFixed(1)) : 0;
      const attendanceRate =
        totalActiveGtk > 0 ? Number(((hadirToday / totalActiveGtk) * 100).toFixed(1)) : 0;

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
      // SECTION B: TODAY DONUT DISTRIBUTION (4 Categories)
      // ==========================================
      const totalPie = totalActiveGtk > 0 ? totalActiveGtk : 1;
      const donutDistribution: TodayDonutDistribution = {
        hadir: hadirToday,
        pending: pendingToday,
        alpha: alphaToday,
        lainnya: lainnyaToday,
        total: totalActiveGtk,
        percentages: {
          hadir: Number(((hadirToday / totalPie) * 100).toFixed(1)),
          pending: Number(((pendingToday / totalPie) * 100).toFixed(1)),
          alpha: Number(((alphaToday / totalPie) * 100).toFixed(1)),
          lainnya: Number(((lainnyaToday / totalPie) * 100).toFixed(1)),
        },
        onTime: onTimeToday,
        late: lateToday,
        excused: excusedToday,
        absent: absentToday,
      };

      // ==========================================
      // HELPER: BUILD TREND POINT
      // ==========================================
      const buildTrendPoint = (dStr: string): TrendPoint => {
        const [y, m, d] = dStr.split('-').map(Number);
        const dayOfWeek = new Date(y, m - 1, d, 12, 0, 0).getDay();
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const isHoliday = holidaySet.has(dStr);

        const dayAttMap = attendanceByDateAndEmp.get(dStr) || new Map();
        const dayReqMap = requestTypeByDateAndEmp.get(dStr) || new Map();
        const dayHolidayObj = holidayObjectByDate.get(dStr) || null;

        let hadirCount = 0;
        let pendingCount = 0;
        let alphaCount = 0;
        let lainnyaCount = 0;

        let pCount = 0;
        let otCount = 0;
        let lCount = 0;
        let eCount = 0;

        activeEmployees.forEach((emp) => {
          const att = dayAttMap.get(emp.id) || null;
          const req = dayReqMap.get(emp.id) || null;
          const evaluated = evaluateDailyStatus(
            dStr,
            emp,
            att,
            req,
            dayHolidayObj,
            todayDate,
            activeSchedule,
            currentTime
          );

          if (evaluated.status === 'present' || evaluated.status === 'official_duty') {
            hadirCount++;
            pCount++;
            if (evaluated.status === 'present') {
              if (evaluated.substatus === 'late') lCount++;
              else otCount++;
            }
          } else if (evaluated.status === 'pending') {
            pendingCount++;
          } else if (evaluated.status === 'absent') {
            alphaCount++;
          } else if (
            evaluated.status === 'sick' ||
            evaluated.status === 'permit' ||
            evaluated.status === 'leave'
          ) {
            lainnyaCount++;
            eCount++;
          }
        });

        const attRate =
          totalActiveGtk > 0 ? Number(((hadirCount / totalActiveGtk) * 100).toFixed(1)) : 0;

        return {
          date: dStr,
          dayName: getDayNameIndonesian(dStr),
          shortDate: formatShortDateLabel(dStr),
          isHoliday,
          isWeekend,
          hadirCount,
          pendingCount,
          alphaCount,
          lainnyaCount,
          presentCount: hadirCount,
          onTimeCount: otCount,
          lateCount: lCount,
          excusedCount: eCount,
          absentCount: alphaCount,
          attendanceRate: attRate,
        };
      };

      // SECTION C: TREND PERIODS (Minggu ini, Bulan ini, Bulan lalu)
      const thisWeekDates = getWeekDatesMonToFri(todayDate);
      const thisMonthDates = getMonthWorkDays(tYear, tMonth, todayDate);
      const lastMonthDates = getMonthWorkDays(lastMonthYear, lastMonthNumber);

      const thisWeekTrend: TrendPoint[] = thisWeekDates.map((dStr) => buildTrendPoint(dStr));
      const thisMonthTrend: TrendPoint[] = thisMonthDates.map((dStr) => buildTrendPoint(dStr));
      const lastMonthTrend: TrendPoint[] = lastMonthDates.map((dStr) => buildTrendPoint(dStr));

      // Fallback untuk backward compatibility
      const weeklyTrend: TrendPoint[] = thisWeekTrend;
      const monthlyTrend: TrendPoint[] = thisMonthTrend;

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
        thisWeekTrend,
        thisMonthTrend,
        lastMonthTrend,
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
