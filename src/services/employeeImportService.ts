import * as XLSX from 'xlsx';
import XLSXStyle from 'xlsx-js-style';
import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { DepartmentRow, EmployeeStatus, Gender, PositionRow } from '../types/database.types';
import { COMMON_EMPLOYEE_TYPES } from '../types/employee';
import {
  AuthCheckExecutionStatus,
  AuthEmailCheckResponse,
  BULK_ACCOUNT_CHUNK_SIZE,
  BulkAccountCreationItemStatus,
  BulkCreateAccountChunkError,
  BulkCreateAccountsAggregatedSummary,
  BulkCreateEmployeeAccountRowResult,
  BulkCreateEmployeeAccountsChunkResponse,
  BulkEmployeeImportSummaryResponse,
  EMPLOYEE_IMPORT_GUIDE_SHEET_NAME,
  EMPLOYEE_IMPORT_HEADERS,
  EMPLOYEE_IMPORT_MAX_FILE_SIZE_BYTES,
  EMPLOYEE_IMPORT_MAX_ROWS,
  EMPLOYEE_IMPORT_SHEET_NAME,
  EmployeeAccountCandidate,
  EmployeeImportRowExecutionResult,
  EmployeeImportServerRowInput,
  ImportRowValidationStatus,
  NormalizedEmployeeImportPayload,
  ParsedEmployeeImportRawRow,
  ValidatedEmployeeImportRow,
  WorkbookValidationSummary,
} from '../types/employeeImport.types';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export const AUTH_EXISTS_WARNING_MESSAGE =
  'Email sudah terdaftar di Supabase Auth — perlu pemeriksaan manual';

const EMPLOYEE_TYPE_CANONICAL_LOOKUP: Record<string, string> = Object.fromEntries(
  COMMON_EMPLOYEE_TYPES.map((label) => [
    label.trim().replace(/\s+/g, ' ').toUpperCase(),
    label,
  ])
);

export interface ExistingEmployeeIdentityRecord {
  email: string | null;
  nip: string | null;
  nik: string | null;
  employee_number: string | null;
}

function normalizeLookupName(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase();
}

function normalizeNullableText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Neutralizes spreadsheet formula injection characters (=, +, -, @, tab, CR)
 * when exporting error/result reports back to Excel/CSV.
 */
export function sanitizeSpreadsheetCellForExport(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (/^[=+\-@\t\r]/.test(str)) {
    return `'${str}`;
  }
  return str;
}

/**
 * Translates PostgreSQL error codes & constraint violations into readable Indonesian messages.
 */
export function mapDatabaseConstraintError(code?: string, message?: string): string {
  const msg = (message || '').toLowerCase();

  if (code === '23505') {
    if (msg.includes('employees_email_normalized_unique') || msg.includes('email')) {
      return 'Alamat email sudah terdaftar pada pegawai lain (employees_email_normalized_unique).';
    }
    if (msg.includes('nip')) {
      return 'NIP sudah digunakan oleh pegawai lain.';
    }
    if (msg.includes('nik')) {
      return 'NIK sudah digunakan oleh pegawai lain.';
    }
    if (msg.includes('employee_number')) {
      return 'Nomor Pegawai sudah digunakan oleh pegawai lain.';
    }
    if (msg.includes('profile_id')) {
      return 'Akun profil sudah terhubung dengan pegawai lain.';
    }
    return 'Data duplikat melanggar batasan unik database.';
  }

  if (code === '23502') {
    return 'Kolom wajib di database tidak boleh kosong.';
  }

  if (code === '23514') {
    if (msg.includes('gender')) return 'Nilai jenis kelamin tidak valid.';
    if (msg.includes('status')) return 'Nilai status keaktifan tidak valid.';
    return 'Nilai tidak memenuhi aturan validasi database.';
  }

  if (code === '22007' || code === '22P02') {
    return 'Format tanggal atau tipe data tidak valid.';
  }

  if (code === '42501') {
    return 'Akses ditolak oleh kebijakan keamanan database (RLS).';
  }

  return message ? `Gagal menyimpan baris: ${message}` : 'Gagal menyimpan data pegawai ke database.';
}

/**
 * Strict calendar date validation & parsing:
 * Accepts:
 *   - Native Excel Date object or Excel date serial (when formatted as date)
 *   - YYYY-MM-DD
 *   - DD/MM/YYYY
 *   - DD-MM-YYYY
 * Strictly rejects ambiguous MM/DD/YYYY (when month > 12 or non-2-digit slash formats) and invalid calendar dates.
 */
export function parseAndValidateJoinDate(
  rawValue: string | number | Date | null,
  formatHint?: string
): { value: string | null; error: string | null } {
  if (rawValue === null || rawValue === undefined) {
    return { value: null, error: null };
  }

  if (rawValue instanceof Date) {
    if (Number.isNaN(rawValue.getTime())) {
      return { value: null, error: 'Tanggal Bergabung tidak valid.' };
    }
    const year = rawValue.getFullYear();
    const month = rawValue.getMonth() + 1;
    const day = rawValue.getDate();
    return validateCalendarParts(year, month, day);
  }

  if (typeof rawValue === 'number') {
    if (!Number.isFinite(rawValue) || rawValue <= 0) {
      return { value: null, error: 'Format Tanggal Bergabung tidak valid.' };
    }
    const ssfApi =
      XLSX.SSF ??
      (XLSX as unknown as { default?: { SSF?: typeof XLSX.SSF } }).default?.SSF ??
      (XLSXStyle as unknown as { SSF?: typeof XLSX.SSF }).SSF;

    if (formatHint && ssfApi && typeof ssfApi.is_date === 'function' && !ssfApi.is_date(formatHint)) {
      return {
        value: null,
        error: 'Tanggal Bergabung harus menggunakan format tanggal Excel, YYYY-MM-DD, DD/MM/YYYY, atau DD-MM-YYYY.',
      };
    }
    const parsed = ssfApi?.parse_date_code?.(rawValue);
    if (!parsed || !parsed.y || !parsed.m || !parsed.d) {
      return { value: null, error: 'Tanggal Excel tidak valid.' };
    }
    return validateCalendarParts(parsed.y, parsed.m, parsed.d);
  }

  const trimmed = String(rawValue).trim();
  if (!trimmed) {
    return { value: null, error: null };
  }

  // Format 1: YYYY-MM-DD
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (isoMatch) {
    return validateCalendarParts(
      Number(isoMatch[1]),
      Number(isoMatch[2]),
      Number(isoMatch[3])
    );
  }

  // Format 2: DD/MM/YYYY
  const slashMatch = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(trimmed);
  if (slashMatch) {
    return validateCalendarParts(
      Number(slashMatch[3]),
      Number(slashMatch[2]),
      Number(slashMatch[1])
    );
  }

  // Format 3: DD-MM-YYYY
  const dashMatch = /^(\d{2})-(\d{2})-(\d{4})$/.exec(trimmed);
  if (dashMatch) {
    return validateCalendarParts(
      Number(dashMatch[3]),
      Number(dashMatch[2]),
      Number(dashMatch[1])
    );
  }

  return {
    value: null,
    error: `Format Tanggal Bergabung "${trimmed}" tidak didukung. Gunakan tanggal Excel, YYYY-MM-DD, DD/MM/YYYY, atau DD-MM-YYYY.`,
  };
}

function validateCalendarParts(
  year: number,
  month: number,
  day: number
): { value: string | null; error: string | null } {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return { value: null, error: 'Tanggal Bergabung tidak valid.' };
  }
  if (year < 1950 || year > 2100) {
    return { value: null, error: `Tahun Tanggal Bergabung (${year}) berada di luar rentang wajar (1950–2100).` };
  }
  if (month < 1 || month > 12) {
    return {
      value: null,
      error: `Bulan pada Tanggal Bergabung tidak valid (bulan=${month}). Pastikan menggunakan DD/MM/YYYY atau YYYY-MM-DD, bukan MM/DD/YYYY.`,
    };
  }
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  if (day < 1 || day > daysInMonth) {
    return {
      value: null,
      error: `Tanggal kalender tidak nyata (${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}).`,
    };
  }
  const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  return { value: iso, error: null };
}

/**
 * Normalizes and validates gender input.
 */
export function normalizeGenderInput(raw: string): { value: Gender | null; error: string | null } {
  const trimmed = raw.trim();
  if (!trimmed) return { value: null, error: null };
  const lower = trimmed.toLowerCase();
  if (lower === 'laki-laki') return { value: 'male', error: null };
  if (lower === 'perempuan') return { value: 'female', error: null };
  return {
    value: null,
    error: `Jenis Kelamin "${trimmed}" tidak valid. Gunakan "Laki-laki", "Perempuan", atau kosongkan.`,
  };
}

/**
 * Normalizes and validates status input (empty -> 'active', unknown -> rejected).
 */
