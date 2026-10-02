import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';

// Fallback to active project credentials to ensure reliable production deployment
const DEFAULT_SUPABASE_URL = 'https://awcoqztysnwlmbvdexwc.supabase.co';
const DEFAULT_SUPABASE_KEY = 'sb_publishable_Hzsq2wByBnpLS6GkZ6w7Tw_hwY7eRo0';

export const supabaseUrl = (
  (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim() ||
  DEFAULT_SUPABASE_URL
);

export const supabasePublishableKey = (
  (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined)?.trim() ||
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined)?.trim() ||
  DEFAULT_SUPABASE_KEY
);

export const isSupabaseConfigured = (): boolean => {
  return Boolean(
    supabaseUrl &&
    supabaseUrl.trim() !== '' &&
    !supabaseUrl.includes('placeholder') &&
    supabasePublishableKey &&
    supabasePublishableKey.trim() !== ''
  );
};

export const SUPABASE_MISSING_CONFIG_MESSAGE =
  'VITE_SUPABASE_URL atau VITE_SUPABASE_PUBLISHABLE_KEY belum dikonfigurasi. Silakan periksa konfigurasi pada file .env Anda.';

let clientInstance: SupabaseClient<Database> | null = null;

export const getSupabaseClient = (): SupabaseClient<Database> => {
  if (!isSupabaseConfigured()) {
    throw new Error(SUPABASE_MISSING_CONFIG_MESSAGE);
  }

  if (!clientInstance) {
    clientInstance = createClient<Database>(supabaseUrl, supabasePublishableKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'presensi_auth_token',
      },
    });
  }

  return clientInstance;
};

/**
 * Centralized Supabase Client export.
 */
export const supabase = new Proxy({} as SupabaseClient<Database>, {
  get(_target, prop) {
    if (!isSupabaseConfigured()) {
      if (prop === 'auth') {
        return {
          signInWithPassword: async () => {
            throw new Error(SUPABASE_MISSING_CONFIG_MESSAGE);
          },
          signOut: async () => ({ error: null }),
          getSession: async () => ({ data: { session: null }, error: new Error(SUPABASE_MISSING_CONFIG_MESSAGE) }),
          getUser: async () => ({ data: { user: null }, error: new Error(SUPABASE_MISSING_CONFIG_MESSAGE) }),
          onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
          resetPasswordForEmail: async () => {
            throw new Error(SUPABASE_MISSING_CONFIG_MESSAGE);
          },
          updateUser: async () => {
            throw new Error(SUPABASE_MISSING_CONFIG_MESSAGE);
          },
        };
      }
      return () => {
        throw new Error(SUPABASE_MISSING_CONFIG_MESSAGE);
      };
    }
    const realClient = getSupabaseClient();
    const value = (realClient as unknown as Record<string, unknown>)[prop as string];
    return typeof value === 'function' ? value.bind(realClient) : value;
  },
});
