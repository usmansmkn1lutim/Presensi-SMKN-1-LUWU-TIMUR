import React from 'react';
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
import { RoleBadge } from '../ui/Badge';
import { APP_CONFIG } from '../../config/appConfig';

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
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  const navItems = getNavItemsForRole(user.role);

  const mainItems = navItems.filter((i) => i.section === 'main');
  const managementItems = navItems.filter((i) => i.section === 'management');
  const systemItems = navItems.filter((i) => i.section === 'system');

  const handleLogout = async () => {
    await logout();
    navigate('/login');
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
          className="absolute top-6 right-0 translate-x-1/2 z-40 w-6 h-6 rounded-full bg-[#F97316] border border-white text-white flex items-center justify-center shadow-md hover:bg-[#EA580C] cursor-pointer transition-all duration-200 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#F97316]"
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

      {/* User Footer Profile & Logout */}
      {!isCollapsed ? (
        <div className="p-3 border-t border-white/10 bg-[#F97316] shrink-0">
          <div className="p-2.5 rounded-2xl bg-white border border-white/20 flex items-center justify-between gap-2 shadow-xs">
            <button
              type="button"
              onClick={() => navigate('/account')}
              title="Buka Halaman Akun Saya"
              className="min-w-0 flex items-center gap-2.5 text-left cursor-pointer group flex-1"
            >
              <div className="w-8 h-8 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center font-bold text-xs text-[#F97316] shrink-0 group-hover:scale-105 transition-transform">
                {user.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-900 truncate group-hover:text-[#F97316] transition-colors">
                  {user.name}
                </p>
                <div className="mt-0.5">
                  <RoleBadge role={user.role} size="sm" />
                </div>
              </div>
            </button>
            <button
              type="button"
              onClick={handleLogout}
              title="Keluar"
              aria-label="Keluar"
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0 focus:outline-hidden focus:ring-2 focus:ring-red-400"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        <div className="p-2 border-t border-white/10 bg-[#F97316] shrink-0 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/account')}
            className="w-9 h-9 rounded-full bg-white border border-white/20 flex items-center justify-center font-bold text-xs text-[#F97316] shadow-2xs cursor-pointer hover:scale-105 transition-transform"
            title={`${user.name} (${user.role}) - Buka Akun Saya`}
          >
            {user.name.charAt(0)}
          </button>
          <button
            type="button"
            onClick={handleLogout}
            title="Keluar dari sistem"
            aria-label="Keluar dari sistem"
            className="p-2 text-white/80 hover:text-white hover:bg-white/15 rounded-xl transition-colors cursor-pointer shrink-0 focus:outline-hidden focus:ring-2 focus:ring-white/40"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}
    </aside>
  );
};
