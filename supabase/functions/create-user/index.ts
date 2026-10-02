// ============================================================================
// Supabase Edge Function: create-user
// Module: PHASE 4B-2 — Secure Create User
// Description:
//   Server-side Edge Function to create an Auth user and associated profile.
//   Guards against privilege escalation:
//     - Super Admin can create: super_admin, admin, headmaster, employee
//     - Admin can create: headmaster, employee
//     - Headmaster / Employee: Forbidden (403)
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

// Allowed active application roles (verifier is excluded)
const ALLOWED_ROLES = ['super_admin', 'admin', 'headmaster', 'employee'] as const;
type AppRole = (typeof ALLOWED_ROLES)[number];

// CORS headers for preflight and standard responses
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface CreateUserRequestBody {
  full_name?: string;
  email?: string;
  role?: string;
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

    // 8. Enforce Caller Authorization Rules
    if (callerRole !== 'super_admin' && callerRole !== 'admin') {
      return jsonResponse(
        {
          success: false,
          message: 'Akses ditolak. Hanya Super Admin atau Admin yang berhak membuat akun pengguna.',
        },
        403
      );
    }

    // 9. Parse and Validate Request Body
    let body: CreateUserRequestBody;
    try {
      body = await req.json();
    } catch {
      return jsonResponse(
        { success: false, message: 'Format payload JSON tidak valid.' },
        400
      );
    }

    const rawFullName = body.full_name?.trim();
    const rawEmail = body.email?.trim().toLowerCase();
    const rawRole = body.role?.trim();

    // Validate full_name
    if (!rawFullName || rawFullName.length < 2 || rawFullName.length > 150) {
      return jsonResponse(
        { success: false, message: 'Nama lengkap wajib diisi (antara 2 hingga 150 karakter).' },
        400
      );
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!rawEmail || !emailRegex.test(rawEmail) || rawEmail.length > 255) {
      return jsonResponse(
        { success: false, message: 'Alamat email tidak valid.' },
        400
      );
    }

    // Validate target role
    if (!rawRole || !ALLOWED_ROLES.includes(rawRole as AppRole)) {
      return jsonResponse(
        {
          success: false,
          message: `Role yang dipilih tidak valid. Role yang diizinkan: ${ALLOWED_ROLES.join(', ')}.`,
        },
        400
      );
    }

    const targetRole = rawRole as AppRole;

    // 10. Role Escalation Matrix Validation
    // - Super Admin: allowed to create super_admin, admin, headmaster, employee
    // - Admin: allowed to create headmaster, employee ONLY
    if (callerRole === 'admin') {
      if (targetRole === 'super_admin' || targetRole === 'admin') {
        return jsonResponse(
          {
            success: false,
            message: 'Admin tidak memiliki wewenang untuk membuat akun Admin atau Super Admin.',
          },
          403
        );
      }
    }

    // 11. Create Auth User via Supabase Auth Admin API
    // User will set their password safely via invitation or reset flow
    const { data: createUserData, error: createUserError } =
      await supabaseAdmin.auth.admin.createUser({
        email: rawEmail,
        email_confirm: true,
        user_metadata: {
          full_name: rawFullName,
          role: targetRole,
        },
      });

    if (createUserError) {
      const errorMsg = createUserError.message.toLowerCase();
      if (
        errorMsg.includes('already registered') ||
        errorMsg.includes('already exists') ||
        errorMsg.includes('duplicate')
      ) {
        return jsonResponse(
          { success: false, message: 'Alamat email sudah digunakan oleh akun lain.' },
          409
        );
      }

      console.error('Error in auth.admin.createUser:', createUserError.message);
      return jsonResponse(
        { success: false, message: 'Gagal membuat akun autentikasi pengguna.' },
        500
      );
    }

    const newAuthUser = createUserData.user;
    if (!newAuthUser) {
      return jsonResponse(
        { success: false, message: 'Gagal memperoleh data user baru yang dibuat.' },
        500
      );
    }

    // 12. Ensure Profile Record in public.profiles matches requested details
    // (Trigger handle_new_user might have created standard employee, we guarantee role and full_name)
    const { data: updatedProfile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .upsert({
        id: newAuthUser.id,
        full_name: rawFullName,
        role: targetRole,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .select('id, full_name, role, is_active')
      .single();

    // 13. Transaction Rollback handling if profile fails
    if (profileError || !updatedProfile) {
      console.error('Error saving profile record:', profileError?.message);

      // Rollback: Delete the newly created auth user so no orphaned auth user remains
      try {
        await supabaseAdmin.auth.admin.deleteUser(newAuthUser.id);
      } catch (rollbackErr) {
        console.error('Rollback deleteUser failed for user id:', newAuthUser.id, rollbackErr);
      }

      return jsonResponse(
        { success: false, message: 'Gagal membuat profil pengguna. Perubahan dibatalkan.' },
        500
      );
    }

    // 14. Success Response
    return jsonResponse(
      {
        success: true,
        message: 'User berhasil dibuat.',
        user: {
          id: updatedProfile.id,
          full_name: updatedProfile.full_name,
          email: newAuthUser.email,
          role: updatedProfile.role,
          is_active: updatedProfile.is_active,
        },
      },
      201
    );
  } catch (err: unknown) {
    console.error('Unhandled Edge Function error:', err);
    return jsonResponse(
      { success: false, message: 'Terjadi kesalahan pada server saat membuat akun.' },
      500
    );
  }
});
