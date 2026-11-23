// ============================================================================
// Supabase Edge Function: bulk-create-employee-accounts
// Description:
//   Server-side bulk account creation and profile linkage for newly imported
//   employees in Tamaki — Presensi Digital GTK.
//   Security & integrity guarantees:
//     - Strict CORS origin allowlist consistent with project Edge Functions
//     - Verifies caller JWT and authoritative active Admin/Super Admin profile
//     - Hard-locks created account role to 'employee' on the server
//     - Processes only valid, active employees with valid email and profile_id IS NULL
//     - Never auto-links existing Auth accounts by email similarity
//     - Sets profiles.must_change_password = true via service_role
//     - Uses conditional update (.is('profile_id', null)) to prevent double-submit races
//     - Note: Auth -> profiles -> employees is NOT a single atomic DB transaction;
//       performs verified compensation rollback (deleteUser + getUserById + profiles check)
//       if profile upsert or employee linkage fails, and flags reconciliation_required
//       with retryable = false if compensation is incomplete or uncertain
//     - Never logs, stores, or returns the shared batch password
//     - Writes 1 summary audit log per executed chunk without secrets
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

const ALLOWED_ORIGINS = [
  'https://ais-dev-tezldmbtiuugsm3lvw4wdk-70461058593.asia-southeast1.run.app',
  'https://ais-pre-tezldmbtiuugsm3lvw4wdk-70461058593.asia-southeast1.run.app',
  'https://presensismkn1luwutimur.vercel.app',
];

const MAX_CHUNK_SIZE = 25;
const MIN_PASSWORD_LENGTH = 6;
const MAX_PASSWORD_LENGTH = 128;
const LOCKED_EMPLOYEE_ROLE = 'employee' as const;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type BulkAccountItemStatus =
  | 'created'
  | 'already_linked'
  | 'auth_exists'
  | 'ineligible'
  | 'failed'
  | 'reconciliation_required';

interface BulkCreateRowResult {
  employeeId: string;
  fullName: string;
  email: string;
  status: BulkAccountItemStatus;
  profileId: string | null;
  retryable: boolean;
  needsReconciliation: boolean;
  message: string;
}

interface EmployeeRecord {
  id: string;
  full_name: string;
  email: string | null;
  status: string;
  profile_id: string | null;
}

interface BulkCreateRequestBody {
  employeeIds?: unknown;
  password?: unknown;
}

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

interface AuthLikeError {
  message?: string;
  status?: number;
  code?: string;
  name?: string;
}

function isDuplicateAuthError(error: AuthLikeError | null): boolean {
  if (!error) return false;
  const code = (error.code || '').toLowerCase().trim();
  const msg = (error.message || '').toLowerCase();

  if (code === 'email_exists' || code === 'user_already_exists') {
    return true;
  }

  return (
    msg.includes('already registered') ||
    msg.includes('already been registered') ||
    msg.includes('already exists') ||
    msg.includes('email_exists') ||
    msg.includes('user_already_exists') ||
    (msg.includes('duplicate') && (msg.includes('email') || msg.includes('user')))
  );
}

function isPasswordPolicyAuthError(error: AuthLikeError | null): boolean {
  if (!error) return false;
  const code = (error.code || '').toLowerCase().trim();
  const name = (error.name || '').toLowerCase().trim();
  const msg = (error.message || '').toLowerCase();

  if (code === 'weak_password' || name === 'authweakpassworderror') {
    return true;
  }

  return (
    msg.includes('weak password') ||
    msg.includes('weak_password') ||
    msg.includes('password should be') ||
    msg.includes('password must') ||
    (msg.includes('password') &&
      (msg.includes('policy') ||
        msg.includes('strength') ||
        msg.includes('character') ||
        msg.includes('weak')))
  );
}

