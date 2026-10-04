import React, { useState } from 'react';
import {
  X,
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  User,
  Building,
  Briefcase,
  FileText,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';
import { RequestWithRelations } from '../../types/request.types';
import { RequestStatusBadge, RequestTypeBadge } from './RequestStatusBadge';
import { requestService } from '../../services/requestService';
import { Button } from '../ui/Button';

interface ReviewRequestModalProps {
  request: RequestWithRelations | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccessReview: () => void;
}

export const ReviewRequestModal: React.FC<ReviewRequestModalProps> = ({
  request,
  isOpen,
  onClose,
  onSuccessReview,
}) => {
  const [actionType, setActionType] = useState<'idle' | 'confirm_approve' | 'confirm_reject'>('idle');
  const [reviewerNote, setReviewerNote] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
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

  const handleApprove = async () => {
    setErrorMsg(null);
    setSubmitting(true);

    try {
      await requestService.approveRequest(request.id, reviewerNote.trim() || undefined);
      setActionType('idle');
      setReviewerNote('');
      onSuccessReview();
      onClose();
    } catch (err: any) {
      console.error('Failed to approve request:', err);
      const msg = err?.message || '';
      if (msg.includes('status pending') || msg.includes('tidak ditemukan')) {
        setErrorMsg('Permohonan ini sudah diproses oleh pengguna lain.');
      } else {
        setErrorMsg(msg || 'Gagal menyetujui permohonan. Silakan coba lagi.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    setErrorMsg(null);

    const trimmedNote = reviewerNote.trim();
    if (!trimmedNote) {
      setErrorMsg('Catatan penolakan wajib diisi.');
      return;
    }

    setSubmitting(true);

    try {
      await requestService.rejectRequest(request.id, trimmedNote);
      setActionType('idle');
      setReviewerNote('');
      onSuccessReview();
      onClose();
    } catch (err: any) {
      console.error('Failed to reject request:', err);
      const msg = err?.message || '';
      if (msg.includes('status pending') || msg.includes('tidak ditemukan')) {
        setErrorMsg('Permohonan ini sudah diproses oleh pengguna lain.');
      } else {
        setErrorMsg(msg || 'Gagal menolak permohonan. Silakan coba lagi.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const resetAction = () => {
    setActionType('idle');
    setReviewerNote('');
    setErrorMsg(null);
  };

  const employee = request.employees;
  const reviewerProfile = request.reviewer_profile;
  const isPending = request.status === 'pending';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl shadow-xl w-full max-w-xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-[#E5E7EB] flex items-center justify-between bg-[#F9FAFB]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-100 text-[#F97316] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#111827]">
                Tinjau Permohonan Pegawai
              </h3>
              <p className="text-xs text-[#6B7280]">
                Rincian pengajuan dan pengambilan keputusan permohonan
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              resetAction();
              onClose();
            }}
            disabled={submitting}
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
              <div className="flex-1 font-medium">{errorMsg}</div>
            </div>
          )}

          {/* Section 1: Identitas Pegawai */}
          <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-[#F97316]" />
                Identitas Pegawai
              </span>
              <div className="flex items-center gap-2">
                <RequestTypeBadge type={request.request_type} />
                <RequestStatusBadge status={request.status} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1 border-t border-[#E5E7EB]">
              <div>
                <span className="text-[#9CA3AF] block text-[11px]">Nama Lengkap</span>
                <span className="font-bold text-[#111827] text-sm">
                  {employee?.full_name || '—'}
                </span>
              </div>
              <div>
                <span className="text-[#9CA3AF] block text-[11px]">NIP</span>
                <span className="font-semibold text-[#374151]">
                  {employee?.nip || '—'}
                </span>
              </div>
              <div>
                <span className="text-[#9CA3AF] block text-[11px] flex items-center gap-1">
                  <Building className="w-3 h-3 text-[#9CA3AF]" />
                  Departemen
                </span>
                <span className="font-medium text-[#374151]">
                  {employee?.departments?.name || '—'}
                </span>
              </div>
              <div>
                <span className="text-[#9CA3AF] block text-[11px] flex items-center gap-1">
                  <Briefcase className="w-3 h-3 text-[#9CA3AF]" />
                  Jabatan
                </span>
                <span className="font-medium text-[#374151]">
                  {employee?.positions?.name || '—'}
                </span>
              </div>
            </div>
          </div>

          {/* Section 2: Detail Permohonan */}
          <div className="border border-[#E5E7EB] rounded-xl p-4 space-y-3">
            <span className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-[#F97316]" />
              Rincian Pengajuan
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-[#F9FAFB] p-3 rounded-xl border border-[#E5E7EB]">
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

            <div>
              <span className="block text-xs font-semibold text-[#111827] mb-1">
                Alasan Permohonan:
              </span>
              <div className="p-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] text-xs text-[#374151] leading-relaxed whitespace-pre-wrap">
                {request.reason}
              </div>
            </div>

            <div className="text-[11px] text-[#9CA3AF] flex items-center gap-1.5 pt-1">
              <Clock className="w-3.5 h-3.5 text-[#9CA3AF]" />
              <span>Diajukan pada: <strong className="text-[#374151]">{formatDateTime(request.submitted_at)}</strong></span>
            </div>
          </div>

          {/* Section 3: Review Info (Jika sudah pernah direview) */}
          {!isPending && request.status !== 'cancelled' && (
            <div className="p-4 rounded-xl bg-orange-50/60 border border-orange-200 space-y-2 text-xs">
              <div className="flex items-center justify-between text-[#111827] font-semibold">
                <span className="flex items-center gap-1.5 text-[#EA580C]">
                  <MessageSquare className="w-4 h-4" />
                  Informasi Hasil Peninjauan
                </span>
                <span className="text-[11px] text-[#9CA3AF]">
                  {formatDateTime(request.reviewed_at)}
                </span>
              </div>

              {reviewerProfile && (
                <div className="flex items-center gap-1.5 text-[11px] text-[#6B7280]">
                  <User className="w-3.5 h-3.5 text-[#9CA3AF]" />
                  <span>Ditinjau oleh: <strong className="text-[#111827]">{reviewerProfile.full_name || 'Peninjau'}</strong></span>
                </div>
              )}

              <div className="pt-1">
                <span className="text-[#6B7280] block text-[11px] mb-0.5">Catatan Peninjau:</span>
                <p className="text-[#374151] bg-[#FFFFFF] p-2.5 rounded-lg border border-orange-200/70 italic text-xs leading-relaxed">
                  "{request.reviewer_note || 'Tidak ada catatan tambahan.'}"
                </p>
              </div>
            </div>
          )}

          {/* Cancelled State notice */}
          {request.status === 'cancelled' && (
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Permohonan ini telah dibatalkan oleh pegawai bersangkutan.</span>
            </div>
          )}

          {/* Section 4: Action Forms (Only for Pending) */}
          {isPending && actionType === 'confirm_approve' && (
            <div className="p-4 rounded-xl bg-emerald-50/80 border border-emerald-300 space-y-3 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-emerald-950">
                    Setujui Permohonan Pegawai?
                  </h4>
                  <p className="text-[11px] text-emerald-800 mt-0.5">
                    Apakah Anda yakin ingin menyetujui permohonan ini? Tindakan ini akan mengubah status permohonan menjadi Disetujui.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-emerald-950 mb-1">
                  Catatan Penyetuju (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={reviewerNote}
                  onChange={(e) => setReviewerNote(e.target.value)}
                  placeholder="Tambahkan catatan jika diperlukan..."
                  disabled={submitting}
                  className="w-full p-2.5 rounded-lg border border-emerald-200 text-xs text-[#111827] focus:outline-hidden focus:border-emerald-500 bg-[#FFFFFF] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={resetAction}
                  disabled={submitting}
                  className="text-xs"
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleApprove}
                  disabled={submitting}
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold min-w-[120px]"
                >
                  {submitting ? 'Memproses...' : 'Ya, Setujui'}
                </Button>
              </div>
            </div>
          )}

          {isPending && actionType === 'confirm_reject' && (
            <div className="p-4 rounded-xl bg-red-50/80 border border-red-300 space-y-3 animate-in fade-in">
              <div className="flex items-start gap-2.5">
                <XCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-red-950">
                    Tolak Permohonan Pegawai
                  </h4>
                  <p className="text-[11px] text-red-800 mt-0.5">
                    Harap masukkan alasan atau catatan penolakan untuk disampaikan kepada pegawai.
                  </p>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-red-950 mb-1">
                  Catatan Penolakan <span className="text-red-500">* (Wajib diisi)</span>
                </label>
                <textarea
                  rows={3}
                  value={reviewerNote}
                  onChange={(e) => setReviewerNote(e.target.value)}
                  placeholder="Tuliskan alasan penolakan secara jelas..."
                  disabled={submitting}
                  required
                  className="w-full p-2.5 rounded-lg border border-red-300 text-xs text-[#111827] focus:outline-hidden focus:border-red-500 bg-[#FFFFFF] resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={resetAction}
                  disabled={submitting}
                  className="text-xs"
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={handleReject}
                  disabled={submitting || !reviewerNote.trim()}
                  className="text-xs bg-red-600 hover:bg-red-700 text-white font-semibold min-w-[120px]"
                >
                  {submitting ? 'Memproses...' : 'Tolak Permohonan'}
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-[#E5E7EB] bg-[#F9FAFB] flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isPending && actionType === 'idle' && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setErrorMsg(null);
                    setReviewerNote('');
                    setActionType('confirm_reject');
                  }}
                  disabled={submitting}
                  className="text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 font-semibold"
                >
                  <XCircle className="w-3.5 h-3.5 mr-1.5" />
                  Tolak
                </Button>

                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setErrorMsg(null);
                    setReviewerNote('');
                    setActionType('confirm_approve');
                  }}
                  disabled={submitting}
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
                  Setujui
                </Button>
              </>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              resetAction();
              onClose();
            }}
            disabled={submitting}
            className="text-xs"
          >
            Tutup
          </Button>
        </div>
      </div>
    </div>
  );
};
