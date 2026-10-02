import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  MapPin,
  Plus,
  Search,
  RefreshCw,
  Building2,
  Compass,
  Radio,
  CheckCircle2,
  AlertCircle,
  Eye,
  Edit2,
  Power,
  ShieldAlert,
  SlidersHorizontal,
  ChevronRight,
  Info,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { LocationModel } from '../../types/location.types';
import { locationService } from '../../services/locationService';
import { LocationFormModal } from '../../components/locations/LocationFormModal';
import {
  LocationConfirmModal,
  LocationConfirmActionType,
} from '../../components/locations/LocationConfirmModal';
import { LocationDetailModal } from '../../components/locations/LocationDetailModal';

export const LocationsPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const canManage =
    currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  // Data State
  const [locations, setLocations] = useState<LocationModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [attendanceFilter, setAttendanceFilter] = useState<'all' | 'enabled' | 'disabled'>('all');

  // Modal State
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [locationToEdit, setLocationToEdit] = useState<LocationModel | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<LocationModel | null>(null);

  // Confirm Modal State
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmLocation, setConfirmLocation] = useState<LocationModel | null>(null);
  const [confirmActionType, setConfirmActionType] = useState<LocationConfirmActionType>('deactivate');

  // Data Fetching
  const fetchLocations = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await locationService.getLocations();
      setLocations(data);
    } catch (err: unknown) {
      console.error('Gagal memuat daftar lokasi:', err);
      setErrorMessage('Data lokasi tidak dapat dimuat. Silakan periksa koneksi dan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  // Toast Timer Helper
  const showToast = (message: string) => {
    setSuccessToast(message);
    setTimeout(() => {
      setSuccessToast(null);
    }, 4500);
  };

  // Filtered & Searched Data
  const filteredLocations = useMemo(() => {
    return locations.filter((loc) => {
      // 1. Search filter (name, code, address)
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const matchName = loc.name.toLowerCase().includes(q);
        const matchCode = loc.code.toLowerCase().includes(q);
        const matchAddress = loc.address ? loc.address.toLowerCase().includes(q) : false;
        if (!matchName && !matchCode && !matchAddress) {
          return false;
        }
      }

      // 2. Status filter
      if (statusFilter === 'active' && !loc.isActive) return false;
      if (statusFilter === 'inactive' && loc.isActive) return false;

      // 3. Attendance function filter
      if (attendanceFilter === 'enabled' && !loc.isAttendanceEnabled) return false;
      if (attendanceFilter === 'disabled' && loc.isAttendanceEnabled) return false;

      return true;
    });
  }, [locations, searchQuery, statusFilter, attendanceFilter]);

  // Statistics calculation
  const totalCount = locations.length;
  const activeCount = locations.filter((loc) => loc.isActive).length;
  const attendanceActiveLocation = locations.find(
    (loc) => loc.isActive && loc.isAttendanceEnabled
  );

  // Modal Handlers
  const handleOpenAdd = () => {
    setLocationToEdit(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (loc: LocationModel) => {
    setLocationToEdit(loc);
    setIsFormModalOpen(true);
  };

  const handleOpenDetail = (loc: LocationModel) => {
    setSelectedLocation(loc);
    setIsDetailModalOpen(true);
  };

  const handleOpenConfirm = (loc: LocationModel, action: LocationConfirmActionType) => {
    setConfirmLocation(loc);
    setConfirmActionType(action);
    setIsConfirmModalOpen(true);
  };

  const handleFormSuccess = (savedLocation: LocationModel, mode: 'create' | 'edit') => {
    fetchLocations();
    if (mode === 'create') {
      showToast(`Lokasi "${savedLocation.name}" berhasil ditambahkan.`);
    } else {
      showToast(`Lokasi "${savedLocation.name}" berhasil diperbarui.`);
    }
  };

  const handleConfirmSuccess = (_updatedLocation: LocationModel, msg: string) => {
    fetchLocations();
    showToast(msg);
  };

  const getLocationTypeBadge = (type: string) => {
    switch (type) {
      case 'office':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold text-blue-700 bg-blue-50">
            Office
          </span>
        );
      case 'teacher_room':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold text-purple-700 bg-purple-50">
            Ruang Guru
          </span>
        );
      case 'laboratory':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold text-amber-700 bg-amber-50">
            Laboratorium
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold text-zinc-700 bg-zinc-100">
            Lainnya
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-4 right-4 z-50 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl shadow-xl flex items-center gap-3 text-sm text-emerald-800 animate-in slide-in-from-top-3 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-medium">{successToast}</span>
        </div>
      )}

      {/* Header Section */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
              Master Data & Geofencing
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-[#111827] mt-0.5">
              Lokasi
            </h1>
            <p className="text-xs sm:text-sm text-[#6B7280] mt-1">
              Kelola lokasi yang digunakan dalam sistem presensi pegawai.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button
              variant="outline"
              size="md"
              leftIcon={<RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />}
              onClick={fetchLocations}
              disabled={isLoading}
            >
              Segarkan
            </Button>

            {canManage && (
              <Button
                variant="primary"
                size="md"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={handleOpenAdd}
              >
                Tambah Lokasi
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Total Lokasi */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 flex items-center gap-4 shadow-2xs">
          <div className="w-12 h-12 rounded-xl bg-zinc-100 text-[#111827] flex items-center justify-center shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-[#6B7280]">Total Lokasi</p>
            <p className="text-xl sm:text-2xl font-bold text-[#111827]">
              {isLoading ? '-' : totalCount}
            </p>
            <p className="text-[11px] text-[#9CA3AF]">Terdaftar dalam sistem</p>
          </div>
        </div>

        {/* Card 2: Lokasi Aktif */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 flex items-center gap-4 shadow-2xs">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <Power className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs font-medium text-[#6B7280]">Lokasi Aktif</p>
            <p className="text-xl sm:text-2xl font-bold text-emerald-700">
              {isLoading ? '-' : activeCount}
            </p>
            <p className="text-[11px] text-[#9CA3AF]">Status operasional aktif</p>
          </div>
        </div>

        {/* Card 3: Lokasi Presensi Utama */}
        <div className="bg-white border border-[#F97316]/30 rounded-2xl p-4 sm:p-5 flex items-center gap-4 shadow-2xs bg-gradient-to-br from-white to-orange-50/30">
          <div className="w-12 h-12 rounded-xl bg-orange-50 text-[#F97316] flex items-center justify-center shrink-0">
            <Radio className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-bold text-[#F97316] uppercase tracking-wide">
              Lokasi Presensi
            </p>
            <p className="text-sm sm:text-base font-bold text-[#111827] truncate mt-0.5">
              {isLoading ? '...' : attendanceActiveLocation ? attendanceActiveLocation.name : 'Belum Ditentukan'}
            </p>
            <p className="text-[11px] text-[#6B7280] truncate">
              {attendanceActiveLocation ? `Radius ${attendanceActiveLocation.radiusMeters} Meter` : '1 Lokasi Aktif (V1)'}
            </p>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari lokasi berdasarkan nama, kode, atau alamat..."
              className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-white border border-[#E5E7EB] rounded-xl text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316] transition-all"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="px-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-xl text-[#374151] font-medium focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316] transition-all cursor-pointer"
            >
              <option value="all">Semua Status</option>
              <option value="active">Aktif</option>
              <option value="inactive">Nonaktif</option>
            </select>

            {/* Attendance Filter */}
            <select
              value={attendanceFilter}
              onChange={(e) => setAttendanceFilter(e.target.value as 'all' | 'enabled' | 'disabled')}
              className="px-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-xl text-[#374151] font-medium focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316] transition-all cursor-pointer"
            >
              <option value="all">Semua Fungsi Presensi</option>
              <option value="enabled">Lokasi Presensi</option>
              <option value="disabled">Bukan Lokasi Presensi</option>
            </select>

            {(searchQuery || statusFilter !== 'all' || attendanceFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setAttendanceFilter('all');
                }}
                className="px-2.5 py-2 text-xs font-semibold text-[#F97316] hover:bg-orange-50 rounded-xl transition-colors cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div>
        {/* Loading State */}
        {isLoading && (
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-8 sm:p-12 text-center space-y-4 shadow-2xs">
            <div className="w-10 h-10 border-3 border-[#F97316] border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs sm:text-sm text-[#6B7280]">
              Memuat data lokasi sekolah...
            </p>
          </div>
        )}

        {/* Error State */}
        {!isLoading && errorMessage && (
          <div className="bg-white border border-red-200 rounded-2xl p-8 sm:p-12 text-center space-y-4 shadow-2xs">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <AlertCircle className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#111827]">Gagal Memuat Data</h3>
              <p className="text-xs text-[#6B7280] max-w-md mx-auto mt-1">
                {errorMessage}
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<RefreshCw className="w-4 h-4" />}
              onClick={fetchLocations}
            >
              Coba Lagi
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !errorMessage && locations.length === 0 && (
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-8 sm:p-12 text-center space-y-4 shadow-2xs">
            <div className="w-14 h-14 rounded-2xl bg-orange-50 text-[#F97316] flex items-center justify-center mx-auto">
              <MapPin className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#111827]">Belum Ada Lokasi</h3>
              <p className="text-xs sm:text-sm text-[#6B7280] max-w-md mx-auto mt-1">
                Tambahkan lokasi pertama untuk mulai mengatur lokasi presensi pegawai.
              </p>
            </div>
            {canManage && (
              <Button
                variant="primary"
                size="md"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={handleOpenAdd}
              >
                Tambah Lokasi
              </Button>
            )}
          </div>
        )}

        {/* No Search Match State */}
        {!isLoading && !errorMessage && locations.length > 0 && filteredLocations.length === 0 && (
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-8 text-center space-y-3 shadow-2xs">
            <p className="text-sm font-semibold text-[#111827]">
              Tidak ada lokasi yang cocok dengan pencarian atau filter.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setAttendanceFilter('all');
              }}
              className="text-xs font-semibold text-[#F97316] hover:underline"
            >
              Bersihkan filter pencarian
            </button>
          </div>
        )}

        {/* Locations List / Table */}
        {!isLoading && !errorMessage && filteredLocations.length > 0 && (
          <div className="space-y-4">
            {/* Desktop Table View */}
            <div className="hidden lg:block bg-white border border-[#E5E7EB] rounded-2xl shadow-2xs overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50/80 border-b border-[#E5E7EB] text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
                    <th className="py-3.5 px-5">Nama Lokasi & Kode</th>
                    <th className="py-3.5 px-4">Tipe</th>
                    <th className="py-3.5 px-4">Koordinat GPS</th>
                    <th className="py-3.5 px-4">Radius</th>
                    <th className="py-3.5 px-4">Fungsi Presensi</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-5 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB] text-xs">
                  {filteredLocations.map((loc) => {
                    const hasCoords = loc.latitude !== null && loc.longitude !== null;

                    return (
                      <tr
                        key={loc.id}
                        className={`hover:bg-zinc-50/60 transition-colors ${
                          loc.isAttendanceEnabled ? 'bg-orange-50/20' : ''
                        }`}
                      >
                        {/* Name & Code */}
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-3">
                            <div
                              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                                loc.isAttendanceEnabled
                                  ? 'bg-orange-100 text-[#F97316]'
                                  : 'bg-zinc-100 text-[#6B7280]'
                              }`}
                            >
                              <MapPin className="w-4 h-4" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-bold text-sm text-[#111827] truncate">
                                {loc.name}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="font-mono text-[11px] font-bold text-[#6B7280]">
                                  {loc.code}
                                </span>
                                {loc.address && (
                                  <span className="text-[11px] text-[#9CA3AF] truncate max-w-[200px]">
                                    • {loc.address}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Type */}
                        <td className="py-4 px-4">
                          {getLocationTypeBadge(loc.locationType)}
                        </td>

                        {/* Coordinates */}
                        <td className="py-4 px-4">
                          {hasCoords ? (
                            <div className="font-mono text-xs font-semibold text-[#111827]">
                              {loc.latitude?.toFixed(6)}, {loc.longitude?.toFixed(6)}
                            </div>
                          ) : (
                            <span className="text-amber-700 italic text-[11px]">
                              Koordinat belum diatur
                            </span>
                          )}
                        </td>

                        {/* Radius */}
                        <td className="py-4 px-4 font-semibold text-[#111827]">
                          {loc.radiusMeters} Meter
                        </td>

                        {/* Attendance Status */}
                        <td className="py-4 px-4">
                          {loc.isAttendanceEnabled ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold text-orange-800 bg-orange-100/90 rounded-full">
                              <Radio className="w-3 h-3 text-[#F97316]" />
                              Lokasi Presensi
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 text-[11px] font-medium text-[#6B7280] bg-zinc-100 rounded-full">
                              Bukan Lokasi Presensi
                            </span>
                          )}
                        </td>

                        {/* Active Status */}
                        <td className="py-4 px-4">
                          {loc.isActive ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-full">
                              Aktif
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-semibold text-zinc-500 bg-zinc-100 rounded-full">
                              Nonaktif
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenDetail(loc)}
                              title="Lihat Detail Lokasi"
                              className="p-1.5 text-[#6B7280] hover:text-[#111827] hover:bg-zinc-100 rounded-lg transition-colors cursor-pointer"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {canManage && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(loc)}
                                  title="Edit Lokasi"
                                  className="p-1.5 text-[#6B7280] hover:text-[#F97316] hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>

                                {/* Toggle Attendance Status */}
                                {loc.isActive && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleOpenConfirm(
                                        loc,
                                        loc.isAttendanceEnabled
                                          ? 'disable_attendance'
                                          : 'enable_attendance'
                                      )
                                    }
                                    title={
                                      loc.isAttendanceEnabled
                                        ? 'Nonaktifkan sebagai Lokasi Presensi'
                                        : 'Jadikan sebagai Lokasi Presensi Utama'
                                    }
                                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                      loc.isAttendanceEnabled
                                        ? 'text-orange-600 hover:bg-orange-50'
                                        : 'text-[#6B7280] hover:text-orange-600 hover:bg-orange-50'
                                    }`}
                                  >
                                    <Radio className="w-4 h-4" />
                                  </button>
                                )}

                                {/* Soft Activate/Deactivate Toggle */}
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleOpenConfirm(
                                      loc,
                                      loc.isActive ? 'deactivate' : 'activate'
                                    )
                                  }
                                  title={loc.isActive ? 'Nonaktifkan Lokasi' : 'Aktifkan Lokasi'}
                                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                    loc.isActive
                                      ? 'text-[#6B7280] hover:text-red-600 hover:bg-red-50'
                                      : 'text-emerald-600 hover:bg-emerald-50'
                                  }`}
                                >
                                  <Power className="w-4 h-4" />
                                </button>
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

            {/* Mobile / Tablet Responsive Card List */}
            <div className="lg:hidden space-y-3">
              {filteredLocations.map((loc) => {
                const hasCoords = loc.latitude !== null && loc.longitude !== null;

                return (
                  <div
                    key={loc.id}
                    className={`bg-white border rounded-2xl p-4 sm:p-5 space-y-3 shadow-2xs ${
                      loc.isAttendanceEnabled
                        ? 'border-orange-200 bg-gradient-to-br from-white to-orange-50/20'
                        : 'border-[#E5E7EB]'
                    }`}
                  >
                    {/* Header: Name, Code & Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                            loc.isAttendanceEnabled
                              ? 'bg-orange-100 text-[#F97316]'
                              : 'bg-zinc-100 text-[#6B7280]'
                          }`}
                        >
                          <MapPin className="w-5 h-5" />
                        </div>
                        <div>
                          <h3 className="font-bold text-sm text-[#111827]">
                            {loc.name}
                          </h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="font-mono text-xs font-bold text-[#6B7280]">
                              {loc.code}
                            </span>
                            {getLocationTypeBadge(loc.locationType)}
                          </div>
                        </div>
                      </div>

                      {/* Status Badges */}
                      <div className="flex flex-col items-end gap-1">
                        {loc.isActive ? (
                          <span className="px-2 py-0.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 rounded-full">
                            Aktif
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[11px] font-semibold text-zinc-500 bg-zinc-100 rounded-full">
                            Nonaktif
                          </span>
                        )}

                        {loc.isAttendanceEnabled && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold text-orange-800 bg-orange-100 rounded-full">
                            <Radio className="w-2.5 h-2.5 text-[#F97316]" />
                            Presensi
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Address / Description */}
                    {(loc.address || loc.description) && (
                      <p className="text-xs text-[#6B7280] line-clamp-2">
                        {loc.address || loc.description}
                      </p>
                    )}

                    {/* Coordinates & Radius Grid */}
                    <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#E5E7EB] text-xs">
                      <div>
                        <span className="text-[#9CA3AF] text-[11px] block">Koordinat GPS</span>
                        {hasCoords ? (
                          <span className="font-mono font-semibold text-[#111827] block truncate">
                            {loc.latitude?.toFixed(4)}, {loc.longitude?.toFixed(4)}
                          </span>
                        ) : (
                          <span className="text-amber-700 italic text-[11px] block">
                            Belum diatur
                          </span>
                        )}
                      </div>

                      <div>
                        <span className="text-[#9CA3AF] text-[11px] block">Radius Geofence</span>
                        <span className="font-semibold text-[#111827] block">
                          {loc.radiusMeters} Meter
                        </span>
                      </div>
                    </div>

                    {/* Mobile Action Buttons */}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-[#E5E7EB]">
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<Eye className="w-3.5 h-3.5" />}
                        onClick={() => handleOpenDetail(loc)}
                      >
                        Detail
                      </Button>

                      {canManage && (
                        <div className="flex items-center gap-1.5">
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                            onClick={() => handleOpenEdit(loc)}
                          >
                            Edit
                          </Button>

                          {/* Quick Attendance Toggle */}
                          {loc.isActive && (
                            <button
                              type="button"
                              onClick={() =>
                                handleOpenConfirm(
                                  loc,
                                  loc.isAttendanceEnabled
                                    ? 'disable_attendance'
                                    : 'enable_attendance'
                                )
                              }
                              className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                                loc.isAttendanceEnabled
                                  ? 'border-orange-200 bg-orange-50 text-orange-700'
                                  : 'border-[#E5E7EB] bg-white text-[#374151]'
                              }`}
                              title={
                                loc.isAttendanceEnabled
                                  ? 'Nonaktifkan Presensi'
                                  : 'Jadikan Lokasi Presensi'
                              }
                            >
                              <Radio className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Soft Toggle */}
                          <button
                            type="button"
                            onClick={() =>
                              handleOpenConfirm(
                                loc,
                                loc.isActive ? 'deactivate' : 'activate'
                              )
                            }
                            className={`p-2 rounded-xl border text-xs transition-colors cursor-pointer ${
                              loc.isActive
                                ? 'border-red-200 text-red-600 hover:bg-red-50'
                                : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                            }`}
                            title={loc.isActive ? 'Nonaktifkan' : 'Aktifkan'}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Form Modal (Add / Edit) */}
      <LocationFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        locationToEdit={locationToEdit}
        onSuccess={handleFormSuccess}
      />

      {/* Detail Modal */}
      <LocationDetailModal
        isOpen={isDetailModalOpen}
        onClose={() => setIsDetailModalOpen(false)}
        location={selectedLocation}
        canManage={canManage}
        onEdit={(loc) => {
          setIsDetailModalOpen(false);
          handleOpenEdit(loc);
        }}
        onToggleAttendance={(loc) => {
          setIsDetailModalOpen(false);
          handleOpenConfirm(
            loc,
            loc.isAttendanceEnabled ? 'disable_attendance' : 'enable_attendance'
          );
        }}
      />

      {/* Confirmation Modal */}
      <LocationConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        location={confirmLocation}
        actionType={confirmActionType}
        onSuccess={handleConfirmSuccess}
      />
    </div>
  );
};
