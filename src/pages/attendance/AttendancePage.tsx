import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Info,
  ShieldCheck,
  UserX,
  Users,
  MapPin,
  LogIn,
  LogOut,
  FileText,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { attendanceService, getLocalDateString } from '../../services/attendanceService';
import { supabase } from '../../lib/supabase';
import { EmployeeRow } from '../../types/database.types';
import { WorkScheduleModel } from '../../types/workSchedule.types';
import { LocationModel } from '../../types/location.types';
import {
  AttendanceModel,
  EvaluateCheckInResult,
  EvaluateCheckOutResult,
} from '../../types/attendance.types';
import { RequestRow } from '../../types/request.types';

import { AttendanceStatusCard } from '../../components/attendance/AttendanceStatusCard';
import { CheckInCard } from '../../components/attendance/CheckInCard';
import { CheckOutCard } from '../../components/attendance/CheckOutCard';
import { WorkScheduleCard } from '../../components/attendance/WorkScheduleCard';
import { AttendanceLocationCard } from '../../components/attendance/AttendanceLocationCard';
import { Button } from '../../components/ui/Button';

export const AttendancePage: React.FC = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);

  const [employee, setEmployee] = useState<EmployeeRow | null>(null);
  const [schedule, setSchedule] = useState<WorkScheduleModel | null>(null);
  const [location, setLocation] = useState<LocationModel | null>(null);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceModel | null>(null);
  const [approvedRequest, setApprovedRequest] = useState<RequestRow | null>(null);
  const [notes, setNotes] = useState<string>('');

  const [evalCheckIn, setEvalCheckIn] = useState<EvaluateCheckInResult>({
    allowed: false,
    status: null,
    reason: 'Memuat status...',
  });

  const [evalCheckOut, setEvalCheckOut] = useState<EvaluateCheckOutResult>({
    allowed: false,
    status: null,
    reason: 'Memuat status...',
  });

  const [banner, setBanner] = useState<{
    type: 'success' | 'error' | 'info';
    title?: string;
    message: string;
  } | null>(null);

  const [errorState, setErrorState] = useState<string | null>(null);
  const [isUnlinked, setIsUnlinked] = useState<boolean>(false);

  const formattedTodayDate = new Date().toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const loadData = async () => {
    setLoading(true);
    setBanner(null);
    setErrorState(null);
    setIsUnlinked(false);
    setApprovedRequest(null);

    try {
      // 1. Resolve personal employee record
      const emp = await attendanceService.getCurrentEmployee();
      setEmployee(emp);

      // 2. Fetch active work schedule
      const sched = await attendanceService.getActiveWorkSchedule();
      setSchedule(sched);

      // 3. Fetch active attendance location
      const loc = await attendanceService.getActiveAttendanceLocation();
      setLocation(loc);

      // 4. Fetch today's attendance record
      const att = await attendanceService.getTodayAttendance();
      setTodayAttendance(att);

      // 5. Fetch approved request overlapping today (WITA)
      const todayStr = getLocalDateString(new Date());
      const { data: reqData } = await supabase
        .from('requests')
        .select('*')
        .eq('employee_id', emp.id)
        .eq('status', 'approved')
        .lte('start_date', todayStr)
        .gte('end_date', todayStr)
        .maybeSingle();

      const appReq = (reqData as RequestRow) || null;
      setApprovedRequest(appReq);

      // 6. Evaluate business rules
      const now = new Date();
      if (appReq) {
        const reqLabel =
          appReq.request_type === 'sick'
            ? 'Sakit'
            : appReq.request_type === 'official_duty'
            ? 'Dinas Luar'
            : appReq.request_type === 'leave'
            ? 'Cuti'
            : 'Izin';

        setEvalCheckIn({
          allowed: false,
          status: null,
          reason: `Anda memiliki pengajuan ${reqLabel} yang telah disetujui untuk hari ini.`,
        });

        setEvalCheckOut({
          allowed: false,
          status: null,
          reason: `Anda memiliki pengajuan ${reqLabel} yang telah disetujui untuk hari ini.`,
        });
      } else {
        setEvalCheckIn(attendanceService.evaluateCheckIn(now, sched));
        setEvalCheckOut(attendanceService.evaluateCheckOut(now, sched, att));
      }
    } catch (err: any) {
      console.error('Failed to load personal attendance data:', err);
      const msg = err?.message || 'Gagal memuat data presensi harian.';
      setErrorState(msg);

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
    loadData();
  }, []);

  const getGeolocation = (): Promise<{ latitude: number; longitude: number } | null> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        setBanner({
          type: 'error',
          message: 'Perangkat atau browser Anda tidak mendukung layanan lokasi.',
        });
        resolve(null);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          resolve({
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
          });
        },
        (err) => {
          let msg = 'Lokasi diperlukan untuk melakukan presensi.';
          if (err.code === err.PERMISSION_DENIED) {
            msg =
              'Akses lokasi ditolak. Aktifkan izin lokasi browser untuk melanjutkan presensi.';
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            msg = 'Lokasi tidak dapat ditemukan. Pastikan GPS perangkat Anda aktif.';
          } else if (err.code === err.TIMEOUT) {
            msg = 'Waktu pengambilan lokasi habis. Silakan coba lagi.';
          }
          setBanner({ type: 'error', message: msg });
          resolve(null);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  const handleCheckIn = async () => {
    if (submitting || loading || approvedRequest) return;
    setSubmitting(true);
    setBanner(null);

    try {
      const coords = await getGeolocation();
      if (!coords) {
        setSubmitting(false);
        return;
      }

      const newAtt = await attendanceService.checkIn({
        latitude: coords.latitude,
        longitude: coords.longitude,
        notes: notes.trim() || undefined,
      });

      setTodayAttendance(newAtt);
      setNotes('');
      setBanner({
        type: 'success',
        title: 'Presensi Masuk Berhasil',
        message: `${formatTimeOnly(newAtt.check_in_at)}`,
      });

      const now = new Date();
      setEvalCheckIn(attendanceService.evaluateCheckIn(now, schedule));
      setEvalCheckOut(attendanceService.evaluateCheckOut(now, schedule, newAtt));
    } catch (err: any) {
      console.error('Check-in error:', err);
      setBanner({
        type: 'error',
        message: err?.message || 'Gagal melakukan presensi masuk.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckOut = async () => {
    if (submitting || loading || approvedRequest) return;
    setSubmitting(true);
    setBanner(null);

    try {
      const coords = await getGeolocation();
      if (!coords) {
        setSubmitting(false);
        return;
      }

      const updatedAtt = await attendanceService.checkOut({
        latitude: coords.latitude,
        longitude: coords.longitude,
        notes: notes.trim() || undefined,
      });

      setTodayAttendance(updatedAtt);
      setNotes('');
      setBanner({
        type: 'success',
        title: 'Presensi Pulang Berhasil',
        message: `${formatTimeOnly(updatedAtt.check_out_at)}`,
      });

      const now = new Date();
      setEvalCheckIn(attendanceService.evaluateCheckIn(now, schedule));
      setEvalCheckOut(attendanceService.evaluateCheckOut(now, schedule, updatedAtt));
    } catch (err: any) {
      console.error('Check-out error:', err);
      setBanner({
        type: 'error',
        message: err?.message || 'Gagal melakukan presensi pulang.',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const isAdminRole = profile && ['super_admin', 'admin'].includes(profile.role);

  const formatTimeOnly = (isoString?: string | null) => {
    if (!isoString) return '--:-- WITA';
    try {
      const date = new Date(isoString);
      const timeStr = date.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      return `${timeStr} WITA`;
    } catch {
      return '--:-- WITA';
    }
  };

  const formatScheduleTime = (timeStr?: string | null) => {
    if (!timeStr) return '-';
    return timeStr.slice(0, 5);
  };

  const getMobileTodayStatusText = () => {
    if (approvedRequest) {
      if (approvedRequest.request_type === 'sick') return 'Sakit';
      if (approvedRequest.request_type === 'official_duty') return 'Dinas Luar';
      if (approvedRequest.request_type === 'leave') return 'Cuti';
      return 'Izin';
    }
    if (todayAttendance?.check_out_at || todayAttendance?.check_in_at) {
      return 'Hadir';
    }
    if ((todayAttendance as any)?.check_in_status === 'absent' || (todayAttendance as any)?.status === 'alpha') {
      return 'Tanpa Keterangan';
    }
    return 'Anda belum melakukan presensi';
  };

  return (
    <div className="space-y-5 max-w-5xl mx-auto pb-10">
      {/* Banner Feedback Messages */}
      {banner && (
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 text-xs sm:text-sm font-medium animate-in fade-in transition-all ${
            banner.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : banner.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-blue-50 border-blue-200 text-blue-800'
          }`}
        >
          {banner.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          ) : banner.type === 'error' ? (
            <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          ) : (
            <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          )}
          <div className="flex-1">
            <p className="font-semibold text-xs sm:text-sm">
              {banner.title ||
                (banner.type === 'success'
                  ? 'Presensi Berhasil'
                  : banner.type === 'error'
                  ? 'Informasi Presensi'
                  : 'Pemberitahuan')}
            </p>
            <p className="mt-0.5 text-xs opacity-90">{banner.message}</p>
          </div>
          <button
            onClick={() => setBanner(null)}
            className="text-xs font-bold underline shrink-0 opacity-70 hover:opacity-100"
          >
            Tutup
          </button>
        </div>
      )}

      {/* UNLINKED ACCOUNT STATE */}
      {isUnlinked ? (
        <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-2xs">
          <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 border border-amber-300 flex items-center justify-center mx-auto">
            <UserX className="w-7 h-7" />
          </div>

          <div className="space-y-1.5 max-w-md mx-auto">
            <h3 className="text-base sm:text-lg font-bold text-amber-950">
              Akun Anda Belum Terhubung dengan Data Pegawai
            </h3>
            <p className="text-xs sm:text-sm text-amber-800 leading-relaxed">
              Akun login Anda belum ditautkan ke profil pegawai sekolah pada SIM Master Pegawai.
            </p>
            <p className="text-xs text-amber-700/90 pt-1">
              Hubungi Administrator untuk menautkan akun Anda di Manajemen Pegawai agar dapat menggunakan fitur presensi pribadi.
            </p>
          </div>

          <div className="pt-2 flex flex-wrap justify-center gap-3">
            <Button variant="outline" size="sm" onClick={loadData} className="text-xs">
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Segarkan Halaman
            </Button>
            {isAdminRole && (
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/employees')}
                className="text-xs bg-[#F97316] hover:bg-[#EA580C] text-white"
              >
                <Users className="w-3.5 h-3.5 mr-1.5" />
                Manajemen Pegawai
              </Button>
            )}
          </div>
        </div>
      ) : errorState ? (
        /* Generic Page Error State */
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-amber-800 space-y-3">
          <div className="flex items-center gap-2 font-bold text-sm">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>Gagal Memuat Konfigurasi Presensi</span>
          </div>
          <p className="text-xs leading-relaxed">{errorState}</p>
          <Button variant="outline" size="sm" onClick={loadData} className="mt-2 text-xs">
            Coba Lagi
          </Button>
        </div>
      ) : (
        <>
          {/* ==================================================================== */}
          {/* MOBILE & TABLET LAYOUT (< 1024px): STREAMLINED STATUS -> VALIDASI LOKASI -> SATU AKSI */}
          {/* ==================================================================== */}
          <div className="lg:hidden space-y-4">
            {/* 1. Status & Tanggal Hari Ini */}
            <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
              {/* Tanggal Hari Ini */}
              <div className="pb-3 border-b border-[#E5E7EB]">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#6B7280]">
                  <Calendar className="w-4 h-4 text-[#F97316] shrink-0" />
                  <span>{formattedTodayDate}</span>
                </div>
              </div>

              {/* PRESENSI HARI INI & Status Typography (NO BADGES, NO PILLS, NO CHECKMARKS) */}
              <div>
                <span className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider block">
                  PRESENSI HARI INI
                </span>
                <h3 className="text-base sm:text-lg font-bold text-[#111827] mt-1">
                  {getMobileTodayStatusText()}
                </h3>
              </div>

              {/* Timestamps Actual (Check-in & Check-out, Center Aligned, No icons) */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#E5E7EB]">
                <div className="p-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] space-y-0.5 flex flex-col items-center justify-center text-center">
                  <span className="text-xs font-medium text-[#6B7280] block text-center">Check-in</span>
                  <span className="text-sm sm:text-base font-bold text-[#111827] block text-center">
                    {approvedRequest ? '--:-- WITA' : formatTimeOnly(todayAttendance?.check_in_at)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] space-y-0.5 flex flex-col items-center justify-center text-center">
                  <span className="text-xs font-medium text-[#6B7280] block text-center">Check-out</span>
                  <span className="text-sm sm:text-base font-bold text-[#111827] block text-center">
                    {approvedRequest ? '--:-- WITA' : formatTimeOnly(todayAttendance?.check_out_at)}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. STATE E: Approved Request Message (If approved request exists) */}
            {approvedRequest ? (
              <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 shadow-2xs space-y-2">
                <p className="text-xs font-bold text-[#111827]">
                  {getMobileTodayStatusText()}
                </p>
                <p className="text-xs text-[#6B7280]">
                  Anda tidak perlu melakukan presensi hari ini.
                </p>
              </div>
            ) : (
              /* 3. Validasi Lokasi & Action Utama */
              <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
                {/* VALIDASI LOKASI (Simplified, Center Aligned, No Titik/Anda indicators) */}
                <div className="p-3.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] text-center space-y-1.5 flex flex-col items-center justify-center">
                  <span className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider block text-center">
                    VALIDASI LOKASI
                  </span>

                  <div className="flex items-center justify-center gap-1.5 text-xs text-[#374151] font-semibold text-center">
                    <MapPin className="w-4 h-4 text-[#F97316] shrink-0" />
                    <span>{location?.name || 'Titik Presensi Sekolah'}</span>
                    {location && (
                      <span className="text-[11px] text-[#6B7280] font-normal">
                        ({location.radiusMeters}m)
                      </span>
                    )}
                  </div>

                  <div className="pt-1.5 border-t border-[#E5E7EB]/60 w-full text-center text-xs font-semibold text-emerald-700">
                    {loading ? 'Mendeteksi lokasi...' : location ? 'Dalam radius presensi' : 'Lokasi belum tersedia'}
                  </div>
                </div>

                {/* SATU ACTION UTAMA */}
                {todayAttendance?.check_out_at ? (
                  /* STATE D — SUDAH CHECK-OUT */
                  <div className="p-4 rounded-xl bg-emerald-50/70 border border-emerald-200 text-center space-y-1">
                    <p className="text-xs font-bold text-emerald-900">
                      Presensi hari ini sudah lengkap
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {/* Notes Input Field (Optional) */}
                    <div className="space-y-1">
                      <label className="text-xs font-semibold text-[#374151]">
                        Catatan Presensi <span className="text-[#9CA3AF] font-normal">(opsional)</span>
                      </label>
                      <input
                        type="text"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        disabled={submitting || loading}
                        placeholder="Contoh: Tugas piket / Keterangan ketersediaan"
                        className="w-full h-10 px-3 rounded-xl border border-[#D1D5DB] text-xs text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#F97316] focus:border-transparent disabled:bg-[#F3F4F6] disabled:text-[#9CA3AF]"
                      />
                    </div>

                    {/* Single Action Button */}
                    {!todayAttendance?.check_in_at ? (
                      /* STATE A — BELUM CHECK-IN */
                      <div>
                        <button
                          type="button"
                          onClick={handleCheckIn}
                          disabled={loading || submitting || !evalCheckIn.allowed}
                          className="w-full h-12 text-xs font-bold rounded-xl transition-all shadow-2xs flex flex-row items-center justify-center gap-2 whitespace-nowrap bg-[#F97316] hover:bg-[#EA580C] text-white disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer"
                        >
                          {submitting ? (
                            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                          ) : (
                            <LogIn className="w-4 h-4 shrink-0" />
                          )}
                          <span className="whitespace-nowrap">Check-in</span>
                        </button>
                        {!evalCheckIn.allowed && evalCheckIn.reason && (
                          <span className="text-[11px] text-[#6B7280] block text-center mt-1.5 font-medium">
                            {evalCheckIn.reason}
                          </span>
                        )}
                      </div>
                    ) : (
                      /* STATE B / C — SUDAH CHECK-IN, WAKTU CHECK-OUT */
                      <div>
                        <button
                          type="button"
                          onClick={handleCheckOut}
                          disabled={loading || submitting || !evalCheckOut.allowed}
                          className={`w-full h-12 text-xs font-bold rounded-xl transition-all shadow-2xs flex flex-row items-center justify-center gap-2 whitespace-nowrap disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer ${
                            evalCheckOut.allowed
                              ? 'bg-[#F97316] hover:bg-[#EA580C] text-white'
                              : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                          }`}
                        >
                          {submitting ? (
                            <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                          ) : (
                            <LogOut className="w-4 h-4 shrink-0" />
                          )}
                          <span className="whitespace-nowrap">Check-out</span>
                        </button>

                        {/* Micro-copy when Check-out is not yet available or reason */}
                        {!evalCheckOut.allowed && (
                          <span className="text-[11px] text-[#6B7280] block text-center mt-1.5 font-medium">
                            {schedule?.operational_end_time
                              ? `Check-out tersedia mulai ${formatScheduleTime(schedule.operational_end_time)} WITA`
                              : evalCheckOut.reason || 'Check-out tersedia mulai 15.00 WITA'}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ==================================================================== */}
          {/* DESKTOP LAYOUT (≥ 1024px): UNTOUCHED FULL DASHBOARD PRESENCE CARDS */}
          {/* ==================================================================== */}
          <div className="hidden lg:block lg:space-y-6">
            {/* Header Banner */}
            <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF] flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-[#F97316]" />
                  {formattedTodayDate}
                </span>
                <h2 className="text-xl sm:text-2xl font-bold text-[#111827] mt-0.5">
                  Presensi Pegawai
                </h2>
                <p className="text-xs sm:text-sm text-[#6B7280] mt-1">
                  Pencatatan kehadiran masuk & pulang pribadi secara real-time
                </p>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={loadData}
                disabled={loading || submitting}
                className="text-xs self-start sm:self-auto"
              >
                <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
                Muat Ulang
              </Button>
            </div>

            {/* Main Status Card */}
            <AttendanceStatusCard
              todayAttendance={todayAttendance}
              employee={employee}
              loading={loading}
            />

            {/* Check-in & Check-out Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <CheckInCard
                schedule={schedule}
                todayAttendance={todayAttendance}
                evalCheckIn={evalCheckIn}
                loading={loading}
                submitting={submitting}
                onCheckIn={handleCheckIn}
              />

              <CheckOutCard
                schedule={schedule}
                todayAttendance={todayAttendance}
                evalCheckOut={evalCheckOut}
                loading={loading}
                submitting={submitting}
                onCheckOut={handleCheckOut}
              />
            </div>

            {/* Work Schedule & Location Information Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <WorkScheduleCard schedule={schedule} loading={loading} />
              <AttendanceLocationCard location={location} loading={loading} />
            </div>

            {/* Bottom Info Footer */}
            <div className="p-4 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] flex items-start gap-3 text-xs text-[#6B7280]">
              <ShieldCheck className="w-4 h-4 text-[#F97316] shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-[#111827]">Sistem Presensi Resmi Sekolah:</span> Transaksi
                presensi dicatat secara otomatis menggunakan waktu server dan sensor lokasi perangkat
                terautentikasi. Satu pegawai hanya diperbolehkan mencatat 1 kali presensi per hari kerja.
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

