import React, { useState, useEffect } from 'react';
import { Trash2, X, AlertCircle, AlertTriangle, ShieldAlert, CheckCircle2, UserX, Link2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { RoleBadge, Badge } from '../ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { userService, UserManagementItem } from '../../services/userService';

interface DeleteUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: UserManagementItem | null;
  onSuccess: (deletedUser: {
    id: string;
    full_name?: string;
    unlinked_employee_id?: string | null;
    unlinked_employee_name?: string | null;
  }) => void;
}

const REQUIRED_CONFIRMATION_PHRASE = 'HAPUS PERMANEN';

export const DeleteUserModal: React.FC<DeleteUserModalProps> = ({
  isOpen,
  onClose,
  user,
  onSuccess,
}) => {
  const { user: currentUser } = useAuth();
  const isSuperAdmin = currentUser?.role === 'super_admin';

  const [confirmationInput, setConfirmationInput] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reset states when modal opens or user changes
  useEffect(() => {
    if (isOpen) {
      setConfirmationInput('');
      setDeleteReason('');
      setErrorMessage(null);
    }
  }, [isOpen, user]);

  if (!isOpen || !user) return null;

  const isSelf = currentUser?.id === user.id;
  const isTargetSuperAdmin = user.role === 'super_admin';
  const isPhraseValid = confirmationInput === REQUIRED_CONFIRMATION_PHRASE;

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (isSelf) {
      setErrorMessage('Anda tidak dapat menghapus akun Anda sendiri.');
      return;
    }

    if (!isSuperAdmin && isTargetSuperAdmin) {
      setErrorMessage('Admin tidak memiliki wewenang untuk menghapus akun Super Admin.');
      return;
    }

    if (!isPhraseValid) {
      setErrorMessage(`Ketik "${REQUIRED_CONFIRMATION_PHRASE}" secara tepat untuk melanjutkan.`);
      return;
    }

    setIsLoading(true);

    try {
      const result = await userService.deleteUser(user.id, deleteReason.trim() || undefined);
      onSuccess({
        id: user.id,
        full_name: user.full_name,
        unlinked_employee_id: result.unlinked_employee_id,
        unlinked_employee_name: result.unlinked_employee_name,
      });
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Terjadi kesalahan pada server saat menghapus akun pengguna.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-2xs p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-user-modal-title"
    >
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150 my-8 space-y-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 id="delete-user-modal-title" className="text-base font-bold text-[#111827]">
                Hapus Akun Pengguna
              </h3>
              <p className="text-xs text-[#6B7280]">
                Penghapusan akun autentikasi dan profil login pengguna
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isLoading}
            aria-label="Tutup modal"
            className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#111827] hover:bg-[#F3F4F6] transition-colors cursor-pointer disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* User Information Card */}
        <div className="p-4 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] space-y-3">
          <div className="flex items-center gap-3">
            {user.avatar_url ? (
              <img
                src={user.avatar_url}
                alt={user.full_name}
                className="w-12 h-12 rounded-xl object-cover border border-[#E5E7EB] shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-[#FFF7ED] border border-orange-200 text-[#F97316] flex items-center justify-center font-bold text-base shrink-0">
                {user.full_name.charAt(0)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-bold text-[#111827] truncate">{user.full_name}</p>
                {isSelf && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-blue-50 text-blue-700 font-semibold">
                    Akun Anda
                  </span>
                )}
              </div>
              <p className="text-xs font-mono text-[#6B7280] truncate">ID: {user.id}</p>
              <div className="flex items-center gap-2 pt-1">
                <RoleBadge role={user.role} size="sm" />
                <Badge variant={user.is_active ? 'success' : 'danger'} size="sm">
                  {user.is_active ? 'Aktif' : 'Nonaktif'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Linked Employee Information Summary */}
          <div className="pt-2.5 border-t border-[#E5E7EB] text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[#6B7280]">Pegawai Terhubung:</span>
              {user.employee_id ? (
                <div className="flex items-center gap-1.5 text-emerald-700 font-semibold">
                  <Link2 className="w-3.5 h-3.5" />
                  <span>{user.employee_name || 'Terhubung'}</span>
                </div>
              ) : (
                <span className="text-[#9CA3AF]">Belum Terhubung</span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#6B7280]">Histori Transaksi:</span>
              <span className="text-emerald-700 font-semibold">
                Tetap Dipertahankan
              </span>
            </div>
          </div>
        </div>

        {/* Self-Delete Warning Banner */}
        {isSelf && (
          <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 flex items-start gap-2.5 text-xs text-blue-800">
            <ShieldAlert className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold">Proteksi Keamanan Akun Mandiri</p>
              <p className="text-blue-700 text-[11px]">
                Anda tidak dapat menghapus akun Anda sendiri demi menjaga integritas sesi admin.
              </p>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold">Gagal Menghapus Akun</p>
              <p className="text-[11px] leading-relaxed">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Clear Explanations & Boundary Rule */}
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Pemberitahuan Penting:</span>
          </div>
          <ul className="list-disc pl-5 space-y-1 text-[11px] text-amber-900 leading-relaxed">
            <li>
              <strong>Penghapusan akun pengguna tidak menghapus data pegawai yang terhubung.</strong>
            </li>
            {user.employee_id ? (
              <li>
                Data master pegawai (<strong>{user.employee_name}</strong>) tetap dipertahankan dan hubungan akun akan dilepas secara aman.
              </li>
            ) : (
              <li>
                Data master pegawai dan histori presensi/pengajuan tetap aman.
              </li>
            )}
            <li>
              Histori transaksi presensi dan pengajuan akan tetap dipertahankan pada sistem.
            </li>
          </ul>
        </div>

        {/* Form Confirmation */}
        <form onSubmit={handleDelete} className="space-y-3.5 pt-1">
          {/* Reason Input (Optional) */}
          <div>
            <label
              htmlFor="user-delete-reason"
              className="block text-xs font-semibold text-[#374151] mb-1"
            >
              Alasan Penghapusan <span className="text-[#9CA3AF] font-normal">(opsional untuk catatan audit)</span>
            </label>
            <input
              id="user-delete-reason"
              type="text"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="Contoh: Akun uji coba / Pengguna mengundurkan diri"
              disabled={isLoading || isSelf}
              className="w-full h-9 text-xs text-[#111827] bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-3 transition-colors placeholder:text-[#9CA3AF] focus:outline-none focus:bg-white focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20 disabled:bg-[#F3F4F6] disabled:text-[#9CA3AF]"
            />
          </div>

          {/* Strict Phrase Input */}
          <div className="p-3.5 rounded-xl bg-red-50/70 border border-red-200 space-y-2">
            <div className="space-y-0.5">
              <label
                htmlFor="user-delete-confirm-input"
                className="block text-xs font-bold text-red-900"
              >
                Penghapusan akun ini bersifat permanen dan tidak dapat dibatalkan.
              </label>
              <p className="text-[11px] text-red-700">
                Ketik <span className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-red-200 select-all">{REQUIRED_CONFIRMATION_PHRASE}</span> untuk melanjutkan:
              </p>
            </div>
            <Input
              id="user-delete-confirm-input"
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              placeholder={REQUIRED_CONFIRMATION_PHRASE}
              disabled={isLoading || isSelf}
              autoComplete="off"
              className="font-mono text-xs tracking-wider uppercase"
            />
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
              type="submit"
              variant="danger"
              size="sm"
              isLoading={isLoading}
              disabled={!isPhraseValid || isSelf || isLoading}
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            >
              {isLoading ? 'Menghapus Akun...' : 'Hapus Permanen'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
