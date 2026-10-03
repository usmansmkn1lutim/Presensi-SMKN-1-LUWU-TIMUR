import React, { useState } from 'react';
import { Search, RefreshCw, Filter, RotateCcw, AlertCircle } from 'lucide-react';
import { DepartmentOption } from '../../types/attendanceMonitoring.types';
import { Button } from '../ui/Button';

interface RecapFilterBarProps {
  startDate: string;
  endDate: string;
  departmentId: string;
  statusFilter: string;
  searchQuery: string;
  departments: DepartmentOption[];
  loading: boolean;
  validationError: string | null;
  onApplyFilter: (filters: {
    startDate: string;
    endDate: string;
    departmentId: string;
    statusFilter: string;
    searchQuery: string;
  }) => void;
  onPresetChange: (preset: 'today' | 'last_7_days' | 'this_month' | 'last_month' | 'this_year') => void;
  onResetFilter: () => void;
  onRefresh: () => void;
}

export const RecapFilterBar: React.FC<RecapFilterBarProps> = ({
  startDate: initialStartDate,
  endDate: initialEndDate,
  departmentId: initialDepartment,
  statusFilter: initialStatusFilter,
  searchQuery: initialSearch,
  departments,
  loading,
  validationError,
  onApplyFilter,
  onPresetChange,
  onResetFilter,
  onRefresh,
}) => {
  const [localStartDate, setLocalStartDate] = useState(initialStartDate);
  const [localEndDate, setLocalEndDate] = useState(initialEndDate);
  const [localDepartment, setLocalDepartment] = useState(initialDepartment);
  const [localStatus, setLocalStatus] = useState(initialStatusFilter);
  const [localSearch, setLocalSearch] = useState(initialSearch);

  // Sync state if props change externally
  React.useEffect(() => {
    setLocalStartDate(initialStartDate);
    setLocalEndDate(initialEndDate);
    setLocalDepartment(initialDepartment);
    setLocalStatus(initialStatusFilter);
    setLocalSearch(initialSearch);
  }, [initialStartDate, initialEndDate, initialDepartment, initialStatusFilter, initialSearch]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onApplyFilter({
      startDate: localStartDate,
      endDate: localEndDate,
      departmentId: localDepartment,
      statusFilter: localStatus,
      searchQuery: localSearch,
    });
  };

  return (
    <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
      {/* Quick Period Presets */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-semibold text-[#6B7280] whitespace-nowrap">
            Periode Cepat:
          </span>
          <button
            type="button"
            onClick={() => onPresetChange('today')}
            className="px-2.5 py-1 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] hover:bg-[#FFF7ED] hover:border-[#FFEDD5] hover:text-[#EA580C] text-xs font-medium text-[#374151] transition-all cursor-pointer whitespace-nowrap"
          >
            Hari Ini
          </button>
          <button
            type="button"
            onClick={() => onPresetChange('last_7_days')}
            className="px-2.5 py-1 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] hover:bg-[#FFF7ED] hover:border-[#FFEDD5] hover:text-[#EA580C] text-xs font-medium text-[#374151] transition-all cursor-pointer whitespace-nowrap"
          >
            7 Hari Terakhir
          </button>
          <button
            type="button"
            onClick={() => onPresetChange('this_month')}
            className="px-2.5 py-1 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] hover:bg-[#FFF7ED] hover:border-[#FFEDD5] hover:text-[#EA580C] text-xs font-medium text-[#374151] transition-all cursor-pointer whitespace-nowrap"
          >
            Bulan Ini
          </button>
          <button
            type="button"
            onClick={() => onPresetChange('last_month')}
            className="px-2.5 py-1 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] hover:bg-[#FFF7ED] hover:border-[#FFEDD5] hover:text-[#EA580C] text-xs font-medium text-[#374151] transition-all cursor-pointer whitespace-nowrap"
          >
            Bulan Lalu
          </button>
          <button
            type="button"
            onClick={() => onPresetChange('this_year')}
            className="px-2.5 py-1 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] hover:bg-[#FFF7ED] hover:border-[#FFEDD5] hover:text-[#EA580C] text-xs font-medium text-[#374151] transition-all cursor-pointer whitespace-nowrap"
          >
            Tahun Ini
          </button>
        </div>

        <div className="flex items-center gap-2 ml-auto shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onResetFilter}
            disabled={loading}
            className="text-xs text-[#6B7280] hover:text-[#111827]"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Reset Filter
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={loading}
            className="text-xs shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Segarkan Data
          </Button>
        </div>
      </div>

      {/* Date Range, Department, Status, & Search Form */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 text-xs">
          {/* Tanggal Mulai */}
          <div>
            <label htmlFor="recapStartDateInput" className="block text-[#6B7280] font-medium mb-1">
              Tanggal Mulai
            </label>
            <input
              id="recapStartDateInput"
              type="date"
              value={localStartDate}
              onChange={(e) => setLocalStartDate(e.target.value)}
              className="w-full h-10 px-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-[#111827] focus:outline-none focus:border-[#F97316] transition-all font-medium"
            />
          </div>

          {/* Tanggal Akhir */}
          <div>
            <label htmlFor="recapEndDateInput" className="block text-[#6B7280] font-medium mb-1">
              Tanggal Akhir
            </label>
            <input
              id="recapEndDateInput"
              type="date"
              value={localEndDate}
              onChange={(e) => setLocalEndDate(e.target.value)}
              className="w-full h-10 px-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-[#111827] focus:outline-none focus:border-[#F97316] transition-all font-medium"
            />
          </div>

          {/* Departemen */}
          <div>
            <label htmlFor="recapDepartmentInput" className="block text-[#6B7280] font-medium mb-1">
              Departemen
            </label>
            <select
              id="recapDepartmentInput"
              value={localDepartment}
              onChange={(e) => setLocalDepartment(e.target.value)}
              className="w-full h-10 px-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-[#111827] focus:outline-none focus:border-[#F97316] transition-all font-medium cursor-pointer"
            >
              <option value="all">Semua Departemen</option>
              {departments.map((dept) => (
                <option key={dept.id} value={dept.id}>
                  {dept.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status Kehadiran */}
          <div>
            <label htmlFor="recapStatusInput" className="block text-[#6B7280] font-medium mb-1">
              Status Kehadiran
            </label>
            <select
              id="recapStatusInput"
              value={localStatus}
              onChange={(e) => setLocalStatus(e.target.value)}
              className="w-full h-10 px-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-[#111827] focus:outline-none focus:border-[#F97316] transition-all font-medium cursor-pointer"
            >
              <option value="all">Semua Status</option>
              <option value="on_time">Tepat Waktu</option>
              <option value="late">Terlambat</option>
              <option value="belum_presensi">Belum Presensi</option>
              <option value="sudah_checkout">Sudah Check-out</option>
              <option value="belum_checkout">Belum Check-out</option>
            </select>
          </div>

          {/* Search Input */}
          <div>
            <label htmlFor="recapSearchInput" className="block text-[#6B7280] font-medium mb-1">
              Cari Pegawai
            </label>
            <div className="relative">
              <input
                id="recapSearchInput"
                type="text"
                placeholder="Cari nama atau NIP..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="w-full h-10 pl-9 pr-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-[#111827] focus:outline-none focus:border-[#F97316] transition-all text-xs font-medium"
              />
              <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Validation error */}
        {validationError && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        <div className="flex justify-end pt-1">
          <Button
            type="submit"
            isLoading={loading}
            size="sm"
            className="text-xs font-semibold h-10 px-5 rounded-xl"
          >
            <Filter className="w-3.5 h-3.5 mr-1.5" />
            Terapkan Filter & Statistik
          </Button>
        </div>
      </form>
    </div>
  );
};
