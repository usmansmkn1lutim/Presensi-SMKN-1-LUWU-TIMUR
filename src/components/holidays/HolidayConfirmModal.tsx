import React, { useState } from 'react';
import { Power, X, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { HolidayModel, HOLIDAY_TYPE_CONFIG } from '../../types/holiday.types';
import { holidayService } from '../../services/holidayService';

interface HolidayConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  holiday: HolidayModel | null;
  onSuccess: (updatedHoliday: HolidayModel, message: string) => void;
}

export const HolidayConfirmModal: React.FC<HolidayConfirmModalProps> = ({
  isOpen,
  onClose,
  holiday,
  onSuccess,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen || !holiday) return null;

  const isDeactivating = holiday.isActive;
  const targetNewStatus = !holiday.isActive;

  const title = isDeactivating
    ? 'Nonaktifkan Hari Libur?'
    : 'Aktifkan Kembali Hari Libur?';

  const description = isDeactivating
    ? 'Hari libur ini tidak akan digunakan sebagai hari libur aktif dalam sistem presensi.'
    : 'Hari libur ini akan kembali dihitung sebagai hari libur aktif dalam kalender kerja sekolah.';

  const confirmButtonLabel = isDeactivating ? 'Nonaktifkan' : 'Aktifkan';
  const confirmButtonVariant = isDeactivating ? 'danger' : 'primary';

  const formatDisplayDate = (isoDate: string) => {
    try {
      const parts = isoDate.split('-');
      if (parts.length === 3) {
        const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
        return new Intl.DateTimeFormat('id-ID', {
          dateStyle: 'full',
        }).format(d);
      }
      return isoDate;
    } catch {
      return isoDate;
    }
  };

  const handleConfirm = async () => {
    setErrorMessage(null);
    setIsLoading(true);

    try {
      const updated = await holidayService.setHolidayActiveStatus(
        holiday.id,
        targetNewStatus
      );
      const msg = targetNewStatus
        ? `Hari libur "${holiday.name}" berhasil diaktifkan kembali.`
        : `Hari libur "${holiday.name}" berhasil dinonaktifkan.`;
      onSuccess(updated, msg);
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Terjadi kesalahan saat memproses status hari libur.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 dark:bg-black/75 backdrop-blur-xs">
      <div className="bg-white dark:bg-[#262626] rounded-2xl max-w-md w-full shadow-2xl border border-[#E5E7EB] dark:border-[#404040] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] dark:border-[#404040]">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                isDeactivating
                  ? 'bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800/60'
                  : 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/60'
              }`}
            >
              <Power className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">{title}</h2>
              <p className="text-xs text-[#6B7280] dark:text-[#A3A3A3]">Konfirmasi Perubahan Status</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="text-[#9CA3AF] dark:text-slate-400 hover:text-[#111827] dark:hover:text-white p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {errorMessage && (
            <div className="p-3.5 bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800/60 rounded-xl flex items-start gap-2.5 text-xs text-red-700 dark:text-red-400 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          <p className="text-sm text-[#374151] dark:text-slate-300 leading-relaxed">
            {description}
          </p>

          <div className="bg-zinc-50 dark:bg-[#1F1F1F] border border-[#E5E7EB] dark:border-[#404040] rounded-xl p-3.5 space-y-1.5 text-xs">
            <div className="flex justify-between">
              <span className="text-[#6B7280] dark:text-[#A3A3A3]">Nama Hari Libur:</span>
              <span className="font-semibold text-[#111827] dark:text-[#F9FAFB]">{holiday.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B7280] dark:text-[#A3A3A3]">Tanggal:</span>
              <span className="font-semibold text-[#111827] dark:text-[#F9FAFB]">
                {formatDisplayDate(holiday.holidayDate)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B7280] dark:text-[#A3A3A3]">Jenis:</span>
              <span className="font-semibold text-[#111827] dark:text-[#F9FAFB]">
                {HOLIDAY_TYPE_CONFIG[holiday.holidayType]?.label || holiday.holidayType}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 bg-zinc-50/60 dark:bg-[#1F1F1F]/60 border-t border-[#E5E7EB] dark:border-[#404040]">
          <Button
            type="button"
            variant="outline"
            size="md"
            onClick={onClose}
            disabled={isLoading}
          >
            Batal
          </Button>
          <Button
            type="button"
            variant={confirmButtonVariant}
            size="md"
            isLoading={isLoading}
            onClick={handleConfirm}
          >
            {confirmButtonLabel}
          </Button>
        </div>
      </div>
    </div>
  );
};
