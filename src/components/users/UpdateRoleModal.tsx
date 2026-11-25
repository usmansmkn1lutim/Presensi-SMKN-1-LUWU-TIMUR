import React, { useState, useEffect } from 'react';
import { Shield, X, AlertCircle, CheckCircle2, User, AlertTriangle } from 'lucide-react';
import { Button } from '../ui/Button';
import { RoleBadge } from '../ui/Badge';
import { useAuth } from '../../context/AuthContext';
import {
  userService,
  ActiveAppRole,
  UserManagementItem,
} from '../../services/userService';

interface UpdateRoleModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserManagementItem | null;
  onSuccess: (updatedUser: { id: string; role: ActiveAppRole; full_name?: string }) => void;
}

const ROLE_LABELS: Record<ActiveAppRole, string> = {
  super_admin: 'Super Admin',
  admin: 'Admin',
  headmaster: 'Kepala Sekolah',
  employee: 'Pegawai',
};

export const UpdateRoleModal: React.FC<UpdateRoleModalProps> = ({
  isOpen,
  onClose,
  user,
  onSuccess,
}) => {
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === 'super_admin';

  const [selectedRole, setSelectedRole] = useState<ActiveAppRole>('employee');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);

  // Sync initial role when modal opens
  useEffect(() => {
    if (user) {
      setSelectedRole(user.role);
      setErrorMessage(null);
      setShowConfirm(false);
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const isSelf = currentUser?.id === user.id;
  const isTargetSuperAdmin = user.role === 'super_admin';
  const isRoleUnchanged = selectedRole === user.role;

  // Validation before proceed
  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (isSelf) {
      setErrorMessage('Role akun Anda tidak dapat diubah sendiri.');
      return;
    }

    if (!isSuperAdmin && isTargetSuperAdmin) {
      setErrorMessage('Admin tidak memiliki wewenang untuk mengubah peran akun Super Admin.');
      return;
    }

    if (!isSuperAdmin && (selectedRole === 'admin' || selectedRole === 'super_admin')) {
      setErrorMessage('Admin hanya berwenang mengubah peran menjadi Kepala Sekolah atau Pegawai.');
      return;
    }

    if (isRoleUnchanged) {
      setErrorMessage('Peran yang dipilih sama dengan peran saat ini.');
      return;
    }

    setShowConfirm(true);
  };

  const handleConfirmSave = async () => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const result = await userService.updateUserRole(user.id, selectedRole);
      onSuccess({
        id: user.id,
        role: selectedRole,
        full_name: user.full_name,
      });
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Terjadi kesalahan pada server saat memperbarui peran.');
      }
      setShowConfirm(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-[#E5E7EB] dark:border-slate-800 shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150 flex flex-col space-y-4 text-slate-900 dark:text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FFF7ED] dark:bg-amber-950/50 border border-orange-200 dark:border-amber-900/50 text-[#F97316] dark:text-amber-400 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#111827] dark:text-white">
                Ubah Peran (Role) Pengguna
              </h3>
              <p className="text-xs text-[#6B7280] dark:text-slate-400">
                Perbarui hak akses akun pengguna dalam aplikasi
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            className="p-1.5 rounded-lg text-[#9CA3AF] dark:text-slate-400 hover:text-[#111827] dark:hover:text-white hover:bg-[#F3F4F6] dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Info Card */}
        <div className="p-3.5 rounded-xl bg-[#F9FAFB] dark:bg-slate-800/60 border border-[#E5E7EB] dark:border-slate-800 flex items-center gap-3">
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={user.full_name}
              className="w-10 h-10 rounded-xl object-cover border border-[#E5E7EB] dark:border-slate-700"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-[#FFF7ED] dark:bg-amber-950/50 border border-orange-200 dark:border-amber-900/50 text-[#F97316] dark:text-amber-400 flex items-center justify-center font-bold text-sm">
              {user.full_name.charAt(0)}
            </div>
          )}
          <div className="space-y-0.5 min-w-0 flex-1">
            <p className="text-sm font-bold text-[#111827] dark:text-white truncate">{user.full_name}</p>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-[#6B7280] dark:text-slate-400">Peran Saat Ini:</span>
              <RoleBadge role={user.role} size="sm" />
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 flex items-center gap-2 text-xs text-red-700 dark:text-red-300">
            <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Self-account warning */}
        {isSelf && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <span>
              Ini adalah akun Anda sendiri. Role akun Anda tidak dapat diubah sendiri untuk mencegah kehilangan akses administratif.
            </span>
          </div>
        )}

        {/* Admin on Super Admin warning */}
        {!isSuperAdmin && isTargetSuperAdmin && (
          <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 text-xs text-amber-800 dark:text-amber-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <span>
              Admin tidak memiliki izin untuk mengubah peran akun Super Admin.
            </span>
          </div>
        )}

        {/* Form Body */}
        {!showConfirm ? (
          <form onSubmit={handleFormSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#374151] dark:text-slate-300">
                Pilih Peran Baru <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Shield className="w-4 h-4 absolute left-3 top-2.5 text-[#9CA3AF] dark:text-slate-500" />
                <select
                  disabled={isLoading || isSelf || (!isSuperAdmin && isTargetSuperAdmin)}
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as ActiveAppRole)}
                  className="w-full h-9 pl-9 pr-3 text-xs bg-white dark:bg-slate-800 border border-[#E5E7EB] dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#F97316] text-[#111827] dark:text-white disabled:bg-gray-100 dark:disabled:bg-slate-800/50 disabled:text-gray-400 dark:disabled:text-slate-600"
                >
                  {isSuperAdmin && (
                    <option value="super_admin">Super Admin</option>
                  )}
                  {isSuperAdmin && (
                    <option value="admin">Admin</option>
                  )}
                  <option value="headmaster">Kepala Sekolah</option>
                  <option value="employee">Pegawai</option>
                </select>
              </div>
              {!isSuperAdmin && (
                <p className="text-[11px] text-[#6B7280] dark:text-slate-400">
                  Admin hanya dapat menetapkan peran Kepala Sekolah atau Pegawai.
                </p>
              )}
            </div>

            {/* Footer Buttons */}
            <div className="pt-3 border-t border-[#E5E7EB] dark:border-slate-800 flex items-center justify-end gap-2.5">
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
                type="submit"
                variant="primary"
                size="sm"
                disabled={
                  isLoading ||
                  isSelf ||
                  (!isSuperAdmin && isTargetSuperAdmin) ||
                  isRoleUnchanged
                }
              >
                Lanjutkan Perubahan
              </Button>
            </div>
          </form>
        ) : (
          /* Confirmation State */
          <div className="space-y-4 pt-1">
            <div className="p-3.5 rounded-xl bg-orange-50/80 dark:bg-amber-950/40 border border-orange-200 dark:border-amber-900 text-xs text-orange-900 dark:text-amber-200 space-y-2">
              <div className="flex items-center gap-2 font-bold text-[#F97316] dark:text-amber-400">
                <AlertTriangle className="w-4 h-4 text-[#F97316] dark:text-amber-400" />
                <span>Konfirmasi Perubahan Peran</span>
              </div>
              <p>
                Anda akan mengubah peran pengguna <strong>{user.full_name}</strong> dari{' '}
                <span className="font-semibold text-[#111827] dark:text-white underline">
                  {ROLE_LABELS[user.role]}
                </span>{' '}
                menjadi{' '}
                <span className="font-semibold text-[#F97316] dark:text-amber-400 underline">
                  {ROLE_LABELS[selectedRole]}
                </span>
                . Perubahan ini akan segera memengaruhi hak akses sistem pengguna tersebut.
              </p>
            </div>

            <div className="pt-2 border-t border-[#E5E7EB] dark:border-slate-800 flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowConfirm(false)}
                disabled={isLoading}
              >
                Kembali
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                isLoading={isLoading}
                onClick={handleConfirmSave}
                leftIcon={<Shield className="w-3.5 h-3.5" />}
              >
                {isLoading ? 'Menyimpan Peran...' : 'Simpan Perubahan'}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
