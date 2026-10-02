import { User as SupabaseUser, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, SUPABASE_MISSING_CONFIG_MESSAGE } from '../lib/supabase';
import { User, LoginCredentials } from '../types/auth';
import { ProfileRow } from '../types/database.types';
import { APP_CONFIG } from '../config/appConfig';

const VALID_ROLES = ['super_admin', 'admin', 'headmaster', 'employee', 'verifier'];

/**
 * Authentication Service (Phase 3 Production Supabase Auth)
 * Encapsulates signInWithPassword, signOut, getSession, resetPassword, and updateUser.
 * Role is strictly authoritative from `public.profiles.role`.
 */
class AuthService {
  /**
   * Fetch authoritative user profile from database based on authenticated user ID.
   * Role is never taken from user input or client storage.
   */
  public async loadFullUserData(supabaseUser: SupabaseUser): Promise<{ user: User; profile: ProfileRow }> {
    // 1. Fetch authoritative profile from database based on auth.uid()
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', supabaseUser.id)
      .single();

    if (profileError || !profile) {
      throw new Error('Profil pengguna tidak ditemukan di database. Hubungi administrator.');
    }

    // 2. Validate authoritative role
    if (!VALID_ROLES.includes(profile.role)) {
      throw new Error('Role pengguna tidak valid. Hubungi administrator.');
    }

    // 3. Fetch employee details if linked
    let employeeData = null;
    try {
      const { data: emp } = await supabase
        .from('employees')
        .select('*, departments(name), positions(name)')
        .eq('profile_id', supabaseUser.id)
        .maybeSingle();

      if (emp) {
        employeeData = emp;
      }
    } catch {
      // Ignore if employee table row does not exist yet
    }

    const deptName = (employeeData?.departments as { name?: string } | null)?.name || 'Satuan Pendidikan';
    const posName = (employeeData?.positions as { name?: string } | null)?.name ||
      (profile.role === 'admin' ? 'Administrator SIM' :
       profile.role === 'headmaster' ? 'Kepala Sekolah' :
       profile.role === 'verifier' ? 'Verifikator Presensi' :
       profile.role === 'super_admin' ? 'Super Administrator' : 'Tenaga Pendidik / Guru');

    const userModel: User = {
      id: profile.id,
      email: supabaseUser.email || '',
      name: profile.full_name || supabaseUser.email?.split('@')[0] || 'Pegawai',
      role: profile.role,
      nip: employeeData?.nip || '—',
      position: posName,
      department: deptName,
      avatarUrl: profile.avatar_url || undefined,
      schoolName: APP_CONFIG.schoolName,
      status: profile.is_active ? 'active' : 'inactive',
      joinedDate: employeeData?.join_date || profile.created_at?.split('T')[0] || '—',
      phoneNumber: employeeData?.phone || undefined,
      lastLoginAt: profile.last_login_at,
    };

    return { user: userModel, profile };
  }

