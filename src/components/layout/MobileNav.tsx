import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, QrCode, CalendarCheck, FileText, User } from 'lucide-react';

export const MobileBottomNav: React.FC = () => {
  // Navigation tabs for Mobile & Tablet: Presensi in the center (index 2 of 5 items)
  const navTabs = [
    { label: 'Beranda', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Riwayat', path: '/history', icon: CalendarCheck },
    { label: 'Presensi', path: '/attendance', icon: QrCode, isPrimary: true },
    { label: 'Pengajuan', path: '/requests', icon: FileText },
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
                  `flex flex-col items-center justify-center -mt-6 transition-transform active:scale-95 px-2 ${
                    isActive ? 'scale-105' : ''
                  }`
                }
              >
                <div className="w-13 h-13 rounded-full bg-[#F97316] text-white flex items-center justify-center shadow-md border-3 border-white hover:bg-[#EA580C] transition-colors">
                  <Icon className="w-6 h-6" />
                </div>
                <span className="text-[11px] font-bold text-[#F97316] mt-0.5 tracking-tight">
                  {tab.label}
                </span>
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

