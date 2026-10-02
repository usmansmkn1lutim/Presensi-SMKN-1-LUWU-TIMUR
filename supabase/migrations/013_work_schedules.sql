-- ============================================================================
-- Migration: 013_work_schedules.sql
-- Module: PHASE 5C-1 — JADWAL KERJA (WORK SCHEDULES)
-- Description:
--   1. Creates validation function validate_working_days() for day list validity and uniqueness.
--   2. Creates public.work_schedules table with complete time fields and constraints.
--   3. Enforces V1 time sequence logic:
--        check_in_start_time < check_in_on_time_end < check_in_end_time
--        check_in_on_time_end <= work_start_time
--        work_start_time < operational_end_time < work_end_time
--        check_out_start_time = operational_end_time
--        operational_end_time < check_out_end_time
--   4. Enforces non-empty name and unique non-empty code.
--   5. Uses existing set_updated_at() trigger function for timestamp auditing.
--   6. Configures Row Level Security (RLS) with strict role checks via private.is_admin.
--   7. Enforces NO DELETE privilege (soft deactivation via is_active = false).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Helper Function: validate_working_days
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.validate_working_days(days text[])
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
BEGIN
    -- Array must not be null or empty
    IF days IS NULL OR array_length(days, 1) IS NULL OR array_length(days, 1) = 0 THEN
        RETURN false;
    END IF;

    -- Ensure all elements are within the 7 valid technical day identifiers
    IF NOT (days <@ ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']::text[]) THEN
        RETURN false;
    END IF;

    -- Ensure all day elements are unique (no duplicated days)
    IF (SELECT count(DISTINCT d) FROM unnest(days) AS d) != array_length(days, 1) THEN
        RETURN false;
    END IF;

    RETURN true;
END;
$$;

-- ----------------------------------------------------------------------------
-- 2. Table: public.work_schedules
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.work_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT NOT NULL UNIQUE,
    description TEXT,
    check_in_start_time TIME NOT NULL,
    check_in_on_time_end TIME NOT NULL,
    check_in_end_time TIME NOT NULL,
    work_start_time TIME NOT NULL,
    operational_end_time TIME NOT NULL,
    work_end_time TIME NOT NULL,
    check_out_start_time TIME NOT NULL,
    check_out_end_time TIME NOT NULL,
    working_days TEXT[] NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Name Validation (non-empty & not whitespace only)
    CONSTRAINT work_schedules_name_not_empty_check 
        CHECK (length(trim(name)) > 0),

    -- Code Validation (non-empty & not whitespace only)
    CONSTRAINT work_schedules_code_not_empty_check 
        CHECK (length(trim(code)) > 0),

    -- V1 Comprehensive Time Sequence and Relationship Constraint
    CONSTRAINT work_schedules_time_sequence_check CHECK (
        check_in_start_time < check_in_on_time_end AND
        check_in_on_time_end < check_in_end_time AND
        check_in_on_time_end <= work_start_time AND
        work_start_time < operational_end_time AND
        operational_end_time < work_end_time AND
        check_out_start_time = operational_end_time AND
        operational_end_time < check_out_end_time
    ),

    -- Working Days Validation (Non-empty, valid days, unique)
    CONSTRAINT work_schedules_working_days_check 
        CHECK (public.validate_working_days(working_days))
);

-- ----------------------------------------------------------------------------
-- 3. Trigger: updated_at (Reusable Function: set_updated_at)
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trigger_set_work_schedules_updated_at ON public.work_schedules;
CREATE TRIGGER trigger_set_work_schedules_updated_at
    BEFORE UPDATE ON public.work_schedules
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------------------
-- 4. Indexes
-- ----------------------------------------------------------------------------
-- Filter by active status
CREATE INDEX IF NOT EXISTS idx_work_schedules_is_active 
    ON public.work_schedules (is_active);

-- ----------------------------------------------------------------------------
-- 5. Row Level Security (RLS)
-- ----------------------------------------------------------------------------
ALTER TABLE public.work_schedules ENABLE ROW LEVEL SECURITY;

-- Policy 1: SELECT
-- Active authenticated users (including employees and headmaster) can view active work schedules.
-- Active administrators (admin & super_admin) can view all work schedules (including inactive ones).
-- Inactive users (profiles.is_active = false) are explicitly denied.
DROP POLICY IF EXISTS "work_schedules_select_policy" ON public.work_schedules;
CREATE POLICY "work_schedules_select_policy"
    ON public.work_schedules
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
DROP POLICY IF EXISTS "work_schedules_insert_policy" ON public.work_schedules;
CREATE POLICY "work_schedules_insert_policy"
    ON public.work_schedules
    FOR INSERT
    TO authenticated
    WITH CHECK (private.is_admin(auth.uid()));

-- Policy 3: UPDATE
-- Strictly restricted to active Administrators (admin & super_admin).
DROP POLICY IF EXISTS "work_schedules_update_policy" ON public.work_schedules;
CREATE POLICY "work_schedules_update_policy"
    ON public.work_schedules
    FOR UPDATE
    TO authenticated
    USING (private.is_admin(auth.uid()))
    WITH CHECK (private.is_admin(auth.uid()));

-- Note on DELETE:
-- NO DELETE policy is created. Deletion is explicitly forbidden.
-- Soft-deactivation (is_active = false) must be used instead.
