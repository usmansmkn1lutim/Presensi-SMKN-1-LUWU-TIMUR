import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Building,
  Phone,
  Shield,
  FileText,
  Edit2,
  Power,
  Link2,
  CheckCircle2,
  AlertCircle,
  Clock,
  IdCard,
  Trash2,
  CalendarCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Badge, RoleBadge } from '../../components/ui/Badge';
import { UserAvatar } from '../../components/ui/UserAvatar';
import { employeeService, EmployeeWithRelations } from '../../services/employeeService';
import { EmployeeFormModal } from '../../components/employees/EmployeeFormModal';
import { StatusConfirmModal } from '../../components/employees/StatusConfirmModal';
import { LinkProfileModal } from '../../components/employees/LinkProfileModal';
import { DeleteEmployeeModal } from '../../components/employees/DeleteEmployeeModal';
import { EmployeeAttendanceHistoryCard } from '../../components/employees/EmployeeAttendanceHistoryCard';
import { MonthlyStatisticsSection } from '../../components/employees/MonthlyStatisticsSection';
import { HistoryCalendarMobile } from '../../components/history/HistoryCalendarMobile';
import { AttendanceSelfieCard } from '../../components/history/AttendanceSelfieCard';
import { attendanceStatusService, EvaluatedStatusResult } from '../../services/attendanceStatusService';
import {
  getMakassarTodayDateString,
  getMakassarFirstDayOfMonthString,
  formatMakassarTime,
  formatMakassarShortDate,
} from '../../services/attendanceReportService';
import { AttendanceHistoryRecord } from '../../types/attendanceHistory.types';

