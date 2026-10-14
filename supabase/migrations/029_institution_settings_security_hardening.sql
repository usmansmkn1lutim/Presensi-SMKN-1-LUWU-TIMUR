-- ============================================================================
-- Migration: 029_institution_settings_security_hardening.sql
-- Module: PHASE SETTINGS-PERSIST-02A — POST-IMPLEMENTATION SECURITY HARDENING
-- Description:
--   1. Fixes information disclosure risk on public.institution_settings:
--      - Revokes direct table SELECT/INSERT/UPDATE/DELETE from 'anon'.
--      - Restricts direct table SELECT to active authenticated users only.
--   2. Provides hardened public RPC public.get_public_institution_identity():
--      - Returns ONLY safe public identity columns (school_name, school_address,
--        school_logo_url, app_name, app_desc).
--      - Internal columns (updated_by, extra_settings) are strictly shielded.
--      - Granted to both 'anon' (for login/landing screens) and 'authenticated'.
--   3. Hardens public.get_active_institution_settings():
--      - Revokes execution from 'anon' and 'PUBLIC'.
--      - Granted strictly to 'authenticated' users.
--      - Adds caller authentication validation.
--   4. Eliminates audit spoofing on mutations:
--      - Replaces basic updated_at trigger with enforce_institution_settings_audit_fields().
--      - Forces updated_by = auth.uid() on INSERT and UPDATE.
--      - Protects created_at immutability on UPDATE.
--      - Prevents active singleton deactivation without replacement.
--   5. Hardens DELETE protection:
--      - Explicitly revokes DELETE from anon, authenticated, PUBLIC.
--      - Adds trigger_prevent_institution_settings_delete() to abort any DELETE attempt.
--   6. Hardens 'school-assets' storage policies:
--      - Enforces strict path validation (blocks path traversal '..', restricts extensions
--        to png, jpg, jpeg, webp).
--   7. Reloads PostgREST schema cache.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Table-Level Grants and Revocations on public.institution_settings
-- ----------------------------------------------------------------------------
-- Shield internal table columns from unauthenticated direct inspection
REVOKE ALL ON TABLE public.institution_settings FROM anon, PUBLIC;
GRANT SELECT, INSERT, UPDATE ON TABLE public.institution_settings TO authenticated;
REVOKE DELETE ON TABLE public.institution_settings FROM authenticated, anon, PUBLIC;

-- ----------------------------------------------------------------------------
-- 2. Restrict Direct Table SELECT Policy to Active Authenticated Users
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "institution_settings_select_policy" ON public.institution_settings;

CREATE POLICY "institution_settings_select_policy"
    ON public.institution_settings
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
              AND is_active = true
        )
    );

-- ----------------------------------------------------------------------------
-- 3. Dedicated Public RPC: public.get_public_institution_identity
-- ----------------------------------------------------------------------------
-- Safely exposes only public visual branding to anon (login page) and authenticated users.
-- Column-level shielding: updated_by and extra_settings are never exposed.
CREATE OR REPLACE FUNCTION public.get_public_institution_identity()
RETURNS TABLE (
    school_name TEXT,
    school_address TEXT,
    school_logo_url TEXT,
    app_name TEXT,
    app_desc TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT 
        s.school_name,
        s.school_address,
        s.school_logo_url,
        s.app_name,
        s.app_desc
    FROM public.institution_settings s
    WHERE s.is_active = true
    LIMIT 1;
$$;

COMMENT ON FUNCTION public.get_public_institution_identity() 
IS 'Exposes public branding and identity columns (school name, address, logo, app title) without leaking audit or internal settings.';

-- Configure minimal execution privileges: accessible to anon (login/landing) and authenticated
REVOKE ALL ON FUNCTION public.get_public_institution_identity() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_institution_identity() TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 4. Harden public.get_active_institution_settings
-- ----------------------------------------------------------------------------
-- Revoke anon access to full record RPC; restrict strictly to authenticated callers
CREATE OR REPLACE FUNCTION public.get_active_institution_settings()
RETURNS SETOF public.institution_settings
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
BEGIN
    -- Require authenticated caller
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Akses ditolak. Otentikasi diperlukan untuk membaca konfigurasi instansi lengkap.'
            USING ERRCODE = '42501';
    END IF;

    -- Verify active account
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = v_caller_id AND is_active = true
    ) THEN
        RAISE EXCEPTION 'Akses ditolak. Akun pengguna tidak aktif atau tidak ditemukan.'
            USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT s.* FROM public.institution_settings s
    WHERE s.is_active = true
    LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.get_active_institution_settings() FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_active_institution_settings() TO authenticated;

