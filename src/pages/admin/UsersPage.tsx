import React, { useState, useEffect, useCallback } from 'react';
import {
  UserCheck,
  UserPlus,
  Search,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Eye,
  Shield,
  Clock,
  UserX,
  Users,
  Link2,
  Unlink,
  Power,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { RoleBadge, Badge } from '../../components/ui/Badge';
import {
  userService,
  UserManagementItem,
  ActiveAppRole,
  CreateUserResponse,
} from '../../services/userService';
import { CreateUserModal } from '../../components/users/CreateUserModal';
import { UserDetailModal } from '../../components/users/UserDetailModal';
import { UpdateRoleModal } from '../../components/users/UpdateRoleModal';
import { UserStatusConfirmModal } from '../../components/users/UserStatusConfirmModal';
import { LinkUserEmployeeModal } from '../../components/users/LinkUserEmployeeModal';
import { UnlinkUserEmployeeModal } from '../../components/users/UnlinkUserEmployeeModal';

const ROLE_LABELS: Record<ActiveAppRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  headmaster: 'Kepala Sekolah',
  employee: 'Pegawai',
};

export const UsersPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const canManage =
    currentUser?.role === 'admin' || currentUser?.role === 'super_admin';
  const isSuperAdmin = currentUser?.role === 'super_admin';

  // State: Data List & Stats
  const [users, setUsers] = useState<UserManagementItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // State: Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'all' | ActiveAppRole>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // State: Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserManagementItem | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [userForRoleUpdate, setUserForRoleUpdate] = useState<UserManagementItem | null>(null);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [userForStatusUpdate, setUserForStatusUpdate] = useState<UserManagementItem | null>(null);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [userForLinking, setUserForLinking] = useState<UserManagementItem | null>(null);
  const [isUnlinkModalOpen, setIsUnlinkModalOpen] = useState(false);
  const [userForUnlink, setUserForUnlink] = useState<UserManagementItem | null>(null);

  // Fetch Users
  const fetchUsersData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await userService.getUsers();
      setUsers(data);
    } catch (err: unknown) {
      console.error('Gagal memuat pengguna:', err);
      setErrorMessage('Data pengguna gagal dimuat. Silakan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsersData();
  }, [fetchUsersData]);

  // Handle Create User Success
  const handleCreateSuccess = (result: CreateUserResponse) => {
    fetchUsersData();
    setSuccessToast(
      `Pengguna "${result.user?.full_name || 'Baru'}" berhasil dibuat.`
    );
    setTimeout(() => setSuccessToast(null), 5000);
  };

  // Handle Update Role Success
  const handleRoleUpdateSuccess = (updatedUser: {
    id: string;
    role: ActiveAppRole;
    full_name?: string;
  }) => {
    fetchUsersData();
    setSuccessToast(
      `Peran pengguna "${updatedUser.full_name || 'Pengguna'}" berhasil diubah menjadi ${
        ROLE_LABELS[updatedUser.role]
      }.`
    );
    setTimeout(() => setSuccessToast(null), 5000);
  };

  // Handle Update Status Success
  const handleStatusUpdateSuccess = (updatedUser: {
    id: string;
    is_active: boolean;
    full_name?: string;
  }) => {
    fetchUsersData();
    setSuccessToast(
      `Akun "${updatedUser.full_name || 'Pengguna'}" berhasil ${
        updatedUser.is_active ? 'diaktifkan' : 'dinonaktifkan'
      }.`
    );
    setTimeout(() => setSuccessToast(null), 5000);
  };

  // Handle User-Employee Link Success
  const handleLinkSuccess = (linkedData: {
    userId: string;
    employeeId: string;
    employeeName: string;
  }) => {
    fetchUsersData();
    setSuccessToast(
      `Akun berhasil dihubungkan dengan data pegawai "${linkedData.employeeName}".`
    );
    setTimeout(() => setSuccessToast(null), 5000);
  };

  // Handle User-Employee Unlink Success
  const handleUnlinkSuccess = (data: {
    userId: string;
    employeeName: string;
  }) => {
    fetchUsersData();
    setSuccessToast(
      `Hubungan akun dengan data pegawai "${data.employeeName}" berhasil dilepaskan.`
    );
    setTimeout(() => setSuccessToast(null), 5000);
  };

  // Filtered Users List
  const filteredUsers = users.filter((u) => {
    // Search match
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = u.full_name?.toLowerCase().includes(q);
      const matchEmpName = u.employee_name?.toLowerCase().includes(q);
      const matchId = u.id?.toLowerCase().includes(q);
      if (!matchName && !matchEmpName && !matchId) return false;
    }

    // Role filter
    if (roleFilter !== 'all' && u.role !== roleFilter) {
      return false;
    }

    // Status filter
    if (statusFilter === 'active' && !u.is_active) return false;
    if (statusFilter === 'inactive' && u.is_active) return false;

    return true;
  });

  // Calculate actual statistics from fetched users
  const totalCount = users.length;
  const activeCount = users.filter((u) => u.is_active).length;
  const inactiveCount = users.filter((u) => !u.is_active).length;
  const linkedCount = users.filter((u) => u.employee_id !== null).length;

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Feedback */}
      {successToast && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2.5 text-xs animate-in fade-in slide-in-from-top-2 duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{successToast}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#111827]">
            Manajemen Pengguna
          </h1>
          <p className="text-xs sm:text-sm text-[#6B7280] mt-0.5">
            Kelola akun, peran, dan status pengguna aplikasi.
          </p>
        </div>

        {canManage && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsAddModalOpen(true)}
            leftIcon={<UserPlus className="w-4 h-4" />}
          >
            Tambah Pengguna
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#6B7280]">Total Pengguna</span>
            <div className="w-7 h-7 rounded-lg bg-[#F3F4F6] text-[#374151] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-[#111827] mt-2">
            {totalCount}
          </p>
          <p className="text-[11px] text-[#9CA3AF] mt-0.5">Seluruh akun terdaftar</p>
        </div>

        <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-emerald-700">Pengguna Aktif</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-emerald-700 mt-2">
            {activeCount}
          </p>
          <p className="text-[11px] text-emerald-600/80 mt-0.5">Akun siap digunakan</p>
        </div>

        <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-gray-600">Pengguna Nonaktif</span>
            <div className="w-7 h-7 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-gray-700 mt-2">
            {inactiveCount}
          </p>
          <p className="text-[11px] text-gray-500 mt-0.5">Akses ditangguhkan</p>
        </div>

        <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#F97316]">Terhubung ke Pegawai</span>
            <div className="w-7 h-7 rounded-lg bg-[#FFF7ED] text-[#F97316] flex items-center justify-center">
              <Link2 className="w-4 h-4" />
            </div>
          </div>
          <p className="text-xl sm:text-2xl font-bold text-[#F97316] mt-2">
            {linkedCount}
          </p>
          <p className="text-[11px] text-orange-600/80 mt-0.5">Tertaut ke data HR</p>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3">
          {/* Search Box */}
          <div className="sm:col-span-6 relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-[#9CA3AF]" />
            <input
              type="text"
              placeholder="Cari nama pengguna atau pegawai..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 text-xs bg-white border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#F97316] text-[#111827]"
            />
          </div>

          {/* Role Filter */}
          <div className="sm:col-span-3">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as 'all' | ActiveAppRole)}
              className="w-full h-9 px-3 text-xs bg-white border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#F97316] text-[#111827]"
            >
              <option value="all">Semua Role</option>
              <option value="super_admin">Super Admin</option>
              <option value="admin">Admin</option>
              <option value="headmaster">Kepala Sekolah</option>
              <option value="employee">Pegawai</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="sm:col-span-3">
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')
              }
              className="w-full h-9 px-3 text-xs bg-white border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#F97316] text-[#111827]"
            >
              <option value="all">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="inactive">Nonaktif</option>
            </select>
          </div>
        </div>
      </div>

      {/* Main Content: Table or Cards */}
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl shadow-2xs overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center text-xs text-[#6B7280] space-y-2">
            <div className="w-8 h-8 border-3 border-[#F97316] border-t-transparent rounded-full animate-spin mx-auto" />
            <p>Memuat data pengguna...</p>
          </div>
        ) : errorMessage ? (
          <div className="py-12 text-center text-xs space-y-3 max-w-sm mx-auto px-4">
            <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-[#111827]">{errorMessage}</p>
              <p className="text-[#6B7280] text-[11px] mt-0.5">
                Gagal menghubungi layanan Supabase.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchUsersData}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Coba Lagi
            </Button>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-16 text-center text-xs text-[#6B7280] space-y-2 px-4">
            <div className="w-10 h-10 rounded-xl bg-[#F3F4F6] text-[#9CA3AF] flex items-center justify-center mx-auto">
              <Users className="w-5 h-5" />
            </div>
            {users.length === 0 ? (
              <>
                <p className="font-bold text-[#111827]">Belum ada pengguna</p>
                <p className="text-[#6B7280] text-[11px]">
                  Belum ada akun pengguna yang dapat ditampilkan.
                </p>
              </>
            ) : (
              <>
                <p className="font-bold text-[#111827]">Pengguna tidak ditemukan</p>
                <p className="text-[#6B7280] text-[11px]">
                  Coba ubah kata kunci pencarian atau filter yang digunakan.
                </p>
              </>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F9FAFB] border-b border-[#E5E7EB] text-[#4B5563] font-semibold">
                  <tr>
                    <th className="py-3.5 px-4">Pengguna</th>
                    <th className="py-3.5 px-4">Peran (Role)</th>
                    <th className="py-3.5 px-4">Status Akun</th>
                    <th className="py-3.5 px-4">Hubungan Pegawai</th>
                    <th className="py-3.5 px-4">Login Terakhir</th>
                    <th className="py-3.5 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {filteredUsers.map((u) => {
                    const isSelf = currentUser?.id === u.id;
                    const isTargetSuperAdmin = u.role === 'super_admin';
                    const canEditThisAccount =
                      canManage &&
                      !isSelf &&
                      (isSuperAdmin || !isTargetSuperAdmin);

                    return (
                      <tr key={u.id} className="hover:bg-[#F9FAFB] transition-colors">
                        {/* Name & Avatar */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            {u.avatar_url ? (
                              <img
                                src={u.avatar_url}
                                alt={u.full_name}
                                className="w-8 h-8 rounded-lg object-cover border border-[#E5E7EB]"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-lg bg-[#FFF7ED] border border-orange-200 text-[#F97316] flex items-center justify-center font-bold text-xs">
                                {u.full_name.charAt(0)}
                              </div>
                            )}
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-[#111827] block truncate">
                                  {u.full_name}
                                </span>
                                {isSelf && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold">
                                    Anda
                                  </span>
                                )}
                              </div>
                              <span className="font-mono text-[10px] text-[#9CA3AF] block truncate max-w-[140px]">
                                {u.id}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="py-3 px-4">
                          <RoleBadge role={u.role} size="sm" />
                        </td>

                        {/* Status */}
                        <td className="py-3 px-4">
                          <Badge variant={u.is_active ? 'success' : 'danger'} size="sm">
                            {u.is_active ? '● Aktif' : '● Nonaktif'}
                          </Badge>
                        </td>

                        {/* Linked Employee */}
                        <td className="py-3 px-4">
                          {u.employee_id ? (
                            <div className="space-y-0.5">
                              <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                <span className="font-semibold text-xs text-emerald-800">
                                  Terhubung
                                </span>
                              </div>
                              <span className="text-[11px] text-[#4B5563] block truncate max-w-[180px]">
                                {u.employee_name}
                              </span>
                            </div>
                          ) : (
                            <span className="text-amber-600 font-medium flex items-center gap-1.5 text-xs">
                              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                              <span>Belum Terhubung</span>
                            </span>
                          )}
                        </td>

                        {/* Last Login */}
                        <td className="py-3 px-4 text-[#6B7280]">
                          {u.last_login_at ? (
                            <span className="font-mono text-[11px]">
                              {new Date(u.last_login_at).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })}
                            </span>
                          ) : (
                            <span className="text-[#9CA3AF] text-[11px]">Belum pernah</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {canManage && (
                              <>
                                {/* Link User to Employee Action (Only if unlinked and active) */}
                                {!u.employee_id && u.is_active && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={isSelf}
                                    title={
                                      isSelf
                                        ? 'Tidak dapat menautkan akun Anda sendiri'
                                        : 'Hubungkan akun ini ke data pegawai'
                                    }
                                    onClick={() => {
                                      setUserForLinking(u);
                                      setIsLinkModalOpen(true);
                                    }}
                                    className="text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200"
                                    leftIcon={<Link2 className="w-3.5 h-3.5" />}
                                  >
                                    Hubungkan ke Pegawai
                                  </Button>
                                )}

                                {/* Unlink User from Employee Action (Only if linked) */}
                                {u.employee_id && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={isSelf}
                                    title={
                                      isSelf
                                        ? 'Tidak dapat melepaskan hubungan akun Anda sendiri'
                                        : 'Lepaskan hubungan akun dengan data pegawai'
                                    }
                                    onClick={() => {
                                      setUserForUnlink(u);
                                      setIsUnlinkModalOpen(true);
                                    }}
                                    className="text-amber-700 hover:text-amber-800 hover:bg-amber-50 border-amber-200"
                                    leftIcon={<Unlink className="w-3.5 h-3.5" />}
                                  >
                                    Lepaskan Hubungan
                                  </Button>
                                )}

                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={!canEditThisAccount}
                                  title={
                                    isSelf
                                      ? 'Role akun Anda tidak dapat diubah sendiri'
                                      : !isSuperAdmin && isTargetSuperAdmin
                                      ? 'Admin tidak dapat mengubah akun Super Admin'
                                      : 'Ubah peran pengguna ini'
                                  }
                                  onClick={() => {
                                    setUserForRoleUpdate(u);
                                    setIsRoleModalOpen(true);
                                  }}
                                  leftIcon={<Shield className="w-3.5 h-3.5" />}
                                >
                                  Ubah Role
                                </Button>

                                <Button
                                  variant="outline"
                                  size="sm"
                                  disabled={!canEditThisAccount}
                                  title={
                                    isSelf
                                      ? 'Anda tidak dapat mengubah status akun sendiri'
                                      : !isSuperAdmin && isTargetSuperAdmin
                                      ? 'Admin tidak dapat mengubah akun Super Admin'
                                      : u.is_active
                                      ? 'Nonaktifkan akun pengguna ini'
                                      : 'Aktifkan akun pengguna ini'
                                  }
                                  onClick={() => {
                                    setUserForStatusUpdate(u);
                                    setIsStatusModalOpen(true);
                                  }}
                                  className={
                                    u.is_active
                                      ? 'text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200'
                                      : 'text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-200'
                                  }
                                  leftIcon={<Power className="w-3.5 h-3.5" />}
                                >
                                  {u.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                                </Button>
                              </>
                            )}

                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setSelectedUser(u);
                                setIsDetailModalOpen(true);
                              }}
                              leftIcon={<Eye className="w-3.5 h-3.5" />}
                            >
                              Detail
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List */}
            <div className="md:hidden divide-y divide-[#E5E7EB]">
              {filteredUsers.map((u) => {
                const isSelf = currentUser?.id === u.id;
                const isTargetSuperAdmin = u.role === 'super_admin';
                const canEditThisAccount =
                  canManage &&
                  !isSelf &&
                  (isSuperAdmin || !isTargetSuperAdmin);

                return (
                  <div key={u.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        {u.avatar_url ? (
                          <img
                            src={u.avatar_url}
                            alt={u.full_name}
                            className="w-10 h-10 rounded-xl object-cover border border-[#E5E7EB]"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-[#FFF7ED] border border-orange-200 text-[#F97316] flex items-center justify-center font-bold text-sm">
                            {u.full_name.charAt(0)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-sm text-[#111827] block truncate">
                              {u.full_name}
                            </span>
                            {isSelf && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold">
                                Anda
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 pt-0.5">
                            <RoleBadge role={u.role} size="sm" />
                            <Badge variant={u.is_active ? 'success' : 'danger'} size="sm">
                              {u.is_active ? '● Aktif' : '● Nonaktif'}
                            </Badge>
                          </div>
                        </div>
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedUser(u);
                          setIsDetailModalOpen(true);
                        }}
                        className="shrink-0"
                      >
                        Detail
                      </Button>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] text-[11px] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[#6B7280]">Status Pegawai:</span>
                        {u.employee_id ? (
                          <div className="text-right">
                            <span className="font-semibold text-emerald-700 block">
                              Terhubung
                            </span>
                            <span className="text-[10px] text-[#4B5563] block truncate max-w-[180px]">
                              {u.employee_name}
                            </span>
                          </div>
                        ) : (
                          <span className="font-semibold text-amber-600">Belum Terhubung</span>
                        )}
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-[#6B7280]">Login:</span>
                        <span className="text-[#111827]">
                          {u.last_login_at
                            ? new Date(u.last_login_at).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            : 'Belum pernah'}
                        </span>
                      </div>
                    </div>

                    {canManage && (
                      <div className="pt-1 space-y-2">
                        {/* Link to Employee Action Button (Mobile) */}
                        {!u.employee_id && u.is_active && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isSelf}
                            title={
                              isSelf
                                ? 'Tidak dapat menautkan akun Anda sendiri'
                                : 'Hubungkan akun ini ke data pegawai'
                            }
                            onClick={() => {
                              setUserForLinking(u);
                              setIsLinkModalOpen(true);
                            }}
                            leftIcon={<Link2 className="w-3.5 h-3.5" />}
                            className="w-full justify-center text-orange-600 hover:text-orange-700 hover:bg-orange-50 border-orange-200"
                          >
                            Hubungkan ke Pegawai
                          </Button>
                        )}

                        {/* Unlink from Employee Action Button (Mobile) */}
                        {u.employee_id && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isSelf}
                            title={
                              isSelf
                                ? 'Tidak dapat melepaskan hubungan akun Anda sendiri'
                                : 'Lepaskan hubungan akun dengan data pegawai'
                            }
                            onClick={() => {
                              setUserForUnlink(u);
                              setIsUnlinkModalOpen(true);
                            }}
                            leftIcon={<Unlink className="w-3.5 h-3.5" />}
                            className="w-full justify-center text-amber-700 hover:text-amber-800 hover:bg-amber-50 border-amber-200"
                          >
                            Lepaskan Hubungan
                          </Button>
                        )}

                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!canEditThisAccount}
                            onClick={() => {
                              setUserForRoleUpdate(u);
                              setIsRoleModalOpen(true);
                            }}
                            leftIcon={<Shield className="w-3.5 h-3.5" />}
                            className="w-full justify-center"
                          >
                            Ubah Role
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!canEditThisAccount}
                            onClick={() => {
                              setUserForStatusUpdate(u);
                              setIsStatusModalOpen(true);
                            }}
                            leftIcon={<Power className="w-3.5 h-3.5" />}
                            className={`w-full justify-center ${
                              u.is_active
                                ? 'text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200'
                                : 'text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-200'
                            }`}
                          >
                            {u.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      <CreateUserModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleCreateSuccess}
      />

      <UserDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        user={selectedUser}
      />

      <UpdateRoleModal
        isOpen={isRoleModalOpen}
        onClose={() => {
          setIsRoleModalOpen(false);
          setUserForRoleUpdate(null);
        }}
        user={userForRoleUpdate}
        onSuccess={handleRoleUpdateSuccess}
      />

      <UserStatusConfirmModal
        isOpen={isStatusModalOpen}
        onClose={() => {
          setIsStatusModalOpen(false);
          setUserForStatusUpdate(null);
        }}
        user={userForStatusUpdate}
        onSuccess={handleStatusUpdateSuccess}
      />

      <LinkUserEmployeeModal
        isOpen={isLinkModalOpen}
        onClose={() => {
          setIsLinkModalOpen(false);
          setUserForLinking(null);
        }}
        user={userForLinking}
        onSuccess={handleLinkSuccess}
      />

      <UnlinkUserEmployeeModal
        isOpen={isUnlinkModalOpen}
        onClose={() => {
          setIsUnlinkModalOpen(false);
          setUserForUnlink(null);
        }}
        user={userForUnlink}
        onSuccess={handleUnlinkSuccess}
      />
    </div>
  );
};
