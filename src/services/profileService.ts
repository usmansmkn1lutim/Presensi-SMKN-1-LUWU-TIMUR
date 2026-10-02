import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { ProfileRow, ProfileUpdate } from '../types/database.types';

/**
 * Profile Service
 * Encapsulates read and update operations for the `profiles` table.
 * Authoritative user profiles are fetched from Supabase PostgreSQL.
 */
class ProfileService {
  /**
   * Fetch the current authenticated user's profile.
   */
  async getMyProfile(): Promise<ProfileRow | null> {
    if (!isSupabaseConfigured()) {
      return null;
    }

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return null;
    }

    return this.getProfileById(user.id);
  }

  /**
   * Fetch a user profile by user UUID.
   */
  async getProfileById(userId: string): Promise<ProfileRow | null> {
    if (!isSupabaseConfigured()) {
      return null;
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.warn('ProfileService.getProfileById error:', error.message);
      return null;
    }

    return data;
  }

  /**
   * Update non-privileged fields for the current user's profile (name, avatar).
   */
  async updateMyProfile(
    updates: { full_name?: string; avatar_url?: string }
  ): Promise<ProfileRow | null> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase configuration is missing.');
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      throw new Error('Sesi pengguna tidak valid.');
    }

    return this.updateProfile(user.id, updates);
  }

  /**
   * Update fields for a specific profile (protected by RLS on database level).
   */
  async updateProfile(
    userId: string,
    updates: ProfileUpdate
  ): Promise<ProfileRow | null> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase configuration is missing.');
    }

    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return data;
  }

  /**
   * List all active school profiles (for administrative directories).
   */
  async getActiveProfiles(): Promise<ProfileRow[]> {
    if (!isSupabaseConfigured()) {
      return [];
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('is_active', true)
      .order('full_name', { ascending: true });

    if (error) {
      console.warn('ProfileService.getActiveProfiles error:', error.message);
      return [];
    }

    return data || [];
  }
}

export const profileService = new ProfileService();
