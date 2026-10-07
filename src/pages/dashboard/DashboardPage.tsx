import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
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
  Users,
  BarChart3,
  Calendar,
  Settings,
  Eye,
  HeartPulse,
  Briefcase,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
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
import { HistoryMobileList } from '../../components/history/HistoryMobileList';
import { HistoryDetailModal } from '../../components/history/HistoryDetailModal';
import { APP_CONFIG } from '../../config/appConfig';
import { Button } from '../../components/ui/Button';

interface OfficialWeeklySummary {
  present: number;
  sick: number;
  permit: number;
  officialDuty: number;
  leave: number;
  absent: number;
}

export const DashboardPage: React.FC = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  // Role separation:
  // - employee & headmaster: Personal Attendance Dashboard
  // - admin & super_admin: Administrative Management Portal
  const isAdmin = profile?.role === 'super_admin' || profile?.role === 'admin';

  // Current real-time clock & formatted date (WITA)
  const [currentTime, setCurrentTime] = useState<string>('');
  const [currentDateFormatted, setCurrentDateFormatted] = useState<string>('');
  const [greeting, setGreeting] = useState<string>('Selamat Pagi');

  // Employee personal state
  const [loading, setLoading] = useState<boolean>(!isAdmin);
  const [error, setError] = useState<string | null>(null);
  const [isUnlinked, setIsUnlinked] = useState<boolean>(false);

  // Today's actual attendance record
  const [todayAttendance, setTodayAttendance] = useState<AttendanceModel | null>(null);
  const [todayEvaluatedRecord, setTodayEvaluatedRecord] = useState<EvaluatedStatusResult | null>(null);

  // Weekly attendance status recap & records (Monday to Today)
  const [weeklySummary, setWeeklySummary] = useState<OfficialWeeklySummary | null>(null);
  const [weeklyRecords, setWeeklyRecords] = useState<AttendanceHistoryRecord[]>([]);
  const [selectedHistoryRecord, setSelectedHistoryRecord] = useState<AttendanceHistoryRecord | null>(null);

  // Monthly summary state (for desktop view compatibility)
  const [monthlySummary, setMonthlySummary] = useState<DashboardAttendanceSummary | null>(null);

  const fetchPersonalDashboardData = async () => {
    if (isAdmin) return;
    setLoading(true);
    setError(null);
    setIsUnlinked(false);

    try {
      const employee = await attendanceService.getCurrentEmployee();

      // 1. Fetch today's actual attendance record from public.attendance
      const todayAtt = await attendanceService.getTodayAttendance();
      setTodayAttendance(todayAtt);

      // 2. Compute weekly bounds: Monday up to Today (Asia/Makassar)
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

      // 3. Evaluate official matrix for Monday to Today
      const matrix = await attendanceStatusService.getEvaluatedMatrix(
        mondayStr,
        todayStr,
        employee.id
      );
      const todayRec = matrix.find((r) => r.date === todayStr) || null;
      setTodayEvaluatedRecord(todayRec);

      // 4. Calculate 3x2 weekly official summary
      const summary: OfficialWeeklySummary = {
        present: matrix.filter((r) => r.status === 'present').length,
        sick: matrix.filter((r) => r.status === 'sick').length,
        permit: matrix.filter((r) => r.status === 'permit').length,
        officialDuty: matrix.filter((r) => r.status === 'official_duty').length,
        leave: matrix.filter((r) => r.status === 'leave').length,
        absent: matrix.filter((r) => r.status === 'absent').length,
      };
      setWeeklySummary(summary);

      // 5. Map weekly records sorted newest to oldest (terbaru -> terlama)
      // Excludes holidays from attendance history cards per domain rule
      const records: AttendanceHistoryRecord[] = matrix
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
      setWeeklyRecords(records);

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
    if (!isAdmin) {
      fetchPersonalDashboardData();
    }
  }, [isAdmin]);

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

  // Weekly summary items in exact 3x2 matrix order
  const weeklyItems = [
    {
      key: 'present',
      title: 'Hadir',
      value: weeklySummary?.present ?? 0,
      icon: <CheckCircle2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#F97316]" />,
    },
    {
      key: 'sick',
      title: 'Sakit',
      value: weeklySummary?.sick ?? 0,
      icon: <HeartPulse className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#F97316]" />,
    },
    {
      key: 'permit',
      title: 'Izin',
      value: weeklySummary?.permit ?? 0,
      icon: <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#F97316]" />,
    },
    {
      key: 'official_duty',
      title: 'Dinas Luar',
      value: weeklySummary?.officialDuty ?? 0,
      icon: <Briefcase className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#F97316]" />,
    },
    {
      key: 'leave',
      title: 'Cuti',
      value: weeklySummary?.leave ?? 0,
      icon: <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#F97316]" />,
    },
    {
      key: 'absent',
      title: 'Alpha',
      value: weeklySummary?.absent ?? 0,
      icon: <UserX className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#F97316]" />,
    },
  ];

  // =========================================================================
  // VIEW 1: ADMINISTRATOR MANAGEMENT PORTAL (Admin & Super Admin)
  // =========================================================================
  if (isAdmin) {
    return (
      <div className="space-y-6 pb-8 font-sans max-w-5xl mx-auto">
        {/* Admin Hero Banner */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#FB923C] via-[#F97316] to-[#EA580C] text-white rounded-2xl p-4 sm:p-5 md:p-6 shadow-md space-y-3 sm:space-y-3.5">
          {/* Geometric Minimalist Background Pattern */}
          <div className="absolute inset-0 opacity-12 pointer-events-none overflow-hidden rounded-2xl">
            <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
              <defs>
                <pattern id="geometric-pattern-admin" width="40" height="40" patternUnits="userSpaceOnUse">
                  <path d="M0 20 L20 0 L40 20 L20 40 Z" fill="none" stroke="currentColor" strokeWidth="1" />
                  <circle cx="20" cy="20" r="2" fill="currentColor" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#geometric-pattern-admin)" className="text-white" />
            </svg>
          </div>

          <div className="min-w-0 relative z-10">
            <span className="inline-block text-[11px] sm:text-xs font-bold uppercase tracking-wider bg-white/20 backdrop-blur-xs px-2.5 py-0.5 rounded-full text-white mb-1.5">
              Panel Administrator
            </span>
            <h1 className="text-[22px] sm:text-[26px] md:text-[32px] font-extrabold text-white tracking-tight truncate drop-shadow-2xs">
              {fullName}
            </h1>
            <p className="text-sm sm:text-base font-medium text-orange-100/95 tracking-wide truncate mt-0.5">
              {positionTitle}
            </p>
          </div>

          {/* Date & Location Bar */}
          <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/20 text-xs sm:text-sm relative z-10">
            <div className="text-left font-medium text-orange-100 truncate">
              {currentDateFormatted || 'Memuat tanggal...'}
            </div>
            <div className="text-right flex items-center justify-end gap-1.5 shrink-0 font-semibold text-white">
              <MapPin className="w-3.5 h-3.5 text-white shrink-0" />
              <span>Malili, Luwu Timur</span>
            </div>
          </div>
        </div>

        {/* Administrator Primary Management Tools */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            MENU UTAMA ADMINISTRATOR
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {/* 1. Monitoring Presensi */}
            <button
              onClick={() => navigate('/attendance-monitoring')}
              className="p-4 rounded-2xl bg-white border border-[#E5E7EB] hover:border-orange-300 hover:bg-[#FFF7ED]/30 text-left transition-all flex items-center justify-between group cursor-pointer shadow-2xs"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#FFF7ED] border border-[#FFEDD5] text-[#F97316] flex items-center justify-center shrink-0">
                  <Eye className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#111827] group-hover:text-[#F97316] transition-colors truncate">
                    Monitoring Presensi
                  </p>
                  <p className="text-xs text-[#6B7280] truncate">Pantau presensi masuk & pulang hari ini</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#F97316] transition-colors shrink-0 ml-2" />
            </button>

            {/* 2. Verifikasi Pengajuan */}
            <button
              onClick={() => navigate('/requests')}
              className="p-4 rounded-2xl bg-white border border-[#E5E7EB] hover:border-orange-300 hover:bg-[#FFF7ED]/30 text-left transition-all flex items-center justify-between group cursor-pointer shadow-2xs"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#FFF7ED] border border-[#FFEDD5] text-[#F97316] flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#111827] group-hover:text-[#F97316] transition-colors truncate">
                    Verifikasi Pengajuan
                  </p>
                  <p className="text-xs text-[#6B7280] truncate">Review izin, sakit, dinas & cuti</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#F97316] transition-colors shrink-0 ml-2" />
            </button>

            {/* 3. Data Pegawai */}
            <button
              onClick={() => navigate('/employees')}
              className="p-4 rounded-2xl bg-white border border-[#E5E7EB] hover:border-orange-300 hover:bg-[#FFF7ED]/30 text-left transition-all flex items-center justify-between group cursor-pointer shadow-2xs"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#FFF7ED] border border-[#FFEDD5] text-[#F97316] flex items-center justify-center shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#111827] group-hover:text-[#F97316] transition-colors truncate">
                    Master Data Pegawai
                  </p>
                  <p className="text-xs text-[#6B7280] truncate">Kelola pegawai, NIP & akun</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#F97316] transition-colors shrink-0 ml-2" />
            </button>

            {/* 4. Laporan & Rekapitulasi */}
            <button
              onClick={() => navigate('/reports')}
              className="p-4 rounded-2xl bg-white border border-[#E5E7EB] hover:border-orange-300 hover:bg-[#FFF7ED]/30 text-left transition-all flex items-center justify-between group cursor-pointer shadow-2xs"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#FFF7ED] border border-[#FFEDD5] text-[#F97316] flex items-center justify-center shrink-0">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#111827] group-hover:text-[#F97316] transition-colors truncate">
                    Laporan Presensi
                  </p>
                  <p className="text-xs text-[#6B7280] truncate">Rekap bulanan & ekspor Excel/PDF</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#F97316] transition-colors shrink-0 ml-2" />
            </button>

            {/* 5. Hari Libur Sekolah */}
            <button
              onClick={() => navigate('/holidays')}
              className="p-4 rounded-2xl bg-white border border-[#E5E7EB] hover:border-orange-300 hover:bg-[#FFF7ED]/30 text-left transition-all flex items-center justify-between group cursor-pointer shadow-2xs"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#FFF7ED] border border-[#FFEDD5] text-[#F97316] flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#111827] group-hover:text-[#F97316] transition-colors truncate">
                    Hari Libur Sekolah
                  </p>
                  <p className="text-xs text-[#6B7280] truncate">Kalender libur & cuti bersama</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#F97316] transition-colors shrink-0 ml-2" />
            </button>

            {/* 6. Pengaturan Sistem */}
            <button
              onClick={() => navigate('/settings')}
              className="p-4 rounded-2xl bg-white border border-[#E5E7EB] hover:border-orange-300 hover:bg-[#FFF7ED]/30 text-left transition-all flex items-center justify-between group cursor-pointer shadow-2xs"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-[#FFF7ED] border border-[#FFEDD5] text-[#F97316] flex items-center justify-center shrink-0">
                  <Settings className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#111827] group-hover:text-[#F97316] transition-colors truncate">
                    Pengaturan Sistem
                  </p>
                  <p className="text-xs text-[#6B7280] truncate">Konfigurasi jadwal & radius lokasi</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#F97316] transition-colors shrink-0 ml-2" />
            </button>
          </div>
        </div>

        {/* Information Note */}
        <div className="p-4 rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB] flex items-start sm:items-center gap-3 text-xs sm:text-sm text-[#6B7280]">
          <Clock className="w-4 h-4 text-[#F97316] shrink-0 mt-0.5 sm:mt-0" />
          <div>
            <span className="font-semibold text-[#111827]">Waktu Sistem Aktual:</span> Jam operasional presensi mengikuti zona waktu Indonesia Tengah (WITA). Saat ini: <span className="font-mono font-bold text-[#111827]">{currentTime || '--:--:--'} WITA</span>.
          </div>
        </div>
      </div>
    );
  }

  // =========================================================================
  // VIEW 2: PERSONAL ATTENDANCE DASHBOARD (Employee & Headmaster)
  // =========================================================================
  return (
    <div className="space-y-5 pb-8 font-sans max-w-5xl mx-auto">
      {/* 1. Mobile & Tablet Dynamic Greeting & User Identity (< 1024px) */}
      <div className="lg:hidden space-y-0.5 font-sans">
        <p className="text-xs sm:text-sm font-medium text-[#6B7280]">
          {greeting},
        </p>
        <h2 className="text-lg sm:text-xl font-bold text-[#111827] tracking-tight">
          {fullName}
        </h2>
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

        {/* Row 2: Tanggal Hari Ini */}
        <div className="flex items-center gap-2 text-xs sm:text-sm font-medium text-orange-100 relative z-10">
          <Calendar className="w-4 h-4 text-white shrink-0" />
          <span>{currentDateFormatted || 'Memuat tanggal...'}</span>
        </div>

        {/* Row 3: Status Section (PRESENSI HARI INI) */}
        <div className="pt-1 pb-0.5 relative z-10 space-y-1">
          <p className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-orange-100/90">
            PRESENSI HARI INI
          </p>
          <p className="text-base sm:text-lg font-extrabold text-white tracking-tight">
            {getTodayDisplayStatus()}
          </p>
        </div>

        {/* Row 4: Check-in & Check-out COMBINED SINGLE CARD DISPLAY-ONLY (CENTER ALIGNED, NO ICONS, VERTICAL SEPARATOR) */}
        <div className="bg-white rounded-xl py-3 px-2 sm:px-4 shadow-xs text-[#111827] relative z-10">
          <div className="grid grid-cols-2 divide-x divide-slate-200">
            {/* Kolom Kiri: Check-in */}
            <div className="flex flex-col items-center justify-center text-center px-2">
              <span className="text-[11px] sm:text-xs font-semibold text-[#6B7280] leading-tight">
                Check-in
              </span>
              <span className="text-sm sm:text-base font-bold text-[#111827] leading-tight mt-1 tabular-nums">
                {displayCheckInTime}
              </span>
            </div>

            {/* Kolom Kanan: Check-out */}
            <div className="flex flex-col items-center justify-center text-center px-2">
              <span className="text-[11px] sm:text-xs font-semibold text-[#6B7280] leading-tight">
                Check-out
              </span>
              <span className="text-sm sm:text-base font-bold text-[#111827] leading-tight mt-1 tabular-nums">
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
          <div className="bg-white rounded-xl px-4 py-3.5 flex items-center gap-3 shadow-xs text-[#111827]">
            <div className="w-9 h-9 rounded-lg bg-orange-50 text-[#F97316] flex items-center justify-center shrink-0">
              <LogIn className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div className="text-left min-w-0 flex-1">
              <p className="font-bold text-sm text-[#6B7280] leading-tight">Check-in</p>
              <p className="text-base font-bold text-[#111827] leading-tight mt-0.5 tabular-nums">
                {formatAttendanceTime(todayAttendance?.check_in_at)}
              </p>
            </div>
          </div>

          <div className="bg-white rounded-xl px-4 py-3.5 flex items-center gap-3 shadow-xs text-[#111827]">
            <div className="w-9 h-9 rounded-lg bg-red-50 text-[#EF4444] flex items-center justify-center shrink-0">
              <LogOut className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div className="text-left min-w-0 flex-1">
              <p className="font-bold text-sm text-[#6B7280] leading-tight">Check-out</p>
              <p className="text-base font-bold text-[#111827] leading-tight mt-0.5 tabular-nums">
                {formatAttendanceTime(todayAttendance?.check_out_at)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* UNLINKED ACCOUNT STATE */}
      {isUnlinked ? (
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-2xs font-sans">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 border border-amber-300 flex items-center justify-center mx-auto">
            <UserX className="w-7 h-7" />
          </div>

          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-base sm:text-lg font-bold text-amber-950">
              Akun Anda Belum Terhubung dengan Data Pegawai
            </h3>
            <p className="text-xs sm:text-sm text-amber-800 leading-relaxed">
              Akun login Anda belum ditautkan ke profil pegawai sekolah pada SIM Master Pegawai. Silakan hubungi administrator sekolah untuk menghubungkan akun pengguna Anda.
            </p>
          </div>

          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchPersonalDashboardData}
              className="text-xs"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Segarkan Halaman
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Error Banner */}
          {error && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-amber-800 flex items-center justify-between gap-3 text-xs sm:text-sm">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <span>{error}</span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchPersonalDashboardData}
                className="text-xs shrink-0"
              >
                <RefreshCw className="w-3.5 h-3.5 mr-1" />
                Coba Lagi
              </Button>
            </div>
          )}

          {/* 3. Mobile & Tablet: REKAP PRESENSI MINGGU INI (3 x 2 Matrix) (< 1024px) */}
          <div className="lg:hidden space-y-2.5 sm:space-y-3 font-sans">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                REKAP PRESENSI MINGGU INI
              </h2>
              <span className="text-[11px] text-[#9CA3AF]">Senin s/d Hari Ini</span>
            </div>

            <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
              {weeklyItems.map((item) => (
                <div
                  key={item.key}
                  className="relative bg-white border border-[#E5E7EB] rounded-2xl p-3 sm:p-4 min-h-[96px] sm:min-h-[108px] shadow-2xs flex flex-col items-center justify-center text-center group"
                >
                  {/* Icon Orange Sunset pojok kanan atas */}
                  <div className="absolute top-2.5 right-2.5 sm:top-3 sm:right-3 w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-[#FFF7ED] border border-[#FFEDD5] flex items-center justify-center shrink-0">
                    {item.icon}
                  </div>

                  {/* Angka & Label Center */}
                  <div className="flex flex-col items-center justify-center pt-2 sm:pt-2.5">
                    <span className="text-2xl sm:text-3xl font-bold text-[#111827] tracking-tight tabular-nums leading-none">
                      {loading ? (
                        <span className="animate-pulse inline-block w-6 h-6 bg-slate-200 rounded" />
                      ) : (
                        item.value
                      )}
                    </span>
                    <span className="text-xs sm:text-sm font-semibold text-[#6B7280] mt-1.5 leading-none">
                      {item.title}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Mobile & Tablet: RIWAYAT MINGGU INI (< 1024px) */}
          <div className="lg:hidden space-y-2.5 sm:space-y-3 font-sans">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              RIWAYAT MINGGU INI
            </h2>

            {loading ? (
              <div className="space-y-3 animate-pulse">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-slate-100 rounded-2xl" />
                ))}
              </div>
            ) : weeklyRecords.length === 0 ? (
              <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 text-center shadow-2xs font-sans">
                <p className="text-xs text-[#6B7280]">
                  Belum ada catatan kehadiran untuk minggu ini.
                </p>
              </div>
            ) : (
              <HistoryMobileList
                records={weeklyRecords}
                onSelectRecord={(rec) => setSelectedHistoryRecord(rec)}
              />
            )}
          </div>

          {/* Desktop Only: Rekap Kehadiran Bulan Ini (>= 1024px) */}
          <div className="hidden lg:block space-y-3 font-sans">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                RINGKASAN KEHADIRAN BULAN INI
              </h2>
              <span className="text-xs text-[#9CA3AF]">Periode Aktif</span>
            </div>

            <div className="grid grid-cols-4 gap-4">
              <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 text-center shadow-2xs">
                <span className="text-xs font-medium text-[#6B7280]">Hadir Tepat Waktu</span>
                <p className="text-2xl font-bold text-[#111827] mt-1 tabular-nums">
                  {monthlySummary?.onTimeCount ?? 0}
                </p>
                <span className="text-[11px] text-[#9CA3AF]">hari</span>
              </div>
              <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 text-center shadow-2xs">
                <span className="text-xs font-medium text-[#6B7280]">Terlambat</span>
                <p className="text-2xl font-bold text-[#111827] mt-1 tabular-nums">
                  {monthlySummary?.lateCount ?? 0}
                </p>
                <span className="text-[11px] text-[#9CA3AF]">kali</span>
              </div>
              <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 text-center shadow-2xs">
                <span className="text-xs font-medium text-[#6B7280]">Izin / Sakit / Dinas</span>
                <p className="text-2xl font-bold text-[#111827] mt-1 tabular-nums">
                  {monthlySummary?.approvedRequestDays ?? 0}
                </p>
                <span className="text-[11px] text-[#9CA3AF]">hari</span>
              </div>
              <div className="bg-white border border-[#E5E7EB] rounded-xl p-4 text-center shadow-2xs">
                <span className="text-xs font-medium text-[#6B7280]">Tanpa Keterangan</span>
                <p className="text-2xl font-bold text-[#111827] mt-1 tabular-nums">
                  {monthlySummary?.absentCount ?? 0}
                </p>
                <span className="text-[11px] text-[#9CA3AF]">hari</span>
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
        <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
          AKSI CEPAT
        </h2>
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => navigate('/requests')}
            className="p-4 rounded-2xl bg-white border border-[#E5E7EB] hover:border-orange-300 hover:bg-[#FFF7ED]/30 text-left transition-all flex items-center justify-between group cursor-pointer shadow-2xs"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#FFF7ED] border border-[#FFEDD5] text-[#F97316] flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#111827] group-hover:text-[#F97316] transition-colors truncate">
                  Ajukan Izin / Cuti
                </p>
                <p className="text-xs text-[#6B7280] truncate">Form permohonan dinas, sakit & cuti</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#F97316] transition-colors shrink-0 ml-2" />
          </button>

          <button
            onClick={() => navigate('/history')}
            className="p-4 rounded-2xl bg-white border border-[#E5E7EB] hover:border-orange-300 hover:bg-[#FFF7ED]/30 text-left transition-all flex items-center justify-between group cursor-pointer shadow-2xs"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#FFF7ED] border border-[#FFEDD5] text-[#F97316] flex items-center justify-center shrink-0">
                <CalendarCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#111827] group-hover:text-[#F97316] transition-colors truncate">
                  Riwayat Presensi
                </p>
                <p className="text-xs text-[#6B7280] truncate">Cek kalender dan catatan kehadiran</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#F97316] transition-colors shrink-0 ml-2" />
          </button>

          <button
            onClick={() => navigate('/profile')}
            className="p-4 rounded-2xl bg-white border border-[#E5E7EB] hover:border-orange-300 hover:bg-[#FFF7ED]/30 text-left transition-all flex items-center justify-between group cursor-pointer shadow-2xs"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-[#FFF7ED] border border-[#FFEDD5] text-[#F97316] flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-[#111827] group-hover:text-[#F97316] transition-colors truncate">
                  Kelengkapan Profil
                </p>
                <p className="text-xs text-[#6B7280] truncate">Cek data NIP, jabatan & akun</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#F97316] transition-colors shrink-0 ml-2" />
          </button>
        </div>
      </div>

      {/* Information Note */}
      <div className="p-3.5 sm:p-4 rounded-2xl bg-[#F9FAFB] border border-[#E5E7EB] flex items-start sm:items-center gap-3 text-xs sm:text-sm text-[#6B7280]">
        <Clock className="w-4 h-4 text-[#F97316] shrink-0 mt-0.5 sm:mt-0" />
        <div>
          <span className="font-semibold text-[#111827]">Waktu Sistem Aktual:</span> Jam operasional presensi mengikuti zona waktu Indonesia Tengah (WITA). Saat ini: <span className="font-mono font-bold text-[#111827]">{currentTime || '--:--:--'} WITA</span>.
        </div>
      </div>
    </div>
  );
};

