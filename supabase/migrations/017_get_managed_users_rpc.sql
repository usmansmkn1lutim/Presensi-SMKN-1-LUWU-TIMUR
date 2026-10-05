-- ============================================================================
-- Migration: 017_get_managed_users_rpc.sql
-- Module: PHASE 4B-3 / User Management RPC
-- Description:
--   Secure SECURITY DEFINER RPC to retrieve all user profile records for
--   User Management (/users) by active Admin and Super Admin.
--   Prevents RLS restrictions while enforcing strict server-side authorization.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_managed_users()
RETURNS TABLE (
    id UUID,
    full_name TEXT,
    avatar_url TEXT,
    role app_role,
    is_active BOOLEAN,
    last_login_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
#variable_conflict use_column
DECLARE
    v_caller_id UUID := auth.uid();
BEGIN
    -- 1. Ensure caller is authenticated
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Pengguna belum terautentikasi.';
    END IF;

    -- 2. Verify caller is an active admin or super_admin
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles AS prof
        WHERE prof.id = v_caller_id
          AND prof.role IN ('admin', 'super_admin')
          AND prof.is_active = true
    ) THEN
        RAISE EXCEPTION 'Akses ditolak. Hanya Admin atau Super Admin aktif yang dapat mengelola daftar pengguna.';
    END IF;

    -- 3. Return full profile records for user management
    RETURN QUERY
    SELECT 
        p.id,
        p.full_name,
        p.avatar_url,
        p.role,
        p.is_active,
        p.last_login_at,
        p.created_at,
        p.updated_at
    FROM public.profiles AS p
    ORDER BY p.created_at DESC;
END;
$$;

-- Explicit privilege configuration
REVOKE ALL ON FUNCTION public.get_managed_users() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_managed_users() FROM anon;
GRANT EXECUTE ON FUNCTION public.get_managed_users() TO authenticated;
