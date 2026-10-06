import React, { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Badge, RoleBadge } from '../../components/ui/Badge';
import { employeeService, EmployeeWithRelations } from '../../services/employeeService';
import { EmployeeFormModal } from '../../components/employees/EmployeeFormModal';
import { StatusConfirmModal } from '../../components/employees/StatusConfirmModal';
import { LinkProfileModal } from '../../components/employees/LinkProfileModal';
import { DeleteEmployeeModal } from '../../components/employees/DeleteEmployeeModal';
import { EmployeeAttendanceHistoryCard } from '../../components/employees/EmployeeAttendanceHistoryCard';

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

  const handleDeleteSuccess = (deletedEmployee: { id: string; full_name: string }) => {
    navigate('/employees');
  };

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
            ← Kembali ke Data Pegawai
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

      {/* Top Breadcrumb & Back Button */}
      <div className="flex items-center justify-between">
        <Link
          to="/employees"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#6B7280] hover:text-[#111827] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>← Kembali ke Data Pegawai</span>
        </Link>
      </div>

      {/* Main Profile Header Card */}
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-6 sm:p-8 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="flex items-center gap-4 sm:gap-6">
            {/* Foto / Avatar */}
            <div className="relative">
              {employee.photo_url ? (
                <img
                  src={employee.photo_url}
                  alt={employee.full_name}
                  className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-2 border-orange-200 shadow-xs"
                />
              ) : (
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-[#FFF7ED] border-2 border-orange-200 text-[#F97316] flex items-center justify-center font-bold text-2xl sm:text-3xl shadow-xs">
                  {employee.full_name.charAt(0)}
                </div>
              )}
              <div className="absolute -bottom-1 -right-1 p-1 bg-white rounded-full shadow-2xs">
                {employee.status === 'active' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-gray-500" />
                )}
              </div>
            </div>

            {/* Profile Info */}
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-bold text-[#111827]">
                  {employee.full_name}
                </h1>
                <Badge
                  variant={employee.status === 'active' ? 'success' : 'danger'}
                  size="sm"
                >
                  {employee.status === 'active' ? 'Aktif' : 'Nonaktif'}
                </Badge>
              </div>

              <p className="text-xs sm:text-sm text-[#4B5563] font-mono">
                NIP: <span className="font-semibold text-[#111827]">{employee.nip || '—'}</span>
              </p>

              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#F3F4F6] text-[#374151] border border-[#E5E7EB]">
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

          {/* Action Buttons for Admin / Super Admin */}
          {canManage && (
            <div className="flex items-center gap-2 sm:flex-col sm:items-end">
              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsEditModalOpen(true)}
                leftIcon={<Edit2 className="w-3.5 h-3.5" />}
              >
                Edit Pegawai
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsStatusModalOpen(true)}
                leftIcon={<Power className="w-3.5 h-3.5" />}
                className={
                  employee.status === 'active'
                    ? 'text-amber-700 hover:bg-amber-50 border-amber-200'
                    : 'text-emerald-700 hover:bg-emerald-50 border-emerald-200'
                }
              >
                {employee.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsDeleteModalOpen(true)}
                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
              >
                Hapus Pegawai
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Grid of Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Identitas & Nomor Registrasi */}
        <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-6 space-y-4">
          <h3 className="text-xs font-bold text-[#111827] uppercase tracking-wider pb-3 border-b border-[#E5E7EB] flex items-center gap-2 text-[#F97316]">
            <IdCard className="w-4 h-4" />
            <span>Identitas & Nomor Registrasi</span>
          </h3>

          <div className="space-y-3.5 text-xs">
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
              <span className="text-[#6B7280] font-semibold">Nomor Pegawai</span>
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
              <span className="text-[#6B7280] font-semibold">Tanggal Bergabung</span>
              <span className="text-[#111827]">
                {employee.join_date
                  ? new Date(employee.join_date).toLocaleDateString('id-ID', {
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })
                  : '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Satuan Kerja & Jabatan */}
        <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-6 space-y-4">
          <h3 className="text-xs font-bold text-[#111827] uppercase tracking-wider pb-3 border-b border-[#E5E7EB] flex items-center gap-2 text-[#F97316]">
            <Building className="w-4 h-4" />
            <span>Satuan Kerja & Jabatan</span>
          </h3>

          <div className="space-y-3.5 text-xs">
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
        <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-6 space-y-4">
          <h3 className="text-xs font-bold text-[#111827] uppercase tracking-wider pb-3 border-b border-[#E5E7EB] flex items-center gap-2 text-[#F97316]">
            <Phone className="w-4 h-4" />
            <span>Kontak & Komunikasi</span>
          </h3>

          <div className="space-y-3.5 text-xs">
            <div className="flex items-start justify-between py-1 border-b border-[#F3F4F6]">
              <span className="text-[#6B7280] font-semibold">Nomor Telepon</span>
              <span className="font-mono text-[#111827]">{employee.phone || 'Belum diisi'}</span>
            </div>

            <div className="flex items-start justify-between py-1">
              <span className="text-[#6B7280] font-semibold">Email</span>
              <span className="text-[#111827]">{employee.email || 'Belum diisi'}</span>
            </div>
          </div>
        </div>

        {/* Card 4: Status Akun Supabase */}
        <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
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
                  <span className="text-[#6B7280]">Nama Akun Profil:</span>
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
              <div className="p-4 rounded-xl bg-[#FFF7ED] border border-orange-200 text-center space-y-2">
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

      {/* Card 5: Catatan Kepegawaian & Audit Metadata */}
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-6 space-y-4">
        <h3 className="text-xs font-bold text-[#111827] uppercase tracking-wider pb-3 border-b border-[#E5E7EB] flex items-center gap-2 text-[#F97316]">
          <FileText className="w-4 h-4" />
          <span>Catatan</span>
        </h3>

        <div className="space-y-4 text-xs">
          <div>
            <p className="text-[#111827] p-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB]">
              {employee.notes || 'Tidak ada catatan tambahan untuk pegawai ini.'}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-[#F3F4F6] text-[11px] text-[#6B7280]">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-[#9CA3AF]" />
              <span>
                Dibuat:{' '}
                {new Date(employee.created_at).toLocaleString('id-ID', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
            </div>
            <div className="flex items-center gap-1.5 sm:justify-end">
              <Clock className="w-3.5 h-3.5 text-[#9CA3AF]" />
              <span>
                Diperbarui:{' '}
                {new Date(employee.updated_at).toLocaleString('id-ID', {
                  dateStyle: 'medium',
                  timeStyle: 'short',
                })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Card 6: Riwayat Kehadiran (Phase 9F) */}
      <EmployeeAttendanceHistoryCard employeeId={employee.id} />

      {/* Modals */}
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
