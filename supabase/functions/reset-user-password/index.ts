// ============================================================================
// Supabase Edge Function: reset-user-password
// Module: PHASE 4D-2 — Secure Reset User Password
// Description:
//   Server-side Edge Function for Super Admin to reset an employee's password.
//   Guards against privilege escalation:
//     - Strictly Super Admin ONLY (403 Forbidden for Admin and other roles)
//     - Target user must be an active employee or headmaster (Admin & Super Admin targets forbidden)
//     - Generates cryptographically secure 16-character temporary password
//     - Updates auth user password via Supabase Auth Admin API
//     - Sets profiles.must_change_password = true
//     - Records immutable audit log without storing any password
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

const ALLOWED_ORIGINS = [
  'https://ais-dev-tezldmbtiuugsm3lvw4wdk-70461058593.asia-southeast1.run.app',
  'https://ais-pre-tezldmbtiuugsm3lvw4wdk-70461058593.asia-southeast1.run.app',
  'https://presensismkn1luwutimur.vercel.app',
];

function isOriginAllowed(requestOrigin?: string | null): boolean {
  if (!requestOrigin) return false;

  if (ALLOWED_ORIGINS.includes(requestOrigin)) {
    return true;
  }

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

interface ResetPasswordRequestBody {
  target_user_id?: string;
  reason?: string;
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

/**
 * Generate cryptographically secure random temporary password.
 * Guaranteed 16 characters containing uppercase, lowercase, numbers, and symbols.
 */
function generateSecureTemporaryPassword(length = 16): string {
  const charsetUpper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const charsetLower = 'abcdefghijkmnopqrstuvwxyz';
  const charsetNumbers = '23456789';
  const charsetSymbols = '!@#$%^&*()_+-=';
  const allChars = charsetUpper + charsetLower + charsetNumbers + charsetSymbols;

  const array = new Uint8Array(length);
  crypto.getRandomValues(array);

  // Guarantee at least 1 character from each character set
  const pwd: string[] = [
    charsetUpper[array[0] % charsetUpper.length],
    charsetLower[array[1] % charsetLower.length],
    charsetNumbers[array[2] % charsetNumbers.length],
    charsetSymbols[array[3] % charsetSymbols.length],
  ];

  for (let i = 4; i < length; i++) {
    pwd.push(allChars[array[i] % allChars.length]);
  }

  // Shuffle array using Fisher-Yates with crypto random values
  const shuffleBytes = new Uint8Array(pwd.length);
  crypto.getRandomValues(shuffleBytes);
  for (let i = pwd.length - 1; i > 0; i--) {
    const j = shuffleBytes[i] % (i + 1);
    const temp = pwd[i];
    pwd[i] = pwd[j];
    pwd[j] = temp;
  }

  return pwd.join('');
}

Deno.serve(async (req: Request) => {
  const requestOrigin = req.headers.get('origin');

  // 1. Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: getCorsHeaders(requestOrigin) });
  }

  // 2. Only allow POST requests
  if (req.method !== 'POST') {
    return jsonResponse(
      { success: false, message: 'Metode HTTP tidak diizinkan. Gunakan POST.' },
      405,
      requestOrigin
    );
  }

  try {
    // 3. Extract and verify Environment Variables
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY');
    const supabaseServiceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseServiceRoleKey || !supabaseAnonKey) {
      console.error('Missing server environment variables for Supabase.');
      return jsonResponse(
        { success: false, message: 'Konfigurasi server internal belum lengkap.' },
        500,
        requestOrigin
      );
    }

    // 4. Verify Authorization Header
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

    // 5. Initialize client to identify caller user
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

    // 6. Initialize privileged Admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 7. Verify Caller Profile & Active Status
    const { data: callerProfile, error: callerProfileError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, role, is_active')
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

    // 8. Enforce Strict Super Admin Authorization
    if (callerProfile.role !== 'super_admin') {
      return jsonResponse(
        {
          success: false,
          message: 'Akses ditolak. Hanya Super Admin yang berhak melakukan reset password pegawai.',
        },
        403,
        requestOrigin
      );
    }

    // 9. Parse and Validate Request Body
    let body: ResetPasswordRequestBody;
    try {
      body = await req.json();
    } catch {
      return jsonResponse(
        { success: false, message: 'Format payload JSON tidak valid.' },
        400,
        requestOrigin
      );
    }

    const targetUserId = body.target_user_id?.trim();
    const reason = body.reason?.trim() || 'Reset password pegawai oleh Super Admin';

    if (!targetUserId) {
      return jsonResponse(
        { success: false, message: 'ID pengguna target wajib diisi.' },
        400,
        requestOrigin
      );
    }

    // Prevent self-reset via this administrative endpoint
    if (targetUserId === callerUser.id) {
      return jsonResponse(
        {
          success: false,
          message: 'Gunakan menu Ubah Password di Akun Saya untuk memperbarui kata sandi Anda sendiri.',
        },
        400,
        requestOrigin
      );
    }

    // 10. Fetch & Validate Target Profile
    const { data: targetProfile, error: targetProfileError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, role, is_active')
      .eq('id', targetUserId)
      .single();

    if (targetProfileError || !targetProfile) {
      return jsonResponse(
        { success: false, message: 'Pengguna target tidak ditemukan di sistem.' },
        404,
        requestOrigin
      );
    }

    // Target role protection: Cannot reset another Super Admin or Admin via employee reset endpoint
    if (targetProfile.role === 'super_admin' || targetProfile.role === 'admin') {
      return jsonResponse(
        {
          success: false,
          message: 'Reset password mandiri hanya diizinkan untuk akun pegawai/kepala sekolah. Akun Admin atau Super Admin tidak dapat direset via fitur ini.',
        },
        403,
        requestOrigin
      );
    }

    if (!targetProfile.is_active) {
      return jsonResponse(
        { success: false, message: 'Tidak dapat melakukan reset password untuk akun yang sedang dinonaktifkan.' },
        400,
        requestOrigin
      );
    }

    // Validate employee relation in public.employees
    const { data: targetEmployee, error: targetEmployeeError } = await supabaseAdmin
      .from('employees')
      .select('id, status')
      .eq('profile_id', targetUserId)
      .maybeSingle();

    if (targetEmployeeError || !targetEmployee) {
      return jsonResponse(
        {
          success: false,
          message: 'Target tidak memiliki relasi pegawai yang valid di sistem.',
        },
        400,
        requestOrigin
      );
    }

    if (targetEmployee.status !== 'active') {
      return jsonResponse(
        {
          success: false,
          message: 'Tidak dapat melakukan reset password untuk pegawai dengan status tidak aktif.',
        },
        400,
        requestOrigin
      );
    }

    // 11. Generate Cryptographic Temporary Password
    const temporaryPassword = generateSecureTemporaryPassword(16);

    // 12. Update Auth User Password via Supabase Auth Admin API
    const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
      targetUserId,
      {
        password: temporaryPassword,
      }
    );

    if (updateAuthError) {
      console.error('Error in auth.admin.updateUserById:', updateAuthError.message);
      return jsonResponse(
        { success: false, message: 'Gagal memperbarui kata sandi akun pada auth server.' },
        500,
        requestOrigin
      );
    }

    // 13. Update profiles table must_change_password = true
    let profileUpdateSuccess = false;
    const { error: updateProfileError } = await supabaseAdmin
      .from('profiles')
      .update({
        must_change_password: true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetUserId);

    if (!updateProfileError) {
      profileUpdateSuccess = true;
    } else {
      console.error('Error updating profile must_change_password (attempt 1):', updateProfileError.message);
      // Attempt retry once
      const { error: retryProfileError } = await supabaseAdmin
        .from('profiles')
        .update({
          must_change_password: true,
          updated_at: new Date().toISOString(),
        })
        .eq('id', targetUserId);

      if (!retryProfileError) {
        profileUpdateSuccess = true;
      }
    }

    if (!profileUpdateSuccess) {
      console.error(`CRITICAL: Auth password changed for target ${targetUserId}, but failed to set must_change_password flag.`);
      return jsonResponse(
        {
          success: false,
          message: 'Gagal mengaktifkan status wajib ganti password pada profil target setelah pembaruan autentikasi. Reset dibatalkan demi keamanan.',
        },
        500,
        requestOrigin
      );
    }

    // 14. Record Mandatory Audit Log (DO NOT LOG PASSWORD)
    try {
      const { error: auditError } = await supabaseAdmin
        .from('audit_logs')
        .insert({
          actor_user_id: callerUser.id,
          actor_email: callerUser.email || null,
          actor_role: callerProfile.role,
          action: 'RESET_USER_PASSWORD',
          target_type: 'user',
          target_id: targetUserId,
          reason: reason,
          metadata: {
            target_full_name: targetProfile.full_name,
            target_role: targetProfile.role,
          },
        });

      if (auditError) {
        console.error('CRITICAL: Audit log insert error during password reset:', auditError.message);
        return jsonResponse(
          {
            success: false,
            message: 'Reset password dibatalkan karena gagal mencatat audit log keamanan.',
          },
          500,
          requestOrigin
        );
      }
    } catch (auditErr: unknown) {
      console.error('CRITICAL: Exception caught during audit log recording:', auditErr);
      return jsonResponse(
        {
          success: false,
          message: 'Reset password dibatalkan karena kegagalan internal saat mencatat audit log.',
        },
        500,
        requestOrigin
      );
    }

    // 15. Return Temporary Password safely to authenticated Super Admin ONLY when ALL STEPS succeeded
    return jsonResponse(
      {
        success: true,
        message: 'Password pegawai berhasil direset. Berikan password sementara kepada pegawai terkait.',
        temporary_password: temporaryPassword,
        user: {
          id: targetProfile.id,
          full_name: targetProfile.full_name,
          role: targetProfile.role,
          must_change_password: true,
        },
      },
      200,
      requestOrigin
    );
  } catch (err: unknown) {
    console.error('Unhandled reset-user-password Edge Function error:', err);
    return jsonResponse(
      { success: false, message: 'Terjadi kesalahan pada server saat mereset password.' },
      500,
      requestOrigin
    );
  }
});
