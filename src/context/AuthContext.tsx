import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Session } from '@supabase/supabase-js';
import { User, LoginCredentials } from '../types/auth';
import { ProfileRow } from '../types/database.types';
import { authService } from '../services/authService';
import { isSupabaseConfigured } from '../lib/supabase';

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: ProfileRow | null;
  loading: boolean;
  isLoading: boolean; // Alias for backward compatibility
  isAuthenticated: boolean;
  signIn: (credentials: LoginCredentials) => Promise<{ user: User; session: Session; profile: ProfileRow }>;
  login: (credentials: LoginCredentials) => Promise<{ user: User; session: Session; profile: ProfileRow }>; // Alias
  signOut: () => Promise<void>;
  logout: () => Promise<void>; // Alias
  refreshProfile: () => Promise<void>;
  resetPassword: (email: string, redirectTo?: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize and verify session on initial load
  useEffect(() => {
    let isMounted = true;

    const initAuth = async () => {
      if (!isSupabaseConfigured()) {
        if (isMounted) setLoading(false);
        return;
      }

      try {
        const initialSession = await authService.getSession();
        if (initialSession?.user && isMounted) {
          setSession(initialSession);
          const { user: userModel, profile: profileRow } = await authService.loadFullUserData(initialSession.user);

          // Verify account is active
          if (profileRow.is_active === false) {
            await authService.signOut();
            if (isMounted) {
              setUser(null);
              setSession(null);
              setProfile(null);
            }
          } else if (isMounted) {
            setUser(userModel);
            setProfile(profileRow);
          }
        }
      } catch (err) {
        console.warn('Initial session check error:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initAuth();

    // Listen to Supabase auth state changes (sign in, sign out, token refresh)
    const unsubscribe = authService.onAuthStateChange(async (event, currentSession) => {
      if (!isMounted) return;

      if (event === 'SIGNED_OUT' || !currentSession?.user) {
        setUser(null);
        setSession(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        setSession(currentSession);
        try {
          const { user: userModel, profile: profileRow } = await authService.loadFullUserData(currentSession.user);
          if (profileRow.is_active === false) {
            await authService.signOut();
            if (isMounted) {
              setUser(null);
              setSession(null);
              setProfile(null);
            }
          } else if (isMounted) {
            setUser(userModel);
            setProfile(profileRow);
          }
        } catch (err) {
          console.warn('Auth state change user load error:', err);
        } finally {
          if (isMounted) setLoading(false);
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (credentials: LoginCredentials) => {
    setLoading(true);
    try {
      const result = await authService.signIn(credentials);
      setUser(result.user);
      setSession(result.session);
      setProfile(result.profile);
      return result;
    } finally {
      setLoading(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setLoading(true);
    try {
      await authService.signOut();
      setUser(null);
      setSession(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    const currentSession = session || (await authService.getSession());
    if (!currentSession?.user) return;

    try {
      const { user: userModel, profile: profileRow } = await authService.loadFullUserData(currentSession.user);
      setUser(userModel);
      setProfile(profileRow);
    } catch (err) {
      console.warn('refreshProfile error:', err);
    }
  }, [session]);

  const resetPassword = useCallback(async (email: string, redirectTo?: string) => {
    await authService.resetPassword(email, redirectTo);
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    await authService.updatePassword(newPassword);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        isLoading: loading,
        isAuthenticated: !!user && !!session && (profile?.is_active ?? true),
        signIn,
        login: signIn,
        signOut,
        logout: signOut,
        refreshProfile,
        resetPassword,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
