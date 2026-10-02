import React, { useState, useEffect } from 'react';
import { Building, Plus, Edit2, Check, X, AlertCircle, Power, CheckCircle2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Badge } from '../ui/Badge';
import { DepartmentRow } from '../../types/database.types';
import { departmentService } from '../../services/departmentService';

interface DepartmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDepartmentsUpdated: () => void;
}

export const DepartmentModal: React.FC<DepartmentModalProps> = ({
  isOpen,
  onClose,
  onDepartmentsUpdated,
}) => {
  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form State
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState('');
  const [descriptionInput, setDescriptionInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchDepartments = async () => {
    setIsLoading(true);
    try {
      const data = await departmentService.getDepartments({ onlyActive: false });
      setDepartments(data);
    } catch {
      setErrorMessage('Gagal memuat daftar departemen.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDepartments();
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

  const handleStartEdit = (dept: DepartmentRow) => {
    setIsAdding(false);
    setEditingId(dept.id);
    setNameInput(dept.name);
    setDescriptionInput(dept.description || '');
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
      setErrorMessage('Nama departemen wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      if (isAdding) {
        await departmentService.createDepartment({
          name: nameInput.trim(),
          description: descriptionInput.trim() || null,
          is_active: true,
        });
        setSuccessMessage('Departemen baru berhasil ditambahkan.');
      } else if (editingId) {
        await departmentService.updateDepartment(editingId, {
          name: nameInput.trim(),
          description: descriptionInput.trim() || null,
        });
        setSuccessMessage('Departemen berhasil diperbarui.');
      }

      handleCancelForm();
      await fetchDepartments();
      onDepartmentsUpdated();
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

  const handleToggleStatus = async (dept: DepartmentRow) => {
    try {
      await departmentService.updateDepartmentStatus(dept.id, !dept.is_active);
      setSuccessMessage(`Departemen ${dept.name} berhasil ${dept.is_active ? 'dinonaktifkan' : 'diaktifkan'}.`);
      await fetchDepartments();
      onDepartmentsUpdated();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Gagal mengubah status departemen.');
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
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#111827]">
                Kelola Departemen / Unit Kerja
              </h3>
              <p className="text-xs text-[#6B7280]">
                Daftar unit kerja dan program keahlian sekolah
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
              {isAdding ? 'Tambah Departemen Baru' : 'Edit Data Departemen'}
            </h4>
            <div className="space-y-2">
              <Input
                label="Nama Departemen *"
                value={nameInput}
                onChange={(e) => setNameInput(e.target.value)}
                placeholder="Contoh: Teknik Komputer & Informatika"
                required
                disabled={isSubmitting}
              />
              <Input
                label="Deskripsi / Tugas Pokok"
                value={descriptionInput}
                onChange={(e) => setDescriptionInput(e.target.value)}
                placeholder="Penjelasan ringkas fungsi unit kerja"
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
              Total: {departments.length} Departemen
            </span>
            {!isAdding && !editingId && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleStartAdd}
                leftIcon={<Plus className="w-3.5 h-3.5" />}
              >
                Tambah Departemen
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-xs text-[#6B7280]">
              <div className="w-6 h-6 border-2 border-[#F97316] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Memuat departemen...
            </div>
          ) : departments.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#9CA3AF]">
              Belum ada departemen yang terdaftar.
            </div>
          ) : (
            <div className="divide-y divide-[#E5E7EB] border border-[#E5E7EB] rounded-xl overflow-hidden">
              {departments.map((dept) => (
                <div
                  key={dept.id}
                  className="p-3 bg-white hover:bg-[#F9FAFB] flex items-center justify-between gap-3 text-xs transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#111827] truncate">
                        {dept.name}
                      </span>
                      <Badge
                        variant={dept.is_active ? 'success' : 'default'}
                        size="sm"
                      >
                        {dept.is_active ? 'Aktif' : 'Nonaktif'}
                      </Badge>
                    </div>
                    {dept.description && (
                      <p className="text-[11px] text-[#6B7280] truncate mt-0.5">
                        {dept.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleStartEdit(dept)}
                      title="Edit"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleToggleStatus(dept)}
                      title={dept.is_active ? 'Nonaktifkan' : 'Aktifkan'}
                      className={dept.is_active ? 'text-amber-600' : 'text-emerald-600'}
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
