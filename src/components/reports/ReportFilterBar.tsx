import React, { useState } from 'react';
import { Filter, Search, RotateCcw, Calendar, ChevronDown, Building2, MapPin, User, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { AttendanceReportFilter } from '../../types/attendanceReport.types';
import {
  getMakassarTodayDateString,
  getMakassarFirstDayOfMonthString,
} from '../../services/attendanceReportService';

export type PresetPeriod = 'today' | 'this_week' | 'this_month' | 'custom';

interface ReportFilterBarProps {
  filter: AttendanceReportFilter;
  onApplyFilter: (newFilter: AttendanceReportFilter) => void;
  onResetFilter: () => void;
  departments: { id: string; name: string }[];
  locations: { id: string; name: string }[];
  employees: { id: string; name: string; nip: string | null }[];
  isLoading: boolean;
}

export const ReportFilterBar: React.FC<ReportFilterBarProps> = ({
  filter,
  onApplyFilter,
  onResetFilter,
  departments,
  locations,
  employees,
  isLoading,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<PresetPeriod>('this_month');
  const [startDate, setStartDate] = useState<string>(filter.startDate);
  const [endDate, setEndDate] = useState<string>(filter.endDate);
  const [employeeId, setEmployeeId] = useState<string>(filter.employeeId || 'all');
  const [departmentId, setDepartmentId] = useState<string>(filter.departmentId || 'all');
  const [locationId, setLocationId] = useState<string>(filter.locationId || 'all');
  const [checkInStatus, setCheckInStatus] = useState<string>(filter.checkInStatus || 'all');
  const [checkOutStatus, setCheckOutStatus] = useState<string>(filter.checkOutStatus || 'all');
  const [searchQuery, setSearchQuery] = useState<string>(filter.searchQuery || '');
  const [isAdvancedOpen, setIsAdvancedOpen] = useState<boolean>(false);

  // Computes preset date range in Asia/Makassar
  const handleSelectPreset = (preset: PresetPeriod) => {
    setSelectedPreset(preset);
    const todayStr = getMakassarTodayDateString();
    const [y, m, d] = todayStr.split('-').map(Number);

    if (preset === 'today') {
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === 'this_week') {
      // Monday of current week in Makassar
      const todayObj = new Date(y, m - 1, d, 12, 0, 0);
      const dayOfWeek = todayObj.getDay(); // 0 = Sun, 1 = Mon ...
      const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
      const mondayObj = new Date(y, m - 1, d + diffToMonday, 12, 0, 0);
      const my = mondayObj.getFullYear();
      const mm = String(mondayObj.getMonth() + 1).padStart(2, '0');
      const md = String(mondayObj.getDate()).padStart(2, '0');
      setStartDate(`${my}-${mm}-${md}`);
      setEndDate(todayStr);
    } else if (preset === 'this_month') {
      setStartDate(getMakassarFirstDayOfMonthString());
      setEndDate(todayStr);
    }
  };

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (startDate > endDate) {
      alert('Tanggal mulai tidak boleh lebih besar dari tanggal akhir.');
      return;
    }

    onApplyFilter({
      startDate,
      endDate,
      employeeId: employeeId === 'all' ? null : employeeId,
      departmentId: departmentId === 'all' ? null : departmentId,
      locationId: locationId === 'all' ? null : locationId,
      checkInStatus: checkInStatus === 'all' ? null : (checkInStatus as any),
      checkOutStatus: checkOutStatus === 'all' ? null : (checkOutStatus as any),
      searchQuery: searchQuery.trim() || undefined,
    });
  };

  const handleReset = () => {
    const defStart = getMakassarFirstDayOfMonthString();
    const defEnd = getMakassarTodayDateString();
    setSelectedPreset('this_month');
    setStartDate(defStart);
    setEndDate(defEnd);
    setEmployeeId('all');
    setDepartmentId('all');
    setLocationId('all');
    setCheckInStatus('all');
    setCheckOutStatus('all');
    setSearchQuery('');
    onResetFilter();
  };

  return (
    <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
      <form onSubmit={handleApply} className="space-y-4">
        {/* Preset Period Buttons & Custom Range */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[#F3F4F6]">
          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-semibold text-[#6B7280] mr-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-[#9CA3AF]" />
              Periode:
            </span>
            {(
              [
                { id: 'today', label: 'Hari Ini' },
                { id: 'this_week', label: 'Minggu Ini' },
                { id: 'this_month', label: 'Bulan Ini' },
                { id: 'custom', label: 'Custom' },
              ] as const
            ).map((p) => {
              const active = selectedPreset === p.id;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => handleSelectPreset(p.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    active
                      ? 'bg-[#F97316] text-white shadow-xs font-semibold'
                      : 'bg-[#F9FAFB] text-[#4B5563] hover:bg-[#F3F4F6] border border-[#E5E7EB]'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Date Picker Controls (Native YYYY-MM-DD in Asia/Makassar) */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[#6B7280]">Dari:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setSelectedPreset('custom');
                }}
                className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-2.5 py-1.5 text-xs text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-[#6B7280]">Sampai:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setSelectedPreset('custom');
                }}
                className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-2.5 py-1.5 text-xs text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
              />
            </div>
          </div>
        </div>

        {/* Quick Search & Filter Controls */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {/* Search Query */}
          <div>
            <label className="block text-[11px] font-semibold text-[#6B7280] mb-1 flex items-center gap-1">
              <Search className="w-3 h-3 text-[#9CA3AF]" />
              Cari Nama / NIP
            </label>
            <input
              type="text"
              placeholder="Ketik nama atau NIP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#F97316] placeholder:text-[#9CA3AF]"
            />
          </div>

          {/* Pegawai Dropdown */}
          <div>
            <label className="block text-[11px] font-semibold text-[#6B7280] mb-1 flex items-center gap-1">
              <User className="w-3 h-3 text-[#9CA3AF]" />
              Pegawai
            </label>
            <select
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
            >
              <option value="all">Semua Pegawai ({employees.length})</option>
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} {emp.nip ? `(${emp.nip})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Status Masuk */}
          <div>
            <label className="block text-[11px] font-semibold text-[#6B7280] mb-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-[#9CA3AF]" />
              Status Masuk
            </label>
            <select
              value={checkInStatus}
              onChange={(e) => setCheckInStatus(e.target.value)}
              className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
            >
              <option value="all">Semua Status Masuk</option>
              <option value="on_time">Tepat Waktu</option>
              <option value="late">Terlambat</option>
            </select>
          </div>

          {/* Status Pulang */}
          <div>
            <label className="block text-[11px] font-semibold text-[#6B7280] mb-1 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-[#9CA3AF]" />
              Status Pulang
            </label>
            <select
              value={checkOutStatus}
              onChange={(e) => setCheckOutStatus(e.target.value)}
              className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
            >
              <option value="all">Semua Status Pulang</option>
              <option value="operational">Jam Operasional</option>
              <option value="after_work">Jam Pulang</option>
            </select>
          </div>
        </div>

        {/* Advanced Filters Toggle */}
        {isAdvancedOpen && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[#F3F4F6]">
            {/* Departemen */}
            <div>
              <label className="block text-[11px] font-semibold text-[#6B7280] mb-1 flex items-center gap-1">
                <Building2 className="w-3 h-3 text-[#9CA3AF]" />
                Departemen / Unit
              </label>
              <select
                value={departmentId}
                onChange={(e) => setDepartmentId(e.target.value)}
                className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
              >
                <option value="all">Semua Departemen</option>
                {departments.map((dept) => (
                  <option key={dept.id} value={dept.id}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Lokasi Presensi */}
            <div>
              <label className="block text-[11px] font-semibold text-[#6B7280] mb-1 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-[#9CA3AF]" />
                Lokasi Presensi
              </label>
              <select
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="w-full bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-3 py-2 text-xs text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#F97316]"
              >
                <option value="all">Semua Lokasi</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Action Buttons & Advanced Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2">
          <button
            type="button"
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            className="text-xs text-[#F97316] hover:text-[#EA580C] font-semibold flex items-center gap-1 self-start cursor-pointer"
          >
            <span>{isAdvancedOpen ? 'Tutup Filter Tambahan' : 'Filter Departemen & Lokasi'}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isAdvancedOpen ? 'rotate-180' : ''}`} />
          </button>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleReset}
              disabled={isLoading}
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              Reset
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isLoading}
              leftIcon={<Filter className="w-3.5 h-3.5" />}
            >
              Terapkan Filter
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
};
