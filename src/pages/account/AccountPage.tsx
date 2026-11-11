import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User as UserIcon,
  ShieldCheck,
  Languages,
  Bell,
  Sun,
  Info,
  LogOut,
  ChevronRight,
  Loader2,
  AlertCircle,
  Headset,
  FileText,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { UserAvatar } from '../../components/ui/UserAvatar';

export const AccountPage: React.FC = () => {
  const { user, profile, session, logout } = useAuth();
  const navigate = useNavigate();

  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  // Data aktual nama dan email pengguna dari AuthContext
  const displayName = user?.name || profile?.full_name || 'Pegawai';
  const displayEmail = user?.email || session?.user?.email || 'email@sekolah.sch.id';
  const avatarUrl = profile?.avatar_url || user?.avatarUrl;

  // Inisial avatar fallback jika foto belum tersedia
  const initials =
    displayName
      .trim()
      .split(' ')
      .filter(Boolean)
      .map((w) => w[0])
      .slice(0, 2)
      .join('')
      .toUpperCase() || 'P';

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Gagal keluar dari sesi:', err);
      navigate('/login');
    } finally {
      setIsLoggingOut(false);
      setShowLogoutConfirm(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 font-sans max-w-2xl mx-auto">
      {/* Header Halaman */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-[#111827] tracking-tight">
          Akun Saya
        </h1>
      </div>

      {/* Identitas Pengguna: Nama dan Email (Tanpa Role dan Tanpa Badge Status) */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-4 sm:p-5 shadow-xs flex items-center gap-4">
        <div className="shrink-0">
          <UserAvatar
            userId={user?.id}
            avatarUrl={profile?.avatar_url || user?.avatarUrl}
            photoUrl={user?.photoUrl}
            name={displayName}
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border border-[#E5E7EB] shadow-2xs"
          />
        </div>
        <div className="min-w-0 flex-1">
          <h2 className="text-base sm:text-lg font-bold text-[#111827] truncate leading-tight">
            {displayName}
          </h2>
          <p className="text-xs sm:text-sm text-[#6B7280] truncate mt-1 leading-tight">
            {displayEmail}
          </p>
        </div>
      </div>

      {/* Kelompok Menu Pertama (Menu Akun & Tema) */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-xs overflow-hidden divide-y divide-[#F3F4F6]">
        {/* 1. Profil Saya */}
        <button
          type="button"
          onClick={() => navigate('/profile')}
          className="w-full flex items-center justify-between min-h-[52px] px-4 py-3 text-left hover:bg-[#F9FAFB] active:bg-[#F3F4F6] transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <UserIcon className="w-5 h-5 text-[#6B7280] group-hover:text-[#F97316] transition-colors shrink-0" />
            <span className="text-sm font-semibold text-[#111827] truncate">
              Profil Saya
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#F97316] transition-colors shrink-0" />
        </button>

        {/* 2. Tema */}
        <div className="w-full flex items-center justify-between min-h-[52px] px-4 py-3 text-left select-none">
          <div className="flex items-center gap-3.5 min-w-0">
            <Sun className="w-5 h-5 text-[#F97316] shrink-0" />
            <span className="text-sm font-semibold text-[#111827] truncate">
              Tema
            </span>
          </div>
          <div
            className="w-11 h-6 bg-[#F97316] rounded-full p-0.5 transition-colors cursor-not-allowed opacity-90"
            aria-hidden="true"
            title="Tema Gelap belum tersedia"
          >
            <div className="w-5 h-5 bg-white rounded-full shadow-md transform translate-x-5 transition-transform" />
          </div>
        </div>

        {/* 3. Bahasa */}
        <button
          type="button"
          onClick={() => navigate('/account/language')}
          className="w-full flex items-center justify-between min-h-[52px] px-4 py-3 text-left hover:bg-[#F9FAFB] active:bg-[#F3F4F6] transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <Languages className="w-5 h-5 text-[#4B5563] group-hover:text-[#F97316] transition-colors shrink-0" />
            <span className="text-sm font-semibold text-[#111827] truncate">
              Bahasa
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#F97316] transition-colors shrink-0" />
        </button>

        {/* 4. Notifikasi */}
        <button
          type="button"
          onClick={() => navigate('/account/notifications')}
          className="w-full flex items-center justify-between min-h-[52px] px-4 py-3 text-left hover:bg-[#F9FAFB] active:bg-[#F3F4F6] transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <Bell className="w-5 h-5 text-[#4B5563] group-hover:text-[#F97316] transition-colors shrink-0" />
            <span className="text-sm font-semibold text-[#111827] truncate">
              Notifikasi
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#F97316] transition-colors shrink-0" />
        </button>

        {/* 5. Keamanan */}
        <button
          type="button"
          onClick={() => navigate('/account/security')}
          className="w-full flex items-center justify-between min-h-[52px] px-4 py-3 text-left hover:bg-[#F9FAFB] active:bg-[#F3F4F6] transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <ShieldCheck className="w-5 h-5 text-[#4B5563] group-hover:text-[#F97316] transition-colors shrink-0" />
            <span className="text-sm font-semibold text-[#111827] truncate">
              Keamanan
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#F97316] transition-colors shrink-0" />
        </button>
      </div>

      {/* Kelompok Menu Kedua (Informasi) */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-xs overflow-hidden divide-y divide-[#F3F4F6]">
        {/* 1. Tentang Tamaki */}
        <button
          type="button"
          onClick={() => navigate('/about')}
          className="w-full flex items-center justify-between min-h-[52px] px-4 py-3 text-left hover:bg-[#F9FAFB] active:bg-[#F3F4F6] transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <Info className="w-5 h-5 text-[#4B5563] group-hover:text-[#F97316] transition-colors shrink-0" />
            <span className="text-sm font-semibold text-[#111827] truncate">
              Tentang Tamaki
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#F97316] transition-colors shrink-0" />
        </button>

        {/* 2. Bantuan & Dukungan */}
        <button
          type="button"
          onClick={() => {}}
          className="w-full flex items-center justify-between min-h-[52px] px-4 py-3 text-left hover:bg-[#F9FAFB] active:bg-[#F3F4F6] transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <Headset className="w-5 h-5 text-[#4B5563] group-hover:text-[#F97316] transition-colors shrink-0" />
            <span className="text-sm font-semibold text-[#111827] truncate">
              Bantuan & Dukungan
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#F97316] transition-colors shrink-0" />
        </button>

        {/* 3. Syarat & Ketentuan */}
        <button
          type="button"
          onClick={() => {}}
          className="w-full flex items-center justify-between min-h-[52px] px-4 py-3 text-left hover:bg-[#F9FAFB] active:bg-[#F3F4F6] transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <FileText className="w-5 h-5 text-[#4B5563] group-hover:text-[#F97316] transition-colors shrink-0" />
            <span className="text-sm font-semibold text-[#111827] truncate">
              Syarat & Ketentuan
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#F97316] transition-colors shrink-0" />
        </button>

        {/* 4. Kebijakan Privasi */}
        <button
          type="button"
          onClick={() => {}}
          className="w-full flex items-center justify-between min-h-[52px] px-4 py-3 text-left hover:bg-[#F9FAFB] active:bg-[#F3F4F6] transition-colors cursor-pointer group"
        >
          <div className="flex items-center gap-3.5 min-w-0">
            <ShieldCheck className="w-5 h-5 text-[#4B5563] group-hover:text-[#F97316] transition-colors shrink-0" />
            <span className="text-sm font-semibold text-[#111827] truncate">
              Kebijakan Privasi
            </span>
          </div>
          <ChevronRight className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#F97316] transition-colors shrink-0" />
        </button>
      </div>

      {/* Tombol Keluar Terpisah */}
      <div className="pt-2">
        <button
          type="button"
          onClick={() => setShowLogoutConfirm(true)}
          className="w-full flex items-center justify-center gap-2 min-h-[52px] px-4 py-3 bg-[#DC2626] hover:bg-red-700 active:bg-red-800 text-white rounded-2xl shadow-xs transition-colors cursor-pointer font-semibold text-sm"
        >
          <LogOut className="w-5 h-5 text-white shrink-0" />
          <span>Keluar</span>
        </button>
      </div>

      {/* Modal Dialog Konfirmasi Logout */}
      {showLogoutConfirm && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px]"
        >
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 w-full max-w-sm shadow-xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-600 shrink-0">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h4 id="logout-title" className="text-base font-bold text-[#111827]">
                  Konfirmasi Keluar
                </h4>
                <p className="text-xs text-[#6B7280]">
                  Apakah Anda yakin ingin keluar dari akun ini?
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isLoggingOut}
                onClick={() => setShowLogoutConfirm(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#4B5563] bg-[#F3F4F6] hover:bg-[#E5E7EB] transition-colors cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isLoggingOut}
                onClick={handleLogout}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {isLoggingOut ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Keluar...</span>
                  </>
                ) : (
                  <span>Keluar</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
