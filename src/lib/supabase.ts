import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Database } from '../types/database.types';

// Environment variables according to Phase 3 specification
export const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
export const supabasePublishableKey = (
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY
) as string | undefined;

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
  'VITE_SUPABASE_URL atau VITE_SUPABASE_PUBLISHABLE_KEY belum dikonfigurasi. Silakan periksa konfigurasi pada file .env.local Anda.';

let clientInstance: SupabaseClient<Database> | null = null;

export const getSupabaseClient = (): SupabaseClient<Database> => {
  if (!isSupabaseConfigured()) {
    throw new Error(SUPABASE_MISSING_CONFIG_MESSAGE);
  }

  if (!clientInstance) {
    clientInstance = createClient<Database>(supabaseUrl!, supabasePublishableKey!, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  return clientInstance;
};

/**
 * Centralized Supabase Client export.
 * Throws clean developer configuration error if environment variables are missing.
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
