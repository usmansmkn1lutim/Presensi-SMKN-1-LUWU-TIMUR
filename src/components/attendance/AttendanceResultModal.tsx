import React from 'react';
import { Check, X } from 'lucide-react';

interface AttendanceResultModalProps {
  isOpen: boolean;
  type: 'success' | 'error' | null;
  title?: string;
  message: string;
  onClose: () => void;
}

export const AttendanceResultModal: React.FC<AttendanceResultModalProps> = ({
  isOpen,
  type,
  title,
  message,
  onClose,
}) => {
  if (!isOpen || !type) return null;

  const isSuccess = type === 'success';

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="attendance-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white border border-[#E5E7EB] rounded-2xl p-6 sm:p-7 w-full max-w-sm shadow-xl space-y-5 text-center animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon Circle */}
        <div className="flex justify-center">
          {isSuccess ? (
            <div className="w-16 h-16 rounded-full bg-[#F97316] text-white flex items-center justify-center shadow-md">
              <Check className="w-8 h-8 stroke-[3]" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-[#EF4444] text-white flex items-center justify-center shadow-md">
              <X className="w-8 h-8 stroke-[3]" />
            </div>
          )}
        </div>

        {/* Title & Message */}
        <div className="space-y-2">
          <h3
            id="attendance-modal-title"
            className="text-lg sm:text-xl font-bold text-[#111827] tracking-tight"
          >
            {title || (isSuccess ? 'Presensi Berhasil!' : 'Gagal Melakukan Presensi')}
          </h3>
          <p className="text-xs sm:text-sm text-[#4B5563] leading-relaxed">
            {message}
          </p>
        </div>

        {/* Action Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 px-4 rounded-xl text-sm font-semibold text-white bg-[#F97316] hover:bg-[#EA580C] transition-colors cursor-pointer shadow-sm"
          >
            {isSuccess ? 'Tutup' : 'OK'}
          </button>
        </div>
      </div>
    </div>
  );
};