export function normalizeStatusInput(
  raw: string
): { value: EmployeeStatus; error: string | null } {
  const trimmed = raw.trim();
  if (!trimmed) return { value: 'active', error: null };
  const lower = trimmed.toLowerCase();
  if (lower === 'aktif') return { value: 'active', error: null };
  if (lower === 'tidak aktif') return { value: 'inactive', error: null };
  return {
    value: 'active',
    error: `Status Keaktifan "${trimmed}" tidak dikenal. Gunakan "Aktif", "Tidak Aktif", atau kosongkan.`,
  };
}

/**
 * Normalizes and validates official employee_type against COMMON_EMPLOYEE_TYPES.
 */
export function normalizeOfficialEmployeeType(
  raw: string
): { value: string | null; error: string | null } {
  const trimmed = raw.trim().replace(/\s+/g, ' ');
  if (!trimmed) {
    return { value: null, error: 'Jenis Kepegawaian wajib diisi.' };
  }
  const matched = EMPLOYEE_TYPE_CANONICAL_LOOKUP[trimmed.toUpperCase()];
  if (!matched) {
    return {
      value: null,
      error: `Jenis Kepegawaian "${trimmed}" tidak valid. Pilih salah satu dari 8 kategori resmi.`,
    };
  }
  return { value: matched, error: null };
}

/**
 * Builds the official Tamaki Excel import template workbook (in memory for testing & browser download).
 */
export function buildEmployeeImportTemplateWorkbook(
  activeDepartments: DepartmentRow[],
  activePositions: PositionRow[]
): XLSXStyle.WorkBook {
  const workbook = XLSXStyle.utils.book_new();

  // Sheet 1: Template_Impor_Pegawai
  const templateSheetData: string[][] = [Array.from(EMPLOYEE_IMPORT_HEADERS)];
  const templateWs = XLSXStyle.utils.aoa_to_sheet(templateSheetData);

  templateWs['!cols'] = [
    { wch: 30 }, // 1. Nama Lengkap & Gelar
    { wch: 22 }, // 2. NIP
    { wch: 20 }, // 3. NIK
    { wch: 24 }, // 4. Nomor Pegawai / ID Internal
    { wch: 16 }, // 5. Jenis Kelamin
    { wch: 26 }, // 6. Jenis Kepegawaian
    { wch: 28 }, // 7. Departemen / Unit Kerja
    { wch: 28 }, // 8. Jabatan / Tugas Pokok
    { wch: 18 }, // 9. Tanggal Bergabung
    { wch: 16 }, // 10. Status Keaktifan
    { wch: 22 }, // 11. Nomor Telepon / WhatsApp
    { wch: 32 }, // 12. Alamat Email
    { wch: 30 }, // 13. Catatan Tambahan
  ];

  // Style Header Row (Row 1)
  for (let colIdx = 0; colIdx < EMPLOYEE_IMPORT_HEADERS.length; colIdx++) {
    const ref = `${XLSXStyle.utils.encode_col(colIdx)}1`;
    if (templateWs[ref]) {
      templateWs[ref].s = {
        fill: { patternType: 'solid', fgColor: { rgb: 'F97316' } },
        font: { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
        border: {
          top: { style: 'thin', color: { rgb: 'EA580C' } },
          bottom: { style: 'thin', color: { rgb: 'EA580C' } },
          left: { style: 'thin', color: { rgb: 'EA580C' } },
          right: { style: 'thin', color: { rgb: 'EA580C' } },
        },
      };
    }
  }

  // Pre-format text cells for NIP (col 1), NIK (col 2), Nomor Pegawai (col 3), Telepon (col 10)
  // across rows 2..501 so leading zeros and 16-18 digit numbers stay text when entered in Excel.
  const textFormattedColIndices = [1, 2, 3, 10];
  for (let rowNum = 2; rowNum <= EMPLOYEE_IMPORT_MAX_ROWS + 1; rowNum++) {
    for (const colIdx of textFormattedColIndices) {
      const ref = `${XLSXStyle.utils.encode_col(colIdx)}${rowNum}`;
      templateWs[ref] = {
        t: 's',
        v: '',
        z: '@',
        s: { numFmt: '@' },
      };
    }
  }
  templateWs['!ref'] = `A1:M${EMPLOYEE_IMPORT_MAX_ROWS + 1}`;

  XLSXStyle.utils.book_append_sheet(workbook, templateWs, EMPLOYEE_IMPORT_SHEET_NAME);

  // Sheet 2: Petunjuk_dan_Referensi
  const guideRows: (string | number)[][] = [
    ['PETUNJUK PENGISIAN & REFERENSI DATA MASTER — TAMAKI'],
    [''],
    ['1. Aturan Umum'],
    ['- Jangan mengubah nama, urutan, atau jumlah 13 kolom header pada sheet Template_Impor_Pegawai.'],
    ['- Maksimal 500 baris data per unggahan dan ukuran file maksimal 5 MB.'],
    ['- Kolom WAJIB diisi: Nama Lengkap & Gelar, Jenis Kepegawaian, dan Alamat Email.'],
    ['- Kolom NIP, NIK, Nomor Pegawai / ID Internal, dan Nomor Telepon diformat sebagai TEKS (@) agar angka nol di depan tidak hilang.'],
    ['- Format Tanggal Bergabung yang diterima: Tanggal asli Excel, YYYY-MM-DD (2024-08-17), DD/MM/YYYY (17/08/2024), atau DD-MM-YYYY (17-08-2024).'],
    ['- Jika Departemen atau Jabatan tidak ditemukan atau nonaktif, pegawai tetap diimpor dengan Departemen/Jabatan kosong (NULL) disertai peringatan.'],
    [''],
    ['2. Contoh Pengisian (Jangan isi contoh ke sheet template jika bukan data nyata)'],
    Array.from(EMPLOYEE_IMPORT_HEADERS),
    [
      'Drs. Ahmad Hidayat, M.Pd.',
      '198005122009031004',
      '7324011205800001',
      'PEG-001',
      'Laki-laki',
      'PNS',
      activeDepartments[0]?.name || 'Teknik Komputer & Informatika',
      activePositions[0]?.name || 'Guru Mata Pelajaran / Produktif',
      '2024-07-01',
      'Aktif',
      '081234567890',
      'ahmad.hidayat@sekolah.sch.id',
      'Wali kelas XII',
    ],
    [''],
    ['3. Daftar Nilai Pilihan Resmi'],
    ['Jenis Kepegawaian (Wajib salah satu)', 'Jenis Kelamin (Opsional)', 'Status Keaktifan (Opsional)', 'Departemen / Unit Kerja Aktif', 'Jabatan / Tugas Pokok Aktif'],
  ];

  const genderChoices = ['Laki-laki', 'Perempuan', '(Kosongkan jika belum diisi)'];
  const statusChoices = ['Aktif', 'Tidak Aktif', '(Kosongkan = default Aktif)'];
  const deptNames = activeDepartments.filter((d) => d.is_active).map((d) => d.name);
  const posNames = activePositions.filter((p) => p.is_active).map((p) => p.name);

  const maxRefRows = Math.max(
    COMMON_EMPLOYEE_TYPES.length,
    genderChoices.length,
    statusChoices.length,
    deptNames.length,
    posNames.length
  );

  for (let i = 0; i < maxRefRows; i++) {
    guideRows.push([
      COMMON_EMPLOYEE_TYPES[i] || '',
      genderChoices[i] || '',
      statusChoices[i] || '',
      deptNames[i] || '',
      posNames[i] || '',
    ]);
  }

  const guideWs = XLSXStyle.utils.aoa_to_sheet(guideRows);
  guideWs['!cols'] = [
    { wch: 32 },
    { wch: 28 },
    { wch: 28 },
    { wch: 34 },
    { wch: 36 },
  ];

  if (guideWs['A1']) {
    guideWs['A1'].s = {
      font: { bold: true, sz: 13, color: { rgb: 'F97316' } },
    };
  }
  for (let c = 0; c < 5; c++) {
    const ref = `${XLSXStyle.utils.encode_col(c)}16`;
    if (guideWs[ref]) {
      guideWs[ref].s = {
        fill: { patternType: 'solid', fgColor: { rgb: 'FFEDD5' } },
        font: { bold: true, color: { rgb: '111827' } },
      };
    }
  }

  XLSXStyle.utils.book_append_sheet(workbook, guideWs, EMPLOYEE_IMPORT_GUIDE_SHEET_NAME);
  return workbook;
}

export function downloadEmployeeImportTemplate(
  activeDepartments: DepartmentRow[],
  activePositions: PositionRow[]
): void {
  const workbook = buildEmployeeImportTemplateWorkbook(activeDepartments, activePositions);
  XLSXStyle.writeFile(workbook, 'Template_Impor_Pegawai_Tamaki.xlsx');
}

function extractTextCellValue(
  cell: XLSX.CellObject | undefined,
  columnLabel: string,
  options: { preserveLeadingZerosNumericCheck?: boolean } = {}
): { value: string; error: string | null } {
  if (!cell || cell.t === 'z') {
    return { value: '', error: null };
  }

  if (cell.t === 'e') {
    return {
      value: '',
      error: `Kolom ${columnLabel} mengandung error sel Excel (${cell.w || cell.v || '#ERROR'}).`,
    };
  }

  if (cell.t === 's') {
    return { value: String(cell.v ?? '').trim(), error: null };
  }

  if (cell.t === 'n') {
    const numVal = Number(cell.v);
    const formatted = typeof cell.w === 'string' ? cell.w.trim() : '';
    const rawStr = String(cell.v ?? '');

    if (
      options.preserveLeadingZerosNumericCheck &&
      (Math.abs(numVal) > Number.MAX_SAFE_INTEGER ||
        rawStr.toLowerCase().includes('e') ||
        formatted.toLowerCase().includes('e+'))
    ) {
      return {
        value: formatted || rawStr,
        error: `Kolom ${columnLabel} terbaca sebagai angka/notasi ilmiah di Excel sehingga digit berisiko hilang atau berubah. Ubah format sel ke Teks (@).`,
      };
    }

    if (formatted && !formatted.toLowerCase().includes('e+')) {
      return { value: formatted, error: null };
    }

    return { value: rawStr.trim(), error: null };
  }

  if (cell.t === 'b') {
    return { value: cell.v ? 'TRUE' : 'FALSE', error: null };
  }

  if (cell.t === 'd' && cell.v instanceof Date) {
    return { value: cell.w ? cell.w.trim() : cell.v.toISOString(), error: null };
  }

  return { value: String(cell.v ?? '').trim(), error: null };
}

/**
 * Parses an ArrayBuffer of an uploaded .xlsx workbook and validates file/sheet/header integrity.
 */
export function parseEmployeeImportWorkbookBuffer(
  buffer: ArrayBuffer,
  fileSizeBytes: number
): ParsedEmployeeImportRawRow[] {
  if (fileSizeBytes <= 0) {
    throw new Error('File Excel kosong dan tidak memiliki isi.');
  }

  if (fileSizeBytes > EMPLOYEE_IMPORT_MAX_FILE_SIZE_BYTES) {
    throw new Error('Ukuran file melebihi batas maksimal 5 MB.');
  }

  const bytes = new Uint8Array(buffer);
  if (bytes.length < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b) {
    throw new Error('Format file tidak valid. Unggah file Excel (.xlsx) resmi yang valid.');
  }

  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(buffer, {
      type: 'array',
      cellDates: false,
      cellNF: true,
      cellFormula: false,
    });
  } catch {
    throw new Error('File Excel tidak dapat dibaca atau rusak. Pastikan menggunakan file .xlsx yang valid.');
  }

  const sheet = workbook.Sheets[EMPLOYEE_IMPORT_SHEET_NAME];
  if (!sheet) {
    throw new Error(
      `Sheet "${EMPLOYEE_IMPORT_SHEET_NAME}" tidak ditemukan. Gunakan template Excel resmi Tamaki.`
    );
  }

  const ref = sheet['!ref'];
  if (!ref) {
    throw new Error(`Sheet "${EMPLOYEE_IMPORT_SHEET_NAME}" kosong.`);
  }

  const range = XLSX.utils.decode_range(ref);

  // Verify exact 13 headers in fixed order on row 1 (index 0)
  for (let colIdx = 0; colIdx < EMPLOYEE_IMPORT_HEADERS.length; colIdx++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c: colIdx });
    const headerRes = extractTextCellValue(sheet[addr], `Header Kolom ${colIdx + 1}`);
    const actualHeader = headerRes.value.trim();
    const expectedHeader = EMPLOYEE_IMPORT_HEADERS[colIdx];
    if (actualHeader !== expectedHeader) {
      throw new Error(
        `Urutan atau nama header kolom ke-${colIdx + 1} tidak sesuai template resmi. Diharapkan "${expectedHeader}", ditemukan "${actualHeader || '(kosong)'}".`
      );
    }
  }

  // Ensure no unexpected non-empty extra headers beyond column 13
  for (let extraCol = EMPLOYEE_IMPORT_HEADERS.length; extraCol <= range.e.c; extraCol++) {
    const addr = XLSX.utils.encode_cell({ r: 0, c: extraCol });
    const extraRes = extractTextCellValue(sheet[addr], `Header Kolom ${extraCol + 1}`);
    if (extraRes.value.trim() !== '') {
      throw new Error(
        `Terdapat kolom tambahan "${extraRes.value}" di luar 13 kolom template resmi.`
      );
    }
  }

  const parsedRows: ParsedEmployeeImportRawRow[] = [];

  for (let r = 1; r <= range.e.r; r++) {
    const excelRowNumber = r + 1;
    const cellErrors: string[] = [];

    const readCol = (colIdx: number, preserveNumCheck = false): string => {
      const addr = XLSX.utils.encode_cell({ r, c: colIdx });
      const res = extractTextCellValue(sheet[addr], EMPLOYEE_IMPORT_HEADERS[colIdx], {
        preserveLeadingZerosNumericCheck: preserveNumCheck,
      });
      if (res.error) cellErrors.push(res.error);
      return res.value;
    };

    const fullName = readCol(0);
    const nip = readCol(1, true);
    const nik = readCol(2, true);
    const employeeNumber = readCol(3, true);
    const gender = readCol(4);
    const employeeType = readCol(5);
    const departmentName = readCol(6);
    const positionName = readCol(7);

    // Date cell reading (preserves native serial + format hint or string)
    const joinDateAddr = XLSX.utils.encode_cell({ r, c: 8 });
    const joinDateCell = sheet[joinDateAddr];
    let joinDateRaw: string | number | Date | null = null;
    let joinDateFormatHint: string | undefined;
    let joinDateDisplay = '';

    if (joinDateCell && joinDateCell.t !== 'z') {
      if (joinDateCell.t === 'e') {
        cellErrors.push('Kolom Tanggal Bergabung mengandung error sel Excel.');
      } else if (joinDateCell.t === 'n') {
        joinDateRaw = Number(joinDateCell.v);
        joinDateFormatHint = typeof joinDateCell.z === 'string' ? joinDateCell.z : undefined;
        joinDateDisplay = String(joinDateCell.w || joinDateCell.v || '').trim();
      } else if (joinDateCell.t === 'd' && joinDateCell.v instanceof Date) {
        joinDateRaw = joinDateCell.v;
        joinDateDisplay = joinDateCell.v.toISOString().split('T')[0];
      } else {
        const strVal = String(joinDateCell.v ?? '').trim();
        joinDateRaw = strVal || null;
        joinDateDisplay = strVal;
      }
    }

    const status = readCol(9);
    const phone = readCol(10, true);
    const email = readCol(11);
    const notes = readCol(12);

    // Ignore rows that are completely empty across all 13 columns
    const isCompletelyEmpty =
      !fullName &&
      !nip &&
      !nik &&
      !employeeNumber &&
      !gender &&
      !employeeType &&
      !departmentName &&
      !positionName &&
      !joinDateDisplay &&
      !status &&
      !phone &&
      !email &&
      !notes &&
      cellErrors.length === 0;

    if (isCompletelyEmpty) {
      continue;
    }

    parsedRows.push({
      excelRowNumber,
      fullName,
      nip,
      nik,
      employeeNumber,
      gender,
      employeeType,
      departmentName,
      positionName,
      joinDateRaw,
      joinDateFormatHint,
      status,
      phone,
      email,
      notes,
      cellErrors,
    });

    if (parsedRows.length > EMPLOYEE_IMPORT_MAX_ROWS) {
      throw new Error(
        `Jumlah baris data melebihi batas maksimal ${EMPLOYEE_IMPORT_MAX_ROWS} baris per file.`
      );
    }
  }

  if (parsedRows.length === 0) {
    throw new Error(`Tidak ada baris data pegawai yang diisi pada sheet "${EMPLOYEE_IMPORT_SHEET_NAME}".`);
  }

  return parsedRows;
}

