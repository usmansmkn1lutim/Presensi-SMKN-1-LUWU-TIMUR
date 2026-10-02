import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  EmployeeInsert,
  EmployeeUpdate,
  ProfileRow,
} from '../types/database.types';
import {
  EmployeeWithRelations,
  EmployeeFilterParams,
  EmployeeStats,
} from '../types/employee';

class EmployeeService {
  /**
   * Fetch a single employee with relation details by employee UUID.
   */
  async getEmployeeById(employeeId: string): Promise<EmployeeWithRelations | null> {
    if (!isSupabaseConfigured()) {
      return null;
    }

    const { data, error } = await supabase
      .from('employees')
      .select(`
        *,
        departments (
          id,
          name,
          description
        ),
        positions (
          id,
          name,
          description
        )
      `)
      .eq('id', employeeId)
      .single();

    if (error) {
      console.error('EmployeeService.getEmployeeById error:', error);
      return null;
    }

    const emp = (data as unknown) as EmployeeWithRelations;

    // Fetch linked profile safely if profile_id exists
    if (emp.profile_id) {
      try {
        const { data: prof } = await supabase
          .from('profiles')
          .select('id, full_name, avatar_url, role, is_active, last_login_at, created_at, updated_at')
          .eq('id', emp.profile_id)
          .maybeSingle();

        if (prof) {
          emp.profiles = prof as ProfileRow;
        }
      } catch (profErr) {
        console.warn('Could not fetch linked profile:', profErr);
      }
    }

    return emp;
  }

  /**
   * Fetch employee record associated with a specific profile UUID.
   */
  async getEmployeeByProfileId(profileId: string): Promise<EmployeeWithRelations | null> {
    if (!isSupabaseConfigured()) {
      return null;
    }

    const { data, error } = await supabase
      .from('employees')
      .select(`
        *,
        departments (
          id,
          name
        ),
        positions (
          id,
          name
        )
      `)
      .eq('profile_id', profileId)
      .maybeSingle();

    if (error) {
      console.error('EmployeeService.getEmployeeByProfileId error:', error);
      return null;
    }

    return (data as unknown) as EmployeeWithRelations;
  }

  /**
   * Fetch list of employees with search and filter support.
   * Does not depend on profiles(*) join to prevent RLS restriction on list view.
   */
  async getEmployees(params?: EmployeeFilterParams): Promise<EmployeeWithRelations[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }

    let query = supabase
      .from('employees')
      .select(`
        *,
        departments (
          id,
          name
        ),
        positions (
          id,
          name
        )
      `)
      .order('full_name', { ascending: true });

    // Status Filter
    if (params?.status && params.status !== 'all') {
      query = query.eq('status', params.status);
    }

    // Gender Filter
    if (params?.gender && params.gender !== 'all') {
      query = query.eq('gender', params.gender);
    }

    // Department Filter
    if (params?.departmentId) {
      query = query.eq('department_id', params.departmentId);
    }

    // Position Filter
    if (params?.positionId) {
      query = query.eq('position_id', params.positionId);
    }

    // Employee Type Filter
    if (params?.employeeType) {
      query = query.eq('employee_type', params.employeeType);
    }

    // Search Query (Search by full_name, nip, nik, or employee_number)
    if (params?.searchQuery && params.searchQuery.trim() !== '') {
      const q = params.searchQuery.trim();
      query = query.or(
        `full_name.ilike.%${q}%,nip.ilike.%${q}%,nik.ilike.%${q}%,employee_number.ilike.%${q}%`
      );
    }

    const { data, error } = await query;

    console.log('Employees query result:', {
      data,
      error,
      count: data?.length,
    });

    if (error) {
      console.error('EmployeeService.getEmployees error:', error);
      return [];
    }

