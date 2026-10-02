import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, UserRole, LoginCredentials } from '../types/auth';
import { authService } from '../services/authService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: LoginCredentials) => Promise<User>;
  logout: () => Promise<void>;
  switchRole: (role: UserRole) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(authService.getCurrentUser());
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    // Subscribe to auth service state changes
    const unsubscribe = authService.subscribe((updatedUser) => {
      setUser(updatedUser);
      setIsLoading(false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const login = useCallback(async (credentials: LoginCredentials): Promise<User> => {
    return await authService.login(credentials);
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    await authService.logout();
  }, []);

  const switchRole = useCallback((role: UserRole) => {
    authService.switchRole(role);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        switchRole,
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
