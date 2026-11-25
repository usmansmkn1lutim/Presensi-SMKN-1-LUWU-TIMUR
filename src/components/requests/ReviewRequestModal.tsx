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
import { UserAvatar } from '../ui/UserAvatar';

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
      <div className="bg-[#FFFFFF] dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-800 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[92vh] text-slate-900 dark:text-slate-100">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#E5E7EB] dark:border-slate-800 flex items-center justify-between bg-[#F9FAFB] dark:bg-slate-800/60">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FFF7ED] dark:bg-amber-950/50 text-[#EA580C] dark:text-amber-400 border border-[#F97316]/30 dark:border-amber-900/50 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5 text-[#F97316] dark:text-amber-400" />
            </div>
            <div>
              <h3 id="reviewer-modal-title" className="text-base font-bold text-[#111827] dark:text-white">
                Tinjauan Permohonan Pegawai
              </h3>
              <p className="text-[11px] text-[#6B7280] dark:text-slate-400">
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
            className="text-[#9CA3AF] dark:text-slate-400 hover:text-[#111827] dark:hover:text-white p-1.5 rounded-lg hover:bg-[#F3F4F6] dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-5 space-y-4 overflow-y-auto">
          {errorMsg && (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-xl text-red-800 dark:text-red-300 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1">{errorMsg}</div>
            </div>
          )}

          {loadingDetail && (
            <div className="text-[11px] text-[#9CA3AF] dark:text-slate-400 flex items-center gap-1.5 bg-[#F9FAFB] dark:bg-slate-800/50 p-2 rounded-lg border border-[#E5E7EB] dark:border-slate-800">
              <Hourglass className="w-3.5 h-3.5 text-[#F97316] dark:text-amber-400 animate-spin" />
              <span>Memperbarui data pengajuan dari server...</span>
            </div>
          )}

          {/* =================================================================== */}
          {/* SECTION A: IDENTITAS PEGAWAI                                         */}
          {/* =================================================================== */}
          <div className="bg-[#F9FAFB] dark:bg-slate-800/60 border border-[#E5E7EB] dark:border-slate-800 rounded-2xl p-4 space-y-3.5 text-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <UserAvatar
                  photoUrl={employeePhoto}
                  name={employeeName}
                  className="w-12 h-12 rounded-xl object-cover border border-[#E5E7EB] dark:border-slate-700 shadow-2xs shrink-0"
                />
                <div>
                  <div className="font-bold text-[#111827] dark:text-white text-sm sm:text-base leading-tight">
                    {employeeName}
                  </div>
                  <div className="text-[11px] text-[#6B7280] dark:text-slate-400 flex flex-wrap items-center gap-1.5 mt-0.5">
                    <span>NIP: <strong className="text-[#374151] dark:text-slate-200 font-semibold">{employeeNip || '—'}</strong></span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                {employeeStatus && (
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                      employeeStatus === 'active'
                        ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    {employeeStatus === 'active' ? 'Pegawai Aktif' : 'Nonaktif'}
                  </span>
                )}
                <RequestStatusBadge status={currentStatus} />
              </div>
            </div>

            {/* Grid detail pegawai */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-3 border-t border-[#E5E7EB] dark:border-slate-700 text-[#4B5563] dark:text-slate-300">
              <div className="space-y-0.5">
                <span className="text-[#9CA3AF] dark:text-slate-500 text-[10px] block flex items-center gap-1">
                  <IdCard className="w-3 h-3 text-[#9CA3AF] dark:text-slate-500" /> NIK
                </span>
                <span className="font-semibold text-[#111827] dark:text-slate-200 text-xs">
                  {employeeNik || '—'}
                </span>
              </div>

              <div className="space-y-0.5">
                <span className="text-[#9CA3AF] dark:text-slate-500 text-[10px] block flex items-center gap-1">
                  <Hash className="w-3 h-3 text-[#9CA3AF] dark:text-slate-500" /> No. Pegawai
                </span>
                <span className="font-semibold text-[#111827] dark:text-slate-200 text-xs">
                  {employeeNumber || '—'}
                </span>
              </div>

              <div className="space-y-0.5">
                <span className="text-[#9CA3AF] dark:text-slate-500 text-[10px] block flex items-center gap-1">
                  <Users className="w-3 h-3 text-[#9CA3AF] dark:text-slate-500" /> Jenis Kelamin
                </span>
                <span className="font-semibold text-[#111827] dark:text-slate-200 text-xs">
                  {formatGender(employeeGender)}
                </span>
              </div>

              <div className="space-y-0.5">
                <span className="text-[#9CA3AF] dark:text-slate-500 text-[10px] block flex items-center gap-1">
                  <Building className="w-3 h-3 text-[#9CA3AF] dark:text-slate-500" /> Unit / Dept
                </span>
                <span className="font-semibold text-[#111827] dark:text-slate-200 text-xs truncate block" title={departmentName || '—'}>
                  {departmentName || '—'}
                </span>
              </div>

              <div className="space-y-0.5 col-span-2 sm:col-span-2">
                <span className="text-[#9CA3AF] dark:text-slate-500 text-[10px] block flex items-center gap-1">
                  <Briefcase className="w-3 h-3 text-[#9CA3AF] dark:text-slate-500" /> Jabatan
                </span>
                <span className="font-semibold text-[#111827] dark:text-slate-200 text-xs truncate block" title={positionName || '—'}>
                  {positionName || '—'}
                </span>
              </div>
            </div>
          </div>

          {/* =================================================================== */}
          {/* SECTION B: INFORMASI PENGAJUAN                                      */}
          {/* =================================================================== */}
          <div className="border border-[#E5E7EB] dark:border-slate-800 rounded-2xl p-4 space-y-3 text-xs bg-white dark:bg-slate-800/60 shadow-2xs">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#F97316] dark:text-amber-400" />
                <span className="font-bold text-[#111827] dark:text-white text-xs sm:text-sm">
                  Rincian Permohonan
                </span>
              </div>
              <RequestTypeBadge type={requestType} />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="p-2.5 rounded-xl bg-[#F9FAFB] dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-700 space-y-1">
                <span className="text-[#9CA3AF] dark:text-slate-400 text-[11px] block">Tanggal Mulai</span>
                <span className="font-bold text-[#111827] dark:text-slate-200 flex items-center gap-1.5 text-xs">
                  <Calendar className="w-3.5 h-3.5 text-[#F97316] dark:text-amber-400" />
                  {formatRequestDate(startDate)}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-[#F9FAFB] dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-700 space-y-1">
                <span className="text-[#9CA3AF] dark:text-slate-400 text-[11px] block">Tanggal Selesai</span>
                <span className="font-bold text-[#111827] dark:text-slate-200 flex items-center gap-1.5 text-xs">
                  <Calendar className="w-3.5 h-3.5 text-[#F97316] dark:text-amber-400" />
                  {formatRequestDate(endDate)}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-[#F3F4F6] dark:border-slate-700 text-[11px]">
              <div className="flex items-center gap-1 text-[#6B7280] dark:text-slate-400">
                <Clock className="w-3.5 h-3.5 text-[#9CA3AF] dark:text-slate-500" />
                <span>Diajukan pada {formatRequestDateTime(submittedAt)}</span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#FFF7ED] dark:bg-amber-950/50 text-[#EA580C] dark:text-amber-400 border border-[#F97316]/30 dark:border-amber-900/50">
                Durasi: {formatRequestDuration(startDate, endDate)}
              </span>
            </div>

            <div>
              <span className="block text-[11px] font-semibold text-[#6B7280] dark:text-slate-400 mb-1">
                Alasan Pengajuan:
              </span>
              <div className="p-3 rounded-xl bg-[#F9FAFB] dark:bg-slate-900 border border-[#E5E7EB] dark:border-slate-700 text-xs text-[#374151] dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                {reason || '—'}
              </div>
            </div>
          </div>

          {/* =================================================================== */}
          {/* SECTION C: INFORMASI REVIEW & STATUS                                */}
          {/* =================================================================== */}
          <div className="space-y-1.5">
            <span className="block text-xs font-semibold text-[#111827] dark:text-slate-200">
              Status & Hasil Peninjauan:
            </span>

            {isPending ? (
              <div className="p-3.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-950 dark:text-amber-300 flex items-start gap-2.5">
                <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-xs">Menunggu Review</span>
                  <p className="text-[11px] text-amber-800 dark:text-amber-400 mt-0.5">
                    Permohonan ini berada dalam status <strong>pending</strong> dan membutuhkan keputusan persetujuan atau penolakan dari peninjau.
                  </p>
                </div>
              </div>
            ) : currentStatus === 'cancelled' ? (
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-800 dark:text-slate-300 flex items-start gap-2.5">
                <Ban className="w-4 h-4 text-slate-500 dark:text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-xs">Dibatalkan oleh Pegawai</span>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                    Permohonan ini telah dibatalkan oleh pegawai yang bersangkutan. Status ini bersifat final.
                  </p>
                </div>
              </div>
            ) : (
              /* Approved / Rejected */
              <div
                className={`p-3.5 rounded-xl border space-y-2 text-xs ${
                  currentStatus === 'approved'
                    ? 'bg-emerald-50/50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900 text-emerald-950 dark:text-emerald-300'
                    : 'bg-red-50/50 dark:bg-red-950/30 border-red-200 dark:border-red-900 text-red-950 dark:text-red-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1.5 text-xs">
                    {currentStatus === 'approved' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                    )}
                    {currentStatus === 'approved'
                      ? 'Disetujui oleh Peninjau'
                      : 'Ditolak oleh Peninjau'}
                  </span>
                  <span className="text-[11px] text-[#6B7280] dark:text-slate-400">
                    {formatRequestDateTime(reviewedAt)}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 text-[11px] text-[#4B5563] dark:text-slate-400">
                  <User className="w-3.5 h-3.5 text-[#6B7280] dark:text-slate-500" />
                  <span>
                    Ditinjau oleh:{' '}
                    <strong className="text-[#111827] dark:text-white">
                      {reviewerName}
                    </strong>
                  </span>
                </div>

                <div className="pt-2 border-t border-black/5 dark:border-white/10">
                  <span className="text-[11px] font-semibold text-[#6B7280] dark:text-slate-400 block mb-0.5 flex items-center gap-1">
                    <MessageSquare className="w-3 h-3" />
                    Catatan Peninjau:
                  </span>
                  <p className="italic text-[#374151] dark:text-slate-300 whitespace-pre-wrap">
                    "{savedReviewerNote || 'Tidak ada catatan tambahan.'}"
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* =================================================================== */}
          {/* SECTION D: STATUS TIMELINE (Actual data only, Section 9)           */}
          {/* =================================================================== */}
          <div className="border border-[#E5E7EB] dark:border-slate-800 rounded-2xl p-4 space-y-3 bg-[#F9FAFB] dark:bg-slate-800/60 text-xs">
            <span className="font-bold text-[#111827] dark:text-white text-xs block">
              Timeline Pengajuan
            </span>

            <div className="relative pl-6 space-y-4 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E5E7EB] dark:before:bg-slate-700">
              {/* Step 1: Diajukan */}
              <div className="relative">
                <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-700 flex items-center justify-center">
                  <Check className="w-3 h-3" />
                </div>
                <div>
                  <div className="font-bold text-[#111827] dark:text-white">Diajukan oleh Pegawai</div>
                  <div className="text-[11px] text-[#6B7280] dark:text-slate-400">
                    {formatRequestDateTime(submittedAt)}
                  </div>
                </div>
              </div>

              {/* Step 2: Peninjauan */}
              <div className="relative">
                <div
                  className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center border ${
                    currentStatus === 'pending'
                      ? 'bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700'
                      : currentStatus === 'cancelled'
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                      : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700'
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
                  <div className="font-bold text-[#111827] dark:text-white">Proses Peninjauan</div>
                  <div className="text-[11px] text-[#6B7280] dark:text-slate-400">
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
                      ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400 border-emerald-300 dark:border-emerald-700'
                      : currentStatus === 'rejected'
                      ? 'bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 border-red-300 dark:border-red-700'
                      : currentStatus === 'cancelled'
                      ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700'
                      : 'bg-amber-50 dark:bg-amber-950/50 text-amber-500 dark:text-amber-400 border-amber-200 dark:border-amber-800'
                  }`}
                >
                  {currentStatus === 'approved' ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  ) : currentStatus === 'rejected' ? (
                    <XCircle className="w-3 h-3 text-red-600 dark:text-red-400" />
                  ) : currentStatus === 'cancelled' ? (
                    <Ban className="w-3 h-3 text-slate-500 dark:text-slate-400" />
                  ) : (
                    <Hourglass className="w-3 h-3 text-amber-500 dark:text-amber-400" />
                  )}
                </div>
                <div>
                  <div className="font-bold text-[#111827] dark:text-white">
                    {currentStatus === 'approved'
                      ? 'Keputusan: Disetujui'
                      : currentStatus === 'rejected'
                      ? 'Keputusan: Ditolak'
                      : currentStatus === 'cancelled'
                      ? 'Keputusan: Dibatalkan'
                      : 'Menunggu Keputusan'}
                  </div>
                  <div className="text-[11px] text-[#6B7280] dark:text-slate-400">
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
            <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-950 dark:text-emerald-300 text-xs space-y-3 animate-in fade-in duration-150">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-emerald-950 dark:text-emerald-200">
                    Setujui Permohonan Pegawai ini?
                  </p>
                  <p className="text-emerald-800 dark:text-emerald-300 leading-relaxed text-[11px]">
                    Status permohonan akan diubah menjadi <strong>Disetujui</strong>.
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-emerald-900 dark:text-emerald-300 block">
                  Catatan Persetujuan (Opsional):
                </label>
                <textarea
                  value={reviewerNote}
                  onChange={(e) => setReviewerNote(e.target.value)}
                  placeholder="Tambahkan catatan jika diperlukan..."
                  rows={2}
                  className="w-full p-2.5 rounded-lg border border-emerald-300 dark:border-emerald-800 text-xs text-[#111827] dark:text-white focus:outline-hidden focus:border-emerald-600 bg-white dark:bg-slate-900"
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
            <div className="p-4 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-950 dark:text-red-300 text-xs space-y-3 animate-in fade-in duration-150">
              <div className="flex items-start gap-2.5">
                <XCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-red-950 dark:text-red-200">
                    Tolak Permohonan Pegawai ini?
                  </p>
                  <p className="text-red-800 dark:text-red-300 leading-relaxed text-[11px]">
                    Status permohonan akan diubah menjadi <strong>Ditolak</strong>. Catatan penolakan wajib diisi.
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-red-900 dark:text-red-300 block">
                  Alasan Penolakan <span className="text-red-600 dark:text-red-400">*</span>
                </label>
                <textarea
                  value={reviewerNote}
                  onChange={(e) => setReviewerNote(e.target.value)}
                  placeholder="Tuliskan alasan penolakan secara jelas..."
                  rows={2}
                  required
                  className="w-full p-2.5 rounded-lg border border-red-300 dark:border-red-800 text-xs text-[#111827] dark:text-white focus:outline-hidden focus:border-red-600 bg-white dark:bg-slate-900"
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
        <div className="p-4 border-t border-[#E5E7EB] dark:border-slate-800 bg-[#F9FAFB] dark:bg-slate-800/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isPending && actionType === 'idle' && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setActionType('confirm_reject')}
                  disabled={submitting}
                  leftIcon={<XCircle className="w-4 h-4 text-red-500" />}
                  className="text-xs text-red-600 dark:text-red-400 border-red-200 dark:border-red-900 hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-700 font-semibold"
                >
                  Tolak
                </Button>
                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  onClick={() => setActionType('confirm_approve')}
                  disabled={submitting}
                  leftIcon={<CheckCircle2 className="w-4 h-4 text-white" />}
                  className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
                >
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
