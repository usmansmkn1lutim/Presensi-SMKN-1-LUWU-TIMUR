import React, { useState, useEffect } from 'react';
import { X, User, Check, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { DepartmentRow, PositionRow } from '../../types/database.types';
import { EmployeeWithRelations, EmployeeFormData, COMMON_EMPLOYEE_TYPES } from '../../types/employee';
import { employeeService } from '../../services/employeeService';
import { departmentService } from '../../services/departmentService';
import { positionService } from '../../services/positionService';

interface EmployeeFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (savedEmployee: EmployeeWithRelations) => void;
  employeeToEdit?: EmployeeWithRelations | null;
}

export const EmployeeFormModal: React.FC<EmployeeFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  employeeToEdit,
}) => {
  const isEditMode = !!employeeToEdit;

  const [formData, setFormData] = useState<EmployeeFormData>({
    full_name: '',
    nip: '',
    nik: '',
    employee_number: '',
    gender: '',
    employee_type: 'PNS',
    position_id: '',
    department_id: '',
    phone: '',
    email: '',
    photo_url: '',
    join_date: '',
    status: 'active',
    notes: '',
  });

  const [departments, setDepartments] = useState<DepartmentRow[]>([]);
  const [positions, setPositions] = useState<PositionRow[]>([]);
  const [isLoadingMaster, setIsLoadingMaster] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load master departments and positions
  useEffect(() => {
    if (!isOpen) return;

    const loadMasterData = async () => {
      setIsLoadingMaster(true);
      try {
        const [depts, pos] = await Promise.all([
          departmentService.getDepartments({ onlyActive: true }),
          positionService.getPositions({ onlyActive: true }),
        ]);
        setDepartments(depts);
        setPositions(pos);
      } catch (err) {
        console.warn('Gagal memuat data master departemen/jabatan:', err);
      } finally {
        setIsLoadingMaster(false);
      }
    };

    loadMasterData();
  }, [isOpen]);

  // Populate form if editing
  useEffect(() => {
    if (employeeToEdit) {
      setFormData({
        full_name: employeeToEdit.full_name || '',
        nip: employeeToEdit.nip || '',
        nik: employeeToEdit.nik || '',
        employee_number: employeeToEdit.employee_number || '',
        gender: employeeToEdit.gender || '',
        employee_type: employeeToEdit.employee_type || 'PNS',
        position_id: employeeToEdit.position_id || '',
        department_id: employeeToEdit.department_id || '',
        phone: employeeToEdit.phone || '',
        email: employeeToEdit.email || '',
        photo_url: employeeToEdit.photo_url || '',
        join_date: employeeToEdit.join_date || '',
        status: employeeToEdit.status || 'active',
        notes: employeeToEdit.notes || '',
        profile_id: employeeToEdit.profile_id,
      });
    } else {
      setFormData({
        full_name: '',
        nip: '',
        nik: '',
        employee_number: '',
        gender: '',
        employee_type: 'PNS',
        position_id: '',
        department_id: '',
        phone: '',
        email: '',
        photo_url: '',
        join_date: new Date().toISOString().split('T')[0],
        status: 'active',
        notes: '',
      });
    }
    setErrorMessage(null);
  }, [employeeToEdit, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // 1. Validation
    const trimmedName = formData.full_name.trim();
    if (!trimmedName) {
      setErrorMessage('Nama lengkap pegawai wajib diisi.');
      return;
    }

    if (formData.email && formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        setErrorMessage('Format alamat email tidak valid.');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      let result: EmployeeWithRelations;

      const payload = {
        full_name: trimmedName,
        nip: formData.nip,
        nik: formData.nik,
        employee_number: formData.employee_number,
        gender: formData.gender || null,
        employee_type: formData.employee_type || null,
        department_id: formData.department_id || null,
        position_id: formData.position_id || null,
        phone: formData.phone,
        email: formData.email,
        photo_url: formData.photo_url,
        join_date: formData.join_date || null,
        status: formData.status,
        notes: formData.notes,
      };

      if (isEditMode && employeeToEdit) {
        result = await employeeService.updateEmployee(employeeToEdit.id, payload);
      } else {
        result = await employeeService.createEmployee(payload);
      }

      onSuccess(result);
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Terjadi kesalahan saat menyimpan data pegawai.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-2xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl border border-[#E5E7EB] shadow-2xl max-w-2xl w-full my-8 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#E5E7EB] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#FFF7ED] border border-orange-200 text-[#F97316] flex items-center justify-center">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#111827]">
                {isEditMode ? 'Ubah Data Pegawai' : 'Tambah Pegawai Baru'}
              </h3>
              <p className="text-xs text-[#6B7280]">
                {isEditMode
                  ? 'Perbarui rincian kepegawaian dan informasi kontak'
                  : 'Lengkapi biodata dan informasi penugasan pegawai'}
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

        {/* Form Body (Scrollable) */}
        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 flex-1 text-xs">
          {/* Error Alert */}
          {errorMessage && (
            <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Section 1: Data Pokok */}
          <div className="space-y-3.5">
            <h4 className="font-bold text-[#111827] uppercase tracking-wider text-[11px] text-[#F97316]">
              1. Identitas Pokok Pegawai
            </h4>

            <div>
              <Input
                label="Nama Lengkap & Gelar *"
                placeholder="Contoh: Drs. Usman Baharuddin, M.Pd."
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                required
                disabled={isSubmitting}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Input
                  label="NIP (Nomor Induk Pegawai)"
                  placeholder="19850712 201001 1 014"
                  value={formData.nip}
                  onChange={(e) => setFormData({ ...formData, nip: e.target.value })}
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <Input
                  label="NIK (Nomor Induk Kependudukan)"
                  placeholder="7324012345670001"
                  value={formData.nik}
                  onChange={(e) => setFormData({ ...formData, nik: e.target.value })}
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <Input
                  label="Nomor Pegawai / ID Internal"
                  placeholder="PEG-001"
                  value={formData.employee_number}
                  onChange={(e) => setFormData({ ...formData, employee_number: e.target.value })}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[#374151] mb-1.5">
                  Jenis Kelamin
                </label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value as 'male' | 'female' | '' })}
                  disabled={isSubmitting}
                  className="w-full h-10 px-3 text-xs bg-white border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#F97316] text-[#111827]"
                >
                  <option value="">Pilih Jenis Kelamin</option>
                  <option value="male">Laki-laki</option>
                  <option value="female">Perempuan</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#374151] mb-1.5">
                  Jenis / Status Kepegawaian
                </label>
                <select
                  value={formData.employee_type}
                  onChange={(e) => setFormData({ ...formData, employee_type: e.target.value })}
                  disabled={isSubmitting}
                  className="w-full h-10 px-3 text-xs bg-white border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#F97316] text-[#111827]"
                >
                  {COMMON_EMPLOYEE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Unit Kerja & Jabatan */}
          <div className="space-y-3.5 pt-3 border-t border-[#E5E7EB]">
            <h4 className="font-bold text-[#111827] uppercase tracking-wider text-[11px] text-[#F97316]">
              2. Satuan Kerja & Jabatan
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-[#374151] mb-1.5">
                  Departemen / Unit Kerja
                </label>
                <select
                  value={formData.department_id}
                  onChange={(e) => setFormData({ ...formData, department_id: e.target.value })}
                  disabled={isSubmitting || isLoadingMaster}
                  className="w-full h-10 px-3 text-xs bg-white border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#F97316] text-[#111827]"
                >
                  <option value="">Pilih Departemen</option>
                  {departments.map((dept) => (
                    <option key={dept.id} value={dept.id}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#374151] mb-1.5">
                  Jabatan / Tugas Pokok
                </label>
                <select
                  value={formData.position_id}
                  onChange={(e) => setFormData({ ...formData, position_id: e.target.value })}
                  disabled={isSubmitting || isLoadingMaster}
                  className="w-full h-10 px-3 text-xs bg-white border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#F97316] text-[#111827]"
                >
                  <option value="">Pilih Jabatan</option>
                  {positions.map((pos) => (
                    <option key={pos.id} value={pos.id}>
                      {pos.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Input
                  label="Tanggal Bergabung"
                  type="date"
                  value={formData.join_date}
                  onChange={(e) => setFormData({ ...formData, join_date: e.target.value })}
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block font-semibold text-[#374151] mb-1.5">
                  Status Keaktifan Pegawai
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value as 'active' | 'inactive' })}
                  disabled={isSubmitting}
                  className="w-full h-10 px-3 text-xs bg-white border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#F97316] text-[#111827]"
                >
                  <option value="active">Aktif (Aktif Bekerja)</option>
                  <option value="inactive">Tidak Aktif (Cuti / Mutasi / Nonaktif)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 3: Kontak & Informasi Tambahan */}
          <div className="space-y-3.5 pt-3 border-t border-[#E5E7EB]">
            <h4 className="font-bold text-[#111827] uppercase tracking-wider text-[11px] text-[#F97316]">
              3. Kontak & Catatan
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Input
                  label="Nomor Telepon / WhatsApp"
                  placeholder="+62 812-3456-7890"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <Input
                  label="Alamat Email"
                  type="email"
                  placeholder="pegawai@smkn1luwutimur.sch.id"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  disabled={isSubmitting}
                />
              </div>
            </div>

            <div>
              <Input
                label="URL Foto Profil (Opsional)"
                placeholder="https://example.com/foto.jpg"
                value={formData.photo_url}
                onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
                disabled={isSubmitting}
              />
            </div>

            <div>
              <label className="block font-semibold text-[#374151] mb-1.5">
                Catatan Tambahan (Opsional)
              </label>
              <textarea
                rows={2}
                placeholder="Catatan kepegawaian, sertifikasi pendidik, atau tugas tambahan..."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                disabled={isSubmitting}
                className="w-full p-3 text-xs bg-white border border-[#E5E7EB] rounded-xl focus:outline-none focus:border-[#F97316] text-[#111827]"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="pt-4 border-t border-[#E5E7EB] flex items-center justify-end gap-2.5">
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
              type="submit"
              variant="primary"
              size="md"
              isLoading={isSubmitting}
              leftIcon={<Check className="w-4 h-4" />}
            >
              {isSubmitting
                ? 'Menyimpan...'
                : isEditMode
                ? 'Simpan Perubahan'
                : 'Tambah Pegawai'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
