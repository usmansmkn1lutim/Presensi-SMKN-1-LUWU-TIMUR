// ============================================================================
// Supabase Edge Function: change-password
// Module: PHASE 4D-4 — Secure User Password Change & Mandatory Flag Clearing
// Description:
//   Server-side Edge Function for authenticated users to change their own password.
//   Guards against unauthorized flag manipulation:
//     - Verifies user profile exists and is active BEFORE changing Auth password
//     - Verifies current_password against Supabase Auth
//     - Updates user password via Supabase Auth Admin API
//     - Uses service_role client to update public.profiles.must_change_password = false
//     - Verifies exact row update using .select('id').maybeSingle()
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

interface ChangePasswordRequestBody {
  current_password?: string;
  new_password?: string;
}

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

    // 5. Initialize client to identify authenticated caller user
    const supabaseUserClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false },
    });

    const {
      data: { user: callerUser },
      error: userAuthError,
    } = await supabaseUserClient.auth.getUser();

    if (userAuthError || !callerUser || !callerUser.email) {
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

    // 7. Validate Target User Profile Exists and is Active BEFORE changing Auth password
    const { data: callerProfile, error: callerProfileError } = await supabaseAdmin
      .from('profiles')
      .select('id, is_active')
      .eq('id', callerUser.id)
      .single();

    if (callerProfileError || !callerProfile) {
      return jsonResponse(
        { success: false, message: 'Profil pengguna tidak ditemukan di sistem.' },
        404,
        requestOrigin
      );
    }

    if (!callerProfile.is_active) {
      return jsonResponse(
        { success: false, message: 'Akun Anda dalam status dinonaktifkan.' },
        403,
        requestOrigin
      );
    }

    // 8. Parse and Validate Request Body
    let body: ChangePasswordRequestBody;
    try {
      body = await req.json();
    } catch {
      return jsonResponse(
        { success: false, message: 'Format payload JSON tidak valid.' },
        400,
        requestOrigin
      );
    }

    const currentPassword = body.current_password;
    const newPassword = body.new_password;

    if (!currentPassword) {
      return jsonResponse(
        { success: false, message: 'Kata sandi saat ini wajib diisi.' },
        400,
        requestOrigin
      );
    }

    if (!newPassword) {
      return jsonResponse(
        { success: false, message: 'Kata sandi baru wajib diisi.' },
        400,
        requestOrigin
      );
    }

    if (newPassword.length < 6) {
      return jsonResponse(
        { success: false, message: 'Kata sandi baru minimal 6 karakter.' },
        400,
        requestOrigin
      );
    }

    if (currentPassword === newPassword) {
      return jsonResponse(
        { success: false, message: 'Kata sandi baru tidak boleh sama dengan kata sandi saat ini.' },
        400,
        requestOrigin
      );
    }

    // 9. Verify Current Password by re-authenticating with Supabase Auth
    const tempAuthClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { persistSession: false },
    });

    const { error: verifyAuthError } = await tempAuthClient.auth.signInWithPassword({
      email: callerUser.email,
      password: currentPassword,
    });

    if (verifyAuthError) {
      return jsonResponse(
        { success: false, message: 'Kata sandi saat ini tidak cocok.' },
        400,
        requestOrigin
      );
    }

    // 10. Update Auth User Password via Supabase Auth Admin API
    const { error: updateAuthError } = await supabaseAdmin.auth.admin.updateUserById(
      callerUser.id,
      {
        password: newPassword,
      }
    );

    if (updateAuthError) {
      console.error('Error in auth.admin.updateUserById:', updateAuthError.message);
      return jsonResponse(
        { success: false, message: 'Gagal memperbarui kata sandi pada auth server.' },
        500,
        requestOrigin
      );
    }

    // 11. Update profiles table must_change_password = false via service_role client and verify exact row update
    const { data: updatedProfile, error: updateProfileError } = await supabaseAdmin
      .from('profiles')
      .update({
        must_change_password: false,
        updated_at: new Date().toISOString(),
      })
      .eq('id', callerUser.id)
      .select('id')
      .maybeSingle();

    if (updateProfileError || !updatedProfile) {
      console.error(
        'CRITICAL: Auth password changed for user ' +
          callerUser.id +
          ', but failed to clear must_change_password flag or zero rows updated:',
        updateProfileError?.message
      );
      return jsonResponse(
        {
          success: false,
          message:
            'Kata sandi berhasil diperbarui tetapi gagal memperbarui status akun. Hubungi administrator.',
        },
        500,
        requestOrigin
      );
    }

    // 12. Return Success Response
    return jsonResponse(
      {
        success: true,
        message: 'Kata sandi berhasil diperbarui.',
      },
      200,
      requestOrigin
    );
  } catch (err: unknown) {
    console.error('Unhandled change-password Edge Function error:', err);
    return jsonResponse(
      { success: false, message: 'Terjadi kesalahan pada server saat memperbarui kata sandi.' },
      500,
      requestOrigin
    );
  }
});