function classifyCreateAuthError(
  error: AuthLikeError,
  hasCreatedAuthUser: boolean
): {
  status: BulkAccountItemStatus;
  retryable: boolean;
  needsReconciliation: boolean;
  message: string;
} {
  if (isDuplicateAuthError(error)) {
    return {
      status: 'auth_exists',
      retryable: false,
      needsReconciliation: false,
      message:
        'Email sudah terdaftar di Supabase Auth. Akun lama tidak ditautkan otomatis; kaitkan manual bila perlu.',
    };
  }

  const code = (error.code || '').toLowerCase().trim();
  if (error.status === 429 || code === 'over_request_rate_limit') {
    return {
      status: 'failed',
      retryable: !hasCreatedAuthUser,
      needsReconciliation: hasCreatedAuthUser,
      message: 'Layanan autentikasi sedang sibuk (rate limit). Silakan coba lagi.',
    };
  }

  if (isPasswordPolicyAuthError(error)) {
    return {
      status: 'failed',
      retryable: !hasCreatedAuthUser,
      needsReconciliation: hasCreatedAuthUser,
      message:
        'Kata sandi awal ditolak oleh kebijakan keamanan autentikasi. Gunakan kata sandi yang lebih kuat saat mencoba ulang.',
    };
  }

  if (
    error.status === 422 ||
    code === 'validation_failed' ||
    code === 'email_address_invalid' ||
    code === 'email_address_not_authorized'
  ) {
    return {
      status: 'failed',
      retryable: !hasCreatedAuthUser,
      needsReconciliation: hasCreatedAuthUser,
      message: 'Data pendaftaran akun ditolak oleh validasi layanan autentikasi.',
    };
  }

  return {
    status: 'failed',
    retryable: !hasCreatedAuthUser,
    needsReconciliation: hasCreatedAuthUser,
    message: 'Gagal membuat akun autentikasi di server.',
  };
}

type AuthDeletionVerificationStatus = 'confirmed_deleted' | 'still_exists' | 'uncertain';

