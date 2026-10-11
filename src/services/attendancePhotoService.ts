import { supabase } from '../lib/supabase';

export const ATTENDANCE_SELFIES_BUCKET = 'attendance-selfies';
export const MAX_SELFIE_SIZE_BYTES = 1572864; // 1.5 MB (1024 * 1024 * 1.5)
export const ALLOWED_SELFIE_MIME_TYPE = 'image/jpeg';

export type AttendanceType = 'check_in' | 'check_out';

/**
 * UUID v4 format regex validation for filename UUID.
 */
const UUID_V4_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const GENERAL_UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Canonical path regexes matching Migration 027 server-side validations:
 * - check_in:  {employee_id}/{YYYY-MM-DD}/check_in_{uuid_v4}.jpg
 * - check_out: {employee_id}/{YYYY-MM-DD}/check_out_{uuid_v4}.jpg
 */
export const CHECK_IN_PATH_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/\d{4}-\d{2}-\d{2}\/check_in_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.jpg$/;

export const CHECK_OUT_PATH_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/\d{4}-\d{2}-\d{2}\/check_out_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.jpg$/;

/**
 * Formats a Date object to YYYY-MM-DD string strictly in Asia/Makassar (WITA, UTC+8) timezone.
 * Uses Intl.DateTimeFormat formatToParts() for deterministic, environment-agnostic calendar formatting.
 */
export function getWitaDateString(date: Date = new Date()): string {
  try {
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Makassar',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(date);
    const year = parts.find((p) => p.type === 'year')?.value;
    const month = parts.find((p) => p.type === 'month')?.value;
    const day = parts.find((p) => p.type === 'day')?.value;

    if (!year || !month || !day) {
      throw new Error('Komponen tanggal WITA tidak lengkap.');
    }

    return `${year}-${month}-${day}`;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Kesalahan format tanggal';
    throw new Error(`Gagal memformat tanggal zona waktu WITA (Asia/Makassar): ${msg}`);
  }
}

/**
 * Generates the canonical storage path for an attendance selfie photo:
 * Format: {employee_id}/{YYYY-MM-DD}/{check_in|check_out}_{uuid_v4}.jpg
 *
 * Enforces:
 * - Valid employee_id (UUID format)
 * - Valid attendance type ('check_in' | 'check_out')
 * - Server-aligned Asia/Makassar (WITA) Gregorian date
 * - Cryptographically random UUID v4
 * - Matches PostgreSQL RPC v_path_regex from Migration 027
 */
export function generateSelfieStoragePath(
  employeeId: string,
  attendanceType: AttendanceType,
  date: Date = new Date()
): string {
  if (!employeeId || typeof employeeId !== 'string') {
    throw new Error('ID pegawai wajib diisi untuk membentuk path foto selfie.');
  }

  const cleanEmployeeId = employeeId.trim().toLowerCase();
  if (!GENERAL_UUID_REGEX.test(cleanEmployeeId)) {
    throw new Error('ID pegawai tidak valid (harus berformat UUID).');
  }

  if (attendanceType !== 'check_in' && attendanceType !== 'check_out') {
    throw new Error('Tipe presensi tidak valid. Harus "check_in" atau "check_out".');
  }

  const witaDate = getWitaDateString(date);
  const fileUuid = crypto.randomUUID().toLowerCase();

  // Validate generated UUID conforms to UUID v4
  if (!UUID_V4_REGEX.test(fileUuid)) {
    throw new Error('Gagal menghasilkan UUID v4 yang valid untuk nama berkas foto.');
  }

  const path = `${cleanEmployeeId}/${witaDate}/${attendanceType}_${fileUuid}.jpg`;

  // Final sanity check against canonical regex
  const expectedRegex = attendanceType === 'check_in' ? CHECK_IN_PATH_REGEX : CHECK_OUT_PATH_REGEX;
  if (!expectedRegex.test(path)) {
    throw new Error('Path foto yang dihasilkan tidak memenuhi kontrak kanonis RPC.');
  }

  return path;
}

