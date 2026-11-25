import React from 'react';
import { Calendar, Clock, ChevronRight } from 'lucide-react';
import {
  RequestRow,
  RequestWithRelations,
  formatRequestDateRange,
  formatRequestDateTime,
  formatRequestDuration,
} from '../../types/request.types';
import { RequestStatusBadge, RequestTypeBadge } from './RequestStatusBadge';
import { UserAvatar } from '../ui/UserAvatar';

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
    <div className="space-y-3 font-sans">
      {requests.map((req) => {
        const relReq = req as RequestWithRelations;
        const durationText = formatRequestDuration(req.start_date, req.end_date);

        return (
          <div
            key={req.id}
            onClick={() => onSelect(req)}
            className="bg-white dark:bg-[#262626] border border-[#E5E7EB] dark:border-[#404040] rounded-2xl p-4 shadow-2xs hover:border-[#F97316]/40 dark:hover:border-[#F97316]/60 transition-all cursor-pointer space-y-3 group"
          >
            {/* Header: Identity & Status Badge */}
            <div className="flex items-start justify-between gap-3">
              {mode === 'reviewer' ? (
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <UserAvatar
                    photoUrl={relReq.employees?.photo_url}
                    name={relReq.employees?.full_name}
                    className="w-10 h-10 rounded-full object-cover border border-[#E5E7EB] dark:border-[#404040] shrink-0"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-[#111827] dark:text-[#F9FAFB] text-sm truncate">
                      {relReq.employees?.full_name || '—'}
                    </div>
                    {relReq.employees?.positions?.name && (
                      <span className="text-xs text-[#6B7280] dark:text-[#A3A3A3] block truncate mt-0.5">
                        {relReq.employees.positions.name}
                      </span>
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

            {/* Row 1: Request Type Badge (for reviewer mode) */}
            {mode === 'reviewer' && (
              <div>
                <RequestTypeBadge type={req.request_type} />
              </div>
            )}

            {/* Row 2: Date Range & Duration Badge */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <div className="font-semibold text-[#111827] dark:text-[#F9FAFB] flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#F97316] shrink-0" />
                <span>{formatRequestDateRange(req.start_date, req.end_date)}</span>
              </div>
              <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#F3F4F6] dark:bg-[#303030] text-[#374151] dark:text-[#D4D4D4] border border-[#E5E7EB] dark:border-[#404040]">
                {durationText}
              </span>
            </div>

            {/* Row 3: Reason / Notes */}
            {req.reason && (
              <p className="text-xs text-[#4B5563] dark:text-[#D4D4D4] line-clamp-2 leading-relaxed italic">
                "{req.reason}"
              </p>
            )}

            {/* Footer: Submission Date & Action */}
            <div className="flex items-center justify-between text-[11px] text-[#9CA3AF] dark:text-[#A3A3A3] pt-2 border-t border-[#F3F4F6] dark:border-[#404040]">
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#9CA3AF] dark:text-[#A3A3A3]" />
                Diajukan {formatRequestDateTime(req.submitted_at)}
              </span>

              {mode === 'reviewer' && req.status === 'pending' ? (
                <span className="text-xs font-bold text-[#F97316] group-hover:text-[#EA580C] dark:group-hover:text-[#FB923C] flex items-center gap-0.5">
                  Tinjau <ChevronRight className="w-3.5 h-3.5" />
                </span>
              ) : (
                <span className="text-xs font-semibold text-[#6B7280] dark:text-[#A3A3A3] group-hover:text-[#111827] dark:group-hover:text-[#F9FAFB] flex items-center gap-0.5">
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
