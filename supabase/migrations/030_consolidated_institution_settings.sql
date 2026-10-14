
-- ============================================================================
-- 030_consolidated_institution_settings.sql
-- Tamaki — Consolidated Institution Settings Migration
--
-- Creates:
--   1. institution_settings table, constraints, and indexes
--   2. Audit/timestamp and delete-prevention triggers
--   3. Public identity RPC
--   4. Full settings RPC for active authenticated users
--   5. RLS policies for institution settings
--   6. Public school-assets bucket and access policies
--   7. Initial institution settings seed
--   8. PostgREST schema reload notification
--
-- Access model:
--   Public/anonymous: read safe institution identity and school logo
--   Active authenticated users: read complete institution settings
--   Active admin/super_admin: insert and update institution settings
--   Active admin/super_admin: manage school-assets files
--
-- Atomicity: One BEGIN and one COMMIT
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Institution settings table
-- ----------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.institution_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_name TEXT NOT NULL,
    school_address TEXT,
    school_logo_url TEXT,
    app_name TEXT NOT NULL DEFAULT 'Presensi Pegawai Sekolah',
    app_desc TEXT DEFAULT
        'Sistem presensi pegawai sekolah SMK Negeri 1 Luwu Timur',
    is_active BOOLEAN NOT NULL DEFAULT true,
    extra_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,

    CONSTRAINT institution_settings_school_name_check
        CHECK (length(trim(school_name)) > 0),

    CONSTRAINT institution_settings_app_name_check
        CHECK (length(trim(app_name)) > 0)
);

COMMENT ON TABLE public.institution_settings IS
    'Centralized institution identity and system settings for Tamaki';

-- ----------------------------------------------------------------------------
-- 2. Indexes
-- ----------------------------------------------------------------------------

-- At most one active institution settings record.
CREATE UNIQUE INDEX IF NOT EXISTS idx_institution_settings_single_active
    ON public.institution_settings (is_active)
    WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_institution_settings_updated_at
    ON public.institution_settings (updated_at DESC);

-- ----------------------------------------------------------------------------
-- 3. Audit and timestamp trigger
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.enforce_institution_settings_audit_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    NEW.updated_at := now();

    IF TG_OP = 'INSERT' THEN
        NEW.created_at := COALESCE(NEW.created_at, now());

        IF auth.uid() IS NOT NULL THEN
            NEW.updated_by := auth.uid();
        END IF;

    ELSIF TG_OP = 'UPDATE' THEN
        -- Preserve the original creation timestamp.
        NEW.created_at := OLD.created_at;

        IF auth.uid() IS NOT NULL THEN
            NEW.updated_by := auth.uid();
        ELSE
            NEW.updated_by := COALESCE(NEW.updated_by, OLD.updated_by);
        END IF;

        -- The active record cannot be deactivated through normal updates.
        IF OLD.is_active = true AND NEW.is_active = false THEN
            RAISE EXCEPTION
                'Pengaturan instansi aktif tidak dapat dinonaktifkan secara manual.'
                USING ERRCODE = '23514';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

-- Remove legacy and previous trigger names if present.
DROP TRIGGER IF EXISTS
    trigger_set_institution_settings_updated_at
    ON public.institution_settings;

DROP TRIGGER IF EXISTS
    trigger_enforce_institution_settings_audit_fields
    ON public.institution_settings;

CREATE TRIGGER trigger_enforce_institution_settings_audit_fields
    BEFORE INSERT OR UPDATE
    ON public.institution_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_institution_settings_audit_fields();

-- ----------------------------------------------------------------------------
-- 4. Prevent hard deletion
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.prevent_institution_settings_delete()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
    RAISE EXCEPTION
        'Operasi DELETE pada tabel institution_settings dilarang.'
        USING ERRCODE = '42501';
END;
$$;

DROP TRIGGER IF EXISTS
    trigger_prevent_institution_settings_delete
    ON public.institution_settings;

CREATE TRIGGER trigger_prevent_institution_settings_delete
    BEFORE DELETE
    ON public.institution_settings
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_institution_settings_delete();

-- ----------------------------------------------------------------------------
-- 5A. Public identity RPC
-- Safe institution identity fields only
-- ----------------------------------------------------------------------------

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
    FROM public.institution_settings AS s
    WHERE s.is_active = true
    LIMIT 1;
$$;

REVOKE ALL
    ON FUNCTION public.get_public_institution_identity()
    FROM PUBLIC;

GRANT EXECUTE
    ON FUNCTION public.get_public_institution_identity()
    TO anon, authenticated;

-- ----------------------------------------------------------------------------
-- 5B. Full settings RPC
-- Available to all active authenticated users
-- ----------------------------------------------------------------------------

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
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION
            'Akses ditolak. Otentikasi diperlukan.'
            USING ERRCODE = '42501';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.profiles AS p
        WHERE p.id = v_caller_id
          AND p.is_active = true
    ) THEN
        RAISE EXCEPTION
            'Akses ditolak. Akun pengguna tidak aktif atau tidak ditemukan.'
            USING ERRCODE = '42501';
    END IF;

    RETURN QUERY
    SELECT s.*
    FROM public.institution_settings AS s
    WHERE s.is_active = true
    LIMIT 1;
END;
$$;

REVOKE ALL
    ON FUNCTION public.get_active_institution_settings()
    FROM PUBLIC, anon;

GRANT EXECUTE
    ON FUNCTION public.get_active_institution_settings()
    TO authenticated;

