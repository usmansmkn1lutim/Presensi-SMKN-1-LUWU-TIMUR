// ============================================================================
// Service: UserService
// Module: PHASE 4B-3 — User Management Service
// Description:
//   Service layer for User & Account Management.
//   Bridges User Management UI, Supabase DB, RPCs, and Edge Functions.
//   Strictly adheres to:
//     - 4 Active App Roles ('super_admin', 'admin', 'headmaster', 'employee')
//     - No secret keys in frontend
//     - Safe authorization boundaries (no direct privilege escalation)
// ============================================================================

import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { ProfileRow } from '../types/database.types';

export type ActiveAppRole = 'super_admin' | 'admin' | 'headmaster' | 'employee';

export interface CreateUserInput {
  full_name: string;
  email: string;
  role: ActiveAppRole;
}

export interface CreateUserResponse {
  success: boolean;
  message: string;
  user?: {
    id: string;
    full_name: string;
    email: string;
    role: ActiveAppRole;
    is_active: boolean;
  };
}

export interface UnlinkedEmployeeItem {
  id: string;
  full_name: string;
  nip: string | null;
  department_name: string | null;
  position_name: string | null;
}

export interface UserManagementItem {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: ActiveAppRole;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
  employee_id?: string | null;
  employee_name?: string | null;
}

const ALLOWED_ROLES: ActiveAppRole[] = [
  'super_admin',
  'admin',
  'headmaster',
  'employee',
];

class UserService {
  /**
   * 1. Get Current User's Profile
   * Reads profile directly from public.profiles table using authenticated auth.uid().
   * Guaranteed to be authoritative (never reads role from localStorage or URL).
   */
  async getCurrentUserProfile(): Promise<ProfileRow | null> {
    if (!isSupabaseConfigured()) {
      return null;
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return null;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) {
      console.warn('UserService.getCurrentUserProfile error:', error.message);
      return null;
    }

    return data;
  }

  /**
   * 2. Get Users for User Management
   * Fetches profile records via secure SECURITY DEFINER RPC `get_managed_users`.
   * Annotates linked employee information safely if available.
   */
  async getUsers(): Promise<UserManagementItem[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }

    // 1. Fetch profiles accessible by caller via secure RPC
    const { data: profiles, error: profileError } = await supabase
      .rpc('get_managed_users');

    if (profileError) {
      console.error('UserService.getUsers RPC error:', profileError.message);
      throw new Error(profileError.message || 'Gagal memuat data pengguna.');
    }

    if (!profiles) {
      return [];
    }

    // 2. Fetch linked employees to annotate employee details
    const { data: employees, error: employeeError } = await supabase
      .from('employees')
      .select('id, full_name, profile_id')
      .not('profile_id', 'is', null);

    if (employeeError) {
      console.warn('UserService.getUsers employee annotation warning:', employeeError.message);
    }

    const employeeMap = new Map<string, { id: string; name: string }>();
    if (employees) {
      for (const emp of employees) {
        if (emp.profile_id) {
          employeeMap.set(emp.profile_id, { id: emp.id, name: emp.full_name });
        }
      }
    }

