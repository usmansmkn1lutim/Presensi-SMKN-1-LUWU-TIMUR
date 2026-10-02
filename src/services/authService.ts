import { User as SupabaseUser, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured, SUPABASE_MISSING_CONFIG_MESSAGE } from '../lib/supabase';
import { User, LoginCredentials } from '../types/auth';
import { ProfileRow } from '../types/database.types';
import { APP_CONFIG } from '../config/appConfig';

/**
 * Authentication Service (Phase 3 Production Supabase Auth)
 * Encapsulates signInWithPassword, signOut, getSession, resetPassword, and updateUser.
 */
class AuthService {
  /**
   * Helper to transform Supabase auth user, profile, and employee records into app User model
   */
  public async loadFullUserData(supabaseUser: SupabaseUser): Promise<{ user: User; profile: ProfileRow }> {
    // 1. Fetch authoritative profile from database
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', supabaseUser.id)
      .single();

    if (profileError || !profile) {
      // Fallback profile if record is still propagating from trigger
      const fallbackProfile: ProfileRow = {
        id: supabaseUser.id,
        full_name: (supabaseUser.user_metadata?.full_name as string) ||
                   (supabaseUser.user_metadata?.name as string) ||
                   supabaseUser.email?.split('@')[0] || 'Pegawai',
        avatar_url: (supabaseUser.user_metadata?.avatar_url as string) || null,
        role: 'employee',
        is_active: true,
        last_login_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const userModel: User = {
        id: supabaseUser.id,
        email: supabaseUser.email || '',
        name: fallbackProfile.full_name || 'Pegawai',
        role: fallbackProfile.role,
        nip: '—',
        position: 'Guru / Pegawai',
        department: 'SMK Negeri 1 Luwu Timur',
        avatarUrl: fallbackProfile.avatar_url || undefined,
        schoolName: APP_CONFIG.schoolName,
        status: 'active',
        joinedDate: '—',
        lastLoginAt: fallbackProfile.last_login_at,
      };

      return { user: userModel, profile: fallbackProfile };
    }

    // 2. Fetch employee details if linked
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
      // Ignore if employee row does not exist yet
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

    // 2. Call Supabase Auth API
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
      throw new Error('Terjadi kesalahan. Silakan coba lagi.');
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
      // Never leak internal stack or SQL error
      throw new Error('Email atau password salah.');
    }

    if (!data.user || !data.session) {
      throw new Error('Email atau password salah.');
    }

    // 3. Load authoritative profile from database
    const { user: userModel, profile } = await this.loadFullUserData(data.user);

    // 4. Check active account status
    if (profile.is_active === false) {
      // Force logout if account has been deactivated
      await supabase.auth.signOut();
      throw new Error('Akun Anda tidak aktif. Silakan hubungi administrator.');
    }

    // 5. Safely record last login timestamp
    try {
      await supabase.rpc('record_last_login');
    } catch {
      // Fallback direct update if RPC is pending
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
