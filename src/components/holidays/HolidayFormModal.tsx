import React, { useState, useEffect } from 'react';
import { X, CalendarOff, AlertCircle, Calendar } from 'lucide-react';
import { Button } from '../ui/Button';
import {
  HolidayModel,
  HolidayType,
  HOLIDAY_TYPE_CONFIG,
} from '../../types/holiday.types';
import { holidayService } from '../../services/holidayService';

interface HolidayFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  holidayToEdit?: HolidayModel | null;
  onSuccess: (savedHoliday: HolidayModel, mode: 'create' | 'edit') => void;
}

const HOLIDAY_TYPE_OPTIONS: { value: HolidayType; label: string; desc: string }[] = [
  { value: 'national', label: 'Nasional', desc: 'Libur resmi kenegaraan / nasional' },
  { value: 'collective_leave', label: 'Cuti Bersama', desc: 'Cuti bersama keputusan menteri' },
  { value: 'school', label: 'Sekolah', desc: 'Libur semester, ujian, atau perayaan sekolah' },
  { value: 'special', label: 'Khusus', desc: 'Libur bencana, musyawarah, atau dispensasi' },
  { value: 'other', label: 'Lainnya', desc: 'Hari libur atau perayaan lainnya' },
];

export const HolidayFormModal: React.FC<HolidayFormModalProps> = ({
  isOpen,
  onClose,
  holidayToEdit,
  onSuccess,
}) => {
  const isEditMode = Boolean(holidayToEdit);

  const [name, setName] = useState('');
  const [holidayDate, setHolidayDate] = useState('');
  const [holidayType, setHolidayType] = useState<HolidayType>('national');
  const [description, setDescription] = useState('');
  const [isActive, setIsActive] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      if (holidayToEdit) {
        setName(holidayToEdit.name);
        setHolidayDate(holidayToEdit.holidayDate);
        setHolidayType(holidayToEdit.holidayType);
        setDescription(holidayToEdit.description || '');
        setIsActive(holidayToEdit.isActive);
      } else {
        setName('');
        // Default to today's ISO date string
        const today = new Date().toISOString().split('T')[0];
        setHolidayDate(today);
        setHolidayType('national');
        setDescription('');
        setIsActive(true);
      }
    }
  }, [isOpen, holidayToEdit]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setErrorMessage('Nama hari libur wajib diisi dan tidak boleh hanya spasi.');
      return;
    }

    if (!holidayDate) {
      setErrorMessage('Tanggal hari libur wajib dipilih.');
      return;
    }

    setIsLoading(true);

    try {
      if (isEditMode && holidayToEdit) {
        const updated = await holidayService.updateHoliday(holidayToEdit.id, {
          name: trimmedName,
          holiday_date: holidayDate,
          holiday_type: holidayType,
          description: description.trim() || null,
          is_active: isActive,
        });
        onSuccess(updated, 'edit');
      } else {
        const created = await holidayService.createHoliday({
          name: trimmedName,
          holiday_date: holidayDate,
          holiday_type: holidayType,
          description: description.trim() || null,
          is_active: isActive,
        });
        onSuccess(created, 'create');
      }
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setErrorMessage(err.message);
      } else {
        setErrorMessage('Gagal menyimpan hari libur. Silakan coba lagi.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-[#E5E7EB] my-8 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-[#F97316] flex items-center justify-center">
              <CalendarOff className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#111827]">
                {isEditMode ? 'Edit Hari Libur' : 'Tambah Hari Libur'}
              </h2>
              <p className="text-xs text-[#6B7280]">
                {isEditMode
                  ? 'Perbarui informasi tanggal atau klasifikasi libur'
                  : 'Daftarkan tanggal libur baru ke kalender sekolah'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="text-[#9CA3AF] hover:text-[#111827] p-1.5 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Error Alert */}
          {errorMessage && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl flex items-start gap-2.5 text-xs text-red-700 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {/* Nama Hari Libur */}
          <div>
            <label className="block text-xs font-semibold text-[#374151] mb-1">
              Nama Hari Libur <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Hari Kemerdekaan RI"
              required
              disabled={isLoading}
              className="w-full px-3.5 py-2 text-sm bg-white border border-[#E5E7EB] rounded-xl text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316] transition-all"
            />
          </div>

          {/* Tanggal Libur */}
          <div>
            <label className="block text-xs font-semibold text-[#374151] mb-1">
              Tanggal Libur <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="date"
                value={holidayDate}
                onChange={(e) => setHolidayDate(e.target.value)}
                required
                disabled={isLoading}
                className="w-full px-3.5 py-2 text-sm font-medium bg-white border border-[#E5E7EB] rounded-xl text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316] transition-all"
              />
            </div>
            <p className="text-[11px] text-[#6B7280] mt-1">
              Dapat memilih tanggal di masa lalu atau masa depan.
            </p>
          </div>

          {/* Jenis Hari Libur */}
          <div>
            <label className="block text-xs font-semibold text-[#374151] mb-1">
              Jenis Hari Libur <span className="text-red-500">*</span>
            </label>
            <select
              value={holidayType}
              onChange={(e) => setHolidayType(e.target.value as HolidayType)}
              disabled={isLoading}
              className="w-full px-3.5 py-2 text-sm bg-white border border-[#E5E7EB] rounded-xl text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316] transition-all cursor-pointer"
            >
              {HOLIDAY_TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label} ({opt.desc})
                </option>
              ))}
            </select>
          </div>

          {/* Deskripsi */}
          <div>
            <label className="block text-xs font-semibold text-[#374151] mb-1">
              Deskripsi / Catatan <span className="text-xs font-normal text-[#9CA3AF]">(Opsional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Nomor SKB 3 Menteri, edaran dinas, atau ketentuan khusus..."
              rows={3}
              disabled={isLoading}
              className="w-full px-3.5 py-2 text-sm bg-white border border-[#E5E7EB] rounded-xl text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316] transition-all"
            />
          </div>

          {/* Status Aktif */}
          <label className="flex items-center gap-3 p-3 bg-zinc-50 border border-[#E5E7EB] rounded-xl cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              disabled={isLoading}
              className="w-4 h-4 rounded text-[#F97316] focus:ring-[#F97316] border-[#E5E7EB]"
            />
            <div className="text-xs">
              <span className="font-semibold text-[#111827] block">
                Status Hari Libur Aktif
              </span>
              <span className="text-[#6B7280] text-[11px]">
                Hari libur aktif akan diperhitungkan oleh sistem presensi pegawai.
              </span>
            </div>
          </label>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#E5E7EB]">
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
              type="submit"
              variant="primary"
              size="md"
              isLoading={isLoading}
            >
              {isEditMode ? 'Simpan Perubahan' : 'Tambah Hari Libur'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
