/**
 * TAMAKI — STATUS COLOR DESIGN TOKENS (Phase DS-02)
 * Centralized color mapping for attendance statuses conforming to design.md.
 * 
 * Palette: Monochromatic Orange scale & neutral grays.
 */

export interface StatusColorToken {
  key: string;
  label: string;
  hex: string;
  bgHex: string;
  borderHex: string;
  textHex: string;
  description: string;
}

export const ATTENDANCE_STATUS_TOKENS = {
  onTime: {
    key: 'on_time',
    label: 'Tepat Waktu',
    hex: '#7C2D12', // Orange 900
    bgHex: '#FFF7ED',
    borderHex: '#FED7AA',
    textHex: '#7C2D12',
    description: 'Hadir tepat waktu sebelum batas akhir check-in.',
  },
  late: {
    key: 'late',
    label: 'Terlambat',
    hex: '#9A3412', // Orange 800
    bgHex: '#FFF7ED',
    borderHex: '#FED7AA',
    textHex: '#9A3412',
    description: 'Hadir melebihi jam mulai kerja namun dalam jendela toleransi.',
  },
  officialDuty: {
    key: 'official_duty',
    label: 'Dinas Luar',
    hex: '#C2410C', // Orange 700
    bgHex: '#FFF7ED',
    borderHex: '#FED7AA',
    textHex: '#C2410C',
    description: 'Melaksanakan tugas kedinasan di luar lingkungan sekolah.',
  },
  sick: {
    key: 'sick',
    label: 'Sakit',
    hex: '#EA580C', // Orange 600
    bgHex: '#FFF7ED',
    borderHex: '#FED7AA',
    textHex: '#C2410C', // Orange 700
    description: 'Berhalangan hadir karena sakit dengan/tanpa surat dokter.',
  },
  permit: {
    key: 'permit',
    label: 'Izin',
    hex: '#9A3412', // Orange 800
    bgHex: '#FFF7ED',
    borderHex: '#FED7AA',
    textHex: '#9A3412', // Orange 800
    description: 'Berhalangan hadir dengan izin resmi yang disetujui.',
  },
  leave: {
    key: 'leave',
    label: 'Cuti',
    hex: '#C2410C', // Orange 700
    bgHex: '#FFF7ED',
    borderHex: '#FED7AA',
    textHex: '#C2410C', // Orange 700
    description: 'Mengambil hak cuti tahunan atau cuti khusus.',
  },
  absent: {
    key: 'absent',
    label: 'Belum Presensi / Alpha',
    hex: '#7C2D12', // Orange 900
    bgHex: '#FFF7ED',
    borderHex: '#FED7AA',
    textHex: '#7C2D12', // Orange 900
    description: 'Belum melakukan presensi atau tanpa keterangan (alpha).',
  },
  neutral: {
    key: 'neutral',
    label: 'Libur / Tidak Aktif',
    hex: '#9CA3AF', // Neutral gray 400
    bgHex: '#F3F4F6',
    borderHex: '#E5E7EB',
    textHex: '#4B5563',
    description: 'Hari libur nasional, akhir pekan, atau status non-aktif.',
  },
} as const;

export type AttendanceStatusTokenKey = keyof typeof ATTENDANCE_STATUS_TOKENS;