/**
 * Validates parsed rows against business rules, workbook duplicates, database duplicates,
 * and active/inactive master data without creating or mutating any database records.
 */
export function validateEmployeeImportRows(
  parsedRows: ParsedEmployeeImportRawRow[],
  existingEmployees: ExistingEmployeeIdentityRecord[],
  departments: DepartmentRow[],
  positions: PositionRow[],
  fileName: string,
  fileSizeBytes: number
): WorkbookValidationSummary {
  const existingEmailSet = new Set<string>();
  const existingNipSet = new Set<string>();
  const existingNikSet = new Set<string>();
  const existingEmpNumSet = new Set<string>();

  for (const emp of existingEmployees) {
    if (emp.email && emp.email.trim()) {
      existingEmailSet.add(emp.email.trim().toLowerCase());
    }
    if (emp.nip && emp.nip.trim()) {
      existingNipSet.add(emp.nip.trim());
    }
    if (emp.nik && emp.nik.trim()) {
      existingNikSet.add(emp.nik.trim());
    }
    if (emp.employee_number && emp.employee_number.trim()) {
      existingEmpNumSet.add(emp.employee_number.trim());
    }
  }

  // Track occurrences across workbook to reject ALL rows involved in duplicate values
  const workbookEmailRows = new Map<string, number[]>();
  const workbookNipRows = new Map<string, number[]>();
  const workbookNikRows = new Map<string, number[]>();
  const workbookEmpNumRows = new Map<string, number[]>();

  for (const row of parsedRows) {
    const em = row.email.trim().toLowerCase();
    if (em) {
      const list = workbookEmailRows.get(em) || [];
      list.push(row.excelRowNumber);
      workbookEmailRows.set(em, list);
    }

    const nip = row.nip.trim();
    if (nip) {
      const list = workbookNipRows.get(nip) || [];
      list.push(row.excelRowNumber);
      workbookNipRows.set(nip, list);
    }

    const nik = row.nik.trim();
    if (nik) {
      const list = workbookNikRows.get(nik) || [];
      list.push(row.excelRowNumber);
      workbookNikRows.set(nik, list);
    }

    const empNum = row.employeeNumber.trim();
    if (empNum) {
      const list = workbookEmpNumRows.get(empNum) || [];
      list.push(row.excelRowNumber);
      workbookEmpNumRows.set(empNum, list);
    }
  }

  const departmentMap = new Map<string, DepartmentRow>();
  for (const dept of departments) {
    departmentMap.set(normalizeLookupName(dept.name), dept);
  }

  const positionMap = new Map<string, PositionRow>();
  for (const pos of positions) {
    positionMap.set(normalizeLookupName(pos.name), pos);
  }

  const validatedRows: ValidatedEmployeeImportRow[] = [];
  let validCount = 0;
  let warningCount = 0;
  let rejectedCount = 0;

  for (const row of parsedRows) {
    const errors: string[] = [...row.cellErrors];
    const warnings: string[] = [];

    const fullName = row.fullName.trim();
    if (!fullName) {
      errors.push('Nama Lengkap & Gelar wajib diisi.');
    } else if (fullName.length > 200) {
      errors.push('Nama Lengkap & Gelar maksimal 200 karakter.');
    }

    const email = row.email.trim().toLowerCase();
    if (!email) {
      errors.push('Alamat Email wajib diisi.');
    } else if (email.length > 255 || !EMAIL_REGEX.test(email)) {
      errors.push(`Format Alamat Email "${row.email.trim()}" tidak valid.`);
    } else {
      const dupRows = workbookEmailRows.get(email) || [];
      if (dupRows.length > 1) {
        const others = dupRows.filter((n) => n !== row.excelRowNumber);
        errors.push(`Email duplikat di dalam file Excel (baris ${others.join(', ')}).`);
      }
      if (existingEmailSet.has(email)) {
        errors.push('Alamat Email sudah terdaftar pada data pegawai di database.');
      }
    }

    const nip = normalizeNullableText(row.nip);
    if (nip) {
      const dupRows = workbookNipRows.get(nip) || [];
      if (dupRows.length > 1) {
        const others = dupRows.filter((n) => n !== row.excelRowNumber);
        errors.push(`NIP duplikat di dalam file Excel (baris ${others.join(', ')}).`);
      }
      if (existingNipSet.has(nip)) {
        errors.push('NIP sudah digunakan oleh pegawai di database.');
      }
    }

    const nik = normalizeNullableText(row.nik);
    if (nik) {
      const dupRows = workbookNikRows.get(nik) || [];
      if (dupRows.length > 1) {
        const others = dupRows.filter((n) => n !== row.excelRowNumber);
        errors.push(`NIK duplikat di dalam file Excel (baris ${others.join(', ')}).`);
      }
      if (existingNikSet.has(nik)) {
        errors.push('NIK sudah digunakan oleh pegawai di database.');
      }
    }

    const employeeNumber = normalizeNullableText(row.employeeNumber);
    if (employeeNumber) {
      const dupRows = workbookEmpNumRows.get(employeeNumber) || [];
      if (dupRows.length > 1) {
        const others = dupRows.filter((n) => n !== row.excelRowNumber);
        errors.push(`Nomor Pegawai duplikat di dalam file Excel (baris ${others.join(', ')}).`);
      }
      if (existingEmpNumSet.has(employeeNumber)) {
        errors.push('Nomor Pegawai sudah digunakan oleh pegawai di database.');
      }
    }

    const genderRes = normalizeGenderInput(row.gender);
    if (genderRes.error) errors.push(genderRes.error);

    const typeRes = normalizeOfficialEmployeeType(row.employeeType);
    if (typeRes.error) errors.push(typeRes.error);

    const statusRes = normalizeStatusInput(row.status);
    if (statusRes.error) errors.push(statusRes.error);

    const dateRes = parseAndValidateJoinDate(row.joinDateRaw, row.joinDateFormatHint);
    if (dateRes.error) errors.push(dateRes.error);

    // Master Data Mapping (Department & Position)
    let departmentId: string | null = null;
    let resolvedDepartmentName: string | null = null;
    const rawDeptName = normalizeNullableText(row.departmentName);
    if (rawDeptName) {
      const matchedDept = departmentMap.get(normalizeLookupName(rawDeptName));
      if (!matchedDept) {
        warnings.push(
          `Departemen "${rawDeptName}" tidak ditemukan di master data — akan disimpan sebagai NULL.`
        );
      } else if (!matchedDept.is_active) {
        warnings.push(
          `Departemen "${matchedDept.name}" berstatus nonaktif — akan disimpan sebagai NULL.`
        );
      } else {
        departmentId = matchedDept.id;
        resolvedDepartmentName = matchedDept.name;
      }
    }

    let positionId: string | null = null;
    let resolvedPositionName: string | null = null;
    const rawPosName = normalizeNullableText(row.positionName);
    if (rawPosName) {
      const matchedPos = positionMap.get(normalizeLookupName(rawPosName));
      if (!matchedPos) {
        warnings.push(
          `Jabatan "${rawPosName}" tidak ditemukan di master data — akan disimpan sebagai NULL.`
        );
      } else if (!matchedPos.is_active) {
        warnings.push(
          `Jabatan "${matchedPos.name}" berstatus nonaktif — akan disimpan sebagai NULL.`
        );
      } else {
        positionId = matchedPos.id;
        resolvedPositionName = matchedPos.name;
      }
    }

    const phone = normalizeNullableText(row.phone);
    const notes = normalizeNullableText(row.notes);

    const isRejected = errors.length > 0;
    const validationStatus = isRejected
      ? 'rejected'
      : warnings.length > 0
      ? 'warning'
      : 'valid';

    if (validationStatus === 'rejected') rejectedCount++;
    else if (validationStatus === 'warning') warningCount++;
    else validCount++;

    const normalized: NormalizedEmployeeImportPayload | null = isRejected
      ? null
      : {
          full_name: fullName,
          nip,
          nik,
          employee_number: employeeNumber,
          gender: genderRes.value,
          employee_type: typeRes.value!,
          department_id: departmentId,
          position_id: positionId,
          join_date: dateRes.value,
          status: statusRes.value,
          phone,
          email,
          notes,
          profile_id: null,
        };

    validatedRows.push({
      excelRowNumber: row.excelRowNumber,
      raw: row,
      normalized,
      validationStatus,
      errors,
      warnings,
      existsInAuth: false,
      resolvedDepartmentName,
      resolvedPositionName,
    });
  }

  return {
    fileName,
    fileSizeBytes,
    totalRows: validatedRows.length,
    validCount,
    warningCount,
    rejectedCount,
    importableCount: validCount + warningCount,
    authCheckStatus: 'idle',
    authCheckNotice: null,
    rows: validatedRows,
  };
}

