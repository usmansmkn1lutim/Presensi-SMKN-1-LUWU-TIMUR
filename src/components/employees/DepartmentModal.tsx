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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 dark:bg-black/75 backdrop-blur-2xs p-4">
      <div className="bg-white dark:bg-[#262626] rounded-2xl border border-[#E5E7EB] dark:border-[#404040] shadow-2xl max-w-xl w-full p-6 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] dark:border-[#404040]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FFF7ED] dark:bg-orange-950/40 border border-orange-200 dark:border-orange-900/50 text-[#F97316] dark:text-orange-400 flex items-center justify-center">
              <Building className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">
                Kelola Departemen / Unit Kerja
              </h3>
              <p className="text-xs text-[#6B7280] dark:text-[#A3A3A3]">
                Daftar unit kerja dan program keahlian sekolah
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#9CA3AF] dark:text-slate-400 hover:text-[#111827] dark:hover:text-white hover:bg-[#F3F4F6] dark:hover:bg-[#303030] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Feedback Messages */}
        <div className="pt-3 space-y-2">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800/60 flex items-center gap-2 text-xs text-red-700 dark:text-red-400">
              <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}
        </div>

        {/* Form to Add / Edit */}
        {(isAdding || editingId) && (
          <form onSubmit={handleSubmit} className="p-4 mt-3 rounded-xl bg-[#F9FAFB] dark:bg-[#1F1F1F] border border-[#E5E7EB] dark:border-[#404040] space-y-3 animate-in fade-in duration-150">
            <h4 className="text-xs font-bold text-[#111827] dark:text-[#F9FAFB] uppercase tracking-wider">
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
            <span className="text-xs font-bold text-[#6B7280] dark:text-slate-400">
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
            <div className="py-8 text-center text-xs text-[#6B7280] dark:text-slate-400">
              <div className="w-6 h-6 border-2 border-[#F97316] border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Memuat departemen...
            </div>
          ) : departments.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#9CA3AF] dark:text-slate-500">
              Belum ada departemen yang terdaftar.
            </div>
          ) : (
            <div className="divide-y divide-[#E5E7EB] dark:divide-[#404040] border border-[#E5E7EB] dark:border-[#404040] rounded-xl overflow-hidden">
              {departments.map((dept) => (
                <div
                  key={dept.id}
                  className="p-3 bg-white dark:bg-[#262626] hover:bg-[#F9FAFB] dark:hover:bg-[#303030] flex items-center justify-between gap-3 text-xs transition-colors"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[#111827] dark:text-[#F9FAFB] truncate">
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
                      <p className="text-[11px] text-[#6B7280] dark:text-[#A3A3A3] truncate mt-0.5">
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
                      className={dept.is_active ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}
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
        <div className="pt-3 border-t border-[#E5E7EB] dark:border-[#404040] flex justify-end">
          <Button variant="outline" size="sm" onClick={onClose}>
            Tutup
          </Button>
        </div>
      </div>
    </div>
  );
};
