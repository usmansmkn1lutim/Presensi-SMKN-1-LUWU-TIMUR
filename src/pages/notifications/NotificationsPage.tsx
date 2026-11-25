import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  FileText,
  UserCheck,
  Megaphone,
  CheckCheck,
  RotateCw,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Filter,
  Inbox,
  Check,
} from 'lucide-react';
import { Button } from '../../components/ui/Button';
import { useNotifications } from '../../context/NotificationContext';
import { notificationService } from '../../services/notificationService';
import { NotificationRow } from '../../types/database.types';
import { formatRelativeTime, formatFullDateTime } from '../../utils/dateUtils';

type FilterTab = 'all' | 'unread' | 'requests' | 'attendance' | 'system';

export const NotificationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { unreadCount, markAsRead, markAllAsRead, refreshNotifications } = useNotifications();

  const [activeTab, setActiveTab] = useState<FilterTab>('all');
  const [notifications, setNotifications] = useState<NotificationRow[]>([]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [pageSize] = useState<number>(15);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [isMarkingAll, setIsMarkingAll] = useState<boolean>(false);

  const fetchPageNotifications = useCallback(
    async (targetPage: number = 1, isManualRefresh: boolean = false) => {
      try {
        if (isManualRefresh) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }
        setError(null);

        const offset = (targetPage - 1) * pageSize;
        const filterParams: {
          isRead?: boolean;
          type?: string;
          limit: number;
          offset: number;
        } = {
          limit: pageSize,
          offset,
        };

        if (activeTab === 'unread') {
          filterParams.isRead = false;
        }

        const result = await notificationService.getMyNotifications(filterParams);

        // Apply tab-based category filtering on client if specific category tab is selected
        let filteredData = result.data;
        if (activeTab === 'requests') {
          filteredData = filteredData.filter(
            (n) => n.notification_type.startsWith('request_') || n.related_entity_type === 'request'
          );
        } else if (activeTab === 'attendance') {
          filteredData = filteredData.filter(
            (n) => n.notification_type.startsWith('attendance_') || n.related_entity_type === 'attendance'
          );
        } else if (activeTab === 'system') {
          filteredData = filteredData.filter(
            (n) =>
              n.notification_type.startsWith('system_') ||
              n.notification_type.startsWith('account_') ||
              n.notification_type.startsWith('role_')
          );
        }

        setNotifications(filteredData);
        setTotalCount(activeTab === 'all' || activeTab === 'unread' ? result.count : filteredData.length);
        setPage(targetPage);
      } catch (err: unknown) {
        const msg = (err instanceof Error ? err.message : String(err || '')).toLowerCase();
        if (
          msg.includes('schema cache') ||
          msg.includes('pgrst205') ||
          msg.includes('pgrst202') ||
          msg.includes('notifications') ||
          msg.includes('failed to fetch') ||
          msg.includes('fetch') ||
          msg.includes('network')
        ) {
          setError(null);
          setNotifications([]);
          setTotalCount(0);
        } else {
          setError(err instanceof Error ? err.message : 'Gagal memuat notifikasi.');
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeTab, pageSize]
  );

  useEffect(() => {
    fetchPageNotifications(1);
  }, [fetchPageNotifications]);

  const handleTabChange = (tab: FilterTab) => {
    setActiveTab(tab);
    setPage(1);
  };

  const handleManualRefresh = async () => {
    await Promise.all([fetchPageNotifications(page, true), refreshNotifications()]);
  };

  const handleItemMarkAsRead = async (notificationId: string) => {
    try {
      setActionLoadingId(notificationId);
      const success = await markAsRead(notificationId);
      if (success) {
        setNotifications((prev) =>
          prev.map((item) =>
            item.id === notificationId
              ? { ...item, is_read: true, read_at: new Date().toISOString() }
              : item
          )
        );
        if (activeTab === 'unread') {
          setNotifications((prev) => prev.filter((item) => item.id !== notificationId));
        }
      }
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleMarkAll = async () => {
    try {
      setIsMarkingAll(true);
      await markAllAsRead();
      setNotifications((prev) =>
        prev.map((item) => ({ ...item, is_read: true, read_at: new Date().toISOString() }))
      );
      if (activeTab === 'unread') {
        setNotifications([]);
      }
    } finally {
      setIsMarkingAll(false);
    }
  };

  const handleNavigateToEntity = async (item: NotificationRow) => {
    if (!item.is_read) {
      await markAsRead(item.id);
    }

    if (item.related_entity_type === 'request' || item.notification_type.startsWith('request_')) {
      navigate('/requests');
    } else if (
      item.related_entity_type === 'attendance' ||
      item.notification_type.startsWith('attendance_')
    ) {
      navigate('/attendance');
    } else if (item.related_entity_type === 'employee') {
      navigate('/employees');
    } else if (item.related_entity_type === 'profile') {
      navigate('/profile');
    }
  };

  const renderIcon = (type: string) => {
    switch (type) {
      case 'request_approved':
        return (
          <div className="w-10 h-10 rounded-2xl bg-[#DCFCE7] dark:bg-emerald-950/60 text-[#16A34A] dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-2xs">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        );
      case 'request_rejected':
        return (
          <div className="w-10 h-10 rounded-2xl bg-[#FEE2E2] dark:bg-red-950/60 text-[#DC2626] dark:text-red-400 flex items-center justify-center shrink-0 shadow-2xs">
            <XCircle className="w-5 h-5" />
          </div>
        );
      case 'request_submitted':
      case 'request_cancelled':
        return (
          <div className="w-10 h-10 rounded-2xl bg-[#EFF6FF] dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 flex items-center justify-center shrink-0 shadow-2xs">
            <FileText className="w-5 h-5" />
          </div>
        );
      case 'attendance_late':
        return (
          <div className="w-10 h-10 rounded-2xl bg-[#FEF3C7] dark:bg-amber-950/60 text-[#D97706] dark:text-amber-400 flex items-center justify-center shrink-0 shadow-2xs">
            <Clock className="w-5 h-5" />
          </div>
        );
      case 'attendance_checkin':
      case 'attendance_checkout':
        return (
          <div className="w-10 h-10 rounded-2xl bg-[#F0FDF4] dark:bg-emerald-950/60 text-[#16A34A] dark:text-emerald-400 flex items-center justify-center shrink-0 shadow-2xs">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        );
      case 'account_linked':
      case 'account_unlinked':
      case 'role_updated':
        return (
          <div className="w-10 h-10 rounded-2xl bg-[#F3E8FF] dark:bg-purple-950/60 text-[#9333EA] dark:text-purple-400 flex items-center justify-center shrink-0 shadow-2xs">
            <UserCheck className="w-5 h-5" />
          </div>
        );
      case 'system_announcement':
      case 'system_alert':
        return (
          <div className="w-10 h-10 rounded-2xl bg-[#FFEDD5] dark:bg-[#431F0B] text-[#EA580C] dark:text-[#FDBA74] flex items-center justify-center shrink-0 shadow-2xs">
            <Megaphone className="w-5 h-5" />
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-2xl bg-[#F3F4F6] dark:bg-[#303030] text-[#6B7280] dark:text-[#A3A3A3] flex items-center justify-center shrink-0 shadow-2xs">
            <AlertCircle className="w-5 h-5" />
          </div>
        );
    }
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  return (
    <div className="space-y-6">
      {/* Header Banner Mobile/Tablet (< 1024px) */}
      <div className="lg:hidden bg-[#FFFFFF] dark:bg-[#262626] border border-[#E5E7EB] dark:border-[#404040] rounded-2xl p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF] dark:text-[#A3A3A3]">
                Pusat Pesan
              </span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#FFEDD5] dark:bg-[#431F0B] text-[#EA580C] dark:text-[#FDBA74]">
                  {unreadCount} belum dibaca
                </span>
              )}
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-[#111827] dark:text-[#F9FAFB] mt-0.5">
              Notifikasi & Pengumuman
            </h2>
            <p className="text-xs text-[#6B7280] dark:text-[#A3A3A3] mt-1">
              Pemberitahuan presensi harian, status izin/cuti, dan pengumuman sekolah
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              disabled={refreshing || loading}
              leftIcon={<RotateCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />}
            >
              Refresh
            </Button>

            {unreadCount > 0 && (
              <Button
                variant="primary"
                size="sm"
                onClick={handleMarkAll}
                disabled={isMarkingAll || loading}
                leftIcon={<CheckCheck className="w-3.5 h-3.5" />}
              >
                {isMarkingAll ? 'Menandai...' : 'Tandai Semua Telah Dibaca'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Header Desktop Only (>= 1024px) */}
      <div className="hidden lg:flex items-center justify-between gap-4">
        <h1 className="text-xl sm:text-2xl font-bold text-[#111827] dark:text-[#F9FAFB] tracking-tight">
          Notifikasi & Pengumuman
        </h1>

        {unreadCount > 0 && (
          <Button
            variant="primary"
            size="sm"
            onClick={handleMarkAll}
            disabled={isMarkingAll || loading}
            leftIcon={<CheckCheck className="w-3.5 h-3.5" />}
          >
            {isMarkingAll ? 'Menandai...' : 'Tandai Semua Telah Dibaca'}
          </Button>
        )}
      </div>

      {/* Filter Tabs Navigation */}
      <div className="bg-[#FFFFFF] dark:bg-[#262626] border border-[#E5E7EB] dark:border-[#404040] rounded-2xl p-1.5 sm:p-2 shadow-2xs lg:bg-transparent dark:lg:bg-transparent lg:border-0 lg:p-0 lg:shadow-none lg:rounded-none">
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          <button
            type="button"
            onClick={() => handleTabChange('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] ${
              activeTab === 'all'
                ? 'bg-[#F97316] text-white shadow-xs'
                : 'text-[#6B7280] dark:text-[#A3A3A3] hover:text-[#111827] dark:hover:text-[#F9FAFB] hover:bg-[#F3F4F6] dark:hover:bg-[#303030]'
            }`}
          >
            Semua Notifikasi
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('unread')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] ${
              activeTab === 'unread'
                ? 'bg-[#F97316] text-white shadow-xs'
                : 'text-[#6B7280] dark:text-[#A3A3A3] hover:text-[#111827] dark:hover:text-[#F9FAFB] hover:bg-[#F3F4F6] dark:hover:bg-[#303030]'
            }`}
          >
            <span>Belum Dibaca</span>
            {unreadCount > 0 && (
              <span
                className={`text-[10px] font-bold px-1.5 py-0.2 rounded-full ${
                  activeTab === 'unread'
                    ? 'bg-white text-[#F97316]'
                    : 'bg-[#FFEDD5] dark:bg-[#431F0B] text-[#EA580C] dark:text-[#FDBA74]'
                }`}
              >
                {unreadCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('requests')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] ${
              activeTab === 'requests'
                ? 'bg-[#F97316] text-white shadow-xs'
                : 'text-[#6B7280] dark:text-[#A3A3A3] hover:text-[#111827] dark:hover:text-[#F9FAFB] hover:bg-[#F3F4F6] dark:hover:bg-[#303030]'
            }`}
          >
            Pengajuan
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('attendance')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] ${
              activeTab === 'attendance'
                ? 'bg-[#F97316] text-white shadow-xs'
                : 'text-[#6B7280] dark:text-[#A3A3A3] hover:text-[#111827] dark:hover:text-[#F9FAFB] hover:bg-[#F3F4F6] dark:hover:bg-[#303030]'
            }`}
          >
            Presensi
          </button>

          <button
            type="button"
            onClick={() => handleTabChange('system')}
            className={`px-3.5 py-2 rounded-xl text-xs font-semibold transition-all whitespace-nowrap cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] ${
              activeTab === 'system'
                ? 'bg-[#F97316] text-white shadow-xs'
                : 'text-[#6B7280] dark:text-[#A3A3A3] hover:text-[#111827] dark:hover:text-[#F9FAFB] hover:bg-[#F3F4F6] dark:hover:bg-[#303030]'
            }`}
          >
            Sistem & Info
          </button>
        </div>
      </div>

      {/* Notifications List Container */}
      <div className="bg-[#FFFFFF] dark:bg-[#262626] border border-[#E5E7EB] dark:border-[#404040] rounded-2xl shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-6 space-y-4">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="flex items-start gap-4 p-4 border border-[#F3F4F6] dark:border-[#404040] rounded-2xl animate-pulse">
                <div className="w-10 h-10 rounded-2xl bg-[#E5E7EB] dark:bg-[#303030] shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="h-4 bg-[#E5E7EB] dark:bg-[#303030] rounded-md w-1/3" />
                  <div className="h-3 bg-[#F3F4F6] dark:bg-[#303030] rounded-md w-3/4" />
                  <div className="h-3 bg-[#F3F4F6] dark:bg-[#303030] rounded-md w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#FEE2E2] dark:bg-red-950/60 text-[#DC2626] dark:text-red-400 flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Gagal Memuat Notifikasi</h4>
            <p className="text-xs text-[#6B7280] dark:text-[#A3A3A3] max-w-sm mx-auto mt-1.5">{error}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={handleManualRefresh}
              className="mt-4 inline-flex items-center gap-1.5 dark:border-[#404040] dark:text-[#F9FAFB] dark:hover:bg-[#303030]"
            >
              <RotateCw className="w-3.5 h-3.5" />
              <span>Coba Lagi</span>
            </Button>
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#F3F4F6] dark:bg-[#303030] text-[#9CA3AF] dark:text-[#A3A3A3] flex items-center justify-center mx-auto mb-4">
              <Inbox className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">
              {activeTab === 'unread' ? 'Semua Notifikasi Telah Dibaca' : 'Tidak Ada Notifikasi'}
            </h4>
            <p className="text-xs text-[#6B7280] dark:text-[#A3A3A3] max-w-sm mx-auto mt-1.5">
              {activeTab === 'unread'
                ? 'Bagus! Anda telah membaca semua notifikasi terbaru.'
                : 'Pemberitahuan persetujuan izin, status presensi, dan pengumuman sekolah akan ditampilkan di sini.'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#E5E7EB] dark:divide-[#404040]">
            {notifications.map((item) => {
              const hasDeepLink = !!(
                item.related_entity_type ||
                item.notification_type.startsWith('request_') ||
                item.notification_type.startsWith('attendance_')
              );

              return (
                <div
                  key={item.id}
                  className={`p-4 sm:p-5 transition-colors flex flex-col sm:flex-row sm:items-start justify-between gap-4 ${
                    !item.is_read
                      ? 'bg-[#FFFBEB]/30 dark:bg-[#431F0B]/25 hover:bg-[#FFFBEB]/50 dark:hover:bg-[#431F0B]/35'
                      : 'hover:bg-[#F9FAFB] dark:hover:bg-[#303030]/60'
                  }`}
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    {renderIcon(item.notification_type)}

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h4
                          className={`text-sm ${
                            !item.is_read ? 'font-bold text-[#111827] dark:text-[#F9FAFB]' : 'font-semibold text-[#374151] dark:text-[#D4D4D4]'
                          }`}
                        >
                          {item.title}
                        </h4>
                        {!item.is_read && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FFEDD5] dark:bg-[#431F0B] text-[#EA580C] dark:text-[#FDBA74] uppercase tracking-wider">
                            Baru
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-[#4B5563] dark:text-[#D4D4D4] leading-relaxed whitespace-pre-line">
                        {item.message}
                      </p>

                      <div className="flex items-center gap-3 mt-2 text-[11px] text-[#9CA3AF] dark:text-[#A3A3A3] font-medium flex-wrap">
                        <span title={formatFullDateTime(item.created_at)}>
                          {formatRelativeTime(item.created_at)}
                        </span>

                        {item.is_read && item.read_at && (
                          <>
                            <span>•</span>
                            <span className="text-[#6B7280] dark:text-[#A3A3A3] flex items-center gap-1">
                              <Check className="w-3 h-3 text-[#16A34A] dark:text-emerald-400" />
                              <span>Dibaca {formatRelativeTime(item.read_at)}</span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions on Item */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-start pt-1">
                    {!item.is_read && (
                      <button
                        type="button"
                        onClick={() => handleItemMarkAsRead(item.id)}
                        disabled={actionLoadingId === item.id}
                        className="px-2.5 py-1.5 rounded-xl border border-[#E5E7EB] dark:border-[#404040] bg-white dark:bg-[#303030] text-xs font-medium text-[#374151] dark:text-[#F9FAFB] hover:bg-[#F3F4F6] dark:hover:bg-[#404040] transition-colors disabled:opacity-50 cursor-pointer flex items-center gap-1 shadow-2xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316]"
                        title="Tandai telah dibaca"
                      >
                        <Check className="w-3.5 h-3.5 text-[#16A34A] dark:text-emerald-400" />
                        <span>Tandai Dibaca</span>
                      </button>
                    )}

                    {hasDeepLink && (
                      <button
                        type="button"
                        onClick={() => handleNavigateToEntity(item)}
                        className="px-3 py-1.5 rounded-xl bg-[#F97316] text-white text-xs font-semibold hover:bg-[#EA580C] transition-colors cursor-pointer flex items-center gap-1 shadow-2xs focus:outline-none focus-visible:ring-2 focus-visible:ring-[#F97316] focus-visible:ring-offset-2 dark:focus-visible:ring-offset-[#262626]"
                      >
                        <span>Lihat Detail</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {!loading && notifications.length > 0 && (
          <div className="px-5 py-4 border-t border-[#E5E7EB] dark:border-[#404040] flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#F9FAFB] dark:bg-[#303030]/40">
            <p className="text-xs text-[#6B7280] dark:text-[#A3A3A3]">
              Menampilkan <span className="font-semibold text-[#111827] dark:text-[#F9FAFB]">{notifications.length}</span>{' '}
              dari <span className="font-semibold text-[#111827] dark:text-[#F9FAFB]">{totalCount}</span> notifikasi
            </p>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchPageNotifications(page - 1)}
                disabled={page <= 1 || loading}
                className="flex items-center gap-1 dark:border-[#404040] dark:text-[#F9FAFB] dark:hover:bg-[#303030]"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span>Sebelumnya</span>
              </Button>

              <span className="text-xs font-semibold px-2 text-[#374151] dark:text-[#D4D4D4]">
                {page} / {totalPages}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => fetchPageNotifications(page + 1)}
                disabled={page >= totalPages || loading}
                className="flex items-center gap-1 dark:border-[#404040] dark:text-[#F9FAFB] dark:hover:bg-[#303030]"
              >
                <span>Berikutnya</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
