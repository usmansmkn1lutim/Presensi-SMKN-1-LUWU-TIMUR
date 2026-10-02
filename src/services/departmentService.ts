import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { DepartmentRow, DepartmentInsert, DepartmentUpdate } from '../types/database.types';

class DepartmentService {
  /**
   * Fetch all departments (active only by default for selector dropdowns).
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
      .insert(payload)
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

    const { data, error } = await supabase
      .from('departments')
      .update(payload)
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
}

export const departmentService = new DepartmentService();
