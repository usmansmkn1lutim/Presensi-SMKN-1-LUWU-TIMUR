import React, { useState } from 'react';
import { Search, Filter, Calendar, X, RotateCcw } from 'lucide-react';
import { RequestStatus, RequestType } from '../../types/request.types';

export type DatePreset = 'all' | 'this_month' | 'last_3_months' | 'this_year' | 'custom';

export interface RequestFilterValues {
  status: RequestStatus | 'all';
  requestType: RequestType | 'all';
  datePreset: DatePreset;
  customStartDate: string;
  customEndDate: string;
  search: string;
}

interface RequestHistoryFiltersProps {
  values: RequestFilterValues;
  onChange: (values: RequestFilterValues) => void;
  onReset: () => void;
  showSearch?: boolean;
  searchPlaceholder?: string;
}

export function getDateRangeFromPreset(
  preset: DatePreset,
  customStart = '',
  customEnd = ''
): { startDate?: string; endDate?: string } {
  if (preset === 'all') return {};

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth() + 1; // 1-indexed

  if (preset === 'this_month') {
    const padMonth = String(month).padStart(2, '0');
    const lastDay = new Date(year, month, 0).getDate();
    return {
      startDate: `${year}-${padMonth}-01`,
      endDate: `${year}-${padMonth}-${String(lastDay).padStart(2, '0')}`,
    };
  }

  if (preset === 'last_3_months') {
    // 3 months including current: e.g. Oct -> Aug, Sep, Oct
    const startDateObj = new Date(year, month - 3, 1);
    const startY = startDateObj.getFullYear();
    const startM = String(startDateObj.getMonth() + 1).padStart(2, '0');
    const padMonth = String(month).padStart(2, '0');
    const lastDay = new Date(year, month, 0).getDate();
    return {
      startDate: `${startY}-${startM}-01`,
      endDate: `${year}-${padMonth}-${String(lastDay).padStart(2, '0')}`,
    };
  }

  if (preset === 'this_year') {
    return {
      startDate: `${year}-01-01`,
      endDate: `${year}-12-31`,
    };
  }

  if (preset === 'custom') {
    return {
      startDate: customStart || undefined,
      endDate: customEnd || undefined,
    };
  }

  return {};
}

export const RequestHistoryFilters: React.FC<RequestHistoryFiltersProps> = ({
  values,
  onChange,
  onReset,
  showSearch = true,
  searchPlaceholder = 'Cari jenis pengajuan atau alasan...',
}) => {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  const hasActiveFilters =
    values.status !== 'all' ||
    values.requestType !== 'all' ||
    values.datePreset !== 'all' ||
    Boolean(values.search.trim());

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 shadow-2xs space-y-3">
      {/* Top Row: Search + Quick Status + Toggle Advanced */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        {showSearch && (
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={values.search}
              onChange={(e) => onChange({ ...values, search: e.target.value })}
              className="w-full pl-9 pr-8 py-2 rounded-xl border border-[#E5E7EB] text-xs text-[#111827] placeholder:text-[#9CA3AF] focus:outline-hidden focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20 bg-white"
            />
            {values.search && (
              <button
                type="button"
                onClick={() => onChange({ ...values, search: '' })}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-[#111827]"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <button
            type="button"
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shrink-0 ${
              isAdvancedOpen || values.requestType !== 'all' || values.datePreset !== 'all'
                ? 'bg-[#FFF7ED] text-[#EA580C] border border-[#F97316]/40'
                : 'text-[#6B7280] hover:text-[#111827] hover:bg-[#F9FAFB] border border-[#E5E7EB]'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            <span>Filter Detail</span>
            {(values.requestType !== 'all' || values.datePreset !== 'all') && (
              <span className="w-2 h-2 rounded-full bg-[#F97316]" />
            )}
          </button>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onReset}
              className="px-2.5 py-2 rounded-xl text-xs font-semibold text-[#6B7280] hover:text-red-600 hover:bg-red-50 transition-all flex items-center gap-1 shrink-0"
              title="Reset semua filter"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Quick Status Bar */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-t border-[#F3F4F6] pt-2">
        <span className="text-[11px] font-semibold text-[#6B7280] shrink-0 mr-1">
          Status:
        </span>
        {[
          { id: 'all', label: 'Semua' },
          { id: 'pending', label: 'Menunggu' },
          { id: 'approved', label: 'Disetujui' },
          { id: 'rejected', label: 'Ditolak' },
          { id: 'cancelled', label: 'Dibatalkan' },
        ].map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onChange({ ...values, status: item.id as RequestStatus | 'all' })}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
              values.status === item.id
                ? 'bg-[#FFF7ED] text-[#EA580C] border border-[#F97316]/40 shadow-2xs font-bold'
                : 'text-[#6B7280] hover:text-[#111827] hover:bg-[#F9FAFB] border border-transparent'
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>

      {/* Expanded Advanced Filter Area: Jenis Pengajuan & Rentang Tanggal */}
      {isAdvancedOpen && (
        <div className="pt-3 border-t border-[#F3F4F6] space-y-3 animate-in fade-in duration-150">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Filter Jenis Pengajuan */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[#374151]">
                Jenis Pengajuan
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'all', label: 'Semua' },
                  { id: 'leave', label: 'Cuti' },
                  { id: 'sick', label: 'Sakit' },
                  { id: 'official_duty', label: 'Tugas Dinas' },
                  { id: 'other', label: 'Lainnya' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      onChange({ ...values, requestType: item.id as RequestType | 'all' })
                    }
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      values.requestType === item.id
                        ? 'bg-[#111827] text-white'
                        : 'bg-[#F9FAFB] text-[#4B5563] hover:bg-[#F3F4F6] border border-[#E5E7EB]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Filter Rentang Tanggal */}
            <div className="space-y-1.5">
              <label className="text-[11px] font-semibold text-[#374151] flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#F97316]" />
                Rentang Tanggal
              </label>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'all', label: 'Semua' },
                  { id: 'this_month', label: 'Bulan Ini' },
                  { id: 'last_3_months', label: '3 Bulan Terakhir' },
                  { id: 'this_year', label: 'Tahun Ini' },
                  { id: 'custom', label: 'Rentang Kustom' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() =>
                      onChange({ ...values, datePreset: item.id as DatePreset })
                    }
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      values.datePreset === item.id
                        ? 'bg-[#F97316] text-white'
                        : 'bg-[#F9FAFB] text-[#4B5563] hover:bg-[#F3F4F6] border border-[#E5E7EB]'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Custom Date Inputs */}
              {values.datePreset === 'custom' && (
                <div className="grid grid-cols-2 gap-2 pt-2">
                  <div>
                    <label className="text-[10px] text-[#6B7280] block mb-1">
                      Dari Tanggal
                    </label>
                    <input
                      type="date"
                      value={values.customStartDate}
                      onChange={(e) =>
                        onChange({ ...values, customStartDate: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] text-xs text-[#111827] focus:outline-hidden focus:border-[#F97316] bg-white"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-[#6B7280] block mb-1">
                      Sampai Tanggal
                    </label>
                    <input
                      type="date"
                      value={values.customEndDate}
                      onChange={(e) =>
                        onChange({ ...values, customEndDate: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] text-xs text-[#111827] focus:outline-hidden focus:border-[#F97316] bg-white"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
