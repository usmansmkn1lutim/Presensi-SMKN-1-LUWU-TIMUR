// ============================================================================
// Supabase Edge Function: update-user-status
// Module: PHASE 4B-6-1 — Secure Update User Status Backend
// Description:
//   Server-side Edge Function to safely activate or deactivate user accounts
//   in public.profiles.is_active with strict authorization:
//     - Super Admin can activate/deactivate: admin, headmaster, employee, other super_admins
//     - Admin can activate/deactivate: headmaster, employee, other admins (NOT super_admin)
//     - Headmaster / Employee: Forbidden (403)
//     - Self-status modification: Forbidden (403)
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

const ALLOWED_ROLES = ['super_admin', 'admin', 'headmaster', 'employee'] as const;
type AppRole = (typeof ALLOWED_ROLES)[number];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface UpdateUserStatusRequestBody {
  target_user_id?: string;
  is_active?: boolean;
}

const jsonResponse = (body: Record<string, unknown>, status = 200) => {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  });
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

Deno.serve(async (req: Request) => {
  // 1. Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  // 2. Only allow POST requests
  if (req.method !== 'POST') {
    return jsonResponse(
      { success: false, message: 'Metode HTTP tidak diizinkan. Gunakan POST.' },
      405
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
        500
      );
    }

    // 4. Verify Authorization Header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return jsonResponse(
        { success: false, message: 'Sesi tidak valid atau belum terautentikasi.' },
        401
      );
    }

    const token = authHeader.replace('Bearer ', '').trim();
    if (!token) {
      return jsonResponse(
        { success: false, message: 'Token otentikasi tidak ditemukan.' },
        401
      );
    }

    // 5. Initialize client to identify the authenticated caller
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
        401
      );
    }

    // 6. Initialize privileged Admin client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 7. Verify Caller Profile & Active Status directly from profiles table
    const { data: callerProfile, error: callerProfileError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, role, is_active')
      .eq('id', callerUser.id)
      .single();

    if (callerProfileError || !callerProfile) {
      return jsonResponse(
        { success: false, message: 'Profil pemanggil tidak ditemukan di sistem.' },
        403
      );
    }

    if (!callerProfile.is_active) {
      return jsonResponse(
        { success: false, message: 'Akun pemanggil dalam status dinonaktifkan.' },
        403
      );
    }

    const callerRole = callerProfile.role as AppRole;

    // 8. Enforce Caller Authorization Rules (Only super_admin and admin are allowed)
    if (callerRole !== 'super_admin' && callerRole !== 'admin') {
      return jsonResponse(
        {
          success: false,
          message: 'Akses ditolak. Anda tidak memiliki wewenang untuk mengubah status akun pengguna.',
        },
        403
      );
    }

    // 9. Parse and Validate Request Body
    let body: UpdateUserStatusRequestBody;
    try {
      body = await req.json();
    } catch {
      return jsonResponse(
        { success: false, message: 'Format payload JSON tidak valid.' },
        400
      );
    }

    const targetUserId = body.target_user_id?.trim();
    const newIsActive = body.is_active;

    // Validate target_user_id (UUID)
    if (!targetUserId || !UUID_REGEX.test(targetUserId)) {
      return jsonResponse(
        { success: false, message: 'ID pengguna target tidak valid (harus berupa UUID).' },
        400
      );
    }

    // Strict boolean validation for is_active
    if (typeof newIsActive !== 'boolean') {
      return jsonResponse(
        {
          success: false,
          message: 'Nilai status is_active tidak valid (harus berupa nilai boolean true atau false).',
        },
        400
      );
    }

    // 10. Self-status modification protection
    if (targetUserId === callerUser.id) {
      return jsonResponse(
        {
          success: false,
          message: 'Pengguna tidak dapat mengubah status pada akun miliknya sendiri.',
        },
        403
      );
    }

    // 11. Fetch and Validate Target Profile
    const { data: targetProfile, error: targetProfileError } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, role, is_active')
      .eq('id', targetUserId)
      .single();

    if (targetProfileError || !targetProfile) {
      return jsonResponse(
        { success: false, message: 'Pengguna target tidak ditemukan di sistem.' },
        404
      );
    }

    const targetRole = targetProfile.role as AppRole;

    // If status is already identical, return early with success
    if (targetProfile.is_active === newIsActive) {
      return jsonResponse(
        {
          success: true,
          message: `Status akun pengguna sudah ${newIsActive ? 'aktif' : 'nonaktif'}.`,
          user: {
            id: targetProfile.id,
            full_name: targetProfile.full_name,
            role: targetProfile.role,
            is_active: targetProfile.is_active,
          },
        },
        200
      );
    }

    // 12. Super Admin Protection from Admin modification
    if (callerRole === 'admin' && targetRole === 'super_admin') {
      return jsonResponse(
        {
          success: false,
          message: 'Admin tidak memiliki wewenang untuk mengubah status akun Super Admin.',
        },
        403
      );
    }

    // 13. Perform Atomic Status Update on public.profiles (strictly modifying is_active & updated_at only)
    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        is_active: newIsActive,
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetUserId)
      .select('id, full_name, role, is_active')
      .single();

    if (updateError || !updatedProfile) {
      console.error('Error updating profile status:', updateError?.message);
      return jsonResponse(
        { success: false, message: 'Gagal memperbarui status akun pengguna di database.' },
        500
      );
    }

    // 14. Return Success Response
    return jsonResponse(
      {
        success: true,
        message: `Akun pengguna berhasil ${newIsActive ? 'diaktifkan' : 'dinonaktifkan'}.`,
        user: {
          id: updatedProfile.id,
          full_name: updatedProfile.full_name,
          role: updatedProfile.role,
          is_active: updatedProfile.is_active,
        },
      },
      200
    );
  } catch (err: unknown) {
    console.error('Unhandled update-user-status Edge Function error:', err);
    return jsonResponse(
      { success: false, message: 'Terjadi kesalahan pada server saat memperbarui status akun pengguna.' },
      500
    );
  }
});
