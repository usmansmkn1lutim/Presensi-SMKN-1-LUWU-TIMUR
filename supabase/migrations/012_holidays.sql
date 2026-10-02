-- ============================================================================
-- Migration: 012_holidays.sql
-- Module: PHASE 5B-1 — KALENDER & HARI LIBUR
-- Description:
--   1. Creates public.holidays table for school calendar and holidays.
--   2. Enforces holiday_type CHECK constraint ('national', 'collective_leave', 'school', 'special', 'other').
--   3. Enforces non-empty name CHECK constraint.
--   4. Enforces UNIQUE (holiday_date, name) while allowing multiple classifications per date.
--   5. Supports historical & future calendars (no restrictive date constraints).
--   6. Uses existing set_updated_at() trigger function for timestamp auditing.
--   7. Configures Row Level Security (RLS) with strict role checks via private.is_admin.
--   8. Enforces NO DELETE privilege (soft deactivation via is_active = false).
--   9. Provides safe SECURITY DEFINER helper function is_holiday(check_date DATE).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Table: public.holidays
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.holidays (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    holiday_date DATE NOT NULL,
    holiday_type TEXT NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Holiday Type Validation (CHECK constraint for extensibility)
    CONSTRAINT holidays_holiday_type_check 
        CHECK (holiday_type IN ('national', 'collective_leave', 'school', 'special', 'other')),

    -- Name must not be empty or whitespace only
    CONSTRAINT holidays_name_not_empty_check 
        CHECK (length(trim(name)) > 0),

    -- Avoid identical duplicate records on the same date while allowing multiple events
    CONSTRAINT holidays_date_name_unique 
        UNIQUE (holiday_date, name)
);

-- ----------------------------------------------------------------------------
-- 2. Trigger: updated_at (Reusable Function: set_updated_at)
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trigger_set_holidays_updated_at ON public.holidays;
CREATE TRIGGER trigger_set_holidays_updated_at
    BEFORE UPDATE ON public.holidays
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. Indexes
-- ----------------------------------------------------------------------------
-- Efficient date lookups for attendance and calendar checking
CREATE INDEX IF NOT EXISTS idx_holidays_date 
    ON public.holidays (holiday_date);

-- Filter active holidays
CREATE INDEX IF NOT EXISTS idx_holidays_is_active 
    ON public.holidays (is_active);

-- Filter by holiday type (national, school, etc.)
CREATE INDEX IF NOT EXISTS idx_holidays_type 
    ON public.holidays (holiday_type);

-- Composite index for fast date-range filtering on active holidays
CREATE INDEX IF NOT EXISTS idx_holidays_date_active 
    ON public.holidays (holiday_date, is_active);

-- ----------------------------------------------------------------------------
-- 4. Helper Function: is_holiday(check_date DATE)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.is_holiday(check_date DATE)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.holidays 
        WHERE holiday_date = check_date 
          AND is_active = true
    );
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. Row Level Security (RLS)
-- ----------------------------------------------------------------------------
ALTER TABLE public.holidays ENABLE ROW LEVEL SECURITY;

-- Policy 1: SELECT
-- Active authenticated users (including employees and headmaster) can view active holidays.
-- Active administrators (admin & super_admin) can view all holidays (including inactive records).
-- Inactive users (profiles.is_active = false) are explicitly denied.
DROP POLICY IF EXISTS "holidays_select_policy" ON public.holidays;
CREATE POLICY "holidays_select_policy"
    ON public.holidays
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
DROP POLICY IF EXISTS "holidays_insert_policy" ON public.holidays;
CREATE POLICY "holidays_insert_policy"
    ON public.holidays
    FOR INSERT
    TO authenticated
    WITH CHECK (private.is_admin(auth.uid()));

-- Policy 3: UPDATE
-- Strictly restricted to active Administrators (admin & super_admin).
DROP POLICY IF EXISTS "holidays_update_policy" ON public.holidays;
CREATE POLICY "holidays_update_policy"
    ON public.holidays
    FOR UPDATE
    TO authenticated
    USING (private.is_admin(auth.uid()))
    WITH CHECK (private.is_admin(auth.uid()));

-- Note on DELETE:
-- NO DELETE policy is created. Deletion is explicitly forbidden.
-- Soft-deactivation (is_active = false) must be used instead.
