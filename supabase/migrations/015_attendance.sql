-- ============================================================================
-- Migration: 015_attendance.sql
-- Module: PHASE 6A-1 — ATTENDANCE BACKEND & SECURITY
-- Description:
--   1. Creates helper function private.get_employee_id() to map auth.uid() to employee_id.
--   2. Creates public.attendance table for storing core attendance transactions.
--   3. Enforces unique constraint (employee_id, attendance_date) ensuring exactly 1 attendance
--      record per employee per work date.
--   4. Configures CHECK constraints for check_in_status ('on_time', 'late'), check_out_status
--      ('operational', 'after_work'), coordinate boundaries (-90..90, -180..180), and logical
--      time sequence (check_out_at >= check_in_at).
--   5. Configures Row Level Security (RLS) policies:
--        - SELECT: Admin, Super Admin, Headmaster, and Employee (own records only).
--        - INSERT: Admin, Super Admin, and Employee (own records only).
--        - UPDATE: Admin & Super Admin only (Employees cannot generic update).
--        - DELETE: NO DELETE policy (historical integrity).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Helper Function: private.get_employee_id
-- ----------------------------------------------------------------------------
-- Retrieves the employee ID corresponding to a profile user ID (auth.uid()).
CREATE OR REPLACE FUNCTION private.get_employee_id(check_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT id
    FROM public.employees
    WHERE profile_id = check_user_id
    LIMIT 1;
$$;

-- ----------------------------------------------------------------------------
-- 2. Table: public.attendance
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.attendance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
    attendance_date DATE NOT NULL,
    check_in_at TIMESTAMPTZ NULL,
    check_out_at TIMESTAMPTZ NULL,
    check_in_status TEXT NULL,
    check_out_status TEXT NULL,
    check_in_location_id UUID NULL REFERENCES public.locations(id) ON DELETE SET NULL,
    check_out_location_id UUID NULL REFERENCES public.locations(id) ON DELETE SET NULL,
    check_in_latitude NUMERIC NULL,
    check_in_longitude NUMERIC NULL,
    check_out_latitude NUMERIC NULL,
    check_out_longitude NUMERIC NULL,
    notes TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Unique Attendance Protection: Exactly 1 attendance record per employee per date
    CONSTRAINT attendance_employee_date_key UNIQUE (employee_id, attendance_date),

    -- Check-in Status Validation
    CONSTRAINT attendance_check_in_status_check 
        CHECK (check_in_status IS NULL OR check_in_status IN ('on_time', 'late')),

    -- Check-out Status Validation
    CONSTRAINT attendance_check_out_status_check 
        CHECK (check_out_status IS NULL OR check_out_status IN ('operational', 'after_work')),

    -- Latitude Range Validation (-90 to 90)
    CONSTRAINT attendance_check_in_lat_check 
        CHECK (check_in_latitude IS NULL OR (check_in_latitude >= -90 AND check_in_latitude <= 90)),

    CONSTRAINT attendance_check_out_lat_check 
        CHECK (check_out_latitude IS NULL OR (check_out_latitude >= -90 AND check_out_latitude <= 90)),

    -- Longitude Range Validation (-180 to 180)
    CONSTRAINT attendance_check_in_lng_check 
        CHECK (check_in_longitude IS NULL OR (check_in_longitude >= -180 AND check_in_longitude <= 180)),

    CONSTRAINT attendance_check_out_lng_check 
        CHECK (check_out_longitude IS NULL OR (check_out_longitude >= -180 AND check_out_longitude <= 180)),

    -- Time Sequence Ordering Constraint
    CONSTRAINT attendance_time_order_check 
        CHECK (check_in_at IS NULL OR check_out_at IS NULL OR check_out_at >= check_in_at)
);

-- ----------------------------------------------------------------------------
-- 3. Trigger: updated_at (Reusable Function: set_updated_at)
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trigger_set_attendance_updated_at ON public.attendance;
CREATE TRIGGER trigger_set_attendance_updated_at
    BEFORE UPDATE ON public.attendance
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------------------
-- 4. Indexes
-- ----------------------------------------------------------------------------
-- Lookup by employee_id
CREATE INDEX IF NOT EXISTS idx_attendance_employee_id 
    ON public.attendance (employee_id);

-- Lookup by attendance_date
CREATE INDEX IF NOT EXISTS idx_attendance_attendance_date 
    ON public.attendance (attendance_date);

-- Composite lookup by employee_id and attendance_date
CREATE INDEX IF NOT EXISTS idx_attendance_employee_date 
    ON public.attendance (employee_id, attendance_date);

-- ----------------------------------------------------------------------------
-- 5. Row Level Security (RLS)
-- ----------------------------------------------------------------------------
ALTER TABLE public.attendance ENABLE ROW LEVEL SECURITY;

-- Policy 1: SELECT
-- Active Administrators (admin & super_admin) and Headmaster can view all attendance records.
-- Active Employees can view ONLY their own attendance records.
-- Inactive users (profiles.is_active = false) are explicitly denied.
DROP POLICY IF EXISTS "attendance_select_policy" ON public.attendance;
CREATE POLICY "attendance_select_policy"
    ON public.attendance
    FOR SELECT
    TO authenticated
    USING (
        private.is_admin(auth.uid())
        OR private.is_headmaster(auth.uid())
        OR (
            employee_id = private.get_employee_id(auth.uid())
            AND EXISTS (
                SELECT 1 FROM public.profiles
                WHERE id = auth.uid() AND is_active = true
            )
        )
    );

-- Policy 2: INSERT
-- Active Administrators (admin & super_admin) can insert attendance for any employee.
-- Active Employees can insert attendance ONLY for themselves.
-- Inactive users are explicitly denied.
DROP POLICY IF EXISTS "attendance_insert_policy" ON public.attendance;
CREATE POLICY "attendance_insert_policy"
    ON public.attendance
    FOR INSERT
    TO authenticated
    WITH CHECK (
        private.is_admin(auth.uid())
        OR (
            employee_id = private.get_employee_id(auth.uid())
            AND EXISTS (
                SELECT 1 FROM public.profiles
                WHERE id = auth.uid() AND is_active = true
            )
        )
    );

-- Policy 3: UPDATE
-- Strictly restricted to active Administrators (admin & super_admin).
-- Employees and Headmaster CANNOT generic update attendance.
DROP POLICY IF EXISTS "attendance_update_policy" ON public.attendance;
CREATE POLICY "attendance_update_policy"
    ON public.attendance
    FOR UPDATE
    TO authenticated
    USING (private.is_admin(auth.uid()))
    WITH CHECK (private.is_admin(auth.uid()));

-- Note on DELETE:
-- NO DELETE policy is created. Attendance records are immutable historical data.
-- Hard delete is strictly forbidden for all roles.
