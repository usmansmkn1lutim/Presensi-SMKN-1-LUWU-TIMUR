import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { UserRound, UsersRound, BarChart3, LucideIcon, Fingerprint } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

/* ==========================================================================
   Custom & Lucide Navbar Icons (Home, Riwayat, Pengajuan, Profil, Pegawai)
   - Consistent 24x24 viewBox, w-5 h-5 (20px), centered geometry.
   - Inactive: Outline with neutral gray (#6B7280) and transparent fill.
   - Active: Solid Orange Sunset (#F97316) fill with cutout/white inner accents.
   ========================================================================== */

/** 1. Home: Rumah sederhana dengan sudut membulat, dengan dash horizontal rounded cutout */
const NavHomeIcon: React.FC<{ isActive: boolean; className?: string }> = ({
  isActive,
  className = 'w-5 h-5',
}) => {
  const color = isActive ? '#F97316' : 'currentColor';

  if (isActive) {
    return (
      <svg
        viewBox="0 0 24 24"
        className={className}
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Fill rumah dengan evenodd fillRule untuk cutout dash transparan murni */}
        <path
          d="M3 10.5L10.707 3.586a1.8 1.8 0 0 1 2.586 0L21 10.5v8.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8.5z M9.5 15.5h5a1 1 0 0 1 1 1a1 1 0 0 1-1 1h-5a1 1 0 0 1-1-1a1 1 0 0 1 1-1z"
          fill={color}
          fillRule="evenodd"
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path d="M3 10.5L10.707 3.586a1.8 1.8 0 0 1 2.586 0L21 10.5v8.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-8.5z" />
      <line x1="9.5" y1="16.5" x2="14.5" y2="16.5" />
    </svg>
  );
};

/** 2. Riwayat: Kalender minimalis bersudut membulat, 2 pengait, 1 garis pemisah header */
const NavHistoryIcon: React.FC<{ isActive: boolean; className?: string }> = ({
  isActive,
  className = 'w-5 h-5',
}) => {
  const maskId = `nav-history-mask-${React.useId().replace(/:/g, '')}`;

  if (isActive) {
    return (
      <svg
        viewBox="0 0 24 24"
        className={className}
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <mask
            id={maskId}
            maskUnits="userSpaceOnUse"
            x="0"
            y="0"
            width="24"
            height="24"
          >
            <rect x="0" y="0" width="24" height="24" fill="white" />
            {/* Garis horizontal pemisah header (cutout transparan) */}
            <line
              x1="3.5"
              y1="10.5"
              x2="20.5"
              y2="10.5"
              stroke="black"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </mask>
        </defs>
        {/* Badan kalender bersudut membulat dengan mask cutout transparan */}
        <rect
          x="3.5"
          y="5"
          width="17"
          height="16"
          rx="2.5"
          fill="#F97316"
          stroke="#F97316"
          mask={`url(#${maskId})`}
        />
        {/* Dua pengait pendek di atas */}
        <line x1="8" y1="2.5" x2="8" y2="6.5" stroke="#F97316" />
        <line x1="16" y1="2.5" x2="16" y2="6.5" stroke="#F97316" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Badan kalender bersudut membulat */}
      <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
      {/* Dua pengait pendek di atas */}
      <line x1="8" y1="2.5" x2="8" y2="6.5" />
      <line x1="16" y1="2.5" x2="16" y2="6.5" />
      {/* Garis horizontal pemisah header */}
      <line x1="3.5" y1="10.5" x2="20.5" y2="10.5" />
    </svg>
  );
};

/** 3. Pengajuan: Dokumen bersudut membulat, lipatan kanan atas, 2 garis horizontal */
const NavRequestIcon: React.FC<{ isActive: boolean; className?: string }> = ({
  isActive,
  className = 'w-5 h-5',
}) => {
  const maskId = `nav-request-mask-${React.useId().replace(/:/g, '')}`;

  if (isActive) {
    return (
      <svg
        viewBox="0 0 24 24"
        className={className}
        fill="none"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <defs>
          <mask
            id={maskId}
            maskUnits="userSpaceOnUse"
            x="0"
            y="0"
            width="24"
            height="24"
          >
            <rect x="0" y="0" width="24" height="24" fill="white" />
            {/* Lipatan kanan atas (cutout transparan) */}
            <polyline
              points="14 3.5 14 9 19.5 9"
              fill="none"
              stroke="black"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {/* Dua garis horizontal isi dokumen (cutout transparan) */}
            <line
              x1="8"
              y1="13.5"
              x2="16"
              y2="13.5"
              stroke="black"
              strokeWidth="2"
              strokeLinecap="round"
            />
            <line
              x1="8"
              y1="17"
              x2="13"
              y2="17"
              stroke="black"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </mask>
        </defs>
        {/* Siluet badan dokumen dengan mask cutout transparan */}
        <path
          d="M5 3.5h9l5.5 5.5v10.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-14a2 2 0 0 1 2-2z"
          fill="#F97316"
          stroke="#F97316"
          mask={`url(#${maskId})`}
        />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* Siluet badan dokumen dengan lipatan */}
      <path d="M5 3.5h9l5.5 5.5v10.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-14a2 2 0 0 1 2-2z" />
      {/* Lipatan kanan atas */}
      <polyline points="14 3.5 14 9 19.5 9" />
      {/* Dua garis horizontal isi dokumen */}
      <line x1="8" y1="13.5" x2="16" y2="13.5" />
      <line x1="8" y1="17" x2="13" y2="17" />
    </svg>
  );
};

