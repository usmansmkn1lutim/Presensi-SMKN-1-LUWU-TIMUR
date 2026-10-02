import { User as SupabaseUser, Session } from '@supabase/supabase-js';
import { Database } from './database.types';

export type AppRole = Database['public']['Enums']['app_role'];
export type UserRole = AppRole;

export type Profile = Database['public']['Tables']['profiles']['Row'];

export interface User {
  id: string;
  email: string;
  name: string;
  role: AppRole;
  nip: string;
  position: string;
  department: string;
  avatarUrl?: string;
  schoolName: string;
  status: 'active' | 'inactive' | 'suspended';
  joinedDate: string;
  phoneNumber?: string;
  lastLoginAt?: string | null;
}

export interface AuthSession {
  user: User | null;
  supabaseUser: SupabaseUser | null;
  session: Session | null;
  token: string | null;
  isAuthenticated: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface AuthError {
  message: string;
  code?: string;
}

export interface AuthState {
  user: User | null;
  supabaseUser: SupabaseUser | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  isAuthenticated: boolean;
}
