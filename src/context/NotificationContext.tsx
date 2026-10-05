import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { notificationService } from '../services/notificationService';
import { NotificationRow } from '../types/database.types';

interface NotificationContextType {
  unreadCount: number;
  recentNotifications: NotificationRow[];
  loading: boolean;
  error: string | null;
  refreshNotifications: () => Promise<void>;
  markAsRead: (id: string) => Promise<boolean>;
  markAllAsRead: () => Promise<number>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [recentNotifications, setRecentNotifications] = useState<NotificationRow[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    try {
      const count = await notificationService.getUnreadCount();
      setUnreadCount(count);
    } catch {
      // Fallback
    }
  }, [user]);

  const fetchRecentNotifications = useCallback(async () => {
    if (!user) {
      setRecentNotifications([]);
      setUnreadCount(0);
      return;
    }
    try {
      setLoading(true);
      setError(null);
      const [countResult, listResult] = await Promise.all([
        notificationService.getUnreadCount(),
        notificationService.getMyNotifications({ limit: 7 }),
      ]);
      setUnreadCount(countResult);
      setRecentNotifications(listResult.data);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat notifikasi.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchRecentNotifications();
    } else {
      setUnreadCount(0);
      setRecentNotifications([]);
    }
  }, [user, fetchRecentNotifications]);

  const markAsRead = useCallback(async (id: string): Promise<boolean> => {
    if (!user || !id) return false;

    // Optimistic UI update
    setRecentNotifications((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, is_read: true, read_at: new Date().toISOString() } : item
      )
    );
    setUnreadCount((prev) => Math.max(0, prev - 1));

    try {
      const success = await notificationService.markAsRead(id);
      if (!success) {
        // Rollback if needed
        await fetchUnreadCount();
      }
      return success;
    } catch (err) {
      console.warn('markAsRead error:', err);
      await fetchUnreadCount();
      return false;
    }
  }, [user, fetchUnreadCount]);

  const markAllAsRead = useCallback(async (): Promise<number> => {
    if (!user) return 0;

    // Optimistic UI update
    setRecentNotifications((prev) =>
      prev.map((item) => ({ ...item, is_read: true, read_at: new Date().toISOString() }))
    );
    setUnreadCount(0);

    try {
      const updatedCount = await notificationService.markAllAsRead();
      await fetchUnreadCount();
      return updatedCount;
    } catch (err) {
      console.warn('markAllAsRead error:', err);
      await fetchRecentNotifications();
      return 0;
    }
  }, [user, fetchUnreadCount, fetchRecentNotifications]);

  return (
    <NotificationContext.Provider
      value={{
        unreadCount,
        recentNotifications,
        loading,
        error,
        refreshNotifications: fetchRecentNotifications,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = (): NotificationContextType => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
