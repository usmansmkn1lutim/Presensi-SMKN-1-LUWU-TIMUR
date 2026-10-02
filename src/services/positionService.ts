import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { PositionRow, PositionInsert, PositionUpdate } from '../types/database.types';

class PositionService {
  /**
   * Fetch all positions (active only by default for selector dropdowns, or all for admin management).
   */
  async getPositions(params?: { onlyActive?: boolean }): Promise<PositionRow[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }

    let query = supabase
      .from('positions')
      .select('*')
      .order('name', { ascending: true });

    if (params?.onlyActive !== false) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('PositionService.getPositions error:', error.message);
      return [];
    }

    return data || [];
  }

  /**
   * Fetch a single position by ID.
   */
  async getPositionById(id: string): Promise<PositionRow | null> {
    if (!isSupabaseConfigured()) {
      return null;
    }

    const { data, error } = await supabase
      .from('positions')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.warn('PositionService.getPositionById error:', error.message);
      return null;
    }

    return data;
  }

  /**
   * Create a new position.
   */
  async createPosition(payload: PositionInsert): Promise<PositionRow> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase belum dikonfigurasi.');
    }

    const { data, error } = await supabase
      .from('positions')
      .insert({
        name: payload.name.trim(),
        description: payload.description?.trim() || null,
        is_active: payload.is_active ?? true,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('Nama jabatan sudah digunakan.');
      }
      throw new Error('Gagal menyimpan data jabatan: ' + error.message);
    }

    return data;
  }

  /**
   * Update position details.
   */
  async updatePosition(id: string, payload: PositionUpdate): Promise<PositionRow> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase belum dikonfigurasi.');
    }

    const updates: PositionUpdate = {};
    if (payload.name !== undefined) updates.name = payload.name.trim();
    if (payload.description !== undefined) updates.description = payload.description?.trim() || null;
    if (payload.is_active !== undefined) updates.is_active = payload.is_active;

    const { data, error } = await supabase
      .from('positions')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('Nama jabatan sudah digunakan.');
      }
      throw new Error('Gagal memperbarui data jabatan: ' + error.message);
    }

    return data;
  }

  /**
   * Update position active status.
   */
  async updatePositionStatus(id: string, isActive: boolean): Promise<void> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase belum dikonfigurasi.');
    }

    const { error } = await supabase
      .from('positions')
      .update({ is_active: isActive })
      .eq('id', id);

    if (error) {
      throw new Error('Gagal mengubah status jabatan: ' + error.message);
    }
  }
}

export const positionService = new PositionService();
