import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  RefreshCw,
  MoreVertical,
  CheckCircle2,
  AlertCircle,
  Link2,
  Power,
  Edit2,
  Eye,
  UserCheck,
  UserX,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { Card } from '../../components/ui/Card';
import { DepartmentRow, PositionRow } from '../../types/database.types';
import {
  EmployeeWithRelations,
  EmployeeStats,
  EmployeeFilterParams,
  COMMON_EMPLOYEE_TYPES,
} from '../../types/employee';
import { employeeService } from '../../services/employeeService';
import { departmentService } from '../../services/departmentService';
import { positionService } from '../../services/positionService';
import { EmployeeFormModal } from '../../components/employees/EmployeeFormModal';
import { LinkProfileModal } from '../../components/employees/LinkProfileModal';
import { StatusConfirmModal } from '../../components/employees/StatusConfirmModal';

export const EmployeesPage: React.FC = () => {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const canManage =
    currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  // State: Data List & Statistics
  const [employees, setEmployees] = useState<EmployeeWithRelations[]>([]);
  const [stats, setStats] = useState<EmployeeStats>({
    total: 0,
    active: 0,
    inactive: 0,
    linkedToAccount: 0,
  });
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [positions, setPositions] = useState<PositionRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // State: Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('');
  const [positionFilter, setPositionFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');

  // State: Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeWithRelations | null>(null);
  const [targetStatus, setTargetStatus] = useState<'active' | 'inactive'>('inactive');

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Load Master Filters (Departments & Positions)
  useEffect(() => {
    const loadMasterFilters = async () => {
      try {
        const [depts, pos] = await Promise.all([
          departmentService.getDepartments(),
          positionService.getPositions(),
        ]);
        setDepartments(depts);
        setPositions(pos);
      } catch (err) {
        console.warn('Gagal memuat filter departemen/jabatan:', err);
      }
    };
    loadMasterFilters();
  }, []);

  // Fetch Employees Data & Statistics
  const fetchEmployeesData = useCallback(async () => {
    setIsLoading(true);
    try {
      const filterParams: EmployeeFilterParams = {
        searchQuery: debouncedSearch,
        status: statusFilter,
        departmentId: departmentFilter || undefined,
        positionId: positionFilter || undefined,
        employeeType: typeFilter || undefined,
      };

      const [employeeList, statSummary] = await Promise.all([
        employeeService.getEmployees(filterParams),
        employeeService.getEmployeeStats(),
      ]);

      setEmployees(employeeList);
      setStats(statSummary);
    } catch (err) {
      console.warn('Gagal memuat data pegawai:', err);
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, statusFilter, departmentFilter, positionFilter, typeFilter]);

  useEffect(() => {
    fetchEmployeesData();
  }, [fetchEmployeesData]);

  // Handlers
  const handleOpenAddModal = () => {
    setSelectedEmployee(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (emp: EmployeeWithRelations) => {
    setSelectedEmployee(emp);
    setIsEditModalOpen(true);
  };

  const handleOpenLinkModal = (emp: EmployeeWithRelations) => {
    setSelectedEmployee(emp);
    setIsLinkModalOpen(true);
  };

  const handleOpenStatusModal = (emp: EmployeeWithRelations) => {
    setSelectedEmployee(emp);
    setTargetStatus(emp.status === 'active' ? 'inactive' : 'active');
    setIsStatusModalOpen(true);
  };

  const handleFormSuccess = () => {
    fetchEmployeesData();
    setSuccessToast('Data pegawai berhasil disimpan.');
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const handleLinkSuccess = () => {
    fetchEmployeesData();
    setSuccessToast('Status akun pegawai berhasil diperbarui.');
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const handleStatusSuccess = () => {
    fetchEmployeesData();
    setSuccessToast('Status keaktifan pegawai berhasil diubah.');
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const handleResetFilter = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setDepartmentFilter('');
    setPositionFilter('');
    setTypeFilter('');
  };

  const hasActiveFilters =
    searchQuery !== '' ||
    statusFilter !== 'all' ||
    departmentFilter !== '' ||
    positionFilter !== '' ||
    typeFilter !== '';

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Feedback */}
      {successToast && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2.5 text-xs animate-in fade-in slide-in-from-top-2 duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{successToast}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#111827] tracking-tight">
              Data Pegawai
            </h1>
            <p className="text-xs sm:text-sm text-[#6B7280] mt-1">
              Kelola data dan informasi pegawai sekolah.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="md"
              leftIcon={<RefreshCw className="w-4 h-4" />}
              onClick={fetchEmployeesData}
              disabled={isLoading}
            >
              Segarkan
            </Button>

            {canManage && (
              <Button
                variant="primary"
                size="md"
                leftIcon={<UserPlus className="w-4 h-4" />}
                onClick={handleOpenAddModal}
              >
                + Tambah Pegawai
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 4 Statistics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Pegawai */}
        <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
              Total Pegawai
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#FFF7ED] text-[#F97316] flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-[#111827] mt-2">
            {stats.total}
          </p>
          <p className="text-[11px] text-[#9CA3AF] mt-1">Terdaftar di sistem</p>
        </div>

        {/* Card 2: Pegawai Aktif */}
        <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
              Pegawai Aktif
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-emerald-600 mt-2">
            {stats.active}
          </p>
          <p className="text-[11px] text-[#9CA3AF] mt-1">Status aktif bekerja</p>
        </div>

        {/* Card 3: Pegawai Tidak Aktif */}
        <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
              Tidak Aktif
            </span>
            <div className="w-8 h-8 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-[#4B5563] mt-2">
            {stats.inactive}
          </p>
          <p className="text-[11px] text-[#9CA3AF] mt-1">Cuti / Nonaktif</p>
        </div>

        {/* Card 4: Terhubung Akun */}
        <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
              Terhubung Akun
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-blue-600 mt-2">
            {stats.linkedToAccount}
          </p>
          <p className="text-[11px] text-[#9CA3AF] mt-1">Memiliki akun login</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3.5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-3 text-[#9CA3AF]" />
            <input
              type="text"
              placeholder="Cari nama, NIP, NIK, atau nomor pegawai..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-10 pl-10 pr-4 text-xs bg-white border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#F97316] placeholder:text-[#9CA3AF] text-[#111827]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3 text-[#9CA3AF] hover:text-[#111827]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Reset Filters if applied */}
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetFilter}
              className="text-xs text-[#F97316] hover:bg-orange-50 shrink-0"
              leftIcon={<X className="w-3.5 h-3.5" />}
            >
              Reset Filter
            </Button>
          )}
        </div>

        {/* Dropdown Filters Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs pt-1 border-t border-[#F3F4F6]">
          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-[#6B7280] mb-1">
              Status Pegawai
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="w-full h-9 px-2.5 bg-white border border-[#E5E7EB] rounded-xl text-xs focus:outline-none focus:border-[#F97316] text-[#111827]"
            >
              <option value="all">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="inactive">Tidak Aktif</option>
            </select>
          </div>

          {/* Jenis Pegawai */}
          <div>
            <label className="block text-[11px] font-semibold text-[#6B7280] mb-1">
              Jenis Pegawai
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full h-9 px-2.5 bg-white border border-[#E5E7EB] rounded-xl text-xs focus:outline-none focus:border-[#F97316] text-[#111827]"
            >
              <option value="">Semua Jenis</option>
              {COMMON_EMPLOYEE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Departemen */}
          <div>
            <label className="block text-[11px] font-semibold text-[#6B7280] mb-1">
              Departemen
            </label>
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full h-9 px-2.5 bg-white border border-[#E5E7EB] rounded-xl text-xs focus:outline-none focus:border-[#F97316] text-[#111827]"
            >
              <option value="">Semua Departemen</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* Jabatan */}
          <div>
            <label className="block text-[11px] font-semibold text-[#6B7280] mb-1">
              Jabatan
            </label>
            <select
              value={positionFilter}
              onChange={(e) => setPositionFilter(e.target.value)}
              className="w-full h-9 px-2.5 bg-white border border-[#E5E7EB] rounded-xl text-xs focus:outline-none focus:border-[#F97316] text-[#111827]"
            >
              <option value="">Semua Jabatan</option>
              {positions.map((pos) => (
                <option key={pos.id} value={pos.id}>
                  {pos.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Table (Desktop/Tablet) & Card List (Mobile) */}
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-2xs">
        {/* Loading State */}
        {isLoading ? (
          <div className="py-16 text-center text-[#6B7280]">
            <div className="w-8 h-8 border-3 border-[#F97316] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-xs font-medium">Memuat data pegawai sekolah...</p>
          </div>
        ) : employees.length === 0 ? (
          /* Empty State */
          <div className="py-16 px-4 text-center max-w-md mx-auto">
            <div className="w-14 h-14 rounded-2xl bg-[#FFF7ED] text-[#F97316] border border-orange-200 flex items-center justify-center mx-auto mb-3">
              <Users className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-[#111827]">
              {hasActiveFilters ? 'Pegawai Tidak Ditemukan' : 'Belum ada data pegawai'}
            </h3>
            <p className="text-xs text-[#6B7280] mt-1">
              {hasActiveFilters
                ? 'Tidak ada data pegawai yang sesuai dengan kriteria pencarian dan filter.'
                : 'Tambahkan data pegawai untuk mulai mengelola informasi kepegawaian.'}
            </p>
            <div className="pt-4 flex justify-center gap-2">
              {hasActiveFilters ? (
                <Button variant="outline" size="sm" onClick={handleResetFilter}>
                  Reset Filter
                </Button>
              ) : (
                canManage && (
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<UserPlus className="w-4 h-4" />}
                    onClick={handleOpenAddModal}
                  >
                    Tambah Pegawai
                  </Button>
                )
              )}
            </div>
          </div>
        ) : (
          <>
            {/* Desktop / Tablet Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB] text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
                    <th className="py-3 px-4">Foto & Nama</th>
                    <th className="py-3 px-4">NIP</th>
                    <th className="py-3 px-4">Jenis Pegawai</th>
                    <th className="py-3 px-4">Jabatan</th>
                    <th className="py-3 px-4">Departemen</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Akun</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB] text-xs">
                  {employees.map((emp) => {
                    const isLinked = !!emp.profile_id;
                    return (
                      <tr
                        key={emp.id}
                        className="hover:bg-[#F9FAFB] transition-colors group"
                      >
                        {/* Foto & Nama */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            {emp.photo_url ? (
                              <img
                                src={emp.photo_url}
                                alt={emp.full_name}
                                className="w-9 h-9 rounded-xl object-cover border border-orange-200 shrink-0"
                              />
                            ) : (
                              <div className="w-9 h-9 rounded-xl bg-[#FFF7ED] border border-orange-200 text-[#F97316] font-bold flex items-center justify-center shrink-0">
                                {emp.full_name.charAt(0)}
                              </div>
                            )}
                            <div>
                              <button
                                onClick={() => navigate(`/employees/${emp.id}`)}
                                className="font-bold text-[#111827] hover:text-[#F97316] text-left transition-colors cursor-pointer"
                              >
                                {emp.full_name}
                              </button>
                              <p className="text-[11px] text-[#6B7280]">
                                {emp.email || emp.phone || '—'}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* NIP */}
                        <td className="py-3.5 px-4 font-mono text-[11px] text-[#374151]">
                          {emp.nip || '—'}
                        </td>

                        {/* Jenis Pegawai */}
                        <td className="py-3.5 px-4 text-[#374151]">
                          <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-100 text-[#374151]">
                            {emp.employee_type || 'PNS'}
                          </span>
                        </td>

                        {/* Jabatan */}
                        <td className="py-3.5 px-4 font-medium text-[#111827]">
                          {emp.positions?.name || '—'}
                        </td>

                        {/* Departemen */}
                        <td className="py-3.5 px-4 text-[#4B5563]">
                          {emp.departments?.name || '—'}
                        </td>

                        {/* Status Pegawai */}
                        <td className="py-3.5 px-4">
                          <Badge
                            variant={emp.status === 'active' ? 'success' : 'danger'}
                            size="sm"
                          >
                            {emp.status === 'active' ? 'Aktif' : 'Tidak Aktif'}
                          </Badge>
                        </td>

                        {/* Status Akun */}
                        <td className="py-3.5 px-4">
                          {isLinked ? (
                            <Badge variant="success" size="sm">
                              Terhubung
                            </Badge>
                          ) : (
                            <Badge variant="warning" size="sm">
                              Belum Terhubung
                            </Badge>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/employees/${emp.id}`)}
                              title="Lihat Detail"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </Button>

                            {canManage && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenEditModal(emp)}
                                  title="Edit Data"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenLinkModal(emp)}
                                  title="Hubungkan Akun"
                                >
                                  <Link2 className="w-3.5 h-3.5 text-blue-600" />
                                </Button>

                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleOpenStatusModal(emp)}
                                  title={emp.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}
                                  className={
                                    emp.status === 'active'
                                      ? 'text-amber-600 hover:text-amber-700'
                                      : 'text-emerald-600 hover:text-emerald-700'
                                  }
                                >
                                  <Power className="w-3.5 h-3.5" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="md:hidden divide-y divide-[#E5E7EB]">
              {employees.map((emp) => {
                const isLinked = !!emp.profile_id;
                return (
                  <div key={emp.id} className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        {emp.photo_url ? (
                          <img
                            src={emp.photo_url}
                            alt={emp.full_name}
                            className="w-10 h-10 rounded-xl object-cover border border-orange-200"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-xl bg-[#FFF7ED] border border-orange-200 text-[#F97316] font-bold text-sm flex items-center justify-center shrink-0">
                            {emp.full_name.charAt(0)}
                          </div>
                        )}
                        <div>
                          <button
                            onClick={() => navigate(`/employees/${emp.id}`)}
                            className="font-bold text-xs text-[#111827] text-left hover:text-[#F97316]"
                          >
                            {emp.full_name}
                          </button>
                          <p className="text-[11px] text-[#6B7280] font-mono">
                            NIP: {emp.nip || '—'}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <Badge
                          variant={emp.status === 'active' ? 'success' : 'danger'}
                          size="sm"
                        >
                          {emp.status === 'active' ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-[11px] text-[#4B5563] pt-1">
                      <div>
                        <span className="text-[#9CA3AF]">Jabatan:</span>{' '}
                        <span className="font-semibold text-[#111827]">
                          {emp.positions?.name || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#9CA3AF]">Departemen:</span>{' '}
                        <span className="font-semibold text-[#111827]">
                          {emp.departments?.name || '—'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[#9CA3AF]">Jenis:</span>{' '}
                        <span>{emp.employee_type || '—'}</span>
                      </div>
                      <div>
                        <span className="text-[#9CA3AF]">Akun:</span>{' '}
                        {isLinked ? (
                          <span className="text-emerald-700 font-bold">Terhubung</span>
                        ) : (
                          <span className="text-amber-700 font-bold">Belum Ada</span>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-2 border-t border-[#F3F4F6]">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/employees/${emp.id}`)}
                        leftIcon={<Eye className="w-3.5 h-3.5" />}
                        className="text-xs"
                      >
                        Detail
                      </Button>

                      {canManage && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenEditModal(emp)}
                            leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                            className="text-xs"
                          >
                            Edit
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenLinkModal(emp)}
                            leftIcon={<Link2 className="w-3.5 h-3.5" />}
                            className="text-xs text-blue-600"
                          >
                            Akun
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenStatusModal(emp)}
                            className={`text-xs ${
                              emp.status === 'active'
                                ? 'text-amber-600'
                                : 'text-emerald-600'
                            }`}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Modals */}
      <EmployeeFormModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={handleFormSuccess}
        employeeToEdit={null}
      />

      <EmployeeFormModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={handleFormSuccess}
        employeeToEdit={selectedEmployee}
      />

      <LinkProfileModal
        isOpen={isLinkModalOpen}
        onClose={() => setIsLinkModalOpen(false)}
        onSuccess={handleLinkSuccess}
        employee={selectedEmployee}
      />

      <StatusConfirmModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        onSuccess={handleStatusSuccess}
        employee={selectedEmployee}
        targetStatus={targetStatus}
      />
    </div>
  );
};