/**
 * Pure helper to merge Auth email check results into a WorkbookValidationSummary.
 */
export function applyAuthEmailWarningsToSummary(
  summary: WorkbookValidationSummary,
  authResults: { email: string; existsInAuth: boolean }[],
  authCheckStatus: AuthCheckExecutionStatus,
  authCheckNotice: string | null = null
): WorkbookValidationSummary {
  const existsMap = new Map<string, boolean>();
  for (const item of authResults) {
    existsMap.set(item.email.trim().toLowerCase(), Boolean(item.existsInAuth));
  }

  let validCount = 0;
  let warningCount = 0;
  let rejectedCount = 0;

  const updatedRows = summary.rows.map((row) => {
    if (row.validationStatus === 'rejected' || !row.normalized) {
      rejectedCount++;
      return row;
    }

    const existsInAuth = Boolean(existsMap.get(row.normalized.email));
    const warnings = existsInAuth
      ? row.warnings.includes(AUTH_EXISTS_WARNING_MESSAGE)
        ? row.warnings
        : [...row.warnings, AUTH_EXISTS_WARNING_MESSAGE]
      : row.warnings;

    const validationStatus: ImportRowValidationStatus =
      warnings.length > 0 ? 'warning' : 'valid';
    if (validationStatus === 'warning') warningCount++;
    else validCount++;

    return {
      ...row,
      warnings,
      existsInAuth,
      validationStatus,
    };
  });

  return {
    ...summary,
    validCount,
    warningCount,
    rejectedCount,
    importableCount: validCount + warningCount,
    authCheckStatus,
    authCheckNotice,
    rows: updatedRows,
  };
}

/**
 * Pure partial-insert runner used for deterministic testing & consistent result aggregation.
 */
