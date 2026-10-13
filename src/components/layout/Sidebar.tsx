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
          <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-orange-200/90">
            {title}
          </p>
        )}
        <div className="space-y-1">
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
                      ? 'bg-white text-[#EA580C] font-semibold shadow-xs'
                      : 'text-white/85 hover:bg-white/10 hover:text-white'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3 min-w-0">
                      <Icon
                        className={`w-4 h-4 transition-colors shrink-0 ${
                          isActive ? 'text-[#EA580C]' : 'text-orange-100 group-hover:text-white'
                        }`}
                      />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {isActive ? (
                      <span className="w-1.5 h-1.5 rounded-full bg-[#EA580C] shrink-0" />
                    ) : (
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
    <aside className="w-64 h-full flex flex-col bg-[#EA580C] text-white select-none">
      {/* Brand Header */}
      <div className="p-4 border-b border-white/10 flex items-center gap-3 bg-[#EA580C]">
        <div className="p-1 rounded-xl bg-white/15 backdrop-blur-xs shrink-0 shadow-2xs">
          <SchoolLogo size="sm" />
        </div>
        <div className="min-w-0">
          <h1 className="text-sm font-bold text-white truncate leading-tight tracking-tight">
            {APP_CONFIG.appName}
          </h1>
          <p className="text-xs text-orange-100/90 truncate font-medium">{APP_CONFIG.schoolName}</p>
        </div>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
        {renderNavGroup(null, mainItems)}
        {renderNavGroup('Manajemen Sekolah', managementItems)}
        {renderNavGroup('Sistem Presensi', systemItems)}
      </div>

      {/* User Footer Profile & Logout */}
      <div className="p-3 border-t border-white/10 bg-[#EA580C] shrink-0">
        <div className="p-2.5 rounded-2xl bg-white border border-white/20 flex items-center justify-between gap-2 shadow-sm">
          <div className="min-w-0 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-orange-100 border border-orange-200 flex items-center justify-center font-bold text-xs text-[#EA580C] shrink-0">
              {user.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-slate-900 truncate">{user.name}</p>
              <div className="mt-0.5">
                <RoleBadge role={user.role} size="sm" />
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Keluar"
            aria-label="Keluar"
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
