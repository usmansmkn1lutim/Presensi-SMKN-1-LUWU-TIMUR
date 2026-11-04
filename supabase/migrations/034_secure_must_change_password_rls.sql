-- ============================================================================
-- Migration: 034_secure_must_change_password_rls.sql
-- Module: PHASE 4D-4 — MUST_CHANGE_PASSWORD RLS HARDENING FOR ALL ROLES
-- Description:
--   1. Grants USAGE on private schema to authenticated and service_role.
--   2. Defines SECURITY DEFINER helpers to check if restricted columns are unchanged
--      without triggering RLS infinite recursion.
--   3. Restructures UPDATE policies on public.profiles so that NO authenticated role
--      (employee, headmaster, admin, super_admin) can modify must_change_password
--      directly via client SDK or REST API.
--   4. Preserves administrator rights to update role, is_active, full_name, and avatar_url.
--   5. Retains service_role capability for Edge Functions to manage must_change_password.
-- ============================================================================

-- 1. Grant USAGE on private schema to authenticated users for RLS helper functions
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

-- 2. Helper 1: Check if must_change_password remains unchanged
CREATE OR REPLACE FUNCTION private.profile_must_change_password_unchanged(
    check_user_id UUID,
    new_must_change_password BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = check_user_id
          AND must_change_password = new_must_change_password
    );
$$;

REVOKE EXECUTE ON FUNCTION private.profile_must_change_password_unchanged(UUID, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.profile_must_change_password_unchanged(UUID, BOOLEAN) TO authenticated, service_role;

-- 3. Helper 2: Check if role, is_active, and must_change_password remain unchanged
CREATE OR REPLACE FUNCTION private.profile_restricted_fields_unchanged(
    check_user_id UUID,
    new_role app_role,
    new_is_active BOOLEAN,
    new_must_change_password BOOLEAN
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = check_user_id
          AND role = new_role
          AND is_active = new_is_active
          AND must_change_password = new_must_change_password
    );
$$;

REVOKE EXECUTE ON FUNCTION private.profile_restricted_fields_unchanged(UUID, app_role, BOOLEAN, BOOLEAN) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.profile_restricted_fields_unchanged(UUID, app_role, BOOLEAN, BOOLEAN) TO authenticated, service_role;

-- 4. Re-structure policies on public.profiles

-- Drop legacy broad admin policy and own update policy from migration 003
DROP POLICY IF EXISTS "profiles_all_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

-- Policy 1: Non-admin users can update their own unprivileged profile info (full_name, avatar_url)
CREATE POLICY "profiles_update_own"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (
        id = auth.uid()
        AND private.profile_restricted_fields_unchanged(id, role, is_active, must_change_password)
    );

-- Policy 2A: Administrators can SELECT all profiles
CREATE POLICY "profiles_admin_select"
    ON public.profiles
    FOR SELECT
    TO authenticated
    USING (private.is_admin(auth.uid()));

-- Policy 2B: Administrators can INSERT new profiles
CREATE POLICY "profiles_admin_insert"
    ON public.profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (private.is_admin(auth.uid()));

-- Policy 2C: Administrators can DELETE profiles
CREATE POLICY "profiles_admin_delete"
    ON public.profiles
    FOR DELETE
    TO authenticated
    USING (private.is_admin(auth.uid()));

-- Policy 2D: Administrators can UPDATE profiles (role, is_active, full_name, avatar_url),
-- BUT MUST NOT modify must_change_password directly via client SDK / REST API
CREATE POLICY "profiles_admin_update"
    ON public.profiles
    FOR UPDATE
    TO authenticated
    USING (private.is_admin(auth.uid()))
    WITH CHECK (
        private.is_admin(auth.uid())
        AND private.profile_must_change_password_unchanged(id, must_change_password)
    );
