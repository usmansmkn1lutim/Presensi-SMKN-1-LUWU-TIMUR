-- ============================================================================
-- Migration: 028_institution_settings_and_storage.sql
-- Module: PHASE SETTINGS-PERSIST-02A — DATABASE & STORAGE FOUNDATION
-- Description:
--   1. Creates public.institution_settings table for centralized institution
--      identity and system configuration (school name, address, logo URL, app metadata).
--   2. Enforces single active record invariant via idx_institution_settings_single_active.
--   3. Attaches reusable set_updated_at() trigger for automated timestamp updates.
--   4. Creates public.get_active_institution_settings() RPC helper.
--   5. Configures Row Level Security (RLS) on public.institution_settings:
--      - SELECT: Available to all authenticated users and anon (for header, login, public branding).
--      - INSERT / UPDATE: Restricted strictly to active admins and super_admins.
--      - DELETE: Disallowed in V1 (immutable singleton configuration).
--   6. Provisions public Storage bucket 'school-assets':
--      - public = true (Publicly accessible asset URLs without expiring tokens)
--      - file_size_limit = 2097152 bytes (2 MB strict limit)
--      - allowed_mime_types = image/png, image/jpeg, image/jpg, image/webp
--   7. Configures least-privilege RLS policies on storage.objects for 'school-assets':
--      - SELECT: Public read access for all users.
--      - INSERT / UPDATE / DELETE: Restricted strictly to active admins and super_admins.
--   8. Seeds default institution settings record idempotently.
--   9. Signals PostgREST schema cache reload.
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Table: public.institution_settings
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.institution_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_name TEXT NOT NULL,
    school_address TEXT,
    school_logo_url TEXT,
    app_name TEXT NOT NULL DEFAULT 'Presensi Pegawai Sekolah',
    app_desc TEXT DEFAULT 'Sistem presensi pegawai sekolah SMK Negeri 1 Luwu Timur',
    is_active BOOLEAN NOT NULL DEFAULT true,
    extra_settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,

    -- String Validation Constraints
    CONSTRAINT institution_settings_school_name_check 
        CHECK (length(trim(school_name)) > 0),
    CONSTRAINT institution_settings_app_name_check 
        CHECK (length(trim(app_name)) > 0)
);

-- Comments for documentation
COMMENT ON TABLE public.institution_settings IS 'Centralized institution identity and system settings for Tamaki';
COMMENT ON COLUMN public.institution_settings.school_name IS 'Official name of the educational institution';
COMMENT ON COLUMN public.institution_settings.school_address IS 'Physical address of the institution';
COMMENT ON COLUMN public.institution_settings.school_logo_url IS 'Public URL of the institution logo in school-assets storage';
COMMENT ON COLUMN public.institution_settings.is_active IS 'Single active flag enforced by partial unique index';
COMMENT ON COLUMN public.institution_settings.extra_settings IS 'Extensible JSONB for attendance, appearance, and notification configurations';

-- ----------------------------------------------------------------------------
-- 2. Trigger: Auto-update updated_at timestamp
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trigger_set_institution_settings_updated_at ON public.institution_settings;
CREATE TRIGGER trigger_set_institution_settings_updated_at
    BEFORE UPDATE ON public.institution_settings
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. Unique Active Protection (Single Active Rule)
-- ----------------------------------------------------------------------------
CREATE UNIQUE INDEX IF NOT EXISTS idx_institution_settings_single_active
    ON public.institution_settings (is_active)
    WHERE is_active = true;

-- Index on updated_at for cache checking
CREATE INDEX IF NOT EXISTS idx_institution_settings_updated_at
    ON public.institution_settings (updated_at DESC);

-- ----------------------------------------------------------------------------
-- 4. Helper Function: public.get_active_institution_settings
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_active_institution_settings()
RETURNS SETOF public.institution_settings
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT * FROM public.institution_settings
    WHERE is_active = true
    LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_active_institution_settings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_active_institution_settings() TO authenticated, anon;

-- ----------------------------------------------------------------------------
-- 5. Row Level Security: public.institution_settings
-- ----------------------------------------------------------------------------
ALTER TABLE public.institution_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "institution_settings_select_policy" ON public.institution_settings;
DROP POLICY IF EXISTS "institution_settings_insert_policy" ON public.institution_settings;
DROP POLICY IF EXISTS "institution_settings_update_policy" ON public.institution_settings;
DROP POLICY IF EXISTS "institution_settings_delete_policy" ON public.institution_settings;

-- SELECT: Accessible to everyone (authenticated & anon) for public header & login branding
CREATE POLICY "institution_settings_select_policy"
    ON public.institution_settings
    FOR SELECT
    USING (true);

-- INSERT: Restricted to active admins & super admins
CREATE POLICY "institution_settings_insert_policy"
    ON public.institution_settings
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
              AND is_active = true
              AND role IN ('admin', 'super_admin')
        )
    );

-- UPDATE: Restricted to active admins & super admins
CREATE POLICY "institution_settings_update_policy"
    ON public.institution_settings
    FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
              AND is_active = true
              AND role IN ('admin', 'super_admin')
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
              AND is_active = true
              AND role IN ('admin', 'super_admin')
        )
    );

-- DELETE: Explicitly disallowed in V1 (No DELETE policy)

-- ----------------------------------------------------------------------------
-- 6. Provision Storage Bucket 'school-assets'
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'school-assets',
    'school-assets',
    true,
    2097152, -- 2 MB in bytes (1024 * 1024 * 2)
    ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = true,
    file_size_limit = 2097152,
    allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];

-- ----------------------------------------------------------------------------
-- 7. Storage Policies: storage.objects for 'school-assets'
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "school_assets_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "school_assets_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "school_assets_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "school_assets_delete_policy" ON storage.objects;

-- SELECT: Public read access
CREATE POLICY "school_assets_select_policy"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'school-assets');

-- INSERT: Active admins & super admins only
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
    );

-- UPDATE: Active admins & super admins only
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
    );

-- DELETE: Active admins & super admins only
CREATE POLICY "school_assets_delete_policy"
    ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'school-assets'
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
              AND is_active = true
              AND role IN ('admin', 'super_admin')
        )
    );

-- ----------------------------------------------------------------------------
-- 8. Seed Initial Institution Settings Record
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
    SELECT 1 FROM public.institution_settings WHERE is_active = true
);

-- ----------------------------------------------------------------------------
-- 9. PostgREST Schema Cache Reload
-- ----------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

COMMIT;
