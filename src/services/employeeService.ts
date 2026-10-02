import { supabase, isSupabaseConfigured } from '../lib/supabase';
import {
  EmployeeRow,
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
      .select('*, departments(*), positions(*), profiles(*)')
      .eq('id', employeeId)
      .single();

    if (error) {
      console.warn('EmployeeService.getEmployeeById error:', error.message);
      return null;
    }

    return (data as unknown) as EmployeeWithRelations;
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
      .select('*, departments(*), positions(*), profiles(*)')
      .eq('profile_id', profileId)
      .maybeSingle();

    if (error) {
      console.warn('EmployeeService.getEmployeeByProfileId error:', error.message);
      return null;
    }

    return (data as unknown) as EmployeeWithRelations;
  }

  /**
   * Fetch list of employees with search and filter support.
   */
  async getEmployees(params?: EmployeeFilterParams): Promise<EmployeeWithRelations[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }

    let query = supabase
      .from('employees')
      .select('*, departments(*), positions(*), profiles(*)')
      .order('full_name', { ascending: true });

    // Status Filter
    if (params?.status && params.status !== 'all') {
      query = query.eq('status', params.status);
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

    if (error) {
      console.warn('EmployeeService.getEmployees error:', error.message);
      return [];
    }

    return ((data as unknown) as EmployeeWithRelations[]) || [];
  }

  /**
   * Aggregate statistics for employee management dashboard.
   */
  async getEmployeeStats(): Promise<EmployeeStats> {
    if (!isSupabaseConfigured()) {
      return { total: 0, active: 0, inactive: 0, linkedToAccount: 0 };
    }

    try {
      const { data, error } = await supabase
        .from('employees')
        .select('id, status, profile_id');

      if (error || !data) {
        return { total: 0, active: 0, inactive: 0, linkedToAccount: 0 };
      }

      const total = data.length;
      let active = 0;
      let inactive = 0;
      let linkedToAccount = 0;

      for (const row of data) {
        if (row.status === 'active') active++;
        if (row.status === 'inactive') inactive++;
        if (row.profile_id) linkedToAccount++;
      }

      return { total, active, inactive, linkedToAccount };
    } catch {
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
      .select('*, departments(*), positions(*), profiles(*)')
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
      .select('*, departments(*), positions(*), profiles(*)')
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
   * Fetch active profiles that are not yet linked to any employee record (or linked to target employee).
   */
  async getUnlinkedProfiles(currentProfileId?: string | null): Promise<ProfileRow[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }

    // 1. Fetch all active profiles
    const { data: allProfiles, error: profError } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_active', true)
      .order('full_name', { ascending: true });

    if (profError || !allProfiles) {
      return [];
    }

    // 2. Fetch all currently assigned profile_ids in employees table
    const { data: assignedEmployees, error: empError } = await supabase
      .from('employees')
      .select('profile_id')
      .not('profile_id', 'is', null);

    if (empError || !assignedEmployees) {
      return allProfiles;
    }

    const assignedSet = new Set(
      assignedEmployees
        .map((e) => e.profile_id)
        .filter((id): id is string => id !== null && id !== currentProfileId)
    );

    return allProfiles.filter((p) => !assignedSet.has(p.id));
  }
}

export const employeeService = new EmployeeService();
export type { EmployeeWithRelations };
