import React, { useState, useEffect } from 'react';
import { X, Clock, AlertCircle, Save, Calendar, Info } from 'lucide-react';
import { Button } from '../ui/Button';
import { WorkScheduleModel, UpdateWorkScheduleInput, formatTimeHHmm } from '../../types/workSchedule.types';

interface EditScheduleModalProps {
  isOpen: boolean;
  onClose: () => void;
  schedule: WorkScheduleModel;
  onSave: (input: UpdateWorkScheduleInput) => Promise<void>;
}

export const EditScheduleModal: React.FC<EditScheduleModalProps> = ({
  isOpen,
  onClose,
  schedule,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');

  // Check-in
  const [checkInStartTime, setCheckInStartTime] = useState('06:30');
  const [checkInOnTimeEnd, setCheckInOnTimeEnd] = useState('07:30');
  const [checkInEndTime, setCheckInEndTime] = useState('10:00');

  // Work hours
  const [workStartTime, setWorkStartTime] = useState('07:30');
  const [operationalEndTime, setOperationalEndTime] = useState('15:00');
  const [workEndTime, setWorkEndTime] = useState('15:30');

  // Check-out
  const [checkOutStartTime, setCheckOutStartTime] = useState('15:00');
  const [checkOutEndTime, setCheckOutEndTime] = useState('17:00');

  // Working Days (Senin - Jumat)
  const [workingDays, setWorkingDays] = useState<string[]>([
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
  ]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Synchronize state when modal opens
  useEffect(() => {
    if (isOpen && schedule) {
      setName(schedule.name || 'Jadwal Kerja Sekolah');
      setCode(schedule.code || 'SCHOOL_DEFAULT');
      setDescription(schedule.description || '');

      setCheckInStartTime(formatTimeHHmm(schedule.check_in_start_time));
      setCheckInOnTimeEnd(formatTimeHHmm(schedule.check_in_on_time_end));
      setCheckInEndTime(formatTimeHHmm(schedule.check_in_end_time));

      setWorkStartTime(formatTimeHHmm(schedule.work_start_time));
      setOperationalEndTime(formatTimeHHmm(schedule.operational_end_time));
      setWorkEndTime(formatTimeHHmm(schedule.work_end_time));

      setCheckOutStartTime(formatTimeHHmm(schedule.check_out_start_time));
      setCheckOutEndTime(formatTimeHHmm(schedule.check_out_end_time));

      setWorkingDays(
        schedule.working_days && schedule.working_days.length > 0
          ? schedule.working_days
          : ['monday', 'tuesday', 'wednesday', 'thursday', 'friday']
      );

      setValidationError(null);
    }
  }, [isOpen, schedule]);

  // Keep checkOutStartTime synchronized with operationalEndTime (per V1 requirement)
  const handleOperationalEndTimeChange = (val: string) => {
    setOperationalEndTime(val);
    setCheckOutStartTime(val);
  };

  if (!isOpen) return null;

  const validateForm = (): boolean => {
    setValidationError(null);

    if (!name.trim()) {
      setValidationError('Nama jadwal kerja wajib diisi.');
      return false;
    }

    if (!code.trim()) {
      setValidationError('Kode jadwal kerja wajib diisi.');
      return false;
    }

    // Time ordering checks
    if (checkInStartTime >= checkInOnTimeEnd) {
      setValidationError('Mulai Check-in harus lebih awal dari Batas Tepat Waktu.');
      return false;
    }

    if (checkInOnTimeEnd >= checkInEndTime) {
      setValidationError('Batas Tepat Waktu harus lebih awal dari Batas Akhir Check-in.');
      return false;
    }

    if (checkInOnTimeEnd > workStartTime) {
      setValidationError('Batas Tepat Waktu Check-in tidak boleh melampaui Mulai Kerja.');
      return false;
    }

    if (workStartTime >= operationalEndTime) {
      setValidationError('Mulai Kerja harus lebih awal dari Kepulangan Operasional.');
      return false;
    }

    if (operationalEndTime >= workEndTime) {
      setValidationError('Kepulangan Operasional harus lebih awal dari Akhir Jam Kerja Resmi.');
      return false;
    }

    if (checkOutStartTime !== operationalEndTime) {
      setValidationError('Mulai Check-out harus sama dengan waktu Kepulangan Operasional.');
      return false;
    }

    if (checkOutStartTime >= checkOutEndTime) {
      setValidationError('Mulai Check-out harus lebih awal dari Batas Akhir Check-out.');
      return false;
    }

    if (workingDays.length === 0) {
      setValidationError('Hari kerja wajib dipilih minimal 1 hari.');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);
    setValidationError(null);

    try {
      await onSave({
        name: name.trim(),
        code: code.trim(),
        description: description.trim() || null,
        check_in_start_time: checkInStartTime,
        check_in_on_time_end: checkInOnTimeEnd,
        check_in_end_time: checkInEndTime,
        work_start_time: workStartTime,
        operational_end_time: operationalEndTime,
        work_end_time: workEndTime,
        check_out_start_time: checkOutStartTime,
        check_out_end_time: checkOutEndTime,
        working_days: workingDays,
      });
      onClose();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan perubahan jadwal.';
      setValidationError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleDay = (dayKey: string) => {
    if (workingDays.includes(dayKey)) {
      if (workingDays.length === 1) {
        setValidationError('Minimal harus memilih 1 hari kerja.');
        return;
      }
      setWorkingDays(workingDays.filter((d) => d !== dayKey));
    } else {
      setWorkingDays([...workingDays, dayKey]);
    }
  };

  const allWeekdays = [
    { key: 'monday', label: 'Senin' },
    { key: 'tuesday', label: 'Selasa' },
    { key: 'wednesday', label: 'Rabu' },
    { key: 'thursday', label: 'Kamis' },
    { key: 'friday', label: 'Jumat' },
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-[#E5E7EB] w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-5 border-b border-[#E5E7EB] flex items-center justify-between bg-white sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-[#F97316]">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#111827]">Edit Jadwal Kerja Sekolah</h3>
              <p className="text-xs text-[#6B7280]">
                Konfigurasi jam kerja, jendela check-in, dan kepulangan operasional
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-2 text-[#6B7280] hover:text-[#111827] hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
            aria-label="Tutup Modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-6 flex-1">
          {validationError && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3 text-xs text-red-800">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <span className="font-medium">{validationError}</span>
            </div>
          )}

          {/* Section 1: Identitas Jadwal */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF] flex items-center gap-1.5">
              <span>1. Identitas Jadwal</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">
                  Nama Jadwal <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Jadwal Kerja Sekolah"
                  className="w-[#100%] w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F97316] text-[#111827]"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">
                  Kode Unique <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s+/g, '_'))}
                  placeholder="SCHOOL_DEFAULT"
                  className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F97316] text-[#111827] font-mono"
                  required
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-[#111827] mb-1">Deskripsi</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Keterangan singkat jadwal..."
                  className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F97316] text-[#111827]"
                />
              </div>
            </div>
          </div>

          <hr className="border-[#E5E7EB]" />

          {/* Section 2: Jendela Check-in */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF]">
              2. Jendela Check-in
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">
                  Mulai Check-in <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={checkInStartTime}
                  onChange={(e) => setCheckInStartTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F97316] text-[#111827] font-mono"
                  required
                />
                <span className="text-[10px] text-[#6B7280] mt-1 block">Awal presensi dibuka</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">
                  Batas Tepat Waktu <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={checkInOnTimeEnd}
                  onChange={(e) => setCheckInOnTimeEnd(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F97316] text-[#111827] font-mono"
                  required
                />
                <span className="text-[10px] text-[#6B7280] mt-1 block">Akhir tepat waktu</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">
                  Batas Akhir Check-in <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={checkInEndTime}
                  onChange={(e) => setCheckInEndTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F97316] text-[#111827] font-mono"
                  required
                />
                <span className="text-[10px] text-[#6B7280] mt-1 block">Presensi ditutup</span>
              </div>
            </div>
          </div>

          <hr className="border-[#E5E7EB]" />

          {/* Section 3: Jam Kerja Resmi */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF]">
              3. Jam Kerja Resmi
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">
                  Mulai Kerja <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={workStartTime}
                  onChange={(e) => setWorkStartTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F97316] text-[#111827] font-mono"
                  required
                />
                <span className="text-[10px] text-[#6B7280] mt-1 block">Jam kerja resmi masuk</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">
                  Kepulangan Operasional <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={operationalEndTime}
                  onChange={(e) => handleOperationalEndTimeChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F97316] text-[#111827] font-mono"
                  required
                />
                <span className="text-[10px] text-[#6B7280] mt-1 block">
                  Kepulangan operasional bus
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">
                  Akhir Jam Kerja Resmi <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={workEndTime}
                  onChange={(e) => setWorkEndTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F97316] text-[#111827] font-mono"
                  required
                />
                <span className="text-[10px] text-[#6B7280] mt-1 block">Jam kerja resmi selesai</span>
              </div>
            </div>

            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Catatan Kepulangan Operasional:</strong> Waktu 15:00 merupakan jam
                kepulangan operasional bus sekolah. Pegawai yang melakukan check-out mulai jam ini
                tidak dikategorikan pulang lebih awal.
              </span>
            </div>
          </div>

          <hr className="border-[#E5E7EB]" />

          {/* Section 4: Jendela Check-out */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF]">
              4. Jendela Check-out
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">
                  Mulai Check-out <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={checkOutStartTime}
                  disabled
                  readOnly
                  className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-xl bg-gray-100 text-gray-600 font-mono cursor-not-allowed"
                />
                <span className="text-[10px] text-[#6B7280] mt-1 block">
                  Otomatis sama dengan Kepulangan Operasional
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">
                  Batas Akhir Check-out <span className="text-red-500">*</span>
                </label>
                <input
                  type="time"
                  value={checkOutEndTime}
                  onChange={(e) => setCheckOutEndTime(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-[#E5E7EB] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#F97316] text-[#111827] font-mono"
                  required
                />
                <span className="text-[10px] text-[#6B7280] mt-1 block">Check-out ditutup</span>
              </div>
            </div>
          </div>

          <hr className="border-[#E5E7EB]" />

          {/* Section 5: Hari Kerja V1 */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-[#9CA3AF]">
              5. Hari Kerja V1
            </h4>
            <p className="text-xs text-[#6B7280]">
              Pilih hari kerja aktif sekolah (Ketentuan V1: Senin – Jumat aktif).
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {allWeekdays.map((d) => {
                const isSelected = workingDays.includes(d.key);
                return (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => toggleDay(d.key)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-[#F97316] text-white border border-[#EA580C]'
                        : 'bg-gray-100 text-[#6B7280] border border-[#E5E7EB] hover:bg-gray-200'
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>{d.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer Submit Buttons */}
          <div className="pt-4 border-t border-[#E5E7EB] flex items-center justify-end gap-3 bg-white sticky bottom-0">
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
              leftIcon={<Save className="w-4 h-4" />}
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
