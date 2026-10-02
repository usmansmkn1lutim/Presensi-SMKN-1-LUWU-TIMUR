// ============================================================================
// Supabase Edge Function: update-user-role
// Module: PHASE 4B-5-1 — Secure Update User Role Backend
// Description:
//   Server-side Edge Function to safely update profiles.role with strict
//   authorization matrices and privilege escalation guards:
//     - Super Admin can assign: super_admin, admin, headmaster, employee (other users)
//     - Admin can assign ONLY: headmaster, employee (cannot modify super_admin accounts)
//     - Headmaster / Employee: Forbidden (403)
//     - Self-role changes: Forbidden (403)
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

// Allowed active application roles (verifier is excluded)
const ALLOWED_ROLES = ['super_admin', 'admin', 'headmaster', 'employee'] as const;
type AppRole = (typeof ALLOWED_ROLES)[number];

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface UpdateUserRoleRequestBody {
  target_user_id?: string;
  new_role?: string;
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
          message: 'Akses ditolak. Anda tidak memiliki wewenang untuk mengubah peran pengguna.',
        },
        403
      );
    }

    // 9. Parse and Validate Request Body
    let body: UpdateUserRoleRequestBody;
    try {
      body = await req.json();
    } catch {
      return jsonResponse(
        { success: false, message: 'Format payload JSON tidak valid.' },
        400
      );
    }

    const targetUserId = body.target_user_id?.trim();
    const rawNewRole = body.new_role?.trim();

    // Validate target_user_id (UUID)
    if (!targetUserId || !UUID_REGEX.test(targetUserId)) {
      return jsonResponse(
        { success: false, message: 'ID pengguna target tidak valid (harus berupa UUID).' },
        400
      );
    }

    // Validate new_role
    if (!rawNewRole || !ALLOWED_ROLES.includes(rawNewRole as AppRole)) {
      return jsonResponse(
        {
          success: false,
          message: `Role baru tidak valid. Role yang diizinkan: ${ALLOWED_ROLES.join(', ')}.`,
        },
        400
      );
    }

    const newRole = rawNewRole as AppRole;

    // 10. Self-role change protection
    if (targetUserId === callerUser.id) {
      return jsonResponse(
        {
          success: false,
          message: 'Pengguna tidak dapat mengubah peran pada akun miliknya sendiri.',
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

    const currentTargetRole = targetProfile.role as AppRole;

    // If role is already the same, return early with success
    if (currentTargetRole === newRole) {
      return jsonResponse(
        {
          success: true,
          message: `Peran pengguna sudah merupakan ${newRole}.`,
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

    // 12. Privilege Escalation Guards
    if (callerRole === 'admin') {
      // Admin cannot modify a Super Admin's role
      if (currentTargetRole === 'super_admin') {
        return jsonResponse(
          {
            success: false,
            message: 'Admin tidak memiliki wewenang untuk mengubah peran akun Super Admin.',
          },
          403
        );
      }

      // Admin cannot elevate any user to Admin or Super Admin
      if (newRole === 'super_admin' || newRole === 'admin') {
        return jsonResponse(
          {
            success: false,
            message: 'Admin hanya berwenang mengubah peran menjadi Kepala Sekolah atau Pegawai.',
          },
          403
        );
      }
    }

    // 13. Perform Atomic Role Update on public.profiles
    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update({
        role: newRole,
        updated_at: new Date().toISOString(),
      })
      .eq('id', targetUserId)
      .select('id, full_name, role, is_active')
      .single();

    if (updateError || !updatedProfile) {
      console.error('Error updating profile role:', updateError?.message);
      return jsonResponse(
        { success: false, message: 'Gagal memperbarui peran pengguna di database.' },
        500
      );
    }

    // 14. Return Success Response
    return jsonResponse(
      {
        success: true,
        message: 'Peran pengguna berhasil diperbarui.',
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
    console.error('Unhandled update-user-role Edge Function error:', err);
    return jsonResponse(
      { success: false, message: 'Terjadi kesalahan pada server saat memperbarui peran pengguna.' },
      500
    );
  }
});
