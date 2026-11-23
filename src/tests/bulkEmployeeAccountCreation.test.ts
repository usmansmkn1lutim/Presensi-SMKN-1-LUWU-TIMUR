import * as XLSX from 'xlsx';
import * as esbuild from 'esbuild';
import {
  FunctionsFetchError,
  FunctionsHttpError,
  FunctionsRelayError,
} from '@supabase/supabase-js';
import {
  AUTH_EXISTS_WARNING_MESSAGE,
  aggregateBulkAccountResults,
  buildEmployeeAccountCandidates,
  buildImportResultReportRows,
  chunkEmployeeIds,
  deduplicateChunkErrorMessages,
  executeBulkAccountCreationInChunks,
  extractEdgeFunctionErrorMessage,
  getBulkAccountStatusBadge,
  getBulkAccountStatusLabel,
  getRetryableEmployeeIds,
  hasNewlyCreatedAccounts,
  mergeAccountResultsIntoImportSummary,
  parseBulkAccountChunkInvokeResult,
  processPartialInsertRows,
  sanitizeSpreadsheetCellForExport,
  validateBatchInitialPassword,
  validateEmployeeImportRows,
} from '../services/employeeImportService';
import {
  BULK_ACCOUNT_CHUNK_SIZE,
  BulkCreateAccountsAggregatedSummary,
  BulkCreateEmployeeAccountRowResult,
  BulkCreateEmployeeAccountsChunkResponse,
  BulkEmployeeImportSummaryResponse,
  ParsedEmployeeImportRawRow,
} from '../types/employeeImport.types';
import { DepartmentRow, PositionRow } from '../types/database.types';

let passedTests = 0;
let failedTests = 0;
let skippedTests = 0;

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

