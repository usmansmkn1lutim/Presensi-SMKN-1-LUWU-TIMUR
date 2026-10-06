import { supabase } from '../lib/supabase';
import { AuditLogItem, AuditLogFilter } from '../types/auditLog.types';

function formatAuditError(err: unknown): Error {
  if (err instanceof Error) {
    const msg = err.message || '';
    if (msg.includes('row-level security') || msg.includes('permission denied')) {
      return new Error('Anda tidak memiliki wewenang untuk mengakses log audit.');
    }
    return err;
  }
  return new Error('Terjadi kesalahan saat memproses log audit.');
}

export const auditLogService = {
  /**
   * Fetch paginated audit logs with filters
   */
  async getAuditLogs(
    filter: AuditLogFilter = {},
    page = 1,
    pageSize = 20
  ): Promise<{ logs: AuditLogItem[]; totalCount: number }> {
    try {
      let query = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' });

      if (filter.actor_user_id) {
        query = query.eq('actor_user_id', filter.actor_user_id);
      }
      if (filter.action) {
        query = query.eq('action', filter.action);
      }
      if (filter.target_type) {
        query = query.eq('target_type', filter.target_type);
      }
      if (filter.target_id) {
        query = query.eq('target_id', filter.target_id);
      }
      if (filter.start_date) {
        query = query.gte('created_at', `${filter.start_date}T00:00:00Z`);
      }
      if (filter.end_date) {
        query = query.lte('created_at', `${filter.end_date}T23:59:59Z`);
      }

      // Order by created_at desc (newest first)
      query = query.order('created_at', { ascending: false });

      // Apply pagination
      const start = (page - 1) * pageSize;
      const end = start + pageSize - 1;
      query = query.range(start, end);

      const { data, count, error } = await query;

      if (error) throw error;

      return {
        logs: (data || []) as AuditLogItem[],
        totalCount: count || 0,
      };
    } catch (err) {
      console.error('Failed to fetch audit logs:', err);
      throw formatAuditError(err);
    }
  },

  /**
   * Writes a central audit log through PostgreSQL RPC helper write_audit_log
   */
  async writeAuditLog(
    action: string,
    targetType: string,
    targetId: string,
    reason: string | null = null,
    metadata: Record<string, any> = {}
  ): Promise<string> {
    try {
      const { data, error } = await (supabase as any).rpc('write_audit_log', {
        p_action: action,
        p_target_type: targetType,
        p_target_id: targetId,
        p_reason: reason,
        p_metadata: metadata,
      });

      if (error) throw error;
      return data as string;
    } catch (err) {
      console.error('Failed to write audit log:', err);
      throw formatAuditError(err);
    }
  },
};
