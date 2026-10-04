import React from 'react';
import { Calendar, Clock, ChevronRight, User } from 'lucide-react';
import {
  RequestRow,
  RequestWithRelations,
  formatRequestDateRange,
  formatRequestDateTime,
  formatRequestDuration,
} from '../../types/request.types';
import { RequestStatusBadge, RequestTypeBadge } from './RequestStatusBadge';

interface RequestHistoryCardProps {
  requests: (RequestRow | RequestWithRelations)[];
  mode?: 'employee' | 'reviewer';
  onSelect: (request: RequestRow | RequestWithRelations) => void;
}

export const RequestHistoryCard: React.FC<RequestHistoryCardProps> = ({
  requests,
  mode = 'employee',
  onSelect,
}) => {
  return (
    <div className="divide-y divide-[#E5E7EB]">
      {requests.map((req) => {
        const relReq = req as RequestWithRelations;
        const durationText = formatRequestDuration(req.start_date, req.end_date);

        return (
          <div
            key={req.id}
            onClick={() => onSelect(req)}
            className="p-4 hover:bg-[#FFF7ED]/20 transition-colors cursor-pointer space-y-3"
          >
            {/* Header: Pegawai / Status */}
            <div className="flex items-start justify-between gap-2">
              {mode === 'reviewer' ? (
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-[#111827] text-sm flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-[#F97316] shrink-0" />
                    <span className="truncate">{relReq.employees?.full_name || '—'}</span>
                  </div>
                  <div className="text-xs text-[#6B7280] flex items-center gap-1.5 mt-0.5">
                    <span>NIP: {relReq.employees?.nip || '—'}</span>
                    {relReq.employees?.departments?.name && (
                      <>
                        <span>•</span>
                        <span className="truncate">{relReq.employees.departments.name}</span>
                      </>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <RequestTypeBadge type={req.request_type} />
                </div>
              )}

              <RequestStatusBadge status={req.status} size="sm" />
            </div>

            {/* Sub-header for employee: Type & Period */}
            <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#F3F4F6]">
              {mode === 'reviewer' && <RequestTypeBadge type={req.request_type} />}
              <div className="text-xs font-semibold text-[#111827] flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-[#F97316] shrink-0" />
                <span>{formatRequestDateRange(req.start_date, req.end_date)}</span>
              </div>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#F3F4F6] text-[#374151] border border-[#E5E7EB]">
                {durationText}
              </span>
            </div>

            {/* Reason */}
            {req.reason && (
              <p className="text-xs text-[#4B5563] line-clamp-2 italic">
                "{req.reason}"
              </p>
            )}

            {/* Footer with date & action */}
            <div className="flex items-center justify-between text-[11px] text-[#9CA3AF] pt-1 border-t border-[#F3F4F6]">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#9CA3AF]" />
                Diajukan {formatRequestDateTime(req.submitted_at)}
              </span>

              {mode === 'reviewer' && req.status === 'pending' ? (
                <span className="text-xs font-bold text-[#F97316] flex items-center gap-0.5">
                  Tinjau <ChevronRight className="w-3.5 h-3.5" />
                </span>
              ) : (
                <span className="text-xs font-semibold text-[#6B7280] flex items-center gap-0.5">
                  Rincian <ChevronRight className="w-3.5 h-3.5" />
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
