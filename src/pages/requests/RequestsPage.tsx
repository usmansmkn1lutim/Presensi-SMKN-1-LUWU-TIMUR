import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  RefreshCw,
  AlertCircle,
  Calendar,
  Clock,
  ChevronRight,
  UserX,
  Search,
  CheckCircle2,
  XCircle,
  Building,
  User,
  ShieldCheck,
  CheckSquare,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { requestService } from '../../services/requestService';
import {
  RequestRow,
  RequestWithRelations,
  RequestStatus,
  RequestType,
} from '../../types/request.types';
import {
  RequestStatusBadge,
  RequestTypeBadge,
} from '../../components/requests/RequestStatusBadge';
import { RequestFormModal } from '../../components/requests/RequestFormModal';
import { RequestDetailModal } from '../../components/requests/RequestDetailModal';
import { ReviewRequestModal } from '../../components/requests/ReviewRequestModal';
import { Button } from '../../components/ui/Button';

export const RequestsPage: React.FC = () => {
  const { profile } = useAuth();

  // Check if current user is an active reviewer
  const isReviewer =
    (profile?.role === 'super_admin' ||
      profile?.role === 'admin' ||
      profile?.role === 'headmaster') &&
    profile?.is_active === true;

  // Active top-level tab for reviewers
  const [activeTab, setActiveTab] = useState<'review' | 'personal'>(
    isReviewer ? 'review' : 'personal'
  );

  // Sync activeTab if user role changes or loads
  useEffect(() => {
    if (isReviewer) {
      setActiveTab('review');
    } else {
      setActiveTab('personal');
    }
  }, [isReviewer]);

  // ==========================================
  // STATE: PERSONAL REQUESTS (EMPLOYEE VIEW)
  // ==========================================
  const [myRequests, setMyRequests] = useState<RequestRow[]>([]);
  const [loadingMy, setLoadingMy] = useState<boolean>(true);
  const [statusFilterMy, setStatusFilterMy] = useState<RequestStatus | 'all'>('all');
  const [errorMsgMy, setErrorMsgMy] = useState<string | null>(null);
  const [isUnlinked, setIsUnlinked] = useState<boolean>(false);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [selectedMyRequest, setSelectedMyRequest] = useState<RequestRow | null>(null);

  const loadMyRequests = async (status = statusFilterMy) => {
    setLoadingMy(true);
    setErrorMsgMy(null);
    setIsUnlinked(false);

    try {
      const res = await requestService.getMyRequests({
        status: status === 'all' ? undefined : status,
      });

      setMyRequests(res.data);
    } catch (err: any) {
      console.error('Failed to load my requests:', err);
      const msg = err?.message || 'Gagal memuat daftar permohonan.';
      setErrorMsgMy(msg);

      if (
        msg.includes('belum terhubung') ||
        msg.includes('tidak ditemukan') ||
        msg.includes('belum dikaitkan')
      ) {
        setIsUnlinked(true);
      }
    } finally {
      setLoadingMy(false);
    }
  };

  useEffect(() => {
    if (!isReviewer || activeTab === 'personal') {
      loadMyRequests(statusFilterMy);
    }
  }, [statusFilterMy, activeTab, isReviewer]);

  // ==========================================
  // STATE: REVIEW REQUESTS (REVIEWER VIEW)
  // ==========================================
  const [allRequests, setAllRequests] = useState<RequestWithRelations[]>([]);
  const [loadingAll, setLoadingAll] = useState<boolean>(true);
  const [statusFilterReview, setStatusFilterReview] = useState<RequestStatus | 'all'>('all');
  const [typeFilterReview, setTypeFilterReview] = useState<RequestType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [errorMsgReview, setErrorMsgReview] = useState<string | null>(null);
  const [selectedReviewRequest, setSelectedReviewRequest] = useState<RequestWithRelations | null>(null);

  const loadReviewRequests = async () => {
    if (!isReviewer) return;

    setLoadingAll(true);
    setErrorMsgReview(null);

    try {
      const res = await requestService.getAllRequests({
        status: statusFilterReview === 'all' ? undefined : statusFilterReview,
        requestType: typeFilterReview === 'all' ? undefined : typeFilterReview,
        search: searchQuery.trim() || undefined,
      });

      setAllRequests(res.data);
    } catch (err: any) {
      console.error('Failed to load review requests:', err);
      setErrorMsgReview(
        err?.message || 'Gagal memuat daftar permohonan pegawai untuk ditinjau.'
      );
    } finally {
      setLoadingAll(false);
    }
  };

  useEffect(() => {
    if (isReviewer && activeTab === 'review') {
      loadReviewRequests();
    }
  }, [statusFilterReview, typeFilterReview, searchQuery, activeTab, isReviewer]);

  // Date formatters
  const formatDateRange = (startStr: string, endStr: string) => {
    try {
      const startDate = new Date(startStr);
      const endDate = new Date(endStr);

      const startFormatted = startDate.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

      if (startStr === endStr) {
        return startFormatted;
      }

      const endFormatted = endDate.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });

      return `${startFormatted} — ${endFormatted}`;
    } catch {
      return `${startStr} — ${endStr}`;
    }
  };

  const formatSubmittedAt = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF] flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-[#F97316]" />
            {isReviewer && activeTab === 'review'
              ? 'Pusat Persetujuan & Peninjauan'
              : 'Pengajuan Pegawai'}
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-[#111827] mt-0.5">
            {isReviewer && activeTab === 'review'
              ? 'Tinjauan Permohonan Pegawai'
              : 'Permohonan Saya'}
          </h2>
          <p className="text-xs sm:text-sm text-[#6B7280] mt-1">
            {isReviewer && activeTab === 'review'
              ? 'Kelola, tinjau, dan putuskan persetujuan permohonan ketidakhadiran pegawai.'
              : 'Kelola pengajuan permohonan dan lihat statusnya.'}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (isReviewer && activeTab === 'review') {
                loadReviewRequests();
              } else {
                loadMyRequests();
              }
            }}
            disabled={activeTab === 'review' ? loadingAll : loadingMy}
            className="text-xs"
          >
            <RefreshCw
              className={`w-3.5 h-3.5 mr-1.5 ${
                (activeTab === 'review' ? loadingAll : loadingMy) ? 'animate-spin' : ''
              }`}
            />
            Segarkan
          </Button>

          {(!isReviewer || activeTab === 'personal') && !isUnlinked && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsFormOpen(true)}
              className="text-xs bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold"
            >
              <Plus className="w-4 h-4 mr-1" />
              Ajukan Permohonan
            </Button>
          )}
        </div>
      </div>

      {/* Reviewer Top Navigation Tabs */}
      {isReviewer && (
        <div className="flex items-center gap-2 border-b border-[#E5E7EB] pb-1">
          <button
            type="button"
            onClick={() => setActiveTab('review')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'review'
                ? 'bg-[#FFF7ED] text-[#EA580C] border border-[#F97316]/30 shadow-2xs'
                : 'text-[#6B7280] hover:text-[#111827] hover:bg-[#F9FAFB]'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Tinjau Permohonan Pegawai
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('personal')}
            className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'personal'
                ? 'bg-[#FFF7ED] text-[#EA580C] border border-[#F97316]/30 shadow-2xs'
                : 'text-[#6B7280] hover:text-[#111827] hover:bg-[#F9FAFB]'
            }`}
          >
            <User className="w-4 h-4" />
            Permohonan Pribadi Saya
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW 1: REVIEWER REQUESTS LIST (Only active for reviewers on review tab)  */}
      {/* ========================================================================= */}
      {isReviewer && activeTab === 'review' ? (
        <div className="space-y-4">
          {/* Search & Filters Card */}
          <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-4 shadow-2xs space-y-3">
            <div className="flex flex-col md:flex-row md:items-center gap-3">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nama pegawai atau NIP..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl border border-[#E5E7EB] text-xs text-[#111827] placeholder:text-[#9CA3AF] focus:outline-hidden focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20 bg-[#FFFFFF]"
                />
              </div>

              {/* Status Filter */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
                <span className="text-[11px] font-semibold text-[#6B7280] shrink-0 mr-1">
                  Status:
                </span>
                {[
                  { id: 'all', label: 'Semua' },
                  { id: 'pending', label: 'Menunggu' },
                  { id: 'approved', label: 'Disetujui' },
                  { id: 'rejected', label: 'Ditolak' },
                  { id: 'cancelled', label: 'Dibatalkan' },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setStatusFilterReview(item.id as RequestStatus | 'all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                      statusFilterReview === item.id
                        ? 'bg-[#FFF7ED] text-[#EA580C] border border-[#F97316]/40 shadow-2xs'
                        : 'text-[#6B7280] hover:text-[#111827] hover:bg-[#F9FAFB] border border-transparent'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Jenis Permohonan Filter */}
              <div className="flex items-center gap-1.5">
                <select
                  value={typeFilterReview}
                  onChange={(e) => setTypeFilterReview(e.target.value as RequestType | 'all')}
                  className="px-3 py-1.5 rounded-lg border border-[#E5E7EB] text-xs font-semibold text-[#374151] bg-[#FFFFFF] focus:outline-hidden focus:border-[#F97316]"
                >
                  <option value="all">Semua Jenis</option>
                  <option value="leave">Cuti</option>
                  <option value="sick">Sakit</option>
                  <option value="official_duty">Dinas</option>
                  <option value="other">Lainnya</option>
                </select>
              </div>
            </div>
          </div>

          {/* Error State */}
          {errorMsgReview ? (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-amber-800 space-y-3">
              <div className="flex items-center gap-2 font-bold text-sm">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <span>Gagal Memuat Data Tinjauan</span>
              </div>
              <p className="text-xs leading-relaxed">{errorMsgReview}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={loadReviewRequests}
                className="mt-2 text-xs"
              >
                Coba Lagi
              </Button>
            </div>
          ) : loadingAll ? (
            /* Loading Skeleton */
            <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-6 shadow-2xs space-y-4 animate-pulse">
              <div className="h-4 bg-[#F3F4F6] rounded w-1/4" />
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-16 bg-[#F3F4F6] rounded-xl" />
                ))}
              </div>
            </div>
          ) : allRequests.length === 0 ? (
            /* Empty State */
            <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-10 text-center shadow-2xs space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-[#F3F4F6] text-[#9CA3AF] flex items-center justify-center mx-auto border border-[#E5E7EB]">
                <FileText className="w-7 h-7 text-[#9CA3AF]" />
              </div>
              <div className="space-y-1">
                <h4 className="text-base font-bold text-[#111827]">
                  {searchQuery || statusFilterReview !== 'all' || typeFilterReview !== 'all'
                    ? 'Permohonan Tidak Ditemukan'
                    : 'Belum Ada Permohonan Pegawai'}
                </h4>
                <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
                  {searchQuery || statusFilterReview !== 'all' || typeFilterReview !== 'all'
                    ? 'Tidak ada permohonan yang sesuai dengan filter atau kata kunci pencarian.'
                    : 'Belum ada pegawai yang mengajukan permohonan ketidakhadiran atau dinas.'}
                </p>
              </div>
            </div>
          ) : (
            /* Reviewer Request Table / List */
            <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl shadow-2xs overflow-hidden">
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#F9FAFB] border-b border-[#E5E7EB] text-[#6B7280] uppercase tracking-wider text-[11px] font-bold">
                    <tr>
                      <th className="py-3.5 px-4">Pegawai</th>
                      <th className="py-3.5 px-4">Departemen</th>
                      <th className="py-3.5 px-4">Jenis</th>
                      <th className="py-3.5 px-4">Periode</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Diajukan</th>
                      <th className="py-3.5 px-4">Peninjau</th>
                      <th className="py-3.5 px-4 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E5E7EB] text-[#374151]">
                    {allRequests.map((req) => (
                      <tr
                        key={req.id}
                        className="hover:bg-[#F9FAFB] transition-colors cursor-pointer"
                        onClick={() => setSelectedReviewRequest(req)}
                      >
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-[#111827]">
                            {req.employees?.full_name || '—'}
                          </div>
                          <div className="text-[11px] text-[#9CA3AF]">
                            NIP: {req.employees?.nip || '—'}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-[#374151]">
                            {req.employees?.departments?.name || '—'}
                          </div>
                          <div className="text-[11px] text-[#9CA3AF]">
                            {req.employees?.positions?.name || '—'}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <RequestTypeBadge type={req.request_type} />
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-[#111827]">
                            {formatDateRange(req.start_date, req.end_date)}
                          </div>
                          <div className="text-[11px] text-[#6B7280] line-clamp-1 max-w-[200px]">
                            {req.reason}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <RequestStatusBadge status={req.status} size="sm" />
                        </td>
                        <td className="py-3.5 px-4 text-[#6B7280]">
                          {formatSubmittedAt(req.submitted_at)}
                        </td>
                        <td className="py-3.5 px-4">
                          {req.reviewer_profile ? (
                            <span className="text-[11px] font-medium text-[#374151] flex items-center gap-1">
                              <User className="w-3 h-3 text-[#9CA3AF]" />
                              {req.reviewer_profile.full_name || 'Peninjau'}
                            </span>
                          ) : (
                            <span className="text-[11px] text-[#9CA3AF] italic">—</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {req.status === 'pending' ? (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedReviewRequest(req);
                              }}
                              className="text-xs bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold py-1 px-3 shadow-2xs"
                            >
                              Tinjau
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedReviewRequest(req);
                              }}
                              className="text-xs text-[#6B7280] hover:text-[#111827] py-1 px-2.5"
                            >
                              Rincian
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile / Tablet Responsive Cards View */}
              <div className="lg:hidden divide-y divide-[#E5E7EB]">
                {allRequests.map((req) => (
                  <div
                    key={req.id}
                    onClick={() => setSelectedReviewRequest(req)}
                    className="p-4 hover:bg-[#F9FAFB] transition-colors cursor-pointer space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-[#111827] text-sm">
                          {req.employees?.full_name || '—'}
                        </div>
                        <div className="text-xs text-[#6B7280] flex items-center gap-1.5 mt-0.5">
                          <span>NIP: {req.employees?.nip || '—'}</span>
                          <span>•</span>
                          <span>{req.employees?.departments?.name || '—'}</span>
                        </div>
                      </div>
                      <RequestStatusBadge status={req.status} size="sm" />
                    </div>

                    <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-[#F3F4F6]">
                      <RequestTypeBadge type={req.request_type} />
                      <div className="text-xs font-semibold text-[#111827] flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-[#F97316]" />
                        <span>{formatDateRange(req.start_date, req.end_date)}</span>
                      </div>
                    </div>

                    <p className="text-xs text-[#4B5563] line-clamp-2">
                      {req.reason}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-[#9CA3AF] pt-1">
                      <span>Diajukan: {formatSubmittedAt(req.submitted_at)}</span>
                      {req.status === 'pending' ? (
                        <span className="text-xs font-bold text-[#F97316] flex items-center gap-0.5">
                          Tinjau Sekarang <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-[#6B7280] flex items-center gap-0.5">
                          Lihat Rincian <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Modal Reviewer */}
          <ReviewRequestModal
            request={selectedReviewRequest}
            isOpen={!!selectedReviewRequest}
            onClose={() => setSelectedReviewRequest(null)}
            onSuccessReview={loadReviewRequests}
          />
        </div>
      ) : (
        /* ========================================================================= */
        /* VIEW 2: PERSONAL REQUESTS VIEW (Phase 7B component completely preserved)  */
        /* ========================================================================= */
        <div className="space-y-4">
          {/* Filter Tabs Personal */}
          <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-2 shadow-2xs overflow-x-auto">
            <div className="flex items-center gap-1 min-w-max">
              {[
                { id: 'all', label: 'Semua' },
                { id: 'pending', label: 'Menunggu' },
                { id: 'approved', label: 'Disetujui' },
                { id: 'rejected', label: 'Ditolak' },
                { id: 'cancelled', label: 'Dibatalkan' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStatusFilterMy(tab.id as RequestStatus | 'all')}
                  className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all ${
                    statusFilterMy === tab.id
                      ? 'bg-[#FFF7ED] text-[#EA580C] border border-[#F97316]/30 shadow-2xs'
                      : 'text-[#6B7280] hover:text-[#111827] hover:bg-[#F9FAFB]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* UNLINKED ACCOUNT STATE */}
          {isUnlinked ? (
            <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-6 sm:p-8 text-center space-y-4 shadow-2xs">
              <div className="w-14 h-14 rounded-2xl bg-amber-100 text-amber-700 border border-amber-300 flex items-center justify-center mx-auto">
                <UserX className="w-7 h-7" />
              </div>

              <div className="space-y-1.5 max-w-md mx-auto">
                <h3 className="text-base sm:text-lg font-bold text-amber-950">
                  Akun Belum Terhubung
                </h3>
                <p className="text-xs sm:text-sm text-amber-800 leading-relaxed">
                  Akun Anda belum terhubung dengan data pegawai. Silakan hubungi administrator sekolah.
                </p>
              </div>

              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadMyRequests()}
                  className="text-xs"
                >
                  <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
                  Segarkan Halaman
                </Button>
              </div>
            </div>
          ) : errorMsgMy ? (
            /* Generic Error State */
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-amber-800 space-y-3">
              <div className="flex items-center gap-2 font-bold text-sm">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
                <span>Gagal Memuat Data Permohonan</span>
              </div>
              <p className="text-xs leading-relaxed">{errorMsgMy}</p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => loadMyRequests()}
                className="mt-2 text-xs"
              >
                Coba Lagi
              </Button>
            </div>
          ) : loadingMy ? (
            /* Loading Skeleton */
            <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-6 shadow-2xs space-y-4 animate-pulse">
              <div className="h-4 bg-[#F3F4F6] rounded w-1/4" />
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-[#F3F4F6] rounded-xl" />
                ))}
              </div>
            </div>
          ) : myRequests.length === 0 ? (
            /* Empty State */
            <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-10 text-center shadow-2xs space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-[#F3F4F6] text-[#9CA3AF] flex items-center justify-center mx-auto border border-[#E5E7EB]">
                <FileText className="w-7 h-7 text-[#9CA3AF]" />
              </div>

              <div className="space-y-1">
                <h4 className="text-base font-bold text-[#111827]">
                  Belum Ada Permohonan
                </h4>
                <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
                  Anda belum memiliki pengajuan permohonan.
                </p>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsFormOpen(true)}
                className="text-xs bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold"
              >
                <Plus className="w-4 h-4 mr-1" />
                Ajukan Permohonan
              </Button>
            </div>
          ) : (
            /* Personal Request List Content */
            <div className="space-y-3">
              {myRequests.map((req) => (
                <div
                  key={req.id}
                  onClick={() => setSelectedMyRequest(req)}
                  className="bg-[#FFFFFF] border border-[#E5E7EB] hover:border-[#F97316]/50 rounded-2xl p-4 sm:p-5 shadow-2xs transition-all hover:shadow-xs cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <RequestTypeBadge type={req.request_type} />
                      <RequestStatusBadge status={req.status} size="sm" />
                    </div>

                    <div className="text-sm font-bold text-[#111827] flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-[#F97316] shrink-0" />
                      <span>{formatDateRange(req.start_date, req.end_date)}</span>
                    </div>

                    <p className="text-xs text-[#4B5563] line-clamp-2">
                      {req.reason}
                    </p>

                    <div className="text-[11px] text-[#9CA3AF] flex items-center gap-1.5 pt-1">
                      <Clock className="w-3 h-3 text-[#9CA3AF]" />
                      <span>Diajukan {formatSubmittedAt(req.submitted_at)}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-2 border-t sm:border-t-0 pt-2 sm:pt-0 border-[#E5E7EB]">
                    <span className="text-xs font-semibold text-[#F97316] group-hover:translate-x-0.5 transition-transform flex items-center gap-1">
                      Rincian
                      <ChevronRight className="w-4 h-4" />
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Form Modal for Personal Request */}
          <RequestFormModal
            isOpen={isFormOpen}
            onClose={() => setIsFormOpen(false)}
            onSuccess={() => loadMyRequests(statusFilterMy)}
          />

          {/* Detail Modal for Personal Request */}
          <RequestDetailModal
            request={selectedMyRequest}
            isOpen={!!selectedMyRequest}
            onClose={() => setSelectedMyRequest(null)}
            onSuccessCancel={() => loadMyRequests(statusFilterMy)}
          />
        </div>
      )}
    </div>
  );
};