/**
 * 4. Ikon FAB Presensi: Fingerprint Icon dari Lucide React
 * - Berukuran 40px x 40px
 * - Posisi horizontal tepat di tengah menggunakan absolute centering
 */
const NavScannerFabIcon: React.FC<{ className?: string }> = ({
  className = 'w-[40px] h-[40px]',
}) => {
  return (
    <Fingerprint
      className={`${className} text-white`}
    />
  );
};

interface MobileNavTab {
  label: string;
  path: string;
  icon?: LucideIcon;
  isPrimary?: boolean;
}

export const MobileBottomNav: React.FC = () => {
  const { user } = useAuth();
  const shouldReduceMotion = useReducedMotion();
  const role = user?.role || 'employee';

  // Determine role-aware 5-item tabs for mobile & tablet navbar
  let navTabs: MobileNavTab[] = [];

  if (role === 'admin' || role === 'super_admin') {
    navTabs = [
      { label: 'Beranda', path: '/dashboard' },
      { label: 'Pegawai', path: '/employees', icon: UsersRound },
      { label: 'Permohonan', path: '/requests' },
      { label: 'Laporan', path: '/reports', icon: BarChart3 },
      { label: 'Profile', path: '/account' },
    ];
  } else if (role === 'headmaster') {
    navTabs = [
      { label: 'Beranda', path: '/dashboard' },
      { label: 'Pegawai', path: '/employees', icon: UsersRound },
      { label: 'Presensi', path: '/attendance', isPrimary: true },
      { label: 'Laporan', path: '/reports', icon: BarChart3 },
      { label: 'Profil', path: '/account' },
    ];
  } else {
    navTabs = [
      { label: 'Beranda', path: '/dashboard' },
      { label: 'Riwayat', path: '/history' },
      { label: 'Presensi', path: '/attendance', isPrimary: true },
      { label: 'Pengajuan', path: '/requests' },
      { label: 'Profil', path: '/account' },
    ];
  }

  // Helper untuk me-render ikon navigasi sesuai desain spesifik
  const renderTabIcon = (tab: MobileNavTab, isActive: boolean) => {
    if (tab.path === '/dashboard' || tab.path === '/') {
      return <NavHomeIcon isActive={isActive} />;
    }
    if (tab.path === '/history') {
      return <NavHistoryIcon isActive={isActive} />;
    }
    if (tab.path === '/requests') {
      return <NavRequestIcon isActive={isActive} />;
    }
    if (tab.path === '/reports') {
      return (
        <BarChart3
          className="w-5 h-5"
          fill="none"
          color={isActive ? '#F97316' : 'currentColor'}
          strokeWidth={2}
        />
      );
    }
    if (tab.path === '/account' || tab.path === '/profile') {
      return (
        <UserRound
          className="w-5 h-5"
          fill={isActive ? '#F97316' : 'none'}
          color={isActive ? '#F97316' : 'currentColor'}
          strokeWidth={2}
        />
      );
    }
    const FallbackIcon = tab.icon;
    return FallbackIcon ? (
      <FallbackIcon
        className="w-5 h-5"
        fill={isActive ? '#F97316' : 'none'}
        color={isActive ? '#F97316' : 'currentColor'}
        strokeWidth={2}
      />
    ) : null;
  };

  return (
    <nav
      aria-label="Navigasi Utama Mobile & Tablet"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#FFFFFF] dark:bg-[#262626] border-t border-[#E5E7EB] dark:border-[#404040] px-3 py-1.5 shadow-sm"
    >
      <div className="flex items-center justify-around max-w-xl mx-auto">
        {navTabs.map((tab) => {
          if (tab.isPrimary) {
            return (
              <NavLink
                key={tab.path}
                to={tab.path}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center -mt-[30px] transition-transform active:scale-95 px-2 flex-1 max-w-[72px] ${
                    isActive ? 'scale-105' : ''
                  }`
                }
              >
                {({ isActive }) => (
                  <div className="w-[60px] h-[60px] rounded-full bg-[#F97316] text-white relative shadow-md border-3 border-white dark:border-[#262626] hover:bg-[#EA580C] transition-colors">
                    <NavScannerFabIcon className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[40px] h-[40px]" />
                  </div>
                )}
              </NavLink>
            );
          }

          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-1 px-1.5 transition-colors flex-1 max-w-[72px] ${
                  isActive
                    ? 'text-[#F97316] font-semibold'
                    : 'text-[#6B7280] dark:text-[#A3A3A3] hover:text-[#111827] dark:hover:text-[#F9FAFB]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <div className="relative flex items-center justify-center w-12 h-7">
                    {isActive && (
                      <motion.div
                        initial={shouldReduceMotion ? false : { opacity: 0, scale: 0.6 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={
                          shouldReduceMotion
                            ? { duration: 0 }
                            : { duration: 0.25, ease: 'easeOut' }
                        }
                        className="absolute inset-0 bg-[#FFEDD5] dark:bg-[#431F0B] rounded-full origin-center"
                      />
                    )}
                    <motion.span
                      initial={false}
                      animate={
                        isActive && !shouldReduceMotion
                          ? { scale: [1, 1.10, 1] }
                          : { scale: 1 }
                      }
                      transition={
                        shouldReduceMotion
                          ? { duration: 0 }
                          : { duration: 0.25, ease: 'easeOut' }
                      }
                      className="relative z-10 flex items-center justify-center origin-center"
                    >
                      {renderTabIcon(tab, isActive)}
                    </motion.span>
                  </div>
                  <span className="text-[10px] mt-1 truncate relative z-10">{tab.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
