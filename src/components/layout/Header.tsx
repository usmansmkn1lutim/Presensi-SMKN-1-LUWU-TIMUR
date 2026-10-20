import React, { useState, useEffect, useRef } from 'react';
import { User as UserIcon, Building2, ChevronDown } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { RoleBadge } from '../ui/Badge';
import { NAVIGATION_ITEMS } from '../../config/navigation';
import { NotificationBell } from '../notifications/NotificationBell';
import { useInstitutionSettings } from '../../hooks/useInstitutionSettings';
import { useProfileMenu } from '../../context/ProfileMenuContext';
import { ProfileUserMenu } from './ProfileUserMenu';

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
  const { user, profile } = useAuth();
  const { isOpen, toggleMenu } = useProfileMenu();
  const institutionSettings = useInstitutionSettings();
  const [logoLoadFailed, setLogoLoadFailed] = useState(false);
  const profileAnchorRef = useRef<HTMLDivElement>(null);

  // Reset logo failure state when school logo changes
  useEffect(() => {
    setLogoLoadFailed(false);
  }, [institutionSettings.schoolLogo]);

  const rawSchoolName = institutionSettings.schoolName?.trim();
  const schoolName = rawSchoolName || 'Nama Instansi Belum Diatur';
  const schoolLogo = institutionSettings.schoolLogo?.trim();
  const shouldShowLogoImage = Boolean(schoolLogo && !logoLoadFailed);

  const displayName = user?.name || profile?.full_name || 'Pegawai';
  const displayShortName = displayName.split(',')[0].trim();
  const avatarUrl = profile?.avatar_url || user?.avatarUrl;

  return (
    <header className="hidden lg:flex h-16 bg-[#F2F2F2] lg:rounded-tl-[32px] lg:rounded-tr-none border-b border-[#E5E7EB] px-3.5 sm:px-6 items-center justify-between sticky top-0 z-20 shrink-0">
      {/* Left: Identitas Sekolah */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 min-w-0">
        {/* Logo Sekolah */}
        <div className="w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center overflow-hidden shrink-0">
          {shouldShowLogoImage ? (
            <img
              src={schoolLogo}
              alt={schoolName}
              onError={() => setLogoLoadFailed(true)}
              className="w-full h-full object-contain"
            />
          ) : (
            <Building2 className="w-5 h-5 text-slate-400" />
          )}
        </div>

        {/* Nama Sekolah */}
        <div className="min-w-0">
          <h2
            className="text-base sm:text-xl font-bold text-[#111827] tracking-tight truncate max-w-[140px] xs:max-w-[190px] sm:max-w-xs md:max-w-sm lg:max-w-md xl:max-w-lg leading-tight"
            title={schoolName}
          >
            {schoolName}
          </h2>
        </div>
      </div>

      {/* Right: Notifications & User Profile Menu */}
      <div className="flex items-center gap-2 sm:gap-4 shrink-0">
        {/* Dynamic Notification Bell with Badge & Dropdown */}
        <NotificationBell />

        <div className="h-6 w-px bg-[#E5E7EB] hidden sm:block" />

        {/* User Profile Pill */}
        <div className="flex items-center gap-2 sm:gap-3 p-1 sm:px-2 rounded-xl text-[#111827]">
          {/* Nama & Role di kiri */}
          <div className="hidden sm:flex flex-col items-end text-right">
            <p className="text-xs font-semibold text-[#111827] leading-tight truncate max-w-[110px] lg:max-w-[140px]">
              {displayShortName}
            </p>
            <p className="text-[10px] text-[#6B7280] leading-tight mt-0.5 truncate max-w-[110px] lg:max-w-[140px]">
              {user?.role === 'headmaster' ? 'Kepala Sekolah' : user?.role === 'super_admin' ? 'Super Admin' : user?.role === 'admin' ? 'Admin' : 'Pegawai'}
            </p>
          </div>

          {/* Avatar di kanan */}
          <div className="w-8 h-8 rounded-full bg-white border border-[#E5E7EB] flex items-center justify-center font-bold text-xs text-[#374151] shadow-2xs shrink-0 overflow-hidden">
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            ) : displayName ? (
              displayName.charAt(0).toUpperCase()
            ) : (
              <UserIcon className="w-4 h-4 text-[#6B7280]" />
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
