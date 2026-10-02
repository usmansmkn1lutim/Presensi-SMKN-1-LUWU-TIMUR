import React from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Bell, User as UserIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { RoleBadge } from '../ui/Badge';
import { SchoolLogo } from '../ui/SchoolLogo';
import { NAVIGATION_ITEMS } from '../../config/navigation';

export const Header: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Find page title from current location
  const currentNav = NAVIGATION_ITEMS.find((item) => item.path === location.pathname);
  const pageTitle = currentNav ? currentNav.label : 'Presensi Pegawai';

  return (
    <header className="h-16 bg-[#FFFFFF] border-b border-[#E5E7EB] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
      {/* Left: Mobile Brand & Page Title */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        <div className="lg:hidden flex items-center">
          <SchoolLogo size="sm" />
        </div>
        <div>
          <h1 className="text-base sm:text-lg font-bold text-[#111827] tracking-tight">
            {pageTitle}
          </h1>
        </div>
      </div>

      {/* Right: Notifications & User Profile */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Notification Button */}
        <button
          onClick={() => navigate('/notifications')}
          className="relative p-2 text-[#6B7280] hover:text-[#111827] hover:bg-[#F3F4F6] rounded-xl transition-colors cursor-pointer"
          aria-label="Notifikasi"
        >
          <Bell className="w-5 h-5" />
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#F97316]" />
        </button>

        <div className="h-6 w-px bg-[#E5E7EB] hidden sm:block" />

        {/* User Profile Pill */}
        <Link
          to="/profile"
          className="flex items-center gap-2.5 p-1.5 sm:px-2 rounded-xl hover:bg-[#F3F4F6] transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-[#F3F4F6] border border-[#E5E7EB] flex items-center justify-center font-bold text-xs text-[#374151]">
            {user?.name ? user.name.charAt(0) : <UserIcon className="w-4 h-4 text-[#6B7280]" />}
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-xs font-semibold text-[#111827] leading-tight">
              {user?.name ? user.name.split(',')[0] : 'Pegawai'}
            </p>
            <div className="mt-0.5">
              {user && <RoleBadge role={user.role} size="sm" />}
            </div>
          </div>
        </Link>
      </div>
    </header>
  );
};
