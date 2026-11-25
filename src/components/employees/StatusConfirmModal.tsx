import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { Button } from '../ui/Button';
import { EmployeeWithRelations } from '../../types/employee';
import { employeeService } from '../../services/employeeService';

interface StatusConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  employee: EmployeeWithRelations | null;
  targetStatus: 'active' | 'inactive';
}

export const StatusConfirmModal: React.FC<StatusConfirmModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  employee,
  targetStatus,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !employee) return null;

  const isDeactivating = targetStatus === 'inactive';

  const handleConfirm = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await employeeService.updateEmployeeStatus(employee.id, targetStatus);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Gagal mengubah status keaktifan pegawai.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/75 backdrop-blur-2xs p-4">
      <div className="bg-white dark:bg-[#262626] rounded-2xl border border-[#E5E7EB] dark:border-[#404040] shadow-2xl max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] dark:border-[#404040]">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                isDeactivating
                  ? 'bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200 dark:border-amber-800/60'
                  : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60'
              }`}
            >
              {isDeactivating ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <CheckCircle2 className="w-5 h-5" />
              )}
            </div>
            <div>
              <h3 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">
                {isDeactivating ? 'Nonaktifkan Pegawai?' : 'Aktifkan Pegawai?'}
              </h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#9CA3AF] dark:text-slate-400 hover:text-[#111827] dark:hover:text-white hover:bg-[#F3F4F6] dark:hover:bg-[#303030] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="py-4 space-y-3 text-xs text-[#4B5563] dark:text-slate-300">
          <p>
            {isDeactivating
              ? 'Pegawai tidak akan dihapus. Statusnya akan diubah menjadi tidak aktif.'
              : 'Status pegawai akan diubah kembali menjadi aktif sehingga tercatat dalam sistem sekolah.'}
          </p>

          <div className="p-3 rounded-xl bg-[#F9FAFB] dark:bg-[#1F1F1F] border border-[#E5E7EB] dark:border-[#404040]">
            <p className="font-bold text-[#111827] dark:text-[#F9FAFB]">{employee.full_name}</p>
            <p className="text-[11px] text-[#6B7280] dark:text-[#A3A3A3] font-mono mt-0.5">
              NIP: {employee.nip || '—'} · Jabatan:{' '}
              {employee.positions?.name || 'Belum diatur'}
            </p>
          </div>

          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800/60 text-xs text-red-700 dark:text-red-400">
              {errorMessage}
            </div>
          )}
        </div>

        <div className="pt-3 border-t border-[#E5E7EB] dark:border-[#404040] flex items-center justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={onClose}
            disabled={isSubmitting}
          >
            Batal
          </Button>
          <Button
            type="button"
            variant={isDeactivating ? 'outline' : 'primary'}
            size="md"
            onClick={handleConfirm}
            isLoading={isSubmitting}
            className={
              isDeactivating
                ? 'text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800 hover:bg-amber-50 dark:hover:bg-amber-950/40'
                : ''
            }
          >
            {isSubmitting
              ? 'Memproses...'
              : isDeactivating
              ? 'Nonaktifkan'
              : 'Aktifkan'}
          </Button>
        </div>
      </div>
    </div>
  );
};