  /**
   * Production Sign In with Email & Password
   * Automatically derives user role from public.profiles.role in database
   */
  public async signIn(credentials: LoginCredentials): Promise<{ user: User; session: Session; profile: ProfileRow }> {
    if (!isSupabaseConfigured()) {
      throw new Error(SUPABASE_MISSING_CONFIG_MESSAGE);
    }

    const email = credentials.email.trim().toLowerCase();
    const password = credentials.password;

    // 1. Client-side input validation
    if (!email) {
      throw new Error('Email wajib diisi.');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new Error('Format email tidak valid.');
    }

    if (!password) {
      throw new Error('Password wajib diisi.');
    }

    // 2. Call Supabase Auth signInWithPassword
    let authResponse;
    try {
      authResponse = await supabase.auth.signInWithPassword({
        email,
        password,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg.includes('fetch') || msg.includes('network') || msg.includes('Failed to fetch')) {
        throw new Error('Tidak dapat terhubung ke server. Silakan coba lagi.');
      }
      throw new Error('Terjadi kesalahan saat masuk. Silakan coba lagi.');
    }

    const { data, error } = authResponse;

    if (error) {
      const errMsg = error.message.toLowerCase();
      if (
        errMsg.includes('invalid login credentials') ||
        errMsg.includes('invalid_grant') ||
        errMsg.includes('invalid credentials') ||
        errMsg.includes('email not confirmed')
      ) {
        throw new Error('Email atau password salah.');
      }
      if (errMsg.includes('fetch') || errMsg.includes('network') || errMsg.includes('connection')) {
        throw new Error('Tidak dapat terhubung ke server. Silakan coba lagi.');
      }
      throw new Error('Email atau password salah.');
    }

    if (!data.user || !data.session) {
      throw new Error('Email atau password salah.');
    }

    // 3. Load authoritative profile directly from database (public.profiles.role)
    const { user: userModel, profile } = await this.loadFullUserData(data.user);

    // 4. Check active account status
    if (profile.is_active === false) {
      await supabase.auth.signOut();
      throw new Error('Akun Anda tidak aktif. Silakan hubungi administrator.');
    }

    // 5. Safely record last login timestamp
    try {
      await supabase.rpc('record_last_login');
    } catch {
      try {
        await supabase
          .from('profiles')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', data.user.id);
      } catch {
        // Non-blocking
      }
    }

    return {
      user: userModel,
      session: data.session,
      profile,
    };
  }

  /**
   * Production Sign Out
   */
  public async signOut(): Promise<void> {
    if (!isSupabaseConfigured()) {
      return;
    }
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.warn('Sign out error:', err);
    }
  }

  /**
   * Get Current Session
   */
  public async getSession(): Promise<Session | null> {
    if (!isSupabaseConfigured()) {
      return null;
    }
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      return null;
    }
    return data.session;
  }

  /**
   * Get Current Authenticated User from Supabase
   */
  public async getCurrentUser(): Promise<SupabaseUser | null> {
    if (!isSupabaseConfigured()) {
      return null;
    }
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      return null;
    }
    return data.user;
  }

  /**
   * Send Password Reset Email via Supabase Auth
   */
  public async resetPassword(email: string, redirectTo?: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      throw new Error(SUPABASE_MISSING_CONFIG_MESSAGE);
    }

    const trimmed = email.trim().toLowerCase();
    if (!trimmed) {
      throw new Error('Email wajib diisi.');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      throw new Error('Format email tidak valid.');
    }

    const callbackUrl = redirectTo || `${window.location.origin}/reset-password`;

    const { error } = await supabase.auth.resetPasswordForEmail(trimmed, {
      redirectTo: callbackUrl,
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('network') || msg.includes('fetch')) {
        throw new Error('Tidak dapat terhubung ke server. Silakan coba lagi.');
      }
      throw new Error('Terjadi kesalahan saat memproses permintaan reset password.');
    }
  }

  /**
   * Update User Password (used after user opens password reset link)
   */
  public async updatePassword(newPassword: string): Promise<void> {
    if (!isSupabaseConfigured()) {
      throw new Error(SUPABASE_MISSING_CONFIG_MESSAGE);
    }

    if (!newPassword) {
      throw new Error('Password wajib diisi.');
    }

    if (newPassword.length < 6) {
      throw new Error('Kata sandi minimal 6 karakter.');
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      const msg = error.message.toLowerCase();
      if (msg.includes('network') || msg.includes('fetch')) {
        throw new Error('Tidak dapat terhubung ke server. Silakan coba lagi.');
      }
      throw new Error('Gagal memperbarui kata sandi. Tautan mungkin telah kedaluwarsa.');
    }
  }

  /**
   * Listen to auth state changes from Supabase
   */
  public onAuthStateChange(
    callback: (event: AuthChangeEvent, session: Session | null) => void
  ): () => void {
    if (!isSupabaseConfigured()) {
      return () => {};
    }

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(callback);

    return () => {
      subscription.unsubscribe();
    };
  }
}

export const authService = new AuthService();
