import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  CalendarOff,
  Plus,
  Search,
  RefreshCw,
  Calendar,
  List,
  CheckCircle2,
  AlertCircle,
  Edit2,
  Power,
  ChevronLeft,
  ChevronRight,
  Shield,
  Filter,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import {
  HolidayModel,
  HolidayType,
  HOLIDAY_TYPE_CONFIG,
} from '../../types/holiday.types';
import { holidayService } from '../../services/holidayService';
import { HolidayFormModal } from '../../components/holidays/HolidayFormModal';
import { HolidayConfirmModal } from '../../components/holidays/HolidayConfirmModal';
import { HolidayCalendarView } from '../../components/holidays/HolidayCalendarView';

export const HolidaysPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const canManage =
    currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  // Current year state
  const currentYearNow = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYearNow);

  // View mode: 'calendar' | 'list'
  const [viewMode, setViewMode] = useState<'calendar' | 'list'>('calendar');

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<HolidayType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');

  // Data & Async States
  const [holidays, setHolidays] = useState<HolidayModel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [holidayToEdit, setHolidayToEdit] = useState<HolidayModel | null>(null);
  const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
  const [confirmHoliday, setConfirmHoliday] = useState<HolidayModel | null>(null);

  // Show Toast Helper
  const showToast = (message: string) => {
    setSuccessToast(message);
    setTimeout(() => {
      setSuccessToast(null);
    }, 4500);
  };

  // Fetch holidays for the selected year
  const fetchHolidays = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await holidayService.getHolidays({
        year: selectedYear,
      });
      setHolidays(data);
    } catch (err: unknown) {
      console.error('Gagal mengambil data hari libur:', err);
      setErrorMessage('Data hari libur tidak dapat dimuat. Silakan periksa koneksi dan coba lagi.');
    } finally {
      setIsLoading(false);
    }
  }, [selectedYear]);

  useEffect(() => {
    fetchHolidays();
  }, [fetchHolidays]);

  // Client-side filtering for Search, Type, and Status
  const filteredHolidays = useMemo(() => {
    return holidays.filter((h) => {
      // 1. Search Query (name)
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        if (!h.name.toLowerCase().includes(q)) {
          return false;
        }
      }

      // 2. Type Filter
      if (typeFilter !== 'all' && h.holidayType !== typeFilter) {
        return false;
      }

      // 3. Status Filter
      if (statusFilter === 'active' && !h.isActive) return false;
      if (statusFilter === 'inactive' && h.isActive) return false;

      return true;
    });
  }, [holidays, searchQuery, typeFilter, statusFilter]);

  // Statistics calculation (calculated from current year holidays)
  const totalCount = holidays.length;
  const activeCount = holidays.filter((h) => h.isActive).length;
  const nationalCount = holidays.filter((h) => h.holidayType === 'national' && h.isActive).length;
  const schoolCount = holidays.filter((h) => h.holidayType === 'school' && h.isActive).length;

  // Modal Handlers
  const handleOpenAdd = () => {
    setHolidayToEdit(null);
    setIsFormModalOpen(true);
  };

  const handleOpenEdit = (h: HolidayModel) => {
    setHolidayToEdit(h);
    setIsFormModalOpen(true);
  };

  const handleOpenConfirm = (h: HolidayModel) => {
    setConfirmHoliday(h);
    setIsConfirmModalOpen(true);
  };

  const handleFormSuccess = (savedHoliday: HolidayModel, mode: 'create' | 'edit') => {
    fetchHolidays();
    if (mode === 'create') {
      showToast(`Hari libur "${savedHoliday.name}" berhasil ditambahkan.`);
    } else {
      showToast(`Hari libur "${savedHoliday.name}" berhasil diperbarui.`);
    }
  };

  const handleConfirmSuccess = (_updated: HolidayModel, msg: string) => {
    fetchHolidays();
    showToast(msg);
  };

  const formatDisplayDate = (isoDate: string) => {
    try {
      const parts = isoDate.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return new Intl.DateTimeFormat('id-ID', {
          dateStyle: 'full',
        }).format(d);
      }
      return isoDate;
    } catch {
      return isoDate;
    }
  };

  // Generate array of selectable years (from -2 to +3 years around current year)
  const availableYears = useMemo(() => {
    const years: number[] = [];
    for (let y = currentYearNow - 2; y <= currentYearNow + 3; y++) {
      years.push(y);
    }
    return years;
  }, [currentYearNow]);

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
              Kalender Sekolah
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-[#111827] mt-0.5">
              Kalender & Hari Libur
            </h1>
            <p className="text-xs sm:text-sm text-[#6B7280] mt-1">
              Kelola dan lihat kalender hari libur sekolah.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button
              variant="outline"
              size="md"
              leftIcon={<RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />}
              onClick={fetchHolidays}
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
                Tambah Hari Libur
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Hari Libur */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 shadow-2xs">
          <p className="text-xs font-medium text-[#6B7280]">Total Hari Libur</p>
          <p className="text-xl sm:text-2xl font-bold text-[#111827] mt-1">
            {isLoading ? '-' : totalCount}
          </p>
          <p className="text-[11px] text-[#9CA3AF] mt-0.5">Tahun {selectedYear}</p>
        </div>

        {/* Card 2: Hari Libur Aktif */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 shadow-2xs">
          <p className="text-xs font-medium text-[#6B7280]">Hari Libur Aktif</p>
          <p className="text-xl sm:text-2xl font-bold text-emerald-700 mt-1">
            {isLoading ? '-' : activeCount}
          </p>
          <p className="text-[11px] text-[#9CA3AF] mt-0.5">Berlaku untuk presensi</p>
        </div>

        {/* Card 3: Libur Nasional */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 shadow-2xs">
          <p className="text-xs font-medium text-[#6B7280]">Hari Libur Nasional</p>
          <p className="text-xl sm:text-2xl font-bold text-red-600 mt-1">
            {isLoading ? '-' : nationalCount}
          </p>
          <p className="text-[11px] text-[#9CA3AF] mt-0.5">Hari besar kenegaraan</p>
        </div>

        {/* Card 4: Libur Sekolah */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 shadow-2xs">
          <p className="text-xs font-medium text-[#6B7280]">Hari Libur Sekolah</p>
          <p className="text-xl sm:text-2xl font-bold text-blue-600 mt-1">
            {isLoading ? '-' : schoolCount}
          </p>
          <p className="text-[11px] text-[#9CA3AF] mt-0.5">Semester & kegiatan</p>
        </div>
      </div>

      {/* Filter, Search & View Switcher Bar */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari hari libur..."
              className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-white border border-[#E5E7EB] rounded-xl text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316] transition-all"
            />
          </div>

          {/* Controls: Year, Type, Status, View Mode */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Year Selector with < > navigation */}
            <div className="flex items-center border border-[#E5E7EB] rounded-xl bg-white overflow-hidden">
              <button
                type="button"
                onClick={() => setSelectedYear((y) => y - 1)}
                className="px-2.5 py-2 hover:bg-zinc-50 text-[#374151] transition-colors cursor-pointer"
                title="Tahun Sebelumnya"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-2 py-2 text-xs font-bold text-[#111827] bg-transparent focus:outline-none cursor-pointer"
              >
                {availableYears.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setSelectedYear((y) => y + 1)}
                className="px-2.5 py-2 hover:bg-zinc-50 text-[#374151] transition-colors cursor-pointer"
                title="Tahun Berikutnya"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Type Filter */}
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as HolidayType | 'all')}
              className="px-3 py-2 text-xs bg-white border border-[#E5E7EB] rounded-xl text-[#374151] font-medium focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316] transition-all cursor-pointer"
            >
              <option value="all">Semua Jenis</option>
              <option value="national">Nasional</option>
              <option value="collective_leave">Cuti Bersama</option>
              <option value="school">Sekolah</option>
              <option value="special">Khusus</option>
              <option value="other">Lainnya</option>
            </select>

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

            {/* View Mode Toggle */}
            <div className="flex items-center p-0.5 bg-zinc-100 border border-[#E5E7EB] rounded-xl">
              <button
                type="button"
                onClick={() => setViewMode('calendar')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  viewMode === 'calendar'
                    ? 'bg-white text-[#F97316] shadow-xs'
                    : 'text-[#6B7280] hover:text-[#111827]'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Kalender</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-white text-[#F97316] shadow-xs'
                    : 'text-[#6B7280] hover:text-[#111827]'
                }`}
              >
                <List className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Daftar</span>
              </button>
            </div>

            {/* Reset Filters button */}
            {(searchQuery || typeFilter !== 'all' || statusFilter !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setTypeFilter('all');
                  setStatusFilter('all');
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
              Memuat data kalender hari libur tahun {selectedYear}...
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
              <h3 className="text-base font-bold text-[#111827]">Data hari libur tidak dapat dimuat.</h3>
              <p className="text-xs text-[#6B7280] max-w-md mx-auto mt-1">
                {errorMessage}
              </p>
            </div>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<RefreshCw className="w-4 h-4" />}
              onClick={fetchHolidays}
            >
              Coba Lagi
            </Button>
          </div>
        )}

        {/* Empty State (No holidays at all in selected year) */}
        {!isLoading && !errorMessage && holidays.length === 0 && (
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-8 sm:p-12 text-center space-y-4 shadow-2xs">
            <div className="w-14 h-14 rounded-2xl bg-orange-50 text-[#F97316] flex items-center justify-center mx-auto">
              <CalendarOff className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#111827]">Belum Ada Hari Libur</h3>
              <p className="text-xs sm:text-sm text-[#6B7280] max-w-md mx-auto mt-1">
                {canManage
                  ? 'Tambahkan hari libur untuk mulai mengisi kalender.'
                  : `Belum ada data hari libur untuk tahun ${selectedYear}.`}
              </p>
            </div>
            {canManage && (
              <Button
                variant="primary"
                size="md"
                leftIcon={<Plus className="w-4 h-4" />}
                onClick={handleOpenAdd}
              >
                Tambah Hari Libur
              </Button>
            )}
          </div>
        )}

        {/* Empty Search / Filter Match */}
        {!isLoading && !errorMessage && holidays.length > 0 && filteredHolidays.length === 0 && (
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-8 text-center space-y-3 shadow-2xs">
            <p className="text-sm font-semibold text-[#111827]">
              Belum ada data hari libur untuk filter yang dipilih.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setTypeFilter('all');
                setStatusFilter('all');
              }}
              className="text-xs font-semibold text-[#F97316] hover:underline"
            >
              Bersihkan filter pencarian
            </button>
          </div>
        )}

        {/* View Mode: Calendar View */}
        {!isLoading && !errorMessage && filteredHolidays.length > 0 && viewMode === 'calendar' && (
          <HolidayCalendarView
            holidays={filteredHolidays}
            selectedYear={selectedYear}
            onYearChange={(newYear) => setSelectedYear(newYear)}
            canManage={canManage}
            onEdit={handleOpenEdit}
            onToggleStatus={handleOpenConfirm}
          />
        )}

        {/* View Mode: List View */}
        {!isLoading && !errorMessage && filteredHolidays.length > 0 && viewMode === 'list' && (
          <div className="space-y-4">
            {/* Desktop Table View */}
            <div className="hidden md:block bg-white border border-[#E5E7EB] rounded-2xl shadow-2xs overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-zinc-50/80 border-b border-[#E5E7EB] text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
                    <th className="py-3.5 px-5">Tanggal</th>
                    <th className="py-3.5 px-5">Nama Hari Libur</th>
                    <th className="py-3.5 px-4">Jenis</th>
                    <th className="py-3.5 px-4">Status</th>
                    {canManage && <th className="py-3.5 px-5 text-right">Aksi</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB] text-xs">
                  {filteredHolidays.map((h) => {
                    const cfg = HOLIDAY_TYPE_CONFIG[h.holidayType] || HOLIDAY_TYPE_CONFIG.other;

                    return (
                      <tr
                        key={h.id}
                        className="hover:bg-zinc-50/60 transition-colors"
                      >
                        {/* Tanggal */}
                        <td className="py-4 px-5 font-semibold text-[#111827] whitespace-nowrap">
                          {formatDisplayDate(h.holidayDate)}
                        </td>

                        {/* Nama & Deskripsi */}
                        <td className="py-4 px-5">
                          <p className="font-bold text-sm text-[#111827]">{h.name}</p>
                          {h.description && (
                            <p className="text-[11px] text-[#6B7280] mt-0.5 line-clamp-1">
                              {h.description}
                            </p>
                          )}
                        </td>

                        {/* Jenis */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 text-xs font-bold rounded-full border ${cfg.badgeClass}`}
                          >
                            {cfg.label}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          {h.isActive ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-semibold text-emerald-700 bg-emerald-50 rounded-full">
                              Aktif
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 text-xs font-semibold text-zinc-500 bg-zinc-100 rounded-full">
                              Nonaktif
                            </span>
                          )}
                        </td>

                        {/* Aksi */}
                        {canManage && (
                          <td className="py-4 px-5 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(h)}
                                title="Edit Hari Libur"
                                className="p-1.5 text-[#6B7280] hover:text-[#F97316] hover:bg-orange-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenConfirm(h)}
                                title={h.isActive ? 'Nonaktifkan Hari Libur' : 'Aktifkan Hari Libur'}
                                className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                                  h.isActive
                                    ? 'text-[#6B7280] hover:text-red-600 hover:bg-red-50'
                                    : 'text-emerald-600 hover:bg-emerald-50'
                                }`}
                              >
                                <Power className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Responsive Cards */}
            <div className="md:hidden space-y-3">
              {filteredHolidays.map((h) => {
                const cfg = HOLIDAY_TYPE_CONFIG[h.holidayType] || HOLIDAY_TYPE_CONFIG.other;

                return (
                  <div
                    key={h.id}
                    className="bg-white border border-[#E5E7EB] rounded-2xl p-4 space-y-3 shadow-2xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-xs font-bold text-[#F97316]">
                          {formatDisplayDate(h.holidayDate)}
                        </p>
                        <h3 className="font-bold text-sm text-[#111827] mt-0.5">
                          {h.name}
                        </h3>
                      </div>

                      <div className="flex flex-col items-end gap-1">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${cfg.badgeClass}`}
                        >
                          {cfg.label}
                        </span>
                        {h.isActive ? (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
                            Aktif
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-zinc-200 text-zinc-600">
                            Nonaktif
                          </span>
                        )}
                      </div>
                    </div>

                    {h.description && (
                      <p className="text-xs text-[#6B7280] pt-1 border-t border-[#E5E7EB]">
                        {h.description}
                      </p>
                    )}

                    {canManage && (
                      <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
                        <Button
                          variant="outline"
                          size="sm"
                          leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                          onClick={() => handleOpenEdit(h)}
                        >
                          Edit
                        </Button>
                        <button
                          type="button"
                          onClick={() => handleOpenConfirm(h)}
                          className={`px-3 py-1.5 text-xs font-semibold rounded-xl border transition-colors cursor-pointer flex items-center gap-1.5 ${
                            h.isActive
                              ? 'border-red-200 text-red-600 hover:bg-red-50'
                              : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                          }`}
                        >
                          <Power className="w-3.5 h-3.5" />
                          <span>{h.isActive ? 'Nonaktifkan' : 'Aktifkan'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Form Modal (Add / Edit) */}
      <HolidayFormModal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        holidayToEdit={holidayToEdit}
        onSuccess={handleFormSuccess}
      />

      {/* Confirm Modal (Activate / Deactivate) */}
      <HolidayConfirmModal
        isOpen={isConfirmModalOpen}
        onClose={() => setIsConfirmModalOpen(false)}
        holiday={confirmHoliday}
        onSuccess={handleConfirmSuccess}
      />
    </div>
  );
};
