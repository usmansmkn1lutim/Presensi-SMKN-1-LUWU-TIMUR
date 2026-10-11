import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { User as UserIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { RoleBadge } from '../ui/Badge';
import { SchoolLogo } from '../ui/SchoolLogo';
import { NAVIGATION_ITEMS } from '../../config/navigation';
import { NotificationBell } from '../notifications/NotificationBell';

const ROUTE_MENU_MAP: Record<string, string> = {
  '/dashboard': 'Beranda',
  '/': 'Beranda',
  '/history': 'Riwayat',
  '/attendance': 'Presensi',
  '/requests': 'Pengajuan',
  '/profile': 'Profil',
  '/employees': 'Pegawai',
  '/reports': 'Laporan',
  '/attendance-monitoring': 'Monitoring Presensi',
  '/schedules': 'Jadwal Kerja',
  '/locations': 'Lokasi',
  '/holidays': 'Hari Libur',
  '/users': 'Pengguna',
  '/settings': 'Pengaturan',
  '/notifications': 'Notifikasi',
  '/audit-logs': 'Audit Log',
};

export const getFriendlyMenuTitle = (pathname: string): string => {
  const cleanPath = pathname.endsWith('/') && pathname.length > 1 ? pathname.slice(0, -1) : pathname;

  if (ROUTE_MENU_MAP[cleanPath]) {
    return ROUTE_MENU_MAP[cleanPath];
  }

  if (cleanPath.startsWith('/employees/')) return 'Detail Pegawai';
  if (cleanPath.startsWith('/requests/')) return 'Pengajuan';
  if (cleanPath.startsWith('/history/')) return 'Riwayat';
  if (cleanPath.startsWith('/notifications/')) return 'Notifikasi';

  const navItem = NAVIGATION_ITEMS.find((item) => item.path === cleanPath);
  if (navItem) {
    return navItem.label;
  }

  return 'Beranda';
};

export const Header: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();

  // Header always displays friendly menu label instead of technical route/name
  const pageTitle = getFriendlyMenuTitle(location.pathname);

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
        {/* Dynamic Notification Bell with Badge & Dropdown */}
        <NotificationBell />

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
