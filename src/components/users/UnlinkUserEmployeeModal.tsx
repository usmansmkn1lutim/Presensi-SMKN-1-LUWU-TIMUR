import React, { useState } from 'react';
import {
  Unlink,
  X,
  AlertTriangle,
  AlertCircle,
  User,
  CheckCircle2,
} from 'lucide-react';
import { Button } from '../ui/Button';
import { RoleBadge } from '../ui/Badge';
import { useAuth } from '../../context/AuthContext';
import {
  userService,
  UserManagementItem,
} from '../../services/userService';

interface UnlinkUserEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserManagementItem | null;
  onSuccess: (data: { userId: string; employeeName: string }) => void;
}

export const UnlinkUserEmployeeModal: React.FC<UnlinkUserEmployeeModalProps> = ({
  isOpen,
  onClose,
  user,
  onSuccess,
}) => {
  const { user: currentUser } = useAuth();
  const isAuthorized =
    currentUser?.role === 'super_admin' || currentUser?.role === 'admin';

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !user) return null;

  const isSelf = currentUser?.id === user.id;

  const handleConfirm = async () => {
    setErrorMessage(null);

    if (!isAuthorized) {
      setErrorMessage(
        'Anda tidak memiliki wewenang untuk melepaskan hubungan akun pengguna.'
      );
      return;
    }

    if (isSelf) {
      setErrorMessage(
        'Anda tidak dapat melepaskan hubungan akun milik Anda sendiri.'
      );
      return;
    }

    if (!user.employee_id) {
      setErrorMessage('Akun ini tidak memiliki hubungan pegawai yang aktif.');
      return;
    }

    setIsLoading(true);

    try {
      await userService.unlinkUserFromEmployee(user.employee_id);
      onSuccess({
        userId: user.id,
        employeeName: user.employee_name || 'Pegawai Terkait',
      });
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage(
          'Hubungan akun dengan pegawai tidak dapat dilepaskan. Silakan coba lagi.'
        );
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
            <div className="w-9 h-9 rounded-xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center">
              <Unlink className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#111827]">
                Lepaskan Hubungan User
              </h3>
              <p className="text-xs text-[#6B7280]">
                Lepaskan keterkaitan akun pengguna dengan data pegawai.
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
            <p className="text-sm font-bold text-[#111827] truncate">
              {user.full_name}
            </p>
            <div className="flex items-center gap-2">
              <RoleBadge role={user.role} size="sm" />
              <span
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${
                  user.is_active
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-red-50 text-red-700'
                }`}
              >
                {user.is_active ? 'Akun Aktif' : 'Akun Nonaktif'}
              </span>
            </div>
          </div>
        </div>

        {/* Linked Employee Detail */}
        <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200 text-xs text-emerald-950 space-y-1">
          <span className="text-[11px] font-medium text-emerald-700 block">
            Pegawai yang Saat Ini Terhubung:
          </span>
          <p className="font-bold text-sm text-emerald-900">
            {user.employee_name || 'Data Pegawai'}
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Self Account Alert */}
        {isSelf && (
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center gap-2 text-xs text-amber-800">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              Anda tidak dapat melepaskan hubungan data kepegawaian dari akun milik Anda sendiri.
            </span>
          </div>
        )}

        {/* Confirmation Message */}
        <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/50 text-xs text-amber-950 space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-800">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Konfirmasi Pelepasan Hubungan</span>
          </div>
          <p>
            Apakah Anda yakin ingin melepaskan hubungan akun{' '}
            <strong>{user.full_name}</strong> dengan data pegawai{' '}
            <strong>{user.employee_name}</strong>?
          </p>
          <div className="pt-1.5 border-t border-amber-200/60 text-[11px] text-amber-900/90 space-y-1">
            <p className="font-semibold">
              Data akun dan data pegawai tidak akan dihapus.
            </p>
            <p>
              Hanya hubungan antara akun dan data kepegawaian yang dilepaskan. Data pegawai akan kembali tersedia untuk dihubungkan di kemudian hari.
            </p>
          </div>
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
            variant="danger"
            size="sm"
            isLoading={isLoading}
            onClick={handleConfirm}
            disabled={isLoading || isSelf || !isAuthorized || !user.employee_id}
            leftIcon={<Unlink className="w-3.5 h-3.5" />}
          >
            {isLoading ? 'Melepaskan...' : 'Lepaskan Hubungan'}
          </Button>
        </div>
      </div>
    </div>
  );
};
