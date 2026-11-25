import React, { useState, useEffect, useCallback } from 'react';
import {
  Clock,
  Calendar,
  LogIn,
  LogOut,
  Edit2,
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
        <div className="fixed top-4 right-4 z-50 p-4 bg-emerald-50 dark:bg-emerald-950/80 border border-emerald-200 dark:border-emerald-800 rounded-2xl shadow-xl flex items-center gap-3 text-sm text-emerald-800 dark:text-emerald-200 animate-in slide-in-from-top-3 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span className="font-medium">{successToast}</span>
        </div>
      )}

      {/* Header Section */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl sm:text-2xl font-bold text-[#111827] dark:text-[#F9FAFB] tracking-tight">
          Jadwal Kerja
        </h1>

        {canManage && schedule && (
          <Button
            variant="primary"
            size="md"
            leftIcon={<Edit2 className="w-3.5 h-3.5 lg:w-4 lg:h-4" />}
            onClick={handleOpenEdit}
            className="shrink-0 !h-9 !px-3 !py-1.5 !text-xs !gap-1.5 lg:!h-11 lg:!px-4 lg:!py-2.5 lg:!text-sm lg:!gap-2"
          >
            Edit Jadwal
          </Button>
        )}
      </div>

      {/* Loading State */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="bg-white dark:bg-[#262626] border border-[#E5E7EB] dark:border-[#404040] rounded-2xl p-6 space-y-4 animate-pulse"
            >
              <div className="h-5 bg-gray-200 dark:bg-[#333333] rounded-md w-1/3"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-100 dark:bg-[#303030] rounded-md w-full"></div>
                <div className="h-4 bg-gray-100 dark:bg-[#303030] rounded-md w-2/3"></div>
              </div>
            </div>
          ))}
        </div>
      ) : errorMessage ? (
        /* Error State */
        <div className="bg-white dark:bg-[#262626] border border-red-200 dark:border-red-900 rounded-2xl p-8 text-center space-y-4 shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Gagal Memuat Jadwal Kerja</h3>
            <p className="text-xs text-[#6B7280] dark:text-[#A3A3A3] max-w-md mx-auto">{errorMessage}</p>
          </div>
          <Button variant="primary" size="md" onClick={fetchActiveSchedule}>
            Coba Lagi
          </Button>
        </div>
      ) : !schedule ? (
        /* Empty State */
        <div className="bg-white dark:bg-[#262626] border border-[#E5E7EB] dark:border-[#404040] rounded-2xl p-12 text-center space-y-4 shadow-2xs">
          <div className="w-12 h-12 rounded-full bg-orange-50 dark:bg-orange-950/40 text-[#F97316] dark:text-orange-400 flex items-center justify-center mx-auto">
            <Clock className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Jadwal Kerja Belum Tersedia</h3>
            <p className="text-xs text-[#6B7280] dark:text-[#A3A3A3] max-w-md mx-auto">
              Belum ada konfigurasi jadwal kerja aktif yang terdaftar dalam sistem.
            </p>
          </div>
        </div>
      ) : (
        /* Active Schedule Grid Cards */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* CARD 1 — HARI KERJA */}
          <div className="bg-white dark:bg-[#262626] border border-[#E5E7EB] dark:border-[#404040] rounded-2xl p-6 shadow-2xs space-y-4 hover:border-orange-200 dark:hover:border-orange-500/60 transition-colors">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] dark:border-[#404040]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-orange-50 dark:bg-orange-950/40 border border-orange-100 dark:border-orange-900/50 flex items-center justify-center text-[#F97316] dark:text-orange-400">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Hari Kerja</h3>
                  <p className="text-xs text-[#6B7280] dark:text-[#A3A3A3]">Hari operasional presensi pegawai</p>
                </div>
              </div>
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold text-orange-700 dark:text-orange-300 bg-orange-50 dark:bg-orange-950/60 border border-orange-100 dark:border-orange-900">
                5 Hari Kerja
              </span>
            </div>

            <div className="space-y-2">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-extrabold text-[#111827] dark:text-[#F9FAFB]">Senin – Jumat</span>
              </div>
              <p className="text-xs text-[#6B7280] dark:text-[#A3A3A3]">
                Jadwal kerja standar berlaku seragam untuk seluruh pegawai sekolah (tanpa sistem shift).
              </p>
            </div>

            <div className="pt-2 flex flex-wrap gap-1.5">
              {['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'].map((day) => (
                <span
                  key={day}
                  className="px-2.5 py-1 bg-gray-100 dark:bg-[#1F1F1F] text-[#111827] dark:text-slate-200 text-xs font-semibold rounded-lg border border-[#E5E7EB] dark:border-[#404040]"
                >
                  {day}
                </span>
              ))}
            </div>
          </div>

          {/* CARD 2 — JAM KERJA RESMI */}
          <div className="bg-white dark:bg-[#262626] border border-[#E5E7EB] dark:border-[#404040] rounded-2xl p-6 shadow-2xs space-y-4 hover:border-orange-200 dark:hover:border-orange-500/60 transition-colors">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] dark:border-[#404040]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Clock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Jam Kerja Resmi</h3>
                  <p className="text-xs text-[#6B7280] dark:text-[#A3A3A3]">Jam operasional sekolah harian</p>
                </div>
              </div>
            </div>

            {/* Table / Details */}
            <div className="divide-y divide-[#E5E7EB] dark:divide-[#404040] text-xs">
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-[#6B7280] dark:text-[#A3A3A3] font-medium">Mulai Kerja</span>
                <span className="font-bold text-[#111827] dark:text-[#F9FAFB] font-mono text-sm">
                  {formatTimeHHmm(schedule.work_start_time)}
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-[#6B7280] dark:text-[#A3A3A3] font-medium">Kepulangan Operasional</span>
                <span className="font-bold text-[#111827] dark:text-[#F9FAFB] font-mono text-sm">
                  {formatTimeHHmm(schedule.operational_end_time)}
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-[#6B7280] dark:text-[#A3A3A3] font-medium">Akhir Jam Kerja Resmi</span>
                <span className="font-bold text-[#111827] dark:text-[#F9FAFB] font-mono text-sm">
                  {formatTimeHHmm(schedule.work_end_time)}
                </span>
              </div>
            </div>

            {/* Important Notice */}
            <div className="p-3 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-start gap-2.5 text-xs text-amber-900 dark:text-amber-200">
              <Info className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
              <span>
                <strong>Kepulangan operasional dimulai pukul {formatTimeHHmm(schedule.operational_end_time)}.</strong> Ini bukan kategori pulang lebih awal, melainkan penyesuaian operasional bus sekolah.
              </span>
            </div>
          </div>

          {/* CARD 3 — JENDELA CHECK-IN */}
          <div className="bg-white dark:bg-[#262626] border border-[#E5E7EB] dark:border-[#404040] rounded-2xl p-6 shadow-2xs space-y-4 hover:border-orange-200 dark:hover:border-orange-500/60 transition-colors">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] dark:border-[#404040]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                  <LogIn className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Jendela Check-in</h3>
                  <p className="text-xs text-[#6B7280] dark:text-[#A3A3A3]">Batas waktu presensi masuk</p>
                </div>
              </div>
            </div>

            {/* Table / Details */}
            <div className="divide-y divide-[#E5E7EB] dark:divide-[#404040] text-xs">
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-[#6B7280] dark:text-[#A3A3A3] font-medium">Mulai Check-in</span>
                <span className="font-bold text-[#111827] dark:text-[#F9FAFB] font-mono text-sm">
                  {formatTimeHHmm(schedule.check_in_start_time)}
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-[#6B7280] dark:text-[#A3A3A3] font-medium">Batas Tepat Waktu</span>
                <span className="font-bold text-[#111827] dark:text-[#F9FAFB] font-mono text-sm">
                  {formatTimeHHmm(schedule.check_in_on_time_end)}
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-[#6B7280] dark:text-[#A3A3A3] font-medium">Batas Akhir Check-in</span>
                <span className="font-bold text-[#111827] dark:text-[#F9FAFB] font-mono text-sm">
                  {formatTimeHHmm(schedule.check_in_end_time)}
                </span>
              </div>
            </div>

            {/* Status Rules Banner */}
            <div className="p-3.5 bg-gray-50 dark:bg-[#1F1F1F] border border-[#E5E7EB] dark:border-[#404040] rounded-xl space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-[#6B7280] dark:text-slate-400">
                  {formatTimeHHmm(schedule.check_in_start_time)} – {formatTimeHHmm(schedule.check_in_on_time_end)}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800">
                  Tepat Waktu
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#6B7280] dark:text-slate-400">
                  {formatTimeHHmm(schedule.check_in_on_time_end)} – {formatTimeHHmm(schedule.check_in_end_time)}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/60 border border-amber-200 dark:border-amber-800">
                  Terlambat
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[#6B7280] dark:text-slate-400">
                  Setelah {formatTimeHHmm(schedule.check_in_end_time)}
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold text-zinc-700 dark:text-zinc-300 bg-zinc-200 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700">
                  Check-in Ditutup
                </span>
              </div>
            </div>
          </div>

          {/* CARD 4 — JENDELA CHECK-OUT */}
          <div className="bg-white dark:bg-[#262626] border border-[#E5E7EB] dark:border-[#404040] rounded-2xl p-6 shadow-2xs space-y-4 hover:border-orange-200 dark:hover:border-orange-500/60 transition-colors">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB] dark:border-[#404040]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-purple-50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/50 flex items-center justify-center text-purple-600 dark:text-purple-400">
                  <LogOut className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#111827] dark:text-[#F9FAFB]">Jendela Check-out</h3>
                  <p className="text-xs text-[#6B7280] dark:text-[#A3A3A3]">Batas waktu presensi pulang</p>
                </div>
              </div>
            </div>

            {/* Table / Details */}
            <div className="divide-y divide-[#E5E7EB] dark:divide-[#404040] text-xs">
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-[#6B7280] dark:text-[#A3A3A3] font-medium">Mulai Check-out</span>
                <span className="font-bold text-[#111827] dark:text-[#F9FAFB] font-mono text-sm">
                  {formatTimeHHmm(schedule.check_out_start_time)}
                </span>
              </div>
              <div className="py-2.5 flex items-center justify-between">
                <span className="text-[#6B7280] dark:text-[#A3A3A3] font-medium">Batas Akhir Check-out</span>
                <span className="font-bold text-[#111827] dark:text-[#F9FAFB] font-mono text-sm">
                  {formatTimeHHmm(schedule.check_out_end_time)}
                </span>
              </div>
            </div>

            {/* Information Notice */}
            <div className="p-3.5 bg-purple-50/50 dark:bg-purple-950/40 border border-purple-100 dark:border-purple-900/50 rounded-xl text-xs text-purple-900 dark:text-purple-200">
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
