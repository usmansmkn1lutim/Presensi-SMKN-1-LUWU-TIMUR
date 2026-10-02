import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { DepartmentRow, DepartmentInsert, DepartmentUpdate } from '../types/database.types';

class DepartmentService {
  /**
   * Fetch all departments (active only by default for selector dropdowns, or all for admin management).
   */
  async getDepartments(params?: { onlyActive?: boolean }): Promise<DepartmentRow[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }

    let query = supabase
      .from('departments')
      .select('*')
      .order('name', { ascending: true });

    if (params?.onlyActive !== false) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) {
      console.warn('DepartmentService.getDepartments error:', error.message);
      return [];
    }

    return data || [];
  }

  /**
   * Fetch a single department by ID.
   */
  async getDepartmentById(id: string): Promise<DepartmentRow | null> {
    if (!isSupabaseConfigured()) {
      return null;
    }

    const { data, error } = await supabase
      .from('departments')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.warn('DepartmentService.getDepartmentById error:', error.message);
      return null;
    }

    return data;
  }

  /**
   * Create a new department.
   */
  async createDepartment(payload: DepartmentInsert): Promise<DepartmentRow> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase belum dikonfigurasi.');
    }

    const { data, error } = await supabase
      .from('departments')
      .insert({
        name: payload.name.trim(),
        description: payload.description?.trim() || null,
        is_active: payload.is_active ?? true,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('Nama departemen sudah digunakan.');
      }
      throw new Error('Gagal menyimpan data departemen: ' + error.message);
    }

    return data;
  }

  /**
   * Update department details.
   */
  async updateDepartment(id: string, payload: DepartmentUpdate): Promise<DepartmentRow> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase belum dikonfigurasi.');
    }

    const updates: DepartmentUpdate = {};
    if (payload.name !== undefined) updates.name = payload.name.trim();
    if (payload.description !== undefined) updates.description = payload.description?.trim() || null;
    if (payload.is_active !== undefined) updates.is_active = payload.is_active;

    const { data, error } = await supabase
      .from('departments')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        throw new Error('Nama departemen sudah digunakan.');
      }
      throw new Error('Gagal memperbarui data departemen: ' + error.message);
    }

    return data;
  }

  /**
   * Update department active status.
   */
  async updateDepartmentStatus(id: string, isActive: boolean): Promise<void> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase belum dikonfigurasi.');
    }

    const { error } = await supabase
      .from('departments')
      .update({ is_active: isActive })
      .eq('id', id);

    if (error) {
      throw new Error('Gagal mengubah status departemen: ' + error.message);
    }
  }
}

export const departmentService = new DepartmentService();
