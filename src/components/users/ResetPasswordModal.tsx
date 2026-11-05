import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  X,
  AlertCircle,
  AlertTriangle,
  Check,
  Copy,
  ShieldCheck,
  Link2,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { RoleBadge, Badge } from '../ui/Badge';
import { UserAvatar } from '../ui/UserAvatar';
import { userService, UserManagementItem } from '../../services/userService';

interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserManagementItem | null;
  onSuccess?: (result: { userId: string; userName: string }) => void;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({
  isOpen,
  onClose,
  user,
  onSuccess,
}) => {
  const [mode, setMode] = useState<'confirm' | 'success'>('confirm');
  const [temporaryPassword, setTemporaryPassword] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copyError, setCopyError] = useState<string | null>(null);

  // Reset internal states whenever modal closes or target user changes
  useEffect(() => {
    if (isOpen) {
      setMode('confirm');
      setTemporaryPassword(null);
      setCopied(false);
      setIsLoading(false);
      setErrorMessage(null);
      setCopyError(null);
    } else {
      // Immediate wipe of sensitive temporary password when modal closes
      setTemporaryPassword(null);
    }
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  const handleClose = () => {
    if (isLoading) return;
    // Wipe sensitive state before closing
    setTemporaryPassword(null);
    setMode('confirm');
    setCopied(false);
    onClose();
  };

  const handleResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const result = await userService.resetUserPassword(user.id);
      if (result.success && result.temporary_password) {
        setTemporaryPassword(result.temporary_password);
        setMode('success');
        onSuccess?.({
          userId: user.id,
          userName: user.full_name,
        });
      } else {
        setErrorMessage(result.message || 'Gagal mereset kata sandi pengguna.');
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Terjadi kesalahan pada server saat mereset kata sandi.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyPassword = async () => {
    if (!temporaryPassword) return;
    setCopyError(null);

    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(temporaryPassword);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
      } else {
        throw new Error('Fitur papan klip tidak didukung oleh browser Anda.');
      }
    } catch (err: unknown) {
      console.error('Clipboard copy error:', err);
      setCopyError(
        'Gagal menyalin otomatis. Silakan pilih dan salin teks password secara manual.'
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-2xs p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reset-password-modal-title"
    >
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150 my-8 space-y-4">
        {mode === 'confirm' ? (
          /* ================================================================ */
          /* MODAL STEP 1: KONFIRMASI RESET PASSWORD                          */
          /* ================================================================ */
          <>
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-200 text-[#F97316] flex items-center justify-center shrink-0">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3
                    id="reset-password-modal-title"
                    className="text-base font-bold text-[#111827]"
                  >
                    Reset Password Pegawai
                  </h3>
                  <p className="text-xs text-[#6B7280]">
                    Buat kata sandi sementara baru untuk akun pegawai
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                disabled={isLoading}
                aria-label="Tutup modal"
                className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#111827] hover:bg-[#F3F4F6] transition-colors cursor-pointer disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target User Summary */}
            <div className="p-4 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] space-y-3">
              <div className="flex items-center gap-3">
                <UserAvatar
                  userId={user.id}
                  avatarUrl={user.avatar_url}
                  photoUrl={user.photo_url}
                  name={user.full_name}
                  className="w-12 h-12 rounded-full object-cover border border-[#E5E7EB] shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-[#111827] truncate">
                    {user.full_name}
                  </p>
                  <p className="text-xs font-mono text-[#6B7280] truncate">
                    ID: {user.id}
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <RoleBadge role={user.role} size="sm" />
                    <Badge variant={user.is_active ? 'success' : 'danger'} size="sm">
                      {user.is_active ? 'Aktif' : 'Nonaktif'}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Linked Employee Information */}
              <div className="pt-2.5 border-t border-[#E5E7EB] text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[#6B7280]">Pegawai Terhubung:</span>
                  {user.employee_id ? (
                    <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                      <Link2 className="w-3.5 h-3.5" />
                      <span>{user.employee_name || 'Terhubung'}</span>
                    </div>
                  ) : (
                    <span className="text-amber-600 font-semibold">
                      Belum Terhubung
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Error Alert */}
            {errorMessage && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700 animate-in fade-in duration-150">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold">Gagal Mereset Password</p>
                  <p className="text-[11px] leading-relaxed">{errorMessage}</p>
                </div>
              </div>
            )}

            {/* Clear Explanation & Information Banner */}
            <div className="p-3.5 rounded-xl bg-orange-50/70 border border-orange-200 text-xs text-orange-950 space-y-2">
              <div className="flex items-center gap-2 font-bold text-orange-900">
                <AlertTriangle className="w-4 h-4 text-[#F97316] shrink-0" />
                <span>Ketentuan Reset Password:</span>
              </div>
              <ul className="list-disc pl-5 space-y-1 text-[11px] text-orange-900 leading-relaxed">
                <li>
                  Sistem akan membuat <strong>kata sandi sementara 16 karakter</strong> acak secara otomatis.
                </li>
                <li>
                  Pegawai wajib memperbarui kata sandi tersebut saat login kembali.
                </li>
                <li>
                  Kata sandi sementara <strong>hanya ditampilkan satu kali</strong> setelah proses berhasil.
                </li>
              </ul>
            </div>

            {/* Form Actions */}
            <form onSubmit={handleResetSubmit} className="pt-2 border-t border-[#E5E7EB] flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleClose}
                disabled={isLoading}
              >
                Batal
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isLoading}
                disabled={isLoading}
                leftIcon={<KeyRound className="w-3.5 h-3.5" />}
              >
                {isLoading ? 'Mereset Password...' : 'Reset Password'}
              </Button>
            </form>
          </>
        ) : (
          /* ================================================================ */
          /* MODAL STEP 2: KEBERHASILAN RESET PASSWORD                        */
          /* ================================================================ */
          <>
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#111827]">
                    Password Berhasil Direset
                  </h3>
                  <p className="text-xs text-[#6B7280]">
                    Kata sandi sementara telah dibuat
                  </p>
                </div>
              </div>
              <button
                onClick={handleClose}
                aria-label="Tutup modal"
                className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#111827] hover:bg-[#F3F4F6] transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Profile Summary */}
            <div className="p-3.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] flex items-center gap-3">
              {user.avatar_url ? (
                <img
                  src={user.avatar_url}
                  alt={user.full_name}
                  className="w-10 h-10 rounded-xl object-cover border border-[#E5E7EB] shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-[#FFF7ED] border border-orange-200 text-[#F97316] flex items-center justify-center font-bold text-sm shrink-0">
                  {user.full_name.charAt(0)}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-xs font-bold text-[#111827] truncate">
                  {user.full_name}
                </p>
                <p className="text-[11px] text-[#6B7280]">
                  Pegawai: {user.employee_name || user.full_name}
                </p>
              </div>
            </div>

            {/* Temporary Password Display Box */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#374151]">
                Kata Sandi Sementara:
              </label>
              <div className="p-3.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] flex items-center justify-between gap-3">
                <span className="font-mono text-sm font-bold text-[#111827] tracking-wider select-all break-all">
                  {temporaryPassword}
                </span>
                <Button
                  type="button"
                  variant={copied ? 'primary' : 'outline'}
                  size="sm"
                  onClick={handleCopyPassword}
                  leftIcon={
                    copied ? (
                      <Check className="w-3.5 h-3.5 text-white" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )
                  }
                  className="shrink-0"
                >
                  {copied ? 'Tersalin!' : 'Salin Password'}
                </Button>
              </div>
            </div>

            {/* Copy Error Message */}
            {copyError && (
              <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                {copyError}
              </p>
            )}

            {/* Single-Show Warning Box */}
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-1.5">
              <p className="font-bold text-amber-900 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                PENTING: Kata sandi ini hanya ditampilkan satu kali!
              </p>
              <p className="text-[11px] text-amber-900 leading-relaxed">
                Salin dan berikan kata sandi sementara ini secara pribadi kepada pegawai terkait. Setelah Anda menutup jendela ini, kata sandi sementara tidak dapat ditampilkan kembali.
              </p>
            </div>

            {/* Modal Action: Done */}
            <div className="pt-2 border-t border-[#E5E7EB] flex justify-end">
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleClose}
                className="w-full sm:w-auto"
              >
                Selesai
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
