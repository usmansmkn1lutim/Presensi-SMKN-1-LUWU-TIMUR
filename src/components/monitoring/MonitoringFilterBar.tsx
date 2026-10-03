import React from 'react';
import { Search, RefreshCw, Calendar, Filter, Building2 } from 'lucide-react';
import { DepartmentOption } from '../../types/attendanceMonitoring.types';
import { Button } from '../ui/Button';

interface MonitoringFilterBarProps {
  date: string;
  departmentId: string;
  statusFilter: string;
  searchQuery: string;
  departments: DepartmentOption[];
  loading: boolean;
  onChangeDate: (date: string) => void;
  onChangeDepartment: (deptId: string) => void;
  onChangeStatus: (status: string) => void;
  onChangeSearch: (query: string) => void;
  onRefresh: () => void;
}

export const MonitoringFilterBar: React.FC<MonitoringFilterBarProps> = ({
  date,
  departmentId,
  statusFilter,
  searchQuery,
  departments,
  loading,
  onChangeDate,
  onChangeDepartment,
  onChangeStatus,
  onChangeSearch,
  onRefresh,
}) => {
  return (
    <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 shadow-2xs space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
        {/* Date Filter */}
        <div>
          <label htmlFor="monitoringDateInput" className="block text-[#6B7280] font-medium mb-1">
            Tanggal Monitoring
          </label>
          <input
            id="monitoringDateInput"
            type="date"
            value={date}
            onChange={(e) => onChangeDate(e.target.value)}
            className="w-full h-10 px-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-[#111827] focus:outline-none focus:border-[#F97316] transition-all cursor-pointer font-medium"
          />
        </div>

        {/* Department Filter */}
        <div>
          <label htmlFor="monitoringDepartmentInput" className="block text-[#6B7280] font-medium mb-1">
            Departemen
          </label>
          <select
            id="monitoringDepartmentInput"
            value={departmentId}
            onChange={(e) => onChangeDepartment(e.target.value)}
            className="w-full h-10 px-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-[#111827] focus:outline-none focus:border-[#F97316] transition-all cursor-pointer font-medium"
          >
            <option value="all">Semua Departemen</option>
            {departments.map((dept) => (
              <option key={dept.id} value={dept.id}>
                {dept.name}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label htmlFor="monitoringStatusInput" className="block text-[#6B7280] font-medium mb-1">
            Status Presensi
          </label>
          <select
            id="monitoringStatusInput"
            value={statusFilter}
            onChange={(e) => onChangeStatus(e.target.value)}
            className="w-full h-10 px-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-[#111827] focus:outline-none focus:border-[#F97316] transition-all cursor-pointer font-medium"
          >
            <option value="all">Semua Status Presensi</option>
            <option value="belum_presensi">Belum Presensi</option>
            <option value="sudah_masuk">Sudah Masuk</option>
            <option value="sudah_pulang">Sudah Pulang</option>
            <option value="on_time">Tepat Waktu</option>
            <option value="late">Terlambat</option>
          </select>
        </div>

        {/* Search Input */}
        <div>
          <label htmlFor="monitoringSearchInput" className="block text-[#6B7280] font-medium mb-1">
            Cari Pegawai
          </label>
          <div className="relative">
            <input
              id="monitoringSearchInput"
              type="text"
              placeholder="Cari nama atau NIP..."
              value={searchQuery}
              onChange={(e) => onChangeSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-[#111827] focus:outline-none focus:border-[#F97316] transition-all text-xs font-medium"
            />
            <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-3 pointer-events-none" />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-1">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
          className="text-xs font-medium h-9 px-4 rounded-xl"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Segarkan Data
        </Button>
      </div>
    </div>
  );
};