-- ----------------------------------------------------------------------------
-- 6. RLS and table privileges
-- ----------------------------------------------------------------------------

ALTER TABLE public.institution_settings ENABLE ROW LEVEL SECURITY;

REVOKE ALL
    ON TABLE public.institution_settings
    FROM PUBLIC, anon;

GRANT SELECT, INSERT, UPDATE
    ON TABLE public.institution_settings
    TO authenticated;

REVOKE DELETE
    ON TABLE public.institution_settings
    FROM PUBLIC, anon, authenticated;

DROP POLICY IF EXISTS
    "institution_settings_select_policy"
    ON public.institution_settings;

DROP POLICY IF EXISTS
    "institution_settings_insert_policy"
    ON public.institution_settings;

DROP POLICY IF EXISTS
    "institution_settings_update_policy"
    ON public.institution_settings;

DROP POLICY IF EXISTS
    "institution_settings_delete_policy"
    ON public.institution_settings;

-- Active authenticated users may read settings.
CREATE POLICY "institution_settings_select_policy"
    ON public.institution_settings
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.profiles AS p
            WHERE p.id = auth.uid()
              AND p.is_active = true
        )
    );

-- Only active admins and super admins may insert.
CREATE POLICY "institution_settings_insert_policy"
    ON public.institution_settings
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.profiles AS p
            WHERE p.id = auth.uid()
              AND p.is_active = true
              AND p.role IN ('admin', 'super_admin')
        )
    );

-- Only active admins and super admins may update.
CREATE POLICY "institution_settings_update_policy"
    ON public.institution_settings
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.profiles AS p
            WHERE p.id = auth.uid()
              AND p.is_active = true
              AND p.role IN ('admin', 'super_admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.profiles AS p
            WHERE p.id = auth.uid()
              AND p.is_active = true
              AND p.role IN ('admin', 'super_admin')
        )
    );

-- ----------------------------------------------------------------------------
-- 7. School assets storage bucket
-- ----------------------------------------------------------------------------

INSERT INTO storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
)
VALUES (
    'school-assets',
    'school-assets',
    true,
    2097152,
    ARRAY[
        'image/png',
        'image/jpeg',
        'image/jpg',
        'image/webp'
    ]
)
ON CONFLICT (id) DO UPDATE SET
    public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- ----------------------------------------------------------------------------
-- 8. Storage policies for school-assets
-- Existing attendance-selfies policies are not modified.
-- ----------------------------------------------------------------------------

DROP POLICY IF EXISTS
    "school_assets_select_policy"
    ON storage.objects;

DROP POLICY IF EXISTS
    "school_assets_insert_policy"
    ON storage.objects;

DROP POLICY IF EXISTS
    "school_assets_update_policy"
    ON storage.objects;

DROP POLICY IF EXISTS
    "school_assets_delete_policy"
    ON storage.objects;

-- Public may read school assets.
CREATE POLICY "school_assets_select_policy"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'school-assets');

-- Active admins and super admins may upload approved image types.
CREATE POLICY "school_assets_insert_policy"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'school-assets'
        AND EXISTS (
            SELECT 1
            FROM public.profiles AS p
            WHERE p.id = auth.uid()
              AND p.is_active = true
              AND p.role IN ('admin', 'super_admin')
        )
        AND name NOT LIKE '%..%'
        AND name NOT LIKE '/%'
        AND lower(storage.extension(name))
            IN ('png', 'jpg', 'jpeg', 'webp')
    );

-- Active admins and super admins may update approved assets.
CREATE POLICY "school_assets_update_policy"
    ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'school-assets'
        AND EXISTS (
            SELECT 1
            FROM public.profiles AS p
            WHERE p.id = auth.uid()
              AND p.is_active = true
              AND p.role IN ('admin', 'super_admin')
        )
    )
    WITH CHECK (
        bucket_id = 'school-assets'
        AND EXISTS (
            SELECT 1
            FROM public.profiles AS p
            WHERE p.id = auth.uid()
              AND p.is_active = true
              AND p.role IN ('admin', 'super_admin')
        )
        AND name NOT LIKE '%..%'
        AND name NOT LIKE '/%'
        AND lower(storage.extension(name))
            IN ('png', 'jpg', 'jpeg', 'webp')
    );

-- Active admins and super admins may delete school assets.
CREATE POLICY "school_assets_delete_policy"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'school-assets'
        AND EXISTS (
            SELECT 1
            FROM public.profiles AS p
            WHERE p.id = auth.uid()
              AND p.is_active = true
              AND p.role IN ('admin', 'super_admin')
        )
    );

-- ----------------------------------------------------------------------------
-- 9. Idempotent initial settings seed
-- ----------------------------------------------------------------------------

INSERT INTO public.institution_settings (
    school_name,
    school_address,
    school_logo_url,
    app_name,
    app_desc,
    is_active
)
SELECT
    'SMK NEGERI 1 LUWU TIMUR',
    'Jl. Trans Sulawesi No. 12, Luwu Timur, Sulawesi Selatan',
    NULL,
    'Presensi Pegawai Sekolah',
    'Sistem presensi pegawai sekolah SMK Negeri 1 Luwu Timur',
    true
WHERE NOT EXISTS (
    SELECT 1
    FROM public.institution_settings
    WHERE is_active = true
);

-- ----------------------------------------------------------------------------
-- 10. Reload PostgREST schema cache
-- ----------------------------------------------------------------------------

NOTIFY pgrst, 'reload schema';

COMMIT;