-- ----------------------------------------------------------------------------
-- 5. Audit Spoofing Elimination Trigger (updated_by & timestamps)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.enforce_institution_settings_audit_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    -- 1. Always enforce server-side updated_at timestamp
    NEW.updated_at := now();

    -- 2. Explicitly branch INSERT and UPDATE to avoid unassigned OLD record error on INSERT
    IF TG_OP = 'INSERT' THEN
        NEW.created_at := COALESCE(NEW.created_at, now());
        IF auth.uid() IS NOT NULL THEN
            NEW.updated_by := auth.uid();
        END IF;
    ELSIF TG_OP = 'UPDATE' THEN
        NEW.created_at := OLD.created_at;
        IF auth.uid() IS NOT NULL THEN
            NEW.updated_by := auth.uid();
        ELSE
            NEW.updated_by := COALESCE(NEW.updated_by, OLD.updated_by);
        END IF;

        -- 3. Invariant Protection: Prevent deactivating the active singleton without replacement
        IF OLD.is_active = true AND NEW.is_active = false THEN
            RAISE EXCEPTION 'Pengaturan instansi aktif tidak dapat dinonaktifkan secara manual. Sistem wajib memiliki tepat 1 pengaturan aktif.'
                USING ERRCODE = '23514';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Drop legacy trigger and attach comprehensive audit trigger
DROP TRIGGER IF EXISTS trigger_set_institution_settings_updated_at ON public.institution_settings;
DROP TRIGGER IF EXISTS trigger_enforce_institution_settings_audit_fields ON public.institution_settings;

CREATE TRIGGER trigger_enforce_institution_settings_audit_fields
    BEFORE INSERT OR UPDATE ON public.institution_settings
    FOR EACH ROW
    EXECUTE FUNCTION enforce_institution_settings_audit_fields();

-- ----------------------------------------------------------------------------
-- 6. Hard Delete Blocking Trigger
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_institution_settings_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    RAISE EXCEPTION 'Operasi DELETE pada tabel institution_settings dilarang (singleton configuration).'
        USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS trigger_prevent_institution_settings_delete ON public.institution_settings;
CREATE TRIGGER trigger_prevent_institution_settings_delete
    BEFORE DELETE ON public.institution_settings
    FOR EACH ROW
    EXECUTE FUNCTION prevent_institution_settings_delete();

-- ----------------------------------------------------------------------------
-- 7. Hardened Storage Policies for 'school-assets' Bucket
-- ----------------------------------------------------------------------------
-- Update storage.objects INSERT policy to validate path and file extension
DROP POLICY IF EXISTS "school_assets_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "school_assets_update_policy" ON storage.objects;

-- INSERT: Enforces role, active status, path traversal protection, and approved image extensions
CREATE POLICY "school_assets_insert_policy"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'school-assets'
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
              AND is_active = true
              AND role IN ('admin', 'super_admin')
        )
        -- Anti-path-traversal and sanitization
        AND name NOT LIKE '%..%'
        AND name NOT LIKE '/%'
        -- Extension whitelist validation
        AND (
            lower(storage.extension(name)) IN ('png', 'jpg', 'jpeg', 'webp')
        )
    );

-- UPDATE: Same strict validation
CREATE POLICY "school_assets_update_policy"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'school-assets'
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
              AND is_active = true
              AND role IN ('admin', 'super_admin')
        )
    )
    WITH CHECK (
        bucket_id = 'school-assets'
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
              AND is_active = true
              AND role IN ('admin', 'super_admin')
        )
        AND name NOT LIKE '%..%'
        AND name NOT LIKE '/%'
        AND (
            lower(storage.extension(name)) IN ('png', 'jpg', 'jpeg', 'webp')
        )
    );

-- ----------------------------------------------------------------------------
-- 8. PostgREST Schema Cache Reload
-- ----------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

COMMIT;
