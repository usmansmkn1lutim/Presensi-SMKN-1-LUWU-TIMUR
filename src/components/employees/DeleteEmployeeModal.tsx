import React, { useState, useEffect } from 'react';
import { Trash2, X, AlertCircle, AlertTriangle, ShieldAlert, CheckCircle2, Building, Briefcase, UserCheck } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { employeeService } from '../../services/employeeService';
import { EmployeeWithRelations } from '../../types/employee';

interface DeleteEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  employee: EmployeeWithRelations | null;
  onSuccess: (deletedEmployee: {
    id: string;
    full_name: string;
    preserved_attendance_count?: number;
    preserved_requests_count?: number;
  }) => void;
}

const REQUIRED_CONFIRMATION_PHRASE = 'HAPUS PERMANEN';

export const DeleteEmployeeModal: React.FC<DeleteEmployeeModalProps> = ({
  isOpen,
  onClose,
  employee,
  onSuccess,
}) => {
  const [confirmationInput, setConfirmationInput] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reset states when modal opens or employee changes
  useEffect(() => {
    if (isOpen) {
      setConfirmationInput('');
      setDeleteReason('');
      setErrorMessage(null);
    }
  }, [isOpen, employee]);

  if (!isOpen || !employee) return null;

  const isPhraseValid = confirmationInput === REQUIRED_CONFIRMATION_PHRASE;
  const isLinkedToAccount = Boolean(employee.profile_id);

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!isPhraseValid) {
      setErrorMessage(`Ketik "${REQUIRED_CONFIRMATION_PHRASE}" secara tepat untuk melanjutkan.`);
      return;
    }

    setIsLoading(true);

    try {
      const result = await employeeService.deleteEmployee(
        employee.id,
        deleteReason.trim() || undefined
      );

      onSuccess({
        id: employee.id,
        full_name: employee.full_name,
        preserved_attendance_count: result.preserved_attendance_count,
        preserved_requests_count: result.preserved_requests_count,
      });
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Terjadi kesalahan pada server saat menghapus data pegawai.');
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
      aria-labelledby="delete-employee-modal-title"
    >
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-2xl max-w-lg w-full p-6 animate-in fade-in zoom-in-95 duration-150 my-8 space-y-4">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shrink-0">
              <Trash2 className="w-5 h-5" />
            </div>
            <div>
              <h3 id="delete-employee-modal-title" className="text-base font-bold text-[#111827]">
                Hapus Data Pegawai
              </h3>
              <p className="text-xs text-[#6B7280]">
                Penghapusan data master pegawai dari sistem
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

        {/* Employee Information Card */}
        <div className="p-4 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] space-y-3">
          <div className="flex items-center gap-3">
            {employee.photo_url ? (
              <img
                src={employee.photo_url}
                alt={employee.full_name}
                className="w-12 h-12 rounded-xl object-cover border border-[#E5E7EB] shrink-0"
              />
            ) : (
              <div className="w-12 h-12 rounded-xl bg-[#FFF7ED] border border-orange-200 text-[#F97316] flex items-center justify-center font-bold text-base shrink-0">
                {employee.full_name.charAt(0)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-[#111827] truncate">{employee.full_name}</p>
              <p className="text-xs font-mono text-[#6B7280]">
                NIP: <span className="font-semibold text-[#374151]">{employee.nip || '—'}</span>
                {employee.nik && (
                  <span className="ml-2">NIK: {employee.nik}</span>
                )}
              </p>
              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <Badge variant={employee.status === 'active' ? 'success' : 'danger'} size="sm">
                  {employee.status === 'active' ? 'Aktif' : 'Nonaktif'}
                </Badge>
                {employee.positions?.name && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#FFF7ED] text-[#F97316] border border-orange-200">
                    {employee.positions.name}
                  </span>
                )}
                {employee.departments?.name && (
                  <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-gray-100 text-[#4B5563]">
                    {employee.departments.name}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Linked Account Status */}
          <div className="pt-2.5 border-t border-[#E5E7EB] text-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[#6B7280]">Akun Pengguna Terhubung:</span>
              {isLinkedToAccount ? (
                <span className="text-emerald-700 font-semibold flex items-center gap-1">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Terhubung</span>
                </span>
              ) : (
                <span className="text-[#9CA3AF]">Belum Terhubung</span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#6B7280]">Histori Transaksi:</span>
              <span className="text-emerald-700 font-semibold">
                Tetap Dipertahankan (Snapshot)
              </span>
            </div>
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700 animate-in fade-in duration-150">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold">Gagal Menghapus Data Pegawai</p>
              <p className="text-[11px] leading-relaxed">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Clear Explanations & Historical Preservation Rule */}
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-950 space-y-2">
          <div className="flex items-center gap-2 font-bold text-amber-900">
            <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Pemberitahuan Penting:</span>
          </div>
          <ul className="list-disc pl-5 space-y-1 text-[11px] text-amber-900 leading-relaxed">
            <li>
              <strong>Data pegawai akan dihapus secara permanen dari sistem.</strong>
            </li>
            <li>
              <strong>Riwayat presensi dan pengajuan tetap dipertahankan</strong> setelah data pegawai dihapus melalui snapshot identitas pegawai.
            </li>
            {isLinkedToAccount ? (
              <li>
                <strong>Akun pengguna tidak akan dihapus.</strong> Hubungan akun dengan data pegawai akan dilepas secara aman.
              </li>
            ) : (
              <li>
                Tidak ada akun pengguna yang terpengaruh oleh operasi ini.
              </li>
            )}
          </ul>
        </div>

        {/* Form Confirmation */}
        <form onSubmit={handleDelete} className="space-y-3.5 pt-1">
          {/* Reason Input (Optional) */}
          <div>
            <label
              htmlFor="employee-delete-reason"
              className="block text-xs font-semibold text-[#374151] mb-1"
            >
              Alasan Penghapusan <span className="text-[#9CA3AF] font-normal">(opsional untuk catatan audit)</span>
            </label>
            <input
              id="employee-delete-reason"
              type="text"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="Contoh: Data ganda / Pegawai berhenti"
              disabled={isLoading}
              className="w-full h-9 text-xs text-[#111827] bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl px-3 transition-colors placeholder:text-[#9CA3AF] focus:outline-none focus:bg-white focus:border-[#F97316] focus:ring-2 focus:ring-[#F97316]/20 disabled:bg-[#F3F4F6] disabled:text-[#9CA3AF]"
            />
          </div>

          {/* Strict Phrase Input */}
          <div className="p-3.5 rounded-xl bg-red-50/70 border border-red-200 space-y-2">
            <div className="space-y-0.5">
              <label
                htmlFor="employee-delete-confirm-input"
                className="block text-xs font-bold text-red-900"
              >
                Penghapusan data pegawai bersifat permanen dan tidak dapat dibatalkan.
              </label>
              <p className="text-[11px] text-red-700">
                Ketik <span className="font-mono font-bold bg-white px-1.5 py-0.5 rounded border border-red-200 select-all">{REQUIRED_CONFIRMATION_PHRASE}</span> untuk melanjutkan:
              </p>
            </div>
            <Input
              id="employee-delete-confirm-input"
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              placeholder={REQUIRED_CONFIRMATION_PHRASE}
              disabled={isLoading}
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
              disabled={!isPhraseValid || isLoading}
              leftIcon={<Trash2 className="w-3.5 h-3.5" />}
            >
              {isLoading ? 'Menghapus Pegawai...' : 'Hapus Permanen'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
