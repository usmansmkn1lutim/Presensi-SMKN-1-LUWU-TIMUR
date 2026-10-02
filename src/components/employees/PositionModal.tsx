import React, { useState, useEffect } from 'react';
import { Briefcase, Plus, Edit2, Check, X, AlertCircle, Power, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { PositionRow } from '../../types/database.types';
import { positionService } from '../../services/positionService';

interface PositionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPositionsUpdated: () => void;
}

export const PositionModal: React.FC<PositionModalProps> = ({
  isOpen,
  onClose,
  onPositionsUpdated,
}) => {
  const [positions, setPositions] = useState<PositionRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form State
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [descriptionInput, setDescriptionInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPositions = async () => {
    setIsLoading(true);
    try {
      const data = await positionService.getPositions({ onlyActive: false });
      setPositions(data);
    } catch {
      setErrorMessage('Gagal memuat daftar jabatan.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPositions();
      setIsAdding(false);
      setEditingId(null);
      setNameInput('');
      setDescriptionInput('');
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartAdd = () => {
    setIsAdding(true);
    setEditingId(null);
    setNameInput('');
    setDescriptionInput('');
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleStartEdit = (pos: PositionRow) => {
    setIsAdding(false);
    setEditingId(pos.id);
    setNameInput(pos.name);
    setDescriptionInput(pos.description || '');
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleCancelForm = () => {
    setIsAdding(false);
    setEditingId(null);
    setNameInput('');
    setDescriptionInput('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) {
      setErrorMessage('Nama jabatan wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (isAdding) {
        await positionService.createPosition({
          name: nameInput.trim(),
          description: descriptionInput.trim() || null,
          is_active: true,
        });
        setSuccessMessage('Jabatan baru berhasil ditambahkan.');
      } else if (editingId) {
        await positionService.updatePosition(editingId, {
          name: nameInput.trim(),
          description: descriptionInput.trim() || null,
        });
        setSuccessMessage('Jabatan berhasil diperbarui.');
      }

      handleCancelForm();
      await fetchPositions();
      onPositionsUpdated();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Terjadi kesalahan saat menyimpan.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (pos: PositionRow) => {
    try {
      await positionService.updatePositionStatus(pos.id, !pos.is_active);
      setSuccessMessage(`Jabatan ${pos.name} berhasil ${pos.is_active ? 'dinonaktifkan' : 'diaktifkan'}.`);
      await fetchPositions();
      onPositionsUpdated();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Gagal mengubah status jabatan.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4">
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-2xl max-w-xl w-full p-6 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FFF7ED] border border-orange-200 text-[#F97316] flex items-center justify-center">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#111827]">
                Kelola Master Jabatan Pegawai
              </h3>
              <p className="text-xs text-[#6B7280]">
                Daftar struktur dan formasi jabatan sekolah
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#9CA3AF] hover:text-[#111827] hover:bg-[#F3F4F6] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Messages */}
        <div className="pt-3 space-y-2">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 flex items-center gap-2 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs text-emerald-800">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>

        {/* Form to Add / Edit */}
        {(isAdding || editingId) && (
          <form onSubmit={handleSubmit} className="p-4 mt-3 rounded-xl bg-[#F9FAFB] border border-[#E5E7EB] space-y-3 animate-in fade-in duration-150">
            <h4 className="text-xs font-bold text-[#111827] uppercase tracking-wider">
              {isAdding ? 'Tambah Jabatan Baru' : 'Edit Data Jabatan'}
            </h4>
            <div className="space-y-2">
              <Input
                label="Nama Jabatan *"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Contoh: Guru Mata Pelajaran / Produktif"
                required
                disabled={isSubmitting}
              />
              <Input
                label="Deskripsi Tugas"
                value={descriptionInput}
                onChange={(e) => setDescriptionInput(e.target.value)}
                placeholder="Penjelasan ringkas tanggung jawab formasi"
                disabled={isSubmitting}
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleCancelForm}
                disabled={isSubmitting}
              >
                Batal
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                isLoading={isSubmitting}
                leftIcon={<Check className="w-3.5 h-3.5" />}
              >
                Simpan
              </Button>
            </div>
          </form>
        )}

        {/* Content List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2">
          <div className="flex items-center justify-between pb-1">
            <span className="text-xs font-bold text-[#6B7280]">
              Total: {positions.length} Jabatan
            </span>
            {!isAdding && !editingId && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleStartAdd}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Tambah Jabatan
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-xs text-[#6B7280]">
              <div className="w-6 h-6 border-2 border-[#F97316] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Memuat jabatan...
            </div>
          ) : positions.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#9CA3AF]">
              Belum ada jabatan yang terdaftar.
            </div>
          ) : (
            <div className="divide-y divide-[#E5E7EB] border border-[#E5E7EB] rounded-xl overflow-hidden">
              {positions.map((pos) => (
                <div
                  key={pos.id}
                  className="p-3 bg-white hover:bg-[#F9FAFB] flex items-center justify-between gap-3 text-xs transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#111827] truncate">
                        {pos.name}
                      </span>
                      <Badge
                        variant={pos.is_active ? 'success' : 'default'}
                        size="sm"
                      >
                        {pos.is_active ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </div>
                    {pos.description && (
                      <p className="text-[11px] text-[#6B7280] truncate mt-0.5">
                        {pos.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStartEdit(pos)}
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleStatus(pos)}
                      title={pos.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                      className={pos.is_active ? 'text-amber-600' : 'text-emerald-600'}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[#E5E7EB] flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Tutup
          </Button>
        </div>
      </div>
    </div>
  );
};
