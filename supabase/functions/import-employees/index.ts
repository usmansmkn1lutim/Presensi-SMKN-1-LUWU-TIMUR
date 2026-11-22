// ============================================================================
// Supabase Edge Function: import-employees
// Description:
//   Server-side partial bulk employee importer for Tamaki.
//   Security & integrity guarantees:
//     - Strict CORS origin allowlist
//     - Verifies caller JWT and authoritative active Admin/Super Admin profile
//     - Uses SUPABASE_SERVICE_ROLE_KEY strictly on server
//     - Re-validates all 13 fields on server (max 500 rows per request)
//     - Pure INSERT per row (NO upsert, NO update of existing employees)
//     - Forces profile_id = null; DB generates id, created_at, updated_at
//     - Maps department/position names strictly against existing master data;
//       missing or inactive master data sets FK = null with warning (never creates/reactivates)
//     - Handles PostgreSQL unique/check constraint failures per row so valid rows
//       remain imported while invalid rows report original excelRowNumber + reason
//     - Writes exactly 1 summary audit log per executed import session (no full workbook stored)
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

const ALLOWED_ORIGINS = [
  'https://ais-dev-tezldmbtiuugsm3lvw4wdk-70461058593.asia-southeast1.run.app',
  'https://ais-pre-tezldmbtiuugsm3lvw4wdk-70461058593.asia-southeast1.run.app',
  'https://presensismkn1luwutimur.vercel.app',
];

const MAX_IMPORT_ROWS = 500;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const OFFICIAL_EMPLOYEE_TYPES = [
  'PNS',
  'PPPK',
  'GTT (Guru Tidak Tetap)',
  'PTT (Pegawai Tidak Tetap)',
  'Honorer Sekolah',
  'Tenaga Kependidikan',
  'Guru Tetap Yayasan',
  'Lainnya',
] as const;

const EMPLOYEE_TYPE_LOOKUP: Record<string, string> = Object.fromEntries(
  OFFICIAL_EMPLOYEE_TYPES.map((label) => [
    label.trim().replace(/\s+/g, ' ').toUpperCase(),
    label,
  ])
);

function isOriginAllowed(requestOrigin?: string | null): boolean {
  if (!requestOrigin) return false;
  if (ALLOWED_ORIGINS.includes(requestOrigin)) return true;

  try {
    const parsed = new URL(requestOrigin);
    if (parsed.protocol === 'http:') {
      if (parsed.hostname === 'localhost' || parsed.hostname === '127.0.0.1') {
        return true;
      }
    }
  } catch {
    return false;
  }

  return false;
}

function getCorsHeaders(requestOrigin?: string | null): Record<string, string> {
  const allowed = isOriginAllowed(requestOrigin);
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin',
  };

  if (allowed && requestOrigin) {
    headers['Access-Control-Allow-Origin'] = requestOrigin;
  }

  return headers;
}

const jsonResponse = (
  body: Record<string, unknown>,
  status = 200,
  requestOrigin?: string | null
) => {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(requestOrigin),
      'Content-Type': 'application/json',
    },
  });
};

