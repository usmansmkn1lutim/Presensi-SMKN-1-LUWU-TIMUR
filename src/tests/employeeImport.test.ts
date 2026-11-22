import * as XLSX from 'xlsx';
import XLSXStyle from 'xlsx-js-style';
import { DepartmentRow, PositionRow } from '../types/database.types';
import { COMMON_EMPLOYEE_TYPES } from '../types/employee';
import {
  EMPLOYEE_IMPORT_GUIDE_SHEET_NAME,
  EMPLOYEE_IMPORT_HEADERS,
  EMPLOYEE_IMPORT_MAX_FILE_SIZE_BYTES,
  EMPLOYEE_IMPORT_MAX_ROWS,
  EMPLOYEE_IMPORT_SHEET_NAME,
  ParsedEmployeeImportRawRow,
} from '../types/employeeImport.types';
import {
  AUTH_EXISTS_WARNING_MESSAGE,
  applyAuthEmailWarningsToSummary,
  buildEmployeeImportTemplateWorkbook,
  ExistingEmployeeIdentityRecord,
  mapDatabaseConstraintError,
  normalizeGenderInput,
  normalizeOfficialEmployeeType,
  normalizeStatusInput,
  parseAndValidateJoinDate,
  parseEmployeeImportWorkbookBuffer,
  processPartialInsertRows,
  sanitizeSpreadsheetCellForExport,
  validateEmployeeImportRows,
} from '../services/employeeImportService';

let passedTests = 0;
let failedTests = 0;

function test(name: string, fn: () => void | Promise<void>): Promise<void> {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      passedTests++;
      console.log(`✅ [PASS] ${name}`);
    })
    .catch((err: unknown) => {
      failedTests++;
      const message = err instanceof Error ? err.message : String(err);
      console.error(`❌ [FAIL] ${name}\n   -> ${message}`);
    });
}

