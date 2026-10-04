import React, { useState, useEffect } from 'react';
import {
  X,
  Calendar,
  Clock,
  AlertCircle,
  Ban,
  User,
  MessageSquare,
  Hourglass,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import {
  RequestRow,
  RequestWithRelations,
  RequestDetailModel,
  formatRequestDate,
  formatRequestDateTime,
  formatRequestDuration,
  normalizeRequestDetail,
} from '../../types/request.types';
import { RequestStatusBadge, RequestTypeBadge } from './RequestStatusBadge';
import { requestService, formatRequestError } from '../../services/requestService';
import { Button } from '../ui/Button';

interface RequestDetailModalProps {
  request: RequestRow | RequestWithRelations | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccessCancel: () => void;
}

export const RequestDetailModal: React.FC<RequestDetailModalProps> = ({
  request,
  isOpen,
  onClose,
  onSuccessCancel,
}) => {
  const [detail, setDetail] = useState<RequestDetailModel | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
  const [cancelling, setCancelling] = useState<boolean>(false);
  const [confirmCancel, setConfirmCancel] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Fetch full detail when modal opens
  useEffect(() => {
    if (!isOpen || !request) {
      setDetail(null);
      setConfirmCancel(false);
      setErrorMsg(null);
      return;
    }

    // Set immediate fallback from selected item
    setDetail(normalizeRequestDetail(request));

    // Fetch fresh normalized detail from backend
    let isMounted = true;
    setLoadingDetail(true);

    requestService
      .getMyRequestDetail(request.id)
      .then((fresh) => {
        if (isMounted && fresh) {
          setDetail(fresh);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch my request detail:', err);
        if (isMounted) {
          setErrorMsg(formatRequestError(err));
        }
      })
      .finally(() => {
        if (isMounted) {
          setLoadingDetail(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, request]);

  if (!isOpen || !request) return null;

  const currentStatus = detail?.status || request.status;
  const startDate = detail?.start_date || request.start_date;
  const endDate = detail?.end_date || request.end_date;
  const requestType = detail?.request_type || request.request_type;
  const submittedAt = detail?.submitted_at || request.submitted_at;
  const reason = detail?.reason || request.reason;

  const handleCancelRequest = async () => {
    setErrorMsg(null);
    setCancelling(true);

    try {
      await requestService.cancelMyRequest(request.id);
      setConfirmCancel(false);
      onSuccessCancel();
      onClose();
    } catch (err: any) {
      console.error('Failed to cancel request:', err);
      setErrorMsg(formatRequestError(err));
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-[#E5E7EB] flex items-center justify-between bg-[#F9FAFB]">
          <div className="flex items-center gap-3">
            <RequestTypeBadge type={requestType} />
            <RequestStatusBadge status={currentStatus} />
          </div>
          <button
            onClick={() => {
              setConfirmCancel(false);
              setErrorMsg(null);
              onClose();
            }}
            disabled={cancelling}
            className="text-[#9CA3AF] hover:text-[#111827] p-1.5 rounded-lg hover:bg-[#F3F4F6] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">{errorMsg}</div>
            </div>
          )}

          {/* Loading indicator for fresh detail */}
          {loadingDetail && (
            <div className="text-[11px] text-[#9CA3AF] flex items-center gap-1.5 bg-[#F9FAFB] p-2 rounded-lg">
              <Hourglass className="w-3.5 h-3.5 text-[#F97316] animate-spin" />
              <span>Memperbarui rincian permohonan...</span>
            </div>
          )}

          {/* Rentang Tanggal & Durasi */}
          <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between font-semibold text-[#111827]">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#F97316]" />
                <span>Periode Permohonan</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FFF7ED] text-[#EA580C] border border-[#F97316]/30">
                {formatRequestDuration(startDate, endDate)}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[#4B5563] pt-2 border-t border-[#E5E7EB]">
              <div>
                <span className="text-[#9CA3AF] block text-[11px]">Tanggal Mulai</span>
                <span className="font-bold text-[#111827]">
                  {formatRequestDate(startDate)}
                </span>
              </div>
              <div>
                <span className="text-[#9CA3AF] block text-[11px]">Tanggal Selesai</span>
                <span className="font-bold text-[#111827]">
                  {formatRequestDate(endDate)}
                </span>
              </div>
            </div>
          </div>

          {/* Tanggal Pengajuan */}
          <div className="text-xs text-[#6B7280] flex items-center gap-2 bg-[#F9FAFB] p-2.5 rounded-xl border border-[#E5E7EB]">
            <Clock className="w-3.5 h-3.5 text-[#9CA3AF] shrink-0" />
            <span>
              Diajukan pada: <strong className="text-[#111827]">{formatRequestDateTime(submittedAt)}</strong>
            </span>
          </div>

          {/* Alasan */}
          <div>
            <span className="block text-xs font-semibold text-[#111827] mb-1">
              Alasan Permohonan:
            </span>
            <div className="p-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] text-xs text-[#374151] leading-relaxed whitespace-pre-wrap">
              {reason || '—'}
            </div>
          </div>

          {/* Bagian Status Review */}
          <div className="space-y-1.5">
            <span className="block text-xs font-semibold text-[#111827]">
              Informasi Peninjauan:
            </span>

            {currentStatus === 'pending' ? (
              <div className="p-3.5 rounded-xl bg-amber-50/60 border border-amber-200 text-xs text-amber-900 flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Menunggu review</span>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Permohonan sedang menunggu tinjauan dan keputusan dari pimpinan sekolah atau administrator.
                  </p>
                </div>
              </div>
            ) : currentStatus === 'cancelled' ? (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 flex items-start gap-2.5">
                <Ban className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block">Permohonan Dibatalkan</span>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Pengajuan ini telah dibatalkan oleh pemohon.
                  </p>
                </div>
              </div>
            ) : (
              /* Approved / Rejected */
              <div
                className={`p-3.5 rounded-xl border space-y-2 text-xs ${
                  currentStatus === 'approved'
                    ? 'bg-emerald-50/50 border-emerald-200 text-emerald-950'
                    : 'bg-red-50/50 border-red-200 text-red-950'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1.5">
                    {currentStatus === 'approved' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                    {currentStatus === 'approved'
                      ? 'Permohonan Disetujui'
                      : 'Permohonan Ditolak'}
                  </span>
                  <span className="text-[11px] text-[#6B7280]">
                    {formatRequestDateTime(detail?.reviewed_at || request.reviewed_at)}
                  </span>
                </div>

                {detail?.reviewer?.full_name && (
                  <div className="flex items-center gap-1.5 text-[11px] text-[#4B5563]">
                    <User className="w-3.5 h-3.5 text-[#6B7280]" />
                    <span>
                      Ditinjau oleh:{' '}
                      <strong className="text-[#111827]">
                        {detail.reviewer.full_name}
                      </strong>
                    </span>
                  </div>
                )}

                <div className="pt-1 border-t border-black/5">
                  <span className="text-[11px] font-semibold text-[#6B7280] block mb-0.5 flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    Catatan Peninjau:
                  </span>
                  <p className="italic text-[#374151]">
                    "{detail?.reviewer_note || request.reviewer_note || 'Tidak ada catatan tambahan.'}"
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Konfirmasi Pembatalan */}
          {confirmCancel && currentStatus === 'pending' && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs space-y-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-950">Batalkan Permohonan ini?</p>
                  <p className="text-amber-800 mt-0.5">
                    Permohonan yang telah dibatalkan tidak dapat dikembalikan ke status pending.
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setConfirmCancel(false)}
                  disabled={cancelling}
                  className="text-xs"
                >
                  Kembali
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleCancelRequest}
                  disabled={cancelling}
                  className="text-xs bg-red-600 hover:bg-red-700 text-white font-semibold"
                >
                  {cancelling ? 'Membatalkan...' : 'Ya, Batalkan Permohonan'}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#E5E7EB] bg-[#F9FAFB] flex items-center justify-between">
          <div>
            {currentStatus === 'pending' && !confirmCancel && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setConfirmCancel(true)}
                disabled={cancelling}
                className="text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 font-semibold"
              >
                <Ban className="w-3.5 h-3.5 mr-1.5" />
                Batalkan Permohonan
              </Button>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setConfirmCancel(false);
              setErrorMsg(null);
              onClose();
            }}
            disabled={cancelling}
            className="text-xs"
          >
            Tutup
          </Button>
        </div>
      </div>
    </div>
  );
};
