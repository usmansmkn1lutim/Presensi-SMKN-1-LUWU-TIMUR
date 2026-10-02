import React, { useState } from 'react';
import { useLocation, Link, useNavigate } from 'react-router-dom';
import { Bell, User as UserIcon, RefreshCw, Check } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { RoleBadge } from '../ui/Badge';
import { SchoolLogo } from '../ui/SchoolLogo';
import { UserRole } from '../../types/auth';
import { NAVIGATION_ITEMS } from '../../config/navigation';

export const Header: React.FC = () => {
  const { user, switchRole } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showRoleModal, setShowRoleModal] = useState(false);

  // Find page title from current location
  const currentNav = NAVIGATION_ITEMS.find((item) => item.path === location.pathname);
  const pageTitle = currentNav ? currentNav.label : 'Presensi Pegawai';

  const roleOptions: { role: UserRole; title: string; desc: string }[] = [
    { role: 'employee', title: 'Guru / Pegawai', desc: 'Akses presensi harian, riwayat, dan pengajuan izin/cuti' },
    { role: 'admin', title: 'Administrator', desc: 'Akses penuh data pegawai, jadwal, lokasi, rekap, & pengaturan' },
    { role: 'headmaster', title: 'Kepala Sekolah', desc: 'Monitoring rekap kehadiran dan persetujuan pengajuan guru' },
    { role: 'verifier', title: 'Verifikator Presensi', desc: 'Verifikasi bukti izin, sakit, dan dispensasi dinas' },
    { role: 'super_admin', title: 'Super Admin', desc: 'Akses sistem menyeluruh & audit log' },
  ];

  return (
    <>
      <header className="h-16 bg-[#FFFFFF] border-b border-[#E5E7EB] px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
        {/* Left: Mobile Brand & Page Title (Sidebar completely removed on mobile/tablet) */}
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

        {/* Right: Quick Role Switcher (Phase 1 evaluation helper), Notification, User Profile */}
        <div className="flex items-center gap-2 sm:gap-4">
          {/* Role Switcher Button */}
          <button
            onClick={() => setShowRoleModal(true)}
            className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#F97316] bg-[#FFF7ED] hover:bg-orange-100 border border-orange-200 transition-colors cursor-pointer"
            title="Ganti Role (Demo Mode)"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Role: {user?.role}</span>
          </button>

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
                {user?.name?.split(',')[0]}
              </p>
              <div className="mt-0.5">
                {user && <RoleBadge role={user.role} size="sm" />}
              </div>
            </div>
          </Link>
        </div>
      </header>

      {/* Role Switcher Modal for evaluating all user roles in Phase 1 */}
      {showRoleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
          <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-xl max-w-md w-full p-5 sm:p-6 animate-in fade-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
              <div>
                <h3 className="text-base font-bold text-[#111827]">Ubah Simulasi Role</h3>
                <p className="text-xs text-[#6B7280]">
                  Ganti role untuk menguji tampilan pegawai, verifikator, atau admin
                </p>
              </div>
              <button
                onClick={() => setShowRoleModal(false)}
                className="text-[#9CA3AF] hover:text-[#111827] text-sm p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-2">
              {roleOptions.map((opt) => {
                const isSelected = user?.role === opt.role;
                return (
                  <button
                    key={opt.role}
                    onClick={() => {
                      switchRole(opt.role);
                      setShowRoleModal(false);
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-start justify-between cursor-pointer ${
                      isSelected
                        ? 'border-[#F97316] bg-[#FFF7ED]'
                        : 'border-[#E5E7EB] hover:bg-[#F3F4F6]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-[#111827]">{opt.title}</span>
                        <RoleBadge role={opt.role} size="sm" />
                      </div>
                      <p className="text-xs text-[#6B7280] mt-1">{opt.desc}</p>
                    </div>
                    {isSelected && (
                      <Check className="w-5 h-5 text-[#F97316] shrink-0 mt-0.5" />
                    )}
                  </button>
                );
              })}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowRoleModal(false)}
                className="px-4 py-2 text-xs font-semibold text-[#4B5563] hover:bg-[#F3F4F6] rounded-xl transition-colors cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
