import { supabase } from '../lib/supabase';
import { WorkScheduleModel, UpdateWorkScheduleInput } from '../types/workSchedule.types';

/**
 * Maps Supabase / PostgreSQL errors to clear user-friendly Indonesian messages
 */
export const formatWorkScheduleError = (error: unknown): string => {
  if (!error) return 'Terjadi kesalahan sistem yang tidak diketahui.';

  const err = error as { code?: string; message?: string; details?: string };
  const message = err.message || '';
  const details = err.details || '';
  const combined = `${message} ${details}`.toLowerCase();

  // 1. Unique constraint violation (23505)
  if (err.code === '23505' || combined.includes('duplicate key') || combined.includes('unique')) {
    if (combined.includes('idx_work_schedules_single_active') || combined.includes('single_active')) {
      return 'Sudah ada jadwal kerja lain yang aktif. Hanya satu jadwal kerja yang diperbolehkan aktif.';
    }
    if (combined.includes('code') || combined.includes('work_schedules_code_key')) {
      return 'Kode jadwal kerja sudah digunakan. Silakan gunakan kode lain.';
    }
    return 'Data duplikat terdeteksi pada sistem.';
  }

  // 2. Check constraint violation (23514)
  if (err.code === '23514' || combined.includes('check constraint')) {
    if (combined.includes('time_sequence')) {
      return 'Urutan waktu tidak valid. Pastikan Mulai Check-in < Batas Tepat Waktu < Batas Akhir Check-in, Jam Kerja < Kepulangan Operasional < Akhir Jam Kerja Resmi, dan Check-out Start = Kepulangan Operasional.';
    }
    if (combined.includes('working_days')) {
      return 'Hari kerja wajib dipilih minimal 1 hari (Senin - Jumat) dan hanya menggunakan hari yang valid.';
    }
    if (combined.includes('name_not_empty')) {
      return 'Nama jadwal kerja tidak boleh kosong.';
    }
    if (combined.includes('code_not_empty')) {
      return 'Kode jadwal kerja tidak boleh kosong.';
    }
    return 'Data jadwal kerja tidak memenuhi ketentuan validasi database.';
  }

  // 3. Permission / RLS violation (42501)
  if (err.code === '42501' || combined.includes('permission denied') || combined.includes('row-level security')) {
    return 'Anda tidak memiliki izin untuk mengubah jadwal kerja.';
  }

  // 4. Network error
  if (combined.includes('failed to fetch') || combined.includes('network') || combined.includes('timeout')) {
    return 'Koneksi bermasalah. Silakan periksa jaringan internet Anda dan coba lagi.';
  }

  if (message && !message.includes('PGRST') && !message.includes('schema') && !message.includes('column')) {
    return message;
  }

  return 'Gagal memproses data jadwal kerja. Silakan coba lagi.';
};

export const workScheduleService = {
  /**
   * Fetch the active school work schedule.
   * First tries eq('is_active', true), then falls back to any schedule row if none is marked active.
   */
  async getActiveWorkSchedule(): Promise<WorkScheduleModel | null> {
    const { data: activeSchedule, error: activeError } = await supabase
      .from('work_schedules')
      .select('*')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();

    if (activeError) {
      console.error('Error fetching active work schedule:', activeError);
      throw new Error(formatWorkScheduleError(activeError));
    }

    if (activeSchedule) {
      return activeSchedule as WorkScheduleModel;
    }

    // Fallback if no schedule is marked active
    const { data: fallbackSchedule, error: fallbackError } = await supabase
      .from('work_schedules')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (fallbackError) {
      console.error('Error fetching fallback work schedule:', fallbackError);
      throw new Error(formatWorkScheduleError(fallbackError));
    }

    return (fallbackSchedule as WorkScheduleModel) || null;
  },

  /**
   * Update the school work schedule.
   */
  async updateWorkSchedule(id: string, input: UpdateWorkScheduleInput): Promise<WorkScheduleModel> {
    // Ensure time values have HH:mm:ss format for PostgreSQL TIME column
    const ensureTimeWithSeconds = (timeStr: string): string => {
      if (!timeStr) return '00:00:00';
      const parts = timeStr.trim().split(':');
      if (parts.length === 2) {
        return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:00`;
      }
      return timeStr;
    };

    const payload = {
      name: input.name.trim(),
      code: input.code.trim(),
      description: input.description ? input.description.trim() : null,
      check_in_start_time: ensureTimeWithSeconds(input.check_in_start_time),
      check_in_on_time_end: ensureTimeWithSeconds(input.check_in_on_time_end),
      check_in_end_time: ensureTimeWithSeconds(input.check_in_end_time),
      work_start_time: ensureTimeWithSeconds(input.work_start_time),
      operational_end_time: ensureTimeWithSeconds(input.operational_end_time),
      work_end_time: ensureTimeWithSeconds(input.work_end_time),
      check_out_start_time: ensureTimeWithSeconds(input.check_out_start_time), // Must equal operational_end_time
      check_out_end_time: ensureTimeWithSeconds(input.check_out_end_time),
      working_days: input.working_days,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('work_schedules')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating work schedule:', error);
      throw new Error(formatWorkScheduleError(error));
    }

    return data as WorkScheduleModel;
  },
};
