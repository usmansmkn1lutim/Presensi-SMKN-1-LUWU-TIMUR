import { LocationRow, LocationInsert, LocationUpdate, LocationType } from './database.types';

export type { LocationRow, LocationInsert, LocationUpdate, LocationType };

/**
 * Domain Model for Master Location
 * Phase 5A-1: Master Lokasi Presensi
 */
export interface LocationModel {
  id: string;
  name: string;
  code: string;
  description: string | null;
  locationType: LocationType;
  latitude: number | null;
  longitude: number | null;
  radiusMeters: number;
  isAttendanceEnabled: boolean;
  isActive: boolean;
  address: string | null;
  createdAt: string;
  updatedAt: string;
}

/**
 * Helper to convert raw database row to application domain model
 */
export const mapLocationRowToModel = (row: LocationRow): LocationModel => ({
  id: row.id,
  name: row.name,
  code: row.code,
  description: row.description,
  locationType: row.location_type,
  latitude: row.latitude !== null ? Number(row.latitude) : null,
  longitude: row.longitude !== null ? Number(row.longitude) : null,
  radiusMeters: Number(row.radius_meters),
  isAttendanceEnabled: row.is_attendance_enabled,
  isActive: row.is_active,
  address: row.address,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});
