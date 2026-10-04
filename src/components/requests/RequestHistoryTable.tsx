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

interface RequestHistoryTableProps {
  requests: (RequestRow | RequestWithRelations)[];
  mode?: 'employee' | 'reviewer';
  onSelect: (request: RequestRow | RequestWithRelations) => void;
}

export const RequestHistoryTable: React.FC<RequestHistoryTableProps> = ({
  requests,
  mode = 'employee',
  onSelect,
}) => {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB] text-[11px] font-bold text-[#6B7280] uppercase tracking-wider">
            {mode === 'reviewer' && (
              <th scope="col" className="py-3 px-4">
                Pegawai
              </th>
            )}
            <th scope="col" className="py-3 px-4">
              Jenis
            </th>
            <th scope="col" className="py-3 px-4">
              Periode
            </th>
            <th scope="col" className="py-3 px-4">
              Durasi
            </th>
            <th scope="col" className="py-3 px-4">
              Status
            </th>
            <th scope="col" className="py-3 px-4">
              Diajukan
            </th>
            {mode === 'employee' && (
              <th scope="col" className="py-3 px-4">
                Status Review
              </th>
            )}
            <th scope="col" className="py-3 px-4 text-right">
              Aksi
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#E5E7EB] text-xs">
          {requests.map((req) => {
            const relReq = req as RequestWithRelations;
            const durationText = formatRequestDuration(req.start_date, req.end_date);

            return (
              <tr
                key={req.id}
                onClick={() => onSelect(req)}
                className="hover:bg-[#FFF7ED]/30 transition-colors cursor-pointer group"
              >
                {/* Pegawai (Reviewer only) */}
                {mode === 'reviewer' && (
                  <td className="py-3.5 px-4 font-semibold text-[#111827]">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-[#F3F4F6] text-[#6B7280] flex items-center justify-center shrink-0">
                        <User className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-[#111827] truncate">
                          {relReq.employees?.full_name || '—'}
                        </div>
                        <div className="text-[11px] text-[#6B7280] flex items-center gap-1.5">
                          <span>NIP: {relReq.employees?.nip || '—'}</span>
                          {relReq.employees?.departments?.name && (
                            <>
                              <span>•</span>
                              <span>{relReq.employees.departments.name}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                )}

                {/* Jenis Pengajuan */}
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <RequestTypeBadge type={req.request_type} />
                </td>

                {/* Periode */}
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <div className="flex items-center gap-1.5 font-semibold text-[#111827]">
                    <Calendar className="w-3.5 h-3.5 text-[#F97316] shrink-0" />
                    <span>{formatRequestDateRange(req.start_date, req.end_date)}</span>
                  </div>
                </td>

                {/* Durasi */}
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#F3F4F6] text-[#374151] border border-[#E5E7EB]">
                    {durationText}
                  </span>
                </td>

                {/* Status */}
                <td className="py-3.5 px-4 whitespace-nowrap">
                  <RequestStatusBadge status={req.status} size="sm" />
                </td>

                {/* Diajukan */}
                <td className="py-3.5 px-4 whitespace-nowrap text-[#6B7280]">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-[#9CA3AF]" />
                    <span>{formatRequestDateTime(req.submitted_at)}</span>
                  </div>
                </td>

                {/* Status Review (Employee mode) */}
                {mode === 'employee' && (
                  <td className="py-3.5 px-4 text-[#6B7280] max-w-[180px] truncate">
                    {req.status === 'pending' ? (
                      <span className="text-amber-700 italic text-[11px]">
                        Menunggu review
                      </span>
                    ) : req.status === 'cancelled' ? (
                      <span className="text-slate-500 italic text-[11px]">
                        Dibatalkan oleh pemohon
                      </span>
                    ) : req.reviewed_at ? (
                      <div className="text-[11px]">
                        <span className="font-semibold text-[#111827]">
                          {req.status === 'approved' ? 'Disetujui' : 'Ditolak'}
                        </span>
                        {relReq.reviewer_profile?.full_name && (
                          <span className="text-[#6B7280] block truncate">
                            oleh {relReq.reviewer_profile.full_name}
                          </span>
                        )}
                      </div>
                    ) : (
                      '—'
                    )}
                  </td>
                )}

                {/* Aksi */}
                <td className="py-3.5 px-4 whitespace-nowrap text-right">
                  {mode === 'reviewer' && req.status === 'pending' ? (
                    <span className="text-xs font-bold text-[#F97316] group-hover:text-[#EA580C] inline-flex items-center gap-0.5">
                      Tinjau
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-[#6B7280] group-hover:text-[#F97316] inline-flex items-center gap-0.5">
                      Rincian
                      <ChevronRight className="w-3.5 h-3.5" />
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
