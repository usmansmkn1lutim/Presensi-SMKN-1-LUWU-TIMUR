import React, { useState } from 'react';
import { X, Calendar, Clock, AlertCircle, Ban, User, MessageSquare } from 'lucide-react';
import { RequestRow, RequestWithRelations } from '../../types/request.types';
import { RequestStatusBadge, RequestTypeBadge } from './RequestStatusBadge';
import { requestService } from '../../services/requestService';
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
  const [cancelling, setCancelling] = useState<boolean>(false);
  const [confirmCancel, setConfirmCancel] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen || !request) return null;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

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
      setErrorMsg(
        err?.message || 'Gagal membatalkan permohonan. Silakan coba lagi.'
      );
    } finally {
      setCancelling(false);
    }
  };

  const reviewerProfile = (request as RequestWithRelations)?.reviewer_profile;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-[#E5E7EB] flex items-center justify-between bg-[#F9FAFB]">
          <div className="flex items-center gap-3">
            <RequestTypeBadge type={request.request_type} />
            <RequestStatusBadge status={request.status} />
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

          {/* Rentang Tanggal */}
          <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-3.5 space-y-2 text-xs">
            <div className="flex items-center gap-2 font-semibold text-[#111827]">
              <Calendar className="w-4 h-4 text-[#F97316]" />
              <span>Periode Permohonan</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[#4B5563] pt-1 border-t border-[#E5E7EB]">
              <div>
                <span className="text-[#9CA3AF] block text-[11px]">Tanggal Mulai</span>
                <span className="font-bold text-[#111827]">
                  {formatDate(request.start_date)}
                </span>
              </div>
              <div>
                <span className="text-[#9CA3AF] block text-[11px]">Tanggal Selesai</span>
                <span className="font-bold text-[#111827]">
                  {formatDate(request.end_date)}
                </span>
              </div>
            </div>
          </div>

          {/* Tanggal Pengajuan */}
          <div className="text-xs text-[#6B7280] flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-[#9CA3AF]" />
            <span>Diajukan pada: <strong className="text-[#111827]">{formatDateTime(request.submitted_at)}</strong></span>
          </div>

          {/* Alasan */}
          <div>
            <span className="block text-xs font-semibold text-[#111827] mb-1">
              Alasan Permohonan:
            </span>
            <div className="p-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] text-xs text-[#374151] leading-relaxed whitespace-pre-wrap">
              {request.reason}
            </div>
          </div>

          {/* Catatan Reviewer (Jika sudah direview) */}
          {request.status !== 'pending' && request.status !== 'cancelled' && (
            <div className="p-3.5 rounded-xl bg-orange-50/60 border border-orange-200 space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-[#111827] font-semibold">
                <span className="flex items-center gap-1.5 text-[#EA580C]">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Catatan Peninjau
                </span>
                <span className="text-[11px] text-[#9CA3AF]">
                  {formatDateTime(request.reviewed_at)}
                </span>
              </div>

              {reviewerProfile && (
                <div className="flex items-center gap-1.5 text-[11px] text-[#6B7280]">
                  <User className="w-3 h-3 text-[#9CA3AF]" />
                  <span>Ditinjau oleh: <strong className="text-[#111827]">{reviewerProfile.full_name || 'Peninjau'}</strong></span>
                </div>
              )}

              <p className="text-[#374151] pt-1 italic">
                "{request.reviewer_note || 'Tidak ada catatan tambahan.'}"
              </p>
            </div>
          )}

          {/* Confirmation Step for Cancellation */}
          {confirmCancel && request.status === 'pending' && (
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
            {request.status === 'pending' && !confirmCancel && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setConfirmCancel(true)}
                disabled={cancelling}
                className="text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
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
