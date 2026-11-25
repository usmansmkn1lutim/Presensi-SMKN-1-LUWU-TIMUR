import React from 'react';
import { FileText, Clock, CheckCircle2, XCircle, Ban } from 'lucide-react';
import { RequestRow, RequestWithRelations, RequestStatus } from '../../types/request.types';

interface RequestSummaryCardsProps {
  requests: (RequestRow | RequestWithRelations)[];
  selectedStatus?: RequestStatus | 'all';
  onSelectStatus?: (status: RequestStatus | 'all') => void;
}

export const RequestSummaryCards: React.FC<RequestSummaryCardsProps> = ({
  requests,
  selectedStatus,
  onSelectStatus,
}) => {
  const total = requests.length;
  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const approvedCount = requests.filter((r) => r.status === 'approved').length;
  const rejectedCount = requests.filter((r) => r.status === 'rejected').length;
  const cancelledCount = requests.filter((r) => r.status === 'cancelled').length;

  const items: {
    status: RequestStatus | 'all';
    label: string;
    count: number;
    icon: React.ReactNode;
    colorClasses: string;
    activeClasses: string;
  }[] = [
    {
      status: 'all',
      label: 'Total',
      count: total,
      icon: <FileText className="w-4 h-4 text-[#F97316] dark:text-[#FB923C]" />,
      colorClasses:
        'bg-white dark:bg-[#262626] border-[#E5E7EB] dark:border-[#404040] text-[#111827] dark:text-[#F9FAFB]',
      activeClasses:
        'ring-2 ring-[#F97316] border-[#F97316] bg-[#FFF7ED]/30 dark:bg-[#431F0B]/50 text-[#111827] dark:text-[#F9FAFB]',
    },
    {
      status: 'pending',
      label: 'Menunggu',
      count: pendingCount,
      icon: <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />,
      colorClasses:
        'bg-white dark:bg-[#262626] border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-300',
      activeClasses:
        'ring-2 ring-amber-500 border-amber-400 dark:border-amber-500/70 bg-amber-50/50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300',
    },
    {
      status: 'approved',
      label: 'Disetujui',
      count: approvedCount,
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />,
      colorClasses:
        'bg-white dark:bg-[#262626] border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-300',
      activeClasses:
        'ring-2 ring-emerald-500 border-emerald-400 dark:border-emerald-500/70 bg-emerald-50/50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-300',
    },
    {
      status: 'rejected',
      label: 'Ditolak',
      count: rejectedCount,
      icon: <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />,
      colorClasses:
        'bg-white dark:bg-[#262626] border-red-200 dark:border-red-800/60 text-red-900 dark:text-red-300',
      activeClasses:
        'ring-2 ring-red-500 border-red-400 dark:border-red-500/70 bg-red-50/50 dark:bg-red-950/40 text-red-900 dark:text-red-300',
    },
    {
      status: 'cancelled',
      label: 'Dibatalkan',
      count: cancelledCount,
      icon: <Ban className="w-4 h-4 text-slate-500 dark:text-[#A3A3A3]" />,
      colorClasses:
        'bg-white dark:bg-[#262626] border-slate-200 dark:border-[#404040] text-slate-800 dark:text-[#D4D4D4]',
      activeClasses:
        'ring-2 ring-slate-400 dark:ring-[#737373] border-slate-400 dark:border-[#737373] bg-slate-50 dark:bg-[#303030] text-slate-800 dark:text-[#F9FAFB]',
    },
  ];

  return (
    <>
      {/* Mobile & Tablet Pill Filter Row (<1024px) - Single horizontal scrollable row */}
      <div className="block lg:hidden">
        <div className="flex flex-nowrap items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
          {items.map((item) => {
            const isSelected = selectedStatus === item.status;
            return (
              <button
                key={item.status}
                type="button"
                onClick={() => onSelectStatus && onSelectStatus(item.status)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all cursor-pointer inline-flex items-center gap-1.5 shrink-0 ${
                  isSelected
                    ? 'bg-[#F97316] text-white font-bold shadow-2xs'
                    : 'bg-white dark:bg-[#262626] border border-[#E5E7EB] dark:border-[#404040] text-[#6B7280] dark:text-[#D4D4D4] hover:bg-gray-50 dark:hover:bg-[#303030]'
                }`}
              >
                <span>{item.label}</span>
                <span
                  className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-100 dark:bg-[#303030] text-[#374151] dark:text-[#D4D4D4]'
                  }`}
                >
                  {item.count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Desktop Cards Grid (≥1024px) */}
      <div className="hidden lg:grid lg:grid-cols-5 gap-3">
        {items.map((item) => {
          const isSelected = selectedStatus === item.status;
          return (
            <button
              key={item.status}
              type="button"
              onClick={() => onSelectStatus && onSelectStatus(item.status)}
              className={`p-3.5 rounded-2xl border transition-all text-left shadow-2xs cursor-pointer ${
                isSelected
                  ? item.activeClasses
                  : `${item.colorClasses} hover:border-[#F97316]/40 dark:hover:border-[#F97316]/50 hover:shadow-xs`
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-[#6B7280] dark:text-[#A3A3A3]">
                  {item.label}
                </span>
                <div className="p-1 rounded-lg bg-[#F9FAFB] dark:bg-[#303030]">{item.icon}</div>
              </div>
              <div className="text-xl sm:text-2xl font-bold tracking-tight">
                {item.count}
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
};
