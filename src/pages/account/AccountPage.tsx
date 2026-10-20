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
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

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
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover border border-[#E5E7EB] shadow-2xs"
            />
          ) : (
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full bg-[#FFF7ED] text-[#F97316] border border-orange-200 flex items-center justify-center font-bold text-lg sm:text-xl shadow-2xs">
              {initials}
            </div>
          )}
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

      {/* Kategori 1: Akun */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF] px-1 mb-2">
          Akun
        </h3>
        <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-xs overflow-hidden divide-y divide-[#F3F4F6]">
          {/* Profil Saya: Navigasi ke /profile tanpa deskripsi */}
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

          {/* Keamanan Akun: Nonaktif, sedikit redup, tanpa deskripsi dan tanpa interaksi */}
          <div
            className="w-full flex items-center justify-between min-h-[52px] px-4 py-3 text-left opacity-45 cursor-not-allowed select-none bg-transparent"
            aria-disabled="true"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <ShieldCheck className="w-5 h-5 text-[#9CA3AF] shrink-0" />
              <span className="text-sm font-medium text-[#9CA3AF] truncate">
                Keamanan Akun
              </span>
            </div>
          </div>

          {/* Bahasa: Navigasi ke /account/language */}
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

          {/* Notifikasi: Navigasi ke /account/notifications */}
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
        </div>
      </div>

      {/* Kategori 2: Preferensi */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF] px-1 mb-2">
          Preferensi
        </h3>
        <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-xs overflow-hidden p-4">
          {/* Tema: Nonaktif, menampilkan nilai Terang */}
          <div
            className="w-full flex items-center justify-between min-h-[36px] text-left select-none"
            aria-disabled="true"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <Sun className="w-5 h-5 text-[#F97316] shrink-0" />
              <span className="text-sm font-semibold text-[#111827] truncate">
                Tema
              </span>
            </div>
            <span className="text-xs font-semibold text-[#4B5563] bg-[#F3F4F6] px-2.5 py-1 rounded-lg border border-[#E5E7EB]">
              Terang
            </span>
          </div>
        </div>
      </div>

      {/* Kategori 3: Informasi */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF] px-1 mb-2">
          Informasi
        </h3>
        <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-xs overflow-hidden">
          {/* Tentang Tamaki: Navigasi ke /about */}
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
        </div>
      </div>

      {/* Bagian 4: Keluar */}
      <div className="pt-2">
        <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-xs overflow-hidden">
          <button
            type="button"
            onClick={() => setShowLogoutConfirm(true)}
            className="w-full flex items-center justify-between min-h-[52px] px-4 py-3 text-left hover:bg-red-50/60 active:bg-red-100/60 transition-colors cursor-pointer group"
          >
            <div className="flex items-center gap-3.5 min-w-0">
              <LogOut className="w-5 h-5 text-red-600 shrink-0" />
              <span className="text-sm font-bold text-red-600 truncate">
                Keluar
              </span>
            </div>
            <ChevronRight className="w-4 h-4 text-red-400 group-hover:text-red-600 transition-colors shrink-0" />
          </button>
        </div>
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
