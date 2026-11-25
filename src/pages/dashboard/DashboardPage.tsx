import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  MapPin,
  CalendarCheck,
  FileText,
  LogIn,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Info,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  UserX,
  Calendar,
  HeartPulse,
  Briefcase,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useProfileMenu } from '../../context/ProfileMenuContext';
import { UserAvatar } from '../../components/ui/UserAvatar';
import {
  dashboardAttendanceService,
  DashboardAttendanceSummary,
} from '../../services/dashboardAttendanceService';
import { attendanceService } from '../../services/attendanceService';
import {
  attendanceStatusService,
  EvaluatedStatusResult,
} from '../../services/attendanceStatusService';
import { getMakassarTodayDateString } from '../../services/attendanceReportService';
import { AttendanceModel } from '../../types/attendance.types';
import { AttendanceHistoryRecord } from '../../types/attendanceHistory.types';
import { HistoryDetailModal } from '../../components/history/HistoryDetailModal';
import { HistoryMobileList } from '../../components/history/HistoryMobileList';
import { APP_CONFIG } from '../../config/appConfig';
import { NotificationBell } from '../../components/notifications/NotificationBell';
import { Button } from '../../components/ui/Button';
import { ExecutiveStatCards } from '../../components/dashboard/ExecutiveStatCards';
import { AttendanceTrendChart } from '../../components/dashboard/AttendanceTrendChart';
import { AttendanceDonutChart } from '../../components/dashboard/AttendanceDonutChart';
import { DisciplineLeaderboard } from '../../components/dashboard/DisciplineLeaderboard';
import {
  MonitoringIcon,
  WorkScheduleIcon,
  LocationIcon,
  HolidayIcon,
  AttendanceHistoryIcon,
  RequestIcon,
} from '../../components/dashboard/QuickMenuIcons';
import {
  dashboardExecutiveService,
  ExecutiveDashboardData,
} from '../../services/dashboardExecutiveService';

interface OfficialWeeklySummary {
  present: number;
  sick: number;
  permit: number;
  officialDuty: number;
  leave: number;
  absent: number;
}


const WeeklyDateCapsules: React.FC<{ records: AttendanceHistoryRecord[] }> = ({ records }) => {
  const todayStr = getMakassarTodayDateString();
  const [year, month, day] = todayStr.split('-').map(Number);
  const todayDate = new Date(year, month - 1, day);
  const dayOfWeek = todayDate.getDay();
  const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const mondayDate = new Date(year, month - 1, day - diffToMonday);

  const days = [0, 1, 2, 3, 4, 5, 6].map((i) => {
    const d = new Date(mondayDate);
    d.setDate(mondayDate.getDate() + i);
    return {
      dateStr: [
        d.getFullYear(),
        String(d.getMonth() + 1).padStart(2, '0'),
        String(d.getDate()).padStart(2, '0'),
      ].join('-'),
      dayName: ['SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB', 'MIN'][i],
      dayNum: d.getDate(),
      isWeekend: i === 5 || i === 6,
    };
  });

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'present': return 'bg-green-600';
      case 'sick':
      case 'permit':
      case 'official_duty':
      case 'leave': return 'bg-amber-500';
      case 'absent': return 'bg-red-600';
      default: return 'bg-slate-300 dark:bg-[#525252]';
    }
  };

  return (
    <div className="grid grid-cols-7 gap-1.5 pb-2">
      {days.map((day) => {
        const record = records.find((r) => r.attendance_date === day.dateStr);
        const isToday = day.dateStr === todayStr;
        const isHoliday = record?.official_status === 'holiday';
        const isSpecialDay = isHoliday || day.isWeekend;
        const hasStatus = Boolean(record && record.official_status && record.official_status !== 'holiday');
        const isPresent = record?.official_status === 'present';

        const bgColor = isToday ? 'bg-[#111827] dark:bg-[#431F0B] lg:bg-[#F97316] dark:lg:bg-[#F97316]' : 'bg-white dark:bg-[#262626]';
        const textColor = isToday ? 'text-white' : (isSpecialDay ? 'text-[#DC2626] dark:text-red-400' : 'text-[#111827] dark:text-[#F9FAFB]');
        const shadow = isToday ? '' : 'shadow-[0_2px_8px_rgba(15,23,42,0.06)] dark:shadow-none';
        const borderColor = isToday ? 'border-[#E5E7EB] dark:border-transparent dark:lg:border-[#F97316]' : 'border-[#E5E7EB] dark:border-[#404040]';

        return (
          <div
            key={day.dateStr}
            className={`relative rounded-xl lg:rounded-full h-[88px] lg:h-[108px] flex flex-col items-center justify-center gap-1 ${bgColor} ${shadow} border ${borderColor}`}
          >
            <span className={`text-[10px] font-bold ${textColor}`}>{day.dayName}</span>
            <span className={`text-sm sm:text-base font-bold ${textColor}`}>{day.dayNum}</span>

            {/* Ikon api dekoratif khusus status Hadir (hanya mobile/tablet: 13x16px object-contain) */}
            <div className="h-4 flex items-center justify-center lg:hidden">
              {isPresent ? (
                <img
                  src="/assets/icons/flame.svg"
                  alt=""
                  aria-hidden="true"
                  className="w-[13px] h-4 object-contain shrink-0"
                />
              ) : (
                <div className="w-[13px] h-4" />
              )}
            </div>

            {isToday ? (
              <div
                className={`w-3 h-1 absolute bottom-0 left-1/2 -translate-x-1/2 rounded-none lg:static lg:bottom-auto lg:left-auto lg:translate-x-0 lg:mt-1 lg:rounded-full ${
                  hasStatus ? getStatusColor(record?.official_status) : 'bg-white lg:hidden'
                }`}
              />
            ) : (
              !isSpecialDay && hasStatus && (
                <div
                  className={`w-3 h-1 absolute bottom-0 left-1/2 -translate-x-1/2 rounded-none lg:static lg:bottom-auto lg:left-auto lg:translate-x-0 lg:mt-1 lg:rounded-full ${getStatusColor(
                    record?.official_status
                  )}`}
                />
              )
            )}
          </div>
        );
      })}
    </div>
  );
};

