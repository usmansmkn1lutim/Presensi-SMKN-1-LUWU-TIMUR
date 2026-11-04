import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  KeyRound,
  ChevronRight,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

export const SecurityPage: React.FC = () => {
  const navigate = useNavigate();
  const { profile, changePassword, refreshProfile } = useAuth();
  const mustChangePassword = profile?.must_change_password === true;

  const [isFormOpen, setIsFormOpen] = useState<boolean>(mustChangePassword);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Form states
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Password visibility states
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status states
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resetForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setShowCurrentPassword(false);
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setErrorMessage(null);
  };

  const handleOpenForm = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    if (mustChangePassword) return; // Prevent closing form if mandatory password change is active
    resetForm();
    setIsFormOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Client-side validations
    if (!currentPassword) {
      setErrorMessage('Kata sandi saat ini wajib diisi.');
      return;
    }

    if (!newPassword) {
      setErrorMessage('Kata sandi baru wajib diisi.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('Kata sandi baru minimal 6 karakter.');
      return;
    }

    if (newPassword === currentPassword) {
      setErrorMessage('Kata sandi baru tidak boleh sama dengan kata sandi saat ini.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Konfirmasi kata sandi baru tidak cocok.');
      return;
    }

    setIsLoading(true);

    try {
      await changePassword(currentPassword, newPassword);
      // Synchronize latest profile state to AuthContext
      await refreshProfile();
      // Clean inputs, close form view, and show success modal
      resetForm();
      setIsFormOpen(false);
      setShowSuccessModal(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Gagal memperbarui kata sandi. Silakan coba lagi.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleFinishSuccess = () => {
    setShowSuccessModal(false);
    if (mustChangePassword) {
      navigate('/dashboard', { replace: true });
    }
  };

  return (
    <div className="space-y-6 pb-12 font-sans max-w-2xl mx-auto">
      {/* Mandatory Password Change Notice Banner */}
      {mustChangePassword && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-xs text-amber-950 shadow-2xs animate-in fade-in duration-200">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold text-amber-900 text-sm">Wajib Mengganti Kata Sandi</p>
            <p className="text-amber-900/90 leading-relaxed">
              Kata sandi Anda telah direset oleh Super Admin. Demi keamanan akun, Anda wajib memperbarui kata sandi sementara sebelum dapat mengakses menu aplikasi lainnya.
            </p>
          </div>
        </div>
      )}

      {/* Navigation Header */}
      <div className="flex items-center gap-3">
        {!mustChangePassword && (
          <button
            type="button"
            onClick={() => (isFormOpen ? handleCloseForm() : navigate('/account'))}
            className="p-2 -ml-2 rounded-xl text-[#4B5563] hover:text-[#111827] hover:bg-[#F3F4F6] transition-colors cursor-pointer"
            aria-label="Kembali"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#111827] tracking-tight">
            Keamanan Akun
          </h1>
        </div>
      </div>

      {/* Main Content Area */}
      {!isFormOpen ? (
        /* Main View: Card List */
        <div className="space-y-4">
          <div className="bg-white border border-[#E5E7EB] rounded-2xl shadow-xs overflow-hidden">
            <button
              type="button"
              onClick={handleOpenForm}
              className="w-full flex items-center justify-between p-4 sm:p-5 text-left hover:bg-[#F9FAFB] active:bg-[#F3F4F6] transition-colors cursor-pointer group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <KeyRound className="w-5 h-5 text-[#F97316] shrink-0" />
                <span className="text-sm sm:text-base font-bold text-[#111827] truncate">
                  Ubah Password
                </span>
              </div>
              <ChevronRight className="w-5 h-5 text-[#9CA3AF] group-hover:text-[#F97316] transition-colors shrink-0" />
            </button>
          </div>
        </div>
      ) : (
        /* Form View: Change Password Form */
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 shadow-xs space-y-5 animate-in fade-in duration-200">
          {/* Header Block: Unbadged Shield Icon + Title, Divider Line, Left-Aligned Instruction */}
          <div className="space-y-3">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-[#F97316] shrink-0" />
              <h2 className="text-base font-bold text-[#111827]">Ubah Kata Sandi</h2>
            </div>

            <div className="border-t border-[#E5E7EB]" />

            <p className="text-xs sm:text-sm font-normal text-[#6B7280] text-left leading-relaxed">
              Masukkan kata sandi saat ini dan kata sandi baru Anda.
            </p>
          </div>

          {/* Error Alert */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700 animate-in fade-in duration-150">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium leading-relaxed">{errorMessage}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Input
                label="Kata Sandi Saat Ini"
                type={showCurrentPassword ? 'text' : 'password'}
                placeholder="Masukkan kata sandi saat ini"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                leftIcon={<Lock className="w-4 h-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="p-1 text-[#9CA3AF] hover:text-[#111827] cursor-pointer"
                    tabIndex={-1}
                    aria-label={showCurrentPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  >
                    {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                required
                autoComplete="current-password"
                disabled={isLoading}
              />
            </div>

            <div>
              <Input
                label="Kata Sandi Baru"
                type={showNewPassword ? 'text' : 'password'}
                placeholder="Masukkan kata sandi baru (minimal 6 karakter)"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                leftIcon={<Lock className="w-4 h-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="p-1 text-[#9CA3AF] hover:text-[#111827] cursor-pointer"
                    tabIndex={-1}
                    aria-label={showNewPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                required
                autoComplete="new-password"
                disabled={isLoading}
              />
            </div>

            <div>
              <Input
                label="Konfirmasi Kata Sandi Baru"
                type={showConfirmPassword ? 'text' : 'password'}
                placeholder="Ulangi kata sandi baru"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                leftIcon={<Lock className="w-4 h-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="p-1 text-[#9CA3AF] hover:text-[#111827] cursor-pointer"
                    tabIndex={-1}
                    aria-label={showConfirmPassword ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi'}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                required
                autoComplete="new-password"
                disabled={isLoading}
              />
            </div>

            <div className="pt-3 flex items-center justify-end gap-3">
              {!mustChangePassword && (
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  onClick={handleCloseForm}
                  disabled={isLoading}
                >
                  Batal
                </Button>
              )}
              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={isLoading}
                disabled={isLoading}
              >
                {isLoading ? 'Memproses...' : 'Simpan Kata Sandi Baru'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Success Modal Confirmation Dialog */}
      {showSuccessModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="success-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-[2px] animate-in fade-in duration-150"
        >
          {/* Narrower & Taller Container */}
          <div className="bg-white border border-[#E5E7EB] rounded-3xl py-6 px-6 sm:py-8 sm:px-7 w-full max-w-[320px] shadow-2xl text-center flex flex-col items-center justify-between min-h-[345px] animate-in zoom-in-95 duration-150">
            {/* 1. Solid Filled Orange Shield Icon (168px x 192px) */}
            <div className="mt-1 flex items-center justify-center">
              <svg
                width="168"
                height="192"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="drop-shadow-md"
              >
                {/* Solid Orange Shield Body with Proportional White Stroke */}
                <path
                  d="M12 2L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-3z"
                  fill="#F97316"
                  stroke="#FFFFFF"
                  strokeWidth="0.5"
                />
                {/* Bold White Checkmark in center */}
                <path
                  d="M8.5 12.2L10.8 14.5L15.8 9.5"
                  stroke="#FFFFFF"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            {/* 2 & 3. Text Group: Title & Description Shifted Downwards */}
            <div className="space-y-1 mt-auto mb-3 w-full">
              <h3 id="success-modal-title" className="text-xl sm:text-2xl font-bold text-[#111827] tracking-tight">
                Sukses
              </h3>
              <p className="text-xs sm:text-sm font-normal text-[#6B7280] leading-relaxed px-1">
                Kata sandi berhasil diperbarui
              </p>
            </div>

            {/* 4. Confirmation Button */}
            <div className="w-full pt-2">
              <Button
                type="button"
                variant="primary"
                size="md"
                className="w-full font-semibold bg-[#F97316] hover:bg-[#EA580C] text-white shadow-xs"
                onClick={handleFinishSuccess}
              >
                Selesai
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
