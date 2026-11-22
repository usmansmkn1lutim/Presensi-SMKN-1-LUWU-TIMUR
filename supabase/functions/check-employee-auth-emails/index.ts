// ============================================================================
// Supabase Edge Function: check-employee-auth-emails
// Description:
//   Read-only server-side check to verify whether normalized employee emails
//   already exist in Supabase Auth (auth.users).
//   Security guarantees:
//     - Strict CORS origin allowlist
//     - Verifies caller JWT and authoritative active Admin/Super Admin profile
//     - Uses SUPABASE_SERVICE_ROLE_KEY strictly on server
//     - Handles Auth Admin API pagination completely
//     - Limits max 500 emails per request
//     - Returns minimal { email, existsInAuth } only (no sensitive user fields)
//     - Performs zero mutations (never creates, updates, deletes, or links accounts)
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.8';

const ALLOWED_ORIGINS = [
  'https://ais-dev-tezldmbtiuugsm3lvw4wdk-70461058593.asia-southeast1.run.app',
  'https://ais-pre-tezldmbtiuugsm3lvw4wdk-70461058593.asia-southeast1.run.app',
  'https://presensismkn1luwutimur.vercel.app',
];

const MAX_EMAILS_PER_REQUEST = 500;
const AUTH_LIST_PAGE_SIZE = 1000;
const MAX_AUTH_PAGES = 100;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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

interface CheckAuthEmailsRequestBody {
  emails?: unknown;
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

    // Verify caller JWT via anon client bound to bearer token
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

    // Server-side privileged client (never exposed to frontend)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Verify authoritative caller role & active status from public.profiles
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
          message: 'Akses ditolak. Hanya Admin atau Super Admin yang dapat memeriksa email Auth.',
        },
        403,
        requestOrigin
      );
    }

    // Parse & validate payload
    let body: CheckAuthEmailsRequestBody;
    try {
      body = await req.json();
    } catch {
      return jsonResponse(
        { success: false, message: 'Format payload JSON tidak valid.' },
        400,
        requestOrigin
      );
    }

    if (!Array.isArray(body.emails)) {
      return jsonResponse(
        { success: false, message: 'Daftar email harus berupa array.' },
        400,
        requestOrigin
      );
    }

    if (body.emails.length > MAX_EMAILS_PER_REQUEST) {
      return jsonResponse(
        {
          success: false,
          message: `Jumlah email melebihi batas maksimal ${MAX_EMAILS_PER_REQUEST} per permintaan.`,
        },
        400,
        requestOrigin
      );
    }

    const normalizedTargets: string[] = [];
    const targetSet = new Set<string>();

    for (const rawItem of body.emails) {
      if (typeof rawItem !== 'string') continue;
      const normalized = rawItem.trim().toLowerCase();
      if (!normalized || normalized.length > 255 || !EMAIL_REGEX.test(normalized)) continue;
      if (!targetSet.has(normalized)) {
        targetSet.add(normalized);
        normalizedTargets.push(normalized);
      }
    }

    if (normalizedTargets.length === 0) {
      return jsonResponse({ success: true, results: [] }, 200, requestOrigin);
    }

    // Read-only paginated lookup via Supabase Auth Admin API
    const foundAuthEmails = new Set<string>();
    let page = 1;

    while (page <= MAX_AUTH_PAGES) {
      const { data: usersPage, error: listUsersError } =
        await supabaseAdmin.auth.admin.listUsers({
          page,
          perPage: AUTH_LIST_PAGE_SIZE,
        });

      if (listUsersError) {
        console.error('Auth admin listUsers error occurred during read-only check.');
        return jsonResponse(
          { success: false, message: 'Gagal memeriksa data akun di Supabase Auth.' },
          500,
          requestOrigin
        );
      }

      const users = usersPage?.users || [];
      for (const authUser of users) {
        if (typeof authUser.email === 'string') {
          const authEmail = authUser.email.trim().toLowerCase();
          if (targetSet.has(authEmail)) {
            foundAuthEmails.add(authEmail);
          }
        }
      }

      // Stop early if all target emails are already found or we reached the last page
      const nextPage = (usersPage as { nextPage?: number | null } | null)?.nextPage;
      if (foundAuthEmails.size === targetSet.size) {
        break;
      }
      if (users.length < AUTH_LIST_PAGE_SIZE && !nextPage) {
        break;
      }
      if (users.length === 0) {
        break;
      }

      page = nextPage ? nextPage : page + 1;
    }

    const results = normalizedTargets.map((email) => ({
      email,
      existsInAuth: foundAuthEmails.has(email),
    }));

    return jsonResponse({ success: true, results }, 200, requestOrigin);
  } catch {
    console.error('Unhandled error in check-employee-auth-emails.');
    return jsonResponse(
      { success: false, message: 'Terjadi kesalahan pada server saat memeriksa email Auth.' },
      500,
      requestOrigin
    );
  }
});
