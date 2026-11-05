import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  UserPlus,
  Search,
  CheckCircle2,
  AlertCircle,
  Power,
  Edit2,
  Eye,
  UserCheck,
  UserX,
  ShieldCheck,
  X,
  Building,
  Briefcase,
  Trash2,
  LayoutList,
  LayoutGrid,
  SlidersHorizontal,
  ArrowUpDown,
  Check,
  MoreVertical,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Badge } from '../../components/ui/Badge';
import { UserAvatar } from '../../components/ui/UserAvatar';
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
import { StatusConfirmModal } from '../../components/employees/StatusConfirmModal';
import { DepartmentModal } from '../../components/employees/DepartmentModal';
import { PositionModal } from '../../components/employees/PositionModal';
import { DeleteEmployeeModal } from '../../components/employees/DeleteEmployeeModal';
import { EmployeeGridCard } from '../../components/employees/EmployeeGridCard';
import { EmployeePagination } from '../../components/employees/EmployeePagination';

type SortOption = 'name_asc' | 'name_desc' | 'nip_asc' | 'nip_desc' | 'newest' | 'oldest';

const SORT_OPTIONS: { id: SortOption; label: string }[] = [
  { id: 'name_asc', label: 'Nama A – Z' },
  { id: 'name_desc', label: 'Nama Z – A' },
  { id: 'nip_asc', label: 'NIP Terkecil' },
  { id: 'nip_desc', label: 'NIP Terbesar' },
  { id: 'newest', label: 'Terbaru Ditambahkan' },
  { id: 'oldest', label: 'Terlama Ditambahkan' },
];

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

  // State: View Mode (Table vs Grid) & Pagination
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);

  // State: Sorting & Filter Popovers
  const [sortBy, setSortBy] = useState<SortOption>('name_asc');
  const [isSortOpen, setIsSortOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const sortRef = useRef<HTMLDivElement>(null);

  // State: Mobile List Row Action Dropdown
  const [openMobileListMenuId, setOpenMobileListMenuId] = useState<string | null>(null);
  const mobileListMenuRef = useRef<HTMLDivElement>(null);

  // State: Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [genderFilter, setGenderFilter] = useState<'all' | 'male' | 'female'>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('');
  const [positionFilter, setPositionFilter] = useState<string>('');
  const [employeeTypeFilter, setEmployeeTypeFilter] = useState<string>('');

  // State: Modals
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [isDepartmentModalOpen, setIsDepartmentModalOpen] = useState(false);
  const [isPositionModalOpen, setIsPositionModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const [selectedEmployee, setSelectedEmployee] = useState<EmployeeWithRelations | null>(null);
  const [employeeForDelete, setEmployeeForDelete] = useState<EmployeeWithRelations | null>(null);
  const [targetStatus, setTargetStatus] = useState<'active' | 'inactive'>('inactive');

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  // Click-outside listener for filter popover & sort dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(event.target as Node)) {
        setIsFilterOpen(false);
      }
      if (sortRef.current && !sortRef.current.contains(event.target as Node)) {
        setIsSortOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Click-outside listener for Mobile List Action Menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        mobileListMenuRef.current &&
        !mobileListMenuRef.current.contains(event.target as Node)
      ) {
        setOpenMobileListMenuId(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpenMobileListMenuId(null);
      }
    };
    if (openMobileListMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [openMobileListMenuId]);

  // Load Master Filters (Departments & Positions)
  const loadMasterFilters = useCallback(async () => {
    try {
      const [depts, pos] = await Promise.all([
        departmentService.getDepartments({ onlyActive: true }),
        positionService.getPositions({ onlyActive: true }),
      ]);
      setDepartments(depts);
      setPositions(pos);
    } catch (err) {
      console.warn('Gagal memuat filter departemen/jabatan:', err);
    }
  }, []);

  useEffect(() => {
    loadMasterFilters();
  }, [loadMasterFilters]);

  // Fetch Employees Data & Statistics
  const fetchEmployeesData = useCallback(async () => {
    setIsLoading(true);
    try {
      const filterParams: EmployeeFilterParams = {
        searchQuery: debouncedSearch,
        status: statusFilter,
        gender: genderFilter,
        departmentId: departmentFilter || undefined,
        positionId: positionFilter || undefined,
        employeeType: employeeTypeFilter || undefined,
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
  }, [debouncedSearch, statusFilter, genderFilter, departmentFilter, positionFilter, employeeTypeFilter]);

  useEffect(() => {
    fetchEmployeesData();
  }, [fetchEmployeesData]);

  // Reset pagination to page 1 on filter or search change
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch, statusFilter, genderFilter, departmentFilter, positionFilter, employeeTypeFilter]);

  // Client-side sorting
  const sortedEmployees = useMemo(() => {
    const list = [...employees];
    return list.sort((a, b) => {
      switch (sortBy) {
        case 'name_asc':
          return (a.full_name || '').localeCompare(b.full_name || '', 'id');
        case 'name_desc':
          return (b.full_name || '').localeCompare(a.full_name || '', 'id');
        case 'nip_asc': {
          const nipA = a.nip || '';
          const nipB = b.nip || '';
          if (!nipA && !nipB) return 0;
          if (!nipA) return 1;
          if (!nipB) return -1;
          return nipA.localeCompare(nipB, 'id', { numeric: true });
        }
        case 'nip_desc': {
          const nipA = a.nip || '';
          const nipB = b.nip || '';
          if (!nipA && !nipB) return 0;
          if (!nipA) return 1;
          if (!nipB) return -1;
          return nipB.localeCompare(nipA, 'id', { numeric: true });
        }
        case 'newest':
          return new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime();
        case 'oldest':
          return new Date(a.created_at || 0).getTime() - new Date(b.created_at || 0).getTime();
        default:
          return 0;
      }
    });
  }, [employees, sortBy]);

  // Client-side pagination calculations
  const totalItems = sortedEmployees.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedEmployees = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedEmployees.slice(startIndex, startIndex + pageSize);
  }, [sortedEmployees, currentPage, pageSize]);

  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  // Handlers
  const handleOpenAddModal = () => {
    setSelectedEmployee(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (emp: EmployeeWithRelations) => {
    setSelectedEmployee(emp);
    setIsEditModalOpen(true);
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

  const handleStatusSuccess = () => {
    fetchEmployeesData();
    setSuccessToast('Status keaktifan pegawai berhasil diubah.');
    setTimeout(() => setSuccessToast(null), 4000);
  };

  const handleDeleteSuccess = (deletedEmployee: {
    id: string;
    full_name: string;
    preserved_attendance_count?: number;
    preserved_requests_count?: number;
  }) => {
    fetchEmployeesData();
    setSuccessToast(
      `Data pegawai "${deletedEmployee.full_name}" berhasil dihapus secara permanen. Riwayat presensi dan pengajuan tetap dipertahankan.`
    );
    setTimeout(() => setSuccessToast(null), 6000);
  };

  const handleResetFilter = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setGenderFilter('all');
    setDepartmentFilter('');
    setPositionFilter('');
    setEmployeeTypeFilter('');
    setCurrentPage(1);
  };

  const handleSelectSort = (option: SortOption) => {
    setSortBy(option);
    setIsSortOpen(false);
    setCurrentPage(1);
  };

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (statusFilter !== 'all') count++;
    if (genderFilter !== 'all') count++;
    if (departmentFilter !== '') count++;
    if (positionFilter !== '') count++;
    if (employeeTypeFilter !== '') count++;
    return count;
  }, [statusFilter, genderFilter, departmentFilter, positionFilter, employeeTypeFilter]);

  const hasActiveFilters = searchQuery !== '' || activeFilterCount > 0;

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Feedback */}
      {successToast && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center gap-2.5 text-xs animate-in fade-in slide-in-from-top-2 duration-150">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{successToast}</span>
        </div>
      )}

      {/* Page Title */}
      <h1 className="text-xl sm:text-2xl font-bold text-[#111827] tracking-tight">
        Pegawai
      </h1>

      {/* 4 Statistics Cards (Disembunyikan di Mobile/Tablet <1024px, tampil di Desktop ≥1024px) */}
      <div className="hidden lg:grid lg:grid-cols-4 gap-3 sm:gap-4">
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

        {/* Card 3: Pegawai Nonaktif */}
        <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
              Pegawai Nonaktif
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

        {/* Card 4: Akun Terhubung */}
        <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
              Akun Terhubung
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

      {/* DESKTOP TOOLBAR CONTAINER (≥1024px) - 100% Persis Card Putih */}
      <div className="hidden lg:block bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-5 shadow-2xs">
        <div className="grid grid-cols-[max-content_minmax(220px,1fr)_max-content_max-content] items-center gap-3">
          {/* Kelompok Kiri — Aksi */}
          <div className="flex items-center gap-2.5 flex-wrap">
            {canManage && (
              <>
                <Button
                  variant="primary"
                  size="md"
                  leftIcon={<UserPlus className="w-4 h-4" />}
                  onClick={handleOpenAddModal}
                >
                  Tambah Pegawai
                </Button>
                <Button
                  variant="outline"
                  size="md"
                  leftIcon={<Building className="w-4 h-4" />}
                  onClick={() => setIsDepartmentModalOpen(true)}
                  title="Kelola Departemen / Unit Kerja"
                >
                  Departemen
                </Button>
                <Button
                  variant="outline"
                  size="md"
                  leftIcon={<Briefcase className="w-4 h-4" />}
                  onClick={() => setIsPositionModalOpen(true)}
                  title="Kelola Jabatan"
                >
                  Jabatan
                </Button>
              </>
            )}
          </div>

          {/* Kelompok Tengah — Pencarian (Search + Filter Terpadu) */}
          <div className="w-full min-w-0">
            <div className="relative flex items-center w-full bg-white border border-[#E5E7EB] rounded-xl focus-within:border-[#F97316] transition-colors">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" />
              <input
                type="text"
                placeholder="Cari nama, NIP, NIK..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9.5 pl-9 pr-8 text-xs bg-transparent border-0 focus:outline-none placeholder:text-[#9CA3AF] text-[#111827]"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-9 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#111827] cursor-pointer p-0.5"
                  aria-label="Hapus kata kunci pencarian"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}

              {/* Tombol Ikon Filter */}
              <div className="relative shrink-0 pr-1" ref={filterRef}>
                <button
                  type="button"
                  onClick={() => {
                    setIsFilterOpen((prev) => !prev);
                    setIsSortOpen(false);
                  }}
                  className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-all cursor-pointer ${
                    activeFilterCount > 0 || isFilterOpen
                      ? 'bg-orange-50 text-[#EA580C]'
                      : 'text-[#6B7280] hover:bg-gray-100 hover:text-[#111827]'
                  }`}
                  aria-expanded={isFilterOpen}
                  aria-label="Buka filter pegawai"
                  title="Filter Pegawai"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-[#F97316] text-white">
                      {activeFilterCount}
                    </span>
                  )}
                </button>

                {/* Popover Filter Panel */}
                {isFilterOpen && (
                  <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white border border-[#E5E7EB] rounded-2xl shadow-xl p-4 z-30 animate-in fade-in duration-150">
                    <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F6]">
                      <div className="flex items-center gap-2">
                        <SlidersHorizontal className="w-4 h-4 text-[#F97316]" />
                        <h4 className="text-xs font-bold text-[#111827]">Filter Pegawai</h4>
                        {activeFilterCount > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-[#EA580C]">
                            {activeFilterCount} aktif
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsFilterOpen(false)}
                        className="text-[#9CA3AF] hover:text-[#111827] p-1 rounded-lg hover:bg-gray-100 transition-colors"
                        aria-label="Tutup panel filter"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 py-3 text-xs">
                      {/* Status */}
                      <div>
                        <label className="block text-[11px] font-semibold text-[#6B7280] mb-1">
                          Status Pegawai
                        </label>
                        <select
                          value={statusFilter}
                          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                          className="w-full h-8.5 px-2.5 bg-white border border-[#E5E7EB] rounded-xl text-xs focus:outline-none focus:border-[#F97316] text-[#111827] cursor-pointer"
                        >
                          <option value="all">Semua Status</option>
                          <option value="active">Aktif</option>
                          <option value="inactive">Nonaktif</option>
                        </select>
                      </div>

                      {/* Jenis Kelamin */}
                      <div>
                        <label className="block text-[11px] font-semibold text-[#6B7280] mb-1">
                          Jenis Kelamin
                        </label>
                        <select
                          value={genderFilter}
                          onChange={(e) => setGenderFilter(e.target.value as 'all' | 'male' | 'female')}
                          className="w-full h-8.5 px-2.5 bg-white border border-[#E5E7EB] rounded-xl text-xs focus:outline-none focus:border-[#F97316] text-[#111827] cursor-pointer"
                        >
                          <option value="all">Semua Jenis Kelamin</option>
                          <option value="male">Laki-laki</option>
                          <option value="female">Perempuan</option>
                        </select>
                      </div>

                      {/* Unit Kerja */}
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-[#6B7280] mb-1">
                          Unit Kerja / Departemen
                        </label>
                        <select
                          value={departmentFilter}
                          onChange={(e) => setDepartmentFilter(e.target.value)}
                          className="w-full h-8.5 px-2.5 bg-white border border-[#E5E7EB] rounded-xl text-xs focus:outline-none focus:border-[#F97316] text-[#111827] cursor-pointer"
                        >
                          <option value="">Semua Unit Kerja</option>
                          {departments.map((dept) => (
                            <option key={dept.id} value={dept.id}>
                              {dept.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Jabatan */}
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-[#6B7280] mb-1">
                          Jabatan
                        </label>
                        <select
                          value={positionFilter}
                          onChange={(e) => setPositionFilter(e.target.value)}
                          className="w-full h-8.5 px-2.5 bg-white border border-[#E5E7EB] rounded-xl text-xs focus:outline-none focus:border-[#F97316] text-[#111827] cursor-pointer"
                        >
                          <option value="">Semua Jabatan</option>
                          {positions.map((pos) => (
                            <option key={pos.id} value={pos.id}>
                              {pos.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Jenis Pegawai */}
                      <div className="sm:col-span-2">
                        <label className="block text-[11px] font-semibold text-[#6B7280] mb-1">
                          Jenis Pegawai
                        </label>
                        <select
                          value={employeeTypeFilter}
                          onChange={(e) => setEmployeeTypeFilter(e.target.value)}
                          className="w-full h-8.5 px-2.5 bg-white border border-[#E5E7EB] rounded-xl text-xs focus:outline-none focus:border-[#F97316] text-[#111827] cursor-pointer"
                        >
                          <option value="">Semua Jenis Pegawai</option>
                          {COMMON_EMPLOYEE_TYPES.map((type) => (
                            <option key={type} value={type}>
                              {type}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-[#F3F4F6] flex items-center justify-between">
                      <button
                        type="button"
                        onClick={handleResetFilter}
                        disabled={activeFilterCount === 0}
                        className="text-xs font-semibold text-[#6B7280] hover:text-[#EF4444] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
                      >
                        Reset Filter
                      </button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setIsFilterOpen(false)}
                      >
                        Tutup
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Kelompok Kanan — Pengaturan Tampilan (Urutkan) */}
          <div className="relative" ref={sortRef}>
            <button
              type="button"
              onClick={() => {
                setIsSortOpen((prev) => !prev);
                setIsFilterOpen(false);
              }}
              className={`inline-flex items-center gap-1.5 h-9.5 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                isSortOpen || sortBy !== 'name_asc'
                  ? 'border-[#F97316] bg-orange-50 text-[#EA580C]'
                  : 'border-[#E5E7EB] bg-white text-[#4B5563] hover:bg-gray-50 hover:text-[#111827]'
              }`}
              aria-expanded={isSortOpen}
              aria-label="Urutkan data pegawai"
            >
              <ArrowUpDown className="w-4 h-4" />
              <span>Urutkan</span>
            </button>

            {/* Dropdown Menu Urutkan */}
            {isSortOpen && (
              <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-[#E5E7EB] rounded-2xl shadow-xl py-1.5 z-30 animate-in fade-in duration-150">
                <div className="px-3.5 py-1.5 text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider border-b border-[#F3F4F6]">
                  Urutkan Berdasarkan
                </div>
                {SORT_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => handleSelectSort(opt.id)}
                    className={`w-full text-left px-3.5 py-2 text-xs flex items-center justify-between transition-colors cursor-pointer ${
                      sortBy === opt.id
                        ? 'text-[#F97316] font-bold bg-orange-50/70'
                        : 'text-[#374151] hover:bg-gray-50'
                    }`}
                  >
                    <span>{opt.label}</span>
                    {sortBy === opt.id && <Check className="w-3.5 h-3.5 text-[#F97316]" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Kelompok Kanan — Pengaturan Tampilan (View Switcher: [Tabel | Grid]) */}
          <div className="flex items-center gap-1.5 justify-end">
            <span className="text-[11px] font-semibold text-[#6B7280] hidden xl:inline">
              Tampilan:
            </span>
            <div className="flex items-center gap-1 bg-[#F3F4F6] p-1 rounded-xl border border-[#E5E7EB]">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-[#FFFFFF] text-[#F97316] shadow-2xs font-bold'
                    : 'text-[#6B7280] hover:text-[#111827]'
                }`}
                title="Tampilan Tabel / List"
                aria-label="Tampilan Tabel"
              >
                <LayoutList className="w-3.5 h-3.5" />
                <span>Tabel</span>
              </button>

              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-[#FFFFFF] text-[#F97316] shadow-2xs font-bold'
                    : 'text-[#6B7280] hover:text-[#111827]'
                }`}
                title="Tampilan Grid / Cards"
                aria-label="Tampilan Grid"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span>Grid</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE / TABLET TOOLBAR CONTAINER (<1024px) - Minimalis Transparan */}
      <div className="block lg:hidden bg-transparent border-0 shadow-none p-0">
        <div className="flex items-center gap-2 justify-between w-full">
          {/* Integrated Search + Filter Bar (Search Bar Putih Bersih) */}
          <div className="relative flex items-center flex-1 min-w-0 bg-white border border-[#E5E7EB] rounded-xl focus-within:border-[#F97316] transition-colors">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" />
            <input
              type="text"
              placeholder="Cari pegawai..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-14 text-xs bg-transparent border-0 focus:outline-none placeholder:text-[#9CA3AF] text-[#111827]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-8 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#111827] cursor-pointer p-0.5"
                aria-label="Hapus kata kunci pencarian"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}

            {/* Filter Trigger Button */}
            <div className="relative shrink-0 pr-1" ref={filterRef}>
              <button
                type="button"
                onClick={() => {
                  setIsFilterOpen((prev) => !prev);
                  setIsSortOpen(false);
                }}
                className={`inline-flex items-center justify-center w-7.5 h-7.5 rounded-lg transition-all cursor-pointer ${
                  activeFilterCount > 0 || isFilterOpen
                    ? 'bg-orange-50 text-[#EA580C]'
                    : 'text-[#6B7280] hover:bg-gray-100 hover:text-[#111827]'
                }`}
                aria-expanded={isFilterOpen}
                aria-label="Buka filter pegawai"
                title="Filter Pegawai"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 px-1 py-0.2 rounded-full text-[8px] font-bold bg-[#F97316] text-white">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {/* Popover Filter Panel Mobile */}
              {isFilterOpen && (
                <div className="absolute right-0 top-full mt-2 w-72 sm:w-80 bg-white border border-[#E5E7EB] rounded-2xl shadow-xl p-3.5 z-30 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between pb-2.5 border-b border-[#F3F4F6]">
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="w-3.5 h-3.5 text-[#F97316]" />
                      <h4 className="text-xs font-bold text-[#111827]">Filter Pegawai</h4>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsFilterOpen(false)}
                      className="text-[#9CA3AF] hover:text-[#111827] p-1 rounded-lg"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-2.5 py-2 text-xs">
                    <div>
                      <label className="block text-[10px] font-semibold text-[#6B7280] mb-1">
                        Status Pegawai
                      </label>
                      <select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                        className="w-full h-8 px-2 bg-white border border-[#E5E7EB] rounded-lg text-xs"
                      >
                        <option value="all">Semua Status</option>
                        <option value="active">Aktif</option>
                        <option value="inactive">Nonaktif</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-[#6B7280] mb-1">
                        Unit Kerja
                      </label>
                      <select
                        value={departmentFilter}
                        onChange={(e) => setDepartmentFilter(e.target.value)}
                        className="w-full h-8 px-2 bg-white border border-[#E5E7EB] rounded-lg text-xs"
                      >
                        <option value="">Semua Unit Kerja</option>
                        {departments.map((dept) => (
                          <option key={dept.id} value={dept.id}>
                            {dept.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-[#6B7280] mb-1">
                        Jabatan
                      </label>
                      <select
                        value={positionFilter}
                        onChange={(e) => setPositionFilter(e.target.value)}
                        className="w-full h-8 px-2 bg-white border border-[#E5E7EB] rounded-lg text-xs"
                      >
                        <option value="">Semua Jabatan</option>
                        {positions.map((pos) => (
                          <option key={pos.id} value={pos.id}>
                            {pos.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-semibold text-[#6B7280] mb-1">
                        Jenis Pegawai
                      </label>
                      <select
                        value={employeeTypeFilter}
                        onChange={(e) => setEmployeeTypeFilter(e.target.value)}
                        className="w-full h-8 px-2 bg-white border border-[#E5E7EB] rounded-lg text-xs"
                      >
                        <option value="">Semua Jenis Pegawai</option>
                        {COMMON_EMPLOYEE_TYPES.map((type) => (
                          <option key={type} value={type}>
                            {type}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#F3F4F6] flex items-center justify-between">
                    <button
                      type="button"
                      onClick={handleResetFilter}
                      className="text-[11px] font-medium text-red-600 hover:underline"
                    >
                      Reset Filter
                    </button>
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => setIsFilterOpen(false)}
                    >
                      Tutup
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* View Switcher Minimalis (Tabel / Grid) - Tanpa Wrapper Card Putih */}
          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg text-xs transition-colors cursor-pointer ${
                viewMode === 'table'
                  ? 'text-[#F97316] font-bold bg-orange-50/80'
                  : 'text-[#6B7280] hover:text-[#111827] hover:bg-gray-100/80'
              }`}
              title="Tampilan List"
              aria-label="Tampilan List"
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg text-xs transition-colors cursor-pointer ${
                viewMode === 'grid'
                  ? 'text-[#F97316] font-bold bg-orange-50/80'
                  : 'text-[#6B7280] hover:text-[#111827] hover:bg-gray-100/80'
              }`}
              title="Tampilan Grid"
              aria-label="Tampilan Grid"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          {/* Tombol Tambah Pegawai Ikon Plus (+) di Ujung Kanan Mobile */}
          {canManage && (
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="w-9 h-9 rounded-xl bg-[#F97316] hover:bg-[#EA580C] active:bg-[#C2410C] text-white flex items-center justify-center shrink-0 shadow-2xs transition-colors cursor-pointer"
              title="Tambah Pegawai"
              aria-label="Tambah Pegawai Baru"
            >
              <UserPlus className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* DESKTOP DATA AREA CONTAINER (≥1024px) - 100% Persis Untouched */}
      {/* ========================================================= */}
      <div className="hidden lg:flex flex-col rounded-2xl overflow-hidden transition-all duration-200 bg-[#FFFFFF] border border-[#E5E7EB] shadow-2xs">
        <div className="flex-1 min-w-0">
          {isLoading ? (
            <div className="py-16 text-center text-[#6B7280]">
              <div className="w-8 h-8 border-3 border-[#F97316] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs font-medium">Memuat data pegawai sekolah...</p>
            </div>
          ) : paginatedEmployees.length === 0 ? (
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
          ) : viewMode === 'table' ? (
            /* Desktop Table */
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB] text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
                    <th className="py-3 px-3 text-center w-12">No</th>
                    <th className="py-3 px-4">Nama Pegawai</th>
                    <th className="py-3 px-4">Department/Unit</th>
                    <th className="py-3 px-4">Jabatan</th>
                    <th className="py-3 px-4">Jenis Pegawai</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB] text-xs">
                  {paginatedEmployees.map((emp, index) => (
                    <tr
                      key={emp.id}
                      className="hover:bg-[#F9FAFB] transition-colors group"
                    >
                      <td className="py-3.5 px-3 text-center text-xs font-semibold text-[#6B7280]">
                        {(currentPage - 1) * pageSize + index + 1}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <UserAvatar
                            userId={emp.profile_id}
                            photoUrl={emp.photo_url}
                            name={emp.full_name}
                            className="w-10 h-10 rounded-xl object-cover border border-orange-200 shrink-0 shadow-2xs"
                          />
                          <div className="min-w-0">
                            <button
                              onClick={() => navigate(`/employees/${emp.id}`)}
                              className="font-bold text-xs sm:text-sm text-[#111827] hover:text-[#F97316] text-left transition-colors cursor-pointer block truncate max-w-[220px] sm:max-w-xs"
                            >
                              {emp.full_name}
                            </button>
                            <p className="text-[11px] text-[#6B7280] font-mono mt-0.5 truncate">
                              NIP: {emp.nip || '—'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-[#4B5563] whitespace-nowrap">
                        {emp.departments?.name || '—'}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-[#111827] whitespace-nowrap">
                        {emp.positions?.name || '—'}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md text-[11px] font-medium bg-gray-100 text-[#374151]">
                          {emp.employee_type || 'PNS'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <Badge
                          variant={emp.status === 'active' ? 'success' : 'danger'}
                          size="sm"
                        >
                          {emp.status === 'active' ? 'Aktif' : 'Nonaktif'}
                        </Badge>
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div
                          className="relative inline-block text-left"
                          ref={openMobileListMenuId === emp.id ? mobileListMenuRef : undefined}
                        >
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMobileListMenuId((prev) => (prev === emp.id ? null : emp.id));
                            }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6B7280] hover:text-[#111827] hover:bg-gray-100/80 active:bg-gray-200/80 transition-all cursor-pointer bg-transparent border-0 shadow-none ml-auto"
                            aria-label="Menu aksi pegawai"
                            title="Menu Aksi"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {openMobileListMenuId === emp.id && (
                            <div className="absolute right-0 top-full mt-1.5 w-48 bg-white border border-[#E5E7EB] rounded-2xl shadow-xl py-1.5 z-30 text-left animate-in fade-in duration-150">
                              <div className="px-3 py-1.5 text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider border-b border-[#F3F4F6] truncate">
                                {emp.full_name}
                              </div>

                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenMobileListMenuId(null);
                                  navigate(`/employees/${emp.id}`);
                                }}
                                className="w-full px-3 py-2 text-xs font-medium text-[#374151] hover:bg-orange-50 hover:text-[#F97316] flex items-center gap-2.5 transition-colors cursor-pointer"
                              >
                                <Eye className="w-3.5 h-3.5 text-[#6B7280]" />
                                <span>Detail Pegawai</span>
                              </button>

                              {canManage && (
                                <>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMobileListMenuId(null);
                                      handleOpenEditModal(emp);
                                    }}
                                    className="w-full px-3 py-2 text-xs font-medium text-[#374151] hover:bg-gray-50 hover:text-[#111827] flex items-center gap-2.5 transition-colors cursor-pointer"
                                  >
                                    <Edit2 className="w-3.5 h-3.5 text-[#6B7280]" />
                                    <span>Edit Data</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMobileListMenuId(null);
                                      handleOpenStatusModal(emp);
                                    }}
                                    className={`w-full px-3 py-2 text-xs font-medium flex items-center gap-2.5 transition-colors cursor-pointer ${
                                      emp.status === 'active'
                                        ? 'text-amber-700 hover:bg-amber-50'
                                        : 'text-emerald-700 hover:bg-emerald-50'
                                    }`}
                                  >
                                    <Power className="w-3.5 h-3.5" />
                                    <span>{emp.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}</span>
                                  </button>

                                  <div className="my-1 border-t border-[#F3F4F6]" />

                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMobileListMenuId(null);
                                      setEmployeeForDelete(emp);
                                      setIsDeleteModalOpen(true);
                                    }}
                                    className="w-full px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                    <span>Hapus Pegawai</span>
                                  </button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            /* Desktop Grid */
            <div className="p-0 bg-transparent">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
                {paginatedEmployees.map((emp) => (
                  <EmployeeGridCard
                    key={emp.id}
                    employee={emp}
                    canManage={canManage}
                    onViewDetail={(e) => navigate(`/employees/${e.id}`)}
                    onEdit={handleOpenEditModal}
                    onToggleStatus={handleOpenStatusModal}
                    onDelete={(e) => {
                      setEmployeeForDelete(e);
                      setIsDeleteModalOpen(true);
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Desktop Pagination Terintegrasi */}
        {!isLoading && sortedEmployees.length > 0 && (
          <EmployeePagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            totalItems={totalItems}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
            pageSizeOptions={[10, 12, 20]}
          />
        )}
      </div>

      {/* ========================================================= */}
      {/* MOBILE / TABLET DATA AREA & PAGINATION (<1024px) */}
      {/* ========================================================= */}
      <div className="block lg:hidden space-y-4">
        <div className="bg-transparent">
          {isLoading ? (
            <div className="py-16 text-center text-[#6B7280]">
              <div className="w-8 h-8 border-3 border-[#F97316] border-t-transparent rounded-full animate-spin mx-auto mb-3" />
              <p className="text-xs font-medium">Memuat data pegawai sekolah...</p>
            </div>
          ) : paginatedEmployees.length === 0 ? (
            /* Empty State Mobile */
            <div className="py-16 px-4 text-center max-w-md mx-auto bg-white rounded-2xl border border-[#E5E7EB] shadow-2xs">
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
          ) : viewMode === 'table' ? (
            /* Mode List Mobile — Wrapper Transparan, Baris dipisah separator tipis */
            <div className="divide-y divide-[#E5E7EB] bg-transparent">
              {paginatedEmployees.map((emp) => (
                <div
                  key={emp.id}
                  onClick={() => navigate(`/employees/${emp.id}`)}
                  className="flex items-center justify-between py-3.5 px-1 gap-3 hover:bg-gray-100/60 transition-colors cursor-pointer"
                >
                  {/* Avatar Lingkaran + Tumpukan Nama & Jabatan */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <UserAvatar
                      userId={emp.profile_id}
                      photoUrl={emp.photo_url}
                      name={emp.full_name}
                      className="w-10 h-10 rounded-full object-cover border border-orange-200 shrink-0 shadow-2xs"
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="font-bold text-xs sm:text-sm text-[#111827] truncate">
                        {emp.full_name}
                      </h4>
                      <p className="text-[11px] text-[#6B7280] truncate mt-0.5">
                        {emp.positions?.name || '—'}
                      </p>
                    </div>
                  </div>

                  {/* Jenis Pegawai Teks Biasa */}
                  <div className="shrink-0 text-right px-2">
                    <span className="text-xs font-semibold text-[#4B5563]">
                      {emp.employee_type || 'PNS'}
                    </span>
                  </div>

                  {/* Tombol Menu Titik Tiga (MoreVertical) & Popover Aksi */}
                  <div
                    className="relative shrink-0"
                    ref={openMobileListMenuId === emp.id ? mobileListMenuRef : undefined}
                  >
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMobileListMenuId((prev) => (prev === emp.id ? null : emp.id));
                      }}
                      className="w-9 h-9 rounded-lg flex items-center justify-center text-[#6B7280] hover:text-[#111827] hover:bg-gray-100/80 active:bg-gray-200/80 transition-all cursor-pointer bg-transparent border-0 shadow-none"
                      aria-label="Menu aksi pegawai"
                      title="Menu Aksi"
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>

                    {/* Action Dropdown Menu Mobile */}
                    {openMobileListMenuId === emp.id && (
                      <div className="absolute right-0 top-full mt-1.5 w-48 bg-white border border-[#E5E7EB] rounded-2xl shadow-xl py-1.5 z-30 text-left animate-in fade-in duration-150">
                        <div className="px-3 py-1.5 text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wider border-b border-[#F3F4F6] truncate">
                          {emp.full_name}
                        </div>

                        {/* Detail Pegawai */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMobileListMenuId(null);
                            navigate(`/employees/${emp.id}`);
                          }}
                          className="w-full px-3 py-2 text-xs font-medium text-[#374151] hover:bg-orange-50 hover:text-[#F97316] flex items-center gap-2.5 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-[#6B7280]" />
                          <span>Detail Pegawai</span>
                        </button>

                        {canManage && (
                          <>
                            {/* Edit Data */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMobileListMenuId(null);
                                handleOpenEditModal(emp);
                              }}
                              className="w-full px-3 py-2 text-xs font-medium text-[#374151] hover:bg-gray-50 hover:text-[#111827] flex items-center gap-2.5 transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5 text-[#6B7280]" />
                              <span>Edit Data</span>
                            </button>

                            {/* Status Toggle */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMobileListMenuId(null);
                                handleOpenStatusModal(emp);
                              }}
                              className={`w-full px-3 py-2 text-xs font-medium flex items-center gap-2.5 transition-colors cursor-pointer ${
                                emp.status === 'active'
                                  ? 'text-amber-700 hover:bg-amber-50'
                                  : 'text-emerald-700 hover:bg-emerald-50'
                              }`}
                            >
                              <Power className="w-3.5 h-3.5" />
                              <span>{emp.status === 'active' ? 'Nonaktifkan' : 'Aktifkan'}</span>
                            </button>

                            <div className="my-1 border-t border-[#F3F4F6]" />

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMobileListMenuId(null);
                                setEmployeeForDelete(emp);
                                setIsDeleteModalOpen(true);
                              }}
                              className="w-full px-3 py-2 text-xs font-medium text-red-600 hover:bg-red-50 flex items-center gap-2.5 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-500" />
                              <span>Hapus Pegawai</span>
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Mode Grid Mobile — Container Transparan */
            <div className="bg-transparent">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                {paginatedEmployees.map((emp) => (
                  <EmployeeGridCard
                    key={emp.id}
                    employee={emp}
                    canManage={canManage}
                    onViewDetail={(e) => navigate(`/employees/${e.id}`)}
                    onEdit={handleOpenEditModal}
                    onToggleStatus={handleOpenStatusModal}
                    onDelete={(e) => {
                      setEmployeeForDelete(e);
                      setIsDeleteModalOpen(true);
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Pagination Terpisah & Transparan di Mobile/Tablet */}
        {!isLoading && sortedEmployees.length > 0 && (
          <div className="pt-2">
            <EmployeePagination
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              totalItems={totalItems}
              onPageChange={setCurrentPage}
              onPageSizeChange={(newSize) => {
                setPageSize(newSize);
                setCurrentPage(1);
              }}
              pageSizeOptions={[10, 12, 20]}
              className="bg-transparent border-0 px-1 py-2 flex flex-row items-center justify-between text-xs text-[#6B7280] w-full"
            />
          </div>
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

      <StatusConfirmModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        onSuccess={handleStatusSuccess}
        employee={selectedEmployee}
        targetStatus={targetStatus}
      />

      <DepartmentModal
        isOpen={isDepartmentModalOpen}
        onClose={() => setIsDepartmentModalOpen(false)}
        onDepartmentsUpdated={loadMasterFilters}
      />

      <PositionModal
        isOpen={isPositionModalOpen}
        onClose={() => setIsPositionModalOpen(false)}
        onPositionsUpdated={loadMasterFilters}
      />

      <DeleteEmployeeModal
        isOpen={isDeleteModalOpen}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setEmployeeForDelete(null);
        }}
        employee={employeeForDelete}
        onSuccess={handleDeleteSuccess}
      />
    </div>
  );
};