/**
 * Validates selfie Blob before transmission to Supabase Storage:
 * - Non-null and non-empty (size > 0)
 * - Strict MIME type check ('image/jpeg')
 * - File size <= 1,572,864 bytes (1.5 MB limit)
 */
export function validateSelfieBlob(blob: Blob): void {
  if (!blob) {
    throw new Error('Berkas foto selfie tidak ditemukan.');
  }

  if (blob.size === 0) {
    throw new Error('Berkas foto selfie kosong (0 byte). Ambil foto ulang.');
  }

  if (blob.type !== ALLOWED_SELFIE_MIME_TYPE) {
    throw new Error(
      `Format citra tidak valid: ${blob.type || 'tidak diketahui'}. Format yang didukung hanya image/jpeg.`
    );
  }

  if (blob.size > MAX_SELFIE_SIZE_BYTES) {
    const sizeMb = (blob.size / (1024 * 1024)).toFixed(2);
    throw new Error(
      `Ukuran berkas foto selfie (${sizeMb} MB) melebihi batas maksimum 1.5 MB.`
    );
  }
}

/**
 * Uploads an attendance selfie Blob to the private Supabase Storage bucket 'attendance-selfies'.
 *
 * Rules:
 * - Uses existing browser Supabase client.
 * - Uploads with upsert: false (tamper-resistant).
 * - Validates Blob constraints before network transmission.
 * - Validates path format before transmission.
 * - Returns the relative storage path upon success.
 * - Does NOT create public or signed URLs.
 * - Does NOT log sensitive payload or tokens.
 */
export async function uploadAttendanceSelfie(
  path: string,
  photoBlob: Blob
): Promise<string> {
  if (!path || typeof path !== 'string' || path.trim() === '') {
    throw new Error('Path penyimpanan foto presensi wajib diisi.');
  }

  const cleanPath = path.trim();

  // Ensure path matches either check-in or check-out canonical pattern
  if (!CHECK_IN_PATH_REGEX.test(cleanPath) && !CHECK_OUT_PATH_REGEX.test(cleanPath)) {
    throw new Error('Format path penyimpanan foto tidak sesuai dengan kontrak keamanan presensi.');
  }

  // Pre-upload Blob validation
  validateSelfieBlob(photoBlob);

  const { data, error } = await supabase.storage
    .from(ATTENDANCE_SELFIES_BUCKET)
    .upload(cleanPath, photoBlob, {
      contentType: ALLOWED_SELFIE_MIME_TYPE,
      upsert: false,
    });

  if (error) {
    const errorMsg = error.message || '';
    if (errorMsg.includes('already exists') || errorMsg.includes('Duplicate')) {
      throw new Error('Berkas foto dengan nama tersebut sudah ada di penyimpanan.');
    }
    if (errorMsg.includes('exceeded') || errorMsg.includes('size')) {
      throw new Error('Ukuran berkas melebihi batas penyimpanan yang diizinkan (maksimal 1.5 MB).');
    }
    if (errorMsg.includes('mime') || errorMsg.includes('type')) {
      throw new Error('Format berkas foto tidak didukung oleh sistem penyimpanan.');
    }
    if (errorMsg.includes('row-level security') || errorMsg.includes('policy')) {
      throw new Error('Akses penyimpanan ditolak oleh kebijakan keamanan. Pastikan akun Anda memiliki izin.');
    }
    throw new Error(`Gagal mengunggah foto selfie ke penyimpanan: ${errorMsg}`);
  }

  if (!data || !data.path) {
    throw new Error('Respons penyimpanan tidak valid setelah unggah foto selfie.');
  }

  return cleanPath;
}

export const attendancePhotoService = {
  getWitaDateString,
  generateSelfieStoragePath,
  validateSelfieBlob,
  uploadAttendanceSelfie,
};