    return ((data as unknown) as EmployeeWithRelations[]) || [];
  }

  /**
   * Aggregate statistics for employee management dashboard directly from employees table.
   */
  async getEmployeeStats(): Promise<EmployeeStats> {
    if (!isSupabaseConfigured()) {
      return { total: 0, active: 0, inactive: 0, linkedToAccount: 0 };
    }

    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, status, profile_id');

      console.log('Employee stats query result:', {
        data,
        error,
        count: data?.length,
      });

      if (error || !data) {
        if (error) console.error('EmployeeService.getEmployeeStats error:', error);
        return { total: 0, active: 0, inactive: 0, linkedToAccount: 0 };
      }

      const total = data.length;
      let active = 0;
      let inactive = 0;
      let linkedToAccount = 0;

      for (const row of data) {
        if (row.status === 'active') active++;
        if (row.status === 'inactive') inactive++;
        if (row.profile_id !== null && row.profile_id !== undefined) linkedToAccount++;
      }

      return { total, active, inactive, linkedToAccount };
    } catch (err) {
      console.error('Employee stats calculation error:', err);
      return { total: 0, active: 0, inactive: 0, linkedToAccount: 0 };
    }
  }

  /**
   * Create a new employee record.
   */
  async createEmployee(payload: EmployeeInsert): Promise<EmployeeWithRelations> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase belum dikonfigurasi.');
    }

    // Sanitize empty strings to null for unique constraints
    const sanitized: EmployeeInsert = {
      ...payload,
      nip: payload.nip?.trim() ? payload.nip.trim() : null,
      nik: payload.nik?.trim() ? payload.nik.trim() : null,
      employee_number: payload.employee_number?.trim() ? payload.employee_number.trim() : null,
      phone: payload.phone?.trim() ? payload.phone.trim() : null,
      email: payload.email?.trim() ? payload.email.trim() : null,
      photo_url: payload.photo_url?.trim() ? payload.photo_url.trim() : null,
      department_id: payload.department_id || null,
      position_id: payload.position_id || null,
      profile_id: payload.profile_id || null,
      notes: payload.notes?.trim() ? payload.notes.trim() : null,
    };

    const { data, error } = await supabase
      .from('employees')
      .insert(sanitized)
      .select(`
        *,
        departments (
          id,
          name
        ),
        positions (
          id,
          name
        )
      `)
      .single();

    if (error) {
      if (error.code === '23505') {
        if (error.message.includes('nip')) throw new Error('NIP sudah digunakan oleh pegawai lain.');
        if (error.message.includes('nik')) throw new Error('NIK sudah digunakan oleh pegawai lain.');
        if (error.message.includes('employee_number')) throw new Error('Nomor Pegawai sudah digunakan.');
        if (error.message.includes('profile_id')) throw new Error('Akun profil ini sudah terhubung dengan pegawai lain.');
      }
      throw new Error('Gagal menyimpan data pegawai: ' + error.message);
    }

    return (data as unknown) as EmployeeWithRelations;
  }

  /**
   * Update existing employee record.
   */
  async updateEmployee(id: string, payload: EmployeeUpdate): Promise<EmployeeWithRelations> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase belum dikonfigurasi.');
    }

    const sanitized: EmployeeUpdate = {
      ...payload,
      nip: payload.nip !== undefined ? (payload.nip?.trim() ? payload.nip.trim() : null) : undefined,
      nik: payload.nik !== undefined ? (payload.nik?.trim() ? payload.nik.trim() : null) : undefined,
      employee_number: payload.employee_number !== undefined ? (payload.employee_number?.trim() ? payload.employee_number.trim() : null) : undefined,
      phone: payload.phone !== undefined ? (payload.phone?.trim() ? payload.phone.trim() : null) : undefined,
      email: payload.email !== undefined ? (payload.email?.trim() ? payload.email.trim() : null) : undefined,
      photo_url: payload.photo_url !== undefined ? (payload.photo_url?.trim() ? payload.photo_url.trim() : null) : undefined,
      department_id: payload.department_id !== undefined ? (payload.department_id || null) : undefined,
      position_id: payload.position_id !== undefined ? (payload.position_id || null) : undefined,
      profile_id: payload.profile_id !== undefined ? (payload.profile_id || null) : undefined,
      notes: payload.notes !== undefined ? (payload.notes?.trim() ? payload.notes.trim() : null) : undefined,
    };

    const { data, error } = await supabase
      .from('employees')
      .update(sanitized)
      .eq('id', id)
      .select(`
        *,
        departments (
          id,
          name
        ),
        positions (
          id,
          name
        )
      `)
      .single();

    if (error) {
      if (error.code === '23505') {
        if (error.message.includes('nip')) throw new Error('NIP sudah digunakan oleh pegawai lain.');
        if (error.message.includes('nik')) throw new Error('NIK sudah digunakan oleh pegawai lain.');
        if (error.message.includes('employee_number')) throw new Error('Nomor Pegawai sudah digunakan.');
        if (error.message.includes('profile_id')) throw new Error('Akun profil ini sudah terhubung dengan pegawai lain.');
      }
      throw new Error('Gagal memperbarui data pegawai: ' + error.message);
    }

    return (data as unknown) as EmployeeWithRelations;
  }

  /**
   * Update employee status (active / inactive).
   */
  async updateEmployeeStatus(id: string, status: 'active' | 'inactive'): Promise<void> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase belum dikonfigurasi.');
    }

    const { error } = await supabase
      .from('employees')
      .update({ status })
      .eq('id', id);

    if (error) {
      throw new Error('Gagal mengubah status pegawai: ' + error.message);
    }
  }

  /**
   * Link an existing profile (from auth.users/public.profiles) to an employee record.
   * Updates only employees.profile_id.
   */
  async linkProfileToEmployee(employeeId: string, profileId: string | null): Promise<void> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase belum dikonfigurasi.');
    }

    const { error } = await supabase
      .from('employees')
      .update({ profile_id: profileId })
      .eq('id', employeeId);

    if (error) {
      if (error.code === '23505') {
        throw new Error('Akun profil ini sudah terhubung dengan pegawai lain.');
      }
      throw new Error('Gagal menghubungkan akun: ' + error.message);
    }
  }

  /**
   * Fetch active, unlinked profiles directly via RPC get_linkable_profiles().
   */
  async getUnlinkedProfiles(): Promise<ProfileRow[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }

    const { data, error } = await supabase.rpc('get_linkable_profiles');

    if (error) {
      console.error('EmployeeService.getUnlinkedProfiles RPC error:', error);
      throw new Error(error.message || 'Gagal memuat daftar akun yang dapat dihubungkan.');
    }

    return (data as unknown as ProfileRow[]) || [];
  }
}

export const employeeService = new EmployeeService();
export type { EmployeeWithRelations };
