export interface WorkScheduleModel {
  id: string;
  name: string;
  code: string;
  description: string | null;
  check_in_start_time: string;
  check_in_on_time_end: string;
  check_in_end_time: string;
  work_start_time: string;
  operational_end_time: string;
  work_end_time: string;
  check_out_start_time: string;
  check_out_end_time: string;
  working_days: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface UpdateWorkScheduleInput {
  name: string;
  code: string;
  description?: string | null;
  check_in_start_time: string;
  check_in_on_time_end: string;
  check_in_end_time: string;
  work_start_time: string;
  operational_end_time: string;
  work_end_time: string;
  check_out_start_time: string;
  check_out_end_time: string;
  working_days: string[];
}

/**
 * Helper to format time strings from "HH:mm:ss" or "HH:mm" to "HH:mm"
 */
export const formatTimeHHmm = (timeStr?: string | null): string => {
  if (!timeStr) return '--:--';
  const parts = timeStr.trim().split(':');
  if (parts.length >= 2) {
    return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}`;
  }
  return timeStr;
};

/**
 * Day labels mapping for Indonesian UI display
 */
export const DAY_LABELS: Record<string, string> = {
  monday: 'Senin',
  tuesday: 'Selasa',
  wednesday: 'Rabu',
  thursday: 'Kamis',
  friday: 'Jumat',
  saturday: 'Sabtu',
  sunday: 'Minggu',
};
