import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, QrCode, CalendarCheck, FileText, User, Users, BarChart3, LucideIcon } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface MobileNavTab {
  label: string;
  path: string;
  icon: LucideIcon;
  isPrimary?: boolean;
}

export const MobileBottomNav: React.FC = () => {
  const { user } = useAuth();
  const role = user?.role || 'employee';

  // Determine role-aware 5-item tabs for mobile & tablet navbar
  let middleLeftTab: MobileNavTab = { label: 'Riwayat', path: '/history', icon: CalendarCheck };
  let middleRightTab: MobileNavTab = { label: 'Pengajuan', path: '/requests', icon: FileText };

  if (role === 'admin' || role === 'super_admin') {
    middleLeftTab = { label: 'Pegawai', path: '/employees', icon: Users };
    middleRightTab = { label: 'Pengajuan', path: '/requests', icon: FileText };
  } else if (role === 'headmaster') {
    middleLeftTab = { label: 'Pegawai', path: '/employees', icon: Users };
    middleRightTab = { label: 'Laporan', path: '/reports', icon: BarChart3 };
  }

  const navTabs: MobileNavTab[] = [
    { label: 'Beranda', path: '/dashboard', icon: Home },
    middleLeftTab,
    { label: 'Presensi', path: '/attendance', icon: QrCode, isPrimary: true },
    middleRightTab,
    { label: 'Profil', path: '/profile', icon: User },
  ];

  return (
    <nav
      aria-label="Navigasi Utama Mobile & Tablet"
      className="lg:hidden fixed bottom-0 left-0 right-0 z-30 bg-[#FFFFFF] border-t border-[#E5E7EB] px-3 py-1.5 shadow-sm"
    >
      <div className="flex items-center justify-around max-w-xl mx-auto">
        {navTabs.map((tab) => {
          const Icon = tab.icon;

          if (tab.isPrimary) {
            return (
              <NavLink
                key={tab.path}
                to={tab.path}
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center -mt-6 transition-transform active:scale-95 px-2 flex-1 max-w-[72px] ${
                    isActive ? 'scale-105' : ''
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="w-12 h-12 rounded-full bg-[#F97316] text-white flex items-center justify-center shadow-md border-3 border-white hover:bg-[#EA580C] transition-colors">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span
                      className={`text-[10px] mt-1 truncate transition-colors ${
                        isActive
                          ? 'text-[#F97316] font-semibold'
                          : 'text-[#6B7280] hover:text-[#111827]'
                      }`}
                    >
                      {tab.label}
                    </span>
                  </>
                )}
              </NavLink>
            );
          }

          return (
            <NavLink
              key={tab.path}
              to={tab.path}
              className={({ isActive }) =>
                `flex flex-col items-center justify-center py-1 px-2.5 rounded-lg transition-colors flex-1 max-w-[72px] ${
                  isActive
                    ? 'text-[#F97316] font-semibold'
                    : 'text-[#6B7280] hover:text-[#111827]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className={`w-5 h-5 ${isActive ? 'text-[#F97316]' : 'text-[#6B7280]'}`} />
                  <span className="text-[10px] mt-1 truncate">{tab.label}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};
