import React, { useState, useEffect, useCallback, useRef } from 'react';
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
import {
  LocationValidationState,
  evaluateLocationRadius,
  formatDistanceDisplay,
} from '../../utils/geoUtils';

import { AttendanceStatusCard } from '../../components/attendance/AttendanceStatusCard';
import { CheckInCard } from '../../components/attendance/CheckInCard';
import { CheckOutCard } from '../../components/attendance/CheckOutCard';
import { WorkScheduleCard } from '../../components/attendance/WorkScheduleCard';
import { AttendanceLocationCard } from '../../components/attendance/AttendanceLocationCard';
import { CameraCaptureModal } from '../../components/attendance/CameraCaptureModal';
import { Button } from '../../components/ui/Button';
import { NotificationBell } from '../../components/notifications/NotificationBell';
import {
  generateSelfieStoragePath,
  uploadAttendanceSelfie,
} from '../../services/attendancePhotoService';
import {
  attendanceStatusService,
  EvaluatedStatusResult,
} from '../../services/attendanceStatusService';

export const AttendancePage: React.FC = () => {
  const { profile, user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [isCameraOpen, setIsCameraOpen] = useState<boolean>(false);
  const [pendingAttendanceType, setPendingAttendanceType] = useState<
    'check_in' | 'check_out' | null
  >(null);

  const [employee, setEmployee] = useState<EmployeeRow | null>(null);
  const [schedule, setSchedule] = useState<WorkScheduleModel | null>(null);
  const [location, setLocation] = useState<LocationModel | null>(null);
  const [activeLocations, setActiveLocations] = useState<LocationModel[]>([]);
  const [weeklyMatrix, setWeeklyMatrix] = useState<EvaluatedStatusResult[]>([]);
  const geoRequestIdRef = useRef<number>(0);
  const isActionLockedRef = useRef<boolean>(false);
  const [geoValidation, setGeoValidation] = useState<LocationValidationState>({
    status: 'idle',
    matchedLocation: null,
    nearestLocation: null,
    nearestDistanceMeters: null,
    userCoords: null,
  });
  const [geoDetecting, setGeoDetecting] = useState<boolean>(false);
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

  const getWitaGreeting = () => {
    const now = new Date();
    const hourStr = now.toLocaleString('en-US', { timeZone: 'Asia/Makassar', hour: 'numeric', hour12: false });
    const hour = parseInt(hourStr, 10) || now.getHours();
    if (hour >= 5 && hour < 11) return 'Selamat Pagi';
    if (hour >= 11 && hour < 15) return 'Selamat Siang';
    if (hour >= 15 && hour < 18) return 'Selamat Sore';
    return 'Selamat Malam';
  };

  const getWeeklyDatesAndLabels = () => {
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(now);
    monday.setDate(now.getDate() + diffToMonday);

    const dayNamesShort = ['SEN', 'SEL', 'RAB', 'KAM', 'JUM', 'SAB', 'MING'];
    const dayNamesFull = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];

    const dates = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = getLocalDateString(d);
      const dayNum = d.getDate();
      const isWeekend = i === 5 || i === 6;
      dates.push({
        dateStr,
        dayNum,
        dayNameShort: dayNamesShort[i],
        dayNameFull: dayNamesFull[i],
        isWeekend,
      });
    }

    const monthYearLabel = monday.toLocaleDateString('id-ID', {
      month: 'long',
      year: 'numeric',
    });

    return { weeklyDates: dates, monthYearLabel, startDate: dates[0].dateStr, endDate: dates[6].dateStr };
  };

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

      // Fetch weekly matrix for current week
      const { startDate, endDate } = getWeeklyDatesAndLabels();
      const matrix = await attendanceStatusService.getEvaluatedMatrix(startDate, endDate, emp.id);
      setWeeklyMatrix(matrix);

      // 2. Fetch active work schedule
      const sched = await attendanceService.getActiveWorkSchedule();
      setSchedule(sched);

      // 3. Fetch active attendance locations (multi-location support)
      const locs = await attendanceService.getActiveAttendanceLocations();
      setActiveLocations(locs);
      const primaryLoc = locs.find((l) => l.isActive && l.isAttendanceEnabled) || locs[0] || null;
      setLocation(primaryLoc);

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

      // 7. Trigger initial GPS detection against all active attendance points
      detectUserLocation(locs);
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

  const detectUserLocation = useCallback(
    (targetLocations?: LocationModel[]) => {
      const locsToCheck = targetLocations || activeLocations;
      const currentRequestId = ++geoRequestIdRef.current;

      if (!navigator.geolocation) {
        setGeoValidation({
          status: 'error',
          matchedLocation: null,
          nearestLocation: null,
          nearestDistanceMeters: null,
          userCoords: null,
          errorMessage: 'Perangkat tidak mendukung geolokasi GPS.',
          checkedAt: new Date(),
        });
        return;
      }

      setGeoDetecting(true);
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          if (currentRequestId !== geoRequestIdRef.current) return;

          const evalResult = evaluateLocationRadius(
            pos.coords.latitude,
            pos.coords.longitude,
            locsToCheck,
            pos.coords.accuracy
          );
          setGeoValidation(evalResult);
          setGeoDetecting(false);
        },
        (err) => {
          if (currentRequestId !== geoRequestIdRef.current) return;

          let errMsg = 'Gagal mendeteksi lokasi GPS.';
          if (err.code === err.PERMISSION_DENIED) {
            errMsg = 'Izin akses lokasi ditolak oleh browser.';
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            errMsg = 'Sinyal GPS tidak tersedia. Pastikan GPS aktif.';
          } else if (err.code === err.TIMEOUT) {
            errMsg = 'Waktu deteksi GPS habis. Silakan coba lagi.';
          }
          setGeoValidation({
            status: 'error',
            matchedLocation: null,
            nearestLocation: null,
            nearestDistanceMeters: null,
            userCoords: null,
            errorMessage: errMsg,
            checkedAt: new Date(),
          });
          setGeoDetecting(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    },
    [activeLocations]
  );

  interface LocationValidationCheck {
    valid: boolean;
    coords?: { latitude: number; longitude: number };
    errorMessage?: string;
  }

  /**
   * Fetches fresh device GPS position and evaluates radius against all active locations.
   * Updates LocationValidationCard state and returns deterministic validation status.
   */
  const getAndValidateLocation = (): Promise<LocationValidationCheck> => {
    const currentRequestId = ++geoRequestIdRef.current;
    setGeoDetecting(true);

    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        const errorMsg = 'Perangkat atau browser Anda tidak mendukung layanan lokasi.';
        const failureState: LocationValidationState = {
          status: 'error',
          matchedLocation: null,
          nearestLocation: null,
          nearestDistanceMeters: null,
          userCoords: null,
          errorMessage: errorMsg,
          checkedAt: new Date(),
        };
        setGeoValidation(failureState);
        setGeoDetecting(false);
        resolve({
          valid: false,
          errorMessage: errorMsg,
        });
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setGeoDetecting(false);
          const evalResult = evaluateLocationRadius(
            pos.coords.latitude,
            pos.coords.longitude,
            activeLocations,
            pos.coords.accuracy
          );

          if (currentRequestId === geoRequestIdRef.current) {
            setGeoValidation(evalResult);
          }

          if (evalResult.status === 'in_radius') {
            resolve({
              valid: true,
              coords: {
                latitude: pos.coords.latitude,
                longitude: pos.coords.longitude,
              },
            });
          } else {
            let msg = 'Lokasi berada di luar radius presensi yang ditentukan.';
            if (evalResult.status === 'out_of_radius') {
              msg = `Anda berada di luar radius presensi (jarak ±${formatDistanceDisplay(
                evalResult.nearestDistanceMeters ?? 0
              )} dari ${evalResult.nearestLocation?.name || 'sekolah'}).`;
            } else if (evalResult.status === 'uncertain') {
              msg =
                evalResult.errorMessage ||
                'Akurasi GPS belum memadai untuk memastikan lokasi Anda. Silakan coba lagi di area terbuka.';
            } else if (evalResult.status === 'no_locations') {
              msg = 'Titik presensi belum dikonfigurasi atau tidak aktif.';
            }
            resolve({
              valid: false,
              errorMessage: msg,
            });
          }
        },
        (err) => {
          setGeoDetecting(false);
          let msg = 'Lokasi diperlukan untuk melakukan presensi.';
          if (err.code === err.PERMISSION_DENIED) {
            msg =
              'Akses lokasi ditolak. Aktifkan izin lokasi browser untuk melanjutkan presensi.';
          } else if (err.code === err.POSITION_UNAVAILABLE) {
            msg = 'Lokasi tidak dapat ditemukan. Pastikan GPS perangkat Anda aktif.';
          } else if (err.code === err.TIMEOUT) {
            msg = 'Waktu pengambilan lokasi habis. Silakan coba lagi.';
          }

          const failureState: LocationValidationState = {
            status: 'error',
            matchedLocation: null,
            nearestLocation: null,
            nearestDistanceMeters: null,
            userCoords: null,
            errorMessage: msg,
            checkedAt: new Date(),
          };

          if (currentRequestId === geoRequestIdRef.current) {
            setGeoValidation(failureState);
          }

          resolve({
            valid: false,
            errorMessage: msg,
          });
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  /**
   * Langkah 1 & 2: Initiates Check-In with preliminary GPS validation, then opens selfie camera.
   * Guarded synchronously by isActionLockedRef to block rapid double-clicks.
   */
  const handleCheckIn = async () => {
    if (isActionLockedRef.current || submitting || loading || isCameraOpen || approvedRequest) {
      return;
    }
    isActionLockedRef.current = true;
    setSubmitting(true);
    setBanner(null);

    try {
      const initialGps = await getAndValidateLocation();
      if (!initialGps.valid || !initialGps.coords) {
        setBanner({
          type: 'error',
          message: initialGps.errorMessage || 'Verifikasi lokasi awal gagal.',
        });
        return;
      }

      setPendingAttendanceType('check_in');
      setIsCameraOpen(true);
    } catch (err: unknown) {
      console.error('Check-in initial location error:', err);
      const msg = err instanceof Error ? err.message : 'Gagal memverifikasi lokasi.';
      setBanner({
        type: 'error',
        message: msg,
      });
    } finally {
      // Phase 1 finished: release lock and reset submitting state so user can interact with camera modal
      setSubmitting(false);
      isActionLockedRef.current = false;
    }
  };

  /**
   * Langkah 1 & 2: Initiates Check-Out with preliminary GPS validation, then opens selfie camera.
   * Guarded synchronously by isActionLockedRef to block rapid double-clicks.
   */
  const handleCheckOut = async () => {
    if (isActionLockedRef.current || submitting || loading || isCameraOpen || approvedRequest) {
      return;
    }
    isActionLockedRef.current = true;
    setSubmitting(true);
    setBanner(null);

    try {
      const initialGps = await getAndValidateLocation();
      if (!initialGps.valid || !initialGps.coords) {
        setBanner({
          type: 'error',
          message: initialGps.errorMessage || 'Verifikasi lokasi awal gagal.',
        });
        return;
      }

      setPendingAttendanceType('check_out');
      setIsCameraOpen(true);
    } catch (err: unknown) {
      console.error('Check-out initial location error:', err);
      const msg = err instanceof Error ? err.message : 'Gagal memverifikasi lokasi.';
      setBanner({
        type: 'error',
        message: msg,
      });
    } finally {
      // Phase 1 finished: release lock and reset submitting state so user can interact with camera modal
      setSubmitting(false);
      isActionLockedRef.current = false;
    }
  };

  /**
   * Safe cancellation handler for CameraCaptureModal.
   */
  const handleCameraClose = () => {
    setIsCameraOpen(false);
    setPendingAttendanceType(null);
    setSubmitting(false);
    isActionLockedRef.current = false;
  };

  /**
   * Langkah 3-8: Pipeline automatically executed upon selfie confirmation (Gunakan Foto).
   * Guarded synchronously by isActionLockedRef to prevent duplicate confirmation executions.
   * Validates fresh GPS, resolves employee ID, uploads selfie photo, submits RPC, and updates UI.
   */
  const handlePhotoConfirmed = async (photoBlob: Blob) => {
    // Synchronous lock check: blocks duplicate callback executions immediately
    if (isActionLockedRef.current) {
      return;
    }

    const actionType = pendingAttendanceType;
    if (!actionType) {
      handleCameraClose();
      return;
    }

    // Synchronously acquire lock for Phase 2
    isActionLockedRef.current = true;

    // Modal closes; automatically proceed into transaction pipeline without second submit button
    setIsCameraOpen(false);
    setSubmitting(true);
    setBanner(null);

    try {
      // Langkah 4 — Validasi GPS terbaru setelah foto dikonfirmasi
      const freshGps = await getAndValidateLocation();
      if (!freshGps.valid || !freshGps.coords) {
        setBanner({
          type: 'error',
          message:
            freshGps.errorMessage ||
            'Lokasi terbaru tidak valid atau berada di luar radius setelah pengambilan foto.',
        });
        return;
      }

      // Langkah 5 — Identitas pegawai dan pembuatan path kanonis (WITA)
      let activeEmpId = employee?.id;
      if (!activeEmpId) {
        const currentEmp = await attendanceService.getCurrentEmployee();
        activeEmpId = currentEmp?.id;
        if (currentEmp) {
          setEmployee(currentEmp);
        }
      }

      if (!activeEmpId) {
        throw new Error(
          'Identitas pegawai tidak ditemukan. Pastikan akun Anda telah terhubung dengan data pegawai.'
        );
      }

      const photoPath = generateSelfieStoragePath(activeEmpId, actionType);

      // Langkah 6 — Unggah foto selfie ke private Supabase Storage
      const uploadedPath = await uploadAttendanceSelfie(photoPath, photoBlob);

      // Langkah 7 — Transaksi backend RPC via attendanceService
      if (actionType === 'check_in') {
        const newAtt = await attendanceService.checkIn({
          latitude: freshGps.coords.latitude,
          longitude: freshGps.coords.longitude,
          photoPath: uploadedPath,
          notes: notes.trim() || undefined,
        });

        // Langkah 8 — Hasil dan pembaruan UI
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
      } else {
        const updatedAtt = await attendanceService.checkOut({
          latitude: freshGps.coords.latitude,
          longitude: freshGps.coords.longitude,
          photoPath: uploadedPath,
          notes: notes.trim() || undefined,
        });

        // Langkah 8 — Hasil dan pembaruan UI
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
      }
    } catch (err: unknown) {
      console.error('Attendance selfie transaction error:', err);
      const msg = err instanceof Error ? err.message : 'Gagal memproses transaksi presensi.';
      setBanner({
        type: 'error',
        message: msg,
      });
    } finally {
      // Phase 2 finished: release lock and restore processing states across all terminal paths
      setSubmitting(false);
      setPendingAttendanceType(null);
      isActionLockedRef.current = false;
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
            {/* 0. Mobile & Tablet Header (No Card Container) */}
            <div className="flex items-center justify-between py-2 px-1">
              <div className="flex items-center gap-3">
                {employee?.photo_url || profile?.avatar_url ? (
                  <img
                    src={employee?.photo_url || profile?.avatar_url || ''}
                    alt="Foto Profil"
                    className="w-11 h-11 rounded-full object-cover border border-[#E5E7EB] shrink-0"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-[#FFEDD5] text-[#C2410C] font-bold flex items-center justify-center text-sm border border-[#FDBA74] shrink-0">
                    {(employee?.full_name || profile?.full_name || user?.name || 'P')
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                )}
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-[#F97316]">
                    {getWitaGreeting()},
                  </p>
                  <h2 className="text-sm sm:text-base font-bold text-[#111827] truncate max-w-[200px] sm:max-w-xs">
                    {employee?.full_name || profile?.full_name || user?.name || 'Pegawai Sekolah'}
                  </h2>
                </div>
              </div>
              <div className="shrink-0">
                <NotificationBell />
              </div>
            </div>

            {/* 1. Status & Tanggal Hari Ini */}
            <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
              {/* Tanggal Hari Ini (Clean & Prominent, No School/Location labels) */}
              <div className="pb-3 border-b border-[#E5E7EB] flex items-center gap-2 text-xs sm:text-sm font-bold text-[#111827]">
                <Calendar className="w-4 h-4 text-[#F97316] shrink-0" />
                <span>{formattedTodayDate}</span>
              </div>

              {/* PRESENSI HARI INI & Status Typography */}
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

            {/* 1.5 Riwayat Minggu Ini (7 Capsules) */}
            {(() => {
              const { weeklyDates, monthYearLabel } = getWeeklyDatesAndLabels();
              const todayStr = getLocalDateString(new Date());
              return (
                <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-[#111827] uppercase tracking-wider">
                      Riwayat Minggu Ini
                    </h3>
                    <span className="text-[11px] font-semibold text-[#6B7280]">
                      {monthYearLabel}
                    </span>
                  </div>

                  <div className="grid grid-cols-7 gap-1 sm:gap-2 overflow-x-auto pb-1">
                    {weeklyDates.map((dateObj) => {
                      const match = weeklyMatrix.find((r) => r.date === dateObj.dateStr);
                      const isToday = dateObj.dateStr === todayStr;
                      const isWeekendOrHoliday = dateObj.isWeekend || match?.status === 'holiday';

                      let statusBarColor = 'bg-[#E5E7EB]';
                      if (match) {
                        if (match.status === 'present') {
                          statusBarColor = match.substatus === 'late' ? 'bg-[#F97316]' : 'bg-[#16A34A]';
                        } else if (match.status === 'sick') {
                          statusBarColor = 'bg-[#7C3AED]';
                        } else if (match.status === 'permit') {
                          statusBarColor = 'bg-[#CA8A04]';
                        } else if (match.status === 'leave') {
                          statusBarColor = 'bg-[#CA8A04]';
                        } else if (match.status === 'official_duty') {
                          statusBarColor = 'bg-[#0284C7]';
                        } else if (match.status === 'absent') {
                          statusBarColor = 'bg-[#DC2626]';
                        }
                      }

                      let capsuleBg = 'bg-[#FFFFFF] shadow-2xs border border-[#E5E7EB]';
                      let textColor = 'text-[#111827]';
                      let subTextColor = 'text-[#6B7280]';

                      if (isToday) {
                        capsuleBg = 'bg-[#F97316] text-white shadow-sm border border-[#F97316]';
                        textColor = 'text-white';
                        subTextColor = 'text-white/90';
                      } else if (isWeekendOrHoliday) {
                        textColor = 'text-[#DC2626]';
                        subTextColor = 'text-[#DC2626]/80';
                      }

                      return (
                        <div
                          key={dateObj.dateStr}
                          className={`flex flex-col items-center justify-between py-2.5 px-0.5 rounded-full text-center transition-all ${capsuleBg} min-h-[76px]`}
                          title={`${dateObj.dayNameFull}, ${dateObj.dateStr}: ${match?.statusLabel || 'Belum ada data'}`}
                        >
                          <span className={`text-[11px] sm:text-xs font-bold ${textColor}`}>
                            {dateObj.dayNum}
                          </span>
                          <div className={`w-1.5 h-3.5 sm:h-5 rounded-full my-1 ${statusBarColor}`} />
                          <span className={`text-[9px] sm:text-[11px] font-semibold uppercase tracking-tight ${subTextColor}`}>
                            {dateObj.dayNameShort}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            {/* 1.6 Rekap Presensi Minggu Ini (6 Categories 3x2 grid) */}
            {(() => {
              const todayStr = getLocalDateString(new Date());
              const pastOrTodayMatrix = weeklyMatrix.filter((r) => r.date <= todayStr);
              const recapCounts = {
                present: pastOrTodayMatrix.filter((r) => r.status === 'present').length,
                sick: pastOrTodayMatrix.filter((r) => r.status === 'sick').length,
                permit: pastOrTodayMatrix.filter((r) => r.status === 'permit').length,
                official_duty: pastOrTodayMatrix.filter((r) => r.status === 'official_duty').length,
                leave: pastOrTodayMatrix.filter((r) => r.status === 'leave').length,
                absent: pastOrTodayMatrix.filter((r) => r.status === 'absent').length,
              };

              return (
                <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
                  <div>
                    <h3 className="text-xs font-bold text-[#111827] uppercase tracking-wider">
                      Rekap Presensi Minggu Ini
                    </h3>
                    <p className="text-[11px] text-[#6B7280] mt-0.5">
                      Senin s.d. Hari Ini
                    </p>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5">
                    <div className="p-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] text-center space-y-0.5">
                      <span className="text-[11px] font-medium text-[#6B7280] block">Hadir</span>
                      <span className="text-base sm:text-lg font-bold text-[#16A34A] block">{recapCounts.present}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] text-center space-y-0.5">
                      <span className="text-[11px] font-medium text-[#6B7280] block">Sakit</span>
                      <span className="text-base sm:text-lg font-bold text-[#7C3AED] block">{recapCounts.sick}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] text-center space-y-0.5">
                      <span className="text-[11px] font-medium text-[#6B7280] block">Izin</span>
                      <span className="text-base sm:text-lg font-bold text-[#CA8A04] block">{recapCounts.permit}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] text-center space-y-0.5">
                      <span className="text-[11px] font-medium text-[#6B7280] block">Dinas Luar</span>
                      <span className="text-base sm:text-lg font-bold text-[#0284C7] block">{recapCounts.official_duty}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] text-center space-y-0.5">
                      <span className="text-[11px] font-medium text-[#6B7280] block">Cuti</span>
                      <span className="text-base sm:text-lg font-bold text-[#CA8A04] block">{recapCounts.leave}</span>
                    </div>
                    <div className="p-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] text-center space-y-0.5">
                      <span className="text-[11px] font-medium text-[#6B7280] block">Alpha</span>
                      <span className="text-base sm:text-lg font-bold text-[#DC2626] block">{recapCounts.absent}</span>
                    </div>
                  </div>
                </div>
              );
            })()}

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
                {/* VALIDASI LOKASI (Dynamic GPS radius check against all active points) */}
                <div className="p-3.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] text-center space-y-2 flex flex-col items-center justify-center">
                  <div className="w-full flex items-center justify-between px-0.5">
                    <span className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider block">
                      VALIDASI LOKASI
                    </span>
                    <button
                      type="button"
                      onClick={() => detectUserLocation()}
                      disabled={geoDetecting || loading}
                      className="text-[11px] font-semibold text-[#F97316] hover:text-[#EA580C] flex items-center gap-1 disabled:opacity-50 transition-colors"
                      title="Perbarui deteksi lokasi GPS"
                    >
                      <RefreshCw className={`w-3 h-3 ${geoDetecting ? 'animate-spin' : ''}`} />
                      <span>{geoDetecting ? 'Mengecek...' : 'Perbarui'}</span>
                    </button>
                  </div>

                  {/* Lokasi Info Title */}
                  <div className="flex items-center justify-center gap-1.5 text-xs text-[#374151] font-semibold text-center flex-wrap">
                    {geoDetecting || (loading && geoValidation.status === 'idle') ? (
                      <Loader2 className="w-4 h-4 text-[#F97316] animate-spin shrink-0" />
                    ) : geoValidation.status === 'in_radius' ? (
                      <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                    ) : geoValidation.status === 'out_of_radius' ? (
                      <MapPin className="w-4 h-4 text-rose-500 shrink-0" />
                    ) : geoValidation.status === 'uncertain' ? (
                      <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
                    ) : geoValidation.status === 'error' ? (
                      <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                    ) : (
                      <MapPin className="w-4 h-4 text-[#F97316] shrink-0" />
                    )}

                    <span>
                      {loading || (geoDetecting && !geoValidation.userCoords) ? (
                        'Mendeteksi posisi GPS...'
                      ) : geoValidation.status === 'in_radius' && geoValidation.matchedLocation ? (
                        geoValidation.matchedLocation.name
                      ) : (geoValidation.status === 'out_of_radius' || geoValidation.status === 'uncertain') && geoValidation.nearestLocation ? (
                        geoValidation.nearestLocation.name
                      ) : activeLocations.length > 0 ? (
                        `${activeLocations.length} Titik Presensi Sekolah`
                      ) : (
                        'Titik Presensi Sekolah'
                      )}
                    </span>

                    {/* Radius / Jarak info */}
                    {geoValidation.status === 'in_radius' && geoValidation.matchedLocation ? (
                      <span className="text-[11px] text-[#6B7280] font-normal">
                        ({geoValidation.matchedLocation.radiusMeters}m · Jarak ±{formatDistanceDisplay(geoValidation.nearestDistanceMeters ?? 0)})
                      </span>
                    ) : geoValidation.status === 'out_of_radius' && geoValidation.nearestLocation ? (
                      <span className="text-[11px] text-[#6B7280] font-normal">
                        (Radius {geoValidation.nearestLocation.radiusMeters}m · Jarak ±{formatDistanceDisplay(geoValidation.nearestDistanceMeters ?? 0)})
                      </span>
                    ) : geoValidation.status === 'uncertain' && geoValidation.nearestLocation ? (
                      <span className="text-[11px] text-[#6B7280] font-normal">
                        (Radius {geoValidation.nearestLocation.radiusMeters}m · Jarak ±{formatDistanceDisplay(geoValidation.nearestDistanceMeters ?? 0)}{geoValidation.userCoords?.accuracy ? ` · Akurasi ±${formatDistanceDisplay(geoValidation.userCoords.accuracy)}` : ''})
                      </span>
                    ) : null}
                  </div>

                  {/* Status Banner Text */}
                  <div
                    className={`pt-1.5 border-t border-[#E5E7EB]/60 w-full text-center text-xs font-semibold flex items-center justify-center gap-1.5 ${
                      loading || (geoDetecting && !geoValidation.userCoords)
                        ? 'text-[#6B7280]'
                        : geoValidation.status === 'in_radius'
                        ? 'text-emerald-700'
                        : geoValidation.status === 'out_of_radius'
                        ? 'text-rose-600'
                        : geoValidation.status === 'uncertain'
                        ? 'text-amber-700'
                        : geoValidation.status === 'error'
                        ? 'text-rose-700'
                        : 'text-[#6B7280]'
                    }`}
                  >
                    {loading || (geoDetecting && !geoValidation.userCoords) ? (
                      <span>Mendeteksi koordinat GPS...</span>
                    ) : geoValidation.status === 'in_radius' ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span>Dalam radius presensi ({geoValidation.matchedLocation?.name})</span>
                      </>
                    ) : geoValidation.status === 'out_of_radius' ? (
                      <>
                        <XCircle className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        <span>Di luar radius presensi (±{formatDistanceDisplay(geoValidation.nearestDistanceMeters ?? 0)} dari {geoValidation.nearestLocation?.name || 'sekolah'})</span>
                      </>
                    ) : geoValidation.status === 'uncertain' ? (
                      <>
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>{geoValidation.errorMessage || 'Akurasi GPS rendah — perbarui lokasi'}</span>
                      </>
                    ) : geoValidation.status === 'error' ? (
                      <>
                        <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                        <span>{geoValidation.errorMessage || 'Lokasi gagal dideteksi'}</span>
                      </>
                    ) : activeLocations.length === 0 ? (
                      <span>Titik presensi belum dikonfigurasi</span>
                    ) : (
                      <span>Menunggu verifikasi sensor lokasi</span>
                    )}
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
                          disabled={loading || submitting || isCameraOpen || !evalCheckIn.allowed}
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
                          disabled={loading || submitting || isCameraOpen || !evalCheckOut.allowed}
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
                submitting={submitting || isCameraOpen}
                onCheckIn={handleCheckIn}
              />

              <CheckOutCard
                schedule={schedule}
                todayAttendance={todayAttendance}
                evalCheckOut={evalCheckOut}
                loading={loading}
                submitting={submitting || isCameraOpen}
                onCheckOut={handleCheckOut}
              />
            </div>

            {/* Work Schedule & Location Information Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <WorkScheduleCard schedule={schedule} loading={loading} />
              <AttendanceLocationCard
                location={location}
                activeLocations={activeLocations}
                validation={geoValidation}
                geoDetecting={geoDetecting}
                loading={loading}
                onRefreshLocation={() => detectUserLocation()}
              />
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

      {/* Camera Capture Modal for Attendance Selfie */}
      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={handleCameraClose}
        onCapture={handlePhotoConfirmed}
        title={
          pendingAttendanceType === 'check_in'
            ? 'Foto Selfie Presensi Masuk'
            : 'Foto Selfie Presensi Pulang'
        }
        description="Posisikan wajah Anda tepat di dalam area panduan foto"
      />
    </div>
  );
};

