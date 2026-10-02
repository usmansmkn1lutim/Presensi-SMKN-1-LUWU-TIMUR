import React from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { UserRole } from '../../types/auth';
import { ShieldAlert, AlertTriangle, LogOut } from 'lucide-react';
import { Button } from '../ui/Button';

interface ProtectedRouteProps {
  children: React.ReactElement;
  allowedRoles?: UserRole[];
}

const VALID_ROLES: UserRole[] = ['super_admin', 'admin', 'headmaster', 'employee', 'verifier'];

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRoles }) => {
  const { user, profile, isAuthenticated, loading, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FFFFFF]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#F97316] border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium text-[#6B7280]">Memeriksa sesi pengguna...</p>
        </div>
      </div>
    );
  }

  // 1. Check Authentication
  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 2. Check Profile Existence
  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] p-4">
        <div className="max-w-md w-full p-6 sm:p-8 rounded-2xl bg-white border border-[#E5E7EB] text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#111827]">Profil Tidak Ditemukan</h2>
            <p className="text-xs text-[#6B7280] mt-1.5 leading-relaxed">
              Profil pengguna Anda tidak ditemukan di database (<code>public.profiles</code>).
              Silakan hubungi administrator untuk memastikan akun Anda telah dikonfigurasi dengan benar.
            </p>
          </div>
          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await logout();
                navigate('/login');
              }}
              leftIcon={<LogOut className="w-4 h-4" />}
            >
              Keluar dan Masuk Ulang
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 3. Check Role Validity
  if (!VALID_ROLES.includes(user.role)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F9FAFB] p-4">
        <div className="max-w-md w-full p-6 sm:p-8 rounded-2xl bg-white border border-[#E5E7EB] text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#111827]">Role Tidak Valid</h2>
            <p className="text-xs text-[#6B7280] mt-1.5 leading-relaxed">
              Role pengguna tidak valid. Hubungi administrator.
            </p>
          </div>
          <div className="pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await logout();
                navigate('/login');
              }}
              leftIcon={<LogOut className="w-4 h-4" />}
            >
              Keluar
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // 4. Check Allowed Roles for Current Route
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full p-6 rounded-2xl bg-white border border-[#E5E7EB] text-center space-y-4 shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#111827]">Akses Terbatas</h2>
            <p className="text-xs text-[#6B7280] mt-1.5 leading-relaxed">
              Halaman ini memerlukan hak akses khusus. Role akun Anda saat ini adalah{' '}
              <strong className="text-[#111827] capitalize">{user.role.replace('_', ' ')}</strong>.
            </p>
          </div>
          <div className="pt-2 flex justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/dashboard')}
            >
              Kembali ke Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return children;
};
