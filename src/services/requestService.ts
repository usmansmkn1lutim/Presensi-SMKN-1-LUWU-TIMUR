import { supabase } from '../lib/supabase';
import {
  RequestRow,
  RequestInsert,
  RequestWithRelations,
  RequestFilterParams,
  RequestDetailModel,
  normalizeRequestDetail,
} from '../types/request.types';
import { attendanceService } from './attendanceService';

/**
 * Maps Supabase / PostgreSQL / RPC errors to clear user-friendly Indonesian messages
 */
export const formatRequestError = (error: unknown): string => {
  if (!error) return 'Terjadi kesalahan sistem yang tidak diketahui.';

  const err = error as { code?: string; message?: string; details?: string };
  const message = err.message || '';
  const details = err.details || '';
  const combined = `${message} ${details}`.toLowerCase();

  // 1. Permission / RLS / Unauthorized (42501)
  if (
    err.code === '42501' ||
    combined.includes('permission denied') ||
    combined.includes('row-level security') ||
    combined.includes('unauthorized')
  ) {
    return 'Anda tidak memiliki hak akses untuk melakukan tindakan ini.';
  }

  // 2. Custom RPC messages from backend
  if (
    combined.includes('status pending') ||
    combined.includes('hanya permohonan dengan status pending')
  ) {
    return 'Permohonan ini sudah diproses atau statusnya sudah tidak dalam posisi menunggu.';
  }
  if (combined.includes('tidak ditemukan')) {
    return 'Data permohonan tidak ditemukan atau Anda tidak memiliki akses ke permohonan ini.';
  }
  if (combined.includes('catatan penolakan')) {
    return 'Catatan penolakan wajib diisi.';
  }
  if (combined.includes('tanggal mulai tidak boleh')) {
    return 'Tanggal mulai tidak boleh lebih besar dari tanggal selesai.';
  }
  if (combined.includes('belum terhubung')) {
    return 'Akun Anda belum terhubung dengan data pegawai.';
  }

  // 3. Schema cache / Missing table (PGRST205)
  if (
    err.code === 'PGRST205' ||
    combined.includes('pgrst205') ||
    combined.includes('schema cache')
  ) {
    return 'Layanan permohonan sedang dalam proses pembaruan skema sistem.';
  }

  // 4. Network error
  if (
    combined.includes('failed to fetch') ||
    combined.includes('network') ||
    combined.includes('timeout')
  ) {
    return 'Koneksi jaringan terputus. Silakan periksa koneksi internet Anda dan coba lagi.';
  }

  // Return clean generic message if safe
  if (
    message &&
    !message.includes('PGRST') &&
    !message.includes('column') &&
    !message.includes('syntax')
  ) {
    return message;
  }

  return 'Gagal memproses permohonan. Silakan coba beberapa saat lagi.';
};

/**
 * Service Layer for Employee Requests (Pengajuan & Tinjauan Permohonan Pegawai)
 *
 * Backend & Security Foundation:
 * - Employee request identity derived strictly from employees.profile_id = auth.uid()
 * - Reviewer authorization enforced by backend RLS & atomic RPCs (private.is_admin / private.is_headmaster)
 * - Atomic approval, rejection, and cancellation via safe SECURITY DEFINER RPCs
 * - Zero automatic attendance creation or mutation
 */
