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

  // Trigger fetching when id, tablePeriod, or statsMonth changes
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
    }
  }, [id, tablePeriod, statsMonth]);

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
        <p className="text-xs text-[#6B7280]">Memuat rincian data pegawai...</p>
      </div>
    );
  }

  if (errorMessage || !employee) {
    return (
      <div className="space-y-4 max-w-lg mx-auto py-12 text-center">
        <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-base font-bold text-[#111827]">
          {errorMessage || 'Data Pegawai Tidak Ditemukan'}
        </h2>
        <p className="text-xs text-[#6B7280]">
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
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2.5 text-xs animate-in fade-in slide-in-from-top-2 duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{successToast}</span>
        </div>
      )}

      {/* Top Navigation & Action Bar */}
      <div className="flex items-center justify-between">
        <Link
          to="/employees"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6B7280] hover:text-[#111827] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Data Pegawai</span>
        </Link>
      </div>

      {/* Main 3-Column Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 xl:grid-cols-12 gap-6 items-start">
        
        {/* AREA A — Profil dan Informasi Pegawai */}
        <div className="lg:col-span-5 xl:col-span-3 space-y-6">
          {/* Main Profile Header Card */}
          <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-6 shadow-2xs space-y-6">
            <div className="flex flex-col items-center text-center space-y-4">
              {/* Foto / Avatar */}
              <div className="relative">
                <UserAvatar
                  userId={employee.profile_id}
                  photoUrl={employee.photo_url}
                  name={employee.full_name}
                  className="w-24 h-24 rounded-full object-cover border-2 border-[#E5E7EB] shadow-2xs"
                />
                <div className="absolute bottom-0 right-0 p-1 bg-white rounded-full shadow-2xs border border-[#E5E7EB]">
                  {employee.status === 'active' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-gray-400" />
                  )}
                </div>
              </div>

              {/* Identity Headers */}
              <div className="space-y-1.5 w-full">
                <div className="flex items-center justify-center gap-2 flex-wrap">
                  <h1 className="text-xl font-bold text-[#111827] tracking-tight">
                    {employee.full_name}
                  </h1>
                  <Badge
                    variant={employee.status === 'active' ? 'success' : 'danger'}
                    size="sm"
                  >
                    {employee.status === 'active' ? 'Aktif' : 'Nonaktif'}
                  </Badge>
                </div>

                <p className="text-xs text-[#6B7280] font-mono">
                  NIP: <span className="font-semibold text-[#111827]">{employee.nip || '—'}</span>
                </p>

                <div className="flex items-center justify-center gap-2 pt-1 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#F3F3F6] text-[#374151] border border-[#E5E7EB]">
                    {employee.employee_type || 'PNS'}
                  </span>
                  {employee.positions && (
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#FFF7ED] text-[#F97316] border border-orange-200">
                      {employee.positions.name}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Management Action Buttons */}
            {canManage && (
              <div className="pt-4 border-t border-[#E5E7EB] space-y-2">
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
                        ? 'text-amber-700 hover:bg-amber-50 border-amber-200'
                        : 'text-emerald-700 hover:bg-emerald-50 border-emerald-200'
                    }`}
                  >
                    {employee.status === 'active' ? 'Nonaktif' : 'Aktifkan'}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setIsDeleteModalOpen(true)}
                    leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                    className="justify-center text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                  >
                    Hapus
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Card 1: Identitas & Nomor Registrasi */}
          <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-5 space-y-3.5 shadow-2xs">
            <h3 className="text-xs font-bold text-[#111827] uppercase tracking-wider pb-2.5 border-b border-[#E5E7EB] flex items-center gap-2 text-[#F97316]">
              <IdCard className="w-4 h-4" />
              <span>Identitas & Registrasi</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-start justify-between py-1 border-b border-[#F3F4F6]">
                <span className="text-[#6B7280] font-semibold">Nama Lengkap</span>
                <span className="font-bold text-[#111827] text-right">{employee.full_name}</span>
              </div>

              <div className="flex items-start justify-between py-1 border-b border-[#F3F4F6]">
                <span className="text-[#6B7280] font-semibold">NIP</span>
                <span className="font-mono text-[#111827]">{employee.nip || '—'}</span>
              </div>

              <div className="flex items-start justify-between py-1 border-b border-[#F3F4F6]">
                <span className="text-[#6B7280] font-semibold">NIK</span>
                <span className="font-mono text-[#111827]">{employee.nik || '—'}</span>
              </div>

              <div className="flex items-start justify-between py-1 border-b border-[#F3F4F6]">
                <span className="text-[#6B7280] font-semibold">No. Pegawai</span>
                <span className="font-mono text-[#111827]">{employee.employee_number || '—'}</span>
              </div>

              <div className="flex items-start justify-between py-1 border-b border-[#F3F4F6]">
                <span className="text-[#6B7280] font-semibold">Jenis Kelamin</span>
                <span className="text-[#111827]">{genderLabel}</span>
              </div>

              <div className="flex items-start justify-between py-1 border-b border-[#F3F4F6]">
                <span className="text-[#6B7280] font-semibold">Jenis Kepegawaian</span>
                <span className="text-[#111827] font-semibold">{employee.employee_type || '—'}</span>
              </div>

              <div className="flex items-start justify-between py-1">
                <span className="text-[#6B7280] font-semibold">Tgl Bergabung</span>
                <span className="text-[#111827]">
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

          {/* Card 2: Satuan Kerja & Jabatan */}
          <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-5 space-y-3.5 shadow-2xs">
            <h3 className="text-xs font-bold text-[#111827] uppercase tracking-wider pb-2.5 border-b border-[#E5E7EB] flex items-center gap-2 text-[#F97316]">
              <Building className="w-4 h-4" />
              <span>Satuan Kerja & Jabatan</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-start justify-between py-1 border-b border-[#F3F4F6]">
                <span className="text-[#6B7280] font-semibold">Department</span>
                <span className="font-bold text-[#111827] text-right">
                  {employee.departments?.name || 'Belum Ditentukan'}
                </span>
              </div>

              <div className="flex items-start justify-between py-1 border-b border-[#F3F4F6]">
                <span className="text-[#6B7280] font-semibold">Jabatan</span>
                <span className="font-bold text-[#111827] text-right">
                  {employee.positions?.name || 'Belum Ditentukan'}
                </span>
              </div>

              <div className="flex items-start justify-between py-1 border-b border-[#F3F4F6]">
                <span className="text-[#6B7280] font-semibold">Status</span>
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
                <span className="text-[#6B7280] font-semibold">Deskripsi Unit</span>
                <span className="text-[#6B7280] text-right max-w-[60%]">
                  {employee.departments?.description || '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Kontak & Komunikasi */}
          <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-5 space-y-3.5 shadow-2xs">
            <h3 className="text-xs font-bold text-[#111827] uppercase tracking-wider pb-2.5 border-b border-[#E5E7EB] flex items-center gap-2 text-[#F97316]">
              <Phone className="w-4 h-4" />
              <span>Kontak & Komunikasi</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex items-start justify-between py-1 border-b border-[#F3F4F6]">
                <span className="text-[#6B7280] font-semibold">Nomor Telepon</span>
                <span className="font-mono text-[#111827]">{employee.phone || 'Belum diisi'}</span>
              </div>

              <div className="flex items-start justify-between py-1">
                <span className="text-[#6B7280] font-semibold">Email</span>
                <span className="text-[#111827] font-medium truncate max-w-[65%]" title={employee.email || ''}>
                  {employee.email || 'Belum diisi'}
                </span>
              </div>
            </div>
          </div>

          {/* Card 4: Status Akun Supabase */}
          <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-5 space-y-3.5 shadow-2xs">
            <div className="flex items-center justify-between pb-2.5 border-b border-[#E5E7EB]">
              <h3 className="text-xs font-bold text-[#111827] uppercase tracking-wider flex items-center gap-2 text-[#F97316]">
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
                <div className="p-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[#6B7280]">Nama Akun:</span>
                    <span className="font-bold text-[#111827]">{employee.profiles.full_name}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#6B7280]">Role:</span>
                    <RoleBadge role={employee.profiles.role} size="sm" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#6B7280]">Status Akun:</span>
                    <span className="font-semibold text-emerald-700">
                      {employee.profiles.is_active ? 'Aktif' : 'Nonaktif'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[#6B7280]">Last Login:</span>
                    <span className="font-mono text-[11px] text-[#111827]">
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
                <div className="p-3.5 rounded-xl bg-[#FFF7ED] border border-orange-200 text-center space-y-2">
                  <p className="font-bold text-[#111827]">Akun Belum Terhubung</p>
                  <p className="text-[11px] text-[#6B7280]">
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
        </div>

        {/* AREA B — Statistik Kehadiran Bulanan & Tabel Riwayat Presensi */}
        <div className="lg:col-span-7 xl:col-span-6 space-y-6">
          <MonthlyStatisticsSection
            matrixData={matrixData}
            isLoading={isAttendanceLoading}
            error={attendanceError}
            statsMonth={statsMonth}
            onStatsMonthChange={setStatsMonth}
          />

          <EmployeeAttendanceHistoryCard
            matrixData={matrixData}
            isLoading={isAttendanceLoading}
            error={attendanceError}
            tablePeriod={tablePeriod}
            onPeriodChange={setTablePeriod}
          />
        </div>

        {/* AREA C — Kalender, Detail & Catatan */}
        <div className="lg:col-span-12 xl:col-span-3 space-y-6">
          {/* HistoryCalendarMobile Widget */}
          <HistoryCalendarMobile
            onDateSelect={setSelectedDate}
            onMonthChange={(y, m) => setCalendarMonth({ year: y, month: m })}
            selectedDate={selectedDate || ''}
            currentDate={new Date(calendarMonth.year, calendarMonth.month)}
            records={attendanceRecordsForCalendar}
          />

          {/* Panel Detail Tanggal Terpilih */}
          <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-5 space-y-4 shadow-2xs">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
              <h3 className="text-xs font-bold text-[#111827] uppercase tracking-wider flex items-center gap-2 text-[#F97316]">
                <CalendarCheck className="w-4 h-4" />
                <span>Detail Tanggal Terpilih</span>
              </h3>
              {selectedDate && (
                <span className="px-2 py-0.5 text-[11px] font-mono font-bold bg-[#FFF7ED] text-[#F97316] rounded-md border border-orange-200">
                  {formatMakassarShortDate(selectedDate)}
                </span>
              )}
            </div>

            {selectedDate ? (
              selectedDateRecord ? (
                <div className="space-y-3 text-xs">
                  <div className="flex items-center justify-between py-1 border-b border-[#F3F4F6]">
                    <span className="text-[#6B7280] font-semibold">Status Resmi</span>
                    <span className="font-bold text-[#111827]">
                      {selectedDateRecord.statusLabel}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-[#F3F4F6]">
                    <span className="text-[#6B7280] font-semibold">Jam Masuk (Check-in)</span>
                    <span className="font-mono font-bold text-[#111827]">
                      {formatMakassarTime(selectedDateRecord.checkInAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between py-1 border-b border-[#F3F4F6]">
                    <span className="text-[#6B7280] font-semibold">Jam Pulang (Check-out)</span>
                    <span className="font-mono font-bold text-[#111827]">
                      {formatMakassarTime(selectedDateRecord.checkOutAt)}
                    </span>
                  </div>

                  {(selectedDateRecord.checkInLocation || selectedDateRecord.checkOutLocation) && (
                    <div className="flex items-start justify-between py-1 border-b border-[#F3F4F6]">
                      <span className="text-[#6B7280] font-semibold">Lokasi</span>
                      <span className="text-[#111827] text-right font-medium max-w-[60%]">
                        {selectedDateRecord.checkInLocation || selectedDateRecord.checkOutLocation}
                      </span>
                    </div>
                  )}

                  <div className="py-1">
                    <span className="text-[#6B7280] font-semibold block mb-1">Catatan / Alasan:</span>
                    <p className="p-2.5 rounded-lg bg-[#F9FAFB] border border-[#E5E7EB] text-[#374151]">
                      {selectedDateRecord.notes || 'Tidak ada catatan tambahan untuk tanggal ini.'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-[#F9FAFB] border border-dashed border-[#D1D5DB] text-center space-y-1">
                  <p className="text-xs font-semibold text-[#374151]">
                    Tidak ada data presensi pada tanggal {selectedDate}.
                  </p>
                  <p className="text-[11px] text-[#6B7280]">
                    Pegawai tidak memiliki catatan presensi atau status khusus untuk tanggal ini.
                  </p>
                </div>
              )
            ) : (
              <div className="p-4 rounded-xl bg-[#F9FAFB] border border-dashed border-[#D1D5DB] text-center space-y-1">
                <p className="text-xs font-semibold text-[#374151]">Belum ada tanggal dipilih.</p>
                <p className="text-[11px] text-[#6B7280]">
                  Pilih salah satu tanggal pada kalender di atas untuk melihat rincian presensi harian pegawai.
                </p>
              </div>
            )}
          </div>

          {/* Card: Catatan Kepegawaian & Audit Metadata */}
          <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-5 space-y-3.5 shadow-2xs">
            <h3 className="text-xs font-bold text-[#111827] uppercase tracking-wider pb-2.5 border-b border-[#E5E7EB] flex items-center gap-2 text-[#F97316]">
              <FileText className="w-4 h-4" />
              <span>Catatan Kepegawaian</span>
            </h3>

            <div className="space-y-4 text-xs">
              <div>
                <p className="text-[#374151] p-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] leading-relaxed">
                  {employee.notes || 'Tidak ada catatan tambahan untuk pegawai ini.'}
                </p>
              </div>

              <div className="grid grid-cols-1 gap-2 pt-2 border-t border-[#F3F4F6] text-[11px] text-[#6B7280]">
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[#9CA3AF] shrink-0" />
                  <span>
                    Dibuat:{' '}
                    <span className="font-mono text-[#374151]">
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
                    <span className="font-mono text-[#374151]">
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