export async function processPartialInsertRows(
  rows: ValidatedEmployeeImportRow[],
  insertRowFn: (
    payload: NormalizedEmployeeImportPayload,
    row: ValidatedEmployeeImportRow
  ) => Promise<{ id?: string; error?: { code?: string; message?: string } }>
): Promise<BulkEmployeeImportSummaryResponse> {
  const results: EmployeeImportRowExecutionResult[] = [];
  let importedCleanCount = 0;
  let importedWithWarningCount = 0;
  let failedCount = 0;
  let skippedCount = 0;

  for (const row of rows) {
    if (row.validationStatus === 'rejected' || !row.normalized) {
        skippedCount++;
      results.push({
        excelRowNumber: row.excelRowNumber,
        fullName: row.raw.fullName.trim() || '(Tanpa Nama)',
        email: row.raw.email.trim().toLowerCase(),
        status: 'skipped',
        employeeId: null,
        employeeStatus: null,
        existsInAuth: row.existsInAuth,
        warnings: row.warnings,
        errorReason: row.errors.join(' '),
      });
      continue;
    }

    try {
      const res = await insertRowFn(row.normalized, row);
      if (res.error || !res.id) {
        failedCount++;
        results.push({
          excelRowNumber: row.excelRowNumber,
          fullName: row.normalized.full_name,
          email: row.normalized.email,
          status: 'failed',
          employeeId: null,
          employeeStatus: null,
          existsInAuth: row.existsInAuth,
          warnings: row.warnings,
          errorReason: mapDatabaseConstraintError(res.error?.code, res.error?.message),
        });
        continue;
      }

      if (row.warnings.length > 0) {
        importedWithWarningCount++;
        results.push({
          excelRowNumber: row.excelRowNumber,
          fullName: row.normalized.full_name,
          email: row.normalized.email,
          status: 'imported_with_warning',
          employeeId: res.id,
          employeeStatus: row.normalized.status,
          existsInAuth: row.existsInAuth,
          warnings: row.warnings,
          errorReason: null,
        });
      } else {
        importedCleanCount++;
        results.push({
          excelRowNumber: row.excelRowNumber,
          fullName: row.normalized.full_name,
          email: row.normalized.email,
          status: 'imported',
          employeeId: res.id,
          employeeStatus: row.normalized.status,
          existsInAuth: row.existsInAuth,
          warnings: [],
          errorReason: null,
        });
      }
    } catch (err: unknown) {
      failedCount++;
      const msg = err instanceof Error ? err.message : 'Gagal menyimpan baris data.';
      results.push({
        excelRowNumber: row.excelRowNumber,
        fullName: row.normalized.full_name,
        email: row.normalized.email,
        status: 'failed',
        employeeId: null,
        employeeStatus: null,
        existsInAuth: row.existsInAuth,
        warnings: row.warnings,
        errorReason: msg,
      });
    }
  }

  const importedCount = importedCleanCount + importedWithWarningCount;
  return {
    success: true,
    message:
      importedCount > 0
        ? `Impor selesai: ${importedCount} pegawai berhasil diimpor, ${failedCount} gagal, ${skippedCount} dilewati.`
        : 'Tidak ada data pegawai yang berhasil diimpor.',
    totalProcessed: rows.length,
    importedCount,
    importedCleanCount,
    importedWithWarningCount,
    failedCount,
    skippedCount,
    results,
  };
}

export function getBulkAccountStatusLabel(
  status: BulkAccountCreationItemStatus,
  retryable?: boolean
): string {
  if (status === 'failed') {
    return retryable === true ? 'Gagal (Bisa Ulang)' : 'Gagal (Perlu Periksa)';
  }

  const labels: Record<Exclude<BulkAccountCreationItemStatus, 'failed'>, string> = {
    created: 'Akun Dibuat & Dikaitkan (Wajib Ganti Password)',
    already_linked: 'Sudah Memiliki Akun Terhubung',
    auth_exists: 'Dilewati (Email Sudah Ada di Auth)',
    ineligible: 'Tidak Eligible',
    reconciliation_required: 'Perlu Rekonsiliasi Manual Admin',
  };

  return labels[status];
}

export function getBulkAccountStatusBadge(
  status: BulkAccountCreationItemStatus,
  retryable?: boolean
): { label: string; variant: 'success' | 'warning' | 'danger' | 'default' } {
  if (status === 'failed') {
    return {
      label: retryable === true ? 'Gagal (Bisa Ulang)' : 'Gagal (Perlu Periksa)',
      variant: 'danger',
    };
  }

  const badgeMap: Record<
    Exclude<BulkAccountCreationItemStatus, 'failed'>,
    { label: string; variant: 'success' | 'warning' | 'danger' | 'default' }
  > = {
    created: { label: 'Akun Dibuat & Dikaitkan', variant: 'success' },
    already_linked: { label: 'Sudah Tertaut', variant: 'default' },
    auth_exists: { label: 'Email Auth Sudah Ada', variant: 'warning' },
    ineligible: { label: 'Tidak Eligible', variant: 'default' },
    reconciliation_required: { label: 'Perlu Rekonsiliasi', variant: 'danger' },
  };

  return badgeMap[status];
}

export function deduplicateChunkErrorMessages(
  chunkErrors: BulkCreateAccountChunkError[]
): string[] {
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const item of chunkErrors) {
    const trimmed = (item.message || '').trim();
    if (trimmed && !seen.has(trimmed)) {
      seen.add(trimmed);
      unique.push(trimmed);
    }
  }
  return unique;
}

export class BulkAccountChunkHttpError extends Error {
  readonly httpStatus: number | null;
  readonly isPermanentStop: boolean;

  constructor(message: string, httpStatus: number | null) {
    super(message);
    this.name = 'BulkAccountChunkHttpError';
    this.httpStatus = httpStatus;
    this.isPermanentStop =
      httpStatus === 401 || httpStatus === 403 || httpStatus === 400;
  }
}

export function extractEdgeFunctionHttpStatus(error: unknown): number | null {
  if (!error || typeof error !== 'object') return null;
  const errObj = error as {
    status?: unknown;
    statusCode?: unknown;
    httpStatus?: unknown;
    context?: { status?: unknown };
  };

  if (typeof errObj.context?.status === 'number') {
    return errObj.context.status;
  }
  if (typeof errObj.httpStatus === 'number') {
    return errObj.httpStatus;
  }
  if (typeof errObj.status === 'number') {
    return errObj.status;
  }
  if (typeof errObj.statusCode === 'number') {
    return errObj.statusCode;
  }
  return null;
}

const SENSITIVE_OR_RAW_ERROR_PATTERNS = [
  /<(?:!doctype|html|head|body|script|style)\b/i,
  /\n\s*at\s+/,
  /\bBearer\s+[A-Za-z0-9\-._~+/]+=*/i,
  /\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/,
];

function isSafeClientErrorMessage(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const trimmed = value.trim();
  if (!trimmed) return false;
  return !SENSITIVE_OR_RAW_ERROR_PATTERNS.some((pattern) => pattern.test(trimmed));
}

/**
 * Extracts a safe, user-facing error message from supabase.functions.invoke responses/errors.
 * Clones Response context before reading body and never makes extra requests or leaks raw HTML/traces/tokens.
 */
export async function extractEdgeFunctionErrorMessage(
  data: unknown,
  error: unknown,
  fallbackMessage: string
): Promise<string> {
  if (data && typeof data === 'object' && 'message' in data) {
    const dataMessage = (data as { message?: unknown }).message;
    if (isSafeClientErrorMessage(dataMessage)) {
      return dataMessage.trim();
    }
  }

  if (error && typeof error === 'object') {
    const errObj = error as {
      name?: unknown;
      message?: unknown;
      context?: unknown;
    };
    const errName = typeof errObj.name === 'string' ? errObj.name : '';

    if (error instanceof FunctionsHttpError || errName === 'FunctionsHttpError') {
      const ctx = errObj.context;
      if (ctx && typeof ctx === 'object') {
        try {
          const responseLike = ctx as {
            clone?: () => { text?: () => Promise<string>; json?: () => Promise<unknown> };
            text?: () => Promise<string>;
            json?: () => Promise<unknown>;
          };
          const readable =
            typeof responseLike.clone === 'function' ? responseLike.clone() : responseLike;

          let parsed: unknown = null;
          if (typeof readable.text === 'function') {
            const rawText = await readable.text();
            if (rawText && rawText.trim().length > 0) {
              try {
                parsed = JSON.parse(rawText);
              } catch {
                parsed = null;
              }
            }
          } else if (typeof readable.json === 'function') {
            parsed = await readable.json();
          }

          if (parsed && typeof parsed === 'object' && 'message' in parsed) {
            const ctxMsg = (parsed as { message?: unknown }).message;
            if (isSafeClientErrorMessage(ctxMsg)) {
              return ctxMsg.trim();
            }
          }
        } catch {
          // Ignore malformed or unreadable body; fall through to safe fallback
        }
      }
    }

    if (error instanceof FunctionsFetchError || errName === 'FunctionsFetchError') {
      return 'Gagal terhubung ke layanan Edge Function (gangguan jaringan atau fungsi belum tersedia).';
    }

    if (error instanceof FunctionsRelayError || errName === 'FunctionsRelayError') {
      return 'Layanan relay Edge Function mengalami gangguan saat meneruskan permintaan.';
    }

    if (isSafeClientErrorMessage(errObj.message)) {
      return errObj.message.trim();
    }
  } else if (isSafeClientErrorMessage(error)) {
    return error.trim();
  }

  return fallbackMessage;
}

