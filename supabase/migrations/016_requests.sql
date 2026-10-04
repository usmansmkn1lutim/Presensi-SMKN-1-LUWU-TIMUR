-- ============================================================================
-- Migration: 016_requests.sql
-- Module: PHASE 7A — BACKEND & SECURITY (PENGAJUAN PEGAWAI)
-- Description:
--   1. Creates public.requests table for employee absence & official requests.
--   2. Enforces CHECK constraints:
--        - request_type IN ('leave', 'sick', 'official_duty', 'other')
--        - status IN ('pending', 'approved', 'rejected', 'cancelled')
--        - start_date <= end_date
--        - non-empty reason after trimming
--   3. Sets up updated_at trigger and indexes.
--   4. Configures Row Level Security (RLS) policies for employees, headmaster, and admins.
--   5. Creates atomic SECURITY DEFINER RPC functions:
--        - create_my_request()
--        - cancel_my_request()
--        - approve_request()
--        - reject_request()
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Table: public.requests
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    employee_id UUID NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT,
    request_type TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT NOT NULL,
    attachment_url TEXT NULL,
    status TEXT NOT NULL DEFAULT 'pending',
    submitted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    reviewed_at TIMESTAMPTZ NULL,
    reviewed_by UUID NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewer_note TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Request Type Validation
    CONSTRAINT requests_request_type_check 
        CHECK (request_type IN ('leave', 'sick', 'official_duty', 'other')),

    -- Status Validation
    CONSTRAINT requests_status_check 
        CHECK (status IN ('pending', 'approved', 'rejected', 'cancelled')),

    -- Date Range Sequence Validation
    CONSTRAINT requests_date_range_check 
        CHECK (start_date <= end_date),

    -- Non-empty Reason Validation
    CONSTRAINT requests_reason_not_empty_check 
        CHECK (length(trim(reason)) > 0)
);

-- ----------------------------------------------------------------------------
-- 2. Trigger: updated_at (Reusable Function: set_updated_at)
-- ----------------------------------------------------------------------------
DROP TRIGGER IF EXISTS trigger_set_requests_updated_at ON public.requests;
CREATE TRIGGER trigger_set_requests_updated_at
    BEFORE UPDATE ON public.requests
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- ----------------------------------------------------------------------------
-- 3. Indexes
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_requests_employee_id 
    ON public.requests (employee_id);

CREATE INDEX IF NOT EXISTS idx_requests_status 
    ON public.requests (status);

CREATE INDEX IF NOT EXISTS idx_requests_start_date 
    ON public.requests (start_date);

CREATE INDEX IF NOT EXISTS idx_requests_created_at 
    ON public.requests (created_at);

CREATE INDEX IF NOT EXISTS idx_requests_employee_status 
    ON public.requests (employee_id, status);

-- ----------------------------------------------------------------------------
-- 4. Row Level Security (RLS)
-- ----------------------------------------------------------------------------
ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

-- Policy 1: SELECT
-- Active Administrators (admin & super_admin) and Headmaster can view all requests.
-- Active Employees can view ONLY their own requests (matched via employees.profile_id = auth.uid()).
-- Inactive users (profiles.is_active = false) are explicitly denied.
DROP POLICY IF EXISTS "requests_select_policy" ON public.requests;
CREATE POLICY "requests_select_policy"
    ON public.requests
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
-- Active Administrators can insert requests for any employee.
-- Active Employees can insert requests ONLY for themselves.
DROP POLICY IF EXISTS "requests_insert_policy" ON public.requests;
CREATE POLICY "requests_insert_policy"
    ON public.requests
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
-- Strictly restricted to active Administrators and Headmasters for approval/rejection operations.
-- Employees CANNOT update generic fields directly.
DROP POLICY IF EXISTS "requests_update_policy" ON public.requests;
CREATE POLICY "requests_update_policy"
    ON public.requests
    FOR UPDATE
    TO authenticated
    USING (
        private.is_admin(auth.uid())
        OR private.is_headmaster(auth.uid())
    )
    WITH CHECK (
        private.is_admin(auth.uid())
        OR private.is_headmaster(auth.uid())
    );

-- Note on DELETE:
-- NO DELETE policy is created. Deletion is explicitly forbidden.

-- ----------------------------------------------------------------------------
-- 5. Secure Atomic RPC Functions (SECURITY DEFINER with safe search_path)
-- ----------------------------------------------------------------------------

