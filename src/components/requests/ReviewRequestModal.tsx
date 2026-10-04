import React, { useState, useEffect, useCallback } from 'react';
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
  Hourglass,
  IdCard,
  CreditCard,
  Hash,
  Users,
  Ban,
  Check,
} from 'lucide-react';
import {
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
  const [detail, setDetail] = useState<RequestDetailModel | null>(null);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
  const [actionType, setActionType] = useState<'idle' | 'confirm_approve' | 'confirm_reject'>('idle');
  const [reviewerNote, setReviewerNote] = useState<string>('');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const resetAction = useCallback(() => {
    setActionType('idle');
    setReviewerNote('');
    setErrorMsg(null);
  }, []);

  // Fetch full normalized detail on open
  useEffect(() => {
    if (!isOpen || !request) {
      setDetail(null);
      resetAction();
      return;
    }

    setDetail(normalizeRequestDetail(request));

    let isMounted = true;
    setLoadingDetail(true);

    requestService
      .getRequestDetail(request.id)
      .then((fresh) => {
        if (isMounted && fresh) {
          setDetail(fresh);
        }
      })
      .catch((err) => {
        console.error('Failed to fetch request detail for reviewer:', err);
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
  }, [isOpen, request, resetAction]);

  // Keyboard navigation: Escape key closes modal or cancels active confirmation
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (actionType !== 'idle') {
          resetAction();
        } else if (!submitting) {
          onClose();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, actionType, submitting, onClose, resetAction]);

  if (!isOpen || !request) return null;

  const currentStatus = detail?.status || request.status;
  const startDate = detail?.start_date || request.start_date;
  const endDate = detail?.end_date || request.end_date;
  const requestType = detail?.request_type || request.request_type;
  const submittedAt = detail?.submitted_at || request.submitted_at;
  const reason = detail?.reason || request.reason;
  const isPending = currentStatus === 'pending';

  // Employee Identity Data (Safe null handling, never null/undefined in UI)
  const employee = detail?.employee;
  const fallbackEmployee = request.employees;
  const employeeName = employee?.full_name || fallbackEmployee?.full_name || '—';
  const employeeNip = employee?.nip || fallbackEmployee?.nip || null;
  const employeeNik = employee?.nik || (fallbackEmployee as any)?.nik || null;
  const employeeNumber = employee?.employee_number || (fallbackEmployee as any)?.employee_number || null;
  const employeeGender = employee?.gender || (fallbackEmployee as any)?.gender || null;
  const employeePhoto = employee?.photo_url || (fallbackEmployee as any)?.photo_url || null;
  const employeeStatus = employee?.status || (fallbackEmployee as any)?.status || null;
  const departmentName = employee?.department_name || fallbackEmployee?.departments?.name || null;
  const positionName = employee?.position_name || fallbackEmployee?.positions?.name || null;

  // Reviewer Info Data (Originates strictly from backend reviewed_by profile)
  const reviewer = detail?.reviewer;
  const reviewerName = reviewer?.full_name || request.reviewer_profile?.full_name || 'Peninjau';
  const reviewedAt = detail?.reviewed_at || request.reviewed_at;
  const savedReviewerNote = detail?.reviewer_note || request.reviewer_note;

  // Gender label formatter
  const formatGender = (gender: string | null) => {
    if (!gender) return '—';
    if (gender === 'male' || gender === 'L' || gender === 'laki-laki') return 'Laki-laki';
    if (gender === 'female' || gender === 'P' || gender === 'perempuan') return 'Perempuan';
    return gender;
  };

  // Get initials for avatar fallback
  const getInitials = (name: string) => {
    if (!name || name === '—') return 'P';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  const handleApprove = async () => {
    setErrorMsg(null);
    setSubmitting(true);

    try {
      await requestService.approveRequest(request.id, reviewerNote.trim() || undefined);
      resetAction();
      onSuccessReview();
      onClose();
    } catch (err: any) {
      console.error('Failed to approve request:', err);
      setErrorMsg(formatRequestError(err));
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
      resetAction();
      onSuccessReview();
      onClose();
    } catch (err: any) {
      console.error('Failed to reject request:', err);
      setErrorMsg(formatRequestError(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reviewer-modal-title"
    >
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#E5E7EB] flex items-center justify-between bg-[#F9FAFB]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FFF7ED] text-[#EA580C] border border-[#F97316]/30 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-[#F97316]" />
            </div>
            <div>
              <h3 id="reviewer-modal-title" className="text-base font-bold text-[#111827]">
                Tinjauan Permohonan Pegawai
              </h3>
              <p className="text-[11px] text-[#6B7280]">
                Rincian lengkap pengajuan, riwayat, dan keputusan peninjau
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              resetAction();
              onClose();
            }}
            disabled={submitting}
            aria-label="Tutup modal"
            className="text-[#9CA3AF] hover:text-[#111827] p-1.5 rounded-lg hover:bg-[#F3F4F6] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">{errorMsg}</div>
            </div>
          )}

          {loadingDetail && (
            <div className="text-[11px] text-[#9CA3AF] flex items-center gap-1.5 bg-[#F9FAFB] p-2 rounded-lg">
              <Hourglass className="w-3.5 h-3.5 text-[#F97316] animate-spin" />
              <span>Memperbarui data pengajuan dari server...</span>
            </div>
          )}

          {/* =================================================================== */}
          {/* SECTION A: IDENTITAS PEGAWAI                                         */}
          {/* =================================================================== */}
          <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-2xl p-4 space-y-3.5 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {employeePhoto ? (
                  <img
                    src={employeePhoto}
                    alt={employeeName}
                    className="w-12 h-12 rounded-xl object-cover border border-[#E5E7EB] shadow-2xs shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-orange-100 text-[#EA580C] border border-orange-200 flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
                    {getInitials(employeeName)}
                  </div>
                )}
                <div>
                  <div className="font-bold text-[#111827] text-sm sm:text-base leading-tight">
                    {employeeName}
                  </div>
                  <div className="text-[11px] text-[#6B7280] flex flex-wrap items-center gap-1.5 mt-0.5">
                    <span>NIP: <strong className="text-[#374151] font-semibold">{employeeNip || '—'}</strong></span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                {employeeStatus && (
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                      employeeStatus === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}
                  >
                    {employeeStatus === 'active' ? 'Pegawai Aktif' : 'Nonaktif'}
                  </span>
                )}
                <RequestStatusBadge status={currentStatus} />
              </div>
            </div>

            {/* Grid detail pegawai */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-3 border-t border-[#E5E7EB] text-[#4B5563]">
              <div className="space-y-0.5">
                <span className="text-[#9CA3AF] text-[10px] block flex items-center gap-1">
                  <IdCard className="w-3 h-3 text-[#9CA3AF]" /> NIK
                </span>
                <span className="font-semibold text-[#111827] text-xs">
                  {employeeNik || '—'}
                </span>
              </div>

              <div className="space-y-0.5">
                <span className="text-[#9CA3AF] text-[10px] block flex items-center gap-1">
                  <Hash className="w-3 h-3 text-[#9CA3AF]" /> No. Pegawai
                </span>
                <span className="font-semibold text-[#111827] text-xs">
                  {employeeNumber || '—'}
                </span>
              </div>

              <div className="space-y-0.5">
                <span className="text-[#9CA3AF] text-[10px] block flex items-center gap-1">
                  <Users className="w-3 h-3 text-[#9CA3AF]" /> Jenis Kelamin
                </span>
                <span className="font-semibold text-[#111827] text-xs">
                  {formatGender(employeeGender)}
                </span>
              </div>

              <div className="space-y-0.5">
                <span className="text-[#9CA3AF] text-[10px] block flex items-center gap-1">
                  <Building className="w-3 h-3 text-[#9CA3AF]" /> Unit / Dept
                </span>
                <span className="font-semibold text-[#111827] text-xs truncate block" title={departmentName || '—'}>
                  {departmentName || '—'}
                </span>
              </div>

              <div className="space-y-0.5 col-span-2 sm:col-span-2">
                <span className="text-[#9CA3AF] text-[10px] block flex items-center gap-1">
                  <Briefcase className="w-3 h-3 text-[#9CA3AF]" /> Jabatan
                </span>
                <span className="font-semibold text-[#111827] text-xs truncate block" title={positionName || '—'}>
                  {positionName || '—'}
                </span>
              </div>
            </div>
          </div>

          {/* =================================================================== */}
          {/* SECTION B: INFORMASI PENGAJUAN                                      */}
          {/* =================================================================== */}
          <div className="border border-[#E5E7EB] rounded-2xl p-4 space-y-3 text-xs bg-white shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#F97316]" />
                <span className="font-bold text-[#111827] text-xs sm:text-sm">
                  Rincian Permohonan
                </span>
              </div>
              <RequestTypeBadge type={requestType} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-2.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] space-y-1">
                <span className="text-[#9CA3AF] text-[11px] block">Tanggal Mulai</span>
                <span className="font-bold text-[#111827] flex items-center gap-1.5 text-xs">
                  <Calendar className="w-3.5 h-3.5 text-[#F97316]" />
                  {formatRequestDate(startDate)}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] space-y-1">
                <span className="text-[#9CA3AF] text-[11px] block">Tanggal Selesai</span>
                <span className="font-bold text-[#111827] flex items-center gap-1.5 text-xs">
                  <Calendar className="w-3.5 h-3.5 text-[#F97316]" />
                  {formatRequestDate(endDate)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-[#F3F4F6] text-[11px]">
              <div className="flex items-center gap-1 text-[#6B7280]">
                <Clock className="w-3.5 h-3.5 text-[#9CA3AF]" />
                <span>Diajukan pada {formatRequestDateTime(submittedAt)}</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FFF7ED] text-[#EA580C] border border-[#F97316]/30">
                Durasi: {formatRequestDuration(startDate, endDate)}
              </span>
            </div>

            <div>
              <span className="block text-[11px] font-semibold text-[#6B7280] mb-1">
                Alasan Pengajuan:
              </span>
              <div className="p-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] text-xs text-[#374151] leading-relaxed whitespace-pre-wrap">
                {reason || '—'}
              </div>
            </div>
          </div>

          {/* =================================================================== */}
          {/* SECTION C: INFORMASI REVIEW & STATUS                                */}
          {/* =================================================================== */}
          <div className="space-y-1.5">
            <span className="block text-xs font-semibold text-[#111827]">
              Status & Hasil Peninjauan:
            </span>

            {isPending ? (
              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs text-amber-950 flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-xs">Menunggu Review</span>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Permohonan ini berada dalam status <strong>pending</strong> dan membutuhkan keputusan persetujuan atau penolakan dari peninjau.
                  </p>
                </div>
              </div>
            ) : currentStatus === 'cancelled' ? (
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 flex items-start gap-2.5">
                <Ban className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-xs">Dibatalkan oleh Pegawai</span>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Permohonan ini telah dibatalkan oleh pegawai yang bersangkutan. Status ini bersifat final.
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
                  <span className="font-bold flex items-center gap-1.5 text-xs">
                    {currentStatus === 'approved' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600" />
                    )}
                    {currentStatus === 'approved'
                      ? 'Disetujui oleh Peninjau'
                      : 'Ditolak oleh Peninjau'}
                  </span>
                  <span className="text-[11px] text-[#6B7280]">
                    {formatRequestDateTime(reviewedAt)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-[#4B5563]">
                  <User className="w-3.5 h-3.5 text-[#6B7280]" />
                  <span>
                    Ditinjau oleh:{' '}
                    <strong className="text-[#111827]">
                      {reviewerName}
                    </strong>
                  </span>
                </div>

                <div className="pt-2 border-t border-black/5">
                  <span className="text-[11px] font-semibold text-[#6B7280] block mb-0.5 flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    Catatan Peninjau:
                  </span>
                  <p className="italic text-[#374151] whitespace-pre-wrap">
                    "{savedReviewerNote || 'Tidak ada catatan tambahan.'}"
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* =================================================================== */}
          {/* SECTION D: STATUS TIMELINE (Actual data only, Section 9)           */}
          {/* =================================================================== */}
          <div className="border border-[#E5E7EB] rounded-2xl p-4 space-y-3 bg-[#F9FAFB] text-xs">
            <span className="font-bold text-[#111827] text-xs block">
              Timeline Pengajuan
            </span>

            <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E5E7EB]">
              {/* Step 1: Diajukan */}
              <div className="relative">
                <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-emerald-100 text-emerald-600 border border-emerald-300 flex items-center justify-center">
                  <Check className="w-3 h-3" />
                </div>
                <div>
                  <div className="font-bold text-[#111827]">Diajukan oleh Pegawai</div>
                  <div className="text-[11px] text-[#6B7280]">
                    {formatRequestDateTime(submittedAt)}
                  </div>
                </div>
              </div>

              {/* Step 2: Peninjauan */}
              <div className="relative">
                <div
                  className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center border ${
                    currentStatus === 'pending'
                      ? 'bg-amber-100 text-amber-600 border-amber-300'
                      : currentStatus === 'cancelled'
                      ? 'bg-slate-100 text-slate-500 border-slate-300'
                      : 'bg-emerald-100 text-emerald-600 border-emerald-300'
                  }`}
                >
                  {currentStatus === 'pending' ? (
                    <Clock className="w-3 h-3" />
                  ) : currentStatus === 'cancelled' ? (
                    <Ban className="w-3 h-3" />
                  ) : (
                    <Check className="w-3 h-3" />
                  )}
                </div>
                <div>
                  <div className="font-bold text-[#111827]">Proses Peninjauan</div>
                  <div className="text-[11px] text-[#6B7280]">
                    {currentStatus === 'pending'
                      ? 'Menunggu peninjauan pimpinan/administrator'
                      : currentStatus === 'cancelled'
                      ? 'Permohonan dibatalkan oleh pegawai'
                      : `${formatRequestDateTime(reviewedAt)} • oleh ${reviewerName}`}
                  </div>
                </div>
              </div>

              {/* Step 3: Hasil Akhir */}
              <div className="relative">
                <div
                  className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center border ${
                    currentStatus === 'approved'
                      ? 'bg-emerald-100 text-emerald-600 border-emerald-300'
                      : currentStatus === 'rejected'
                      ? 'bg-red-100 text-red-600 border-red-300'
                      : currentStatus === 'cancelled'
                      ? 'bg-slate-100 text-slate-500 border-slate-300'
                      : 'bg-amber-50 text-amber-500 border-amber-200'
                  }`}
                >
                  {currentStatus === 'approved' ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  ) : currentStatus === 'rejected' ? (
                    <XCircle className="w-3 h-3 text-red-600" />
                  ) : currentStatus === 'cancelled' ? (
                    <Ban className="w-3 h-3 text-slate-500" />
                  ) : (
                    <Hourglass className="w-3 h-3 text-amber-500" />
                  )}
                </div>
                <div>
                  <div className="font-bold text-[#111827]">
                    {currentStatus === 'approved'
                      ? 'Keputusan: Disetujui'
                      : currentStatus === 'rejected'
                      ? 'Keputusan: Ditolak'
                      : currentStatus === 'cancelled'
                      ? 'Keputusan: Dibatalkan'
                      : 'Menunggu Keputusan'}
                  </div>
                  <div className="text-[11px] text-[#6B7280]">
                    {currentStatus === 'approved'
                      ? 'Permohonan telah disetujui dan berlaku untuk periode terkait'
                      : currentStatus === 'rejected'
                      ? 'Permohonan ditolak dengan catatan peninjau'
                      : currentStatus === 'cancelled'
                      ? 'Permohonan dibatalkan oleh pemohon sebelum diputuskan'
                      : 'Menunggu proses persetujuan atau penolakan'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* =================================================================== */}
          {/* SECTION E: CONFIRMATION FORMS (Approve / Reject)                   */}
          {/* =================================================================== */}
          {actionType === 'confirm_approve' && isPending && (
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs space-y-3 animate-in fade-in duration-150">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-emerald-950">
                    Setujui Permohonan Pegawai ini?
                  </p>
                  <p className="text-emerald-800 leading-relaxed text-[11px]">
                    Status permohonan akan diubah menjadi <strong>Disetujui</strong>.
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-emerald-900 block">
                  Catatan Persetujuan (Opsional):
                </label>
                <textarea
                  value={reviewerNote}
                  onChange={(e) => setReviewerNote(e.target.value)}
                  placeholder="Tambahkan catatan jika diperlukan..."
                  rows={2}
                  className="w-full p-2.5 rounded-lg border border-emerald-300 text-xs text-[#111827] focus:outline-hidden focus:border-emerald-600 bg-white"
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
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  {submitting ? 'Memproses...' : 'Ya, Setujui Permohonan'}
                </Button>
              </div>
            </div>
          )}

          {actionType === 'confirm_reject' && isPending && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-950 text-xs space-y-3 animate-in fade-in duration-150">
              <div className="flex items-start gap-2.5">
                <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-red-950">
                    Tolak Permohonan Pegawai ini?
                  </p>
                  <p className="text-red-800 leading-relaxed text-[11px]">
                    Status permohonan akan diubah menjadi <strong>Ditolak</strong>. Catatan penolakan wajib diisi.
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-red-900 block">
                  Alasan Penolakan <span className="text-red-600">*</span>
                </label>
                <textarea
                  value={reviewerNote}
                  onChange={(e) => setReviewerNote(e.target.value)}
                  placeholder="Tuliskan alasan penolakan secara jelas..."
                  rows={2}
                  required
                  className="w-full p-2.5 rounded-lg border border-red-300 text-xs text-[#111827] focus:outline-hidden focus:border-red-600 bg-white"
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
                  className="text-xs bg-red-600 hover:bg-red-700 text-white font-semibold"
                >
                  {submitting ? 'Memproses...' : 'Ya, Tolak Permohonan'}
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
                  onClick={() => setActionType('confirm_reject')}
                  disabled={submitting}
                  className="text-xs text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 font-semibold"
                >
                  <XCircle className="w-4 h-4 mr-1 text-red-500" />
                  Tolak
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => setActionType('confirm_approve')}
                  disabled={submitting}
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
                  <CheckCircle2 className="w-4 h-4 mr-1 text-white" />
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
