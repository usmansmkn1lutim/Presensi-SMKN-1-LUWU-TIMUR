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

    // Schema cache / Missing table (PGRST205)
    if (
      msg.includes('PGRST205') ||
      msg.includes('schema cache') ||
      ('code' in err && (err as { code: string }).code === 'PGRST205')
    ) {
      return new Error('Tabel hari libur belum terdaftar di schema cache database.');
    }

    return err;
  }
  return new Error('Terjadi kesalahan saat memproses data hari libur.');
}

const LOCAL_STORAGE_HOLIDAYS_KEY = 'smkn1_holidays_fallback';

function getLocalHolidays(): HolidayModel[] {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = localStorage.getItem(LOCAL_STORAGE_HOLIDAYS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    }
  } catch {}
  return [];
}

function saveLocalHolidays(holidays: HolidayModel[]): void {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(LOCAL_STORAGE_HOLIDAYS_KEY, JSON.stringify(holidays));
    }
  } catch {}
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
        if ((error as any)?.code === 'PGRST205' || (error as any)?.message?.includes('schema cache')) {
          return getLocalHolidays();
        }
        throw error;
      }

      const models = (data || []).map(toHolidayModel);
      saveLocalHolidays(models);
      return models;
    } catch (err: any) {
      if (err?.code === 'PGRST205' || err?.message?.includes('schema cache')) {
        return getLocalHolidays();
      }
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
        if ((error as any)?.code === 'PGRST205' || (error as any)?.message?.includes('schema cache')) {
          return getLocalHolidays().find((h) => h.id === id) || null;
        }
        throw error;
      }

      return data ? toHolidayModel(data) : null;
    } catch (err: any) {
      if (err?.code === 'PGRST205' || err?.message?.includes('schema cache')) {
        return getLocalHolidays().find((h) => h.id === id) || null;
      }
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
        if ((error as any)?.code === 'PGRST205' || (error as any)?.message?.includes('schema cache')) {
          const list = getLocalHolidays();
          const now = new Date().toISOString();
          const fallbackId =
            typeof crypto !== 'undefined' && crypto.randomUUID
              ? crypto.randomUUID()
              : `hol-${Date.now()}`;
          const newModel: HolidayModel = {
            id: fallbackId,
            name: payload.name,
            holidayDate: payload.holiday_date,
            holidayType: payload.holiday_type,
            description: payload.description,
            isActive: payload.is_active,
            createdAt: now,
            updatedAt: now,
          };
          list.push(newModel);
          saveLocalHolidays(list);
          return newModel;
        }
        throw error;
      }

      return toHolidayModel(data);
    } catch (err: any) {
      if (err?.code === 'PGRST205' || err?.message?.includes('schema cache')) {
        const list = getLocalHolidays();
        const now = new Date().toISOString();
        const fallbackId =
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `hol-${Date.now()}`;
        const newModel: HolidayModel = {
          id: fallbackId,
          name: input.name.trim(),
          holidayDate: input.holiday_date,
          holidayType: input.holiday_type,
          description: input.description?.trim() || null,
          isActive: input.is_active !== undefined ? input.is_active : true,
          createdAt: now,
          updatedAt: now,
        };
        list.push(newModel);
        saveLocalHolidays(list);
        return newModel;
      }
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
        if ((error as any)?.code === 'PGRST205' || (error as any)?.message?.includes('schema cache')) {
          const list = getLocalHolidays();
          const target = list.find((h) => h.id === id);
          if (!target) throw new Error('Data hari libur tidak ditemukan.');
          if (payload.name) target.name = payload.name;
          if (payload.holiday_date) target.holidayDate = payload.holiday_date;
          if (payload.holiday_type) target.holidayType = payload.holiday_type;
          if (payload.description !== undefined) target.description = payload.description;
          if (payload.is_active !== undefined) target.isActive = payload.is_active;
          target.updatedAt = new Date().toISOString();
          saveLocalHolidays(list);
          return target;
        }
        throw error;
      }

      return toHolidayModel(data);
    } catch (err: any) {
      if (err?.code === 'PGRST205' || err?.message?.includes('schema cache')) {
        const list = getLocalHolidays();
        const target = list.find((h) => h.id === id);
        if (!target) throw new Error('Data hari libur tidak ditemukan.');
        if (input.name) target.name = input.name.trim();
        if (input.holiday_date) target.holidayDate = input.holiday_date;
        if (input.holiday_type) target.holidayType = input.holiday_type;
        if (input.description !== undefined) target.description = input.description?.trim() || null;
        if (input.is_active !== undefined) target.isActive = input.is_active;
        target.updatedAt = new Date().toISOString();
        saveLocalHolidays(list);
        return target;
      }
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
        if ((error as any)?.code === 'PGRST205' || (error as any)?.message?.includes('schema cache')) {
          const list = getLocalHolidays();
          const target = list.find((h) => h.id === id);
          if (!target) throw new Error('Data hari libur tidak ditemukan.');
          target.isActive = isActive;
          target.updatedAt = new Date().toISOString();
          saveLocalHolidays(list);
          return target;
        }
        throw error;
      }

      return toHolidayModel(data);
    } catch (err: any) {
      if (err?.code === 'PGRST205' || err?.message?.includes('schema cache')) {
        const list = getLocalHolidays();
        const target = list.find((h) => h.id === id);
        if (!target) throw new Error('Data hari libur tidak ditemukan.');
        target.isActive = isActive;
        target.updatedAt = new Date().toISOString();
        saveLocalHolidays(list);
        return target;
      }
      console.error(`holidayService.setHolidayActiveStatus error (${id}):`, err);
      throw formatHolidayError(err);
    }
  },
};
