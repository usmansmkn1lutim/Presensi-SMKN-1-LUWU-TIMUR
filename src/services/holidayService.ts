import { supabase } from '../lib/supabase';
import {
  HolidayModel,
  HolidayFilters,
  CreateHolidayInput,
  UpdateHolidayInput,
} from '../types/holiday.types';
import { HolidayRow, HolidayUpdate } from '../types/database.types';

/**
 * Normalizes raw database row to HolidayModel (camelCase)
 */
function toHolidayModel(row: HolidayRow): HolidayModel {
  return {
    id: row.id,
    name: row.name,
    holidayDate: row.holiday_date,
    holidayType: row.holiday_type,
    description: row.description,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * Translates PostgreSQL/Supabase errors into user-friendly Indonesian messages
 */
function formatHolidayError(err: unknown): Error {
  if (err instanceof Error) {
    const msg = err.message || '';

    // Unique constraint violation (holiday_date + name)
    if (
      msg.includes('holidays_date_name_unique') ||
      msg.includes('duplicate key') ||
      ('code' in err && (err as { code: string }).code === '23505')
    ) {
      return new Error('Data hari libur tersebut sudah tersedia.');
    }

    // Name empty check constraint
    if (msg.includes('holidays_name_not_empty_check')) {
      return new Error('Nama hari libur wajib diisi dan tidak boleh hanya spasi.');
    }

    // Type check constraint
    if (msg.includes('holidays_holiday_type_check')) {
      return new Error('Jenis hari libur tidak valid.');
    }

    // RLS / Permission Denied
    if (
      msg.includes('row-level security') ||
      msg.includes('permission denied') ||
      ('code' in err && (err as { code: string }).code === '42501')
    ) {
      return new Error('Anda tidak memiliki wewenang untuk mengubah data hari libur.');
    }

    return err;
  }
  return new Error('Terjadi kesalahan saat memproses data hari libur.');
}

export const holidayService = {
  /**
   * Retrieves list of holidays filtered by optional year, type, status, and search query
   */
  async getHolidays(filters?: HolidayFilters): Promise<HolidayModel[]> {
    try {
      let query = supabase
        .from('holidays')
        .select('*')
        .order('holiday_date', { ascending: true })
        .order('name', { ascending: true });

      // Year filter (from Jan 1 to Dec 31 of specified year)
      if (filters?.year) {
        const startOfYear = `${filters.year}-01-01`;
        const endOfYear = `${filters.year}-12-31`;
        query = query.gte('holiday_date', startOfYear).lte('holiday_date', endOfYear);
      }

      // Holiday Type filter
      if (filters?.holidayType && filters.holidayType !== 'all') {
        query = query.eq('holiday_type', filters.holidayType);
      }

      // Active status filter
      if (filters?.isActive !== undefined && filters.isActive !== 'all') {
        query = query.eq('is_active', filters.isActive);
      }

      const { data, error } = await query;

      if (error) {
        throw error;
      }

      return (data || []).map(toHolidayModel);
    } catch (err) {
      console.error('holidayService.getHolidays error:', err);
      throw formatHolidayError(err);
    }
  },

  /**
   * Retrieves a single holiday by its UUID
   */
  async getHolidayById(id: string): Promise<HolidayModel | null> {
    try {
      const { data, error } = await supabase
        .from('holidays')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data ? toHolidayModel(data) : null;
    } catch (err) {
      console.error(`holidayService.getHolidayById error (${id}):`, err);
      throw formatHolidayError(err);
    }
  },

  /**
   * Creates a new holiday record
   */
  async createHoliday(input: CreateHolidayInput): Promise<HolidayModel> {
    try {
      const trimmedName = input.name.trim();
      if (!trimmedName) {
        throw new Error('Nama hari libur wajib diisi.');
      }

      if (!input.holiday_date) {
        throw new Error('Tanggal hari libur wajib dipilih.');
      }

      const payload = {
        name: trimmedName,
        holiday_date: input.holiday_date,
        holiday_type: input.holiday_type,
        description: input.description?.trim() || null,
        is_active: input.is_active !== undefined ? input.is_active : true,
      };

      const { data, error } = await supabase
        .from('holidays')
        .insert(payload)
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      return toHolidayModel(data);
    } catch (err) {
      console.error('holidayService.createHoliday error:', err);
      throw formatHolidayError(err);
    }
  },

  /**
   * Updates an existing holiday record
   */
  async updateHoliday(id: string, input: UpdateHolidayInput): Promise<HolidayModel> {
    try {
      const payload: HolidayUpdate = {};

      if (input.name !== undefined) {
        const trimmedName = input.name.trim();
        if (!trimmedName) {
          throw new Error('Nama hari libur tidak boleh kosong.');
        }
        payload.name = trimmedName;
      }

      if (input.holiday_date !== undefined) {
        if (!input.holiday_date) {
          throw new Error('Tanggal hari libur wajib dipilih.');
        }
        payload.holiday_date = input.holiday_date;
      }

      if (input.holiday_type !== undefined) {
        payload.holiday_type = input.holiday_type;
      }

      if (input.description !== undefined) {
        payload.description = input.description ? input.description.trim() : null;
      }

      if (input.is_active !== undefined) {
        payload.is_active = input.is_active;
      }

      const { data, error } = await supabase
        .from('holidays')
        .update(payload)
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      return toHolidayModel(data);
    } catch (err) {
      console.error(`holidayService.updateHoliday error (${id}):`, err);
      throw formatHolidayError(err);
    }
  },

  /**
   * Toggles the active status of a holiday (soft activation/deactivation)
   */
  async setHolidayActiveStatus(id: string, isActive: boolean): Promise<HolidayModel> {
    try {
      const { data, error } = await supabase
        .from('holidays')
        .update({ is_active: isActive })
        .eq('id', id)
        .select('*')
        .single();

      if (error) {
        throw error;
      }

      return toHolidayModel(data);
    } catch (err) {
      console.error(`holidayService.setHolidayActiveStatus error (${id}):`, err);
      throw formatHolidayError(err);
    }
  },
};
