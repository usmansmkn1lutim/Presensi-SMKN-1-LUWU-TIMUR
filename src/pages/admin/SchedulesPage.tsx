import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  Calendar,
  LogIn,
  LogOut,
  Edit2,
  RefreshCw,
  Info,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  CalendarDays,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { WorkScheduleModel, UpdateWorkScheduleInput, formatTimeHHmm } from '../../types/workSchedule.types';
import { workScheduleService } from '../../services/workScheduleService';
import { EditScheduleModal } from '../../components/schedules/EditScheduleModal';

export const SchedulesPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const canManage =
    currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  // Data State
  const [schedule, setSchedule] = useState<WorkScheduleModel | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Data Fetching
  const fetchActiveSchedule = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const activeData = await workScheduleService.getActiveWorkSchedule();
      setSchedule(activeData);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal memuat jadwal kerja. Silakan coba lagi.';
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveSchedule();
  }, [fetchActiveSchedule]);

  // Handle Toast Auto-dismiss
  useEffect(() => {
    if (successToast) {
      const timer = setTimeout(() => {
        setSuccessToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [successToast]);

  const handleOpenEdit = () => {
    if (!schedule) return;
    setIsEditModalOpen(true);
  };

  const handleSaveSchedule = async (input: UpdateWorkScheduleInput) => {
    if (!schedule) return;
    try {
      const updated = await workScheduleService.updateWorkSchedule(schedule.id, input);
      setSchedule(updated);
      setSuccessToast('Jadwal kerja berhasil diperbarui.');
      setIsEditModalOpen(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan perubahan jadwal. Silakan coba lagi.';
      throw new Error(msg);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-4 right-4 z-50 p-4 bg-emerald-50 border border-emerald-200 rounded-2xl shadow-xl flex items-center gap-3 text-sm text-emerald-800 animate-in slide-in-from-top-3 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <span className="font-medium">{successToast}</span>
        </div>
      )}

      {/* Header Section */}
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 sm:p-6 shadow-2xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-[#9CA3AF]">
              Pengaturan Waktu Presensi
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-[#111827] mt-0.5">
              Jadwal Kerja
            </h1>
            <p className="text-xs sm:text-sm text-[#6B7280] mt-1">
              Jadwal kerja standar yang berlaku untuk seluruh pegawai sekolah.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Button
              variant="outline"
              size="md"
              leftIcon={<RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />}
              onClick={fetchActiveSchedule}
              disabled={isLoading}
            >
              Segarkan
            </Button>

            {canManage && schedule && (
              <Button
                variant="primary"
                size="md"
                leftIcon={<Edit2 className="w-4 h-4" />}
                onClick={handleOpenEdit}
              >
                Edit Jadwal
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="bg-white border border-[#E5E7EB] rounded-2xl p-6 space-y-4 animate-pulse"
            >
              <div className="h-5 bg-gray-200 rounded-md w-1/3"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-100 rounded-md w-full"></div>
                <div className="h-4 bg-gray-100 rounded-md w-2/3"></div>
              </div>
            </div>
          ))}
        </div>
      ) : errorMessage ? (
        /* Error State */
        <div className="bg-white border border-red-200 rounded-2xl p-8 text-center space-y-4 shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-red-50 text-red-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[#111827]">Gagal Memuat Jadwal Kerja</h3>
            <p className="text-xs text-[#6B7280] max-w-md mx-auto">{errorMessage}</p>
          </div>
          <Button variant="primary" size="md" onClick={fetchActiveSchedule}>
            Coba Lagi
          </Button>
        </div>
      ) : !schedule ? (
        /* Empty State */
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-12 text-center space-y-4 shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-orange-50 text-[#F97316] flex items-center justify-center mx-auto">
            <Clock className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[#111827]">Jadwal Kerja Belum Tersedia</h3>
            <p className="text-xs text-[#6B7280] max-w-md mx-auto">
              Belum ada konfigurasi jadwal kerja aktif yang terdaftar dalam sistem.
            </p>
          </div>
        </div>
      ) : (
        /* Active Schedule Grid Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* CARD 1 — HARI KERJA */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-2xs space-y-4 hover:border-orange-200 transition-colors">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 border border-orange-100 flex items-center justify-center text-[#F97316]">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#111827]">Hari Kerja</h3>
                  <p className="text-xs text-[#6B7280]">Hari operasional presensi pegawai</p>
                </div>
              </div>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold text-orange-700 bg-orange-50 border border-orange-100">
                5 Hari Kerja
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-[#111827]">Senin – Jumat</span>
              </div>
              <p className="text-xs text-[#6B7280]">
                Jadwal kerja standar berlaku seragam untuk seluruh pegawai sekolah (tanpa sistem shift).
              </p>
            </div>

            <div className="pt-2 flex flex-wrap gap-1.5">
              {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'].map((day) => (
                <span
                  key={day}
                  className="px-2.5 py-1 bg-gray-100 text-[#111827] text-xs font-semibold rounded-lg border border-[#E5E7EB]"
                >
                  {day}
                </span>
              ))}
            </div>
          </div>

          {/* CARD 2 — JAM KERJA RESMI */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-2xs space-y-4 hover:border-orange-200 transition-colors">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#111827]">Jam Kerja Resmi</h3>
                  <p className="text-xs text-[#6B7280]">Jam operasional sekolah harian</p>
                </div>
              </div>
            </div>

            {/* Table / Details */}
            <div className="divide-y divide-[#E5E7EB] text-xs">
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-[#6B7280] font-medium">Mulai Kerja</span>
                <span className="font-bold text-[#111827] font-mono text-sm">
                  {formatTimeHHmm(schedule.work_start_time)}
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-[#6B7280] font-medium">Kepulangan Operasional</span>
                <span className="font-bold text-[#111827] font-mono text-sm">
                  {formatTimeHHmm(schedule.operational_end_time)}
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-[#6B7280] font-medium">Akhir Jam Kerja Resmi</span>
                <span className="font-bold text-[#111827] font-mono text-sm">
                  {formatTimeHHmm(schedule.work_end_time)}
                </span>
              </div>
            </div>

            {/* Important Notice */}
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2.5 text-xs text-amber-900">
              <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                <strong>Kepulangan operasional dimulai pukul {formatTimeHHmm(schedule.operational_end_time)}.</strong> Ini bukan kategori pulang lebih awal, melainkan penyesuaian operasional bus sekolah.
              </span>
            </div>
          </div>

          {/* CARD 3 — JENDELA CHECK-IN */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-2xs space-y-4 hover:border-orange-200 transition-colors">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
                  <LogIn className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#111827]">Jendela Check-in</h3>
                  <p className="text-xs text-[#6B7280]">Batas waktu presensi masuk</p>
                </div>
              </div>
            </div>

            {/* Table / Details */}
            <div className="divide-y divide-[#E5E7EB] text-xs">
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-[#6B7280] font-medium">Mulai Check-in</span>
                <span className="font-bold text-[#111827] font-mono text-sm">
                  {formatTimeHHmm(schedule.check_in_start_time)}
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-[#6B7280] font-medium">Batas Tepat Waktu</span>
                <span className="font-bold text-[#111827] font-mono text-sm">
                  {formatTimeHHmm(schedule.check_in_on_time_end)}
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-[#6B7280] font-medium">Batas Akhir Check-in</span>
                <span className="font-bold text-[#111827] font-mono text-sm">
                  {formatTimeHHmm(schedule.check_in_end_time)}
                </span>
              </div>
            </div>

            {/* Status Rules Banner */}
            <div className="p-3.5 bg-gray-50 border border-[#E5E7EB] rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#6B7280]">
                  {formatTimeHHmm(schedule.check_in_start_time)} – {formatTimeHHmm(schedule.check_in_on_time_end)}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200">
                  Tepat Waktu
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#6B7280]">
                  {formatTimeHHmm(schedule.check_in_on_time_end)} – {formatTimeHHmm(schedule.check_in_end_time)}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold text-amber-700 bg-amber-50 border border-amber-200">
                  Terlambat
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#6B7280]">
                  Setelah {formatTimeHHmm(schedule.check_in_end_time)}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold text-zinc-700 bg-zinc-200 border border-zinc-300">
                  Check-in Ditutup
                </span>
              </div>
            </div>
          </div>

          {/* CARD 4 — JENDELA CHECK-OUT */}
          <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-2xs space-y-4 hover:border-orange-200 transition-colors">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600">
                  <LogOut className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#111827]">Jendela Check-out</h3>
                  <p className="text-xs text-[#6B7280]">Batas waktu presensi pulang</p>
                </div>
              </div>
            </div>

            {/* Table / Details */}
            <div className="divide-y divide-[#E5E7EB] text-xs">
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-[#6B7280] font-medium">Mulai Check-out</span>
                <span className="font-bold text-[#111827] font-mono text-sm">
                  {formatTimeHHmm(schedule.check_out_start_time)}
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-[#6B7280] font-medium">Batas Akhir Check-out</span>
                <span className="font-bold text-[#111827] font-mono text-sm">
                  {formatTimeHHmm(schedule.check_out_end_time)}
                </span>
              </div>
            </div>

            {/* Information Notice */}
            <div className="p-3.5 bg-purple-50/50 border border-purple-100 rounded-xl text-xs text-purple-900">
              <p>
                Check-out presensi pulang tersedia mulai pukul{' '}
                <strong>{formatTimeHHmm(schedule.check_out_start_time)}</strong> sampai{' '}
                <strong>{formatTimeHHmm(schedule.check_out_end_time)}</strong>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal (Admin / Super Admin Only) */}
      {schedule && (
        <EditScheduleModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          schedule={schedule}
          onSave={handleSaveSchedule}
        />
      )}
    </div>
  );
};