const GENERIC_NON_2XX_SDK_MESSAGE = 'Edge Function returned a non-2xx status code';

async function resolveChunkHttpErrorDetails(
  httpStatus: number | null,
  data: unknown,
  error: unknown
): Promise<{
  message: string;
  httpStatus: number | null;
  isPermanentStop: boolean;
}> {
  if (httpStatus === 401) {
    return {
      httpStatus: 401,
      isPermanentStop: true,
      message:
        'Sesi login Anda tidak valid atau telah kedaluwarsa. Silakan login ulang sebelum melanjutkan.',
    };
  }

  if (httpStatus === 403) {
    return {
      httpStatus: 403,
      isPermanentStop: true,
      message:
        'Akses ditolak: akun Anda tidak memiliki izin Admin atau Super Admin untuk membuat akun pegawai massal.',
    };
  }

  if (httpStatus === 400) {
    const extracted = await extractEdgeFunctionErrorMessage(
      data,
      error,
      'Permintaan ditolak oleh validasi server. Periksa kembali daftar pegawai dan kata sandi awal.'
    );
    const safeMsg =
      extracted === GENERIC_NON_2XX_SDK_MESSAGE
        ? 'Validasi permintaan ditolak oleh server. Periksa kembali daftar pegawai dan kata sandi awal.'
        : extracted;
    return {
      httpStatus: 400,
      isPermanentStop: true,
      message: safeMsg,
    };
  }

  const extracted = await extractEdgeFunctionErrorMessage(
    data,
    error,
    'Gagal menjalankan Edge Function bulk-create-employee-accounts.'
  );
  return {
    httpStatus,
    isPermanentStop: false,
    message: extracted,
  };
}

export async function parseBulkAccountChunkInvokeResult(
  data: unknown,
  error: unknown
): Promise<BulkCreateEmployeeAccountsChunkResponse> {
  if (error) {
    const httpStatus = extractEdgeFunctionHttpStatus(error);
    const details = await resolveChunkHttpErrorDetails(httpStatus, data, error);
    throw new BulkAccountChunkHttpError(details.message, details.httpStatus);
  }

  const serverRes = data as BulkCreateEmployeeAccountsChunkResponse | null;
  if (!serverRes || typeof serverRes !== 'object' || !serverRes.success) {
    throw new Error(
      serverRes?.message || 'Respons dari server pembuatan akun tidak valid.'
    );
  }

  return serverRes;
}

/**
 * Determines whether a bulk account execution or retry actually produced at least 1 new account.
 */
export function hasNewlyCreatedAccounts(
  previousCreatedCount: number,
  nextCreatedCount: number
): boolean {
  return nextCreatedCount > previousCreatedCount;
}

/**
 * Validates batch initial password using the same minimum rules as SecurityPage.
 */
export function validateBatchInitialPassword(
  password: string,
  confirmPassword: string
): string | null {
  if (!password) {
    return 'Kata sandi awal wajib diisi.';
  }
  if (password.trim().length === 0) {
    return 'Kata sandi awal tidak boleh hanya berisi spasi.';
  }
  if (password.length < 6) {
    return 'Kata sandi awal minimal 6 karakter.';
  }
  if (password.length > 128) {
    return 'Kata sandi awal maksimal 128 karakter.';
  }
  if (password !== confirmPassword) {
    return 'Konfirmasi kata sandi awal tidak cocok.';
  }
  return null;
}

/**
 * Builds candidate selection rows from import execution results.
 * Auto-selects ONLY active, successfully imported rows whose email does NOT exist in Auth.
 */
export function buildEmployeeAccountCandidates(
  importSummary: BulkEmployeeImportSummaryResponse
): EmployeeAccountCandidate[] {
  return importSummary.results.map((row) => {
    const isImportedSuccess =
      (row.status === 'imported' || row.status === 'imported_with_warning') &&
      Boolean(row.employeeId);
    const existsInAuth =
      Boolean(row.existsInAuth) || row.warnings.includes(AUTH_EXISTS_WARNING_MESSAGE);
    const employeeStatus = row.employeeStatus ?? null;
    const normalizedEmail = (row.email || '').trim().toLowerCase();

    let eligible = false;
    let ineligibleReason: string | null = null;

    if (!isImportedSuccess) {
      ineligibleReason =
        row.status === 'skipped'
          ? row.errorReason || 'Baris ditolak pada tahap validasi.'
          : row.errorReason || 'Pegawai gagal disimpan ke database.';
    } else if (existsInAuth) {
      ineligibleReason =
        'Email sudah terdaftar di Supabase Auth (tidak dibuat otomatis; kaitkan manual bila perlu).';
    } else if (employeeStatus === 'inactive') {
      ineligibleReason = 'Pegawai berstatus Tidak Aktif.';
    } else if (employeeStatus !== 'active') {
      ineligibleReason = 'Status keaktifan pegawai tidak terverifikasi aktif.';
    } else if (!normalizedEmail || !EMAIL_REGEX.test(normalizedEmail)) {
      ineligibleReason = 'Alamat email pegawai tidak valid.';
    } else {
      eligible = true;
    }

    return {
      excelRowNumber: row.excelRowNumber,
      employeeId: row.employeeId,
      fullName: row.fullName,
      email: normalizedEmail,
      importStatus: row.status,
      employeeStatus,
      existsInAuth,
      eligible,
      ineligibleReason,
      selected: eligible,
    };
  });
}

/**
 * Splits unique employee IDs into sequential chunks of 15–20 items (default 20).
 */
export function chunkEmployeeIds(
  employeeIds: string[],
  chunkSize = BULK_ACCOUNT_CHUNK_SIZE
): string[][] {
  const safeSize = Math.max(1, Math.min(20, Math.floor(chunkSize)));
  const uniqueIds: string[] = [];
  const seen = new Set<string>();

  for (const id of employeeIds) {
    const clean = id.trim();
    if (clean && !seen.has(clean)) {
      seen.add(clean);
      uniqueIds.push(clean);
    }
  }

  const chunks: string[][] = [];
  for (let i = 0; i < uniqueIds.length; i += safeSize) {
    chunks.push(uniqueIds.slice(i, i + safeSize));
  }
  return chunks;
}

/**
 * Aggregates chunk results by employeeId while preserving already-completed non-retryable items.
 */
export function aggregateBulkAccountResults(
  existing: BulkCreateAccountsAggregatedSummary | null,
  chunkResults: BulkCreateEmployeeAccountRowResult[],
  completedChunks: number,
  totalChunks: number,
  chunkError?: BulkCreateAccountChunkError | null
): BulkCreateAccountsAggregatedSummary {
  const nextMap: Record<string, BulkCreateEmployeeAccountRowResult> = {
    ...(existing?.resultsByEmployeeId || {}),
  };

  for (const item of chunkResults) {
    const prev = nextMap[item.employeeId];
    // Never overwrite a previously settled non-retryable outcome
    if (prev && !prev.retryable) {
      continue;
    }
    nextMap[item.employeeId] = item;
  }

  const allItems = Object.values(nextMap);
  const createdCount = allItems.filter((r) => r.status === 'created').length;
  const alreadyLinkedCount = allItems.filter((r) => r.status === 'already_linked').length;
  const authExistsCount = allItems.filter((r) => r.status === 'auth_exists').length;
  const ineligibleCount = allItems.filter((r) => r.status === 'ineligible').length;
  const failedCount = allItems.filter((r) => r.status === 'failed').length;
  const reconciliationRequiredCount = allItems.filter(
    (r) => r.status === 'reconciliation_required'
  ).length;

  const chunkErrors = [...(existing?.chunkErrors || [])];
  if (chunkError) {
    chunkErrors.push(chunkError);
  }

  return {
    totalAttempted: allItems.length,
    createdCount,
    alreadyLinkedCount,
    authExistsCount,
    ineligibleCount,
    failedCount,
    reconciliationRequiredCount,
    completedChunks,
    totalChunks,
    chunkErrors,
    resultsByEmployeeId: nextMap,
  };
}

/**
 * Returns ONLY employee IDs that failed safely and are eligible for retry.
 * Excludes created, already_linked, auth_exists, ineligible, and reconciliation_required.
 */
export function getRetryableEmployeeIds(
  summary: BulkCreateAccountsAggregatedSummary | null
): string[] {
  if (!summary) return [];
  return Object.values(summary.resultsByEmployeeId)
    .filter(
      (item) =>
        item.status === 'failed' &&
        item.retryable === true &&
        item.needsReconciliation === false
    )
    .map((item) => item.employeeId);
}

/**
 * Executes bulk account creation sequentially in chunks, preserving successful chunks
 * even if a subsequent chunk fails.
 */
