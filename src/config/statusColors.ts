/**
 * TAMAKI — STATUS COLOR DESIGN TOKENS (Phase 1 Standardization)
 * Centralized color mapping for attendance statuses conforming to design guidelines.
 * 
 * Palette:
 * - On Time, Late, Official Duty: Orange Sunset (#F97316 family)
 * - Sick, Permit, Leave: Amber (#F59E0B family)
 * - Absent / Alpha: Red (#DC2626)
 * - Pending / Belum Presensi: Light Gray (#E5E7EB) with dark contrast text
 */

export interface StatusColorToken {
  key: string;
  label: string;
  hex: string;
  bgHex: string;
  borderHex: string;
  textHex: string;
  badgeClass: string;
  description: string;
}

export const ATTENDANCE_STATUS_TOKENS = {
  onTime: {
    key: 'on_time',
    label: 'Tepat Waktu',
    hex: '#F97316', // Orange Sunset
    bgHex: '#FFF7ED',
    borderHex: '#FED7AA',
    textHex: '#C2410C',
    badgeClass:
      'bg-[#FFF7ED] text-[#C2410C] border-[#FED7AA] dark:bg-[#431F0B] dark:text-[#FDBA74] dark:border-[#9A3412]/60',
    description: 'Hadir tepat waktu sebelum batas akhir check-in.',
  },
  late: {
    key: 'late',
    label: 'Terlambat',
    hex: '#F97316', // Orange Sunset
    bgHex: '#FFF7ED',
    borderHex: '#FED7AA',
    textHex: '#C2410C',
    badgeClass:
      'bg-[#FFF7ED] text-[#C2410C] border-[#FED7AA] dark:bg-[#431F0B] dark:text-[#FDBA74] dark:border-[#9A3412]/60',
    description: 'Hadir melebihi jam mulai kerja namun dalam jendela toleransi.',
  },
  officialDuty: {
    key: 'official_duty',
    label: 'Dinas Luar',
    hex: '#F97316', // Orange Sunset
    bgHex: '#FFF7ED',
    borderHex: '#FED7AA',
    textHex: '#C2410C',
    badgeClass:
      'bg-[#FFF7ED] text-[#C2410C] border-[#FED7AA] dark:bg-[#431F0B] dark:text-[#FDBA74] dark:border-[#9A3412]/60',
    description: 'Melaksanakan tugas kedinasan di luar lingkungan sekolah.',
  },
  sick: {
    key: 'sick',
    label: 'Sakit',
    hex: '#F59E0B', // Amber
    bgHex: '#FEF3C7',
    borderHex: '#FDE68A',
    textHex: '#B45309',
    badgeClass:
      'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A] dark:bg-[#451A03] dark:text-[#FCD34D] dark:border-[#92400E]/60',
    description: 'Berhalangan hadir karena sakit dengan/tanpa surat dokter.',
  },
  permit: {
    key: 'permit',
    label: 'Izin',
    hex: '#F59E0B', // Amber
    bgHex: '#FEF3C7',
    borderHex: '#FDE68A',
    textHex: '#B45309',
    badgeClass:
      'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A] dark:bg-[#451A03] dark:text-[#FCD34D] dark:border-[#92400E]/60',
    description: 'Berhalangan hadir dengan izin resmi yang disetujui.',
  },
  leave: {
    key: 'leave',
    label: 'Cuti',
    hex: '#F59E0B', // Amber
    bgHex: '#FEF3C7',
    borderHex: '#FDE68A',
    textHex: '#B45309',
    badgeClass:
      'bg-[#FEF3C7] text-[#B45309] border-[#FDE68A] dark:bg-[#451A03] dark:text-[#FCD34D] dark:border-[#92400E]/60',
    description: 'Mengambil hak cuti tahunan atau cuti khusus.',
  },
  absent: {
    key: 'absent',
    label: 'Alfa / Mangkir',
    hex: '#DC2626', // Red
    bgHex: '#FEE2E2',
    borderHex: '#FECACA',
    textHex: '#B91C1C',
    badgeClass:
      'bg-[#FEE2E2] text-[#B91C1C] border-[#FECACA] dark:bg-[#450A0A] dark:text-[#FCA5A5] dark:border-[#991B1B]/60',
    description: 'Tanpa keterangan atau mangkir.',
  },
  pending: {
    key: 'pending',
    label: 'Belum Presensi',
    hex: '#9CA3AF', // Gray
    bgHex: '#E5E7EB', // Light gray #E5E7EB
    borderHex: '#D1D5DB',
    textHex: '#374151', // Dark contrast text
    badgeClass:
      'bg-[#E5E7EB] text-[#374151] border-[#D1D5DB] dark:bg-[#303030] dark:text-[#D4D4D4] dark:border-[#404040]',
    description: 'Belum melakukan presensi pada hari ini.',
  },
  neutral: {
    key: 'neutral',
    label: 'Libur / Tidak Aktif',
    hex: '#9CA3AF',
    bgHex: '#F3F4F6',
    borderHex: '#E5E7EB',
    textHex: '#4B5563',
    badgeClass:
      'bg-[#F3F4F6] text-[#4B5563] border-[#E5E7EB] dark:bg-[#262626] dark:text-[#A3A3A3] dark:border-[#404040]',
    description: 'Hari libur nasional, akhir pekan, atau status non-aktif.',
  },
} as const;

export type AttendanceStatusTokenKey = keyof typeof ATTENDANCE_STATUS_TOKENS;
