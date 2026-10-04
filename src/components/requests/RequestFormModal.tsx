import React, { useState } from 'react';
import { X, Calendar, FileText, AlertCircle, Send } from 'lucide-react';
import { RequestType } from '../../types/request.types';
import { requestService } from '../../services/requestService';
import { Button } from '../ui/Button';

interface RequestFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const RequestFormModal: React.FC<RequestFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const getTodayString = () => new Date().toISOString().split('T')[0];

  const [requestType, setRequestType] = useState<RequestType>('leave');
  const [startDate, setStartDate] = useState<string>(getTodayString());
  const [endDate, setEndDate] = useState<string>(getTodayString());
  const [reason, setReason] = useState<string>('');

  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validation
    if (!requestType) {
      setErrorMsg('Jenis permohonan wajib dipilih.');
      return;
    }
    if (!startDate || !endDate) {
      setErrorMsg('Tanggal mulai dan tanggal selesai wajib diisi.');
      return;
    }
    if (startDate > endDate) {
      setErrorMsg('Tanggal selesai tidak boleh lebih awal dari tanggal mulai.');
      return;
    }
    if (!reason || reason.trim().length === 0) {
      setErrorMsg('Alasan permohonan wajib diisi.');
      return;
    }

    setLoading(true);

    try {
      await requestService.createMyRequest({
        request_type: requestType,
        start_date: startDate,
        end_date: endDate,
        reason: reason.trim(),
      });

      // Reset form
      setReason('');
      setStartDate(getTodayString());
      setEndDate(getTodayString());
      setRequestType('leave');

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Failed to create request:', err);
      setErrorMsg(
        err?.message || 'Gagal mengajukan permohonan. Silakan coba lagi.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-[#FFFFFF] border border-[#E5E7EB] rounded-2xl shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-[#E5E7EB] flex items-center justify-between bg-[#F9FAFB]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-100 text-[#F97316] flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#111827]">
                Ajukan Permohonan
              </h3>
              <p className="text-xs text-[#6B7280]">
                Isi formulir permohonan ketidakhadiran atau dinas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="text-[#9CA3AF] hover:text-[#111827] p-1.5 rounded-lg hover:bg-[#F3F4F6] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">{errorMsg}</div>
            </div>
          )}

          {/* Jenis Permohonan */}
          <div>
            <label className="block text-xs font-semibold text-[#111827] mb-1.5">
              Jenis Permohonan <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {[
                { id: 'leave', label: 'Cuti' },
                { id: 'sick', label: 'Sakit' },
                { id: 'official_duty', label: 'Dinas' },
                { id: 'other', label: 'Lainnya' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setRequestType(item.id as RequestType)}
                  className={`px-3 py-2.5 rounded-xl border text-xs font-semibold transition-all text-center ${
                    requestType === item.id
                      ? 'bg-[#FFF7ED] border-[#F97316] text-[#EA580C] shadow-2xs'
                      : 'bg-[#FFFFFF] border-[#E5E7EB] text-[#4B5563] hover:bg-[#F9FAFB]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          {/* Rentang Tanggal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#111827] mb-1.5">
                Tanggal Mulai <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  disabled={loading}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] text-xs font-medium text-[#111827] focus:outline-hidden focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20 bg-[#FFFFFF]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#111827] mb-1.5">
                Tanggal Selesai <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  disabled={loading}
                  required
                  className="w-full px-3 py-2 rounded-xl border border-[#E5E7EB] text-xs font-medium text-[#111827] focus:outline-hidden focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20 bg-[#FFFFFF]"
                />
              </div>
            </div>
          </div>

          {/* Alasan */}
          <div>
            <label className="block text-xs font-semibold text-[#111827] mb-1.5">
              Alasan Permohonan <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Tuliskan alasan permohonan Anda secara jelas..."
              disabled={loading}
              required
              className="w-full p-3 rounded-xl border border-[#E5E7EB] text-xs text-[#111827] focus:outline-hidden focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20 bg-[#FFFFFF] resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-3 border-t border-[#E5E7EB] flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={loading}
              className="text-xs"
            >
              Batal
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={loading}
              className="text-xs bg-[#F97316] hover:bg-[#EA580C] text-white font-semibold min-w-[110px]"
            >
              {loading ? (
                <span className="flex items-center gap-1.5">
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Mengirim...
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <Send className="w-3.5 h-3.5" />
                  Kirim Permohonan
                </span>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