export async function executeBulkAccountCreationInChunks(
  targets: { employeeId: string; fullName: string; email: string }[],
  password: string,
  invokeChunkFn: (
    employeeIds: string[],
    password: string
  ) => Promise<BulkCreateEmployeeAccountsChunkResponse>,
  options?: {
    chunkSize?: number;
    initialSummary?: BulkCreateAccountsAggregatedSummary | null;
    onChunkProgress?: (summary: BulkCreateAccountsAggregatedSummary) => void;
  }
): Promise<BulkCreateAccountsAggregatedSummary> {
  const targetMap = new Map<string, { employeeId: string; fullName: string; email: string }>();
  for (const t of targets) {
    if (t.employeeId && !targetMap.has(t.employeeId)) {
      targetMap.set(t.employeeId, t);
    }
  }

  const existingSummary = options?.initialSummary || null;
  // Filter out any already settled non-retryable targets to prevent duplicate attempts
  const runnableIds = Array.from(targetMap.keys()).filter((id) => {
    const prev = existingSummary?.resultsByEmployeeId[id];
    return !prev || prev.retryable;
  });

  const chunks = chunkEmployeeIds(runnableIds, options?.chunkSize ?? BULK_ACCOUNT_CHUNK_SIZE);
  const totalChunks = chunks.length;

  let summary: BulkCreateAccountsAggregatedSummary = existingSummary
    ? {
        ...existingSummary,
        completedChunks: 0,
        totalChunks,
        chunkErrors: [],
      }
    : aggregateBulkAccountResults(null, [], 0, totalChunks, null);

  for (let i = 0; i < chunks.length; i++) {
    const chunkIds = chunks[i];
    try {
      const response = await invokeChunkFn(chunkIds, password);
      if (!response || !response.success || !Array.isArray(response.results)) {
        const msg =
          response?.message || 'Respons pembuatan akun massal dari server tidak valid.';
        const fallbackFailures: BulkCreateEmployeeAccountRowResult[] = chunkIds.map((id) => {
          const info = targetMap.get(id);
          return {
            employeeId: id,
            fullName: info?.fullName || '(Pegawai)',
            email: info?.email || '',
            status: 'failed',
            profileId: null,
            retryable: true,
            needsReconciliation: false,
            message: msg,
          };
        });
        summary = aggregateBulkAccountResults(summary, fallbackFailures, i + 1, totalChunks, {
          chunkIndex: i + 1,
          employeeIds: chunkIds,
          message: msg,
        });
      } else {
        // Ensure every requested ID in this chunk has a deterministic result
        const returnedIds = new Set(response.results.map((r) => r.employeeId));
        const normalizedChunkResults = [...response.results];
        for (const id of chunkIds) {
          if (!returnedIds.has(id)) {
            const info = targetMap.get(id);
            normalizedChunkResults.push({
              employeeId: id,
              fullName: info?.fullName || '(Pegawai)',
              email: info?.email || '',
              status: 'failed',
              profileId: null,
              retryable: true,
              needsReconciliation: false,
              message: 'Server tidak mengembalikan status untuk pegawai ini.',
            });
          }
        }

        summary = aggregateBulkAccountResults(
          summary,
          normalizedChunkResults,
          i + 1,
          totalChunks,
          null
        );
      }
    } catch (err: unknown) {
      const httpStatus =
        err instanceof BulkAccountChunkHttpError
          ? err.httpStatus
          : extractEdgeFunctionHttpStatus(err);
      const isPermanentStop =
        httpStatus === 401 || httpStatus === 403 || httpStatus === 400;

      const msg =
        err instanceof BulkAccountChunkHttpError
          ? err.message
          : (
              await resolveChunkHttpErrorDetails(
                httpStatus,
                null,
                err instanceof Error
                  ? err
                  : 'Gagal menghubungi server pembuatan akun untuk batch ini.'
              )
            ).message;

      const syntheticFailures: BulkCreateEmployeeAccountRowResult[] = chunkIds.map((id) => {
        const info = targetMap.get(id);
        return {
          employeeId: id,
          fullName: info?.fullName || '(Pegawai)',
          email: info?.email || '',
          status: 'failed',
          profileId: null,
          retryable: !isPermanentStop,
          needsReconciliation: false,
          message: msg,
        };
      });
      summary = aggregateBulkAccountResults(summary, syntheticFailures, i + 1, totalChunks, {
        chunkIndex: i + 1,
        employeeIds: chunkIds,
        message: msg,
      });

      options?.onChunkProgress?.(summary);

      if (isPermanentStop) {
        break;
      }
      continue;
    }

    options?.onChunkProgress?.(summary);
  }

  return summary;
}

const mergedRowRetryableMap = new WeakMap<EmployeeImportRowExecutionResult, boolean>();

/**
 * Merges account creation execution summary into import execution rows for unified reporting/export.
 */
export function mergeAccountResultsIntoImportSummary(
  importResults: EmployeeImportRowExecutionResult[],
  accountSummary: BulkCreateAccountsAggregatedSummary | null
): EmployeeImportRowExecutionResult[] {
  if (!accountSummary) return importResults;

  return importResults.map((row) => {
    const accountRes = row.employeeId
      ? accountSummary.resultsByEmployeeId[row.employeeId]
      : undefined;

    if (!accountRes) {
      return row;
    }

    const mergedRow: EmployeeImportRowExecutionResult = {
      ...row,
      accountCreationStatus: accountRes.status,
      accountCreationMessage: accountRes.message,
    };
    mergedRowRetryableMap.set(mergedRow, accountRes.retryable);
    return mergedRow;
  });
}

export function buildImportResultReportRows(
  results: EmployeeImportRowExecutionResult[],
  accountSummary?: BulkCreateAccountsAggregatedSummary | null
): Record<string, string | number>[] {
  const statusLabels: Record<EmployeeImportRowExecutionResult['status'], string> = {
    imported: 'Berhasil',
    imported_with_warning: 'Berhasil (Dengan Peringatan)',
    failed: 'Gagal',
    skipped: 'Ditolak Validasi',
  };

  const hasAccountResults =
    Boolean(accountSummary && Object.keys(accountSummary.resultsByEmployeeId).length > 0) ||
    results.some(
      (r) => r.accountCreationStatus !== undefined && r.accountCreationStatus !== null
    );

  return results.map((r) => {
    const baseRow: Record<string, string | number> = {
      'Baris Excel': r.excelRowNumber,
      'Nama Pegawai': sanitizeSpreadsheetCellForExport(r.fullName),
      'Email': sanitizeSpreadsheetCellForExport(r.email),
      'Status Impor': statusLabels[r.status],
      'Peringatan': sanitizeSpreadsheetCellForExport(r.warnings.join('; ')),
      'Alasan Penolakan / Kegagalan': sanitizeSpreadsheetCellForExport(r.errorReason || ''),
    };

    if (hasAccountResults) {
      const summaryAcc =
        accountSummary && r.employeeId
          ? accountSummary.resultsByEmployeeId[r.employeeId]
          : undefined;
      const effectiveStatus = summaryAcc?.status ?? r.accountCreationStatus ?? null;
      const effectiveRetryable = summaryAcc
        ? summaryAcc.retryable
        : mergedRowRetryableMap.get(r);

      baseRow['Status Pembuatan Akun'] = effectiveStatus
        ? getBulkAccountStatusLabel(effectiveStatus, effectiveRetryable)
        : 'Tidak Dipilih / Tidak Diproses';
      baseRow['Keterangan Akun'] = sanitizeSpreadsheetCellForExport(
        summaryAcc?.message ?? r.accountCreationMessage ?? ''
      );
    }

    return baseRow;
  });
}

/**
 * Exports import preview or final execution result to Excel with formula-injection protection.
 */
export function exportImportResultReport(
  results: EmployeeImportRowExecutionResult[],
  sourceFileName: string,
  accountSummary?: BulkCreateAccountsAggregatedSummary | null
): void {
  const hasAccountResults =
    Boolean(accountSummary && Object.keys(accountSummary.resultsByEmployeeId).length > 0) ||
    results.some(
      (r) => r.accountCreationStatus !== undefined && r.accountCreationStatus !== null
    );

  const rows = buildImportResultReportRows(results, accountSummary);

  const worksheet = XLSXStyle.utils.json_to_sheet(rows);
  worksheet['!cols'] = hasAccountResults
    ? [
        { wch: 12 },
        { wch: 28 },
        { wch: 30 },
        { wch: 26 },
        { wch: 40 },
        { wch: 40 },
        { wch: 36 },
        { wch: 48 },
      ]
    : [
        { wch: 12 },
        { wch: 28 },
        { wch: 30 },
        { wch: 26 },
        { wch: 44 },
        { wch: 48 },
      ];

  const workbook = XLSXStyle.utils.book_new();
  XLSXStyle.utils.book_append_sheet(workbook, worksheet, 'Hasil_Impor_Pegawai');

  const safeBase = sourceFileName.replace(/\.xlsx$/i, '').replace(/[^a-zA-Z0-9_-]/g, '_');
  XLSXStyle.writeFile(workbook, `Laporan_Hasil_Impor_${safeBase || 'Pegawai'}.xlsx`);
}

