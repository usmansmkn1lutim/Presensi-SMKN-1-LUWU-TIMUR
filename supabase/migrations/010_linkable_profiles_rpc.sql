-- ============================================================================
-- Migration: 010_linkable_profiles_rpc.sql
-- Module: PHASE 4A — Linkable Profiles RPC Function
-- Description:
--   Allows Admin and Super Admin to fetch active profiles securely to link
--   to employee records without weakening or bypassing RLS on public.profiles.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_linkable_profiles()
RETURNS TABLE (
    id UUID,
    full_name TEXT,
    role app_role,
    is_active BOOLEAN,
    last_login_at TIMESTAMPTZ,
    avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- Verify caller is admin or super_admin
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid()
          AND role IN ('admin', 'super_admin')
          AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Akses ditolak. Hanya Admin atau Super Admin yang dapat melihat daftar akun.';
    END IF;

    -- Return safe minimal profile fields for active profiles
    RETURN QUERY
    SELECT 
        p.id,
        p.full_name,
        p.role,
        p.is_active,
        p.last_login_at,
        p.avatar_url
    FROM public.profiles p
    WHERE p.is_active = true
    ORDER BY p.full_name ASC;
END;
$$;

-- Grant execution permission to authenticated users (internal function check enforces admin role)
GRANT EXECUTE ON FUNCTION public.get_linkable_profiles() TO authenticated;
