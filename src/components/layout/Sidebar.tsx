import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Home,
  LayoutDashboard,
  QrCode,
  CalendarCheck,
  FileText,
  Bell,
  User,
  Users,
  Clock,
  MapPin,
  CalendarOff,
  BarChart3,
  ShieldAlert,
  Settings,
  LogOut,
  LucideIcon,
  ChevronRight,
  Eye,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getNavItemsForRole } from '../../config/navigation';
import { SchoolLogo } from '../ui/SchoolLogo';
import { APP_CONFIG } from '../../config/appConfig';
import { LogoutConfirmModal } from '../ui/LogoutConfirmModal';

// Map icon name string to Lucide icon component
const ICON_MAP: Record<string, LucideIcon> = {
  Home,
  LayoutDashboard,
  QrCode,
  CalendarCheck,
  FileText,
  Bell,
  User,
  Users,
  Clock,
  MapPin,
  CalendarOff,
  BarChart3,
  ShieldAlert,
  Settings,
  Eye,
};

interface SidebarProps {
  onNavigate?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  onNavigate,
  isCollapsed = false,
  onToggleCollapse,
}) => {
  const { user, profile, logout } = useAuth();
  const navigate = useNavigate();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  if (!user) return null;

  const navItems = getNavItemsForRole(user.role);

  const mainItems = navItems.filter((i) => i.section === 'main');
  const managementItems = navItems.filter((i) => i.section === 'management');
  const systemItems = navItems.filter((i) => i.section === 'system');

  const handleConfirmLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Gagal keluar dari sistem:', err);
      navigate('/login');
    } finally {
      setIsLoggingOut(false);
      setShowLogoutConfirm(false);
    }
  };

  const renderNavGroup = (title: string | null, items: typeof navItems, showDivider = false) => {
    if (items.length === 0) return null;

    return (
      <div className="space-y-1">
        {showDivider && isCollapsed && (
          <div className="my-2 border-t border-white/15 mx-1" />
        )}
        {!isCollapsed && title && (
          <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-orange-100/90 truncate">
            {title}
          </p>
        )}
        <div className="space-y-1">
          {items.map((item) => {
            const Icon = ICON_MAP[item.iconName] || LayoutDashboard;

            if (isCollapsed) {
              return (
                <NavLink
                  key={item.id}
                  to={item.path}
                  onClick={onNavigate}
                  title={item.label}
                  aria-label={item.label}
                  className={({ isActive }) =>
                    `group relative flex items-center justify-center p-2.5 rounded-xl transition-all ${
                      isActive
                        ? 'bg-white text-[#F97316] font-semibold shadow-xs'
                        : 'text-white/85 hover:bg-white/15 hover:text-white'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <Icon
                      className={`w-5 h-5 transition-colors shrink-0 ${
                        isActive ? 'text-[#F97316]' : 'text-orange-100 group-hover:text-white'
                      }`}
                    />
                  )}
                </NavLink>
              );
            }

            return (
              <NavLink
                key={item.id}
                to={item.path}
                onClick={onNavigate}
                title={item.label}
                className={({ isActive }) =>
                  `group flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-white text-[#F97316] font-semibold shadow-xs'
                      : 'text-white/85 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon
                        className={`w-4 h-4 transition-colors shrink-0 ${
                          isActive ? 'text-[#F97316]' : 'text-orange-100 group-hover:text-white'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {!isActive && (
                      <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-75 transition-opacity text-orange-200 shrink-0" />
                    )}
                  </>
                )}
              </NavLink>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <aside className="relative w-full h-full flex flex-col bg-[#F97316] text-white select-none transition-all duration-300 ease-in-out">
      {/* Floating Sidebar Toggle Button */}
      {onToggleCollapse && (
        <button
          type="button"
          onClick={onToggleCollapse}
          aria-label={isCollapsed ? 'Perluas bilah samping' : 'Ciutkan bilah samping'}
          title={isCollapsed ? 'Perluas bilah samping' : 'Ciutkan bilah samping'}
          className="absolute top-6 right-0 translate-x-1/2 z-50 w-6 h-6 rounded-full bg-[#F97316] border border-white text-white flex items-center justify-center shadow-md hover:bg-[#EA580C] cursor-pointer transition-all duration-200 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#F97316]"
        >
          <ChevronRight
            size={14}
            className={`transition-transform duration-200 ease-in-out text-white ${
              !isCollapsed ? 'rotate-180' : 'rotate-0'
            }`}
          />
        </button>
      )}

      {/* Brand Header */}
      {!isCollapsed ? (
        <div className="p-4 border-b border-white/10 flex items-center justify-between gap-2 bg-[#F97316] shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="shrink-0">
              <SchoolLogo size="sm" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-normal text-white truncate leading-tight tracking-tight font-casual">
                Tamaki
              </h1>
              <p className="text-xs text-orange-100/90 truncate font-medium">Presensi Digital GTK</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 border-b border-white/10 flex flex-col items-center justify-center bg-[#F97316] shrink-0">
          <div
            className="shrink-0"
            title="Tamaki • Presensi Digital GTK • SMK Negeri 1 Luwu Timur"
          >
            <SchoolLogo size="sm" />
          </div>
        </div>
      )}

      {/* Navigation List */}
      <div
        className={`flex-1 overflow-y-auto space-y-4 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden ${
          isCollapsed ? 'px-2 py-3' : 'px-3 py-4'
        }`}
      >
        {renderNavGroup(null, mainItems, false)}
        {renderNavGroup('Manajemen Sekolah', managementItems, true)}
        {renderNavGroup('Sistem Presensi', systemItems, true)}
      </div>

      {/* Footer LogOut Button */}
      {!isCollapsed ? (
        <div className="p-3 border-t border-white/10 bg-[#F97316] shrink-0">
          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            title="Keluar dari sistem"
            aria-label="Keluar dari sistem"
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/85 hover:bg-white/10 hover:text-white transition-all cursor-pointer group"
          >
            <LogOut className="w-4 h-4 text-orange-100 group-hover:text-white transition-colors shrink-0" />
            <span className="truncate">Keluar</span>
          </button>
        </div>
      ) : (
        <div className="p-2 border-t border-white/10 bg-[#F97316] shrink-0 flex items-center justify-center">
          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            title="Keluar dari sistem"
            aria-label="Keluar dari sistem"
            className="group relative flex items-center justify-center p-2.5 rounded-xl text-white/85 hover:bg-white/15 hover:text-white transition-all cursor-pointer"
          >
            <LogOut className="w-5 h-5 text-orange-100 group-hover:text-white transition-colors shrink-0" />
          </button>
        </div>
      )}

      {/* Modal Dialog Konfirmasi Logout */}
      <LogoutConfirmModal
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        onConfirm={handleConfirmLogout}
        isLoggingOut={isLoggingOut}
      />
    </aside>
  );
};