export const EmployeeDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [employee, setEmployee] = useState<EmployeeWithRelations | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Modals
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const canManage =
    currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  const loadEmployee = async () => {
    if (!id) return;
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await employeeService.getEmployeeById(id);
      if (!data) {
        setErrorMessage('Data pegawai tidak ditemukan.');
      } else {
        setEmployee(data);
      }
    } catch {
      setErrorMessage('Gagal memuat data pegawai.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEmployee();
  }, [id]);

  const handleEditSuccess = (savedEmployee: EmployeeWithRelations) => {
    setEmployee(savedEmployee);
    setSuccessToast('Data pegawai berhasil diperbarui.');
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const handleStatusSuccess = () => {
    loadEmployee();
    setSuccessToast('Status keaktifan pegawai berhasil diperbarui.');
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const handleLinkSuccess = () => {
    loadEmployee();
    setSuccessToast('Akun pengguna berhasil dihubungkan dengan pegawai.');
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const handleDeleteSuccess = () => {
    navigate('/employees');
  };

  // --- Attendance Data State (Atomic Delta Fetching Architecture) ---
  const [matrixData, setMatrixData] = useState<EvaluatedStatusResult[]>([]);
  const [isAttendanceLoading, setIsAttendanceLoading] = useState(true);
  const [attendanceError, setAttendanceError] = useState<string | null>(null);

  // View Mode toggle state ('table' | 'calendar')
  const [viewMode, setViewMode] = useState<'table' | 'calendar'>('table');

  // 1. Independent Table Period Filter State
  const [tablePeriod, setTablePeriod] = useState<{ startDate: string; endDate: string }>(() => ({
    startDate: getMakassarFirstDayOfMonthString(),
    endDate: getMakassarTodayDateString(),
  }));

  // 2. Independent Calendar Month State
  const [calendarMonth, setCalendarMonth] = useState(() => ({
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
  }));

  // 3. Independent Statistics Month & Year Filter State (Top Section)
  const [statsMonth, setStatsMonth] = useState(() => ({
    month: new Date().getMonth(),
    year: new Date().getFullYear(),
  }));

  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const activeRangesRef = useRef<{ startDate: string; endDate: string }[]>([]);
  const loadedRangesRef = useRef<{ startDate: string; endDate: string }[]>([]);
  const employeeGenerationRef = useRef(0);

  const loadAttendanceHistory = async (empId: string, period: { startDate: string; endDate: string }) => {
    const currentGeneration = employeeGenerationRef.current;
    
    // Check if period is already loaded or active
    const isAlreadyLoaded = loadedRangesRef.current.some(
      (r) => r.startDate <= period.startDate && r.endDate >= period.endDate
    );
    const isAlreadyActive = activeRangesRef.current.some(
      (r) => r.startDate === period.startDate && r.endDate === period.endDate
    );

    if (isAlreadyLoaded || isAlreadyActive) {
      return;
    }

    setIsAttendanceLoading(true);
    setAttendanceError(null);

    const delta = period;
    
    // Atomic Reservation
    activeRangesRef.current.push(delta);

    try {
      const results = await attendanceStatusService.getEvaluatedMatrix(
        delta.startDate,
        delta.endDate,
        empId
      );

      // Validation and Atomic Merge
      if (employeeGenerationRef.current === currentGeneration) {
        setMatrixData((prev) => {
          const map = new Map(prev.map((item) => [`${item.employeeId}:${item.date}`, item]));
          results.forEach((item) => map.set(`${item.employeeId}:${item.date}`, item));
          return Array.from(map.values());
        });
        
        // Finalize Reservation
        loadedRangesRef.current.push(delta);
      }
    } catch (err) {
      if (employeeGenerationRef.current === currentGeneration) {
        setAttendanceError(err instanceof Error ? err.message : 'Gagal memuat riwayat presensi.');
      }
    } finally {
      if (employeeGenerationRef.current === currentGeneration) {
        activeRangesRef.current = activeRangesRef.current.filter((r) => r !== delta);
        setIsAttendanceLoading(false);
      }
    }
  };

  // Trigger fetching when id, tablePeriod, statsMonth, or calendarMonth changes
  useEffect(() => {
    if (id) {
      // Delta fetch for tablePeriod
      loadAttendanceHistory(id, tablePeriod);

      // Delta fetch for statsMonth
      const statsMonthStr = String(statsMonth.month + 1).padStart(2, '0');
      const statsLastDay = new Date(statsMonth.year, statsMonth.month + 1, 0).getDate();
      const statsPeriod = {
        startDate: `${statsMonth.year}-${statsMonthStr}-01`,
        endDate: `${statsMonth.year}-${statsMonthStr}-${String(statsLastDay).padStart(2, '0')}`,
      };
      loadAttendanceHistory(id, statsPeriod);

      // Delta fetch for calendarMonth
      const calMonthStr = String(calendarMonth.month + 1).padStart(2, '0');
      const calLastDay = new Date(calendarMonth.year, calendarMonth.month + 1, 0).getDate();
      const calendarPeriod = {
        startDate: `${calendarMonth.year}-${calMonthStr}-01`,
        endDate: `${calendarMonth.year}-${calMonthStr}-${String(calLastDay).padStart(2, '0')}`,
      };
      loadAttendanceHistory(id, calendarPeriod);
    }
  }, [id, tablePeriod, statsMonth, calendarMonth]);

  // Reset state when changing employee ID
  useEffect(() => {
    if (id) {
      employeeGenerationRef.current += 1;
      setMatrixData([]);
      loadedRangesRef.current = [];
      activeRangesRef.current = [];
    }
  }, [id]);

  // Adapter for calendar usage
  const attendanceRecordsForCalendar: AttendanceHistoryRecord[] = useMemo(() => {
    return matrixData.map((res): AttendanceHistoryRecord => ({
      id: `${res.employeeId}:${res.date}`,
      employee_id: res.employeeId,
      attendance_date: res.date,
      check_in_at: res.checkInAt,
      check_out_at: res.checkOutAt,
      check_in_status: res.substatus === 'late' ? 'late' : (res.checkInAt ? 'on_time' : null),
      check_out_status: null,
      check_in_location_id: null,
      check_out_location_id: null,
      check_in_latitude: null,
      check_in_longitude: null,
      check_out_latitude: null,
      check_out_longitude: null,
      check_in_photo_path: res.checkInPhotoPath || null,
      check_out_photo_path: res.checkOutPhotoPath || null,
      notes: res.notes,
      created_at: new Date(res.date).toISOString(),
      updated_at: new Date(res.date).toISOString(),
      official_status: res.status,
      status_label: res.statusLabel
    }));
  }, [matrixData]);

  // Selected date record details
  const selectedDateRecord = useMemo(() => {
    if (!selectedDate) return null;
    return matrixData.find((item) => item.date === selectedDate) || null;
  }, [selectedDate, matrixData]);

  if (isLoading) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-3 border-[#F97316] border-t-transparent rounded-full animate-spin" />
        <p className="text-xs text-[#6B7280] dark:text-[#A3A3A3]">Memuat rincian data pegawai...</p>
      </div>
    );
  }

  if (errorMessage || !employee) {
    return (
      <div className="space-y-4 max-w-lg mx-auto py-12 text-center">
        <div className="w-12 h-12 rounded-2xl bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">
          {errorMessage || 'Data Pegawai Tidak Ditemukan'}
        </h2>
        <p className="text-xs text-[#6B7280] dark:text-[#A3A3A3]">
          Data pegawai tidak ditemukan atau Anda tidak memiliki izin akses ke data ini.
        </p>
        <div className="pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/employees')}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Kembali ke Data Pegawai
          </Button>
        </div>
      </div>
    );
  }

  const isLinked = !!employee.profile_id && (employee.profiles?.is_active ?? true);
  const isMale = employee.gender === 'male';
  const genderLabel = isMale ? 'Laki-laki' : employee.gender === 'female' ? 'Perempuan' : 'Belum diisi';

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Feedback */}
      {successToast && (
        <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-200 flex items-center gap-2.5 text-xs animate-in fade-in slide-in-from-top-2 duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="font-semibold">{successToast}</span>
        </div>
      )}

      {/* Top Navigation & Action Bar */}
      <div className="flex items-center justify-between">
        <Link
          to="/employees"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6B7280] dark:text-[#A3A3A3] hover:text-[#111827] dark:hover:text-[#F9FAFB] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Data Pegawai</span>
        </Link>
      </div>

      {/* Main 2-Column Grid Layout (35% : 65%) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 xl:grid-cols-12 gap-6 items-start">
        
        {/* KOLOM KIRI — 35% (Profil & Informasi Kepegawaian) */}
        <div className="lg:col-span-5 xl:col-span-4 space-y-6">
          {/* 1. Main Profile Header Card */}
          <div className="bg-[#FFFFFF] dark:bg-[#262626] border border-[#E5E7EB] dark:border-[#404040] rounded-2xl p-6 shadow-2xs space-y-6">
            <div className="flex flex-col items-center text-center space-y-4">
              {/* Foto / Avatar */}
              <div className="relative">
                <UserAvatar
                  userId={employee.profile_id}
                  photoUrl={employee.photo_url}
                  name={employee.full_name}
                  className="w-24 h-24 rounded-full object-cover border-2 border-[#E5E7EB] dark:border-[#404040] shadow-2xs"
                />
                <div className="absolute bottom-0 right-0 p-1 bg-white dark:bg-[#1F1F1F] rounded-full shadow-2xs border border-[#E5E7EB] dark:border-[#404040]">
                  {employee.status === 'active' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-gray-400 dark:text-gray-500" />
                  )}
                </div>
              </div>

              {/* Identity Headers */}
              <div className="space-y-1.5 w-full">
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-[#111827] dark:text-[#F9FAFB] tracking-tight">
                    {employee.full_name}
                  </h1>
                  <Badge
                    variant={employee.status === 'active' ? 'success' : 'danger'}
                    size="sm"
                  >
                    {employee.status === 'active' ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                </div>

                <p className="text-xs text-[#6B7280] dark:text-[#A3A3A3] font-mono">
                  NIP: <span className="font-semibold text-[#111827] dark:text-[#F9FAFB]">{employee.nip || '—'}</span>
                </p>

                <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#F3F3F6] dark:bg-[#303030] text-[#374151] dark:text-slate-300 border border-[#E5E7EB] dark:border-[#404040]">
                    {employee.employee_type || 'PNS'}
                  </span>
                  {employee.positions && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FFF7ED] dark:bg-orange-950/40 text-[#F97316] dark:text-orange-400 border border-orange-200 dark:border-orange-900/50">
                      {employee.positions.name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Management Action Buttons */}
            {canManage && (
              <div className="pt-4 border-t border-[#E5E7EB] dark:border-[#404040] space-y-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setIsEditModalOpen(true)}
                  leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                  className="w-full justify-center"
                >
                  Edit Pegawai
                </Button>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsStatusModalOpen(true)}
                    leftIcon={<Power className="w-3.5 h-3.5" />}
                    className={`justify-center ${
                      employee.status === 'active'
                        ? 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40 border-amber-200 dark:border-amber-800/60'
                        : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60'
                    }`}
                  >
                    {employee.status === 'active' ? 'Nonaktif' : 'Aktifkan'}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsDeleteModalOpen(true)}
                    leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                    className="justify-center text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/40 border-red-200 dark:border-red-800/60"
                  >
                    Hapus
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* 2. Card Identitas & Nomor Registrasi */}
          <div className="bg-[#FFFFFF] dark:bg-[#262626] border border-[#E5E7EB] dark:border-[#404040] rounded-2xl p-5 space-y-3.5 shadow-2xs">
            <h3 className="text-xs font-bold text-[#111827] dark:text-[#F9FAFB] uppercase tracking-wider pb-2.5 border-b border-[#E5E7EB] dark:border-[#404040] flex items-center gap-2 text-[#F97316] dark:text-orange-400">
              <IdCard className="w-4 h-4" />
              <span>Identitas & Registrasi</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-start justify-between py-1 border-b border-[#F3F4F6] dark:border-[#333333]">
                <span className="text-[#6B7280] dark:text-[#A3A3A3] font-semibold">Nama Lengkap</span>
                <span className="font-bold text-[#111827] dark:text-[#F9FAFB] text-right">{employee.full_name}</span>
              </div>

              <div className="flex items-start justify-between py-1 border-b border-[#F3F4F6] dark:border-[#333333]">
                <span className="text-[#6B7280] dark:text-[#A3A3A3] font-semibold">NIP</span>
                <span className="font-mono text-[#111827] dark:text-[#F9FAFB]">{employee.nip || '—'}</span>
              </div>

              <div className="flex items-start justify-between py-1 border-b border-[#F3F4F6] dark:border-[#333333]">
                <span className="text-[#6B7280] dark:text-[#A3A3A3] font-semibold">NIK</span>
                <span className="font-mono text-[#111827] dark:text-[#F9FAFB]">{employee.nik || '—'}</span>
              </div>

              <div className="flex items-start justify-between py-1 border-b border-[#F3F4F6] dark:border-[#333333]">
                <span className="text-[#6B7280] dark:text-[#A3A3A3] font-semibold">No. Pegawai</span>
                <span className="font-mono text-[#111827] dark:text-[#F9FAFB]">{employee.employee_number || '—'}</span>
              </div>

              <div className="flex items-start justify-between py-1 border-b border-[#F3F4F6] dark:border-[#333333]">
                <span className="text-[#6B7280] dark:text-[#A3A3A3] font-semibold">Jenis Kelamin</span>
                <span className="text-[#111827] dark:text-[#F9FAFB]">{genderLabel}</span>
              </div>

              <div className="flex items-start justify-between py-1 border-b border-[#F3F4F6] dark:border-[#333333]">
                <span className="text-[#6B7280] dark:text-[#A3A3A3] font-semibold">Jenis Kepegawaian</span>
                <span className="text-[#111827] dark:text-[#F9FAFB] font-semibold">{employee.employee_type || '—'}</span>
              </div>

              <div className="flex items-start justify-between py-1">
                <span className="text-[#6B7280] dark:text-[#A3A3A3] font-semibold">Tgl Bergabung</span>
                <span className="text-[#111827] dark:text-[#F9FAFB]">
                  {employee.join_date
                    ? new Date(employee.join_date).toLocaleDateString('id-ID', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })
                    : '—'}
                </span>
              </div>
            </div>
          </div>

          {/* 3. Card Satuan Kerja & Jabatan */}
          <div className="bg-[#FFFFFF] dark:bg-[#262626] border border-[#E5E7EB] dark:border-[#404040] rounded-2xl p-5 space-y-3.5 shadow-2xs">
            <h3 className="text-xs font-bold text-[#111827] dark:text-[#F9FAFB] uppercase tracking-wider pb-2.5 border-b border-[#E5E7EB] dark:border-[#404040] flex items-center gap-2 text-[#F97316] dark:text-orange-400">
              <Building className="w-4 h-4" />
              <span>Satuan Kerja & Jabatan</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-start justify-between py-1 border-b border-[#F3F4F6] dark:border-[#333333]">
                <span className="text-[#6B7280] dark:text-[#A3A3A3] font-semibold">Department</span>
                <span className="font-bold text-[#111827] dark:text-[#F9FAFB] text-right">
                  {employee.departments?.name || 'Belum Ditentukan'}
                </span>
              </div>

              <div className="flex items-start justify-between py-1 border-b border-[#F3F4F6] dark:border-[#333333]">
                <span className="text-[#6B7280] dark:text-[#A3A3A3] font-semibold">Jabatan</span>
                <span className="font-bold text-[#111827] dark:text-[#F9FAFB] text-right">
                  {employee.positions?.name || 'Belum Ditentukan'}
                </span>
              </div>

              <div className="flex items-start justify-between py-1 border-b border-[#F3F4F6] dark:border-[#333333]">
                <span className="text-[#6B7280] dark:text-[#A3A3A3] font-semibold">Status</span>
                <span>
                  <Badge
                    variant={employee.status === 'active' ? 'success' : 'danger'}
                    size="sm"
                  >
                    {employee.status === 'active' ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                </span>
              </div>

              <div className="flex items-start justify-between py-1">
                <span className="text-[#6B7280] dark:text-[#A3A3A3] font-semibold">Deskripsi Unit</span>
                <span className="text-[#6B7280] dark:text-[#A3A3A3] text-right max-w-[60%]">
                  {employee.departments?.description || '—'}
                </span>
              </div>
            </div>
          </div>

          {/* 4. Card Kontak & Komunikasi */}
          <div className="bg-[#FFFFFF] dark:bg-[#262626] border border-[#E5E7EB] dark:border-[#404040] rounded-2xl p-5 space-y-3.5 shadow-2xs">
            <h3 className="text-xs font-bold text-[#111827] dark:text-[#F9FAFB] uppercase tracking-wider pb-2.5 border-b border-[#E5E7EB] dark:border-[#404040] flex items-center gap-2 text-[#F97316] dark:text-orange-400">
              <Phone className="w-4 h-4" />
              <span>Kontak & Komunikasi</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-start justify-between py-1 border-b border-[#F3F4F6] dark:border-[#333333]">
                <span className="text-[#6B7280] dark:text-[#A3A3A3] font-semibold">Nomor Telepon</span>
                <span className="font-mono text-[#111827] dark:text-[#F9FAFB]">{employee.phone || 'Belum diisi'}</span>
              </div>

              <div className="flex items-start justify-between py-1">
                <span className="text-[#6B7280] dark:text-[#A3A3A3] font-semibold">Email</span>
                <span className="text-[#111827] dark:text-[#F9FAFB] font-medium truncate max-w-[65%]" title={employee.email || ''}>
                  {employee.email || 'Belum diisi'}
                </span>
              </div>
            </div>
          </div>

          {/* 5. Card Status Akun Supabase */}
          <div className="bg-[#FFFFFF] dark:bg-[#262626] border border-[#E5E7EB] dark:border-[#404040] rounded-2xl p-5 space-y-3.5 shadow-2xs">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#E5E7EB] dark:border-[#404040]">
              <h3 className="text-xs font-bold text-[#111827] dark:text-[#F9FAFB] uppercase tracking-wider flex items-center gap-2 text-[#F97316] dark:text-orange-400">
                <Shield className="w-4 h-4" />
                <span>Status Akun</span>
              </h3>

              {isLinked ? (
                <Badge variant="success" size="sm">
                  Terhubung
                </Badge>
              ) : (
                <Badge variant="warning" size="sm">
                  Belum Terhubung
                </Badge>
              )}
            </div>

            <div className="space-y-3 text-xs">
              {isLinked && employee.profiles ? (
                <div className="p-3 rounded-xl bg-[#F9FAFB] dark:bg-[#1F1F1F] border border-[#E5E7EB] dark:border-[#404040] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[#6B7280] dark:text-[#A3A3A3]">Nama Akun:</span>
                    <span className="font-bold text-[#111827] dark:text-[#F9FAFB]">{employee.profiles.full_name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#6B7280] dark:text-[#A3A3A3]">Role:</span>
                    <RoleBadge role={employee.profiles.role} size="sm" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#6B7280] dark:text-[#A3A3A3]">Status Akun:</span>
                    <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                      {employee.profiles.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#6B7280] dark:text-[#A3A3A3]">Last Login:</span>
                    <span className="font-mono text-[11px] text-[#111827] dark:text-[#F9FAFB]">
                      {employee.profiles.last_login_at
                        ? new Date(employee.profiles.last_login_at).toLocaleString('id-ID', {
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })
                        : 'Belum pernah login'}
                    </span>
                  </div>
                </div>
              ) : (
                <div className="p-3.5 rounded-xl bg-[#FFF7ED] dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900/50 text-center space-y-2">
                  <p className="font-bold text-[#111827] dark:text-orange-200">Akun Belum Terhubung</p>
                  <p className="text-[11px] text-[#6B7280] dark:text-slate-300">
                    Pegawai ini belum terhubung dengan akun login pengguna.
                  </p>
                  {canManage && (
                    <div className="pt-1">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setIsLinkModalOpen(true)}
                        leftIcon={<Link2 className="w-3.5 h-3.5" />}
                        className="w-full justify-center"
                      >
                        Hubungkan Akun
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* 6. Card Catatan Kepegawaian & Audit Metadata */}
          <div className="bg-[#FFFFFF] dark:bg-[#262626] border border-[#E5E7EB] dark:border-[#404040] rounded-2xl p-5 space-y-3.5 shadow-2xs">
            <h3 className="text-xs font-bold text-[#111827] dark:text-[#F9FAFB] uppercase tracking-wider pb-2.5 border-b border-[#E5E7EB] dark:border-[#404040] flex items-center gap-2 text-[#F97316] dark:text-orange-400">
              <FileText className="w-4 h-4" />
              <span>Catatan Kepegawaian</span>
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <p className="text-[#374151] dark:text-slate-300 p-3 rounded-xl bg-[#F9FAFB] dark:bg-[#1F1F1F] border border-[#E5E7EB] dark:border-[#404040] leading-relaxed">
                  {employee.notes || 'Tidak ada catatan tambahan untuk pegawai ini.'}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2 pt-2 border-t border-[#F3F4F6] dark:border-[#333333] text-[11px] text-[#6B7280] dark:text-[#A3A3A3]">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#9CA3AF] shrink-0" />
                  <span>
                    Dibuat:{' '}
                    <span className="font-mono text-[#374151] dark:text-slate-300">
                      {new Date(employee.created_at).toLocaleString('id-ID', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#9CA3AF] shrink-0" />
                  <span>
                    Diperbarui:{' '}
                    <span className="font-mono text-[#374151] dark:text-slate-300">
                      {new Date(employee.updated_at).toLocaleString('id-ID', {
                        dateStyle: 'medium',
                        timeStyle: 'short',
                      })}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* KOLOM KANAN — 65% (Statistik & Riwayat Kehadiran) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">
          {/* 1. Statistik Kehadiran Bulanan (Paling Atas) */}
          <MonthlyStatisticsSection
            matrixData={matrixData}
            isLoading={isAttendanceLoading}
            error={attendanceError}
            statsMonth={statsMonth}
            onStatsMonthChange={setStatsMonth}
          />

          {/* 2. Riwayat Kehadiran (Dengan Toggle Tabel / Kalender) */}
          <EmployeeAttendanceHistoryCard
            matrixData={matrixData}
            isLoading={isAttendanceLoading}
            error={attendanceError}
            tablePeriod={tablePeriod}
            onPeriodChange={setTablePeriod}
            viewMode={viewMode}
            onViewModeChange={setViewMode}
            calendarContent={
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                {/* HistoryCalendarMobile Widget */}
                <HistoryCalendarMobile
                  onDateSelect={setSelectedDate}
                  onMonthChange={(y, m) => setCalendarMonth({ year: y, month: m })}
                  selectedDate={selectedDate || ''}
                  currentDate={new Date(calendarMonth.year, calendarMonth.month)}
                  records={attendanceRecordsForCalendar}
                />

                {/* Panel Detail Tanggal Terpilih: Dua Card Check-in dan Check-out */}
                <div className="space-y-4">
                  {selectedDate ? (
                    <div className="space-y-4">
                      {/* Card Check-in */}
                      <AttendanceSelfieCard
                        type="check_in"
                        photoPath={selectedDateRecord?.checkInPhotoPath}
                        time={selectedDateRecord?.checkInAt}
                        date={selectedDate}
                        locationName={selectedDateRecord?.checkInLocation}
                        statusLabel={selectedDateRecord?.statusLabel}
                        notes={selectedDateRecord?.notes}
                      />

                      {/* Card Check-out */}
                      <AttendanceSelfieCard
                        type="check_out"
                        photoPath={selectedDateRecord?.checkOutPhotoPath}
                        time={selectedDateRecord?.checkOutAt}
                        date={selectedDate}
                        locationName={selectedDateRecord?.checkOutLocation}
                        statusLabel={selectedDateRecord?.statusLabel}
                        notes={selectedDateRecord?.notes}
                      />
                    </div>
                  ) : (
                    <div className="bg-[#FFFFFF] dark:bg-[#262626] border border-[#E5E7EB] dark:border-[#404040] rounded-2xl p-6 border-dashed text-center space-y-2 shadow-2xs">
                      <div className="w-10 h-10 rounded-2xl bg-[#F9FAFB] dark:bg-[#1F1F1F] text-[#6B7280] dark:text-slate-400 flex items-center justify-center mx-auto border border-[#E5E7EB] dark:border-[#404040]">
                        <CalendarCheck className="w-5 h-5 text-[#9CA3AF]" />
                      </div>
                      <p className="text-xs font-bold text-[#374151] dark:text-slate-200">Belum ada tanggal dipilih</p>
                      <p className="text-[11px] text-[#6B7280] dark:text-slate-400 max-w-xs mx-auto leading-relaxed">
                        Pilih salah satu tanggal pada kalender di sebelah kiri untuk melihat rincian kartu presensi Check-in dan Check-out.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            }
          />

        </div>

      </div>

      {/* Action Modals */}
      <EmployeeFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={handleEditSuccess}
        employeeToEdit={employee}
      />

      <LinkProfileModal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        onSuccess={handleLinkSuccess}
        employee={employee}
      />

      <StatusConfirmModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        onSuccess={handleStatusSuccess}
        employee={employee}
        targetStatus={employee.status === 'active' ? 'inactive' : 'active'}
      />

      <DeleteEmployeeModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        employee={employee}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
};
