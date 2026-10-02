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
};

interface SidebarProps {
  onNavigate?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ onNavigate }) => {
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

  const renderNavGroup = (title: string | null, items: typeof navItems) => {
    if (items.length === 0) return null;

    return (
      <div className="space-y-1">
        {title && (
          <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-[#9CA3AF]">
            {title}
          </p>
        )}
        <div className="space-y-0.5">
          {items.map((item) => {
            const Icon = ICON_MAP[item.iconName] || LayoutDashboard;

            return (
              <NavLink
                key={item.id}
                to={item.path}
                onClick={onNavigate}
                className={({ isActive }) =>
                  `group flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-[#FFF7ED] text-[#F97316] font-semibold shadow-xs'
                      : 'text-[#6B7280] hover:bg-[#E5E7EB]/60 hover:text-[#111827]'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3">
                      <Icon
                        className={`w-4 h-4 transition-colors ${
                          isActive ? 'text-[#F97316]' : 'text-[#6B7280] group-hover:text-[#111827]'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {isActive ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#F97316]" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-60 transition-opacity text-[#9CA3AF]" />
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
    <aside className="w-64 h-full flex flex-col bg-[#F3F4F6] border-r border-[#E5E7EB]">
      {/* Brand Header */}
      <div className="p-4 border-b border-[#E5E7EB]/80 flex items-center gap-3 bg-[#F3F4F6]">
        <SchoolLogo size="sm" />
        <div className="min-w-0">
          <h1 className="text-sm font-bold text-[#111827] truncate leading-tight">
            {APP_CONFIG.appName}
          </h1>
          <p className="text-xs text-[#6B7280] truncate">{APP_CONFIG.schoolName}</p>
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
        {renderNavGroup(null, mainItems)}
        {renderNavGroup('Manajemen Sekolah', managementItems)}
        {renderNavGroup('Sistem Presensi', systemItems)}
      </div>

      {/* User Footer Profile & Logout */}
      <div className="p-3 border-t border-[#E5E7EB] bg-[#F3F4F6]">
        <div className="p-2.5 rounded-xl bg-white border border-[#E5E7EB] flex items-center justify-between gap-2 shadow-2xs">
          <div className="min-w-0 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#FFF7ED] border border-orange-200 flex items-center justify-center font-bold text-xs text-[#F97316] shrink-0">
              {user.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-[#111827] truncate">{user.name}</p>
              <div className="mt-0.5">
                <RoleBadge role={user.role} size="sm" />
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Keluar"
            aria-label="Keluar"
            className="p-1.5 text-[#6B7280] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
