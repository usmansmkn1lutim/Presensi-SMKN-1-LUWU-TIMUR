-- ============================================================================
-- Migration: 014_default_work_schedule.sql
-- Module: PHASE 5C-2 — DEFAULT WORK SCHEDULE
-- Description:
--   1. Creates partial unique index idx_work_schedules_single_active on public.work_schedules
--      to guarantee at most ONE active schedule for the entire school (Single Active Rule).
--   2. Seeds default school work schedule ('Jadwal Kerja Sekolah', code 'SCHOOL_DEFAULT')
--      with normal hours (07:30 - 15:30), operational departure (15:00), check-in window
--      (06:30 - 10:00), check-out window (15:00 - 17:00), Monday-Friday working days.
--   3. Provides helper function public.get_active_work_schedule() for fast single-row lookup.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Unique Active Schedule Protection (Single Active Rule)
-- ----------------------------------------------------------------------------
-- Partial unique index guarantees that at most ONE schedule row can have is_active = true.
-- Any attempt to activate a second schedule will be rejected by the database engine.
CREATE UNIQUE INDEX IF NOT EXISTS idx_work_schedules_single_active
    ON public.work_schedules (is_active)
    WHERE is_active = true;

-- ----------------------------------------------------------------------------
-- 2. Idempotent Seed: Default School Work Schedule (SCHOOL_DEFAULT)
-- ----------------------------------------------------------------------------
-- Inserts the school standard schedule (Mon-Fri, 07:30 - 15:30, operational bus 15:00)
-- only if there is currently NO active schedule in the database.
INSERT INTO public.work_schedules (
    name,
    code,
    description,
    check_in_start_time,
    check_in_on_time_end,
    check_in_end_time,
    work_start_time,
    operational_end_time,
    work_end_time,
    check_out_start_time,
    check_out_end_time,
    working_days,
    is_active
)
SELECT
    'Jadwal Kerja Sekolah',
    'SCHOOL_DEFAULT',
    'Jadwal kerja standar yang berlaku untuk seluruh pegawai sekolah',
    '06:30:00'::time,
    '07:30:00'::time,
    '10:00:00'::time,
    '07:30:00'::time,
    '15:00:00'::time,
    '15:30:00'::time,
    '15:00:00'::time,
    '17:00:00'::time,
    ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday']::text[],
    true
WHERE NOT EXISTS (
    SELECT 1 FROM public.work_schedules WHERE is_active = true
)
ON CONFLICT (code) DO NOTHING;

-- ----------------------------------------------------------------------------
-- 3. Helper Function: get_active_work_schedule()
-- ----------------------------------------------------------------------------
-- Returns the single active school work schedule safely using SECURITY DEFINER.
CREATE OR REPLACE FUNCTION public.get_active_work_schedule()
RETURNS SETOF public.work_schedules
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT *
    FROM public.work_schedules
    WHERE is_active = true
    LIMIT 1;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.get_active_work_schedule() TO authenticated;
