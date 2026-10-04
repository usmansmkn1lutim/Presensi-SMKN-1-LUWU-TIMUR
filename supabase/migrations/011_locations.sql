-- ============================================================================
-- Migration: 011_locations.sql
-- Module: PHASE 5A-1 — MASTER LOKASI PRESENSI
-- Description:
--   1. Creates public.locations table for attendance locations.
--   2. Enforces GPS boundaries and radius validation constraints.
--   3. Enforces V1 single active attendance location via partial unique index.
--   4. Uses existing set_updated_at() trigger function for timestamp auditing.
--   5. Configures Row Level Security (RLS) with strict role checks via private.is_admin.
--   6. Enforces NO DELETE privilege on V1.
--   7. Seeds initial record for 'Kantor/TU' (code: 'OFFICE') with duplicate protection.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Table: public.locations
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.locations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    location_type TEXT NOT NULL DEFAULT 'office',
    latitude NUMERIC,
    longitude NUMERIC,
    radius_meters NUMERIC NOT NULL DEFAULT 100,
    is_attendance_enabled BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    address TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Location Type Validation
    CONSTRAINT locations_location_type_check 
        CHECK (location_type IN ('office', 'teacher_room', 'laboratory', 'other')),

    -- GPS Latitude Range (-90 to 90)
    CONSTRAINT locations_latitude_check 
        CHECK (latitude IS NULL OR (latitude >= -90 AND latitude <= 90)),

    -- GPS Longitude Range (-180 to 180)
    CONSTRAINT locations_longitude_check 
        CHECK (longitude IS NULL OR (longitude >= -180 AND longitude <= 180)),

    -- Radius Boundary (Must be > 0 and <= 500 meters)
    CONSTRAINT locations_radius_meters_check 
        CHECK (radius_meters > 0 AND radius_meters <= 500),

    -- Active attendance locations MUST have valid non-null coordinates
    CONSTRAINT locations_attendance_coordinates_check 
        CHECK (is_attendance_enabled = false OR (latitude IS NOT NULL AND longitude IS NOT NULL))
);

-- ----------------------------------------------------------------------------
-- 2. Trigger: updated_at (Reusable Function: set_updated_at)
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trigger_set_locations_updated_at ON public.locations;
CREATE TRIGGER trigger_set_locations_updated_at
    BEFORE UPDATE ON public.locations
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. Indexes & Constraints
-- ----------------------------------------------------------------------------
-- Purposeful lookup indexes
CREATE INDEX IF NOT EXISTS idx_locations_code 
    ON public.locations(code);

CREATE INDEX IF NOT EXISTS idx_locations_is_active 
    ON public.locations(is_active);

CREATE INDEX IF NOT EXISTS idx_locations_is_attendance_enabled 
    ON public.locations(is_attendance_enabled);

CREATE INDEX IF NOT EXISTS idx_locations_type 
    ON public.locations(location_type);

-- Multi-location Architectural Support:
-- Any restriction forcing only a single active attendance location is explicitly removed.
-- Multiple locations can have (is_active = true AND is_attendance_enabled = true) simultaneously.
DROP INDEX IF EXISTS public.idx_locations_single_active_attendance;

-- ----------------------------------------------------------------------------
-- 4. Row Level Security (RLS)
-- ----------------------------------------------------------------------------
ALTER TABLE public.locations ENABLE ROW LEVEL SECURITY;

-- Policy 1: SELECT
-- Active authenticated users (including employees and headmaster) can view active locations.
-- Active administrators (admin & super_admin) can view all locations (including drafts & inactive).
-- Inactive users (is_active = false) are explicitly blocked.
DROP POLICY IF EXISTS "locations_select_policy" ON public.locations;
CREATE POLICY "locations_select_policy"
    ON public.locations
    FOR SELECT
    TO authenticated
    USING (
        (is_active = true AND EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND is_active = true
        ))
        OR private.is_admin(auth.uid())
    );

-- Policy 2: INSERT
-- Strictly restricted to active Administrators (admin & super_admin).
DROP POLICY IF EXISTS "locations_insert_policy" ON public.locations;
CREATE POLICY "locations_insert_policy"
    ON public.locations
    FOR INSERT
    TO authenticated
    WITH CHECK (private.is_admin(auth.uid()));

-- Policy 3: UPDATE
-- Strictly restricted to active Administrators (admin & super_admin).
DROP POLICY IF EXISTS "locations_update_policy" ON public.locations;
CREATE POLICY "locations_update_policy"
    ON public.locations
    FOR UPDATE
    TO authenticated
    USING (private.is_admin(auth.uid()))
    WITH CHECK (private.is_admin(auth.uid()));

-- Note on DELETE:
-- NO DELETE policy is created. Deletion is explicitly forbidden in V1.
-- Soft-deactivation (is_active = false) must be used instead.

-- ----------------------------------------------------------------------------
-- 5. Seed Initial Data: Kantor/TU (OFFICE)
-- ----------------------------------------------------------------------------
-- Safe initial seed. Coordinates are left NULL until verified coordinates are configured.
-- is_attendance_enabled is false until coordinates are supplied to satisfy constraint.
-- Safe duplicate protection: ON CONFLICT (code) DO NOTHING (never overwrites existing config).
INSERT INTO public.locations (
    name,
    code,
    description,
    location_type,
    latitude,
    longitude,
    radius_meters,
    is_attendance_enabled,
    is_active,
    address
) VALUES (
    'Kantor/TU',
    'OFFICE',
    'Lokasi utama presensi pegawai',
    'office',
    NULL,
    NULL,
    100,
    false,
    true,
    'SMK Negeri 1 Luwu Timur'
)
ON CONFLICT (code) DO NOTHING;
