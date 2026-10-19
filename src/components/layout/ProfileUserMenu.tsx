import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User as UserIcon,
  ShieldCheck,
  Sun,
  Info,
  LogOut,
  ChevronRight,
  X,
  CheckCircle2,
  Building2,
  Lock,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { RoleBadge } from '../ui/Badge';
import { APP_CONFIG } from '../../config/appConfig';
import { useProfileMenu } from '../../context/ProfileMenuContext';

interface ProfileUserMenuProps {
  /**
   * Ref element pemicu (biasanya tombol avatar pada Header)
   * untuk penentuan posisi panel mengambang pada tablet/desktop.
   */
  anchorRef?: React.RefObject<HTMLElement | null>;
  /**
   * Mode render komponen:
   * - 'auto': Bottom Sheet pada layar mobile (<768px), Floating Panel pada tablet/desktop (>=768px).
   * - 'floating-panel': Khusus Floating Panel dekat avatar (tablet/desktop).
   * - 'bottom-sheet': Khusus Bottom Sheet dari bawah layar (mobile).
   */
  variant?: 'auto' | 'floating-panel' | 'bottom-sheet';
}

export const ProfileUserMenu: React.FC<ProfileUserMenuProps> = ({
  anchorRef,
  variant = 'auto',
}) => {
  const { user, profile, session, logout } = useAuth();
  const { isOpen, closeMenu, activeModal, setActiveModal, closeModal } = useProfileMenu();
  const navigate = useNavigate();

  const [isMobileScreen, setIsMobileScreen] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return window.innerWidth < 768;
    }
    return false;
  });

  const menuContainerRef = useRef<HTMLDivElement>(null);

  // Deteksi ukuran layar responsif (< 768px vs >= 768px)
  useEffect(() => {
    const handleResize = () => {
      setIsMobileScreen(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Tentukan apakah harus merender floating panel atau bottom sheet
  const shouldRenderFloatingPanel =
    (variant === 'floating-panel' || (variant === 'auto' && !isMobileScreen)) && isOpen;
  const shouldRenderBottomSheet =
    (variant === 'bottom-sheet' || (variant === 'auto' && isMobileScreen)) && isOpen;

  // Menutup menu saat klik di luar container pada floating panel
  useEffect(() => {
    if (!shouldRenderFloatingPanel) return;

    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        menuContainerRef.current &&
        !menuContainerRef.current.contains(target) &&
        (!anchorRef?.current || !anchorRef.current.contains(target))
      ) {
        closeMenu();
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (activeModal) {
          closeModal();
        } else {
          closeMenu();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [shouldRenderFloatingPanel, closeMenu, anchorRef, activeModal, closeModal]);

  // Kunci scroll body saat mobile bottom sheet terbuka
  useEffect(() => {
    if (shouldRenderBottomSheet) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [shouldRenderBottomSheet]);

  // Data aktual pengguna dari AuthContext
  const displayName = user?.name || profile?.full_name || 'Pegawai';
  const displayEmail = user?.email || session?.user?.email || 'email@sekolah.sch.id';
  const avatarUrl = profile?.avatar_url || user?.avatarUrl;

  // Inisial avatar fallback jika foto tidak tersedia
  const initials = displayName
    .trim()
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'P';

  // Handler navigasi "Profil Saya"
  const handleNavigateProfile = () => {
    closeMenu();
    navigate('/profile');
  };

  // Handler keluar (logout)
  const handleLogout = async () => {
    closeMenu();
    try {
      await logout();
      navigate('/login');
    } catch (err) {
      console.error('Gagal keluar dari sesi:', err);
      navigate('/login');
    }
  };

  // =========================================================================
  // KONTEN UTAMA PROFILE USER MENU (Konsisten untuk Mobile & Tablet)
  // =========================================================================
  const renderMenuContent = () => (
    <div className="space-y-4">
      {/* A. KARTU IDENTITAS PENGGUNA */}
      <div className="flex items-center gap-3.5 p-3.5 sm:p-4 bg-[#F9FAFB] rounded-2xl border border-[#F3F4F6]">
        {/* Avatar di sisi kiri dengan fallback inisial */}
        <div className="relative shrink-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-2xs"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-[#FFF7ED] text-[#F97316] border border-orange-200 flex items-center justify-center font-bold text-base shadow-2xs">
              {initials}
            </div>
          )}
          <div
            className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center"
            title="Akun Terhubung"
          >
            <CheckCircle2 className="w-3 h-3 text-white" />
          </div>
        </div>

        {/* Nama & Email Pengguna */}
        <div className="min-w-0 flex-1">
          <h3 className="font-bold text-sm sm:text-base text-[#111827] leading-tight truncate">
            {displayName}
          </h3>
          <p className="text-xs text-[#6B7280] leading-tight mt-0.5 truncate">
            {displayEmail}
          </p>
          <div className="mt-1.5 flex items-center gap-1.5">
            {user?.role && <RoleBadge role={user.role} size="sm" />}
          </div>
        </div>
      </div>

      {/* B. KELOMPOK MENU */}
      <div className="space-y-3 font-sans">
        {/* 1. KELOMPOK AKUN */}
        <div>
          <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-[#9CA3AF]">
            Akun
          </p>
          <div className="space-y-0.5">
            {/* Profil Saya */}
            <button
              type="button"
              onClick={handleNavigateProfile}
              className="w-full flex items-center justify-between min-h-[48px] px-3 py-2.5 rounded-xl hover:bg-[#F3F4F6] active:bg-[#E5E7EB] transition-colors text-left cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-[#F3F4F6] group-hover:bg-white flex items-center justify-center text-[#4B5563] group-hover:text-[#F97316] transition-colors shrink-0">
                  <UserIcon className="w-4 h-4 stroke-[1.8]" />
                </div>
                <span className="text-sm font-semibold text-[#111827] truncate">
                  Profil Saya
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#F97316] transition-colors shrink-0" />
            </button>

            {/* Keamanan Akun */}
            <button
              type="button"
              onClick={() => setActiveModal('security')}
              className="w-full flex items-center justify-between min-h-[48px] px-3 py-2.5 rounded-xl hover:bg-[#F3F4F6] active:bg-[#E5E7EB] transition-colors text-left cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-[#F3F4F6] group-hover:bg-white flex items-center justify-center text-[#4B5563] group-hover:text-[#F97316] transition-colors shrink-0">
                  <ShieldCheck className="w-4 h-4 stroke-[1.8]" />
                </div>
                <span className="text-sm font-semibold text-[#111827] truncate">
                  Keamanan Akun
                </span>
              </div>
              <ChevronRight className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#F97316] transition-colors shrink-0" />
            </button>
          </div>
        </div>

        {/* Pemisah Tipis Antar-Kelompok */}
        <div className="border-t border-[#F3F4F6]" />

        {/* 2. KELOMPOK PREFERENSI */}
        <div>
          <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-[#9CA3AF]">
            Preferensi
          </p>
          <div className="space-y-0.5">
            {/* Tema: Terang */}
            <div
              className="w-full flex items-center justify-between min-h-[48px] px-3 py-2.5 rounded-xl bg-transparent text-left"
              title="Tema saat ini: Terang"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-[#FFF7ED] flex items-center justify-center text-[#F97316] shrink-0">
                  <Sun className="w-4 h-4 stroke-[1.8]" />
                </div>
                <span className="text-sm font-semibold text-[#111827] truncate">
                  Tema
                </span>
              </div>
              <span className="inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#F3F4F6] text-[#4B5563] border border-[#E5E7EB]">
                Terang
              </span>
            </div>
          </div>
        </div>

        {/* Pemisah Tipis Antar-Kelompok */}
        <div className="border-t border-[#F3F4F6]" />

        {/* 3. KELOMPOK INFORMASI */}
        <div>
          <p className="px-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-[#9CA3AF]">
            Informasi
          </p>
          <div className="space-y-0.5">
            {/* Tentang Tamaki */}
            <button
              type="button"
              onClick={() => setActiveModal('about')}
              className="w-full flex items-center justify-between min-h-[48px] px-3 py-2.5 rounded-xl hover:bg-[#F3F4F6] active:bg-[#E5E7EB] transition-colors text-left cursor-pointer group"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-[#F3F4F6] group-hover:bg-white flex items-center justify-center text-[#4B5563] group-hover:text-[#F97316] transition-colors shrink-0">
                  <Info className="w-4 h-4 stroke-[1.8]" />
                </div>
                <span className="text-sm font-semibold text-[#111827] truncate">
                  Tentang Tamaki
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span className="text-[11px] font-mono text-[#6B7280]">
                  v{APP_CONFIG.version.split(' ')[0]}
                </span>
                <ChevronRight className="w-4 h-4 text-[#9CA3AF] group-hover:text-[#F97316] transition-colors" />
              </div>
            </button>
          </div>
        </div>

        {/* TINDAKAN KELUAR DI BAGIAN BAWAH */}
        <div className="pt-2 border-t border-[#E5E7EB]">
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center justify-between min-h-[48px] px-3 py-2.5 rounded-xl text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors text-left cursor-pointer group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-red-50 group-hover:bg-white flex items-center justify-center text-red-600 transition-colors shrink-0">
                <LogOut className="w-4 h-4 stroke-[1.8]" />
              </div>
              <span className="text-sm font-bold text-red-600 truncate">
                Keluar
              </span>
            </div>
            <span className="text-xs text-red-400 group-hover:text-red-600 transition-colors">
              Selesai sesi
            </span>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* =========================================================================
          C. MOBILE: BOTTOM SHEET DARI BAWAH LAYAR (< 768px)
          ========================================================================= */}
      {shouldRenderBottomSheet && (
        <div className="fixed inset-0 z-50 flex items-end justify-center md:hidden animate-in fade-in duration-200">
          {/* Overlay Lembut */}
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-[2px] transition-opacity cursor-pointer"
            onClick={closeMenu}
            aria-hidden="true"
          />

          {/* Bottom Sheet Container */}
          <div
            ref={menuContainerRef}
            role="dialog"
            aria-modal="true"
            aria-label="Menu Pengguna"
            className="relative w-full max-w-lg bg-white rounded-t-3xl shadow-2xl border-t border-[#E5E7EB] z-50 overflow-hidden animate-in slide-in-from-bottom duration-300 pb-[max(1.25rem,env(safe-area-inset-bottom))]"
          >
            {/* Drag Handle Bar di bagian atas */}
            <div className="pt-3 pb-1 flex justify-center">
              <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </div>

            {/* Header Bottom Sheet */}
            <div className="px-5 py-2 flex items-center justify-between border-b border-[#F3F4F6]">
              <span className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF]">
                Pengaturan Akun & Profil
              </span>
              <button
                type="button"
                onClick={closeMenu}
                aria-label="Tutup menu"
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Isi Konten Menu */}
            <div className="p-4 sm:p-5 max-h-[calc(85vh-80px)] overflow-y-auto">
              {renderMenuContent()}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          D. TABLET & DESKTOP: PANEL MENGAMBANG DEKAT AVATAR PENGGUNA (>= 768px)
          ========================================================================= */}
      {shouldRenderFloatingPanel && (
        <div
          ref={menuContainerRef}
          role="dialog"
          aria-modal="true"
          aria-label="Menu Pengguna"
          className="absolute right-0 top-full mt-2 w-80 sm:w-84 max-w-[calc(100vw-24px)] bg-white rounded-2xl shadow-xl border border-[#E5E7EB] z-50 overflow-hidden animate-in fade-in-80 slide-in-from-top-2 duration-150 p-3 sm:p-3.5"
        >
          {renderMenuContent()}
        </div>
      )}

      {/* =========================================================================
          MODAL INFORMASI 1: KEAMANAN AKUN (UI VISUAL RANGKA)
          Hanya dirender pada Bottom Sheet atau Floating Panel aktif
          ========================================================================= */}
      {(variant === 'bottom-sheet' || (variant === 'auto' && isMobileScreen)) &&
        activeModal === 'security' && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-2xl max-w-sm w-full p-5 space-y-4 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F6]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-orange-50 text-[#F97316] flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <h3 className="font-bold text-base text-[#111827]">Keamanan Akun</h3>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-2.5 text-xs text-[#4B5563] leading-relaxed">
                <div className="p-3 bg-[#F9FAFB] rounded-xl border border-[#F3F4F6] space-y-1">
                  <p className="font-semibold text-[#111827] flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-emerald-600" />
                    Autentikasi Terenkripsi Aktif
                  </p>
                  <p className="text-[11px] text-[#6B7280]">
                    Akun Anda dilindungi dengan standar keamanan token terenkripsi dan kebijakan Row-Level Security (RLS) PostgreSQL.
                  </p>
                </div>
                <p>
                  Untuk perubahan kata sandi atau pemulihan akses, silakan berkoordinasi dengan Tim Administrator SIM Master Pegawai SMK Negeri 1 Luwu Timur demi integritas data kepegawaian.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="w-full py-2.5 px-4 bg-[#F3F4F6] hover:bg-[#E5E7EB] text-[#111827] font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}

      {/* =========================================================================
          MODAL INFORMASI 2: TENTANG TAMAKI (UI VISUAL RANGKA)
          Hanya dirender pada Bottom Sheet atau Floating Panel aktif
          ========================================================================= */}
      {(variant === 'bottom-sheet' || (variant === 'auto' && isMobileScreen)) &&
        activeModal === 'about' && (
          <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-in fade-in duration-150">
            <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-2xl max-w-sm w-full p-5 space-y-4 animate-in zoom-in-95 duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-[#F3F4F6]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-orange-50 text-[#F97316] flex items-center justify-center shrink-0">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-[#111827] leading-tight">Tentang Tamaki</h3>
                    <p className="text-[11px] text-[#6B7280] leading-tight">Presensi Digital GTK</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeModal}
                  className="p-1 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs text-[#4B5563]">
                <div className="space-y-1.5 p-3 bg-[#F9FAFB] rounded-xl border border-[#F3F4F6]">
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-[#6B7280]">Versi Sistem</span>
                    <span className="font-mono font-semibold text-[#111827]">{APP_CONFIG.version}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-[#6B7280]">Instansi</span>
                    <span className="font-semibold text-[#111827]">{APP_CONFIG.schoolName}</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-[#6B7280]">Hak Cipta</span>
                    <span className="text-[#111827]">© {APP_CONFIG.copyrightYear} SMK Negeri 1 Luwu Timur</span>
                  </div>
                </div>

                <p className="text-[11px] text-[#6B7280] leading-relaxed text-center">
                  Sistem Presensi Digital dan Tata Kelola Kepegawaian Guru & Tenaga Kependidikan SMK Negeri 1 Luwu Timur.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="w-full py-2.5 px-4 bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold text-xs rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Mengerti
                </button>
              </div>
            </div>
          </div>
        )}
    </>
  );
};
