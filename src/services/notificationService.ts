import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { NotificationRow } from '../types/database.types';

export interface CreateNotificationInput {
  recipient_user_id: string;
  notification_type:
    | 'request_submitted'
    | 'request_approved'
    | 'request_rejected'
    | 'request_cancelled'
    | 'attendance_checkin'
    | 'attendance_late'
    | 'attendance_checkout'
    | 'account_linked'
    | 'account_unlinked'
    | 'role_updated'
    | 'system_announcement'
    | 'system_alert';
  title: string;
  message: string;
  related_entity_type?: 'request' | 'attendance' | 'employee' | 'profile' | 'location' | 'system' | 'announcement' | null;
  related_entity_id?: string | null;
  metadata?: Record<string, any>;
}

export interface NotificationFilterParams {
  isRead?: boolean;
  type?: string;
  limit?: number;
  offset?: number;
}

/**
 * Service Layer for In-App Notifications (PHASE 8C Backend Integration)
 *
 * Security & Data Access:
 * - Querying notifications is guarded by database RLS (recipient_user_id = auth.uid()).
 * - Mark as read / mark all as read mutations are executed via atomic SECURITY DEFINER RPCs.
 * - Notification creation is restricted to authorized administrative roles via create_notification RPC.
 * - Ordinary employees cannot directly insert or inject notifications.
 */
class NotificationService {
  /**
   * Fetch unread notification count for the current authenticated user.
   * Invokes fast SECURITY DEFINER RPC `get_unread_notification_count()`.
   */
  async getUnreadCount(): Promise<number> {
    if (!isSupabaseConfigured()) {
      return 0;
    }

    try {
      const { data, error } = await supabase.rpc('get_unread_notification_count');
      if (error) {
        console.warn('NotificationService.getUnreadCount error:', error.message);
        return 0;
      }
      return data || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Fetch notifications for the current authenticated user.
   * Guarded strictly by PostgreSQL RLS: recipient_user_id = auth.uid().
   */
  async getMyNotifications(params?: NotificationFilterParams): Promise<{
    data: NotificationRow[];
    count: number;
  }> {
    if (!isSupabaseConfigured()) {
      return { data: [], count: 0 };
    }

    let query = supabase
      .from('notifications')
      .select('*', { count: 'exact' });

    if (params?.isRead !== undefined) {
      query = query.eq('is_read', params.isRead);
    }

    if (params?.type && params.type !== 'all') {
      query = query.eq('notification_type', params.type);
    }

    query = query.order('created_at', { ascending: false });

    if (params?.limit) {
      const from = params.offset || 0;
      const to = from + params.limit - 1;
      query = query.range(from, to);
    }

    const { data, count, error } = await query;

    if (error) {
      console.error('NotificationService.getMyNotifications error:', error.message);
      throw new Error(error.message || 'Gagal memuat daftar notifikasi.');
    }

    return {
      data: (data as unknown as NotificationRow[]) || [],
      count: count || 0,
    };
  }

  /**
   * Mark a single notification as read for the authenticated user.
   * Invokes atomic SECURITY DEFINER RPC `mark_notification_read(p_notification_id)`.
   */
  async markAsRead(notificationId: string): Promise<boolean> {
    if (!isSupabaseConfigured()) {
      return false;
    }

    if (!notificationId) {
      throw new Error('ID notifikasi wajib disertakan.');
    }

    const { data, error } = await supabase.rpc('mark_notification_read', {
      p_notification_id: notificationId,
    });

    if (error) {
      console.error('NotificationService.markAsRead error:', error.message);
      throw new Error(error.message || 'Gagal menandai notifikasi sebagai dibaca.');
    }

    return !!data;
  }

  /**
   * Mark all unread notifications as read for the authenticated user.
   * Invokes atomic SECURITY DEFINER RPC `mark_all_notifications_read()`.
   */
  async markAllAsRead(): Promise<number> {
    if (!isSupabaseConfigured()) {
      return 0;
    }

    const { data, error } = await supabase.rpc('mark_all_notifications_read');

    if (error) {
      console.error('NotificationService.markAllAsRead error:', error.message);
      throw new Error(error.message || 'Gagal menandai semua notifikasi.');
    }

    return data || 0;
  }

  /**
   * Create a new notification via trusted SECURITY DEFINER RPC `create_notification`.
   * Authorization: restricted to active super_admin, admin, and headmaster.
   */
  async createNotification(input: CreateNotificationInput): Promise<{
    success: boolean;
    is_duplicate: boolean;
    notification?: NotificationRow;
  }> {
    if (!isSupabaseConfigured()) {
      throw new Error('Konfigurasi Supabase belum tersedia.');
    }

    const { data, error } = await supabase.rpc('create_notification', {
      p_recipient_user_id: input.recipient_user_id,
      p_notification_type: input.notification_type,
      p_title: input.title,
      p_message: input.message,
      p_related_entity_type: input.related_entity_type || null,
      p_related_entity_id: input.related_entity_id || null,
      p_metadata: input.metadata || {},
    });

    if (error) {
      console.error('NotificationService.createNotification error:', error.message);
      throw new Error(error.message || 'Gagal membuat notifikasi.');
    }

    return data as {
      success: boolean;
      is_duplicate: boolean;
      notification?: NotificationRow;
    };
  }
}

export const notificationService = new NotificationService();