    // 3. Format and sanitize user items matching UserManagementItem contract
    return ((profiles as unknown) as ProfileRow[]).map((p) => {
      const linked = employeeMap.get(p.id);
      return {
        id: p.id,
        full_name: p.full_name || 'Pengguna Tanpa Nama',
        avatar_url: p.avatar_url,
        role: (p.role as ActiveAppRole) || 'employee',
        is_active: p.is_active,
        last_login_at: p.last_login_at,
        created_at: p.created_at,
        updated_at: p.updated_at,
        employee_id: linked?.id || null,
        employee_name: linked?.name || null,
      };
    });
  }

  /**
   * 3. Get Linkable Profiles (Accounts not yet linked to any employee)
   * Consumes RPC get_linkable_profiles created in PHASE 4A.
   */
  async getLinkableProfiles(): Promise<ProfileRow[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }

    const { data, error } = await supabase.rpc('get_linkable_profiles');

    if (error) {
      console.error('UserService.getLinkableProfiles RPC error:', error.message);
      throw new Error(error.message || 'Gagal memuat daftar akun yang dapat dihubungkan.');
    }

    return (data as unknown as ProfileRow[]) || [];
  }

  /**
   * 4. Create New User via Secure Edge Function
   * Strictly invokes Supabase Edge Function `create-user` (PHASE 4B-2).
   * Does NOT accept passwords and does NOT use service_role key in browser.
   */
  async createUser(input: CreateUserInput): Promise<CreateUserResponse> {
    if (!isSupabaseConfigured()) {
      throw new Error('Konfigurasi Supabase belum lengkap.');
    }

    // Client-side Input Validation
    const trimmedName = input.full_name?.trim();
    const trimmedEmail = input.email?.trim().toLowerCase();
    const role = input.role;

    if (!trimmedName || trimmedName.length < 2 || trimmedName.length > 150) {
      throw new Error('Nama lengkap wajib diisi (antara 2 hingga 150 karakter).');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!trimmedEmail || !emailRegex.test(trimmedEmail) || trimmedEmail.length > 255) {
      throw new Error('Alamat email tidak valid.');
    }

    if (!role || !ALLOWED_ROLES.includes(role)) {
      throw new Error(`Role tidak valid. Pilihan role: ${ALLOWED_ROLES.join(', ')}.`);
    }

    // Invoke Edge Function `create-user`
    const { data, error } = await supabase.functions.invoke('create-user', {
      body: {
        full_name: trimmedName,
        email: trimmedEmail,
        role: role,
      },
    });

    if (error) {
      let errorMessage = 'Gagal membuat akun pengguna.';
      try {
        if (data && typeof data === 'object' && 'message' in data) {
          errorMessage = (data as { message: string }).message;
        } else if (error.message) {
          errorMessage = error.message;
        }
      } catch {
        // Fallback message
      }
      throw new Error(errorMessage);
    }

    if (data && typeof data === 'object' && 'success' in data && !(data as { success: boolean }).success) {
      throw new Error((data as { message: string }).message || 'Gagal membuat akun pengguna.');
    }

    return data as CreateUserResponse;
  }

  /**
   * 5. Update User Role
   * Invokes secure Edge Function `update-user-role` (PHASE 4B-5-1).
   * Validates target role client-side and enforces server-side privilege matrices.
   */
  async updateUserRole(targetUserId: string, newRole: ActiveAppRole): Promise<{
    success: boolean;
    message: string;
    user?: { id: string; full_name: string; role: ActiveAppRole; is_active: boolean };
  }> {
    if (!isSupabaseConfigured()) {
      throw new Error('Konfigurasi Supabase belum lengkap.');
    }

    if (!targetUserId || typeof targetUserId !== 'string') {
      throw new Error('ID pengguna target tidak valid.');
    }

    if (!newRole || !ALLOWED_ROLES.includes(newRole)) {
      throw new Error(`Role tidak valid. Pilihan role: ${ALLOWED_ROLES.join(', ')}.`);
    }

    const { data, error } = await supabase.functions.invoke('update-user-role', {
      body: {
        target_user_id: targetUserId.trim(),
        new_role: newRole,
      },
    });

    if (error) {
      let errorMessage = 'Gagal memperbarui peran pengguna.';
      try {
        if (data && typeof data === 'object' && 'message' in data) {
          errorMessage = (data as { message: string }).message;
        } else if (error.message) {
          errorMessage = error.message;
        }
      } catch {
        // Fallback message
      }
      throw new Error(errorMessage);
    }

    if (data && typeof data === 'object' && 'success' in data && !(data as { success: boolean }).success) {
      throw new Error((data as { message: string }).message || 'Gagal memperbarui peran pengguna.');
    }

    return data;
  }

  /**
   * 6. Update User Active Status
   * Invokes secure Edge Function `update-user-status` (PHASE 4B-6-1).
   * Validates target ID and boolean status, enforcing server-side authorization.
   */
  async updateUserStatus(targetUserId: string, isActive: boolean): Promise<{
    success: boolean;
    message: string;
    user?: { id: string; full_name: string; role: ActiveAppRole; is_active: boolean };
  }> {
    if (!isSupabaseConfigured()) {
      throw new Error('Konfigurasi Supabase belum lengkap.');
    }

    if (!targetUserId || typeof targetUserId !== 'string') {
      throw new Error('ID pengguna target tidak valid.');
    }

    if (typeof isActive !== 'boolean') {
      throw new Error('Status akun tidak valid (harus berupa boolean true atau false).');
    }

    const { data, error } = await supabase.functions.invoke('update-user-status', {
      body: {
        target_user_id: targetUserId.trim(),
        is_active: isActive,
      },
    });

    if (error) {
      let errorMessage = 'Gagal memperbarui status akun pengguna.';
      try {
        if (data && typeof data === 'object' && 'message' in data) {
          errorMessage = (data as { message: string }).message;
        } else if (error.message) {
          errorMessage = error.message;
        }
      } catch {
        // Fallback message
      }
      throw new Error(errorMessage);
    }

    if (data && typeof data === 'object' && 'success' in data && !(data as { success: boolean }).success) {
      throw new Error((data as { message: string }).message || 'Gagal memperbarui status akun pengguna.');
    }

    return data;
  }

  /**
   * 7. Link User Account to Employee Record
   * Updates only employees.profile_id (PHASE 4A).
   */
  async linkUserToEmployee(employeeId: string, profileId: string | null): Promise<void> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase belum dikonfigurasi.');
    }

    const { error } = await supabase
      .from('employees')
      .update({ profile_id: profileId })
      .eq('id', employeeId);

    if (error) {
      if (error.code === '23505') {
        throw new Error('Akun pengguna ini sudah terhubung dengan pegawai lain.');
      }
      throw new Error('Gagal menghubungkan akun dengan data pegawai: ' + error.message);
    }
  }

  /**
   * 8. Unlink User Account from Employee Record
   * Sets employees.profile_id = NULL without modifying or deleting user account or employee record (PHASE 4B-7-3).
   */
  async unlinkUserFromEmployee(employeeId: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase belum dikonfigurasi.');
    }

    if (!employeeId || typeof employeeId !== 'string') {
      throw new Error('ID pegawai target tidak valid.');
    }

    const { error } = await supabase
      .from('employees')
      .update({ profile_id: null })
      .eq('id', employeeId);

    if (error) {
      console.error('UserService.unlinkUserFromEmployee error:', error);
      throw new Error('Gagal melepaskan hubungan akun dengan data pegawai: ' + error.message);
    }
  }

  /**
   * 9. Trigger Password Reset
   * Sends password reset email to the user using standard safe Supabase client.
   */
  async triggerPasswordReset(email: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase belum dikonfigurasi.');
    }

    const normalizedEmail = email.trim().toLowerCase();
    const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      throw new Error('Gagal mengirim email reset password: ' + error.message);
    }
  }

  /**
   * 9. Fetch Active Employees Not Yet Linked to Any Profile
   * Strictly filters employees where profile_id IS NULL and status is active.
   */
  async getUnlinkedEmployees(): Promise<UnlinkedEmployeeItem[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }

    const { data, error } = await supabase
      .from('employees')
      .select(`
        id,
        full_name,
        nip,
        departments (
          name
        ),
        positions (
          name
        )
      `)
      .is('profile_id', null)
      .eq('status', 'active')
      .order('full_name', { ascending: true });

    if (error) {
      console.error('UserService.getUnlinkedEmployees error:', error);
      throw new Error('Gagal memuat data pegawai yang belum terhubung.');
    }

    return (data || []).map((emp: any) => ({
      id: emp.id,
      full_name: emp.full_name,
      nip: emp.nip || null,
      department_name: emp.departments?.name || null,
      position_name: emp.positions?.name || null,
    }));
  }
}

export const userService = new UserService();
