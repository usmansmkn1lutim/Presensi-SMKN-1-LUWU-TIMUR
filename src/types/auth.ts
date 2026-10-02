export type UserRole = 'super_admin' | 'admin' | 'headmaster' | 'verifier' | 'employee';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  nip: string;
  position: string;
  department: string;
  avatarUrl?: string;
  schoolName: string;
  status: 'active' | 'inactive' | 'suspended';
  joinedDate: string;
  phoneNumber?: string;
}

export interface AuthSession {
  user: User | null;
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
