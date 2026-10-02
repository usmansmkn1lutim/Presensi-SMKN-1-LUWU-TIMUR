import { supabase, isSupabaseConfigured, SUPABASE_MISSING_CONFIG_MESSAGE } from '../lib/supabase';
import {
  LocationRow,
  LocationInsert,
  LocationUpdate,
  LocationModel,
  mapLocationRowToModel,
} from '../types/location.types';

/**
 * Maps Supabase / PostgreSQL errors to clear user-friendly Indonesian messages
 */
export const formatLocationError = (error: unknown): string => {
  if (!error) return 'Terjadi kesalahan sistem yang tidak diketahui.';

  const err = error as { code?: string; message?: string; details?: string };
  const message = err.message || '';
  const details = err.details || '';
  const combined = `${message} ${details}`.toLowerCase();

  // 1. Unique constraint violation (23505)
  if (err.code === '23505' || combined.includes('duplicate key') || combined.includes('unique')) {
    if (combined.includes('idx_locations_single_active_attendance') || combined.includes('single_active')) {
      return 'Lokasi presensi aktif sudah tersedia. Nonaktifkan lokasi presensi tersebut terlebih dahulu sebelum menggunakan lokasi ini.';
    }
    if (combined.includes('code') || combined.includes('locations_code_key')) {
      return 'Kode lokasi sudah digunakan. Silakan gunakan kode lain.';
    }
    return 'Data duplikat terdeteksi pada sistem.';
  }

  // 2. Check constraint violation (23514)
  if (err.code === '23514' || combined.includes('check constraint')) {
    if (combined.includes('attendance_coordinates')) {
      return 'Lokasi presensi aktif wajib memiliki koordinat latitude dan longitude yang valid.';
    }
    if (combined.includes('radius_meters')) {
      return 'Radius presensi harus bernilai antara 1 hingga 500 meter.';
    }
    if (combined.includes('latitude')) {
      return 'Nilai latitude harus berada dalam rentang -90 sampai 90.';
    }
    if (combined.includes('longitude')) {
      return 'Nilai longitude harus berada dalam rentang -180 sampai 180.';
    }
    return 'Data lokasi tidak memenuhi ketentuan validasi database.';
  }

  // 3. Permission / RLS violation (42501)
  if (err.code === '42501' || combined.includes('permission denied') || combined.includes('row-level security')) {
    return 'Anda tidak memiliki izin untuk melakukan tindakan ini.';
  }

  // 4. Network error
  if (combined.includes('failed to fetch') || combined.includes('network') || combined.includes('timeout')) {
    return 'Koneksi bermasalah. Silakan periksa jaringan internet Anda dan coba lagi.';
  }

  // Return clean generic message if it's already an Indonesian custom error
  if (message && !message.includes('PGRST') && !message.includes('schema') && !message.includes('column')) {
    return message;
  }

  return 'Operasi lokasi gagal diproses. Silakan coba lagi.';
};

/**
 * Service to manage Master Locations
 * Phase 5A-2: Frontend & Management UI
 */
class LocationService {
  /**
   * Main fetch method for locations list
   * Fetches all locations ordered by attendance status and name
   */
  async getLocations(): Promise<LocationModel[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }

    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .order('is_attendance_enabled', { ascending: false })
      .order('is_active', { ascending: false })
      .order('name', { ascending: true });

    if (error) {
      console.error('LocationService.getLocations error:', error);
      throw new Error(formatLocationError(error));
    }

