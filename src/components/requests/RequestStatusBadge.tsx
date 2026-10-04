import React from 'react';
import { RequestStatus, RequestType } from '../../types/request.types';
import { Clock, CheckCircle2, XCircle, Ban, FileText, Stethoscope, Briefcase, HelpCircle } from 'lucide-react';

interface RequestStatusBadgeProps {
  status: RequestStatus;
  size?: 'sm' | 'md';
}

export const RequestStatusBadge: React.FC<RequestStatusBadgeProps> = ({
  status,
  size = 'md',
}) => {
  const sizeClasses =
    size === 'sm' ? 'px-2 py-0.5 text-[11px]' : 'px-2.5 py-1 text-xs';

  switch (status) {
    case 'pending':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-semibold rounded-full bg-amber-50 text-amber-700 border border-amber-200 ${sizeClasses}`}
        >
          <Clock className="w-3 h-3 text-amber-600 shrink-0" />
          Menunggu
        </span>
      );
    case 'approved':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 ${sizeClasses}`}
        >
          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
          Disetujui
        </span>
      );
    case 'rejected':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-semibold rounded-full bg-red-50 text-red-700 border border-red-200 ${sizeClasses}`}
        >
          <XCircle className="w-3 h-3 text-red-600 shrink-0" />
          Ditolak
        </span>
      );
    case 'cancelled':
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-semibold rounded-full bg-slate-100 text-slate-600 border border-slate-200 ${sizeClasses}`}
        >
          <Ban className="w-3 h-3 text-slate-500 shrink-0" />
          Dibatalkan
        </span>
      );
    default:
      return (
        <span
          className={`inline-flex items-center gap-1.5 font-medium rounded-full bg-gray-100 text-gray-600 ${sizeClasses}`}
        >
          {status}
        </span>
      );
  }
};

export const getRequestTypeLabel = (type: RequestType): string => {
  switch (type) {
    case 'leave':
      return 'Cuti';
    case 'sick':
      return 'Sakit';
    case 'official_duty':
      return 'Dinas';
    case 'other':
      return 'Lainnya';
    default:
      return type;
  }
};

export const RequestTypeBadge: React.FC<{ type: RequestType }> = ({ type }) => {
  const label = getRequestTypeLabel(type);

  let icon = <FileText className="w-3.5 h-3.5 text-[#F97316]" />;
  let colorClasses = 'bg-orange-50 text-[#EA580C] border-orange-200';

  if (type === 'sick') {
    icon = <Stethoscope className="w-3.5 h-3.5 text-blue-600" />;
    colorClasses = 'bg-blue-50 text-blue-700 border-blue-200';
  } else if (type === 'official_duty') {
    icon = <Briefcase className="w-3.5 h-3.5 text-purple-600" />;
    colorClasses = 'bg-purple-50 text-purple-700 border-purple-200';
  } else if (type === 'other') {
    icon = <HelpCircle className="w-3.5 h-3.5 text-gray-600" />;
    colorClasses = 'bg-gray-50 text-gray-700 border-gray-200';
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs font-semibold ${colorClasses}`}
    >
      {icon}
      {label}
    </span>
  );
};
