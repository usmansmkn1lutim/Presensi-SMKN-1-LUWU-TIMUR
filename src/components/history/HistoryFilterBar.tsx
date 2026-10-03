import React, { useState } from 'react';
import { Calendar, Filter, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';

interface HistoryFilterBarProps {
  startDate: string;
  endDate: string;
  statusFilter: 'all' | 'on_time' | 'late';
  checkoutFilter: 'all' | 'checked_out' | 'not_checked_out';
  validationError: string | null;
  onApply: (filters: {
    startDate: string;
    endDate: string;
    statusFilter: 'all' | 'on_time' | 'late';
    checkoutFilter: 'all' | 'checked_out' | 'not_checked_out';
  }) => void;
  onQuickFilter: (key: 'this_month' | 'last_month' | 'last_7_days') => void;
  onRefresh: () => void;
  loading: boolean;
}

export const HistoryFilterBar: React.FC<HistoryFilterBarProps> = ({
  startDate: initialStartDate,
  endDate: initialEndDate,
  statusFilter: initialStatus,
  checkoutFilter: initialCheckout,
  validationError,
  onApply,
  onQuickFilter,
  onRefresh,
  loading,
}) => {
  const [localStartDate, setLocalStartDate] = useState(initialStartDate);
  const [localEndDate, setLocalEndDate] = useState(initialEndDate);
  const [localStatus, setLocalStatus] = useState(initialStatus);
  const [localCheckout, setLocalCheckout] = useState(initialCheckout);

  const handleApplyClick = (e: React.FormEvent) => {
    e.preventDefault();
    onApply({
      startDate: localStartDate,
      endDate: localEndDate,
      statusFilter: localStatus,
      checkoutFilter: localCheckout,
    });
  };

  return (
    <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
      {/* Quick Filter Pills & Refresh */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-semibold text-[#6B7280] whitespace-nowrap">
            Filter Cepat:
          </span>
          <button
            type="button"
            onClick={() => {
              onQuickFilter('this_month');
            }}
            className="px-3 py-1.5 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] hover:bg-[#FFF7ED] hover:border-[#FFEDD5] hover:text-[#EA580C] text-xs font-medium text-[#374151] transition-all cursor-pointer whitespace-nowrap"
          >
            Bulan Ini
          </button>
          <button
            type="button"
            onClick={() => {
              onQuickFilter('last_month');
            }}
            className="px-3 py-1.5 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] hover:bg-[#FFF7ED] hover:border-[#FFEDD5] hover:text-[#EA580C] text-xs font-medium text-[#374151] transition-all cursor-pointer whitespace-nowrap"
          >
            Bulan Lalu
          </button>
          <button
            type="button"
            onClick={() => {
              onQuickFilter('last_7_days');
            }}
            className="px-3 py-1.5 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] hover:bg-[#FFF7ED] hover:border-[#FFEDD5] hover:text-[#EA580C] text-xs font-medium text-[#374151] transition-all cursor-pointer whitespace-nowrap"
          >
            7 Hari Terakhir
          </button>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={loading}
          className="text-xs ml-auto shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
          Segarkan
        </Button>
      </div>

      {/* Date Range Inputs & Status Selectors */}
      <form onSubmit={handleApplyClick} className="space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          {/* Tanggal Mulai */}
          <div>
            <label htmlFor="startDateInput" className="block text-[#6B7280] font-medium mb-1">Tanggal Mulai</label>
            <input
              id="startDateInput"
              type="date"
              value={localStartDate}
              onChange={(e) => setLocalStartDate(e.target.value)}
              className="w-full h-10 px-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-[#111827] focus:outline-none focus:border-[#F97316] transition-all"
            />
          </div>

          {/* Tanggal Akhir */}
          <div>
            <label htmlFor="endDateInput" className="block text-[#6B7280] font-medium mb-1">Tanggal Akhir</label>
            <input
              id="endDateInput"
              type="date"
              value={localEndDate}
              onChange={(e) => setLocalEndDate(e.target.value)}
              className="w-full h-10 px-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-[#111827] focus:outline-none focus:border-[#F97316] transition-all"
            />
          </div>

          {/* Status Masuk */}
          <div>
            <label htmlFor="statusFilterInput" className="block text-[#6B7280] font-medium mb-1">Status Masuk</label>
            <select
              id="statusFilterInput"
              value={localStatus}
              onChange={(e) =>
                setLocalStatus(e.target.value as 'all' | 'on_time' | 'late')
              }
              className="w-full h-10 px-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-[#111827] focus:outline-none focus:border-[#F97316] transition-all cursor-pointer"
            >
              <option value="all">Semua Status Masuk</option>
              <option value="on_time">Tepat Waktu</option>
              <option value="late">Terlambat</option>
            </select>
          </div>

          {/* Status Pulang */}
          <div>
            <label htmlFor="checkoutFilterInput" className="block text-[#6B7280] font-medium mb-1">Status Pulang</label>
            <select
              id="checkoutFilterInput"
              value={localCheckout}
              onChange={(e) =>
                setLocalCheckout(
                  e.target.value as 'all' | 'checked_out' | 'not_checked_out'
                )
              }
              className="w-full h-10 px-3 bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-[#111827] focus:outline-none focus:border-[#F97316] transition-all cursor-pointer"
            >
              <option value="all">Semua Status Pulang</option>
              <option value="checked_out">Sudah Check-out</option>
              <option value="not_checked_out">Belum Check-out</option>
            </select>
          </div>
        </div>

        {/* Validation Warning */}
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
            Terapkan Filter
          </Button>
        </div>
      </form>
    </div>
  );
};
