import { EmployeeRow, ProfileRow } from './database.types';

export type RequestType = 'leave' | 'sick' | 'official_duty' | 'other';
export type RequestStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

/**
 * Standard Indonesian display labels for Request Types
 */
export const REQUEST_TYPE_LABELS: Record<RequestType, string> = {
  leave: 'Cuti',
  sick: 'Sakit',
  official_duty: 'Dinas',
  other: 'Lainnya',
};

/**
 * Standard Indonesian display labels for Request Statuses
 */
export const REQUEST_STATUS_LABELS: Record<RequestStatus, string> = {
  pending: 'Menunggu',
  approved: 'Disetujui',
  rejected: 'Ditolak',
  cancelled: 'Dibatalkan',
};

/**
 * Raw Request row matching public.requests table schema
 */
export interface RequestRow {
  id: string;
  employee_id: string;
  request_type: RequestType;
  start_date: string; // ISO Date YYYY-MM-DD (calendar date)
  end_date: string; // ISO Date YYYY-MM-DD (calendar date)
  reason: string;
  attachment_url: string | null;
  status: RequestStatus;
  submitted_at: string; // ISO Timestamptz
  reviewed_at: string | null; // ISO Timestamptz
  reviewed_by: string | null; // Profile UUID of reviewer
  reviewer_note: string | null;
  created_at: string; // ISO Timestamptz
  updated_at: string; // ISO Timestamptz
}

/**
 * Input payload for submitting a new request
 */
export interface RequestInsert {
  request_type: RequestType;
  start_date: string;
  end_date: string;
  reason: string;
  attachment_url?: string | null;
}

/**
 * Request row with joined relational data (Employee and Reviewer Profile)
 */
export interface RequestWithRelations extends RequestRow {
  employees?: EmployeeRow & {
    departments?: { name: string } | null;
    positions?: { name: string } | null;
  };
  reviewer_profile?: ProfileRow | null;
}

/**
 * Filter parameters for querying requests
 */
export interface RequestFilterParams {
  status?: RequestStatus | 'all';
  requestType?: RequestType | 'all';
  startDate?: string;
  endDate?: string;
  employeeId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Employee detail contract for request views
 */
export interface RequestEmployeeDetail {
  id: string;
  full_name: string;
  nip: string | null;
  nik?: string | null;
  employee_number?: string | null;
  gender?: string | null;
  photo_url?: string | null;
  status?: string | null;
  department_name: string | null;
  position_name: string | null;
}

/**
 * Reviewer detail contract for reviewed requests
 */
export interface RequestReviewerDetail {
  id: string | null;
  full_name: string | null;
  role: string | null;
  reviewed_at: string | null;
  reviewer_note: string | null;
}

/**
 * Normalized Request Detail model for presentation in history & detail UI
 */
export interface RequestDetailModel {
  id: string;
  employee_id: string;
  request_type: RequestType;
  request_type_label: string;
  start_date: string;
  end_date: string;
  reason: string;
  attachment_url: string | null;
  status: RequestStatus;
  status_label: string;
  submitted_at: string;
  reviewed_at: string | null;
  reviewed_by: string | null;
  reviewer_note: string | null;
  created_at: string;
  updated_at: string;
  employee: RequestEmployeeDetail | null;
  reviewer: RequestReviewerDetail | null;
}

/**
 * Safe normalizer function to convert raw or relational rows into RequestDetailModel
 */
export function normalizeRequestDetail(
  row: RequestWithRelations | RequestRow
): RequestDetailModel {
  const withRel = row as RequestWithRelations;
  const emp = withRel.employees;
  const rev = withRel.reviewer_profile;

  const employee: RequestEmployeeDetail | null = emp
    ? {
        id: emp.id,
        full_name: emp.full_name,
        nip: emp.nip || null,
        nik: (emp as any).nik || null,
        employee_number: (emp as any).employee_number || null,
        gender: (emp as any).gender || null,
        photo_url: (emp as any).photo_url || null,
        status: (emp as any).status || null,
        department_name: emp.departments?.name || null,
        position_name: emp.positions?.name || null,
      }
    : null;

  const reviewer: RequestReviewerDetail | null =
    rev || row.reviewed_by
      ? {
          id: rev?.id || row.reviewed_by || null,
          full_name: rev?.full_name || null,
          role: rev?.role || null,
          reviewed_at: row.reviewed_at || null,
          reviewer_note: row.reviewer_note || null,
        }
      : null;

  return {
    id: row.id,
    employee_id: row.employee_id,
    request_type: row.request_type,
    request_type_label: REQUEST_TYPE_LABELS[row.request_type] || row.request_type,
    start_date: row.start_date,
    end_date: row.end_date,
    reason: row.reason,
    attachment_url: row.attachment_url || null,
    status: row.status,
    status_label: REQUEST_STATUS_LABELS[row.status] || row.status,
    submitted_at: row.submitted_at,
    reviewed_at: row.reviewed_at || null,
    reviewed_by: row.reviewed_by || null,
    reviewer_note: row.reviewer_note || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    employee,
    reviewer,
  };
}

/**
 * Pure date formatting helpers that prevent timezone shifting
 */
export function formatRequestDate(dateStr: string): string {
  if (!dateStr) return '—';
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const monthIndex = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      const d = new Date(year, monthIndex, day);
      return d.toLocaleDateString('id-ID', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    }
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function formatRequestDateRange(startStr: string, endStr: string): string {
  if (!startStr || !endStr) return '—';
  try {
    const formatSingle = (s: string) => {
      const parts = s.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const monthIndex = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        return new Date(year, monthIndex, day).toLocaleDateString('id-ID', {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        });
      }
      return new Date(s).toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    };

    const startFormatted = formatSingle(startStr);
    if (startStr === endStr) {
      return startFormatted;
    }
    const endFormatted = formatSingle(endStr);
    return `${startFormatted} — ${endFormatted}`;
  } catch {
    return `${startStr} — ${endStr}`;
  }
}

export function formatRequestDateTime(dateStr: string | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Calculates calendar day duration between start and end date (inclusive).
 * Uses UTC dates to avoid any daylight savings or browser timezone shifting.
 * E.g. '2026-10-01' to '2026-10-03' returns 3 days.
 */
export function calculateDurationDays(startStr: string, endStr: string): number {
  if (!startStr || !endStr) return 0;
  try {
    const parts1 = startStr.split('-');
    const parts2 = endStr.split('-');
    if (parts1.length !== 3 || parts2.length !== 3) return 0;
    const y1 = parseInt(parts1[0], 10);
    const m1 = parseInt(parts1[1], 10);
    const d1 = parseInt(parts1[2], 10);
    const y2 = parseInt(parts2[0], 10);
    const m2 = parseInt(parts2[1], 10);
    const d2 = parseInt(parts2[2], 10);

    const utc1 = Date.UTC(y1, m1 - 1, d1);
    const utc2 = Date.UTC(y2, m2 - 1, d2);
    const diffMs = utc2 - utc1;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24)) + 1;
    return diffDays > 0 ? diffDays : 1;
  } catch {
    return 1;
  }
}

/**
 * Formats calendar duration in Indonesian days (e.g. '3 hari')
 */
export function formatRequestDuration(startStr: string, endStr: string): string {
  const days = calculateDurationDays(startStr, endStr);
  return `${days} hari`;
}