function assertEqual<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new Error(
      `${message || 'Assertion failed'}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
  }
}

function assertDeepEqual<T>(actual: T, expected: T, message?: string): void {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a !== e) {
    throw new Error(`${message || 'Deep assertion failed'}: expected ${e}, got ${a}`);
  }
}

function assertTrue(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(message);
  }
}

function assertThrows(fn: () => unknown, expectedMessageSubstring: string, message?: string): void {
  let threw = false;
  try {
    fn();
  } catch (err: unknown) {
    threw = true;
    const msg = err instanceof Error ? err.message : String(err);
    if (!msg.includes(expectedMessageSubstring)) {
      throw new Error(
        `${message || 'Unexpected error message'}: expected substring "${expectedMessageSubstring}", got "${msg}"`
      );
    }
  }
  if (!threw) {
    throw new Error(message || `Expected function to throw containing "${expectedMessageSubstring}"`);
  }
}

const SAMPLE_DEPARTMENTS: DepartmentRow[] = [
  {
    id: 'dept-rpl-uuid',
    name: 'Rekayasa Perangkat Lunak',
    description: null,
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'dept-old-uuid',
    name: 'Unit Lama Nonaktif',
    description: null,
    is_active: false,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
];

const SAMPLE_POSITIONS: PositionRow[] = [
  {
    id: 'pos-guru-uuid',
    name: 'Guru Produktif',
    description: null,
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
  {
    id: 'pos-old-uuid',
    name: 'Jabatan Lama Nonaktif',
    description: null,
    is_active: false,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
];

function createWorkbookBufferFromRows(
  rows: Array<Array<string | number | Date | null>>,
  headers: string[] = Array.from(EMPLOYEE_IMPORT_HEADERS),
  sheetName: string = EMPLOYEE_IMPORT_SHEET_NAME
): ArrayBuffer {
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  const u8 = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;
  return u8;
}

function makeRawRow(
  excelRowNumber: number,
  overrides: Partial<ParsedEmployeeImportRawRow> = {}
): ParsedEmployeeImportRawRow {
  return {
    excelRowNumber,
    fullName: 'Budi Santoso, S.Pd.',
    nip: '',
    nik: '',
    employeeNumber: '',
    gender: '',
    employeeType: 'PNS',
    departmentName: '',
    positionName: '',
    joinDateRaw: null,
    status: '',
    phone: '',
    email: `budi.${excelRowNumber}@sekolah.sch.id`,
    notes: '',
    cellErrors: [],
    ...overrides,
  };
}

async function runTests() {
  console.log('\n======================================================');
  console.log('PENGUJIAN FITUR IMPOR MASSAL PEGAWAI EXCEL — TAMAKI');
  console.log('======================================================\n');

  // 1. Pembuatan & Verifikasi Struktur Template Resmi 13 Kolom + Penolakan File/Header Tidak Valid
  await test('1. Template resmi memiliki tepat 13 kolom berurutan, 2 sheet, format teks @, dan menolak file/header rusak', () => {
    const wb = buildEmployeeImportTemplateWorkbook(SAMPLE_DEPARTMENTS, SAMPLE_POSITIONS);
    assertDeepEqual(
      wb.SheetNames,
      [EMPLOYEE_IMPORT_SHEET_NAME, EMPLOYEE_IMPORT_GUIDE_SHEET_NAME],
      'Nama sheet template harus sesuai kontrak'
    );

    const templateWs = wb.Sheets[EMPLOYEE_IMPORT_SHEET_NAME];
    assertEqual(EMPLOYEE_IMPORT_HEADERS.length, 13, 'Jumlah kolom header harus tepat 13');
    for (let i = 0; i < EMPLOYEE_IMPORT_HEADERS.length; i++) {
      const colLetter = XLSXStyle.utils.encode_col(i);
      assertEqual(
        templateWs[`${colLetter}1`]?.v,
        EMPLOYEE_IMPORT_HEADERS[i],
        `Header kolom ke-${i + 1} harus sesuai urutan`
      );
    }

    // Format teks '@' pada NIP (B2), NIK (C2), Nomor Pegawai (D2), dan Telepon (K2)
    assertEqual(templateWs['B2']?.z, '@', 'Kolom NIP baris 2 harus bertipe teks (@)');
    assertEqual(templateWs['C2']?.z, '@', 'Kolom NIK baris 2 harus bertipe teks (@)');
    assertEqual(templateWs['D2']?.z, '@', 'Kolom Nomor Pegawai baris 2 harus bertipe teks (@)');
    assertEqual(templateWs['K2']?.z, '@', 'Kolom Telepon baris 2 harus bertipe teks (@)');

    // File bukan xlsx valid ditolak
    const fakeBytes = new TextEncoder().encode('not-an-xlsx-file').buffer;
    assertThrows(
      () => parseEmployeeImportWorkbookBuffer(fakeBytes, fakeBytes.byteLength),
      'Format file tidak valid'
    );

    // File melebihi 5 MB ditolak
    assertThrows(
      () => parseEmployeeImportWorkbookBuffer(fakeBytes, EMPLOYEE_IMPORT_MAX_FILE_SIZE_BYTES + 1),
      'melebihi batas maksimal 5 MB'
    );

    // Sheet salah ditolak
    const wrongSheetBuf = createWorkbookBufferFromRows(
      [['Nama', '', '', '', '', 'PNS', '', '', '', '', '', 'a@b.com', '']],
      Array.from(EMPLOYEE_IMPORT_HEADERS),
      'Sheet1'
    );
    assertThrows(
      () => parseEmployeeImportWorkbookBuffer(wrongSheetBuf, wrongSheetBuf.byteLength),
      `Sheet "${EMPLOYEE_IMPORT_SHEET_NAME}" tidak ditemukan`
    );

    // Header urutan tertukar ditolak
    const swappedHeaders = Array.from(EMPLOYEE_IMPORT_HEADERS);
    [swappedHeaders[1], swappedHeaders[2]] = [swappedHeaders[2], swappedHeaders[1]];
    const badHeaderBuf = createWorkbookBufferFromRows(
      [['Nama', '', '', '', '', 'PNS', '', '', '', '', '', 'a@b.com', '']],
      swappedHeaders
    );
    assertThrows(
      () => parseEmployeeImportWorkbookBuffer(badHeaderBuf, badHeaderBuf.byteLength),
      'Urutan atau nama header kolom ke-2 tidak sesuai'
    );

    // Kolom tambahan di luar 13 kolom ditolak
    const extraHeaders = [...Array.from(EMPLOYEE_IMPORT_HEADERS), 'Kolom Ekstra'];
    const extraColBuf = createWorkbookBufferFromRows(
      [['Nama', '', '', '', '', 'PNS', '', '', '', '', '', 'a@b.com', '', 'x']],
      extraHeaders
    );
    assertThrows(
      () => parseEmployeeImportWorkbookBuffer(extraColBuf, extraColBuf.byteLength),
      'Terdapat kolom tambahan'
    );

    // Melebihi 500 baris ditolak
    const overLimitRows = Array.from({ length: EMPLOYEE_IMPORT_MAX_ROWS + 1 }, (_, i) => [
      `Pegawai ${i + 1}`,
      '',
      '',
      '',
      '',
      'PNS',
      '',
      '',
      '',
      '',
      '',
      `p${i + 1}@sekolah.sch.id`,
      '',
    ]);
    const overLimitBuf = createWorkbookBufferFromRows(overLimitRows);
    assertThrows(
      () => parseEmployeeImportWorkbookBuffer(overLimitBuf, overLimitBuf.byteLength),
      `melebihi batas maksimal ${EMPLOYEE_IMPORT_MAX_ROWS} baris`
    );
  });

  // 2. Validasi Kolom Wajib
  await test('2. Validasi kolom wajib (full_name, email, employee_type) menolak baris tidak lengkap', () => {
    const summary = validateEmployeeImportRows(
      [
        makeRawRow(2, { fullName: '  ', email: 'valid1@sekolah.sch.id', employeeType: 'PNS' }),
        makeRawRow(3, { fullName: 'Siti Aminah', email: ' ', employeeType: 'PNS' }),
        makeRawRow(4, { fullName: 'Siti Aminah', email: 'siti@sekolah.sch.id', employeeType: '' }),
        makeRawRow(5, { fullName: 'Siti Aminah', email: 'valid2@sekolah.sch.id', employeeType: 'PNS' }),
      ],
      [],
      SAMPLE_DEPARTMENTS,
      SAMPLE_POSITIONS,
      'test.xlsx',
      1024
    );

    assertEqual(summary.rejectedCount, 3, '3 baris tanpa kolom wajib harus ditolak');
    assertEqual(summary.validCount, 1, '1 baris lengkap harus valid');
    assertTrue(
      summary.rows[0].errors.some((e) => e.includes('Nama Lengkap')),
      'Baris 2 harus error Nama Lengkap'
    );
    assertTrue(
      summary.rows[1].errors.some((e) => e.includes('Alamat Email wajib')),
      'Baris 3 harus error Email'
    );
    assertTrue(
      summary.rows[2].errors.some((e) => e.includes('Jenis Kepegawaian wajib')),
      'Baris 4 harus error Jenis Kepegawaian'
    );
  });

  // 3. Validasi 8 Kategori Resmi COMMON_EMPLOYEE_TYPES
  await test('3. Seluruh 8 kategori resmi employee_type dikenali terpisah, dan HONORER/nilai liar ditolak', () => {
    assertEqual(COMMON_EMPLOYEE_TYPES.length, 8, 'Harus ada 8 kategori resmi');
    for (const label of COMMON_EMPLOYEE_TYPES) {
      const lowerRes = normalizeOfficialEmployeeType(`  ${label.toLowerCase()}  `);
      assertEqual(lowerRes.error, null, `Kategori ${label} harus valid`);
      assertEqual(lowerRes.value, label, `Kategori ${label} harus ternormalisasi persis`);
    }

    const honorerRes = normalizeOfficialEmployeeType('HONORER');
    assertEqual(honorerRes.value, null, 'HONORER generik tidak boleh diterima');
    assertTrue(Boolean(honorerRes.error), 'HONORER harus ditolak dengan pesan error');

    const unknownRes = normalizeOfficialEmployeeType('Magang');
    assertEqual(unknownRes.value, null, 'Kategori tidak resmi harus ditolak');
  });

  // 4. Normalisasi Email & Penolakan Format Tidak Valid
  await test('4. Email dinormalisasi trim+lowercase dan format tidak valid ditolak', () => {
    const summary = validateEmployeeImportRows(
      [
        makeRawRow(2, { email: '  Guru.Hebat@Sekolah.SCH.ID  ' }),
        makeRawRow(3, { email: 'bukan-email-valid' }),
        makeRawRow(4, { email: 'tanpa-domain@' }),
      ],
      [],
      SAMPLE_DEPARTMENTS,
      SAMPLE_POSITIONS,
      'email.xlsx',
      1024
    );

    assertEqual(summary.validCount, 1);
    assertEqual(summary.rejectedCount, 2);
    assertEqual(summary.rows[0].normalized?.email, 'guru.hebat@sekolah.sch.id');
    assertEqual(summary.rows[0].normalized?.profile_id, null);
  });

  // 5. Duplikasi Email Dalam Workbook Menolak Semua Baris Terlibat
  await test('5. Duplikasi email di dalam file Excel menolak SEMUA baris yang terlibat', () => {
    const summary = validateEmployeeImportRows(
      [
        makeRawRow(2, { fullName: 'Pegawai A', email: 'sama@sekolah.sch.id' }),
        makeRawRow(3, { fullName: 'Pegawai Unik', email: 'unik@sekolah.sch.id' }),
        makeRawRow(4, { fullName: 'Pegawai B', email: '  SAMA@SEKOLAH.SCH.ID ' }),
      ],
      [],
      SAMPLE_DEPARTMENTS,
      SAMPLE_POSITIONS,
      'dup-wb.xlsx',
      1024
    );

    assertEqual(summary.rows[0].validationStatus, 'rejected', 'Baris 2 duplikat harus ditolak');
    assertEqual(summary.rows[1].validationStatus, 'valid', 'Baris 3 unik tetap valid');
    assertEqual(summary.rows[2].validationStatus, 'rejected', 'Baris 4 duplikat harus ditolak');
    assertTrue(
      summary.rows[0].errors.some((e) => e.includes('baris 4')),
      'Baris 2 harus menyebut baris duplikat 4'
    );
    assertTrue(
      summary.rows[2].errors.some((e) => e.includes('baris 2')),
      'Baris 4 harus menyebut baris duplikat 2'
    );
  });

  // 6. Duplikasi Email Terhadap Database (Case-Insensitive)
  await test('6. Duplikasi email terhadap database (beda huruf besar-kecil & spasi) ditolak', () => {
    const existingDb: ExistingEmployeeIdentityRecord[] = [
      {
        email: 'User@Sekolah.sch.id',
        nip: null,
        nik: null,
        employee_number: null,
      },
    ];

    const summary = validateEmployeeImportRows(
      [makeRawRow(2, { email: '  user@sekolah.sch.id ' })],
      existingDb,
      SAMPLE_DEPARTMENTS,
      SAMPLE_POSITIONS,
      'dup-db.xlsx',
      1024
    );

    assertEqual(summary.rejectedCount, 1);
    assertTrue(
      summary.rows[0].errors.some((e) => e.includes('sudah terdaftar pada data pegawai')),
      'Harus menolak email yang sudah ada di DB'
    );
  });

  // 7. Duplikasi NIP, NIK, Nomor Pegawai & Pelestarian Leading Zero
  await test('7. Duplikasi NIP/NIK/Nomor Pegawai ditolak; leading zero teks terjaga; notasi ilmiah ditolak', () => {
    const existingDb: ExistingEmployeeIdentityRecord[] = [
      {
        email: 'existing@sekolah.sch.id',
        nip: '198001012005011001',
        nik: '7324010101800001',
        employee_number: '00999',
      },
    ];

    // Uji baca buffer dengan sel teks leading zero + sel angka notasi ilmiah
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([Array.from(EMPLOYEE_IMPORT_HEADERS)]);
    // Baris 2: leading zero sebagai string
    XLSX.utils.sheet_add_aoa(
      ws,
      [
        [
          'Andi Teks',
          '001980010120050110',
          '0073240101018000',
          '00123',
          'Laki-laki',
          'PNS',
          '',
          '',
          '',
          '',
          '081234567890',
          'andi.teks@sekolah.sch.id',
          '',
        ],
      ],
      { origin: 'A2' }
    );
    // Baris 3: sel angka besar 18 digit bertipe numeric yang berisiko rusak presisi (> MAX_SAFE_INTEGER)
    XLSX.utils.sheet_add_aoa(
      ws,
      [
        [
          'Andi Numeric Rusak',
          '198001012005011001',
          '',
          '',
          '',
          'PNS',
          '',
          '',
          '',
          '',
          '',
          'andi.num@sekolah.sch.id',
          '',
        ],
      ],
      { origin: 'A3' }
    );
    ws['B3'] = { t: 'n', v: 1.98001012005011e17, w: '1.98E+17' };

    XLSX.utils.book_append_sheet(wb, ws, EMPLOYEE_IMPORT_SHEET_NAME);
    const buf = XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer;

    const parsed = parseEmployeeImportWorkbookBuffer(buf, buf.byteLength);
    assertEqual(parsed[0].nip, '001980010120050110', 'Leading zero NIP harus tetap utuh');
    assertEqual(parsed[0].nik, '0073240101018000', 'Leading zero NIK harus tetap utuh');
    assertEqual(parsed[0].employeeNumber, '00123', 'Leading zero Nomor Pegawai harus tetap utuh');
    assertEqual(parsed[0].phone, '081234567890', 'Leading zero Telepon harus tetap utuh');
    assertTrue(
      parsed[1].cellErrors.some((e) => e.includes('notasi ilmiah')),
      'Sel NIP notasi ilmiah harus ditandai error'
    );

    const dupSummary = validateEmployeeImportRows(
      [
        makeRawRow(2, { email: 'a@sekolah.sch.id', nip: '198001012005011001' }),
        makeRawRow(3, { email: 'b@sekolah.sch.id', nik: '7324010101800001' }),
        makeRawRow(4, { email: 'c@sekolah.sch.id', employeeNumber: '00999' }),
        makeRawRow(5, { email: 'd@sekolah.sch.id', employeeNumber: '00555' }),
        makeRawRow(6, { email: 'e@sekolah.sch.id', employeeNumber: '00555' }),
      ],
      existingDb,
      SAMPLE_DEPARTMENTS,
      SAMPLE_POSITIONS,
      'dup-id.xlsx',
      1024
    );
    assertEqual(dupSummary.rejectedCount, 5, 'Semua baris duplikat NIP/NIK/EmpNum harus ditolak');
  });

  // 8. Normalisasi Field Opsional Kosong Menjadi NULL & profile_id Selalu NULL
  await test('8. Field opsional kosong atau spasi saja menjadi null dan profile_id selalu null', () => {
    const summary = validateEmployeeImportRows(
      [
        makeRawRow(2, {
          fullName: '  Rina Kusuma  ',
          nip: '   ',
          nik: '',
          employeeNumber: ' ',
          gender: ' ',
          employeeType: 'Tenaga Kependidikan',
          departmentName: '  ',
          positionName: '',
          joinDateRaw: ' ',
          status: '',
          phone: '   ',
          email: 'RINA@SEKOLAH.SCH.ID',
          notes: '  ',
        }),
      ],
      [],
      SAMPLE_DEPARTMENTS,
      SAMPLE_POSITIONS,
      'nulls.xlsx',
      1024
    );

    assertEqual(summary.validCount, 1);
    const norm = summary.rows[0].normalized!;
    assertEqual(norm.full_name, 'Rina Kusuma');
    assertEqual(norm.nip, null);
    assertEqual(norm.nik, null);
    assertEqual(norm.employee_number, null);
    assertEqual(norm.gender, null);
    assertEqual(norm.department_id, null);
    assertEqual(norm.position_id, null);
    assertEqual(norm.join_date, null);
    assertEqual(norm.status, 'active');
    assertEqual(norm.phone, null);
    assertEqual(norm.notes, null);
    assertEqual(norm.profile_id, null);
  });

  // 9. Validasi Gender & Status
  await test('9. Validasi gender dan status sesuai aturan resmi', () => {
    assertEqual(normalizeGenderInput('').value, null);
    assertEqual(normalizeGenderInput('laki-laki').value, 'male');
    assertEqual(normalizeGenderInput('PEREMPUAN').value, 'female');
    assertTrue(Boolean(normalizeGenderInput('L').error), 'Singkatan L harus ditolak');

    assertEqual(normalizeStatusInput('').value, 'active');
    assertEqual(normalizeStatusInput('aktif').value, 'active');
    assertEqual(normalizeStatusInput('Tidak Aktif').value, 'inactive');
    assertTrue(Boolean(normalizeStatusInput('Cuti').error), 'Status Cuti harus ditolak');
  });

  // 10. Validasi Tanggal Bergabung
  await test('10. Validasi join_date (Excel serial, YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY) dan tolak tanggal tidak nyata/MM-DD-YYYY', () => {
    assertEqual(parseAndValidateJoinDate('2024-08-17').value, '2024-08-17');
    assertEqual(parseAndValidateJoinDate('17/08/2024').value, '2024-08-17');
    assertEqual(parseAndValidateJoinDate('17-08-2024').value, '2024-08-17');

    // Excel date serial 45521 -> 2024-08-17
    const serialRes = parseAndValidateJoinDate(45521, 'yyyy-mm-dd');
    assertEqual(serialRes.value, '2024-08-17');
    assertEqual(serialRes.error, null);

    // Format ambigu MM/DD/YYYY (bulan > 12) wajib ditolak
    assertTrue(Boolean(parseAndValidateJoinDate('12/25/2024').error), '12/25/2024 harus ditolak');

    // Tanggal kabisat palsu & 31 April wajib ditolak
    assertTrue(Boolean(parseAndValidateJoinDate('2026-02-29').error), '2026-02-29 harus ditolak');
    assertTrue(Boolean(parseAndValidateJoinDate('31/04/2026').error), '31/04/2026 harus ditolak');
  });

  // 11. Mapping Departemen & Jabatan Aktif vs Nonaktif/Tidak Ditemukan
  await test('11. Departemen/Jabatan aktif terhubung ke UUID; nonaktif atau tidak ditemukan menjadi null dengan warning', () => {
    const summary = validateEmployeeImportRows(
      [
        makeRawRow(2, {
          email: 'aktif@sekolah.sch.id',
          departmentName: '  rekayasa perangkat lunak ',
          positionName: 'guru produktif',
        }),
        makeRawRow(3, {
          email: 'nonaktif@sekolah.sch.id',
          departmentName: 'Unit Lama Nonaktif',
          positionName: 'Jabatan Tidak Ada',
        }),
      ],
      [],
      SAMPLE_DEPARTMENTS,
      SAMPLE_POSITIONS,
      'master.xlsx',
      1024
    );

    assertEqual(summary.rows[0].validationStatus, 'valid');
    assertEqual(summary.rows[0].normalized?.department_id, 'dept-rpl-uuid');
    assertEqual(summary.rows[0].normalized?.position_id, 'pos-guru-uuid');

    assertEqual(summary.rows[1].validationStatus, 'warning');
    assertEqual(summary.rows[1].normalized?.department_id, null);
    assertEqual(summary.rows[1].normalized?.position_id, null);
    assertEqual(summary.rows[1].warnings.length, 2);
  });

  // 12. Peringatan Email Sudah Terdaftar di Supabase Auth
  await test('12. Email sudah ada di Supabase Auth menambah warning manual check dan tetap dapat diimpor', () => {
    const baseSummary = validateEmployeeImportRows(
      [
        makeRawRow(2, { email: 'sudah.auth@sekolah.sch.id' }),
        makeRawRow(3, { email: 'belum.auth@sekolah.sch.id' }),
        makeRawRow(4, { fullName: '', email: 'invalid@sekolah.sch.id' }),
      ],
      [],
      SAMPLE_DEPARTMENTS,
      SAMPLE_POSITIONS,
      'auth.xlsx',
      1024
    );

    const updated = applyAuthEmailWarningsToSummary(
      baseSummary,
      [
        { email: 'sudah.auth@sekolah.sch.id', existsInAuth: true },
        { email: 'belum.auth@sekolah.sch.id', existsInAuth: false },
      ],
      'checked',
      null
    );

    assertEqual(updated.warningCount, 1);
    assertEqual(updated.validCount, 1);
    assertEqual(updated.rejectedCount, 1);
    assertEqual(updated.importableCount, 2);
    assertEqual(updated.rows[0].existsInAuth, true);
    assertEqual(updated.rows[0].validationStatus, 'warning');
    assertTrue(
      updated.rows[0].warnings.includes(AUTH_EXISTS_WARNING_MESSAGE),
      'Baris 2 harus memuat pesan warning Auth resmi'
    );
  });

  // 13. Impor Parsial Mempertahankan Baris Valid & Nomor Baris Excel Asli
  await test('13. Impor parsial menyimpan baris valid & warning, melewati baris ditolak, dan mempertahankan nomor baris Excel', async () => {
    const baseSummary = validateEmployeeImportRows(
      [
        makeRawRow(2, { fullName: 'Valid Bersih', email: 'v1@sekolah.sch.id' }),
        makeRawRow(3, { fullName: '', email: 'ditolak@sekolah.sch.id' }),
        makeRawRow(4, {
          fullName: 'Valid Peringatan',
          email: 'w1@sekolah.sch.id',
          departmentName: 'Departemen Asing',
        }),
      ],
      [],
      SAMPLE_DEPARTMENTS,
      SAMPLE_POSITIONS,
      'partial.xlsx',
      1024
    );

    let insertCalls = 0;
    const result = await processPartialInsertRows(baseSummary.rows, async (payload) => {
      insertCalls++;
      assertEqual(payload.profile_id, null, 'profile_id harus selalu null saat impor');
      return { id: `emp-${insertCalls}` };
    });

    assertEqual(insertCalls, 2, 'Hanya 2 baris importable yang dikirim untuk insert');
    assertEqual(result.importedCount, 2);
    assertEqual(result.importedCleanCount, 1);
    assertEqual(result.importedWithWarningCount, 1);
    assertEqual(result.skippedCount, 1);
    assertEqual(result.failedCount, 0);
    assertEqual(result.results[0].excelRowNumber, 2);
    assertEqual(result.results[1].excelRowNumber, 3);
    assertEqual(result.results[1].status, 'skipped');
    assertEqual(result.results[2].excelRowNumber, 4);
    assertEqual(result.results[2].status, 'imported_with_warning');
  });

  // 14. Terjemahan Error Unique Constraint & Database
  await test('14. Error unique constraint (23505 employees_email_normalized_unique, nip, nik, employee_number) diterjemahkan jelas', () => {
    const emailErr = mapDatabaseConstraintError(
      '23505',
      'duplicate key value violates unique constraint "employees_email_normalized_unique"'
    );
    assertTrue(
      emailErr.includes('employees_email_normalized_unique'),
      'Pesan error duplikat email harus informatif'
    );

    assertTrue(
      mapDatabaseConstraintError('23505', 'duplicate key value violates unique constraint "employees_nip_key"').includes('NIP'),
      'Pesan error duplikat NIP harus menyebut NIP'
    );
    assertTrue(
      mapDatabaseConstraintError('23505', 'duplicate key value violates unique constraint "employees_nik_key"').includes('NIK'),
      'Pesan error duplikat NIK harus menyebut NIK'
    );
    assertTrue(
      mapDatabaseConstraintError('23505', 'duplicate key value violates unique constraint "employees_employee_number_key"').includes('Nomor Pegawai'),
      'Pesan error duplikat Nomor Pegawai harus menyebut Nomor Pegawai'
    );
    assertTrue(
      mapDatabaseConstraintError('42501', 'new row violates row-level security policy').includes('RLS'),
      'Pesan error RLS harus menyebut RLS'
    );
  });

  // 15. Kegagalan 1 Baris Tidak Menghentikan atau Meng-rollback Baris Lain
  await test('15. Kegagalan insert pada 1 baris (misal 23505 race condition) tidak membatalkan baris valid lain', async () => {
    const summary = validateEmployeeImportRows(
      [
        makeRawRow(2, { fullName: 'Sukses Pertama', email: 'ok1@sekolah.sch.id' }),
        makeRawRow(3, { fullName: 'Konflik Race DB', email: 'race@sekolah.sch.id' }),
        makeRawRow(4, { fullName: 'Sukses Kedua', email: 'ok2@sekolah.sch.id' }),
      ],
      [],
      SAMPLE_DEPARTMENTS,
      SAMPLE_POSITIONS,
      'isolation.xlsx',
      1024
    );

    const execResult = await processPartialInsertRows(summary.rows, async (payload) => {
      if (payload.email === 'race@sekolah.sch.id') {
        return {
          error: {
            code: '23505',
            message: 'duplicate key value violates unique constraint "employees_email_normalized_unique"',
          },
        };
      }
      return { id: `emp-${payload.email}` };
    });

    assertEqual(execResult.importedCount, 2, '2 baris valid lainnya harus tetap tersimpan');
    assertEqual(execResult.failedCount, 1, 'Hanya 1 baris konflik DB yang gagal');
    assertEqual(execResult.results[0].status, 'imported');
    assertEqual(execResult.results[1].status, 'failed');
    assertEqual(execResult.results[1].excelRowNumber, 3);
    assertEqual(execResult.results[2].status, 'imported');
  });

  // 16. Sanitasi Formula-Injection Laporan Hasil & Fallback Auth Check Unavailable
  await test('16. Ekspor hasil menetralkan formula injection dan Auth check unavailable tidak memblokir impor parsial', () => {
    assertEqual(sanitizeSpreadsheetCellForExport('=CMD|"/C calc"!A0'), `'=CMD|"/C calc"!A0`);
    assertEqual(sanitizeSpreadsheetCellForExport('+SUM(A1:A2)'), `'+SUM(A1:A2)`);
    assertEqual(sanitizeSpreadsheetCellForExport('-10+2'), `'-10+2`);
    assertEqual(sanitizeSpreadsheetCellForExport('@SUM(1,1)'), `'@SUM(1,1)`);
    assertEqual(sanitizeSpreadsheetCellForExport('Nama Biasa'), 'Nama Biasa');

    const baseSummary = validateEmployeeImportRows(
      [makeRawRow(2, { fullName: 'Pegawai Aman', email: 'aman@sekolah.sch.id' })],
      [],
      SAMPLE_DEPARTMENTS,
      SAMPLE_POSITIONS,
      'fallback.xlsx',
      1024
    );

    const unavailableSummary = applyAuthEmailWarningsToSummary(
      baseSummary,
      [],
      'unavailable',
      'Edge Function check-employee-auth-emails belum di-deploy.'
    );

    assertEqual(unavailableSummary.authCheckStatus, 'unavailable');
    assertEqual(unavailableSummary.importableCount, 1, 'Impor parsial tetap diizinkan saat Auth check unavailable');
  });

  console.log('\n------------------------------------------------------');
  console.log(`Ringkasan Tes: ${passedTests} Lulus, ${failedTests} Gagal (Total ${passedTests + failedTests})`);
  console.log('------------------------------------------------------\n');

  if (failedTests > 0) {
    throw new Error(`${failedTests} pengujian gagal.`);
  }
}

runTests();
