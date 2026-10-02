import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { PositionRow, PositionInsert, PositionUpdate } from '../types/database.types';

class PositionService {
  /**
   * Fetch all positions (active only by default for selector dropdowns).
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
      .insert(payload)
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

    const { data, error } = await supabase
      .from('positions')
      .update(payload)
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
}

export const positionService = new PositionService();
