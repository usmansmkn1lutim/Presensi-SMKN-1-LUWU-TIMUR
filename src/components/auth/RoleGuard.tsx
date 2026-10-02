import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/auth';
import { ShieldAlert } from 'lucide-react';
import { Button } from '../ui/Button';

interface RoleGuardProps {
  children: React.ReactElement;
  allowedRoles: UserRole[];
  fallbackUrl?: string;
  showForbiddenMessage?: boolean;
}

/**
 * RoleGuard Component (UX Layer)
 * Protects specific child components or views based on the user's authoritative role.
 * Note: Actual data security is always strictly enforced on the database layer via Supabase RLS.
 */
export const RoleGuard: React.FC<RoleGuardProps> = ({
  children,
  allowedRoles,
  fallbackUrl,
  showForbiddenMessage = true,
}) => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="p-8 flex justify-center items-center">
        <div className="w-6 h-6 border-2 border-[#F97316] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Use authoritative role from database profile or user object
  const currentRole = profile?.role || user?.role;

  if (!currentRole || !allowedRoles.includes(currentRole)) {
    if (fallbackUrl) {
      return <Navigate to={fallbackUrl} replace />;
    }

    if (!showForbiddenMessage) {
      return null;
    }

    return (
      <div className="min-h-[50vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full p-6 rounded-2xl bg-white border border-[#E5E7EB] text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#111827]">403 — Akses Ditolak</h2>
            <p className="text-xs text-[#6B7280] mt-1">
              Anda tidak memiliki izin untuk mengakses fitur ini. Hak akses akun Anda adalah{' '}
              <strong className="text-[#111827] capitalize">{currentRole || 'Tidak Terdefinisi'}</strong>.
            </p>
          </div>
          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.history.back()}
            >
              Kembali
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return children;
};