-- RPC 1: create_my_request
CREATE OR REPLACE FUNCTION public.create_my_request(
    p_request_type TEXT,
    p_start_date DATE,
    p_end_date DATE,
    p_reason TEXT,
    p_attachment_url TEXT DEFAULT NULL
)
RETURNS public.requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_employee_id UUID;
    v_new_request public.requests;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Pengguna belum terautentikasi.';
    END IF;

    -- Verify active profile
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id AND is_active = true) THEN
        RAISE EXCEPTION 'Akun Anda sedang tidak aktif.';
    END IF;

    -- Resolve employee_id from auth.uid()
    v_employee_id := private.get_employee_id(v_user_id);
    IF v_employee_id IS NULL THEN
        RAISE EXCEPTION 'Akun Anda belum terhubung dengan data pegawai.';
    END IF;

    -- Insert request record
    INSERT INTO public.requests (
        employee_id,
        request_type,
        start_date,
        end_date,
        reason,
        attachment_url,
        status,
        submitted_at
    ) VALUES (
        v_employee_id,
        p_request_type,
        p_start_date,
        p_end_date,
        trim(p_reason),
        p_attachment_url,
        'pending',
        now()
    )
    RETURNING * INTO v_new_request;

    RETURN v_new_request;
END;
$$;

-- RPC 2: cancel_my_request
CREATE OR REPLACE FUNCTION public.cancel_my_request(
    p_request_id UUID
)
RETURNS public.requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_employee_id UUID;
    v_request public.requests;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Pengguna belum terautentikasi.';
    END IF;

    -- Resolve employee_id from auth.uid()
    v_employee_id := private.get_employee_id(v_user_id);
    IF v_employee_id IS NULL THEN
        RAISE EXCEPTION 'Akun Anda belum terhubung dengan data pegawai.';
    END IF;

    -- Fetch existing request
    SELECT * INTO v_request
    FROM public.requests
    WHERE id = p_request_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pengajuan tidak ditemukan.';
    END IF;

    -- Verify ownership
    IF v_request.employee_id != v_employee_id THEN
        RAISE EXCEPTION 'Anda hanya dapat membatalkan pengajuan milik sendiri.';
    END IF;

    -- Verify status is pending
    IF v_request.status != 'pending' THEN
        RAISE EXCEPTION 'Hanya pengajuan dengan status pending yang dapat dibatalkan.';
    END IF;

    -- Perform cancellation
    UPDATE public.requests
    SET status = 'cancelled',
        updated_at = now()
    WHERE id = p_request_id
    RETURNING * INTO v_request;

    RETURN v_request;
END;
$$;

-- RPC 3: approve_request
CREATE OR REPLACE FUNCTION public.approve_request(
    p_request_id UUID,
    p_reviewer_note TEXT DEFAULT NULL
)
RETURNS public.requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_request public.requests;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Pengguna belum terautentikasi.';
    END IF;

    -- Check authorization: active admin, super_admin, or headmaster
    IF NOT (private.is_admin(v_user_id) OR private.is_headmaster(v_user_id)) THEN
        RAISE EXCEPTION 'Anda tidak memiliki hak akses untuk menyetujui pengajuan.';
    END IF;

    -- Fetch request
    SELECT * INTO v_request
    FROM public.requests
    WHERE id = p_request_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pengajuan tidak ditemukan.';
    END IF;

    IF v_request.status != 'pending' THEN
        RAISE EXCEPTION 'Hanya pengajuan dengan status pending yang dapat disetujui.';
    END IF;

    -- Perform approval atomically
    UPDATE public.requests
    SET status = 'approved',
        reviewed_at = now(),
        reviewed_by = v_user_id,
        reviewer_note = NULLIF(trim(p_reviewer_note), ''),
        updated_at = now()
    WHERE id = p_request_id
    RETURNING * INTO v_request;

    RETURN v_request;
END;
$$;

-- RPC 4: reject_request
CREATE OR REPLACE FUNCTION public.reject_request(
    p_request_id UUID,
    p_reviewer_note TEXT DEFAULT NULL
)
RETURNS public.requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_user_id UUID := auth.uid();
    v_request public.requests;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Pengguna belum terautentikasi.';
    END IF;

    -- Check authorization: active admin, super_admin, or headmaster
    IF NOT (private.is_admin(v_user_id) OR private.is_headmaster(v_user_id)) THEN
        RAISE EXCEPTION 'Anda tidak memiliki hak akses untuk menolak pengajuan.';
    END IF;

    -- Fetch request
    SELECT * INTO v_request
    FROM public.requests
    WHERE id = p_request_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pengajuan tidak ditemukan.';
    END IF;

    IF v_request.status != 'pending' THEN
        RAISE EXCEPTION 'Hanya pengajuan dengan status pending yang dapat ditolak.';
    END IF;

    -- Rejection requires a non-empty reviewer note
    IF p_reviewer_note IS NULL OR length(trim(p_reviewer_note)) = 0 THEN
        RAISE EXCEPTION 'Catatan penolakan wajib diisi.';
    END IF;

    -- Perform rejection atomically
    UPDATE public.requests
    SET status = 'rejected',
        reviewed_at = now(),
        reviewed_by = v_user_id,
        reviewer_note = trim(p_reviewer_note),
        updated_at = now()
    WHERE id = p_request_id
    RETURNING * INTO v_request;

    RETURN v_request;
END;
$$;
