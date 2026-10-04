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
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { attendanceService } from '../../services/attendanceService';
import { EmployeeRow } from '../../types/database.types';
import { WorkScheduleModel } from '../../types/workSchedule.types';
import { LocationModel } from '../../types/location.types';
import {
  AttendanceModel,
  EvaluateCheckInResult,
  EvaluateCheckOutResult,
} from '../../types/attendance.types';

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

      // 5. Evaluate business rules
      const now = new Date();
      setEvalCheckIn(attendanceService.evaluateCheckIn(now, sched));
      setEvalCheckOut(attendanceService.evaluateCheckOut(now, sched, att));
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
    if (submitting || loading) return;
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
      });

      setTodayAttendance(newAtt);
      setBanner({
        type: 'success',
        message: 'Presensi masuk berhasil dicatat. Selamat bekerja!',
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
    if (submitting || loading) return;
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
      });

      setTodayAttendance(updatedAtt);
      setBanner({
        type: 'success',
        message: 'Presensi pulang berhasil dicatat. Terima kasih atas dedikasi Anda hari ini!',
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

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
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
            <p className="font-semibold">
              {banner.type === 'success'
                ? 'Transaksi Berhasil'
                : banner.type === 'error'
                ? 'Informasi Presensi'
                : 'Pemberitahuan'}
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

      {/* UNLINKED ACCOUNT STATE (FINDING-03 Fix) */}
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
        /* Normal Personal Attendance Cards */
        <>
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
        </>
      )}

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
  );
};