function skipTest(name: string, reason: string): Promise<void> {
  skippedTests++;
  console.log(`⏭️  [SKIP] ${name}\n   -> Alasan: ${reason}`);
  return Promise.resolve();
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

const SAMPLE_DEPARTMENTS: DepartmentRow[] = [
  {
    id: 'dept-1',
    name: 'Teknik Komputer & Informatika',
    description: null,
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
];

const SAMPLE_POSITIONS: PositionRow[] = [
  {
    id: 'pos-1',
    name: 'Guru Produktif',
    description: null,
    is_active: true,
    created_at: '2025-01-01T00:00:00Z',
    updated_at: '2025-01-01T00:00:00Z',
  },
];

function makeRawRow(
  excelRowNumber: number,
  overrides: Partial<ParsedEmployeeImportRawRow> = {}
): ParsedEmployeeImportRawRow {
  return {
    excelRowNumber,
    fullName: `Pegawai ${excelRowNumber}`,
    nip: '',
    nik: '',
    employeeNumber: '',
    gender: 'Laki-laki',
    employeeType: 'PNS',
    departmentName: 'Teknik Komputer & Informatika',
    positionName: 'Guru Produktif',
    joinDateRaw: '2025-01-10',
    status: 'Aktif',
    phone: '',
    email: `pegawai${excelRowNumber}@sekolah.sch.id`,
    notes: '',
    cellErrors: [],
    ...overrides,
  };
}

async function runTests() {
  console.log('======================================================');
  console.log('PENGUJIAN ALUR TERPADU IMPOR -> PEMBUATAN AKUN MASSAL');
  console.log('======================================================');

  // 1. Seleksi default dan filtering eligibility
  await test('1. Seleksi default & eligibility memilih pegawai aktif baru dan mengecualikan nonaktif, auth exists, dan gagal/ditolak', () => {
    const summary: BulkEmployeeImportSummaryResponse = {
      success: true,
      message: 'Selesai',
      totalProcessed: 6,
      importedCount: 4,
      importedCleanCount: 2,
      importedWithWarningCount: 2,
      failedCount: 1,
      skippedCount: 1,
      authCheckStatus: 'checked',
      results: [
        {
          excelRowNumber: 2,
          fullName: 'Budi Aktif',
          email: 'budi@sekolah.sch.id',
          status: 'imported',
          employeeId: 'emp-1',
          employeeStatus: 'active',
          existsInAuth: false,
          warnings: [],
          errorReason: null,
        },
        {
          excelRowNumber: 3,
          fullName: 'Siti Peringatan Dept',
          email: 'siti@sekolah.sch.id',
          status: 'imported_with_warning',
          employeeId: 'emp-2',
          employeeStatus: 'active',
          existsInAuth: false,
          warnings: ['Departemen "X" tidak ditemukan — disimpan sebagai NULL.'],
          errorReason: null,
        },
        {
          excelRowNumber: 4,
          fullName: 'Andi Nonaktif',
          email: 'andi@sekolah.sch.id',
          status: 'imported',
          employeeId: 'emp-3',
          employeeStatus: 'inactive',
          existsInAuth: false,
          warnings: [],
          errorReason: null,
        },
        {
          excelRowNumber: 5,
          fullName: 'Dewi Auth Ada',
          email: 'dewi@sekolah.sch.id',
          status: 'imported_with_warning',
          employeeId: 'emp-4',
          employeeStatus: 'active',
          existsInAuth: true,
          warnings: [AUTH_EXISTS_WARNING_MESSAGE],
          errorReason: null,
        },
        {
          excelRowNumber: 6,
          fullName: 'Rudi Gagal DB',
          email: 'rudi@sekolah.sch.id',
          status: 'failed',
          employeeId: null,
          employeeStatus: null,
          existsInAuth: false,
          warnings: [],
          errorReason: 'Email duplikat.',
        },
        {
          excelRowNumber: 7,
          fullName: 'Tono Ditolak Validasi',
          email: 'invalid-email',
          status: 'skipped',
          employeeId: null,
          employeeStatus: null,
          existsInAuth: false,
          warnings: [],
          errorReason: 'Format email tidak valid.',
        },
      ],
    };

    const candidates = buildEmployeeAccountCandidates(summary);
    assertEqual(candidates.length, 6);

    assertEqual(candidates[0].eligible, true, 'Baris 2 harus eligible');
    assertEqual(candidates[0].selected, true, 'Baris 2 harus otomatis terpilih');
    assertEqual(candidates[0].ineligibleReason, null);

    assertEqual(candidates[1].eligible, true, 'Baris 3 (warning dept) harus eligible');
    assertEqual(candidates[1].selected, true, 'Baris 3 harus otomatis terpilih');

    assertEqual(candidates[2].eligible, false, 'Pegawai nonaktif tidak eligible');
    assertEqual(candidates[2].selected, false, 'Pegawai nonaktif tidak boleh otomatis terpilih');
    assertTrue(
      Boolean(candidates[2].ineligibleReason?.includes('Tidak Aktif')),
      'Alasan nonaktif harus jelas'
    );

    assertEqual(candidates[3].eligible, false, 'Email sudah di Auth tidak eligible');
    assertEqual(candidates[3].selected, false, 'Email sudah di Auth tidak boleh otomatis terpilih');
    assertTrue(
      Boolean(candidates[3].ineligibleReason?.includes('Supabase Auth')),
      'Alasan Auth sudah ada harus jelas'
    );

    assertEqual(candidates[4].eligible, false, 'Gagal DB tidak eligible');
    assertEqual(candidates[4].selected, false);

    assertEqual(candidates[5].eligible, false, 'Ditolak validasi tidak eligible');
    assertEqual(candidates[5].selected, false);
  });

  // 2. Validasi password awal batch mengikuti aturan minimal SecurityPage
  await test('2. Validasi password awal batch mengikuti ketentuan minimal 6 karakter & kecocokan konfirmasi', () => {
    assertTrue(validateBatchInitialPassword('', '') !== null, 'Password kosong harus ditolak');
    assertTrue(
      validateBatchInitialPassword('12345', '12345') !== null,
      'Password < 6 karakter harus ditolak'
    );
    assertTrue(
      validateBatchInitialPassword('Tamaki123', 'Tamaki124') !== null,
      'Konfirmasi berbeda harus ditolak'
    );
    assertEqual(
      validateBatchInitialPassword('Tamaki123', 'Tamaki123'),
      null,
      'Password valid >= 6 karakter dan cocok harus diterima'
    );
  });

  // 3. processPartialInsertRows membawa metadata employeeStatus & existsInAuth
  await test('3. Hasil impor parsial mempertahankan employeeStatus dari baris valid maupun nonaktif', async () => {
    const validation = validateEmployeeImportRows(
      [
        makeRawRow(2, { fullName: 'Pegawai Aktif', status: 'Aktif' }),
        makeRawRow(3, { fullName: 'Pegawai Nonaktif', status: 'Tidak Aktif' }),
      ],
      [],
      SAMPLE_DEPARTMENTS,
      SAMPLE_POSITIONS,
      'test.xlsx',
      1024
    );

    const execRes = await processPartialInsertRows(validation.rows, async (payload) => ({
      id: `uuid-${payload.email}`,
    }));

    assertEqual(execRes.results[0].employeeStatus, 'active');
    assertEqual(execRes.results[1].employeeStatus, 'inactive');

    const candidates = buildEmployeeAccountCandidates(execRes);
    assertEqual(candidates[0].eligible, true);
    assertEqual(candidates[1].eligible, false);
  });

  // 4. Chunking berukuran 15-20 dan mencegah duplikasi employeeId
  await test('4. chunkEmployeeIds membagi tepat dalam ukuran chunk <= 20 dan menduplikasi-guard ID', () => {
    assertTrue(
      BULK_ACCOUNT_CHUNK_SIZE >= 15 && BULK_ACCOUNT_CHUNK_SIZE <= 20,
      'BULK_ACCOUNT_CHUNK_SIZE harus berada di rentang 15-20'
    );

    const ids = Array.from({ length: 45 }, (_, i) => `emp-${i + 1}`);
    ids.push('emp-1', 'emp-2'); // duplicate entries

    const chunks = chunkEmployeeIds(ids, BULK_ACCOUNT_CHUNK_SIZE);
    assertEqual(chunks.length, 3, '45 ID unik dengan chunk 20 harus menjadi 3 chunk');
    assertEqual(chunks[0].length, 20);
    assertEqual(chunks[1].length, 20);
    assertEqual(chunks[2].length, 5);
  });

  // 5. Kontrak response backend, pengaitan profile_id, auth_exists, already_linked, & rollback gagal
  await test('5. Agregasi kontrak backend menangani created, already_linked, auth_exists, failed retryable, dan reconciliation_required', () => {
    const serverResponse: BulkCreateEmployeeAccountsChunkResponse = {
      success: true,
      message: 'Batch diproses',
      totalProcessed: 5,
      createdCount: 1,
      alreadyLinkedCount: 1,
      authExistsCount: 1,
      ineligibleCount: 0,
      failedCount: 1,
      reconciliationRequiredCount: 1,
      results: [
        {
          employeeId: 'emp-1',
          fullName: 'Pegawai Satu',
          email: 'satu@sekolah.sch.id',
          status: 'created',
          profileId: 'prof-1',
          retryable: false,
          needsReconciliation: false,
          message: 'Akun dibuat, dikaitkan, dan wajib ganti kata sandi saat login pertama.',
        },
        {
          employeeId: 'emp-2',
          fullName: 'Pegawai Dua',
          email: 'dua@sekolah.sch.id',
          status: 'already_linked',
          profileId: 'prof-2',
          retryable: false,
          needsReconciliation: false,
          message: 'Pegawai sudah terhubung dengan akun pengguna.',
        },
        {
          employeeId: 'emp-3',
          fullName: 'Pegawai Tiga',
          email: 'tiga@sekolah.sch.id',
          status: 'auth_exists',
          profileId: null,
          retryable: false,
          needsReconciliation: false,
          message: 'Email sudah terdaftar di Supabase Auth.',
        },
        {
          employeeId: 'emp-4',
          fullName: 'Pegawai Empat',
          email: 'empat@sekolah.sch.id',
          status: 'failed',
          profileId: null,
          retryable: true,
          needsReconciliation: false,
          message: 'Gagal mengaitkan akun ke data pegawai. Perubahan dibatalkan aman.',
        },
        {
          employeeId: 'emp-5',
          fullName: 'Pegawai Lima',
          email: 'lima@sekolah.sch.id',
          status: 'reconciliation_required',
          profileId: 'orphan-auth-5',
          retryable: false,
          needsReconciliation: true,
          message: 'Rollback gagal, memerlukan rekonsiliasi manual.',
        },
      ],
    };

    const agg = aggregateBulkAccountResults(null, serverResponse.results, 1, 1, null);
    assertEqual(agg.createdCount, 1);
    assertEqual(agg.alreadyLinkedCount, 1);
    assertEqual(agg.authExistsCount, 1);
    assertEqual(agg.failedCount, 1);
    assertEqual(agg.reconciliationRequiredCount, 1);
    assertEqual(agg.resultsByEmployeeId['emp-1'].profileId, 'prof-1');

    const retryIds = getRetryableEmployeeIds(agg);
    assertDeepEqual(
      retryIds,
      ['emp-4'],
      'Hanya emp-4 (failed + retryable + !needsReconciliation) yang boleh masuk retry'
    );
  });

  // 6. Chunk berurutan mempertahankan hasil chunk sukses saat chunk berikutnya gagal & retry tidak mengulang yg sukses
  await test('6. Kegagalan chunk ke-2 mempertahankan hasil chunk ke-1, dan retry hanya memproses baris gagal yang aman', async () => {
    const targets = Array.from({ length: 25 }, (_, i) => ({
      employeeId: `emp-${i + 1}`,
      fullName: `Pegawai ${i + 1}`,
      email: `pegawai${i + 1}@sekolah.sch.id`,
    }));

    const invokedChunks: string[][] = [];
    const firstRunSummary = await executeBulkAccountCreationInChunks(
      targets,
      'TamakiPass123',
      async (chunkIds) => {
        invokedChunks.push(chunkIds);
        if (invokedChunks.length === 2) {
          throw new Error('Gateway Timeout pada chunk kedua');
        }
        return {
          success: true,
          message: 'OK',
          totalProcessed: chunkIds.length,
          createdCount: chunkIds.length,
          alreadyLinkedCount: 0,
          authExistsCount: 0,
          ineligibleCount: 0,
          failedCount: 0,
          reconciliationRequiredCount: 0,
          results: chunkIds.map((id, idx) => ({
            employeeId: id,
            fullName: `Pegawai ${idx + 1}`,
            email: `pegawai${idx + 1}@sekolah.sch.id`,
            status: 'created',
            profileId: `prof-${id}`,
            retryable: false,
            needsReconciliation: false,
            message: 'Akun dibuat.',
          })),
        };
      },
      { chunkSize: 20 }
    );

    assertEqual(invokedChunks.length, 2);
    assertEqual(firstRunSummary.createdCount, 20, '20 akun dari chunk 1 harus tetap tersimpan');
    assertEqual(firstRunSummary.failedCount, 5, '5 akun dari chunk 2 gagal');
    assertEqual(firstRunSummary.chunkErrors.length, 1);

    const retryIds = getRetryableEmployeeIds(firstRunSummary);
    assertEqual(retryIds.length, 5);
    assertDeepEqual(retryIds, ['emp-21', 'emp-22', 'emp-23', 'emp-24', 'emp-25']);

    // Retry run: pass ALL targets or retry targets; already-created items MUST NOT be re-invoked
    const retryInvocations: string[][] = [];
    const retryTargets = targets.filter((t) => retryIds.includes(t.employeeId));
    const afterRetrySummary = await executeBulkAccountCreationInChunks(
      retryTargets,
      'TamakiPass123',
      async (chunkIds) => {
        retryInvocations.push(chunkIds);
        return {
          success: true,
          message: 'OK',
          totalProcessed: chunkIds.length,
          createdCount: chunkIds.length,
          alreadyLinkedCount: 0,
          authExistsCount: 0,
          ineligibleCount: 0,
          failedCount: 0,
          reconciliationRequiredCount: 0,
          results: chunkIds.map((id) => ({
            employeeId: id,
            fullName: `Pegawai ${id}`,
            email: `${id}@sekolah.sch.id`,
            status: 'created',
            profileId: `prof-${id}`,
            retryable: false,
            needsReconciliation: false,
            message: 'Berhasil pada percobaan ulang.',
          })),
        };
      },
      { chunkSize: 20, initialSummary: firstRunSummary }
    );

    assertEqual(retryInvocations.length, 1);
    assertDeepEqual(retryInvocations[0], ['emp-21', 'emp-22', 'emp-23', 'emp-24', 'emp-25']);
    assertEqual(afterRetrySummary.createdCount, 25, 'Total akun berhasil setelah retry harus 25');
    assertEqual(afterRetrySummary.failedCount, 0);
    assertEqual(getRetryableEmployeeIds(afterRetrySummary).length, 0);
  });

  // 7. Pencegahan double-submit / duplikasi pada aggregateBulkAccountResults & executeBulkAccountCreationInChunks
  await test('7. Double-submit atau pemanggilan ulang tidak menimpa status created/already_linked/reconciliation_required', async () => {
    const initial: BulkCreateAccountsAggregatedSummary = aggregateBulkAccountResults(
      null,
      [
        {
          employeeId: 'emp-1',
          fullName: 'Pegawai 1',
          email: 'p1@sekolah.sch.id',
          status: 'created',
          profileId: 'prof-1',
          retryable: false,
          needsReconciliation: false,
          message: 'Akun dibuat.',
        },
        {
          employeeId: 'emp-2',
          fullName: 'Pegawai 2',
          email: 'p2@sekolah.sch.id',
          status: 'reconciliation_required',
          profileId: 'orphan-2',
          retryable: false,
          needsReconciliation: true,
          message: 'Perlu rekonsiliasi.',
        },
      ],
      1,
      1,
      null
    );

    let calledCount = 0;
    const rerun = await executeBulkAccountCreationInChunks(
      [
        { employeeId: 'emp-1', fullName: 'Pegawai 1', email: 'p1@sekolah.sch.id' },
        { employeeId: 'emp-2', fullName: 'Pegawai 2', email: 'p2@sekolah.sch.id' },
      ],
      'TamakiPass123',
      async (chunkIds) => {
        calledCount++;
        return {
          success: true,
          message: 'Should not run',
          totalProcessed: chunkIds.length,
          createdCount: 0,
          alreadyLinkedCount: 0,
          authExistsCount: 0,
          ineligibleCount: 0,
          failedCount: 0,
          reconciliationRequiredCount: 0,
          results: [],
        };
      },
      { initialSummary: initial }
    );

    assertEqual(
      calledCount,
      0,
      'executeBulkAccountCreationInChunks tidak boleh memanggil backend lagi untuk status non-retryable'
    );
    assertEqual(rerun.createdCount, 1);
    assertEqual(rerun.reconciliationRequiredCount, 1);
  });

  // 8. Penggabungan laporan akhir impor + status pembuatan akun tetap menjaga formula sanitization
  await test('8. mergeAccountResultsIntoImportSummary menyatukan status impor dan status pembuatan akun untuk laporan akhir', () => {
    const importRows = [
      {
        excelRowNumber: 2,
        fullName: '=SUM(A1:A2)',
        email: 'budi@sekolah.sch.id',
        status: 'imported' as const,
        employeeId: 'emp-1',
        employeeStatus: 'active' as const,
        existsInAuth: false,
        warnings: [],
        errorReason: null,
      },
    ];

    const accSummary = aggregateBulkAccountResults(
      null,
      [
        {
          employeeId: 'emp-1',
          fullName: '=SUM(A1:A2)',
          email: 'budi@sekolah.sch.id',
          status: 'created',
          profileId: 'prof-1',
          retryable: false,
          needsReconciliation: false,
          message: 'Akun dibuat, dikaitkan, dan wajib ganti kata sandi saat login pertama.',
        },
      ],
      1,
      1,
      null
    );

    const merged = mergeAccountResultsIntoImportSummary(importRows, accSummary);
    assertEqual(merged[0].accountCreationStatus, 'created');
    assertTrue(
      Boolean(merged[0].accountCreationMessage?.includes('wajib ganti kata sandi')),
      'Keterangan akun wajib ganti kata sandi harus terbawa'
    );
    assertEqual(sanitizeSpreadsheetCellForExport(merged[0].fullName), `'=SUM(A1:A2)`);
    assertTrue(
      typeof XLSX.utils.json_to_sheet === 'function',
      'XLSX export helper harus tersedia'
    );
  });

  // 9. Validasi password spasi-saja ditolak
  await test('9. validateBatchInitialPassword menolak password yang hanya berisi spasi', () => {
    const err = validateBatchInitialPassword('      ', '      ');
    assertTrue(err !== null && err.includes('spasi'), 'Password spasi-saja wajib ditolak');
    assertEqual(
      validateBatchInitialPassword('Tamaki 123', 'Tamaki 123'),
      null,
      'Password valid dengan spasi di tengah tetap diterima selama panjang >= 6'
    );
  });

  // 10. Ekstraksi error FunctionsHttpError dari response JSON menggunakan clone()
  await test('10. extractEdgeFunctionErrorMessage membaca JSON message dari FunctionsHttpError dan menjaga body asli tetap utuh (clone)', async () => {
    const rawResponse = new Response(
      JSON.stringify({
        success: false,
        message: 'Akses ditolak. Hanya Admin atau Super Admin yang berwenang membuat akun pegawai massal.',
      }),
      {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      }
    );
    const httpError = new FunctionsHttpError(rawResponse);

    const extracted = await extractEdgeFunctionErrorMessage(
      null,
      httpError,
      'Fallback error'
    );

    assertEqual(
      extracted,
      'Akses ditolak. Hanya Admin atau Super Admin yang berwenang membuat akun pegawai massal.'
    );
    assertEqual(
      rawResponse.bodyUsed,
      false,
      'Body Response asli pada error.context tidak boleh terkonsumsi berkat clone()'
    );

    // Pastikan data.message tetap diprioritaskan jika valid
    const fromData = await extractEdgeFunctionErrorMessage(
      { message: 'Pesan langsung dari payload data.' },
      httpError,
      'Fallback error'
    );
    assertEqual(fromData, 'Pesan langsung dari payload data.');
  });

  // 11. Fallback aman untuk body FunctionsHttpError bukan JSON (HTML/text mentah) & pola sensitif
  await test('11. extractEdgeFunctionErrorMessage tidak membocorkan HTML mentah atau token saat body bukan JSON', async () => {
    const htmlResponse = new Response(
      '<!DOCTYPE html><html><body><h1>502 Bad Gateway</h1></body></html>',
      { status: 502, headers: { 'Content-Type': 'text/html' } }
    );
    const httpError = new FunctionsHttpError(htmlResponse);

    const extracted = await extractEdgeFunctionErrorMessage(
      null,
      httpError,
      'Fallback aman'
    );

    assertTrue(
      !extracted.toLowerCase().includes('<html') && !extracted.toLowerCase().includes('<!doctype'),
      'HTML mentah tidak boleh bocor ke pesan error UI'
    );
    assertEqual(
      extracted,
      httpError.message,
      'Harus jatuh ke error.message SDK yang aman sebelum fallback bawaan'
    );

    const leakyError = new Error('Authorization failed with Bearer secret_token_123');
    const safeExtracted = await extractEdgeFunctionErrorMessage(
      null,
      leakyError,
      'Terjadi kesalahan saat menghubungi server.'
    );
    assertEqual(
      safeExtracted,
      'Terjadi kesalahan saat menghubungi server.',
      'Pesan mengandung Bearer token harus diganti fallback aman'
    );
  });

  // 12. Pembedaan FunctionsFetchError dan FunctionsRelayError
  await test('12. extractEdgeFunctionErrorMessage membedakan FunctionsFetchError dan FunctionsRelayError', async () => {
    const fetchErr = new FunctionsFetchError(new Error('Failed to fetch'));
    const relayErr = new FunctionsRelayError(new Response('Relay failure', { status: 502 }));

    const fetchMsg = await extractEdgeFunctionErrorMessage(null, fetchErr, 'Fallback');
    const relayMsg = await extractEdgeFunctionErrorMessage(null, relayErr, 'Fallback');

    assertTrue(fetchMsg !== relayMsg, 'Pesan FunctionsFetchError dan FunctionsRelayError harus berbeda');
    assertTrue(fetchMsg.toLowerCase().includes('jaringan'), 'FunctionsFetchError harus menjelaskan kendala jaringan/koneksi');
    assertTrue(relayMsg.toLowerCase().includes('relay'), 'FunctionsRelayError harus menjelaskan gangguan relay');
  });

  // 13. Callback refresh onAccountsCreated hanya berjalan saat ada akun baru & tidak tertipu jumlah kumulatif retry
  await test('13. hasNewlyCreatedAccounts memicu refresh hanya jika eksekusi atau retry menghasilkan akun baru', async () => {
    assertEqual(hasNewlyCreatedAccounts(0, 0), false, 'Eksekusi awal 0 akun dibuat tidak boleh memicu refresh');
    assertEqual(hasNewlyCreatedAccounts(0, 5), true, 'Eksekusi awal >= 1 akun dibuat harus memicu refresh');

    // Simulasi retry setelah chunk 1 berhasil (20 akun) dan chunk 2 gagal (5 akun)
    let callIdx = 0;
    const targets = Array.from({ length: 25 }, (_, i) => ({
      employeeId: `emp-${i + 1}`,
      fullName: `Pegawai ${i + 1}`,
      email: `p${i + 1}@sekolah.sch.id`,
    }));

    const firstSummary = await executeBulkAccountCreationInChunks(
      targets,
      'TamakiPass123',
      async (chunkIds) => {
        callIdx++;
        if (callIdx === 2) {
          throw new Error('Timeout sementara');
        }
        return {
          success: true,
          message: 'OK',
          totalProcessed: chunkIds.length,
          createdCount: chunkIds.length,
          alreadyLinkedCount: 0,
          authExistsCount: 0,
          ineligibleCount: 0,
          failedCount: 0,
          reconciliationRequiredCount: 0,
          results: chunkIds.map((id) => ({
            employeeId: id,
            fullName: id,
            email: `${id}@sekolah.sch.id`,
            status: 'created',
            profileId: `prof-${id}`,
            retryable: false,
            needsReconciliation: false,
            message: 'Dibuat',
          })),
        };
      },
      { chunkSize: 20 }
    );

    assertEqual(firstSummary.createdCount, 20);
    const prevCreated = firstSummary.createdCount;

    // Retry gagal semua: createdCount kumulatif tetap 20
    const failedRetrySummary = await executeBulkAccountCreationInChunks(
      targets.filter((t) => getRetryableEmployeeIds(firstSummary).includes(t.employeeId)),
      'TamakiPass123',
      async () => {
        throw new Error('Masih gagal');
      },
      { chunkSize: 20, initialSummary: firstSummary }
    );

    assertEqual(failedRetrySummary.createdCount, 20);
    assertEqual(
      hasNewlyCreatedAccounts(prevCreated, failedRetrySummary.createdCount),
      false,
      'Retry tanpa akun baru tidak boleh menganggap createdCount kumulatif sebagai hasil baru'
    );

    // Retry kedua berhasil 2 dari 5 baris: kumulatif menjadi 22
    const partialRetrySummary = await executeBulkAccountCreationInChunks(
      targets.filter((t) => getRetryableEmployeeIds(failedRetrySummary).includes(t.employeeId)),
      'TamakiPass123',
      async (chunkIds) => ({
        success: true,
        message: 'Parsial',
        totalProcessed: chunkIds.length,
        createdCount: 2,
        alreadyLinkedCount: 0,
        authExistsCount: 0,
        ineligibleCount: 0,
        failedCount: chunkIds.length - 2,
        reconciliationRequiredCount: 0,
        results: chunkIds.map((id, idx) => ({
          employeeId: id,
          fullName: id,
          email: `${id}@sekolah.sch.id`,
          status: idx < 2 ? 'created' : 'failed',
          profileId: idx < 2 ? `prof-${id}` : null,
          retryable: idx >= 2,
          needsReconciliation: false,
          message: idx < 2 ? 'Dibuat saat retry' : 'Gagal lagi',
        })),
      }),
      { chunkSize: 20, initialSummary: failedRetrySummary }
    );

    assertEqual(partialRetrySummary.createdCount, 22);
    assertEqual(
      hasNewlyCreatedAccounts(failedRetrySummary.createdCount, partialRetrySummary.createdCount),
      true,
      'Retry yang menambah akun baru (20 -> 22) harus memicu refresh'
    );
  });

  // --------------------------------------------------------------------------
  // SIMULASI KONTRAK EDGE FUNCTION (BUKAN EKSEKUSI RUNTIME DENO LANGSUNG)
  // --------------------------------------------------------------------------
  interface SimAuthErr {
    status?: number;
    code?: string;
    name?: string;
    message?: string;
  }

  function simulateBulkCreateAuthErrorClassification(
    err: SimAuthErr,
    hasCreatedAuthUser = false
  ) {
    const code = (err.code || '').toLowerCase().trim();
    const name = (err.name || '').toLowerCase().trim();
    const msg = (err.message || '').toLowerCase();

    const isDup =
      code === 'email_exists' ||
      code === 'user_already_exists' ||
      msg.includes('already registered') ||
      msg.includes('already been registered') ||
      msg.includes('already exists') ||
      msg.includes('email_exists') ||
      msg.includes('user_already_exists') ||
      (msg.includes('duplicate') && (msg.includes('email') || msg.includes('user')));

    if (isDup) {
      return { status: 'auth_exists', retryable: false, needsReconciliation: false };
    }
    if (err.status === 429 || code === 'over_request_rate_limit') {
      return {
        status: 'failed',
        retryable: !hasCreatedAuthUser,
        needsReconciliation: hasCreatedAuthUser,
      };
    }
    const isWeakPwd =
      code === 'weak_password' ||
      name === 'authweakpassworderror' ||
      msg.includes('weak password') ||
      msg.includes('password should be') ||
      msg.includes('password must') ||
      (msg.includes('password') &&
        (msg.includes('policy') || msg.includes('strength') || msg.includes('character') || msg.includes('weak')));
    if (isWeakPwd) {
      return {
        status: 'failed',
        retryable: !hasCreatedAuthUser,
        needsReconciliation: hasCreatedAuthUser,
        category: 'password_policy',
      };
    }
    if (
      err.status === 422 ||
      code === 'validation_failed' ||
      code === 'email_address_invalid' ||
      code === 'email_address_not_authorized'
    ) {
      return {
        status: 'failed',
        retryable: !hasCreatedAuthUser,
        needsReconciliation: hasCreatedAuthUser,
        category: 'validation_non_duplicate',
      };
    }
    return {
      status: 'failed',
      retryable: !hasCreatedAuthUser,
      needsReconciliation: hasCreatedAuthUser,
      category: 'unknown',
    };
  }

  function simulateCompensatingRollbackDecision(params: {
    clearEmployeeError: { code?: string } | null;
    deleteAuthError: { message?: string } | null;
    getUserData: { user?: { id?: string } | null } | null;
    getUserError: { status?: number; code?: string; message?: string } | null;
    leftoverProfile: { id: string } | null;
    verifyProfileErr: { code?: string } | null;
  }) {
    let authStatus: 'confirmed_deleted' | 'still_exists' | 'uncertain' = 'uncertain';
    if (!params.deleteAuthError) {
      if (params.getUserData?.user) {
        authStatus = 'still_exists';
      } else if (params.getUserError) {
        const code = (params.getUserError.code || '').toLowerCase().trim();
        const msg = (params.getUserError.message || '').toLowerCase();
        if (params.getUserError.status === 404 || code === 'user_not_found' || msg.includes('not found')) {
          authStatus = 'confirmed_deleted';
        }
      }
    }

    if (
      params.clearEmployeeError ||
      params.deleteAuthError ||
      authStatus !== 'confirmed_deleted' ||
      params.verifyProfileErr ||
      params.leftoverProfile
    ) {
      return {
        status: 'reconciliation_required' as const,
        retryable: false,
        needsReconciliation: true,
        authStatus,
      };
    }
    return {
      status: 'failed' as const,
      retryable: true,
      needsReconciliation: false,
      authStatus,
    };
  }

  // 14. [MOCK/CONTRACT] HTTP 422 duplikat email
  await test('14. [Simulasi Kontrak EF] HTTP 422 dengan sinyal email duplikat dipetakan ke auth_exists (non-retryable)', () => {
    const res = simulateBulkCreateAuthErrorClassification({
      status: 422,
      code: 'email_exists',
      message: 'A user with this email address has already been registered',
    });
    assertEqual(res.status, 'auth_exists');
    assertEqual(res.retryable, false);
    assertEqual(res.needsReconciliation, false);
  });

  // 15. [MOCK/CONTRACT] HTTP 422 non-duplikat
  await test('15. [Simulasi Kontrak EF] HTTP 422 non-duplikat tidak diklasifikasikan sebagai auth_exists', () => {
    const res = simulateBulkCreateAuthErrorClassification({
      status: 422,
      code: 'email_address_invalid',
      message: 'Email address cannot be used for signup',
    });
    assertEqual(res.status, 'failed');
    assertEqual(res.retryable, true);
    assertEqual(res.category, 'validation_non_duplicate');
  });

  // 16. [MOCK/CONTRACT] Penolakan kebijakan password
  await test('16. [Simulasi Kontrak EF] Penolakan kebijakan password dipetakan ke failed & retryable hanya bila tidak ada Auth user tercipta', () => {
    const noUserRes = simulateBulkCreateAuthErrorClassification(
      {
        status: 422,
        code: 'weak_password',
        name: 'AuthWeakPasswordError',
        message: 'Password should be at least 8 characters',
      },
      false
    );
    assertEqual(noUserRes.status, 'failed');
    assertEqual(noUserRes.retryable, true);
    assertEqual(noUserRes.needsReconciliation, false);
    assertEqual(noUserRes.category, 'password_policy');

    const partialUserRes = simulateBulkCreateAuthErrorClassification(
      { status: 422, code: 'weak_password', message: 'Password weak' },
      true
    );
    assertEqual(partialUserRes.retryable, false);
    assertEqual(partialUserRes.needsReconciliation, true);
  });

  // 17. [MOCK/CONTRACT] Rollback Auth berhasil
  await test('17. [Simulasi Kontrak EF] Rollback kompensasi berhasil jika employees cleanup bersih, deleteUser sukses, getUserById 404/user_not_found, dan profiles bersih', () => {
    const res = simulateCompensatingRollbackDecision({
      clearEmployeeError: null,
      deleteAuthError: null,
      getUserData: { user: null },
      getUserError: { status: 404, code: 'user_not_found', message: 'User not found' },
      leftoverProfile: null,
      verifyProfileErr: null,
    });
    assertEqual(res.authStatus, 'confirmed_deleted');
    assertEqual(res.status, 'failed');
    assertEqual(res.retryable, true);
    assertEqual(res.needsReconciliation, false);
  });

  // 18. [MOCK/CONTRACT] Auth user masih ada setelah delete (meski profiles kosong)
  await test('18. [Simulasi Kontrak EF] Jika Auth user masih ditemukan di getUserById meski profiles kosong, status wajib reconciliation_required', () => {
    const res = simulateCompensatingRollbackDecision({
      clearEmployeeError: null,
      deleteAuthError: null,
      getUserData: { user: { id: 'orphan-auth-1' } },
      getUserError: null,
      leftoverProfile: null,
      verifyProfileErr: null,
    });
    assertEqual(res.authStatus, 'still_exists');
    assertEqual(res.status, 'reconciliation_required');
    assertEqual(res.retryable, false);
    assertEqual(res.needsReconciliation, true);
  });

  // 19. [MOCK/CONTRACT] Status Auth tidak dapat dipastikan
  await test('19. [Simulasi Kontrak EF] Jika pemeriksaan getUserById gagal atau ambigu (non-404), status wajib reconciliation_required', () => {
    const serverErrRes = simulateCompensatingRollbackDecision({
      clearEmployeeError: null,
      deleteAuthError: null,
      getUserData: null,
      getUserError: { status: 500, message: 'Internal GoTrue error' },
      leftoverProfile: null,
      verifyProfileErr: null,
    });
    assertEqual(serverErrRes.authStatus, 'uncertain');
    assertEqual(serverErrRes.status, 'reconciliation_required');
    assertEqual(serverErrRes.retryable, false);
    assertEqual(serverErrRes.needsReconciliation, true);

    const ambiguousEmptyRes = simulateCompensatingRollbackDecision({
      clearEmployeeError: null,
      deleteAuthError: null,
      getUserData: { user: null },
      getUserError: null,
      leftoverProfile: null,
      verifyProfileErr: null,
    });
    assertEqual(ambiguousEmptyRes.authStatus, 'uncertain');
    assertEqual(ambiguousEmptyRes.status, 'reconciliation_required');
    assertEqual(ambiguousEmptyRes.retryable, false);
  });

  // 20. [MOCK/CONTRACT] Kegagalan cleanup employees
  await test('20. [Simulasi Kontrak EF] Jika cleanup employees.update() mengembalikan error, rollback wajib ditandai reconciliation_required', () => {
    const res = simulateCompensatingRollbackDecision({
      clearEmployeeError: { code: '42501' },
      deleteAuthError: null,
      getUserData: { user: null },
      getUserError: { status: 404, code: 'user_not_found', message: 'User not found' },
      leftoverProfile: null,
      verifyProfileErr: null,
    });
    assertEqual(res.status, 'reconciliation_required');
    assertEqual(res.retryable, false);
    assertEqual(res.needsReconciliation, true);
  });

  // 21. [SKIP] Pembersihan password state saat modal ditutup parent
  await skipTest(
    '21. [Komponen React] EmployeeImportModal membersihkan batchPassword, konfirmasi, dan retryPassword saat isOpen menjadi false dari parent',
    'Infrastruktur DOM/React component testing (@testing-library/react & jsdom) tidak terpasang di workspace.'
  );

  // --------------------------------------------------------------------------
  // PENGUJIAN TERISOLASI HANDLER PRODUKSI AKTUAL (esbuild + mock client, BUKAN Deno CLI / live DB)
  // --------------------------------------------------------------------------
  interface MockEdgeScenario {
    upsertedProfile: Record<string, unknown> | null;
    profileUpsertError?: { code?: string; message?: string } | null;
    linkEmployeeResult?: { data: { id: string; profile_id: string } | null; error: { code?: string } | null };
    clearEmployeeError?: { code?: string } | null;
    deleteUserBehavior:
      | { type: 'ok' }
      | { type: 'error'; error: { status?: number; code?: string; message?: string } }
      | { type: 'throw'; error: Error };
    getUserByIdBehavior?:
      | { type: 'not_found' }
      | { type: 'still_exists' }
      | { type: 'error'; error: { status?: number; code?: string; message?: string } }
      | { type: 'throw'; error: Error };
    leftoverProfileBehavior:
      | { type: 'none' }
      | { type: 'exists' }
      | { type: 'error'; error: { code?: string; message?: string } }
      | { type: 'throw'; error: Error };
    concurrentLinkCheckBehavior?:
      | { type: 'not_linked' }
      | { type: 'linked'; profileId: string }
      | { type: 'error'; error: { code?: string; message?: string } }
      | { type: 'throw'; error: Error };
  }

  let activeEdgeScenario: MockEdgeScenario | null = null;
  let trackedEmployeeLinkUpdates = 0;
  let trackedDeleteUserCalls = 0;

  const efEntryPath = decodeURIComponent(
    new URL('../../supabase/functions/bulk-create-employee-accounts/index.ts', import.meta.url)
      .pathname
  );

  const builtEf = await esbuild.build({
    entryPoints: [efEntryPath],
    bundle: true,
    write: false,
    format: 'esm',
    plugins: [
      {
        name: 'mock-supabase-esm-for-bulk-create-test',
        setup(build) {
          build.onResolve({ filter: /^https:\/\/esm\.sh\/@supabase\/supabase-js/ }, (args) => ({
            path: args.path,
            namespace: 'mock-supabase-bulk-create',
          }));
          build.onLoad({ filter: /.*/, namespace: 'mock-supabase-bulk-create' }, () => ({
            contents:
              'export const createClient = (...args) => globalThis.__tamakiTestCreateClient(...args);',
            loader: 'js',
          }));
        },
      },
    ],
  });

  const testEmployeeId = '11111111-1111-4111-8111-111111111111';
  const testCreatedAuthUserId = '22222222-2222-4222-8222-222222222222';

  const g = globalThis as Record<string, unknown>;
  g.__tamakiTestCreateClient = () => ({
    auth: {
      getUser: async () => ({
        data: { user: { id: 'admin-test-1', email: 'admin@sekolah.sch.id' } },
        error: null,
      }),
      admin: {
        createUser: async () => ({
          data: { user: { id: testCreatedAuthUserId, email: 'guru@sekolah.sch.id' } },
          error: null,
        }),
        deleteUser: async () => {
          trackedDeleteUserCalls++;
          const sc = activeEdgeScenario!;
          if (sc.deleteUserBehavior.type === 'throw') {
            throw sc.deleteUserBehavior.error;
          }
          if (sc.deleteUserBehavior.type === 'error') {
            return { data: { user: null }, error: sc.deleteUserBehavior.error };
          }
          return { data: { user: null }, error: null };
        },
        getUserById: async () => {
          const sc = activeEdgeScenario!;
          const b = sc.getUserByIdBehavior ?? { type: 'not_found' };
          if (b.type === 'throw') throw b.error;
          if (b.type === 'still_exists') {
            return { data: { user: { id: testCreatedAuthUserId } }, error: null };
          }
          if (b.type === 'error') {
            return { data: { user: null }, error: b.error };
          }
          return {
            data: { user: null },
            error: { status: 404, code: 'user_not_found', message: 'User not found' },
          };
        },
      },
    },
    from: (table: string) => {
      if (table === 'profiles') {
        return {
          select: (columns?: string) => ({
            eq: (_col: string, idVal: string) => ({
              single: async () => {
                if (idVal === 'admin-test-1') {
                  return {
                    data: { id: 'admin-test-1', role: 'admin', is_active: true },
                    error: null,
                  };
                }
                return { data: null, error: { code: 'PGRST116' } };
              },
              maybeSingle: async () => {
                const sc = activeEdgeScenario!;
                if (columns === 'id') {
                  if (sc.leftoverProfileBehavior.type === 'throw') {
                    throw sc.leftoverProfileBehavior.error;
                  }
                  if (sc.leftoverProfileBehavior.type === 'error') {
                    return { data: null, error: sc.leftoverProfileBehavior.error };
                  }
                  if (sc.leftoverProfileBehavior.type === 'exists') {
                    return { data: { id: testCreatedAuthUserId }, error: null };
                  }
                  return { data: null, error: null };
                }
                return { data: null, error: null };
              },
            }),
          }),
          upsert: () => ({
            select: () => ({
              maybeSingle: async () => {
                const sc = activeEdgeScenario!;
                return {
                  data: sc.upsertedProfile,
                  error: sc.profileUpsertError ?? null,
                };
              },
            }),
          }),
        };
      }

      if (table === 'employees') {
        return {
          select: () => ({
            in: async () => ({
              data: [
                {
                  id: testEmployeeId,
                  full_name: 'Guru Uji',
                  email: 'guru@sekolah.sch.id',
                  status: 'active',
                  profile_id: null,
                },
              ],
              error: null,
            }),
            eq: () => ({
              maybeSingle: async () => {
                const behavior = activeEdgeScenario?.concurrentLinkCheckBehavior ?? {
                  type: 'not_linked',
                };
                if (behavior.type === 'throw') {
                  throw behavior.error;
                }
                if (behavior.type === 'error') {
                  return { data: null, error: behavior.error };
                }
                if (behavior.type === 'linked') {
                  return { data: { profile_id: behavior.profileId }, error: null };
                }
                return { data: { profile_id: null }, error: null };
              },
            }),
          }),
          update: (payload: Record<string, unknown>) => {
            if (payload.profile_id === null) {
              return {
                eq: () => ({
                  eq: async () => ({
                    error: activeEdgeScenario?.clearEmployeeError ?? null,
                  }),
                }),
              };
            }
            trackedEmployeeLinkUpdates++;
            return {
              eq: () => ({
                is: () => ({
                  select: () => ({
                    maybeSingle: async () =>
                      activeEdgeScenario?.linkEmployeeResult ?? {
                        data: null,
                        error: { code: '500' },
                      },
                  }),
                }),
              }),
            };
          },
        };
      }

      if (table === 'audit_logs') {
        return {
          insert: async () => ({ data: null, error: null }),
        };
      }

      throw new Error(`Unexpected table access in test: ${table}`);
    },
  });

  let actualEdgeHandler: ((req: Request) => Promise<Response>) | null = null;
  const previousDeno = g.Deno;
  g.Deno = {
    env: {
      get: (key: string) => {
        if (key === 'SUPABASE_URL') return 'https://example.supabase.co';
        if (key === 'SUPABASE_ANON_KEY') return 'anon-test-key';
        if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'service-test-key';
        return undefined;
      },
    },
    serve: (handler: (req: Request) => Promise<Response>) => {
      actualEdgeHandler = handler;
    },
  };

  try {
    const jsBytes = new TextEncoder().encode(builtEf.outputFiles[0].text);
    let binaryStr = '';
    for (let i = 0; i < jsBytes.length; i++) {
      binaryStr += String.fromCharCode(jsBytes[i]);
    }
    const efDataUrl = `data:text/javascript;base64,${btoa(binaryStr)}`;
    await import(/* @vite-ignore */ efDataUrl);
  } finally {
    if (previousDeno === undefined) {
      delete g.Deno;
    } else {
      g.Deno = previousDeno;
    }
  }

  async function invokeActualEdgeHandler(scenario: MockEdgeScenario) {
    assertTrue(
      typeof actualEdgeHandler === 'function',
      'Handler Edge Function aktual harus terdaftar dari Deno.serve'
    );
    activeEdgeScenario = scenario;
    trackedEmployeeLinkUpdates = 0;
    trackedDeleteUserCalls = 0;

    // Ensure Deno.env remains available during handler execution
    const prevDenoInInvoke = g.Deno;
    g.Deno = {
      env: {
        get: (key: string) => {
          if (key === 'SUPABASE_URL') return 'https://example.supabase.co';
          if (key === 'SUPABASE_ANON_KEY') return 'anon-test-key';
          if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'service-test-key';
          return undefined;
        },
      },
    };

    try {
      const testBatchPassword = 'TamakiBatchSecret123';
      const req = new Request('http://localhost/functions/v1/bulk-create-employee-accounts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer test-caller-jwt',
          Origin: 'http://localhost:3000',
        },
        body: JSON.stringify({
          employeeIds: [testEmployeeId],
          password: testBatchPassword,
        }),
      });
      const res = await actualEdgeHandler!(req);
      const rawBody = await res.text();
      assertTrue(
        !rawBody.includes(testBatchPassword),
        'Response Edge Function tidak boleh membocorkan password batch'
      );
      return {
        httpStatus: res.status,
        body: JSON.parse(rawBody) as BulkCreateEmployeeAccountsChunkResponse,
        employeeLinkAttempts: trackedEmployeeLinkUpdates,
        deleteUserCalls: trackedDeleteUserCalls,
      };
    } finally {
      if (prevDenoInInvoke === undefined) {
        delete g.Deno;
      } else {
        g.Deno = prevDenoInInvoke;
      }
    }
  }

  // 22. Actual EF: deleteUser() mengembalikan { error } -> reconciliation_required
  await test('22. [Handler Aktual EF] deleteUser() mengembalikan error menghasilkan reconciliation_required dan non-retryable', async () => {
    const out = await invokeActualEdgeHandler({
      upsertedProfile: {
        id: testCreatedAuthUserId,
        role: 'employee',
        is_active: true,
        must_change_password: true,
      },
      linkEmployeeResult: { data: null, error: { code: '23505' } },
      deleteUserBehavior: { type: 'error', error: { status: 500, message: 'Auth delete failed' } },
      leftoverProfileBehavior: { type: 'none' },
    });

    assertEqual(out.httpStatus, 200);
    assertEqual(out.deleteUserCalls, 1);
    assertEqual(out.body.reconciliationRequiredCount, 1);
    assertEqual(out.body.results[0].status, 'reconciliation_required');
    assertEqual(out.body.results[0].retryable, false);
    assertEqual(out.body.results[0].needsReconciliation, true);
  });

  // 23. Actual EF: deleteUser() melempar exception -> tertangkap try/catch -> reconciliation_required
  await test('23. [Handler Aktual EF] deleteUser() melempar exception tertangkap lokal dan menghasilkan reconciliation_required', async () => {
    const out = await invokeActualEdgeHandler({
      upsertedProfile: {
        id: testCreatedAuthUserId,
        role: 'employee',
        is_active: true,
        must_change_password: true,
      },
      linkEmployeeResult: { data: null, error: { code: '500' } },
      deleteUserBehavior: { type: 'throw', error: new Error('Unexpected fetch crash') },
      leftoverProfileBehavior: { type: 'none' },
    });

    assertEqual(out.httpStatus, 200);
    assertEqual(out.deleteUserCalls, 1);
    assertEqual(out.body.reconciliationRequiredCount, 1);
    assertEqual(out.body.results[0].status, 'reconciliation_required');
    assertEqual(out.body.results[0].retryable, false);
    assertEqual(out.body.results[0].needsReconciliation, true);
  });

  // 24. Actual EF: profiles.select() mengembalikan { error } -> reconciliation_required
  await test('24. [Handler Aktual EF] Pemeriksaan profiles.select() mengembalikan error menghasilkan reconciliation_required', async () => {
    const out = await invokeActualEdgeHandler({
      upsertedProfile: {
        id: testCreatedAuthUserId,
        role: 'employee',
        is_active: true,
        must_change_password: true,
      },
      linkEmployeeResult: { data: null, error: { code: '500' } },
      deleteUserBehavior: { type: 'ok' },
      getUserByIdBehavior: { type: 'not_found' },
      leftoverProfileBehavior: { type: 'error', error: { code: '42501', message: 'DB error' } },
    });

    assertEqual(out.httpStatus, 200);
    assertEqual(out.body.reconciliationRequiredCount, 1);
    assertEqual(out.body.results[0].status, 'reconciliation_required');
    assertEqual(out.body.results[0].retryable, false);
    assertEqual(out.body.results[0].needsReconciliation, true);
  });

  // 25. Actual EF: profiles.select() melempar exception -> reconciliation_required
  await test('25. [Handler Aktual EF] Pemeriksaan profiles.select() melempar exception tertangkap lokal dan menghasilkan reconciliation_required', async () => {
    const out = await invokeActualEdgeHandler({
      upsertedProfile: {
        id: testCreatedAuthUserId,
        role: 'employee',
        is_active: true,
        must_change_password: true,
      },
      linkEmployeeResult: { data: null, error: { code: '500' } },
      deleteUserBehavior: { type: 'ok' },
      getUserByIdBehavior: { type: 'not_found' },
      leftoverProfileBehavior: { type: 'throw', error: new Error('Network socket reset') },
    });

    assertEqual(out.httpStatus, 200);
    assertEqual(out.body.reconciliationRequiredCount, 1);
    assertEqual(out.body.results[0].status, 'reconciliation_required');
    assertEqual(out.body.results[0].retryable, false);
    assertEqual(out.body.results[0].needsReconciliation, true);
  });

  // 26. Actual EF: rollback bersih hanya jika deleteUser, getUserById 404, dan profiles kosong terverifikasi
  await test('26. [Handler Aktual EF] Rollback menghasilkan failed + retryable: true hanya saat deleteUser, getUserById 404, dan profiles bersih terverifikasi', async () => {
    const cleanOut = await invokeActualEdgeHandler({
      upsertedProfile: {
        id: testCreatedAuthUserId,
        role: 'employee',
        is_active: true,
        must_change_password: true,
      },
      linkEmployeeResult: { data: null, error: { code: '500' } },
      deleteUserBehavior: { type: 'ok' },
      getUserByIdBehavior: { type: 'not_found' },
      leftoverProfileBehavior: { type: 'none' },
    });

    assertEqual(cleanOut.httpStatus, 200);
    assertEqual(cleanOut.body.failedCount, 1);
    assertEqual(cleanOut.body.reconciliationRequiredCount, 0);
    assertEqual(cleanOut.body.results[0].status, 'failed');
    assertEqual(cleanOut.body.results[0].retryable, true);
    assertEqual(cleanOut.body.results[0].needsReconciliation, false);

    // Jika profiles ada sisa baris meski getUserById 404 -> wajib reconciliation_required
    const leftoverOut = await invokeActualEdgeHandler({
      upsertedProfile: {
        id: testCreatedAuthUserId,
        role: 'employee',
        is_active: true,
        must_change_password: true,
      },
      linkEmployeeResult: { data: null, error: { code: '500' } },
      deleteUserBehavior: { type: 'ok' },
      getUserByIdBehavior: { type: 'not_found' },
      leftoverProfileBehavior: { type: 'exists' },
    });

    assertEqual(leftoverOut.body.results[0].status, 'reconciliation_required');
    assertEqual(leftoverOut.body.results[0].retryable, false);
  });

  // 27. Actual EF: upsertedProfile.is_active === false membatalkan linking dan memicu rollback
  await test('27. [Handler Aktual EF] upsertedProfile.is_active === false membatalkan linking ke employees dan menjalankan rollback', async () => {
    const cleanRollbackOut = await invokeActualEdgeHandler({
      upsertedProfile: {
        id: testCreatedAuthUserId,
        role: 'employee',
        is_active: false,
        must_change_password: true,
      },
      linkEmployeeResult: {
        data: { id: testEmployeeId, profile_id: testCreatedAuthUserId },
        error: null,
      },
      deleteUserBehavior: { type: 'ok' },
      getUserByIdBehavior: { type: 'not_found' },
      leftoverProfileBehavior: { type: 'none' },
    });

    assertEqual(
      cleanRollbackOut.employeeLinkAttempts,
      0,
      'Linking ke employees tidak boleh dijalankan bila is_active === false'
    );
    assertEqual(cleanRollbackOut.deleteUserCalls, 1, 'Rollback Auth wajib dijalankan');
    assertEqual(cleanRollbackOut.body.results[0].status, 'failed');
    assertEqual(cleanRollbackOut.body.results[0].retryable, true);

    const uncertainRollbackOut = await invokeActualEdgeHandler({
      upsertedProfile: {
        id: testCreatedAuthUserId,
        role: 'employee',
        is_active: false,
        must_change_password: true,
      },
      deleteUserBehavior: { type: 'throw', error: new Error('deleteUser failure') },
      leftoverProfileBehavior: { type: 'none' },
    });

    assertEqual(uncertainRollbackOut.employeeLinkAttempts, 0);
    assertEqual(uncertainRollbackOut.body.results[0].status, 'reconciliation_required');
    assertEqual(uncertainRollbackOut.body.results[0].retryable, false);
  });

  // 28. Actual EF: upsertedProfile.is_active undefined/null/non-boolean membatalkan linking & rollback
  await test('28. [Handler Aktual EF] upsertedProfile.is_active undefined, null, atau bukan boolean true membatalkan linking dan menjalankan rollback', async () => {
    for (const invalidIsActive of [undefined, null, 'true', 1]) {
      const profilePayload: Record<string, unknown> = {
        id: testCreatedAuthUserId,
        role: 'employee',
        must_change_password: true,
      };
      if (invalidIsActive !== undefined) {
        profilePayload.is_active = invalidIsActive;
      }

      const out = await invokeActualEdgeHandler({
        upsertedProfile: profilePayload,
        linkEmployeeResult: {
          data: { id: testEmployeeId, profile_id: testCreatedAuthUserId },
          error: null,
        },
        deleteUserBehavior: { type: 'ok' },
        getUserByIdBehavior: { type: 'not_found' },
        leftoverProfileBehavior: { type: 'none' },
      });

      assertEqual(
        out.employeeLinkAttempts,
        0,
        `Linking harus dibatalkan ketika is_active = ${String(invalidIsActive)}`
      );
      assertEqual(out.deleteUserCalls, 1, 'Rollback Auth wajib dijalankan');
      assertEqual(out.body.results[0].status, 'failed');
    }
  });

  // 29. Actual EF: checkConcurrentLink berhasil dan pegawai sudah terhubung -> already_linked
  await test('29. [Handler Aktual EF] checkConcurrentLink berhasil dan pegawai sudah terhubung mengembalikan already_linked', async () => {
    const concurrentProfileId = '99999999-9999-4999-8999-999999999999';
    const out = await invokeActualEdgeHandler({
      upsertedProfile: {
        id: testCreatedAuthUserId,
        role: 'employee',
        is_active: true,
        must_change_password: true,
      },
      linkEmployeeResult: { data: null, error: null },
      deleteUserBehavior: { type: 'ok' },
      getUserByIdBehavior: { type: 'not_found' },
      leftoverProfileBehavior: { type: 'none' },
      concurrentLinkCheckBehavior: { type: 'linked', profileId: concurrentProfileId },
    });

    assertEqual(out.httpStatus, 200);
    assertEqual(out.deleteUserCalls, 1);
    assertEqual(out.body.alreadyLinkedCount, 1);
    assertEqual(out.body.failedCount, 0);
    assertEqual(out.body.reconciliationRequiredCount, 0);
    assertEqual(out.body.results[0].status, 'already_linked');
    assertEqual(out.body.results[0].profileId, concurrentProfileId);
    assertEqual(out.body.results[0].retryable, false);
    assertEqual(out.body.results[0].needsReconciliation, false);
  });

  // 30. Actual EF: checkConcurrentLink berhasil dan pegawai belum terhubung -> failed retryable: true
  await test('30. [Handler Aktual EF] checkConcurrentLink berhasil dan pegawai belum terhubung mengembalikan failed dengan retryable: true', async () => {
    const out = await invokeActualEdgeHandler({
      upsertedProfile: {
        id: testCreatedAuthUserId,
        role: 'employee',
        is_active: true,
        must_change_password: true,
      },
      linkEmployeeResult: { data: null, error: null },
      deleteUserBehavior: { type: 'ok' },
      getUserByIdBehavior: { type: 'not_found' },
      leftoverProfileBehavior: { type: 'none' },
      concurrentLinkCheckBehavior: { type: 'not_linked' },
    });

    assertEqual(out.httpStatus, 200);
    assertEqual(out.deleteUserCalls, 1);
    assertEqual(out.body.failedCount, 1);
    assertEqual(out.body.alreadyLinkedCount, 0);
    assertEqual(out.body.reconciliationRequiredCount, 0);
    assertEqual(out.body.results[0].status, 'failed');
    assertEqual(out.body.results[0].profileId, null);
    assertEqual(out.body.results[0].retryable, true);
    assertEqual(out.body.results[0].needsReconciliation, false);
  });

  // 31. Actual EF: checkConcurrentLink mengembalikan error -> failed non-retryable, bukan already_linked, bukan reconciliation_required
  await test('31. [Handler Aktual EF] checkConcurrentLink mengembalikan error menghasilkan failed non-retryable dan tidak mengklaim already_linked', async () => {
    const out = await invokeActualEdgeHandler({
      upsertedProfile: {
        id: testCreatedAuthUserId,
        role: 'employee',
        is_active: true,
        must_change_password: true,
      },
      linkEmployeeResult: { data: null, error: null },
      deleteUserBehavior: { type: 'ok' },
      getUserByIdBehavior: { type: 'not_found' },
      leftoverProfileBehavior: { type: 'none' },
      concurrentLinkCheckBehavior: {
        type: 'error',
        error: { code: 'PGRST000', message: 'Sensitive DB detail should not leak' },
      },
    });

    assertEqual(out.httpStatus, 200);
    assertEqual(out.deleteUserCalls, 1);
    assertEqual(out.body.failedCount, 1);
    assertEqual(out.body.alreadyLinkedCount, 0);
    assertEqual(out.body.reconciliationRequiredCount, 0);
    assertEqual(out.body.results[0].status, 'failed');
    assertEqual(out.body.results[0].profileId, null);
    assertEqual(out.body.results[0].retryable, false);
    assertEqual(out.body.results[0].needsReconciliation, false);
    assertTrue(
      !out.body.results[0].message.includes('Sensitive DB detail'),
      'Detail error database mentah tidak boleh bocor ke pesan hasil'
    );
    assertTrue(
      !out.body.results[0].message.toLowerCase().includes('aman untuk dicoba lagi'),
      'Pesan tidak boleh mengklaim percobaan ulang aman bila status keterkaitan gagal diperiksa'
    );
  });

  // 32. Actual EF: checkConcurrentLink melempar exception -> tertangkap lokal, failed non-retryable
  await test('32. [Handler Aktual EF] checkConcurrentLink melempar exception tertangkap lokal dan menghasilkan failed non-retryable', async () => {
    const out = await invokeActualEdgeHandler({
      upsertedProfile: {
        id: testCreatedAuthUserId,
        role: 'employee',
        is_active: true,
        must_change_password: true,
      },
      linkEmployeeResult: { data: null, error: null },
      deleteUserBehavior: { type: 'ok' },
      getUserByIdBehavior: { type: 'not_found' },
      leftoverProfileBehavior: { type: 'none' },
      concurrentLinkCheckBehavior: {
        type: 'throw',
        error: new Error('Unexpected concurrent link socket exception'),
      },
    });

    assertEqual(out.httpStatus, 200);
    assertEqual(out.deleteUserCalls, 1);
    assertEqual(out.body.failedCount, 1);
    assertEqual(out.body.alreadyLinkedCount, 0);
    assertEqual(out.body.reconciliationRequiredCount, 0);
    assertEqual(out.body.results[0].status, 'failed');
    assertEqual(out.body.results[0].profileId, null);
    assertEqual(out.body.results[0].retryable, false);
    assertEqual(out.body.results[0].needsReconciliation, false);
    assertTrue(
      !out.body.results[0].message.includes('Unexpected concurrent link socket exception'),
      'Pesan exception mentah tidak boleh bocor ke pesan hasil'
    );
    assertTrue(
      !out.body.results[0].message.toLowerCase().includes('aman untuk dicoba lagi'),
      'Pesan tidak boleh mengklaim percobaan ulang aman bila pemeriksaan keterkaitan melempar exception'
    );
  });

  // --------------------------------------------------------------------------
  // PENGUJIAN PENANGANAN HTTP ERROR PER CHUNK & LABEL STATUS RETRYABLE (33-37)
  // --------------------------------------------------------------------------
  function makeTargets(count: number) {
    return Array.from({ length: count }, (_, i) => ({
      employeeId: `emp-${i + 1}`,
      fullName: `Pegawai ${i + 1}`,
      email: `pegawai${i + 1}@sekolah.sch.id`,
    }));
  }

  function makeChunkSuccessResponse(chunkIds: string[]): BulkCreateEmployeeAccountsChunkResponse {
    return {
      success: true,
      message: 'OK',
      totalProcessed: chunkIds.length,
      createdCount: chunkIds.length,
      alreadyLinkedCount: 0,
      authExistsCount: 0,
      ineligibleCount: 0,
      failedCount: 0,
      reconciliationRequiredCount: 0,
      results: chunkIds.map((id) => ({
        employeeId: id,
        fullName: `Pegawai ${id}`,
        email: `${id}@sekolah.sch.id`,
        status: 'created',
        profileId: `prof-${id}`,
        retryable: false,
        needsReconciliation: false,
        message: 'Akun dibuat.',
      })),
    };
  }

  // 33. HTTP 401 menghentikan chunk berikutnya, mempertahankan chunk 1, non-retryable, chunk 3 tidak dianggap diproses
  await test('33. HTTP 401 menghentikan chunk berikutnya, mempertahankan chunk 1, menandai non-retryable, dan tidak menandai chunk belum dikirim sebagai gagal/diproses', async () => {
    const targets = makeTargets(45); // 3 chunks: 20, 20, 5
    const invokedChunks: string[][] = [];

    const summary = await executeBulkAccountCreationInChunks(
      targets,
      'TamakiPass123',
      async (chunkIds) => {
        invokedChunks.push(chunkIds);
        if (invokedChunks.length === 2) {
          const http401 = new FunctionsHttpError(
            new Response(
              JSON.stringify({
                success: false,
                message: 'Sesi autentikasi telah kedaluwarsa atau tidak valid.',
              }),
              { status: 401, headers: { 'Content-Type': 'application/json' } }
            )
          );
          return parseBulkAccountChunkInvokeResult(null, http401);
        }
        return makeChunkSuccessResponse(chunkIds);
      },
      { chunkSize: 20 }
    );

    assertEqual(invokedChunks.length, 2, 'Chunk ke-3 tidak boleh dikirim setelah HTTP 401');
    assertEqual(summary.createdCount, 20, '20 akun chunk 1 tetap tercatat berhasil');
    assertEqual(summary.failedCount, 20, 'Hanya 20 pegawai chunk 2 yang tercatat gagal');
    assertEqual(summary.totalAttempted, 40, 'Pegawai chunk 3 tidak boleh tercatat telah diproses');
    assertEqual(summary.completedChunks, 2);
    assertEqual(summary.totalChunks, 3);
    assertEqual(summary.chunkErrors.length, 1);
    assertTrue(
      summary.chunkErrors[0].message.toLowerCase().includes('login ulang'),
      'Pesan 401 wajib mengarahkan admin untuk login ulang'
    );
    assertEqual(summary.resultsByEmployeeId['emp-21'].retryable, false, '401 harus non-retryable');
    assertEqual(summary.resultsByEmployeeId['emp-41'], undefined, 'Chunk ke-3 tidak boleh ada di resultsByEmployeeId');
    assertEqual(getRetryableEmployeeIds(summary).length, 0, '401 tidak boleh masuk daftar retry');
  });

  // 34. HTTP 403 menghentikan chunk berikutnya, mempertahankan chunk 1, non-retryable, pesan izin
  await test('34. HTTP 403 menghentikan chunk berikutnya, menandai non-retryable, dan menjelaskan pengguna tidak memiliki izin', async () => {
    const targets = makeTargets(45);
    const invokedChunks: string[][] = [];

    const summary = await executeBulkAccountCreationInChunks(
      targets,
      'TamakiPass123',
      async (chunkIds) => {
        invokedChunks.push(chunkIds);
        if (invokedChunks.length === 2) {
          const http403 = new FunctionsHttpError(
            new Response(
              JSON.stringify({ success: false, message: 'Akses ditolak.' }),
              { status: 403, headers: { 'Content-Type': 'application/json' } }
            )
          );
          return parseBulkAccountChunkInvokeResult(null, http403);
        }
        return makeChunkSuccessResponse(chunkIds);
      },
      { chunkSize: 20 }
    );

    assertEqual(invokedChunks.length, 2, 'Chunk ke-3 tidak boleh dikirim setelah HTTP 403');
    assertEqual(summary.createdCount, 20);
    assertEqual(summary.failedCount, 20);
    assertEqual(summary.totalAttempted, 40);
    assertEqual(summary.resultsByEmployeeId['emp-21'].retryable, false, '403 harus non-retryable');
    assertEqual(summary.resultsByEmployeeId['emp-45'], undefined, 'Chunk ke-3 tidak boleh dilaporkan diproses');
    assertTrue(
      summary.chunkErrors[0].message.toLowerCase().includes('izin'),
      'Pesan 403 wajib menjelaskan akun tidak memiliki izin'
    );
    assertEqual(getRetryableEmployeeIds(summary).length, 0);
  });

  // 35. HTTP 400 menghentikan chunk berikutnya untuk validasi request permanen, non-retryable
  await test('35. HTTP 400 menghentikan chunk berikutnya, menandai non-retryable, dan tidak membocorkan detail internal', async () => {
    const targets = makeTargets(45);
    const invokedChunks: string[][] = [];

    const summary = await executeBulkAccountCreationInChunks(
      targets,
      'TamakiPass123',
      async (chunkIds) => {
        invokedChunks.push(chunkIds);
        if (invokedChunks.length === 2) {
          const http400 = new FunctionsHttpError(
            new Response(
              JSON.stringify({
                success: false,
                message: 'Terdapat employeeId dengan format UUID tidak valid.',
              }),
              { status: 400, headers: { 'Content-Type': 'application/json' } }
            )
          );
          return parseBulkAccountChunkInvokeResult(null, http400);
        }
        return makeChunkSuccessResponse(chunkIds);
      },
      { chunkSize: 20 }
    );

    assertEqual(invokedChunks.length, 2, 'Chunk ke-3 tidak boleh dikirim setelah HTTP 400');
    assertEqual(summary.createdCount, 20);
    assertEqual(summary.failedCount, 20);
    assertEqual(summary.totalAttempted, 40);
    assertEqual(summary.resultsByEmployeeId['emp-21'].retryable, false, '400 harus non-retryable');
    assertEqual(summary.resultsByEmployeeId['emp-41'], undefined, 'Chunk ke-3 belum diproses');
    assertEqual(
      summary.chunkErrors[0].message,
      'Terdapat employeeId dengan format UUID tidak valid.'
    );
    assertEqual(getRetryableEmployeeIds(summary).length, 0);
  });

  // 36. HTTP 500 & gangguan jaringan tetap menjaga perilaku penanganan error tanpa pengulangan otomatis
  await test('36. HTTP 500 dan gangguan jaringan tetap mencatat kegagalan chunk tanpa mengulang chunk secara otomatis', async () => {
    const targets = makeTargets(45); // 3 chunks
    const invoked500: string[][] = [];

    const summary500 = await executeBulkAccountCreationInChunks(
      targets,
      'TamakiPass123',
      async (chunkIds) => {
        invoked500.push(chunkIds);
        if (invoked500.length === 2) {
          const http500 = new FunctionsHttpError(
            new Response('Internal Server Error', { status: 500 })
          );
          return parseBulkAccountChunkInvokeResult(null, http500);
        }
        return makeChunkSuccessResponse(chunkIds);
      },
      { chunkSize: 20 }
    );

    assertEqual(invoked500.length, 3, 'Setiap chunk hanya dipanggil tepat 1x (tanpa auto-retry)');
    assertEqual(summary500.createdCount, 25, 'Chunk 1 (20) dan chunk 3 (5) berhasil dipertahankan');
    assertEqual(summary500.failedCount, 20, 'Chunk 2 gagal');
    assertEqual(summary500.chunkErrors.length, 1);

    const invokedFetchErr: string[][] = [];
    const summaryFetch = await executeBulkAccountCreationInChunks(
      makeTargets(25),
      'TamakiPass123',
      async (chunkIds) => {
        invokedFetchErr.push(chunkIds);
        if (invokedFetchErr.length === 2) {
          return parseBulkAccountChunkInvokeResult(
            null,
            new FunctionsFetchError(new Error('Failed to fetch'))
          );
        }
        return makeChunkSuccessResponse(chunkIds);
      },
      { chunkSize: 20 }
    );

    assertEqual(invokedFetchErr.length, 2, 'Gangguan jaringan tidak memicu auto-retry');
    assertEqual(summaryFetch.createdCount, 20);
    assertEqual(summaryFetch.failedCount, 5);
    assertTrue(
      summaryFetch.chunkErrors[0].message.toLowerCase().includes('jaringan'),
      'FunctionsFetchError menghasilkan pesan jaringan yang aman'
    );
  });

  // 37. Label status gagal berbeda berdasarkan retryable pada badge UI dan ekspor Excel + deduplikasi banner
  await test('37. Label status failed membedakan retryable true dan false secara konsisten pada badge UI dan ekspor Excel', () => {
    const badgeRetryable = getBulkAccountStatusBadge('failed', true);
    const badgeInspect = getBulkAccountStatusBadge('failed', false);

    assertEqual(badgeRetryable.label, 'Gagal (Bisa Ulang)');
    assertEqual(badgeInspect.label, 'Gagal (Perlu Periksa)');
    assertEqual(getBulkAccountStatusLabel('failed', true), 'Gagal (Bisa Ulang)');
    assertEqual(getBulkAccountStatusLabel('failed', false), 'Gagal (Perlu Periksa)');

    const importRows = [
      {
        excelRowNumber: 2,
        fullName: 'Pegawai Retryable',
        email: 'retry@sekolah.sch.id',
        status: 'imported' as const,
        employeeId: 'emp-retry',
        employeeStatus: 'active' as const,
        existsInAuth: false,
        warnings: [],
        errorReason: null,
      },
      {
        excelRowNumber: 3,
        fullName: 'Pegawai Perlu Periksa',
        email: 'inspect@sekolah.sch.id',
        status: 'imported' as const,
        employeeId: 'emp-inspect',
        employeeStatus: 'active' as const,
        existsInAuth: false,
        warnings: [],
        errorReason: null,
      },
      {
        excelRowNumber: 4,
        fullName: 'Pegawai Belum Dikirim',
        email: 'unsent@sekolah.sch.id',
        status: 'imported' as const,
        employeeId: 'emp-unsent',
        employeeStatus: 'active' as const,
        existsInAuth: false,
        warnings: [],
        errorReason: null,
      },
    ];

    const accSummary = aggregateBulkAccountResults(
      null,
      [
        {
          employeeId: 'emp-retry',
          fullName: 'Pegawai Retryable',
          email: 'retry@sekolah.sch.id',
          status: 'failed',
          profileId: null,
          retryable: true,
          needsReconciliation: false,
          message: 'Timeout sementara.',
        },
        {
          employeeId: 'emp-inspect',
          fullName: 'Pegawai Perlu Periksa',
          email: 'inspect@sekolah.sch.id',
          status: 'failed',
          profileId: null,
          retryable: false,
          needsReconciliation: false,
          message: 'Sesi tidak valid (HTTP 401).',
        },
      ],
      1,
      2,
      {
        chunkIndex: 1,
        employeeIds: ['emp-inspect'],
        message: 'Sesi login Anda tidak valid atau telah kedaluwarsa.',
      }
    );

    // Logika getRetryableEmployeeIds tetap hanya memasukkan retryable: true
    assertDeepEqual(getRetryableEmployeeIds(accSummary), ['emp-retry']);

    // Deduplikasi pesan chunkErrors untuk banner modal
    const deduped = deduplicateChunkErrorMessages([
      { chunkIndex: 1, employeeIds: ['emp-1'], message: 'Sesi kedaluwarsa' },
      { chunkIndex: 2, employeeIds: ['emp-2'], message: 'Sesi kedaluwarsa' },
    ]);
    assertDeepEqual(deduped, ['Sesi kedaluwarsa']);

    // Verifikasi ekspor Excel menggunakan mergeAccountResultsIntoImportSummary (2 arg) & 3 arg
    const merged = mergeAccountResultsIntoImportSummary(importRows, accSummary);
    const excelRowsViaMerged = buildImportResultReportRows(merged);
    assertEqual(excelRowsViaMerged[0]['Status Pembuatan Akun'], 'Gagal (Bisa Ulang)');
    assertEqual(excelRowsViaMerged[1]['Status Pembuatan Akun'], 'Gagal (Perlu Periksa)');
    assertEqual(
      excelRowsViaMerged[2]['Status Pembuatan Akun'],
      'Tidak Dipilih / Tidak Diproses'
    );

    const excelRowsViaSummary = buildImportResultReportRows(merged, accSummary);
    assertEqual(excelRowsViaSummary[0]['Status Pembuatan Akun'], 'Gagal (Bisa Ulang)');
    assertEqual(excelRowsViaSummary[1]['Status Pembuatan Akun'], 'Gagal (Perlu Periksa)');
  });


  console.log('\n------------------------------------------------------');
  console.log(
    `Ringkasan Tes: ${passedTests} Lulus, ${failedTests} Gagal, ${skippedTests} Dilewati (Total ${passedTests + failedTests + skippedTests})`
  );
  console.log('------------------------------------------------------\n');

  if (failedTests > 0) {
    throw new Error(`${failedTests} pengujian gagal.`);
  }
}

runTests();
