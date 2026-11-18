import React, { useState, useRef, useEffect } from 'react';
import { Search, X, RotateCcw, SlidersHorizontal } from 'lucide-react';
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
  searchPlaceholder = 'Cari nama pegawai atau NIP...',
}) => {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setIsAdvancedOpen(false);
      }
    };
    if (isAdvancedOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isAdvancedOpen]);

  const hasAdvancedFilters =
    values.requestType !== 'all' ||
    values.datePreset !== 'all' ||
    Boolean(values.customStartDate) ||
    Boolean(values.customEndDate);

  const activeFilterCount =
    (values.requestType !== 'all' ? 1 : 0) +
    (values.datePreset !== 'all' ? 1 : 0);

  return (
    <div className="bg-transparent border-0 shadow-none p-0">
      <div className="relative flex items-center gap-2 lg:gap-3 justify-between w-full">
        {showSearch && (
          <div className="flex items-center flex-1 min-w-0 bg-white border border-[#E5E7EB] rounded-xl focus-within:border-[#F97316] transition-colors pl-3 pr-1 lg:pr-1.5 gap-1.5 lg:gap-2">
            <Search className="w-4 h-4 text-[#9CA3AF] pointer-events-none shrink-0" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={values.search}
              onChange={(e) => onChange({ ...values, search: e.target.value })}
              className="w-full min-w-0 h-9 lg:h-11 text-xs lg:text-sm bg-transparent border-0 focus:outline-none placeholder:text-[#9CA3AF] text-[#111827]"
              aria-label="Cari pengajuan"
            />
            {values.search && (
              <button
                type="button"
                onClick={() => onChange({ ...values, search: '' })}
                className="text-[#9CA3AF] hover:text-[#111827] cursor-pointer p-0.5 lg:p-1 shrink-0"
                aria-label="Hapus kata kunci pencarian"
              >
                <X className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
              </button>
            )}

            {/* Filter Trigger Button & Popover Container */}
            <div className="relative shrink-0" ref={filterRef}>
              <button
                type="button"
                onClick={() => setIsAdvancedOpen((prev) => !prev)}
                className={`relative inline-flex items-center justify-center w-7.5 h-7.5 lg:w-8 lg:h-8 rounded-lg transition-all cursor-pointer ${
                  activeFilterCount > 0 || isAdvancedOpen
                    ? 'bg-orange-50 text-[#EA580C]'
                    : 'text-[#6B7280] hover:bg-gray-100 hover:text-[#111827]'
                }`}
                aria-expanded={isAdvancedOpen}
                aria-label="Buka filter detail"
                title="Filter Detail"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 lg:w-4 lg:h-4" />
                {activeFilterCount > 0 && (
                  <span className="absolute -top-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-[#F97316] text-white">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {/* Popover Filter Detail */}
              {isAdvancedOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white border border-[#E5E7EB] rounded-2xl shadow-xl p-4 z-30 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F6]">
                    <div className="flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-[#F97316]" />
                      <h4 className="text-xs font-bold text-[#111827]">Filter Detail</h4>
                      {activeFilterCount > 0 && (
                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-100 text-[#EA580C]">
                          {activeFilterCount} aktif
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsAdvancedOpen(false)}
                      className="text-[#9CA3AF] hover:text-[#111827] p-1 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                      aria-label="Tutup panel filter"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-3.5 py-3 text-xs">
                    {/* Filter Jenis Pengajuan */}
                    <div className="space-y-1.5">
                      <label className="block text-[11px] font-semibold text-[#6B7280]">
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
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                              values.requestType === item.id
                                ? 'bg-[#111827] text-white font-bold'
                                : 'bg-[#F9FAFB] text-[#4B5563] hover:bg-[#F3F4F6] border border-[#E5E7EB]'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Filter Rentang Tanggal */}
                    <div className="space-y-1.5 pt-2 border-t border-[#F3F4F6]">
                      <label className="block text-[11px] font-semibold text-[#6B7280]">
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
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                              values.datePreset === item.id
                                ? 'bg-[#F97316] text-white font-bold'
                                : 'bg-[#F9FAFB] text-[#4B5563] hover:bg-[#F3F4F6] border border-[#E5E7EB]'
                            }`}
                          >
                            {item.label}
                          </button>
                        ))}
                      </div>

                      {/* Custom Date Inputs */}
                      {values.datePreset === 'custom' && (
                        <div className="grid grid-cols-2 gap-2 pt-2 animate-in fade-in duration-150">
                          <div>
                            <label className="block text-[10px] text-[#6B7280] mb-1">
                              Dari Tanggal
                            </label>
                            <input
                              type="date"
                              value={values.customStartDate}
                              onChange={(e) =>
                                onChange({ ...values, customStartDate: e.target.value })
                              }
                              className="w-full px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] text-xs text-[#111827] focus:outline-none focus:border-[#F97316] bg-white"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-[#6B7280] mb-1">
                              Sampai Tanggal
                            </label>
                            <input
                              type="date"
                              value={values.customEndDate}
                              onChange={(e) =>
                                onChange({ ...values, customEndDate: e.target.value })
                              }
                              className="w-full px-2.5 py-1.5 rounded-lg border border-[#E5E7EB] text-xs text-[#111827] focus:outline-none focus:border-[#F97316] bg-white"
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#F3F4F6] flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => {
                        onReset();
                        setIsAdvancedOpen(false);
                      }}
                      disabled={!hasAdvancedFilters && !values.search}
                      className="text-xs font-semibold text-[#6B7280] hover:text-[#EF4444] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors flex items-center gap-1"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset Filter</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAdvancedOpen(false)}
                      className="px-3.5 py-1.5 rounded-xl bg-[#F97316] hover:bg-[#EA580C] text-white text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
                    >
                      Tutup
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
