import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  FileText,
  Plus,
  RefreshCw,
  AlertCircle,
  UserX,
  User,
  ShieldCheck,
  SearchX,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { requestService, formatRequestError } from '../../services/requestService';
import {
  RequestRow,
  RequestWithRelations,
  REQUEST_TYPE_LABELS,
} from '../../types/request.types';
import { RequestFormModal } from '../../components/requests/RequestFormModal';
import { RequestDetailModal } from '../../components/requests/RequestDetailModal';
import { ReviewRequestModal } from '../../components/requests/ReviewRequestModal';
import { RequestSummaryCards } from '../../components/requests/RequestSummaryCards';
import {
  RequestHistoryFilters,
  RequestFilterValues,
  getDateRangeFromPreset,
} from '../../components/requests/RequestHistoryFilters';
import { RequestHistoryTable } from '../../components/requests/RequestHistoryTable';
import { RequestHistoryCard } from '../../components/requests/RequestHistoryCard';
import { RequestMobileCard } from '../../components/requests/RequestMobileCard';
import { RequestMobileSearchFilter } from '../../components/requests/RequestMobileSearchFilter';
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

  // Sync activeTab when isReviewer loads
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
  const [myRequests, setMyRequests] = useState<RequestWithRelations[]>([]);
  const [loadingMy, setLoadingMy] = useState<boolean>(true);
  const [errorMsgMy, setErrorMsgMy] = useState<string | null>(null);
  const [isUnlinked, setIsUnlinked] = useState<boolean>(false);
  const [isFormOpen, setIsFormOpen] = useState<boolean>(false);
  const [selectedMyRequest, setSelectedMyRequest] = useState<RequestRow | RequestWithRelations | null>(null);

  const [myFilterValues, setMyFilterValues] = useState<RequestFilterValues>({
    status: 'all',
    requestType: 'all',
    datePreset: 'all',
    customStartDate: '',
    customEndDate: '',
    search: '',
  });

  const loadMyRequests = useCallback(async () => {
    setLoadingMy(true);
    setErrorMsgMy(null);
    setIsUnlinked(false);

    try {
      const { startDate, endDate } = getDateRangeFromPreset(
        myFilterValues.datePreset,
        myFilterValues.customStartDate,
        myFilterValues.customEndDate
      );

      const res = await requestService.getMyRequests({
        status: myFilterValues.status === 'all' ? undefined : myFilterValues.status,
        requestType: myFilterValues.requestType === 'all' ? undefined : myFilterValues.requestType,
        startDate,
        endDate,
      });

      setMyRequests(res.data);
    } catch (err: any) {
      console.error('Failed to load my requests:', err);
      const msg = formatRequestError(err);
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
  }, [myFilterValues.status, myFilterValues.requestType, myFilterValues.datePreset, myFilterValues.customStartDate, myFilterValues.customEndDate]);

  useEffect(() => {
    if (!isReviewer || activeTab === 'personal') {
      loadMyRequests();
    }
  }, [loadMyRequests, activeTab, isReviewer]);

  // Client-side search for employee's own requests (bounded strictly to their own data)
  const filteredMyRequests = useMemo(() => {
    const q = myFilterValues.search.trim().toLowerCase();
    if (!q) return myRequests;

    return myRequests.filter((req) => {
      const typeLabel = REQUEST_TYPE_LABELS[req.request_type]?.toLowerCase() || '';
      const typeKey = req.request_type.toLowerCase();
      const reason = (req.reason || '').toLowerCase();
      return typeLabel.includes(q) || typeKey.includes(q) || reason.includes(q);
    });
  }, [myRequests, myFilterValues.search]);

  // ==========================================
  // STATE: REVIEW REQUESTS (REVIEWER VIEW)
  // ==========================================
  const [allRequests, setAllRequests] = useState<RequestWithRelations[]>([]);
  const [loadingAll, setLoadingAll] = useState<boolean>(true);
  const [errorMsgReview, setErrorMsgReview] = useState<string | null>(null);
  const [selectedReviewRequest, setSelectedReviewRequest] = useState<RequestWithRelations | null>(null);

  const [reviewFilterValues, setReviewFilterValues] = useState<RequestFilterValues>({
    status: 'all',
    requestType: 'all',
    datePreset: 'all',
    customStartDate: '',
    customEndDate: '',
    search: '',
  });

  const loadReviewRequests = useCallback(async () => {
    if (!isReviewer) return;

    setLoadingAll(true);
    setErrorMsgReview(null);

    try {
      const { startDate, endDate } = getDateRangeFromPreset(
        reviewFilterValues.datePreset,
        reviewFilterValues.customStartDate,
        reviewFilterValues.customEndDate
      );

      const res = await requestService.getAllRequests({
        status: reviewFilterValues.status === 'all' ? undefined : reviewFilterValues.status,
        requestType: reviewFilterValues.requestType === 'all' ? undefined : reviewFilterValues.requestType,
        search: reviewFilterValues.search.trim() || undefined,
        startDate,
        endDate,
      });

      setAllRequests(res.data);
    } catch (err: any) {
      console.error('Failed to load review requests:', err);
      setErrorMsgReview(formatRequestError(err));
    } finally {
      setLoadingAll(false);
    }
  }, [isReviewer, reviewFilterValues]);

  useEffect(() => {
    if (isReviewer && activeTab === 'review') {
      loadReviewRequests();
    }
  }, [loadReviewRequests, activeTab, isReviewer]);

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* 1. Mobile & Tablet Heading & Primary Action (< 1024px) */}
      <div className="lg:hidden space-y-4 font-sans">
        <h1 className="text-xl sm:text-2xl font-bold text-[#111827] tracking-tight">
          Pengajuan
        </h1>

        {(!isReviewer || activeTab === 'personal') && !isUnlinked && (
          <button
            type="button"
            onClick={() => setIsFormOpen(true)}
            className="w-full h-12 px-4 bg-[#F97316] hover:bg-[#EA580C] active:bg-[#C2410C] text-white font-bold rounded-2xl shadow-2xs inline-flex items-center justify-center gap-2 transition-colors cursor-pointer text-sm"
          >
            <Plus className="w-4 h-4 stroke-[2.5] text-white shrink-0" />
            <span className="leading-none">Pengajuan baru</span>
          </button>
        )}
      </div>

      {/* Header Banner (Desktop Only >= 1024px - Untouched) */}
      <div className="hidden lg:flex bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 shadow-2xs flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF] flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-[#F97316]" />
            {isReviewer && activeTab === 'review'
              ? 'Pusat Persetujuan & Peninjauan'
              : 'Histori & Pengajuan Pegawai'}
          </span>
          <h2 className="text-xl sm:text-2xl font-bold text-[#111827] mt-0.5">
            {isReviewer && activeTab === 'review'
              ? 'Tinjauan Permohonan Pegawai'
              : 'Histori Permohonan Saya'}
          </h2>
          <p className="text-xs sm:text-sm text-[#6B7280] mt-1">
            {isReviewer && activeTab === 'review'
              ? 'Kelola, tinjau, dan putuskan persetujuan permohonan ketidakhadiran pegawai.'
              : 'Pantau histori permohonan cuti, sakit, dan dinas beserta status peninjauan.'}
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
      {/* VIEW 1: REVIEWER REQUESTS LIST (Reviewer view)                            */}
      {/* ========================================================================= */}
      {isReviewer && activeTab === 'review' ? (
        <div className="space-y-4">
          {/* Status Summary Cards */}
          <RequestSummaryCards
            requests={allRequests}
            selectedStatus={reviewFilterValues.status}
            onSelectStatus={(st) =>
              setReviewFilterValues((prev) => ({ ...prev, status: st }))
            }
          />

          {/* Search & Filters */}
          <RequestHistoryFilters
            values={reviewFilterValues}
            onChange={setReviewFilterValues}
            onReset={() =>
              setReviewFilterValues({
                status: 'all',
                requestType: 'all',
                datePreset: 'all',
                customStartDate: '',
                customEndDate: '',
                search: '',
              })
            }
            showSearch={true}
            searchPlaceholder="Cari nama pegawai atau NIP..."
          />

          {/* Content States */}
          {errorMsgReview ? (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-6 text-red-800 space-y-3">
              <div className="flex items-center gap-2 font-bold text-sm">
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0" />
                <span>Gagal Memuat Daftar Permohonan Pegawai</span>
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
            <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-6 shadow-2xs space-y-4 animate-pulse">
              <div className="h-4 bg-[#F3F4F6] rounded w-1/4" />
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-16 bg-[#F3F4F6] rounded-xl" />
                ))}
              </div>
            </div>
          ) : allRequests.length === 0 ? (
            <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-10 text-center shadow-2xs space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-[#F9FAFB] text-[#9CA3AF] flex items-center justify-center mx-auto border border-[#E5E7EB]">
                <SearchX className="w-6 h-6 text-[#9CA3AF]" />
              </div>
              <h4 className="text-sm font-bold text-[#111827]">
                Tidak Ada Permohonan Ditemukan
              </h4>
              <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
                Tidak ada data permohonan pegawai yang sesuai dengan parameter filter atau pencarian.
              </p>
            </div>
          ) : (
            <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-2xs">
              <div className="hidden lg:block">
                <RequestHistoryTable
                  requests={allRequests}
                  mode="reviewer"
                  onSelect={(req) => setSelectedReviewRequest(req as RequestWithRelations)}
                />
              </div>
              <div className="lg:hidden">
                <RequestHistoryCard
                  requests={allRequests}
                  mode="reviewer"
                  onSelect={(req) => setSelectedReviewRequest(req as RequestWithRelations)}
                />
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
        /* VIEW 2: PERSONAL REQUESTS VIEW (Employee History view)                    */
        /* ========================================================================= */
        <div className="space-y-4">
          {/* Desktop Only: Status Summary Cards (>= 1024px) */}
          {!isUnlinked && (
            <div className="hidden lg:block">
              <RequestSummaryCards
                requests={myRequests}
                selectedStatus={myFilterValues.status}
                onSelectStatus={(st) =>
                  setMyFilterValues((prev) => ({ ...prev, status: st }))
                }
              />
            </div>
          )}

          {/* Desktop Only: Full Search & Filters (>= 1024px) */}
          {!isUnlinked && (
            <div className="hidden lg:block">
              <RequestHistoryFilters
                values={myFilterValues}
                onChange={setMyFilterValues}
                onReset={() =>
                  setMyFilterValues({
                    status: 'all',
                    requestType: 'all',
                    datePreset: 'all',
                    customStartDate: '',
                    customEndDate: '',
                    search: '',
                  })
                }
                showSearch={true}
                searchPlaceholder="Cari jenis pengajuan atau alasan..."
              />
            </div>
          )}

          {/* Mobile & Tablet Only: Unified Search + Filter Bar (< 1024px) */}
          {!isUnlinked && (
            <div className="lg:hidden">
              <RequestMobileSearchFilter
                search={myFilterValues.search}
                onSearchChange={(search) =>
                  setMyFilterValues((prev) => ({ ...prev, search }))
                }
                status={myFilterValues.status}
                onStatusChange={(status) =>
                  setMyFilterValues((prev) => ({ ...prev, status }))
                }
                placeholder="Cari pengajuan..."
              />
            </div>
          )}

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
                  Akun Anda belum terhubung dengan data pegawai. Silakan hubungi administrator sekolah untuk menghubungkan akun pengguna dengan profil pegawai.
                </p>
              </div>

              <div className="pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadMyRequests}
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
                onClick={loadMyRequests}
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
                  <div key={i} className="h-16 bg-[#F3F4F6] rounded-xl" />
                ))}
              </div>
            </div>
          ) : myRequests.length === 0 ? (
            /* Empty State: No requests at all */
            <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-10 text-center shadow-2xs space-y-4 font-sans">
              <div className="w-14 h-14 rounded-2xl bg-[#F9FAFB] text-[#9CA3AF] flex items-center justify-center mx-auto border border-[#E5E7EB]">
                <FileText className="w-7 h-7 text-[#9CA3AF]" />
              </div>

              <div className="space-y-1">
                <h4 className="text-base font-bold text-[#111827]">
                  Belum Ada Pengajuan
                </h4>
                <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
                  Anda belum pernah mengajukan permohonan. Klik tombol di bawah untuk membuat pengajuan baru.
                </p>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={() => setIsFormOpen(true)}
                className="text-xs bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold"
              >
                <Plus className="w-4 h-4 mr-1" />
                Buat Pengajuan
              </Button>
            </div>
          ) : filteredMyRequests.length === 0 ? (
            /* Filtered Empty State */
            <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl p-8 text-center shadow-2xs space-y-3 font-sans">
              <div className="w-12 h-12 rounded-2xl bg-[#F9FAFB] text-[#9CA3AF] flex items-center justify-center mx-auto border border-[#E5E7EB]">
                <SearchX className="w-6 h-6 text-[#9CA3AF]" />
              </div>
              <h4 className="text-sm font-bold text-[#111827]">
                Tidak Ada Permohonan yang Sesuai
              </h4>
              <p className="text-xs text-[#6B7280] max-w-sm mx-auto">
                Tidak ada data histori permohonan yang cocok dengan filter atau kata kunci pencarian Anda.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setMyFilterValues({
                    status: 'all',
                    requestType: 'all',
                    datePreset: 'all',
                    customStartDate: '',
                    customEndDate: '',
                    search: '',
                  })
                }
                className="text-xs mt-1"
              >
                Reset Semua Filter
              </Button>
            </div>
          ) : (
            /* Personal Request List Content */
            <>
              {/* Desktop Table View (>= 1024px) */}
              <div className="hidden lg:block bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-2xs">
                <RequestHistoryTable
                  requests={filteredMyRequests}
                  mode="employee"
                  onSelect={(req) => setSelectedMyRequest(req)}
                />
              </div>

              {/* Mobile & Tablet Card List View (< 1024px) */}
              <div className="lg:hidden space-y-3 font-sans">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  DAFTAR PENGAJUAN
                </h3>
                <div className="space-y-3">
                  {filteredMyRequests.map((req) => (
                    <RequestMobileCard
                      key={req.id}
                      request={req}
                      onSelect={(r) => setSelectedMyRequest(r)}
                    />
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Form Modal for Personal Request */}
          <RequestFormModal
            isOpen={isFormOpen}
            onClose={() => setIsFormOpen(false)}
            onSuccess={loadMyRequests}
          />

          {/* Detail Modal for Personal Request */}
          <RequestDetailModal
            request={selectedMyRequest}
            isOpen={!!selectedMyRequest}
            onClose={() => setSelectedMyRequest(null)}
            onSuccessCancel={loadMyRequests}
          />
        </div>
      )}
    </div>
  );
};