function normalizeNullableString(val: unknown): string | null {
  if (typeof val !== 'string') return null;
  const trimmed = val.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeLookupName(val: string): string {
  return val.trim().replace(/\s+/g, ' ').toLowerCase();
}

function isValidIsoCalendarDate(dateStr: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (year < 1950 || year > 2100) return false;
  if (month < 1 || month > 12) return false;

  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day >= 1 && day <= daysInMonth;
}

function translateDbError(code?: string, message?: string): string {
  const msg = (message || '').toLowerCase();

  if (code === '23505') {
    if (msg.includes('employees_email_normalized_unique') || msg.includes('email')) {
      return 'Alamat email sudah terdaftar pada data pegawai lain.';
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
    return 'Data duplikat melanggar batasan unik database.';
  }

  if (code === '23502') {
    return 'Kolom wajib belum terpenuhi pada database.';
  }

  if (code === '23514') {
    if (msg.includes('gender')) return 'Nilai jenis kelamin tidak valid.';
    if (msg.includes('status')) return 'Nilai status keaktifan tidak valid.';
    return 'Nilai data tidak memenuhi aturan validasi database.';
  }

  if (code === '22007' || code === '22P02') {
    return 'Format tanggal atau tipe data tidak valid.';
  }

  if (code === '42501') {
    return 'Akses ditolak oleh kebijakan keamanan database (RLS).';
  }

  return 'Gagal menyimpan data pegawai ke database.';
}

interface IncomingImportRow {
  excelRowNumber?: unknown;
  full_name?: unknown;
  nip?: unknown;
  nik?: unknown;
  employee_number?: unknown;
  gender?: unknown;
  employee_type?: unknown;
  department_name?: unknown;
  position_name?: unknown;
  join_date?: unknown;
  status?: unknown;
  phone?: unknown;
  email?: unknown;
  notes?: unknown;
}

interface ImportRequestBody {
  fileName?: unknown;
  rows?: unknown;
}

Deno.serve(async (req: Request) => {
  const requestOrigin = req.headers.get('origin');

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(requestOrigin) });
  }

  if (req.method !== 'POST') {
    return jsonResponse(
      { success: false, message: 'Metode HTTP tidak diizinkan. Gunakan POST.' },
      405,
      requestOrigin
    );
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceRoleKey) {
      console.error('Missing required Supabase server environment variables.');
      return jsonResponse(
        { success: false, message: 'Konfigurasi server internal belum lengkap.' },
        500,
        requestOrigin
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return jsonResponse(
        { success: false, message: 'Sesi tidak valid atau belum terautentikasi.' },
        401,
        requestOrigin
      );
    }

    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
      return jsonResponse(
        { success: false, message: 'Token otentikasi tidak ditemukan.' },
        401,
        requestOrigin
      );
    }

    const supabaseUserClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });

    const {
      data: { user: callerUser },
      error: userAuthError,
    } = await supabaseUserClient.auth.getUser();

    if (userAuthError || !callerUser) {
      return jsonResponse(
        { success: false, message: 'Sesi autentikasi telah kedaluwarsa atau tidak valid.' },
        401,
        requestOrigin
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Authoritative server-side role & active status check
    const { data: callerProfile, error: callerProfileError } = await supabaseAdmin
      .from('profiles')
      .select('id, role, is_active')
      .eq('id', callerUser.id)
      .single();

    if (callerProfileError || !callerProfile) {
      return jsonResponse(
        { success: false, message: 'Profil pemanggil tidak ditemukan di sistem.' },
        403,
        requestOrigin
      );
    }

    if (!callerProfile.is_active) {
      return jsonResponse(
        { success: false, message: 'Akun pemanggil dalam status dinonaktifkan.' },
        403,
        requestOrigin
      );
    }

    if (callerProfile.role !== 'super_admin' && callerProfile.role !== 'admin') {
      return jsonResponse(
        {
          success: false,
          message: 'Akses ditolak. Hanya Admin atau Super Admin yang dapat mengimpor pegawai.',
        },
        403,
        requestOrigin
      );
    }

    // Parse body
    let body: ImportRequestBody;
    try {
      body = await req.json();
    } catch {
      return jsonResponse(
        { success: false, message: 'Format payload JSON tidak valid.' },
        400,
        requestOrigin
      );
    }

    if (!Array.isArray(body.rows)) {
      return jsonResponse(
        { success: false, message: 'Payload baris impor tidak valid.' },
        400,
        requestOrigin
      );
    }

    if (body.rows.length === 0) {
      return jsonResponse(
        { success: false, message: 'Tidak ada baris data pegawai untuk diimpor.' },
        400,
        requestOrigin
      );
    }

    if (body.rows.length > MAX_IMPORT_ROWS) {
      return jsonResponse(
        {
          success: false,
          message: `Jumlah baris melebihi batas maksimal ${MAX_IMPORT_ROWS} baris per impor.`,
        },
        400,
        requestOrigin
      );
    }

    const fileName =
      typeof body.fileName === 'string' && body.fileName.trim()
        ? body.fileName.trim().slice(0, 200)
        : 'import.xlsx';

    // Load master departments & positions once (read-only)
    const [{ data: departmentsData }, { data: positionsData }] = await Promise.all([
      supabaseAdmin.from('departments').select('id, name, is_active'),
      supabaseAdmin.from('positions').select('id, name, is_active'),
    ]);

    const deptMap = new Map<string, { id: string; name: string; is_active: boolean }>();
    for (const d of departmentsData || []) {
      deptMap.set(normalizeLookupName(d.name), d);
    }

    const posMap = new Map<string, { id: string; name: string; is_active: boolean }>();
    for (const p of positionsData || []) {
      posMap.set(normalizeLookupName(p.name), p);
    }

    // Track duplicate keys inside request payload (all rows involved in batch duplicates are rejected)
    const rawRows = body.rows as IncomingImportRow[];
    const emailCounts = new Map<string, number>();
    const nipCounts = new Map<string, number>();
    const nikCounts = new Map<string, number>();
    const empNumCounts = new Map<string, number>();

    for (const r of rawRows) {
      const em = normalizeNullableString(r.email)?.toLowerCase();
      if (em) emailCounts.set(em, (emailCounts.get(em) || 0) + 1);

      const nip = normalizeNullableString(r.nip);
      if (nip) nipCounts.set(nip, (nipCounts.get(nip) || 0) + 1);

      const nik = normalizeNullableString(r.nik);
      if (nik) nikCounts.set(nik, (nikCounts.get(nik) || 0) + 1);

      const empNum = normalizeNullableString(r.employee_number);
      if (empNum) empNumCounts.set(empNum, (empNumCounts.get(empNum) || 0) + 1);
    }

    const results: Array<{
      excelRowNumber: number;
      fullName: string;
      email: string;
      status: 'imported' | 'imported_with_warning' | 'failed';
      employeeId: string | null;
      warnings: string[];
      errorReason: string | null;
    }> = [];

    let importedCleanCount = 0;
    let importedWithWarningCount = 0;
    let failedCount = 0;

    for (let idx = 0; idx < rawRows.length; idx++) {
      const item = rawRows[idx];
      const excelRowNumber =
        typeof item.excelRowNumber === 'number' && Number.isInteger(item.excelRowNumber) && item.excelRowNumber > 0
          ? item.excelRowNumber
          : idx + 2;

      const fullName = normalizeNullableString(item.full_name) || '';
      const email = (normalizeNullableString(item.email) || '').toLowerCase();
      const nip = normalizeNullableString(item.nip);
      const nik = normalizeNullableString(item.nik);
      const employeeNumber = normalizeNullableString(item.employee_number);
      const phone = normalizeNullableString(item.phone);
      const notes = normalizeNullableString(item.notes);
      const joinDate = normalizeNullableString(item.join_date);
      const deptName = normalizeNullableString(item.department_name);
      const posName = normalizeNullableString(item.position_name);

      const rowErrors: string[] = [];
      const rowWarnings: string[] = [];

      if (!fullName || fullName.length > 200) {
        rowErrors.push('Nama Lengkap & Gelar wajib diisi (maksimal 200 karakter).');
      }

      if (!email || email.length > 255 || !EMAIL_REGEX.test(email)) {
        rowErrors.push('Alamat Email wajib diisi dengan format yang valid.');
      } else if ((emailCounts.get(email) || 0) > 1) {
        rowErrors.push('Email duplikat di dalam batch impor yang sama.');
      }

      if (nip && (nipCounts.get(nip) || 0) > 1) {
        rowErrors.push('NIP duplikat di dalam batch impor yang sama.');
      }
      if (nik && (nikCounts.get(nik) || 0) > 1) {
        rowErrors.push('NIK duplikat di dalam batch impor yang sama.');
      }
      if (employeeNumber && (empNumCounts.get(employeeNumber) || 0) > 1) {
        rowErrors.push('Nomor Pegawai duplikat di dalam batch impor yang sama.');
      }

      const rawType = normalizeNullableString(item.employee_type);
      const canonicalEmployeeType = rawType
        ? EMPLOYEE_TYPE_LOOKUP[rawType.replace(/\s+/g, ' ').toUpperCase()] || null
        : null;
      if (!canonicalEmployeeType) {
        rowErrors.push('Jenis Kepegawaian wajib menggunakan salah satu dari 8 kategori resmi.');
      }

      let normalizedGender: 'male' | 'female' | null = null;
      if (item.gender !== null && item.gender !== undefined && String(item.gender).trim() !== '') {
        const g = String(item.gender).trim().toLowerCase();
        if (g === 'male' || g === 'laki-laki') {
          normalizedGender = 'male';
        } else if (g === 'female' || g === 'perempuan') {
          normalizedGender = 'female';
        } else {
          rowErrors.push('Jenis Kelamin tidak valid.');
        }
      }

      let normalizedStatus: 'active' | 'inactive' = 'active';
      if (item.status !== null && item.status !== undefined && String(item.status).trim() !== '') {
        const s = String(item.status).trim().toLowerCase();
        if (s === 'active' || s === 'aktif') {
          normalizedStatus = 'active';
        } else if (s === 'inactive' || s === 'tidak aktif') {
          normalizedStatus = 'inactive';
        } else {
          rowErrors.push('Status Keaktifan tidak valid.');
        }
      }

      if (joinDate !== null && !isValidIsoCalendarDate(joinDate)) {
        rowErrors.push('Tanggal Bergabung tidak valid (harus tanggal kalender YYYY-MM-DD).');
      }

      // Resolve master data FK safely without creating or reactivating master rows
      let departmentId: string | null = null;
      if (deptName) {
        const matchedDept = deptMap.get(normalizeLookupName(deptName));
        if (!matchedDept) {
          rowWarnings.push(
            `Departemen "${deptName}" tidak ditemukan — disimpan sebagai NULL.`
          );
        } else if (!matchedDept.is_active) {
          rowWarnings.push(
            `Departemen "${matchedDept.name}" berstatus nonaktif — disimpan sebagai NULL.`
          );
        } else {
          departmentId = matchedDept.id;
        }
      }

      let positionId: string | null = null;
      if (posName) {
        const matchedPos = posMap.get(normalizeLookupName(posName));
        if (!matchedPos) {
          rowWarnings.push(
            `Jabatan "${posName}" tidak ditemukan — disimpan sebagai NULL.`
          );
        } else if (!matchedPos.is_active) {
          rowWarnings.push(
            `Jabatan "${matchedPos.name}" berstatus nonaktif — disimpan sebagai NULL.`
          );
        } else {
          positionId = matchedPos.id;
        }
      }

      if (rowErrors.length > 0) {
        failedCount++;
        results.push({
          excelRowNumber,
          fullName: fullName || '(Tanpa Nama)',
          email,
          status: 'failed',
          employeeId: null,
          warnings: rowWarnings,
          errorReason: rowErrors.join(' '),
        });
        continue;
      }

      // Pure INSERT per row (no upsert, no update, profile_id forced null)
      const { data: insertedRow, error: insertError } = await supabaseAdmin
        .from('employees')
        .insert({
          profile_id: null,
          full_name: fullName,
          nip,
          nik,
          employee_number: employeeNumber,
          gender: normalizedGender,
          employee_type: canonicalEmployeeType,
          department_id: departmentId,
          position_id: positionId,
          join_date: joinDate,
          status: normalizedStatus,
          phone,
          email,
          notes,
        })
        .select('id')
        .single();

      if (insertError || !insertedRow) {
        failedCount++;
        results.push({
          excelRowNumber,
          fullName,
          email,
          status: 'failed',
          employeeId: null,
          warnings: rowWarnings,
          errorReason: translateDbError(insertError?.code, insertError?.message),
        });
        continue;
      }

      if (rowWarnings.length > 0) {
        importedWithWarningCount++;
        results.push({
          excelRowNumber,
          fullName,
          email,
          status: 'imported_with_warning',
          employeeId: insertedRow.id,
          warnings: rowWarnings,
          errorReason: null,
        });
      } else {
        importedCleanCount++;
        results.push({
          excelRowNumber,
          fullName,
          email,
          status: 'imported',
          employeeId: insertedRow.id,
          warnings: [],
          errorReason: null,
        });
      }
    }

    const totalImported = importedCleanCount + importedWithWarningCount;

    // Write 1 summary audit log entry (NEVER store full workbook contents)
    try {
      await supabaseAdmin.from('audit_logs').insert({
        actor_user_id: callerUser.id,
        actor_email: callerUser.email || null,
        actor_role: callerProfile.role,
        action: 'BULK_IMPORT_EMPLOYEES',
        target_type: 'employees',
        target_id: 'bulk_import',
        reason: `Impor massal pegawai dari file Excel (${fileName})`,
        metadata: {
          file_name: fileName,
          total_submitted: rawRows.length,
          imported_count: totalImported,
          imported_clean_count: importedCleanCount,
          imported_with_warning_count: importedWithWarningCount,
          failed_count: failedCount,
        },
      });
    } catch {
      console.error('Failed to write bulk import summary audit log.');
    }

    return jsonResponse(
      {
        success: true,
        message:
          totalImported > 0
            ? `Impor selesai: ${totalImported} pegawai berhasil disimpan, ${failedCount} gagal.`
            : 'Tidak ada pegawai yang berhasil diimpor.',
        totalProcessed: rawRows.length,
        importedCount: totalImported,
        importedCleanCount,
        importedWithWarningCount,
        failedCount,
        skippedCount: 0,
        results,
      },
      200,
      requestOrigin
    );
  } catch {
    console.error('Unhandled error in import-employees.');
    return jsonResponse(
      { success: false, message: 'Terjadi kesalahan pada server saat mengimpor pegawai.' },
      500,
      requestOrigin
    );
  }
});