    return (data as LocationRow[]).map(mapLocationRowToModel);
  }

  /**
   * Fetch all locations (alias for getLocations for backward compatibility)
   */
  async getAllLocations(): Promise<LocationModel[]> {
    return this.getLocations();
  }

  /**
   * Fetch active locations only (used by attendance/general views)
   */
  async getActiveLocations(): Promise<LocationModel[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }

    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('is_active', true)
      .order('name', { ascending: true });

    if (error) {
      console.error('LocationService.getActiveLocations error:', error);
      return [];
    }

    return (data as LocationRow[]).map(mapLocationRowToModel);
  }

  /**
   * Fetch the single active attendance location for V1
   */
  async getActiveAttendanceLocation(): Promise<LocationModel | null> {
    if (!isSupabaseConfigured()) {
      return null;
    }

    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('is_active', true)
      .eq('is_attendance_enabled', true)
      .maybeSingle();

    if (error) {
      console.error('LocationService.getActiveAttendanceLocation error:', error);
      return null;
    }

    return data ? mapLocationRowToModel(data as LocationRow) : null;
  }

  /**
   * Fetch a single location by ID
   */
  async getLocationById(id: string): Promise<LocationModel | null> {
    if (!isSupabaseConfigured()) {
      return null;
    }

    const { data, error } = await supabase
      .from('locations')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      console.error('LocationService.getLocationById error:', error);
      throw new Error(formatLocationError(error));
    }

    return data ? mapLocationRowToModel(data as LocationRow) : null;
  }

  /**
   * Create a new location (Admin / Super Admin only)
   */
  async createLocation(payload: LocationInsert): Promise<LocationModel> {
    if (!isSupabaseConfigured()) {
      throw new Error(SUPABASE_MISSING_CONFIG_MESSAGE);
    }

    // Client-side pre-validation consistent with DB constraints
    const name = payload.name?.trim();
    const code = payload.code?.trim().toUpperCase();

    if (!name) {
      throw new Error('Nama lokasi wajib diisi.');
    }
    if (!code) {
      throw new Error('Kode lokasi wajib diisi.');
    }

    const radius = Number(payload.radius_meters);
    if (isNaN(radius) || radius <= 0 || radius > 500) {
      throw new Error('Radius presensi harus bernilai antara 1 hingga 500 meter.');
    }

    if (payload.latitude !== null && payload.latitude !== undefined) {
      const lat = Number(payload.latitude);
      if (isNaN(lat) || lat < -90 || lat > 90) {
        throw new Error('Nilai latitude harus berada dalam rentang -90 sampai 90.');
      }
    }

    if (payload.longitude !== null && payload.longitude !== undefined) {
      const lng = Number(payload.longitude);
      if (isNaN(lng) || lng < -180 || lng > 180) {
        throw new Error('Nilai longitude harus berada dalam rentang -180 sampai 180.');
      }
    }

    if (payload.is_attendance_enabled && (payload.latitude === null || payload.longitude === null || payload.latitude === undefined || payload.longitude === undefined)) {
      throw new Error('Lokasi presensi aktif wajib memiliki koordinat latitude dan longitude yang valid.');
    }

    const sanitizedPayload: LocationInsert = {
      name,
      code,
      description: payload.description?.trim() || null,
      location_type: payload.location_type || 'office',
      latitude: payload.latitude !== undefined && payload.latitude !== null ? Number(payload.latitude) : null,
      longitude: payload.longitude !== undefined && payload.longitude !== null ? Number(payload.longitude) : null,
      radius_meters: radius,
      is_attendance_enabled: Boolean(payload.is_attendance_enabled),
      is_active: payload.is_active !== undefined ? Boolean(payload.is_active) : true,
      address: payload.address?.trim() || null,
    };

    const { data, error } = await supabase
      .from('locations')
      .insert(sanitizedPayload)
      .select()
      .single();

    if (error) {
      console.error('LocationService.createLocation error:', error);
      throw new Error(formatLocationError(error));
    }

    return mapLocationRowToModel(data as LocationRow);
  }

  /**
   * Update an existing location (Admin / Super Admin only)
   */
  async updateLocation(id: string, payload: LocationUpdate): Promise<LocationModel> {
    if (!isSupabaseConfigured()) {
      throw new Error(SUPABASE_MISSING_CONFIG_MESSAGE);
    }

    const updatePayload: LocationUpdate = {};

    if (payload.name !== undefined) {
      const name = payload.name.trim();
      if (!name) throw new Error('Nama lokasi wajib diisi.');
      updatePayload.name = name;
    }

    if (payload.code !== undefined) {
      const code = payload.code.trim().toUpperCase();
      if (!code) throw new Error('Kode lokasi wajib diisi.');
      updatePayload.code = code;
    }

    if (payload.description !== undefined) {
      updatePayload.description = payload.description ? payload.description.trim() : null;
    }

    if (payload.location_type !== undefined) {
      updatePayload.location_type = payload.location_type;
    }

    if (payload.address !== undefined) {
      updatePayload.address = payload.address ? payload.address.trim() : null;
    }

    if (payload.latitude !== undefined) {
      if (payload.latitude !== null) {
        const lat = Number(payload.latitude);
        if (isNaN(lat) || lat < -90 || lat > 90) {
          throw new Error('Nilai latitude harus berada dalam rentang -90 sampai 90.');
        }
        updatePayload.latitude = lat;
      } else {
        updatePayload.latitude = null;
      }
    }

    if (payload.longitude !== undefined) {
      if (payload.longitude !== null) {
        const lng = Number(payload.longitude);
        if (isNaN(lng) || lng < -180 || lng > 180) {
          throw new Error('Nilai longitude harus berada dalam rentang -180 sampai 180.');
        }
        updatePayload.longitude = lng;
      } else {
        updatePayload.longitude = null;
      }
    }

    if (payload.radius_meters !== undefined) {
      const radius = Number(payload.radius_meters);
      if (isNaN(radius) || radius <= 0 || radius > 500) {
        throw new Error('Radius presensi harus bernilai antara 1 hingga 500 meter.');
      }
      updatePayload.radius_meters = radius;
    }

    if (payload.is_active !== undefined) {
      updatePayload.is_active = Boolean(payload.is_active);
    }

    if (payload.is_attendance_enabled !== undefined) {
      updatePayload.is_attendance_enabled = Boolean(payload.is_attendance_enabled);
    }

    const { data, error } = await supabase
      .from('locations')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('LocationService.updateLocation error:', error);
      throw new Error(formatLocationError(error));
    }

    return mapLocationRowToModel(data as LocationRow);
  }

  /**
   * Activate or deactivate a location (soft toggle, no hard delete)
   */
  async setLocationActive(id: string, isActive: boolean): Promise<LocationModel> {
    if (!isSupabaseConfigured()) {
      throw new Error(SUPABASE_MISSING_CONFIG_MESSAGE);
    }

    // When deactivating, also turn off attendance enabled if it was on
    const updateData: LocationUpdate = {
      is_active: isActive,
    };
    if (!isActive) {
      updateData.is_attendance_enabled = false;
    }

    const { data, error } = await supabase
      .from('locations')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('LocationService.setLocationActive error:', error);
      throw new Error(formatLocationError(error));
    }

    return mapLocationRowToModel(data as LocationRow);
  }

  /**
   * Set location as attendance enabled or disabled
   */
  async setAttendanceEnabled(id: string, enabled: boolean): Promise<LocationModel> {
    if (!isSupabaseConfigured()) {
      throw new Error(SUPABASE_MISSING_CONFIG_MESSAGE);
    }

    if (enabled) {
      // Fetch target location first to ensure coordinates are valid before requesting DB
      const current = await this.getLocationById(id);
      if (!current) {
        throw new Error('Data lokasi tidak ditemukan.');
      }

      if (current.latitude === null || current.longitude === null) {
        throw new Error('Lokasi presensi wajib memiliki koordinat latitude dan longitude yang valid.');
      }

      if (!current.isActive) {
        throw new Error('Lokasi harus dalam status aktif sebelum dapat dijadikan lokasi presensi.');
      }
    }

    const { data, error } = await supabase
      .from('locations')
      .update({ is_attendance_enabled: enabled })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('LocationService.setAttendanceEnabled error:', error);
      throw new Error(formatLocationError(error));
    }

    return mapLocationRowToModel(data as LocationRow);
  }

  /**
   * Soft deactivation of location (V1 policy: NO hard delete)
   */
  async deactivateLocation(id: string): Promise<void> {
    await this.setLocationActive(id, false);
  }
}

export const locationService = new LocationService();