function classifyAuthDeletionVerification(
  getUserData: { user?: { id?: string } | null } | null | undefined,
  getUserError: AuthLikeError | null | undefined
): AuthDeletionVerificationStatus {
  if (getUserData?.user) {
    return 'still_exists';
  }

  if (getUserError) {
    const code = (getUserError.code || '').toLowerCase().trim();
    const msg = (getUserError.message || '').toLowerCase();
    if (
      getUserError.status === 404 ||
      code === 'user_not_found' ||
      msg.includes('not found')
    ) {
      return 'confirmed_deleted';
    }
    return 'uncertain';
  }

  // Missing user without explicit not-found error is treated as uncertain
  return 'uncertain';
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

    // Verify caller JWT
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

    // Privileged admin client (strictly server-side)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

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
          message:
            'Akses ditolak. Hanya Admin atau Super Admin yang berwenang membuat akun pegawai massal.',
        },
        403,
        requestOrigin
      );
    }

    // Parse & validate payload
    let body: BulkCreateRequestBody;
    try {
      body = await req.json();
    } catch {
      return jsonResponse(
        { success: false, message: 'Format payload JSON tidak valid.' },
        400,
        requestOrigin
      );
    }

    if (!Array.isArray(body.employeeIds) || body.employeeIds.length === 0) {
      return jsonResponse(
        { success: false, message: 'Daftar employeeIds wajib diisi.' },
        400,
        requestOrigin
      );
    }

    if (body.employeeIds.length > MAX_CHUNK_SIZE) {
      return jsonResponse(
        {
          success: false,
          message: `Jumlah pegawai melebihi batas maksimal ${MAX_CHUNK_SIZE} pegawai per permintaan.`,
        },
        400,
        requestOrigin
      );
    }

    const uniqueEmployeeIds: string[] = [];
    const seenIds = new Set<string>();
    for (const rawId of body.employeeIds) {
      if (typeof rawId !== 'string' || !UUID_REGEX.test(rawId.trim())) {
        return jsonResponse(
          { success: false, message: 'Terdapat employeeId dengan format UUID tidak valid.' },
          400,
          requestOrigin
        );
      }
      const cleanId = rawId.trim();
      if (!seenIds.has(cleanId)) {
        seenIds.add(cleanId);
        uniqueEmployeeIds.push(cleanId);
      }
    }

    const password = typeof body.password === 'string' ? body.password : '';
    if (
      !password ||
      password.trim().length === 0 ||
      password.length < MIN_PASSWORD_LENGTH ||
      password.length > MAX_PASSWORD_LENGTH
    ) {
      return jsonResponse(
        {
          success: false,
          message: `Kata sandi awal wajib diisi (${MIN_PASSWORD_LENGTH} hingga ${MAX_PASSWORD_LENGTH} karakter, tidak boleh hanya spasi).`,
        },
        400,
        requestOrigin
      );
    }

    // Fetch authoritative employee rows from database
    const { data: employeeRows, error: fetchEmployeesError } = await supabaseAdmin
      .from('employees')
      .select('id, full_name, email, status, profile_id')
      .in('id', uniqueEmployeeIds);

    if (fetchEmployeesError) {
      console.error('Failed to query employees for bulk account creation:', fetchEmployeesError.code);
      return jsonResponse(
        { success: false, message: 'Gagal membaca data pegawai dari database.' },
        500,
        requestOrigin
      );
    }

    const employeeMap = new Map<string, EmployeeRecord>();
    for (const row of (employeeRows || []) as EmployeeRecord[]) {
      employeeMap.set(row.id, row);
    }

    const results: BulkCreateRowResult[] = [];
    const createdEmployeeIds: string[] = [];

    let createdCount = 0;
    let alreadyLinkedCount = 0;
    let authExistsCount = 0;
    let ineligibleCount = 0;
    let failedCount = 0;
    let reconciliationRequiredCount = 0;

    for (const employeeId of uniqueEmployeeIds) {
      const emp = employeeMap.get(employeeId);

      if (!emp) {
        failedCount++;
        results.push({
          employeeId,
          fullName: '(Tidak Ditemukan)',
          email: '',
          status: 'failed',
          profileId: null,
          retryable: false,
          needsReconciliation: false,
          message: 'Data pegawai tidak ditemukan di database.',
        });
        continue;
      }

      const normalizedEmail = (emp.email || '').trim().toLowerCase();

      if (emp.profile_id !== null) {
        alreadyLinkedCount++;
        results.push({
          employeeId: emp.id,
          fullName: emp.full_name,
          email: normalizedEmail,
          status: 'already_linked',
          profileId: emp.profile_id,
          retryable: false,
          needsReconciliation: false,
          message: 'Pegawai sudah memiliki akun terhubung (dilewati).',
        });
        continue;
      }

      if (emp.status !== 'active') {
        ineligibleCount++;
        results.push({
          employeeId: emp.id,
          fullName: emp.full_name,
          email: normalizedEmail,
          status: 'ineligible',
          profileId: null,
          retryable: false,
          needsReconciliation: false,
          message: 'Pegawai berstatus Tidak Aktif sehingga tidak dibuatkan akun.',
        });
        continue;
      }

      if (!normalizedEmail || normalizedEmail.length > 255 || !EMAIL_REGEX.test(normalizedEmail)) {
        ineligibleCount++;
        results.push({
          employeeId: emp.id,
          fullName: emp.full_name,
          email: normalizedEmail,
          status: 'ineligible',
          profileId: null,
          retryable: false,
          needsReconciliation: false,
          message: 'Alamat email pegawai kosong atau tidak valid.',
        });
        continue;
      }

      // 1. Create Supabase Auth user with batch initial password
      // Trigger on_auth_user_created (handle_new_user) inserts default profile row
      // with role='employee', must_change_password=false (with EXCEPTION WHEN OTHERS guard).
      const { data: createAuthData, error: createAuthError } =
        await supabaseAdmin.auth.admin.createUser({
          email: normalizedEmail,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: emp.full_name,
            role: LOCKED_EMPLOYEE_ROLE,
          },
        });

      if (createAuthError) {
        const partialAuthUserId = createAuthData?.user?.id || null;
        const classified = classifyCreateAuthError(
          createAuthError as AuthLikeError,
          Boolean(partialAuthUserId)
        );

        if (classified.status === 'auth_exists') {
          authExistsCount++;
          results.push({
            employeeId: emp.id,
            fullName: emp.full_name,
            email: normalizedEmail,
            status: 'auth_exists',
            profileId: null,
            retryable: false,
            needsReconciliation: false,
            message: classified.message,
          });
        } else if (partialAuthUserId) {
          console.error(
            'auth.admin.createUser returned error alongside partial user for employee:',
            emp.id,
            'status:',
            (createAuthError as AuthLikeError).status,
            'code:',
            (createAuthError as AuthLikeError).code
          );
          reconciliationRequiredCount++;
          results.push({
            employeeId: emp.id,
            fullName: emp.full_name,
            email: normalizedEmail,
            status: 'reconciliation_required',
            profileId: partialAuthUserId,
            retryable: false,
            needsReconciliation: true,
            message:
              'Pembuatan akun Auth menghasilkan status tidak pasti dan memerlukan rekonsiliasi admin sebelum dicoba ulang.',
          });
        } else {
          console.error(
            'auth.admin.createUser failed for employee:',
            emp.id,
            'status:',
            (createAuthError as AuthLikeError).status,
            'code:',
            (createAuthError as AuthLikeError).code
          );
          failedCount++;
          results.push({
            employeeId: emp.id,
            fullName: emp.full_name,
            email: normalizedEmail,
            status: 'failed',
            profileId: null,
            retryable: classified.retryable,
            needsReconciliation: false,
            message: classified.message,
          });
        }
        continue;
      }

      const newAuthUser = createAuthData?.user;
      if (!newAuthUser?.id) {
        failedCount++;
        results.push({
          employeeId: emp.id,
          fullName: emp.full_name,
          email: normalizedEmail,
          status: 'failed',
          profileId: null,
          retryable: true,
          needsReconciliation: false,
          message: 'Server tidak mengembalikan ID akun Auth baru.',
        });
        continue;
      }

      // Helper for compensating rollback if profile upsert or employee linkage fails
      const rollbackCreatedAuthUser = async (
        failureReason: string,
        checkConcurrentLink = false
      ): Promise<BulkCreateRowResult> => {
        // Defensive cleanup: clear employees.profile_id ONLY when it points to newAuthUser.id
        let clearEmployeeError: { code?: string } | null = null;
        try {
          const { error } = await supabaseAdmin
            .from('employees')
            .update({ profile_id: null })
            .eq('id', emp.id)
            .eq('profile_id', newAuthUser.id);
          if (error) {
            clearEmployeeError = error;
            console.error(
              'Rollback defensive employees.update failed for employee:',
              emp.id,
              'code:',
              error.code
            );
          }
        } catch {
          clearEmployeeError = { code: 'exception' };
        }

        // Delete Auth user; verify actual deletion independently via getUserById and profiles check
        let deleteAuthError: AuthLikeError | null = null;
        try {
          const { error } = await supabaseAdmin.auth.admin.deleteUser(newAuthUser.id);
          if (error) {
            deleteAuthError = error as AuthLikeError;
          }
        } catch {
          deleteAuthError = { message: 'deleteUser exception' };
        }

        let authDeletionStatus: AuthDeletionVerificationStatus = 'uncertain';
        if (!deleteAuthError) {
          try {
            const { data: getUserData, error: getUserError } =
              await supabaseAdmin.auth.admin.getUserById(newAuthUser.id);
            authDeletionStatus = classifyAuthDeletionVerification(
              getUserData as { user?: { id?: string } | null } | null,
              getUserError as AuthLikeError | null
            );
          } catch {
            authDeletionStatus = 'uncertain';
          }
        }

        // Verify no leftover profiles row remains (cannot alone prove Auth user deletion)
        let leftoverProfile: { id?: string } | null = null;
        let verifyProfileErr: { code?: string } | null = null;
        try {
          const { data, error } = await supabaseAdmin
            .from('profiles')
            .select('id')
            .eq('id', newAuthUser.id)
            .maybeSingle();
          leftoverProfile = data as { id?: string } | null;
          if (error) {
            verifyProfileErr = error as { code?: string };
          }
        } catch {
          verifyProfileErr = { code: 'exception' };
        }

        if (
          clearEmployeeError ||
          deleteAuthError ||
          authDeletionStatus !== 'confirmed_deleted' ||
          verifyProfileErr ||
          leftoverProfile
        ) {
          console.error(
            'CRITICAL: Rollback incomplete or uncertain for employee:',
            emp.id,
            'authUserId:',
            newAuthUser.id,
            'authDeletionStatus:',
            authDeletionStatus
          );
          reconciliationRequiredCount++;
          return {
            employeeId: emp.id,
            fullName: emp.full_name,
            email: normalizedEmail,
            status: 'reconciliation_required',
            profileId: newAuthUser.id,
            retryable: false,
            needsReconciliation: true,
            message: `${failureReason} Pembatalan akun Auth tidak tuntas atau belum dapat dipastikan dan memerlukan rekonsiliasi admin sebelum dicoba ulang.`,
          };
        }

        if (checkConcurrentLink) {
          let latestEmp: { profile_id: string | null } | null = null;
          let latestEmpError: { code?: string } | null = null;

          try {
            const { data, error } = await supabaseAdmin
              .from('employees')
              .select('profile_id')
              .eq('id', emp.id)
              .maybeSingle();
            latestEmp = data as { profile_id: string | null } | null;
            if (error) {
              latestEmpError = error as { code?: string };
            }
          } catch {
            latestEmpError = { code: 'exception' };
          }

          if (latestEmpError) {
            console.error(
              'Failed to check concurrent employee link after rollback for employee:',
              emp.id,
              'code:',
              latestEmpError.code
            );
            failedCount++;
            return {
              employeeId: emp.id,
              fullName: emp.full_name,
              email: normalizedEmail,
              status: 'failed',
              profileId: null,
              retryable: false,
              needsReconciliation: false,
              message: `${failureReason} Akun Auth sementara telah dibatalkan dan terverifikasi bersih, namun status keterkaitan pegawai gagal diperiksa sehingga perlu pemeriksaan sebelum dicoba lagi.`,
            };
          } else if (latestEmp?.profile_id) {
            alreadyLinkedCount++;
            return {
              employeeId: emp.id,
              fullName: emp.full_name,
              email: normalizedEmail,
              status: 'already_linked',
              profileId: latestEmp.profile_id,
              retryable: false,
              needsReconciliation: false,
              message: 'Pegawai sudah terhubung dengan akun oleh proses lain.',
            };
          }
        }

        failedCount++;
        return {
          employeeId: emp.id,
          fullName: emp.full_name,
          email: normalizedEmail,
          status: 'failed',
          profileId: null,
          retryable: true,
          needsReconciliation: false,
          message: `${failureReason} Akun Auth sementara telah dibatalkan dan terverifikasi bersih sehingga aman untuk dicoba lagi.`,
        };
      };

      // 2. Upsert public.profiles with role='employee' and must_change_password=true via service_role
      // (Explicit upsert guarantees profile exists even if handle_new_user trigger caught an exception)
      const { data: upsertedProfile, error: profileUpsertError } = await supabaseAdmin
        .from('profiles')
        .upsert(
          {
            id: newAuthUser.id,
            full_name: emp.full_name,
            role: LOCKED_EMPLOYEE_ROLE,
            is_active: true,
            must_change_password: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        )
        .select('id, role, is_active, must_change_password')
        .maybeSingle();

      if (
        profileUpsertError ||
        !upsertedProfile ||
        upsertedProfile.role !== LOCKED_EMPLOYEE_ROLE ||
        upsertedProfile.is_active !== true ||
        upsertedProfile.must_change_password !== true
      ) {
        console.error(
          'Profile upsert failed for employee:',
          emp.id,
          'error:',
          profileUpsertError?.code
        );
        results.push(
          await rollbackCreatedAuthUser(
            'Gagal mengatur profil atau flag wajib ganti kata sandi.'
          )
        );
        continue;
      }

      // 3. Atomically link public.employees.profile_id ONLY when still NULL
      const { data: linkedEmployee, error: linkEmployeeError } = await supabaseAdmin
        .from('employees')
        .update({ profile_id: newAuthUser.id })
        .eq('id', emp.id)
        .is('profile_id', null)
        .select('id, profile_id')
        .maybeSingle();

      if (linkEmployeeError || !linkedEmployee || linkedEmployee.profile_id !== newAuthUser.id) {
        console.error(
          'Employee linkage failed for employee:',
          emp.id,
          'error:',
          linkEmployeeError?.code
        );
        results.push(
          await rollbackCreatedAuthUser(
            'Gagal mengaitkan akun ke data pegawai.',
            !linkEmployeeError && !linkedEmployee
          )
        );
        continue;
      }

      createdCount++;
      createdEmployeeIds.push(emp.id);
      results.push({
        employeeId: emp.id,
        fullName: emp.full_name,
        email: normalizedEmail,
        status: 'created',
        profileId: newAuthUser.id,
        retryable: false,
        needsReconciliation: false,
        message: 'Akun dibuat, dikaitkan, dan wajib ganti kata sandi saat login pertama.',
      });
    }

    // Write 1 summary audit log entry per executed chunk (NEVER log any password)
    try {
      await supabaseAdmin.from('audit_logs').insert({
        actor_user_id: callerUser.id,
        actor_email: callerUser.email || null,
        actor_role: callerProfile.role,
        action: 'BULK_CREATE_EMPLOYEE_ACCOUNTS',
        target_type: 'employees',
        target_id: 'bulk_account_creation',
        reason: 'Pembuatan dan pengaitan akun massal pasca impor pegawai Excel',
        metadata: {
          requested_count: uniqueEmployeeIds.length,
          created_count: createdCount,
          already_linked_count: alreadyLinkedCount,
          auth_exists_count: authExistsCount,
          ineligible_count: ineligibleCount,
          failed_count: failedCount,
          reconciliation_required_count: reconciliationRequiredCount,
          created_employee_ids: createdEmployeeIds,
        },
      });
    } catch {
      console.error('Failed to write bulk account creation audit log.');
    }

    return jsonResponse(
      {
        success: true,
        message: `Proses pembuatan akun selesai: ${createdCount} dibuat, ${alreadyLinkedCount + authExistsCount + ineligibleCount} dilewati, ${failedCount + reconciliationRequiredCount} gagal.`,
        totalProcessed: uniqueEmployeeIds.length,
        createdCount,
        alreadyLinkedCount,
        authExistsCount,
        ineligibleCount,
        failedCount,
        reconciliationRequiredCount,
        results,
      },
      200,
      requestOrigin
    );
  } catch {
    console.error('Unhandled error in bulk-create-employee-accounts.');
    return jsonResponse(
      { success: false, message: 'Terjadi kesalahan pada server saat membuat akun massal.' },
      500,
      requestOrigin
    );
  }
});
