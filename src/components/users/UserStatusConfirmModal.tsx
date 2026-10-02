import React, { useState } from 'react';
import { Power, X, AlertCircle, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { RoleBadge } from '../ui/Badge';
import { useAuth } from '../../context/AuthContext';
import {
  userService,
  UserManagementItem,
} from '../../services/userService';

interface UserStatusConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserManagementItem | null;
  onSuccess: (updatedUser: { id: string; is_active: boolean; full_name?: string }) => void;
}

export const UserStatusConfirmModal: React.FC<UserStatusConfirmModalProps> = ({
  isOpen,
  onClose,
  user,
  onSuccess,
}) => {
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === 'super_admin';

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const isSelf = currentUser?.id === user.id;
  const isTargetSuperAdmin = user.role === 'super_admin';
  const targetNewStatus = !user.is_active; // toggle target

  const handleConfirm = async () => {
    setErrorMessage(null);

    if (isSelf) {
      setErrorMessage('Anda tidak dapat mengubah status akun sendiri.');
      return;
    }

    if (!isSuperAdmin && isTargetSuperAdmin) {
      setErrorMessage('Admin tidak memiliki wewenang untuk mengubah status akun Super Admin.');
      return;
    }

    setIsLoading(true);

    try {
      await userService.updateUserStatus(user.id, targetNewStatus);
      onSuccess({
        id: user.id,
        is_active: targetNewStatus,
        full_name: user.full_name,
      });
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Terjadi kesalahan pada server saat memperbarui status akun.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150 flex flex-col space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                targetNewStatus
                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-600'
                  : 'bg-red-50 border border-red-200 text-red-600'
              }`}
            >
              <Power className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#111827]">
                {targetNewStatus ? 'Aktifkan Akun Pengguna' : 'Nonaktifkan Akun Pengguna'}
              </h3>
              <p className="text-xs text-[#6B7280]">
                {targetNewStatus
                  ? 'Kembalikan hak akses login pengguna ke sistem'
                  : 'Tangguhkan akses login pengguna ke sistem'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#111827] hover:bg-[#F3F4F6] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Card */}
        <div className="p-3.5 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] flex items-center gap-3">
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.full_name}
              className="w-10 h-10 rounded-xl object-cover border border-[#E5E7EB]"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-[#FFF7ED] border border-orange-200 text-[#F97316] flex items-center justify-center font-bold text-sm">
              {user.full_name.charAt(0)}
            </div>
          )}
          <div className="space-y-0.5 min-w-0 flex-1">
            <p className="text-sm font-bold text-[#111827] truncate">{user.full_name}</p>
            <div className="flex items-center gap-2">
              <RoleBadge role={user.role} size="sm" />
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                  user.is_active
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-red-50 text-red-700'
                }`}
              >
                {user.is_active ? 'Status: Aktif' : 'Status: Nonaktif'}
              </span>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Explanation Message Box */}
        <div
          className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
            targetNewStatus
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
              : 'bg-red-50/70 border-red-200 text-red-950'
          }`}
        >
          <div className="flex items-center gap-2 font-bold">
            <AlertTriangle
              className={`w-4 h-4 shrink-0 ${
                targetNewStatus ? 'text-emerald-600' : 'text-red-600'
              }`}
            />
            <span>
              {targetNewStatus
                ? 'Konfirmasi Pengaktifan Akun'
                : 'Konfirmasi Penonaktifan Akun'}
            </span>
          </div>
          <p>
            Apakah Anda yakin ingin{' '}
            <strong>{targetNewStatus ? 'mengaktifkan kembali' : 'menonaktifkan'}</strong>{' '}
            akun <strong>{user.full_name}</strong>?
          </p>
          <p className="text-[11px] opacity-90">
            {targetNewStatus
              ? 'Pengguna akan dapat kembali melakukan login dan mengakses seluruh fitur sesuai perannya.'
              : 'Pengguna tidak akan dapat menggunakan fitur aplikasi yang membutuhkan akun aktif.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 border-t border-[#E5E7EB] flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
          >
            Batal
          </Button>
          <Button
            type="button"
            variant={targetNewStatus ? 'primary' : 'danger'}
            size="sm"
            isLoading={isLoading}
            onClick={handleConfirm}
            leftIcon={<Power className="w-3.5 h-3.5" />}
          >
            {isLoading
              ? targetNewStatus
                ? 'Mengaktifkan...'
                : 'Menonaktifkan...'
              : targetNewStatus
              ? 'Aktifkan Akun'
              : 'Nonaktifkan Akun'}
          </Button>
        </div>
      </div>
    </div>
  );
};