export const DashboardPage: React.FC = () => {
  const { user, profile, loading: authLoading, logout } = useAuth();
  const { openMenu } = useProfileMenu();
  const navigate = useNavigate();

  // Role separation:
  // - employee: Personal Attendance Dashboard
  // - super_admin, admin, headmaster: Managerial Executive Dashboard
  const isManagerial =
    profile?.role === 'super_admin' ||
    profile?.role === 'admin' ||
    profile?.role === 'headmaster';

  // Current real-time clock & formatted date (WITA)
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDateFormatted, setCurrentDateFormatted] = useState<string>('');
  const [greeting, setGreeting] = useState<string>('Selamat Pagi');

  // Managerial / Executive dashboard state
  const [execData, setExecData] = useState<ExecutiveDashboardData | null>(null);
  const [execLoading, setExecLoading] = useState<boolean>(isManagerial);
  const [execError, setExecError] = useState<string | null>(null);
  const [execRefreshing, setExecRefreshing] = useState<boolean>(false);

  // Employee personal state
  const [loading, setLoading] = useState<boolean>(!isManagerial);
  const [error, setError] = useState<string | null>(null);
  const [isUnlinked, setIsUnlinked] = useState<boolean>(false);

  // Today's actual attendance record
  const [todayAttendance, setTodayAttendance] = useState<AttendanceModel | null>(null);
  const [todayEvaluatedRecord, setTodayEvaluatedRecord] = useState<EvaluatedStatusResult | null>(null);

  // Weekly attendance status recap & records (Monday to Today)
  const [weeklySummary, setWeeklySummary] = useState<OfficialWeeklySummary | null>(null);
  const [weeklyRecords, setWeeklyRecords] = useState<AttendanceHistoryRecord[]>([]);
  const [historyRecords, setHistoryRecords] = useState<AttendanceHistoryRecord[]>([]);
  const [selectedHistoryRecord, setSelectedHistoryRecord] = useState<AttendanceHistoryRecord | null>(null);

  // Monthly summary state (for desktop view compatibility)
  const [monthlySummary, setMonthlySummary] = useState<DashboardAttendanceSummary | null>(null);
  const [isQuickMenuExpanded, setIsQuickMenuExpanded] = useState<boolean>(false);

  const fetchExecutiveData = async (isManualRefresh = false) => {
    if (!isManagerial) return;
    if (isManualRefresh) {
      setExecRefreshing(true);
    } else {
      setExecLoading(true);
    }
    setExecError(null);

    try {
      const data = await dashboardExecutiveService.getExecutiveDashboardData();
      setExecData(data);
    } catch (err: any) {
      console.error('Failed to load executive dashboard data:', err);
      setExecError(err?.message || 'Gagal memuat data ringkasan eksekutif.');
    } finally {
      setExecLoading(false);
      setExecRefreshing(false);
    }
  };

  const handleRefreshExecutive = () => {
    fetchExecutiveData(true);
  };

  useEffect(() => {
    if (profile?.role === 'headmaster' && user) {
      const fetchHeadmasterWeekly = async () => {
        try {
          const employee = await attendanceService.getCurrentEmployee(user.id);
          const todayStr = getMakassarTodayDateString();
          const [year, month, day] = todayStr.split('-').map(Number);
          const todayDate = new Date(year, month - 1, day);
          const dayOfWeek = todayDate.getDay();
          const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
          const mondayDate = new Date(year, month - 1, day - diffToMonday);
          const mondayStr = [
            mondayDate.getFullYear(),
            String(mondayDate.getMonth() + 1).padStart(2, '0'),
            String(mondayDate.getDate()).padStart(2, '0'),
          ].join('-');

          const historyMatrix = await attendanceStatusService.getEvaluatedMatrix(
            mondayStr,
            todayStr,
            employee.id
          );

          const weeklyCardRecords = historyMatrix
            .filter((r) => r.status !== 'holiday')
            .sort((a, b) => b.date.localeCompare(a.date))
            .map((r) => ({
              id: r.sourceId || `weekly-${r.date}`,
              employee_id: employee.id,
              attendance_date: r.date,
              check_in_at: r.checkInAt,
              check_out_at: r.checkOutAt,
              check_in_status: r.substatus,
              official_status: r.status,
            })) as unknown as AttendanceHistoryRecord[];
          setWeeklyRecords(weeklyCardRecords);
        } catch (err) {
          console.error('Failed to fetch headmaster weekly records:', err);
        }
      };
      fetchHeadmasterWeekly();
    }
  }, [profile?.role, user]);

  const fetchPersonalDashboardData = async () => {
    if (isManagerial || authLoading || !user) return;
    setLoading(true);
    setError(null);
    setIsUnlinked(false);

    try {
      const employee = await attendanceService.getCurrentEmployee(user.id);

      // 1. Fetch today's actual attendance record from public.attendance
      const todayAtt = await attendanceService.getTodayAttendance(user.id);
      setTodayAttendance(todayAtt);

      // 2. Compute date bounds (Asia/Makassar):
      // - Weekly bounds: Monday up to Today for WeeklyDateCapsules and weeklySummary
      // - History bounds: 30 days back up to Today for recent workdays history cards
      const todayStr = getMakassarTodayDateString();
      const [year, month, day] = todayStr.split('-').map(Number);
      const todayDate = new Date(year, month - 1, day);
      const dayOfWeek = todayDate.getDay(); // 0 = Sunday, 1 = Monday, ...
      const diffToMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
      const mondayDate = new Date(year, month - 1, day - diffToMonday);
      const mondayStr = [
        mondayDate.getFullYear(),
        String(mondayDate.getMonth() + 1).padStart(2, '0'),
        String(mondayDate.getDate()).padStart(2, '0'),
      ].join('-');

      // Helper to filter workdays (Monday-Friday, excluding official holidays and weekends)
      const filterWorkdays = (items: EvaluatedStatusResult[]) => {
        return items.filter((r) => {
          if (r.status === 'holiday') return false;
          const [y, m, d] = r.date.split('-').map(Number);
          const dateObj = new Date(y, m - 1, d, 12, 0, 0);
          const dayNum = dateObj.getDay(); // 0 = Sunday, 1 = Monday, ..., 5 = Friday, 6 = Saturday
          return dayNum >= 1 && dayNum <= 5;
        });
      };

      // 30 days initial lookback
      let currentLookbackDays = 30;
      const historyStartDateObj = new Date(year, month - 1, day - currentLookbackDays);
      const historyStartDateStr = [
        historyStartDateObj.getFullYear(),
        String(historyStartDateObj.getMonth() + 1).padStart(2, '0'),
        String(historyStartDateObj.getDate()).padStart(2, '0'),
      ].join('-');

      // 3. Evaluate official matrix for initial 30 days history up to today
      const historyMatrix = await attendanceStatusService.getEvaluatedMatrix(
        historyStartDateStr,
        todayStr,
        employee.id
      );

      // Today's evaluated record
      const todayRec = historyMatrix.find((r) => r.date === todayStr) || null;
      setTodayEvaluatedRecord(todayRec);

      // 4. Calculate 3x2 weekly official summary (Monday to Today)
      const weeklyMatrix = historyMatrix.filter((r) => r.date >= mondayStr && r.date <= todayStr);
      const summary: OfficialWeeklySummary = {
        present: weeklyMatrix.filter((r) => r.status === 'present').length,
        sick: weeklyMatrix.filter((r) => r.status === 'sick').length,
        permit: weeklyMatrix.filter((r) => r.status === 'permit').length,
        officialDuty: weeklyMatrix.filter((r) => r.status === 'official_duty').length,
        leave: weeklyMatrix.filter((r) => r.status === 'leave').length,
        absent: weeklyMatrix.filter((r) => r.status === 'absent').length,
      };
      setWeeklySummary(summary);

      // 5. Weekly records for WeeklyDateCapsules (Monday to Today)
      const weeklyCardRecords: AttendanceHistoryRecord[] = weeklyMatrix
        .filter((r) => r.status !== 'holiday')
        .sort((a, b) => b.date.localeCompare(a.date))
        .map((r) => ({
          id: r.sourceId || `weekly-${r.date}`,
          employee_id: employee.id,
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
      setWeeklyRecords(weeklyCardRecords);

      // 6. Recent 5 workday history records for "RIWAYAT KEHADIRAN ANDA"
      // Filter workdays from initial 30 days
      let collectedWorkdays = filterWorkdays(historyMatrix);

      // If fewer than 5 workdays found, expand backwards in steps (30 days per chunk) without repeating queries
      const STEP_DAYS = 30;
      const MAX_LOOKBACK_DAYS = 180; // Maximum boundary (~6 months) to avoid infinite expansion

      while (collectedWorkdays.length < 5 && currentLookbackDays < MAX_LOOKBACK_DAYS) {
        const nextLookbackDays = Math.min(currentLookbackDays + STEP_DAYS, MAX_LOOKBACK_DAYS);
        const chunkStartObj = new Date(year, month - 1, day - nextLookbackDays);
        const chunkEndObj = new Date(year, month - 1, day - (currentLookbackDays + 1));

        const chunkStartStr = [
          chunkStartObj.getFullYear(),
          String(chunkStartObj.getMonth() + 1).padStart(2, '0'),
          String(chunkStartObj.getDate()).padStart(2, '0'),
        ].join('-');

        const chunkEndStr = [
          chunkEndObj.getFullYear(),
          String(chunkEndObj.getMonth() + 1).padStart(2, '0'),
          String(chunkEndObj.getDate()).padStart(2, '0'),
        ].join('-');

        const chunkMatrix = await attendanceStatusService.getEvaluatedMatrix(
          chunkStartStr,
          chunkEndStr,
          employee.id
        );

        const chunkWorkdays = filterWorkdays(chunkMatrix);
        collectedWorkdays = [...collectedWorkdays, ...chunkWorkdays];
        currentLookbackDays = nextLookbackDays;

        if (chunkMatrix.length === 0) {
          break;
        }
      }

      const recentWorkdayRecords: AttendanceHistoryRecord[] = collectedWorkdays
        .sort((a, b) => b.date.localeCompare(a.date))
        .slice(0, 5)
        .map((r) => ({
          id: r.sourceId || `history-${r.date}`,
          employee_id: employee.id,
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
      setHistoryRecords(recentWorkdayRecords);

      // 6. Fetch monthly summary for desktop compatibility
      try {
        const mRes = await dashboardAttendanceService.getMonthlySummary();
        setMonthlySummary(mRes);
      } catch (mErr) {
        console.warn('Desktop monthly summary fetch warning:', mErr);
      }
    } catch (err: any) {
      console.error('Failed to load employee dashboard data:', err);
      const msg = err?.message || 'Gagal memuat data presensi pegawai.';
      if (msg === 'Sesi telah berakhir. Silakan login kembali.' || msg.includes('Sesi telah berakhir')) {
        await logout();
        navigate('/login', { replace: true });
        return;
      }
      setError(msg);
      if (
        msg.includes('belum terhubung') ||
        msg.includes('tidak ditemukan') ||
        msg.includes('belum dikaitkan')
      ) {
        setIsUnlinked(true);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading || !user) return;

    let isMounted = true;
    if (isManagerial) {
      setExecLoading(true);
      setExecError(null);
      const isHeadmaster = profile?.role === 'headmaster';
      Promise.all([
        dashboardExecutiveService.getExecutiveDashboardData(),
        isHeadmaster ? attendanceService.getTodayAttendance(user.id).catch(() => null) : Promise.resolve(null),
        isHeadmaster
          ? attendanceService.getCurrentEmployee(user.id).then(async (emp) => {
              if (!emp) return null;
              const todayStr = getMakassarTodayDateString();
              const matrix = await attendanceStatusService.getEvaluatedMatrix(todayStr, todayStr, emp.id).catch(() => []);
              return matrix.find((r) => r.date === todayStr) || null;
            }).catch(() => null)
          : Promise.resolve(null)
      ])
        .then(([data, todayAtt, todayRec]) => {
          if (isMounted) {
            setExecData(data);
            setTodayAttendance(todayAtt);
            setTodayEvaluatedRecord(todayRec);
            setExecLoading(false);
          }
        })
        .catch((err: any) => {
          if (isMounted) {
            console.error('Failed to load executive dashboard data:', err);
            setExecError(err?.message || 'Gagal memuat data ringkasan eksekutif.');
            setExecLoading(false);
          }
        });
    } else {
      fetchPersonalDashboardData();
    }

    return () => {
      isMounted = false;
    };
  }, [isManagerial, authLoading, user?.id, profile?.role]);

  // Real-time clock & dynamic greeting in Asia/Makassar (WITA)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();

      // Dynamic greeting in Asia/Makassar
      try {
        const formatter = new Intl.DateTimeFormat('en-US', {
          timeZone: 'Asia/Makassar',
          hour: 'numeric',
          minute: 'numeric',
          hour12: false,
        });
        const parts = formatter.formatToParts(now);
        const hour = parseInt(parts.find((p) => p.type === 'hour')?.value || '12', 10);
        const minute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
        const timeVal = hour + minute / 60;

        if (timeVal >= 5 && timeVal < 12) setGreeting('Selamat Pagi');
        else if (timeVal >= 12 && timeVal < 15) setGreeting('Selamat Siang');
        else if (timeVal >= 15 && timeVal < 18.5) setGreeting('Selamat Sore');
        else setGreeting('Selamat Malam');
      } catch {
        const hour = (new Date().getUTCHours() + 8) % 24;
        if (hour >= 5 && hour < 12) setGreeting('Selamat Pagi');
        else if (hour >= 12 && hour < 15) setGreeting('Selamat Siang');
        else if (hour >= 15 && hour < 18) setGreeting('Selamat Sore');
        else setGreeting('Selamat Malam');
      }

      // Indonesian date formatting
      const dayName = new Intl.DateTimeFormat('id-ID', { weekday: 'long' }).format(now);
      const dateNum = now.getDate();
      const monthName = new Intl.DateTimeFormat('id-ID', { month: 'long' }).format(now);
      const yearNum = now.getFullYear();

      setCurrentDateFormatted(`${dayName}, ${dateNum} ${monthName} ${yearNum}`);

      const timeStr = now.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });

      setCurrentTime(timeStr);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const fullName = profile?.full_name || user?.name || 'Pegawai';
  const schoolName = user?.schoolName || (profile as any)?.school_name || APP_CONFIG.schoolName;
  const positionTitle =
    user?.position ||
    (profile?.role === 'headmaster'
      ? 'Kepala Sekolah'
      : profile?.role === 'super_admin'
      ? 'Super Administrator'
      : profile?.role === 'admin'
      ? 'Administrator Sekolah'
      : 'Guru / Tenaga Pendidik');

  // Helper to format transaction time into HH:mm WITA or fallback --:-- WITA
  const formatAttendanceTime = (isoString?: string | null): string => {
    if (!isoString) return '--:-- WITA';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return '--:-- WITA';
      const timeFormatted = new Intl.DateTimeFormat('id-ID', {
        timeZone: 'Asia/Makassar',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(d);
      return `${timeFormatted.replace('.', ':')} WITA`;
    } catch {
      return '--:-- WITA';
    }
  };

  // Determine canonical status title for Hero Card
  const getTodayDisplayStatus = (): string => {
    // 1. Approved Request active for today (Sick, Other/Izin, Official Duty, Leave)
    if (todayEvaluatedRecord?.source === 'request') {
      if (todayEvaluatedRecord.status === 'sick') return 'Sakit';
      if (todayEvaluatedRecord.status === 'permit') return 'Izin';
      if (todayEvaluatedRecord.status === 'official_duty') return 'Dinas Luar';
      if (todayEvaluatedRecord.status === 'leave') return 'Cuti';
      return todayEvaluatedRecord.statusLabel || 'Izin';
    }

    // 2. Physical Check-in present
    if (todayAttendance?.check_in_at || todayEvaluatedRecord?.status === 'present') {
      return 'Hadir';
    }

    // 3. Holiday / Weekend
    if (todayEvaluatedRecord?.status === 'holiday') {
      return todayEvaluatedRecord.notes || 'Libur';
    }

    // 4. Default condition before attendance on a running work day:
    // "Jika hari kerja sedang berjalan, belum ada check-in, tidak ada approved request yang berlaku, maka tampilkan: Anda belum melakukan presensi"
    return 'Anda belum melakukan presensi';
  };

  const isApprovedRequestActive = todayEvaluatedRecord?.source === 'request';
  const displayCheckInTime = isApprovedRequestActive
    ? '--:-- WITA'
    : formatAttendanceTime(todayAttendance?.check_in_at);
  const displayCheckOutTime = isApprovedRequestActive
    ? '--:-- WITA'
    : formatAttendanceTime(todayAttendance?.check_out_at);


  // =========================================================================
  // VIEW 1: MANAGERIAL EXECUTIVE DASHBOARD (Super Admin, Admin & Headmaster)
  // =========================================================================
  if (isManagerial) {
    return (
      <div className="space-y-5 pb-8 font-sans max-w-7xl mx-auto">
        {/* 1. Mobile & Tablet Dynamic Greeting & User Identity (< 1024px) */}
        <div className="lg:hidden flex items-center justify-between gap-2 py-2 font-sans">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <UserAvatar
              userId={user?.id}
              avatarUrl={profile?.avatar_url || user?.avatarUrl}
              photoUrl={user?.photoUrl}
              name={fullName}
              className="w-11 h-11 rounded-full object-cover border border-[#E5E7EB] dark:border-[#404040] shrink-0 shadow-2xs"
            />
            <div className="space-y-0.5 flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#111827] dark:text-[#F9FAFB]">
                {greeting},
              </p>
              <h2 className="text-sm sm:text-base font-bold text-[#111827] dark:text-[#F9FAFB] truncate">
                {fullName}
              </h2>
            </div>
          </div>
          <div className="shrink-0">
            <NotificationBell />
          </div>
        </div>

        {/* Global Error Banner if Executive Fetch Fails */}
        {execError && (
          <div className="bg-amber-50 dark:bg-[#451A03]/60 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-4 text-amber-800 dark:text-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs sm:text-sm shadow-2xs">
            <div className="flex items-center gap-2.5 min-w-0">
              <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <div>
                <p className="font-semibold text-amber-950 dark:text-amber-100">Terjadi Kendala Memuat Data Manajerial</p>
                <p className="text-amber-800 dark:text-amber-200/90 text-xs mt-0.5">{execError}</p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefreshExecutive}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              className="text-xs shrink-0 self-end sm:self-auto bg-white border-amber-300 hover:bg-amber-50 dark:bg-[#262626] dark:border-amber-700/60 dark:text-amber-200 dark:hover:bg-[#303030]"
            >
              Coba Lagi
            </Button>
          </div>
        )}

        {/* 1. EXECUTIVE STAT CARDS */}
        <section aria-label="Ringkasan Statistik Eksekutif">
          <ExecutiveStatCards
            summary={execData?.summary ?? null}
            loading={execLoading}
            role={profile?.role}
            schoolName={schoolName}
            currentDateFormatted={currentDateFormatted}
            todayDisplayStatus={getTodayDisplayStatus()}
            displayCheckInTime={displayCheckInTime}
            displayCheckOutTime={displayCheckOutTime}
            dateLabel={execData?.dateLabel}
            lastUpdated={execData?.lastUpdated}
            presentWithDutyCount={execData?.donutDistribution?.hadir}
            checkInOnTimeEnd={execData?.checkInOnTimeEnd}
          />
        </section>

        {/* 1.5. Headmaster Weekly Date Capsules (lg:hidden) */}
        {profile?.role === 'headmaster' && weeklyRecords.length > 0 && (
          <section aria-label="Rekap Presensi Mingguan Kepala Sekolah" className="lg:hidden">
            <WeeklyDateCapsules records={weeklyRecords} />
          </section>
        )}

        {/* 1.6. Mobile Managerial Quick Access Menu (Grid 1x4, lg:hidden) */}
        <section aria-label="Menu Akses Cepat Manajerial Mobile" className="lg:hidden">
          <div className="bg-white dark:bg-[#262626] border border-[#E5E7EB] dark:border-[#404040] rounded-2xl p-3 shadow-2xs space-y-2.5">
            {profile?.role === 'headmaster' && (
              <div className="flex items-center justify-between px-1 pb-0.5">
                <span className="text-xs font-bold text-[#111827] dark:text-[#F9FAFB]">Menu Utama</span>
                <button
                  type="button"
                  onClick={() => setIsQuickMenuExpanded(!isQuickMenuExpanded)}
                  className="flex items-center gap-1 text-xs font-medium text-[#6B7280] dark:text-[#A3A3A3] hover:text-[#111827] dark:hover:text-[#F9FAFB] transition-colors cursor-pointer"
                >
                  <span>{isQuickMenuExpanded ? 'Tampilkan Lebih Sedikit' : 'Tampilkan Semua'}</span>
                  {isQuickMenuExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            )}
            <div className="grid grid-cols-4 gap-2">
              {(profile?.role === 'headmaster'
                ? isQuickMenuExpanded
                  ? [
                      { label: 'Monitoring', path: '/attendance-monitoring', Icon: MonitoringIcon },
                      { label: 'Jadwal Kerja', path: '/schedules', Icon: WorkScheduleIcon },
                      { label: 'Lokasi', path: '/locations', Icon: LocationIcon },
                      { label: 'Hari Libur', path: '/holidays', Icon: HolidayIcon },
                      { label: 'Riwayat Presensi', path: '/history', Icon: AttendanceHistoryIcon },
                      { label: 'Permohonan', path: '/requests', Icon: RequestIcon },
                    ]
                  : [
                      { label: 'Monitoring', path: '/attendance-monitoring', Icon: MonitoringIcon },
                      { label: 'Jadwal Kerja', path: '/schedules', Icon: WorkScheduleIcon },
                      { label: 'Lokasi', path: '/locations', Icon: LocationIcon },
                      { label: 'Hari Libur', path: '/holidays', Icon: HolidayIcon },
                    ]
                : [
                    { label: 'Monitoring', path: '/attendance-monitoring', Icon: MonitoringIcon },
                    { label: 'Jadwal Kerja', path: '/schedules', Icon: WorkScheduleIcon },
                    { label: 'Lokasi', path: '/locations', Icon: LocationIcon },
                    { label: 'Hari Libur', path: '/holidays', Icon: HolidayIcon },
                  ]
              ).map((menu) => (
                <button
                  key={menu.path}
                  type="button"
                  onClick={() => navigate(menu.path)}
                  className="flex flex-col items-center justify-start px-1 py-2 sm:p-2 rounded-xl bg-transparent hover:bg-slate-100 dark:hover:bg-[#303030] active:bg-slate-200 dark:active:bg-[#404040] transition-colors cursor-pointer group"
                >
                  <div className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center mb-1 group-hover:scale-105 transition-transform">
                    <menu.Icon className="w-7 h-7 sm:w-8 sm:h-8 shrink-0" />
                  </div>
                  <span className="text-[10px] sm:text-[11px] font-semibold text-[#3B485A] dark:text-[#E5E5E5] text-center leading-tight line-clamp-2 w-full">
                    {menu.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* 2. CHARTS SECTION (TREN & DISTRIBUSI PRESENSI) */}
        <section aria-label="Visualisasi Tren dan Distribusi Presensi">
          <div className="flex lg:grid lg:grid-cols-12 gap-4 lg:gap-5 overflow-x-auto pb-3 snap-x snap-mandatory scrollbar-none items-stretch">
            <div className="w-full lg:w-auto lg:min-w-0 lg:col-span-7 shrink-0 snap-center flex flex-col">
              <AttendanceTrendChart
                weeklyTrend={execData?.weeklyTrend}
                monthlyTrend={execData?.monthlyTrend}
                thisWeekTrend={execData?.thisWeekTrend}
                thisMonthTrend={execData?.thisMonthTrend}
                lastMonthTrend={execData?.lastMonthTrend}
                totalActiveGtk={execData?.summary?.totalActiveGtk}
                loading={execLoading}
                className="h-full flex flex-col"
              />
            </div>
            <div className="w-full lg:w-auto lg:min-w-0 lg:col-span-5 shrink-0 snap-center flex flex-col">
              <AttendanceDonutChart
                distribution={execData?.donutDistribution}
                loading={execLoading}
                dateLabel={execData?.dateLabel}
                isNonWorkingDay={
                  execData?.summary?.isWeekendToday || execData?.summary?.isHolidayToday
                }
                holidayName={execData?.summary?.holidayNameToday}
                className="h-full flex flex-col"
              />
            </div>
          </div>
        </section>

        {/* 3. DISCIPLINE LEADERBOARD */}
        <section aria-label="Papan Peringkat Kedisiplinan GTK">
          <DisciplineLeaderboard
            leaderboard={execData?.leaderboard ?? null}
            loading={execLoading}
            error={execError}
            horizontalScrollMobile={isManagerial}
          />
        </section>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: PERSONAL ATTENDANCE DASHBOARD (Employee)
  // =========================================================================
  return (
    <div className="space-y-5 pb-8 font-sans max-w-5xl mx-auto">
      {/* 1. Mobile & Tablet Dynamic Greeting & User Identity (< 1024px, pada desktop ditangani oleh Header) */}
      <div className="lg:hidden flex items-center justify-between gap-2 py-2 font-sans">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <UserAvatar
            userId={user?.id}
            avatarUrl={profile?.avatar_url || user?.avatarUrl}
            photoUrl={user?.photoUrl}
            name={fullName}
            className="w-11 h-11 rounded-full object-cover border border-[#E5E7EB] dark:border-[#404040] shrink-0 shadow-2xs"
          />
          <div className="space-y-0.5 flex-1 min-w-0">
            <p className="text-xs font-semibold text-[#111827] dark:text-[#F9FAFB]">
              {greeting},
            </p>
            <h2 className="text-sm sm:text-base font-bold text-[#111827] dark:text-[#F9FAFB] truncate">
              {fullName}
            </h2>
          </div>
        </div>
        <div className="shrink-0">
          <NotificationBell />
        </div>
      </div>

      {/* 2. Mobile & Tablet Card Presensi Hari Ini (< 1024px) */}
      <div className="lg:hidden relative overflow-hidden bg-gradient-to-br from-[#FB923C] via-[#F97316] to-[#EA580C] text-white rounded-2xl p-4 sm:p-5 shadow-md space-y-3.5 font-sans">
        {/* Geometric Minimalist Background Pattern */}
        <div className="absolute inset-0 opacity-12 pointer-events-none overflow-hidden rounded-2xl">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
            <defs>
              <pattern id="geometric-pattern-personal-mobile" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M0 20 L20 0 L40 20 L20 40 Z" fill="none" stroke="currentColor" strokeWidth="1" />
                <circle cx="20" cy="20" r="2" fill="currentColor" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#geometric-pattern-personal-mobile)" className="text-white" />
          </svg>
        </div>

        {/* Row 1: Nama Sekolah & Lokasi */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 pb-2.5 border-b border-white/20 relative z-10">
          <h3 className="font-bold text-base sm:text-lg text-white tracking-tight drop-shadow-2xs">
            {schoolName}
          </h3>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-white/95">
            <MapPin className="w-3.5 h-3.5 text-white shrink-0" />
            <span>Malili, Luwu Timur</span>
          </div>
        </div>

        {/* Row 2: Status Header (PRESENSI HARI INI & Tanggal) + Status Display */}
        <div className="pt-0.5 pb-0.5 relative z-10 space-y-1">
          {/* Baris 1: PRESENSI HARI INI (Kiri) & Tanggal (Kanan) */}
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
            <span className="text-[11px] sm:text-sm font-bold uppercase tracking-normal sm:tracking-wider text-white drop-shadow-2xs whitespace-nowrap">
              PRESENSI HARI INI
            </span>
            <div className="flex items-center gap-1 sm:gap-1.5 text-[11px] sm:text-sm font-medium text-orange-100/95 shrink-0">
              <Calendar className="w-3 h-3 sm:w-4 sm:h-4 text-white shrink-0" />
              <span>{currentDateFormatted || 'Memuat tanggal...'}</span>
            </div>
          </div>

          {/* Baris 2: Status / Reminder */}
          <p className="text-base sm:text-lg font-extrabold text-white tracking-tight drop-shadow-2xs">
            {getTodayDisplayStatus()}
          </p>
        </div>

        {/* Row 4: Check-in & Check-out COMBINED SINGLE CARD DISPLAY-ONLY (CENTER ALIGNED, NO ICONS, VERTICAL SEPARATOR) */}
        <div className="bg-white dark:bg-[#262626] rounded-xl py-3 px-2 sm:px-4 shadow-xs text-[#111827] dark:text-[#F9FAFB] relative z-10">
          <div className="grid grid-cols-2 divide-x divide-slate-200 dark:divide-[#404040]">
            {/* Kolom Kiri: Check-in */}
            <div className="flex flex-col items-center justify-center text-center px-2">
              <span className="text-[11px] sm:text-xs font-semibold text-[#6B7280] dark:text-[#A3A3A3] leading-tight">
                Check-in
              </span>
              <span className="text-sm sm:text-base font-bold text-[#111827] dark:text-[#F9FAFB] leading-tight mt-1 tabular-nums">
                {displayCheckInTime}
              </span>
            </div>

            {/* Kolom Kanan: Check-out */}
            <div className="flex flex-col items-center justify-center text-center px-2">
              <span className="text-[11px] sm:text-xs font-semibold text-[#6B7280] dark:text-[#A3A3A3] leading-tight">
                Check-out
              </span>
              <span className="text-sm sm:text-base font-bold text-[#111827] dark:text-[#F9FAFB] leading-tight mt-1 tabular-nums">
                {displayCheckOutTime}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Hero Banner (>= 1024px - Untouched existing) */}
      <div className="hidden lg:block relative overflow-hidden bg-gradient-to-br from-[#FB923C] via-[#F97316] to-[#EA580C] text-white rounded-2xl p-6 shadow-md space-y-3.5">
        <div className="absolute inset-0 opacity-12 pointer-events-none overflow-hidden rounded-2xl">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
            <defs>
              <pattern id="geometric-pattern-personal" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M0 20 L20 0 L40 20 L20 40 Z" fill="none" stroke="currentColor" strokeWidth="1" />
                <circle cx="20" cy="20" r="2" fill="currentColor" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#geometric-pattern-personal)" className="text-white" />
          </svg>
        </div>

        <div className="min-w-0 relative z-10">
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight truncate drop-shadow-2xs">
            {fullName}
          </h1>
          <p className="text-base font-medium text-orange-100/95 tracking-wide truncate mt-0.5">
            {positionTitle}
          </p>
        </div>

        <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/20 text-sm relative z-10">
          <div className="text-left font-medium text-orange-100 truncate">
            {currentDateFormatted || 'Memuat tanggal...'}
          </div>
          <div className="text-right flex items-center justify-end gap-1.5 shrink-0 font-semibold text-white">
            <MapPin className="w-3.5 h-3.5 text-white shrink-0" />
            <span>Malili, Luwu Timur</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 pt-1.5 relative z-10">
          <div className="bg-white dark:bg-[#262626] rounded-xl px-4 py-3.5 flex items-center gap-3 shadow-xs text-[#111827] dark:text-[#F9FAFB]">
            <div className="w-9 h-9 rounded-lg bg-orange-50 dark:bg-[#431F0B] text-[#F97316] flex items-center justify-center shrink-0">
              <LogIn className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div className="text-left min-w-0 flex-1">
              <p className="font-bold text-sm text-[#6B7280] dark:text-[#A3A3A3] leading-tight">Check-in</p>
              <p className="text-base font-bold text-[#111827] dark:text-[#F9FAFB] leading-tight mt-0.5 tabular-nums">
                {formatAttendanceTime(todayAttendance?.check_in_at)}
              </p>
            </div>
          </div>

          <div className="bg-white dark:bg-[#262626] rounded-xl px-4 py-3.5 flex items-center gap-3 shadow-xs text-[#111827] dark:text-[#F9FAFB]">
            <div className="w-9 h-9 rounded-lg bg-red-50 dark:bg-[#450A0A] text-[#EF4444] dark:text-red-400 flex items-center justify-center shrink-0">
              <LogOut className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div className="text-left min-w-0 flex-1">
              <p className="font-bold text-sm text-[#6B7280] dark:text-[#A3A3A3] leading-tight">Check-out</p>
              <p className="text-base font-bold text-[#111827] dark:text-[#F9FAFB] leading-tight mt-0.5 tabular-nums">
                {formatAttendanceTime(todayAttendance?.check_out_at)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* UNLINKED ACCOUNT STATE */}
      {isUnlinked ? (
        <div className="bg-amber-50/70 dark:bg-[#451A03]/40 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-2xs font-sans">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 dark:bg-[#451A03] text-amber-700 dark:text-amber-400 border border-amber-300 dark:border-amber-700/60 flex items-center justify-center mx-auto">
            <UserX className="w-7 h-7" />
          </div>

          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-base sm:text-lg font-bold text-amber-950 dark:text-amber-100">
              Akun Anda Belum Terhubung dengan Data Pegawai
            </h3>
            <p className="text-xs sm:text-sm text-amber-800 dark:text-amber-200/90 leading-relaxed">
              Akun login Anda belum ditautkan ke profil pegawai sekolah pada SIM Master Pegawai. Silakan hubungi administrator sekolah untuk menghubungkan akun pengguna Anda.
            </p>
          </div>

          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchPersonalDashboardData}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              Segarkan Halaman
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Error Banner */}
          {error && (
            <div className="bg-amber-50 dark:bg-[#451A03]/60 border border-amber-200 dark:border-amber-800/60 rounded-2xl p-4 text-amber-800 dark:text-amber-200 flex items-center justify-between gap-3 text-xs sm:text-sm">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>{error}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchPersonalDashboardData}
                leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
                className="text-xs shrink-0"
              >
                Coba Lagi
              </Button>
            </div>
          )}

          {/* 3. Mobile & Tablet: REKAP PRESENSI MINGGU INI (3 x 2 Matrix) (< 1024px) */}
          <WeeklyDateCapsules records={weeklyRecords} />
          
          {/* 3. Mobile & Tablet: RIWAYAT KEHADIRAN ANDA (< 1024px) */}
          <div className="lg:hidden space-y-3 font-sans">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#A3A3A3]">
              RIWAYAT KEHADIRAN ANDA
            </h3>
            {loading ? (
              <div className="space-y-3 animate-pulse" aria-busy="true" aria-label="Memuat riwayat kehadiran">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="bg-white dark:bg-[#262626] border border-[#E5E7EB] dark:border-[#404040] rounded-2xl p-3.5 sm:p-4 shadow-2xs flex items-center gap-3.5 sm:gap-4"
                  >
                    <div className="w-16 h-16 sm:w-[72px] sm:h-[72px] aspect-square rounded-xl bg-[#F3F4F6] dark:bg-[#303030] shrink-0" />
                    <div className="flex-1 min-w-0 space-y-2">
                      <div className="grid grid-cols-3 divide-x divide-slate-100 dark:divide-[#303030]">
                        {[1, 2, 3].map((col) => (
                          <div key={col} className="px-1 flex flex-col items-center gap-1">
                            <div className="h-3.5 sm:h-4 bg-[#E5E7EB] dark:bg-[#404040] rounded w-10" />
                            <div className="h-2.5 bg-[#F3F4F6] dark:bg-[#303030] rounded w-11" />
                          </div>
                        ))}
                      </div>
                      <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-slate-100 dark:border-[#303030]">
                        <div className="h-3 bg-[#F3F4F6] dark:bg-[#303030] rounded w-28" />
                        <div className="h-3 bg-[#E5E7EB] dark:bg-[#404040] rounded w-12" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : historyRecords.length === 0 ? (
              <div className="bg-white dark:bg-[#262626] border border-[#E5E7EB] dark:border-[#404040] rounded-2xl p-8 text-center text-xs text-slate-500 dark:text-[#A3A3A3]">
                Tidak ada catatan presensi pada periode ini.
              </div>
            ) : (
              <HistoryMobileList
                records={historyRecords}
                onSelectRecord={setSelectedHistoryRecord}
              />
            )}
          </div>

          {/* Desktop Only: Rekap Kehadiran Bulan Ini (>= 1024px) */}
          <div className="hidden lg:block space-y-3 font-sans">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#A3A3A3]">
                RINGKASAN KEHADIRAN BULAN INI
              </h2>
              <span className="text-xs text-[#9CA3AF] dark:text-[#737373]">Periode Aktif</span>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white dark:bg-[#262626] border border-[#E5E7EB] dark:border-[#404040] rounded-xl p-4 text-center shadow-2xs">
                <span className="text-xs font-medium text-[#6B7280] dark:text-[#A3A3A3]">Hadir Tepat Waktu</span>
                <p className="text-2xl font-bold text-[#111827] dark:text-[#F9FAFB] mt-1 tabular-nums">
                  {monthlySummary?.onTimeCount ?? 0}
                </p>
                <span className="text-[11px] text-[#9CA3AF] dark:text-[#737373]">hari</span>
              </div>
              <div className="bg-white dark:bg-[#262626] border border-[#E5E7EB] dark:border-[#404040] rounded-xl p-4 text-center shadow-2xs">
                <span className="text-xs font-medium text-[#6B7280] dark:text-[#A3A3A3]">Terlambat</span>
                <p className="text-2xl font-bold text-[#111827] dark:text-[#F9FAFB] mt-1 tabular-nums">
                  {monthlySummary?.lateCount ?? 0}
                </p>
                <span className="text-[11px] text-[#9CA3AF] dark:text-[#737373]">kali</span>
              </div>
              <div className="bg-white dark:bg-[#262626] border border-[#E5E7EB] dark:border-[#404040] rounded-xl p-4 text-center shadow-2xs">
                <span className="text-xs font-medium text-[#6B7280] dark:text-[#A3A3A3]">Izin / Sakit / Dinas</span>
                <p className="text-2xl font-bold text-[#111827] dark:text-[#F9FAFB] mt-1 tabular-nums">
                  {monthlySummary?.approvedRequestDays ?? 0}
                </p>
                <span className="text-[11px] text-[#9CA3AF] dark:text-[#737373]">hari</span>
              </div>
              <div className="bg-white dark:bg-[#262626] border border-[#E5E7EB] dark:border-[#404040] rounded-xl p-4 text-center shadow-2xs">
                <span className="text-xs font-medium text-[#6B7280] dark:text-[#A3A3A3]">Tanpa Keterangan</span>
                <p className="text-2xl font-bold text-[#111827] dark:text-[#F9FAFB] mt-1 tabular-nums">
                  {monthlySummary?.absentCount ?? 0}
                </p>
                <span className="text-[11px] text-[#9CA3AF] dark:text-[#737373]">hari</span>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Detail Modal for Selected History Record */}
      <HistoryDetailModal
        record={selectedHistoryRecord}
        onClose={() => setSelectedHistoryRecord(null)}
      />

      {/* Quick Action Navigation Cards (DESKTOP ONLY: >= 1024px) */}
      <div className="hidden lg:block space-y-3 font-sans">
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-[#A3A3A3]">
          AKSI CEPAT
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => navigate('/requests')}
            className="p-4 rounded-2xl bg-white dark:bg-[#262626] border border-[#E5E7EB] dark:border-[#404040] hover:border-orange-300 dark:hover:border-[#F97316]/60 hover:bg-[#FFF7ED]/30 dark:hover:bg-[#303030] text-left transition-all flex items-center justify-between group cursor-pointer shadow-2xs"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#FFF7ED] dark:bg-[#431F0B] border border-[#FFEDD5] dark:border-[#9A3412]/50 text-[#F97316] flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#111827] dark:text-[#F9FAFB] group-hover:text-[#F97316] transition-colors truncate">
                  Ajukan Izin / Cuti
                </p>
                <p className="text-xs text-[#6B7280] dark:text-[#A3A3A3] truncate">Form permohonan dinas, sakit & cuti</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#9CA3AF] dark:text-[#737373] group-hover:text-[#F97316] transition-colors shrink-0 ml-2" />
          </button>

          <button
            onClick={() => navigate('/history')}
            className="p-4 rounded-2xl bg-white dark:bg-[#262626] border border-[#E5E7EB] dark:border-[#404040] hover:border-orange-300 dark:hover:border-[#F97316]/60 hover:bg-[#FFF7ED]/30 dark:hover:bg-[#303030] text-left transition-all flex items-center justify-between group cursor-pointer shadow-2xs"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#FFF7ED] dark:bg-[#431F0B] border border-[#FFEDD5] dark:border-[#9A3412]/50 text-[#F97316] flex items-center justify-center shrink-0">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#111827] dark:text-[#F9FAFB] group-hover:text-[#F97316] transition-colors truncate">
                  Riwayat Presensi
                </p>
                <p className="text-xs text-[#6B7280] dark:text-[#A3A3A3] truncate">Cek kalender dan catatan kehadiran</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#9CA3AF] dark:text-[#737373] group-hover:text-[#F97316] transition-colors shrink-0 ml-2" />
          </button>

          <button
            onClick={() => navigate('/profile')}
            className="p-4 rounded-2xl bg-white dark:bg-[#262626] border border-[#E5E7EB] dark:border-[#404040] hover:border-orange-300 dark:hover:border-[#F97316]/60 hover:bg-[#FFF7ED]/30 dark:hover:bg-[#303030] text-left transition-all flex items-center justify-between group cursor-pointer shadow-2xs"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#FFF7ED] dark:bg-[#431F0B] border border-[#FFEDD5] dark:border-[#9A3412]/50 text-[#F97316] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#111827] dark:text-[#F9FAFB] group-hover:text-[#F97316] transition-colors truncate">
                  Kelengkapan Profil
                </p>
                <p className="text-xs text-[#6B7280] dark:text-[#A3A3A3] truncate">Cek data NIP, jabatan & akun</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#9CA3AF] dark:text-[#737373] group-hover:text-[#F97316] transition-colors shrink-0 ml-2" />
          </button>
        </div>
      </div>
    </div>
  );
};

