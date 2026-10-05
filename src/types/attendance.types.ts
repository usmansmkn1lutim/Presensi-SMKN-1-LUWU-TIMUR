import { CheckInStatus, CheckOutStatus } from './database.types';
import { WorkScheduleModel } from './workSchedule.types';

export type { CheckInStatus, CheckOutStatus };

/**
 * Domain model for employee daily attendance transaction
 * Phase 6A-1 & Phase 6A-2
 */
export interface AttendanceModel {
  id: string;
  employee_id: string;
  attendance_date: string; // Format: YYYY-MM-DD
  check_in_at: string | null; // ISO Timestamp string
  check_out_at: string | null; // ISO Timestamp string
  check_in_status: CheckInStatus | null;
  check_out_status: CheckOutStatus | null;
  check_in_location_id: string | null;
  check_out_location_id: string | null;
  check_in_latitude: number | null;
  check_in_longitude: number | null;
  check_out_latitude: number | null;
  check_out_longitude: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Business Rule Check-in Evaluation Result
 */
export interface EvaluateCheckInResult {
  allowed: boolean;
  status: CheckInStatus | null;
  reason?: string;
}

/**
 * Business Rule Check-out Evaluation Result
 */
export interface EvaluateCheckOutResult {
  allowed: boolean;
  status: CheckOutStatus | null;
  reason?: string;
}

/**
 * Response structure returned by check_in RPC function
 */
export interface CheckInRpcResult {
  attendance_id: string;
  attendance_date: string;
  check_in_at: string;
  check_in_status: CheckInStatus;
  location_id: string;
  location_name: string;
  distance_meters: number;
  employee_id?: string;
}

/**
 * Response structure returned by check_out RPC function
 */
export interface CheckOutRpcResult {
  attendance_id: string;
  attendance_date: string;
  check_in_at: string;
  check_out_at: string;
  check_out_status: CheckOutStatus;
  location_id: string;
  location_name: string;
  distance_meters: number;
  employee_id?: string;
}

/**
 * Input payload for performing check-in
 */
export interface CheckInPayload {
  latitude?: number | null;
  longitude?: number | null;
  location_id?: string | null;
  notes?: string | null;
}

/**
 * Input payload for performing check-out
 */
export interface CheckOutPayload {
  latitude?: number | null;
  longitude?: number | null;
  location_id?: string | null;
  notes?: string | null;
}