class EmployeeImportService {
  async fetchExistingEmployeeIdentities(): Promise<ExistingEmployeeIdentityRecord[]> {
    if (!isSupabaseConfigured()) return [];

    const { data, error } = await supabase
      .from('employees')
      .select('email, nip, nik, employee_number');

    if (error) {
      throw new Error('Gagal memuat data identitas pegawai yang sudah terdaftar.');
    }

    return (data || []) as ExistingEmployeeIdentityRecord[];
  }

  async checkAuthEmailsExist(emails: string[]): Promise<{
    status: AuthCheckExecutionStatus;
    results: { email: string; existsInAuth: boolean }[];
    notice: string | null;
  }> {
    if (!isSupabaseConfigured() || emails.length === 0) {
      return { status: 'checked', results: [], notice: null };
    }

    try {
      const { data, error } = await supabase.functions.invoke('check-employee-auth-emails', {
        body: { emails },
      });

      if (error || !data || typeof data !== 'object' || !(data as AuthEmailCheckResponse).success) {
        const msg =
          (data as { message?: string } | null)?.message ||
          error?.message ||
          'Edge Function check-employee-auth-emails belum tersedia atau gagal merespons.';
        return {
          status: 'unavailable',
          results: [],
          notice: `Pemeriksaan akun Supabase Auth tidak dapat dijalankan (${msg}). Pegawai tetap dapat divalidasi dan diimpor tanpa mengaitkan akun otomatis.`,
        };
      }

      return {
        status: 'checked',
        results: (data as AuthEmailCheckResponse).results || [],
        notice: null,
      };
    } catch {
      return {
        status: 'unavailable',
        results: [],
        notice:
          'Pemeriksaan email Supabase Auth tidak dapat dihubungi saat ini (pastikan Edge Function check-employee-auth-emails telah di-deploy).',
      };
    }
  }

  async parseAndValidateUploadedFile(
    file: File,
    departments: DepartmentRow[],
    positions: PositionRow[]
  ): Promise<WorkbookValidationSummary> {
    if (!file.name.toLowerCase().endsWith('.xlsx')) {
      throw new Error('Hanya file Excel berformat .xlsx yang diperbolehkan.');
    }

    if (file.size <= 0) {
      throw new Error('File yang diunggah kosong.');
    }

    if (file.size > EMPLOYEE_IMPORT_MAX_FILE_SIZE_BYTES) {
      throw new Error('Ukuran file melebihi batas maksimal 5 MB.');
    }

    const buffer = await file.arrayBuffer();
    const parsedRows = parseEmployeeImportWorkbookBuffer(buffer, file.size);
    const existingEmployees = await this.fetchExistingEmployeeIdentities();

    const baseSummary = validateEmployeeImportRows(
      parsedRows,
      existingEmployees,
      departments,
      positions,
      file.name,
      file.size
    );

    const candidateEmails = Array.from(
      new Set(
        baseSummary.rows
          .filter((r) => r.validationStatus !== 'rejected' && r.normalized?.email)
          .map((r) => r.normalized!.email)
      )
    );

    if (candidateEmails.length === 0) {
      return {
        ...baseSummary,
        authCheckStatus: 'checked',
        authCheckNotice: null,
      };
    }

    const authCheck = await this.checkAuthEmailsExist(candidateEmails);
    return applyAuthEmailWarningsToSummary(
      baseSummary,
      authCheck.results,
      authCheck.status,
      authCheck.notice
    );
  }

  async executePartialImport(
    summary: WorkbookValidationSummary
  ): Promise<BulkEmployeeImportSummaryResponse> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase belum dikonfigurasi.');
    }

    const importableRows = summary.rows.filter(
      (r) => r.validationStatus !== 'rejected' && r.normalized !== null
    );
    const skippedRows = summary.rows.filter(
      (r) => r.validationStatus === 'rejected' || r.normalized === null
    );

    if (importableRows.length === 0) {
      throw new Error('Tidak ada baris valid untuk diimpor.');
    }

    const payloadRows: EmployeeImportServerRowInput[] = importableRows.map((row) => ({
      excelRowNumber: row.excelRowNumber,
      full_name: row.normalized!.full_name,
      nip: row.normalized!.nip,
      nik: row.normalized!.nik,
      employee_number: row.normalized!.employee_number,
      gender: row.normalized!.gender,
      employee_type: row.normalized!.employee_type,
      department_name: row.raw.departmentName.trim() || null,
      position_name: row.raw.positionName.trim() || null,
      join_date: row.normalized!.join_date,
      status: row.normalized!.status,
      phone: row.normalized!.phone,
      email: row.normalized!.email,
      notes: row.normalized!.notes,
    }));

    const { data, error } = await supabase.functions.invoke('import-employees', {
      body: {
        fileName: summary.fileName,
        rows: payloadRows,
      },
    });

    if (error) {
      const errMsg = await extractEdgeFunctionErrorMessage(
        data,
        error,
        'Gagal menjalankan Edge Function import-employees.'
      );
      throw new Error(errMsg);
    }

    const serverRes = data as BulkEmployeeImportSummaryResponse | null;
    if (!serverRes || typeof serverRes !== 'object' || !serverRes.success) {
      throw new Error(
        serverRes?.message || 'Respons dari server impor tidak valid.'
      );
    }

    // Merge server execution results with pre-validation skipped rows and Auth warnings
    const authWarningMap = new Map<number, boolean>();
    const rowStatusMap = new Map<number, 'active' | 'inactive'>();
    for (const r of importableRows) {
      if (r.existsInAuth) authWarningMap.set(r.excelRowNumber, true);
      if (r.normalized?.status) rowStatusMap.set(r.excelRowNumber, r.normalized.status);
    }

    const mergedResults: EmployeeImportRowExecutionResult[] = [
      ...serverRes.results.map((r) => {
        const hasAuthWarning = authWarningMap.get(r.excelRowNumber) ?? false;
        const warnings =
          hasAuthWarning && !r.warnings.includes(AUTH_EXISTS_WARNING_MESSAGE)
            ? [...r.warnings, AUTH_EXISTS_WARNING_MESSAGE]
            : r.warnings;

        const nextStatus =
          r.status === 'imported' && warnings.length > 0
            ? 'imported_with_warning'
            : r.status;

        const resolvedEmployeeStatus =
          r.employeeStatus !== undefined
            ? r.employeeStatus
            : nextStatus === 'imported' || nextStatus === 'imported_with_warning'
            ? rowStatusMap.get(r.excelRowNumber) ?? null
            : null;

        return {
          ...r,
          status: nextStatus,
          employeeStatus: resolvedEmployeeStatus,
          existsInAuth: hasAuthWarning,
          warnings,
        };
      }),
      ...skippedRows.map((r) => ({
        excelRowNumber: r.excelRowNumber,
        fullName: r.raw.fullName.trim() || '(Tanpa Nama)',
        email: r.raw.email.trim().toLowerCase(),
        status: 'skipped' as const,
        employeeId: null,
        employeeStatus: null,
        existsInAuth: r.existsInAuth,
        warnings: r.warnings,
        errorReason: r.errors.join(' '),
      })),
    ].sort((a, b) => a.excelRowNumber - b.excelRowNumber);

    const importedCleanCount = mergedResults.filter((r) => r.status === 'imported').length;
    const importedWithWarningCount = mergedResults.filter(
      (r) => r.status === 'imported_with_warning'
    ).length;
    const failedCount = mergedResults.filter((r) => r.status === 'failed').length;
    const skippedCount = mergedResults.filter((r) => r.status === 'skipped').length;
    const importedCount = importedCleanCount + importedWithWarningCount;

    return {
      success: true,
      message: `Impor selesai: ${importedCount} pegawai berhasil diimpor, ${failedCount} gagal, ${skippedCount} ditolak validasi.`,
      totalProcessed: mergedResults.length,
      importedCount,
      importedCleanCount,
      importedWithWarningCount,
      failedCount,
      skippedCount,
      authCheckStatus: summary.authCheckStatus,
      results: mergedResults,
    };
  }

  async bulkCreateEmployeeAccountsChunk(
    employeeIds: string[],
    password: string
  ): Promise<BulkCreateEmployeeAccountsChunkResponse> {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase belum dikonfigurasi.');
    }

    const { data, error } = await supabase.functions.invoke(
      'bulk-create-employee-accounts',
      {
        body: {
          employeeIds,
          password,
        },
      }
    );

    return parseBulkAccountChunkInvokeResult(data, error);
  }

  async executeBulkAccountCreation(
    targets: { employeeId: string; fullName: string; email: string }[],
    password: string,
    options?: {
      chunkSize?: number;
      initialSummary?: BulkCreateAccountsAggregatedSummary | null;
      onChunkProgress?: (summary: BulkCreateAccountsAggregatedSummary) => void;
    }
  ): Promise<BulkCreateAccountsAggregatedSummary> {
    return executeBulkAccountCreationInChunks(
      targets,
      password,
      (chunkIds, pwd) => this.bulkCreateEmployeeAccountsChunk(chunkIds, pwd),
      options
    );
  }
}

export const employeeImportService = new EmployeeImportService();