export const requestService = {
  /**
   * Submit a new employee request for the authenticated user.
   */
  async createMyRequest(payload: RequestInsert): Promise<RequestRow> {
    const { request_type, start_date, end_date, reason, attachment_url } = payload;

    // Client-side validation
    if (!request_type) {
      throw new Error('Jenis pengajuan wajib dipilih.');
    }
    if (!['leave', 'sick', 'official_duty', 'other'].includes(request_type)) {
      throw new Error('Jenis pengajuan tidak valid.');
    }
    if (!start_date || !end_date) {
      throw new Error('Tanggal mulai dan tanggal selesai wajib diisi.');
    }
    if (start_date > end_date) {
      throw new Error('Tanggal mulai tidak boleh lebih besar dari tanggal selesai.');
    }
    if (!reason || reason.trim().length === 0) {
      throw new Error('Alasan pengajuan wajib diisi.');
    }

    // Invoke atomic RPC create_my_request
    const { data, error } = await supabase.rpc('create_my_request', {
      p_request_type: request_type,
      p_start_date: start_date,
      p_end_date: end_date,
      p_reason: reason.trim(),
      p_attachment_url: attachment_url || null,
    });

    if (error) {
      console.error('Error creating request:', error);
      throw new Error(formatRequestError(error));
    }

    return data as RequestRow;
  },

  /**
   * Cancel a pending request owned by the authenticated employee.
   */
  async cancelMyRequest(requestId: string): Promise<RequestRow> {
    if (!requestId) {
      throw new Error('ID pengajuan wajib disertakan.');
    }

    const { data, error } = await supabase.rpc('cancel_my_request', {
      p_request_id: requestId,
    });

    if (error) {
      console.error('Error cancelling request:', error);
      throw new Error(formatRequestError(error));
    }

    return data as RequestRow;
  },

  /**
   * Approve a pending request (Administrators & Headmaster only).
   * Backend RPC verifies role and status atomically.
   */
  async approveRequest(requestId: string, reviewerNote?: string): Promise<RequestRow> {
    if (!requestId) {
      throw new Error('ID pengajuan wajib disertakan.');
    }

    const { data, error } = await supabase.rpc('approve_request', {
      p_request_id: requestId,
      p_reviewer_note: reviewerNote ? reviewerNote.trim() : null,
    });

    if (error) {
      console.error('Error approving request:', error);
      throw new Error(formatRequestError(error));
    }

    return data as RequestRow;
  },

  /**
   * Reject a pending request (Administrators & Headmaster only).
   * Backend RPC verifies role and requires non-empty rejection note.
   */
  async rejectRequest(requestId: string, reviewerNote?: string): Promise<RequestRow> {
    if (!requestId) {
      throw new Error('ID pengajuan wajib disertakan.');
    }
    if (!reviewerNote || reviewerNote.trim().length === 0) {
      throw new Error('Catatan penolakan wajib diisi.');
    }

    const { data, error } = await supabase.rpc('reject_request', {
      p_request_id: requestId,
      p_reviewer_note: reviewerNote.trim(),
    });

    if (error) {
      console.error('Error rejecting request:', error);
      throw new Error(formatRequestError(error));
    }

    return data as RequestRow;
  },

  /**
   * Fetch requests submitted by the authenticated logged-in employee.
   * Enforces strict employee ownership: auth.uid() -> profiles.id -> employees.profile_id = requests.employee_id.
   * Includes joined employee details and reviewer profile if reviewed.
   */
  async getMyRequests(params?: RequestFilterParams): Promise<{
    data: RequestWithRelations[];
    count: number;
  }> {
    const employee = await attendanceService.getCurrentEmployee();

    let query = supabase
      .from('requests')
      .select(
        `
        *,
        employees (
          id,
          full_name,
          nip,
          nik,
          employee_number,
          gender,
          photo_url,
          status,
          departments (
            name
          ),
          positions (
            name
          )
        ),
        reviewer_profile:profiles!reviewed_by (
          id,
          full_name,
          role
        )
      `,
        { count: 'exact' }
      )
      .eq('employee_id', employee.id);

    if (params?.status && params.status !== 'all') {
      query = query.eq('status', params.status);
    }

    if (params?.requestType && params.requestType !== 'all') {
      query = query.eq('request_type', params.requestType);
    }

    if (params?.startDate) {
      query = query.gte('start_date', params.startDate);
    }

    if (params?.endDate) {
      query = query.lte('end_date', params.endDate);
    }

    query = query.order('submitted_at', { ascending: false });

    if (params?.page && params?.pageSize) {
      const from = (params.page - 1) * params.pageSize;
      const to = from + params.pageSize - 1;
      query = query.range(from, to);
    }

    const { data, count, error } = await query;

    if (error) {
      if (
        (error as any).code === 'PGRST205' ||
        (error as any).message?.includes('schema cache')
      ) {
        return { data: [], count: 0 };
      }
      console.error('Error fetching my requests:', error);
      throw new Error(formatRequestError(error));
    }

    return {
      data: (data as unknown as RequestWithRelations[]) || [],
      count: count || 0,
    };
  },

  /**
   * Fetch a single request submitted by the authenticated logged-in employee.
   * Parameter is strictly requestId. Never accepts employeeId from client.
   * Validates ownership against the authenticated employee.
   */
  async getMyRequestById(requestId: string): Promise<RequestWithRelations | null> {
    if (!requestId) return null;

    const employee = await attendanceService.getCurrentEmployee();

    const { data, error } = await supabase
      .from('requests')
      .select(
        `
        *,
        employees (
          id,
          full_name,
          nip,
          nik,
          employee_number,
          gender,
          photo_url,
          status,
          departments (
            name
          ),
          positions (
            name
          )
        ),
        reviewer_profile:profiles!reviewed_by (
          id,
          full_name,
          role
        )
      `
      )
      .eq('id', requestId)
      .eq('employee_id', employee.id)
      .maybeSingle();

    if (error) {
      if (
        (error as any).code === 'PGRST205' ||
        (error as any).message?.includes('schema cache')
      ) {
        return null;
      }
      console.error('Error fetching my request by ID:', error);
      throw new Error(formatRequestError(error));
    }

    return (data as unknown as RequestWithRelations) || null;
  },

  /**
   * Fetch a normalized detail model for an employee's own request.
   */
  async getMyRequestDetail(requestId: string): Promise<RequestDetailModel | null> {
    const raw = await this.getMyRequestById(requestId);
    if (!raw) return null;
    return normalizeRequestDetail(raw);
  },

  /**
   * Fetch all requests across all employees for administrative management (Admins & Headmaster).
   * Backend RLS restricts query results strictly to active super_admin, admin, and headmaster roles.
   */
  async getAllRequests(params?: RequestFilterParams): Promise<{
    data: RequestWithRelations[];
    count: number;
  }> {
    let query = supabase
      .from('requests')
      .select(
        `
        *,
        employees (
          id,
          full_name,
          nip,
          nik,
          employee_number,
          gender,
          photo_url,
          status,
          departments (
            name
          ),
          positions (
            name
          )
        ),
        reviewer_profile:profiles!reviewed_by (
          id,
          full_name,
          role
        )
      `,
        { count: 'exact' }
      );

    if (params?.search && params.search.trim()) {
      const searchTerm = `%${params.search.trim()}%`;
      const { data: matchedEmployees, error: empErr } = await supabase
        .from('employees')
        .select('id')
        .or(`full_name.ilike.${searchTerm},nip.ilike.${searchTerm}`);

      if (empErr) {
        console.error('Error searching employees:', empErr);
      } else {
        const empIds = matchedEmployees?.map((e) => e.id) || [];
        if (empIds.length > 0) {
          query = query.in('employee_id', empIds);
        } else {
          return { data: [], count: 0 };
        }
      }
    }

    if (params?.status && params.status !== 'all') {
      query = query.eq('status', params.status);
    }

    if (params?.requestType && params.requestType !== 'all') {
      query = query.eq('request_type', params.requestType);
    }

    if (params?.startDate) {
      query = query.gte('start_date', params.startDate);
    }

    if (params?.endDate) {
      query = query.lte('end_date', params.endDate);
    }

    if (params?.employeeId) {
      query = query.eq('employee_id', params.employeeId);
    }

    query = query.order('submitted_at', { ascending: false });

    if (params?.page && params?.pageSize) {
      const from = (params.page - 1) * params.pageSize;
      const to = from + params.pageSize - 1;
      query = query.range(from, to);
    }

    const { data, count, error } = await query;

    if (error) {
      if (
        (error as any).code === 'PGRST205' ||
        (error as any).message?.includes('schema cache')
      ) {
        return { data: [], count: 0 };
      }
      console.error('Error fetching all requests:', error);
      throw new Error(formatRequestError(error));
    }

    return {
      data: (data as unknown as RequestWithRelations[]) || [],
      count: count || 0,
    };
  },

  /**
   * Fetch a single request by ID with relations (Reviewer view: super_admin, admin, headmaster).
   */
  async getRequestById(requestId: string): Promise<RequestWithRelations | null> {
    if (!requestId) return null;

    const { data, error } = await supabase
      .from('requests')
      .select(
        `
        *,
        employees (
          id,
          full_name,
          nip,
          nik,
          employee_number,
          gender,
          photo_url,
          status,
          departments (
            name
          ),
          positions (
            name
          )
        ),
        reviewer_profile:profiles!reviewed_by (
          id,
          full_name,
          role
        )
      `
      )
      .eq('id', requestId)
      .maybeSingle();

    if (error) {
      if (
        (error as any).code === 'PGRST205' ||
        (error as any).message?.includes('schema cache')
      ) {
        return null;
      }
      console.error('Error fetching request by ID:', error);
      throw new Error(formatRequestError(error));
    }

    return (data as unknown as RequestWithRelations) || null;
  },

  /**
   * Fetch a normalized detail model for any request by ID (Reviewer view).
   */
  async getRequestDetail(requestId: string): Promise<RequestDetailModel | null> {
    const raw = await this.getRequestById(requestId);
    if (!raw) return null;
    return normalizeRequestDetail(raw);
  },
};
