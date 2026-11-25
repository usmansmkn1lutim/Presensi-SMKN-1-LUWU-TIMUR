import React, { useState, useRef, useEffect } from 'react';
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
  ExternalLink,
  Loader2,
} from 'lucide-react';
import { useNotifications } from '../../context/NotificationContext';
import { formatRelativeTime } from '../../utils/dateUtils';
import { NotificationRow } from '../../types/database.types';

export const NotificationBell: React.FC = () => {
  const { unreadCount, recentNotifications, loading, error, refreshNotifications, markAsRead, markAllAsRead } =
    useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const [isMarkingAll, setIsMarkingAll] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleToggle = () => {
    if (!isOpen) {
      refreshNotifications();
    }
    setIsOpen((prev) => !prev);
  };

  const handleNotificationClick = async (notification: NotificationRow) => {
    if (!notification.is_read) {
      await markAsRead(notification.id);
    }
    setIsOpen(false);

    // Deep link routing based on related_entity_type or notification_type
    if (notification.related_entity_type === 'request' || notification.notification_type.startsWith('request_')) {
      navigate('/requests');
    } else if (
      notification.related_entity_type === 'attendance' ||
      notification.notification_type.startsWith('attendance_')
    ) {
      navigate('/attendance');
    } else if (notification.related_entity_type === 'employee') {
      navigate('/employees');
    } else if (notification.related_entity_type === 'profile') {
      navigate('/profile');
    } else {
      navigate('/notifications');
    }
  };

  const handleMarkAll = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      setIsMarkingAll(true);
      await markAllAsRead();
    } finally {
      setIsMarkingAll(false);
    }
  };

  // Helper to render distinct icon based on notification type
  const renderNotificationIcon = (type: string) => {
    switch (type) {
      case 'request_approved':
        return (
          <div className="w-8 h-8 rounded-xl bg-[#DCFCE7] dark:bg-emerald-950/60 text-[#16A34A] dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        );
      case 'request_rejected':
        return (
          <div className="w-8 h-8 rounded-xl bg-[#FEE2E2] dark:bg-red-950/60 text-[#DC2626] dark:text-red-400 flex items-center justify-center shrink-0">
            <XCircle className="w-4 h-4" />
          </div>
        );
      case 'request_submitted':
      case 'request_cancelled':
        return (
          <div className="w-8 h-8 rounded-xl bg-[#EFF6FF] dark:bg-blue-950/60 text-[#2563EB] dark:text-blue-400 flex items-center justify-center shrink-0">
            <FileText className="w-4 h-4" />
          </div>
        );
      case 'attendance_late':
        return (
          <div className="w-8 h-8 rounded-xl bg-[#FEF3C7] dark:bg-amber-950/60 text-[#D97706] dark:text-amber-400 flex items-center justify-center shrink-0">
            <Clock className="w-4 h-4" />
          </div>
        );
      case 'attendance_checkin':
      case 'attendance_checkout':
        return (
          <div className="w-8 h-8 rounded-xl bg-[#F0FDF4] dark:bg-emerald-950/60 text-[#16A34A] dark:text-emerald-400 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        );
      case 'account_linked':
      case 'account_unlinked':
      case 'role_updated':
        return (
          <div className="w-8 h-8 rounded-xl bg-[#F3E8FF] dark:bg-purple-950/60 text-[#9333EA] dark:text-purple-400 flex items-center justify-center shrink-0">
            <UserCheck className="w-4 h-4" />
          </div>
        );
      case 'system_announcement':
      case 'system_alert':
        return (
          <div className="w-8 h-8 rounded-xl bg-[#FFEDD5] dark:bg-orange-950/60 text-[#EA580C] dark:text-orange-400 flex items-center justify-center shrink-0">
            <Megaphone className="w-4 h-4" />
          </div>
        );
      default:
        return (
          <div className="w-8 h-8 rounded-xl bg-[#F3F4F6] dark:bg-[#303030] text-[#6B7280] dark:text-[#A3A3A3] flex items-center justify-center shrink-0">
            <AlertCircle className="w-4 h-4" />
          </div>
        );
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={handleToggle}
        aria-label="Pemberitahuan"
        aria-expanded={isOpen}
        aria-haspopup="true"
        className={`relative p-2 rounded-xl transition-all cursor-pointer ${
          isOpen
            ? 'bg-[#F3F4F6] dark:bg-[#303030] text-[#111827] dark:text-[#F9FAFB]'
            : 'text-[#6B7280] dark:text-[#A3A3A3] hover:text-[#111827] dark:hover:text-[#F9FAFB] hover:bg-[#F3F4F6] dark:hover:bg-[#303030]'
        }`}
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span
            className="absolute top-1 right-1 min-w-[18px] h-[18px] px-1 bg-[#F97316] text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs border-2 border-white dark:border-[#171717] animate-in zoom-in-50"
            aria-live="polite"
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Daftar Notifikasi"
          className="absolute right-0 mt-2 w-[340px] sm:w-[380px] max-w-[calc(100vw-32px)] bg-[#FFFFFF] dark:bg-[#262626] rounded-2xl shadow-xl border border-[#E5E7EB] dark:border-[#404040] z-50 overflow-hidden animate-in fade-in-80 slide-in-from-top-2"
        >
          {/* Header */}
          <div className="px-4 py-3.5 border-b border-[#E5E7EB] dark:border-[#404040] flex items-center justify-between bg-[#F9FAFB] dark:bg-[#303030]">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-[#111827] dark:text-[#F9FAFB]">Notifikasi</h3>
              {unreadCount > 0 && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#FFEDD5] dark:bg-orange-950/60 text-[#EA580C] dark:text-orange-300">
                  {unreadCount} baru
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAll}
                disabled={isMarkingAll}
                className="text-xs font-medium text-[#F97316] dark:text-orange-400 hover:text-[#EA580C] dark:hover:text-orange-300 disabled:opacity-50 flex items-center gap-1 transition-colors cursor-pointer"
              >
                {isMarkingAll ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCheck className="w-3.5 h-3.5" />
                )}
                <span>Tandai dibaca</span>
              </button>
            )}
          </div>

          {/* List Content */}
          <div className="max-h-[380px] overflow-y-auto divide-y divide-[#F3F4F6] dark:divide-[#404040]">
            {loading && recentNotifications.length === 0 ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="flex gap-3 animate-pulse">
                    <div className="w-8 h-8 rounded-xl bg-[#E5E7EB] dark:bg-[#404040] shrink-0" />
                    <div className="flex-1 space-y-1.5 py-0.5">
                      <div className="h-3.5 bg-[#E5E7EB] dark:bg-[#404040] rounded-md w-3/4" />
                      <div className="h-3 bg-[#F3F4F6] dark:bg-[#303030] rounded-md w-full" />
                      <div className="h-2.5 bg-[#F3F4F6] dark:bg-[#303030] rounded-md w-1/3 mt-1" />
                    </div>
                  </div>
                ))}
              </div>
            ) : error ? (
              <div className="p-6 text-center">
                <AlertCircle className="w-8 h-8 text-[#DC2626] dark:text-red-400 mx-auto mb-2" />
                <p className="text-xs font-semibold text-[#111827] dark:text-[#F9FAFB]">Gagal memuat notifikasi</p>
                <p className="text-[11px] text-[#6B7280] dark:text-[#A3A3A3] mt-0.5">{error}</p>
                <button
                  type="button"
                  onClick={() => refreshNotifications()}
                  className="mt-3 text-xs font-semibold text-[#F97316] dark:text-orange-400 hover:underline cursor-pointer"
                >
                  Coba lagi
                </button>
              </div>
            ) : recentNotifications.length === 0 ? (
              <div className="p-8 text-center">
                <div className="w-12 h-12 rounded-2xl bg-[#F3F4F6] dark:bg-[#303030] text-[#9CA3AF] dark:text-[#A3A3A3] flex items-center justify-center mx-auto mb-3">
                  <Bell className="w-6 h-6" />
                </div>
                <p className="text-sm font-bold text-[#111827] dark:text-[#F9FAFB]">Tidak Ada Notifikasi</p>
                <p className="text-xs text-[#6B7280] dark:text-[#A3A3A3] mt-1 max-w-[240px] mx-auto">
                  Pemberitahuan presensi, pengajuan, dan info sekolah akan muncul di sini.
                </p>
              </div>
            ) : (
              recentNotifications.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNotificationClick(item)}
                  className={`w-full text-left p-3.5 flex items-start gap-3 transition-colors hover:bg-[#F9FAFB] dark:hover:bg-[#303030] cursor-pointer ${
                    !item.is_read ? 'bg-[#FFFBEB]/40 dark:bg-amber-950/25' : ''
                  }`}
                >
                  {renderNotificationIcon(item.notification_type)}

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <p
                        className={`text-xs truncate ${
                          !item.is_read ? 'font-bold text-[#111827] dark:text-[#F9FAFB]' : 'font-semibold text-[#374151] dark:text-[#D4D4D4]'
                        }`}
                      >
                        {item.title}
                      </p>
                      {!item.is_read && (
                        <span
                          className="w-2 h-2 rounded-full bg-[#F97316] shrink-0"
                          title="Belum dibaca"
                        />
                      )}
                    </div>
                    <p className="text-xs text-[#6B7280] dark:text-[#A3A3A3] line-clamp-2 leading-relaxed">
                      {item.message}
                    </p>
                    <span className="text-[10px] text-[#9CA3AF] dark:text-[#737373] mt-1.5 block font-medium">
                      {formatRelativeTime(item.created_at)}
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-2.5 border-t border-[#E5E7EB] dark:border-[#404040] bg-[#F9FAFB] dark:bg-[#303030] text-center">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                navigate('/notifications');
              }}
              className="w-full py-1.5 px-3 rounded-xl text-xs font-semibold text-[#F97316] dark:text-orange-400 hover:bg-[#FFEDD5]/40 dark:hover:bg-orange-950/40 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Lihat Semua Notifikasi</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
