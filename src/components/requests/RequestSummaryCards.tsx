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
      label: 'Total Pengajuan',
      count: total,
      icon: <FileText className="w-4 h-4 text-[#F97316]" />,
      colorClasses: 'bg-white border-[#E5E7EB] text-[#111827]',
      activeClasses: 'ring-2 ring-[#F97316] border-[#F97316] bg-[#FFF7ED]/30',
    },
    {
      status: 'pending',
      label: 'Menunggu',
      count: pendingCount,
      icon: <Clock className="w-4 h-4 text-amber-600" />,
      colorClasses: 'bg-white border-amber-200 text-amber-900',
      activeClasses: 'ring-2 ring-amber-500 border-amber-400 bg-amber-50/50',
    },
    {
      status: 'approved',
      label: 'Disetujui',
      count: approvedCount,
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600" />,
      colorClasses: 'bg-white border-emerald-200 text-emerald-900',
      activeClasses: 'ring-2 ring-emerald-500 border-emerald-400 bg-emerald-50/50',
    },
    {
      status: 'rejected',
      label: 'Ditolak',
      count: rejectedCount,
      icon: <XCircle className="w-4 h-4 text-red-600" />,
      colorClasses: 'bg-white border-red-200 text-red-900',
      activeClasses: 'ring-2 ring-red-500 border-red-400 bg-red-50/50',
    },
    {
      status: 'cancelled',
      label: 'Dibatalkan',
      count: cancelledCount,
      icon: <Ban className="w-4 h-4 text-slate-500" />,
      colorClasses: 'bg-white border-slate-200 text-slate-800',
      activeClasses: 'ring-2 ring-slate-400 border-slate-400 bg-slate-50',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      {items.map((item) => {
        const isSelected = selectedStatus === item.status;
        return (
          <button
            key={item.status}
            type="button"
            onClick={() => onSelectStatus && onSelectStatus(item.status)}
            className={`p-3.5 rounded-2xl border transition-all text-left shadow-2xs ${
              item.colorClasses
            } ${
              isSelected ? item.activeClasses : 'hover:border-[#F97316]/40 hover:shadow-xs'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-[#6B7280]">
                {item.label}
              </span>
              <div className="p-1 rounded-lg bg-[#F9FAFB]">{item.icon}</div>
            </div>
            <div className="text-xl sm:text-2xl font-bold tracking-tight">
              {item.count}
            </div>
          </button>
        );
      })}
    </div>
  );
};
