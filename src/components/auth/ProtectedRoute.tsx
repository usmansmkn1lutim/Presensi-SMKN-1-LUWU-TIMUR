import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/auth';
import { ShieldAlert } from 'lucide-react';
import { Button } from '../ui/Button';

interface ProtectedRouteProps {
  children: React.ReactElement;
  allowedRoles?: UserRole[];
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFFFF]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#F97316] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium text-[#6B7280]">Memeriksa sesi pengguna...</p>
        </div>
      </div>
    );
  }

  // Not logged in -> redirect to /login
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role check if specific roles are defined for this route
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full p-6 rounded-2xl bg-white border border-[#E5E7EB] text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#111827]">Akses Terbatas</h2>
            <p className="text-xs text-[#6B7280] mt-1">
              Halaman ini memerlukan hak akses administratif. Role Anda saat ini adalah{' '}
              <strong className="text-[#111827]">{user.role}</strong>.
            </p>
          </div>
          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.history.back()}
            >
              Kembali ke Halaman Sebelumnya
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return children;
};
