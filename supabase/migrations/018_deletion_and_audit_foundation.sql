-- ============================================================================
-- Migration: 018_deletion_and_audit_foundation.sql
-- Module: PHASE 4C-1 — DELETION FOUNDATION, TRANSACTION PRESERVATION & AUDIT
-- Description:
--   1. Creates public.audit_logs table with indexes and admin-only RLS.
--   2. Modifies public.attendance to support employee deletion:
--      - Adds employee_name_snapshot column.
--      - Makes employee_id nullable with ON DELETE SET NULL foreign key.
--      - Creates auto-sync trigger for employee_name_snapshot.
--      - Backfills employee_name_snapshot for existing records.
--   3. Modifies public.requests to support employee deletion:
--      - Adds employee_name_snapshot column.
--      - Makes employee_id nullable with ON DELETE SET NULL foreign key.
--      - Creates auto-sync trigger for employee_name_snapshot.
--      - Backfills employee_name_snapshot for existing records.
--   4. Ensures public.employees.profile_id has ON DELETE SET NULL foreign key.
--   5. Creates atomic SECURITY DEFINER RPC delete_employee(UUID, TEXT):
--      - Validates caller authorization (admin / super_admin only).
--      - Snapshots employee identity to attendance and requests.
--      - Unlinks profile_id safely without deleting user account.
--      - Deletes employee record.
--      - Records immutable structured audit log.
--   6. Creates atomic SECURITY DEFINER RPC delete_user(UUID, TEXT):
--      - Validates caller authorization (admin / super_admin only).
--      - Enforces self-deletion protection (rejects deleting own account).
--      - Enforces last active Super Admin protection (rejects if active count <= 1).
--      - Unlinks employee.profile_id safely without deleting employee record.
--      - Cleans up reviewer references in requests.
--      - Records immutable structured audit log.
--      - Deletes user from auth.users and public.profiles.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Table: public.audit_logs
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID NULL REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_email TEXT NULL,
    actor_role TEXT NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT NOT NULL,
    reason TEXT NULL,
    metadata JSONB NULL DEFAULT '{}'::jsonb,
    ip_address TEXT NULL,
    user_agent TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Core indexes for audit queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs(actor_user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_target ON public.audit_logs(target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON public.audit_logs(created_at DESC);

-- RLS for audit_logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_logs_select_admin" ON public.audit_logs;
CREATE POLICY "audit_logs_select_admin"
    ON public.audit_logs
    FOR SELECT
    TO authenticated
    USING (
        private.is_admin(auth.uid())
    );

-- ----------------------------------------------------------------------------
-- 2. Schema Adjustments: public.attendance
-- ----------------------------------------------------------------------------
-- Add snapshot column for historical identity preservation
ALTER TABLE public.attendance 
    ADD COLUMN IF NOT EXISTS employee_name_snapshot TEXT NULL;

-- Make employee_id nullable to allow retaining historical records when employee is removed
ALTER TABLE public.attendance 
    ALTER COLUMN employee_id DROP NOT NULL;

-- Update foreign key constraint to ON DELETE SET NULL
DO $$
DECLARE
    v_fk_name TEXT;
BEGIN
    SELECT conname INTO v_fk_name
    FROM pg_constraint
    WHERE conrelid = 'public.attendance'::regclass
      AND contype = 'f'
      AND confrelid = 'public.employees'::regclass
    LIMIT 1;

    IF v_fk_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.attendance DROP CONSTRAINT %I', v_fk_name);
    END IF;

    ALTER TABLE public.attendance 
        ADD CONSTRAINT attendance_employee_id_fkey 
        FOREIGN KEY (employee_id) 
        REFERENCES public.employees(id) 
        ON DELETE SET NULL;
END $$;

-- Backfill existing attendance records with employee name snapshot
UPDATE public.attendance a
SET employee_name_snapshot = e.full_name
FROM public.employees e
WHERE a.employee_id = e.id 
  AND a.employee_name_snapshot IS NULL;

-- Auto-sync snapshot trigger for attendance
CREATE OR REPLACE FUNCTION public.sync_attendance_employee_snapshot()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.employee_name_snapshot IS NULL AND NEW.employee_id IS NOT NULL THEN
        SELECT full_name INTO NEW.employee_name_snapshot
        FROM public.employees
        WHERE id = NEW.employee_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_attendance_employee_snapshot ON public.attendance;
CREATE TRIGGER trigger_sync_attendance_employee_snapshot
    BEFORE INSERT OR UPDATE ON public.attendance
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_attendance_employee_snapshot();

-- ----------------------------------------------------------------------------
-- 3. Schema Adjustments: public.requests
-- ----------------------------------------------------------------------------
-- Add snapshot column for historical identity preservation
ALTER TABLE public.requests 
    ADD COLUMN IF NOT EXISTS employee_name_snapshot TEXT NULL;

-- Make employee_id nullable to allow retaining requests when employee is removed
ALTER TABLE public.requests 
    ALTER COLUMN employee_id DROP NOT NULL;

-- Update foreign key constraint to ON DELETE SET NULL
DO $$
DECLARE
    v_fk_name TEXT;
BEGIN
    SELECT conname INTO v_fk_name
    FROM pg_constraint
    WHERE conrelid = 'public.requests'::regclass
      AND contype = 'f'
      AND confrelid = 'public.employees'::regclass
    LIMIT 1;

    IF v_fk_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.requests DROP CONSTRAINT %I', v_fk_name);
    END IF;

    ALTER TABLE public.requests 
        ADD CONSTRAINT requests_employee_id_fkey 
        FOREIGN KEY (employee_id) 
        REFERENCES public.employees(id) 
        ON DELETE SET NULL;
END $$;

-- Backfill existing requests records with employee name snapshot
UPDATE public.requests r
SET employee_name_snapshot = e.full_name
FROM public.employees e
WHERE r.employee_id = e.id 
  AND r.employee_name_snapshot IS NULL;

-- Auto-sync snapshot trigger for requests
CREATE OR REPLACE FUNCTION public.sync_requests_employee_snapshot()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.employee_name_snapshot IS NULL AND NEW.employee_id IS NOT NULL THEN
        SELECT full_name INTO NEW.employee_name_snapshot
        FROM public.employees
        WHERE id = NEW.employee_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_requests_employee_snapshot ON public.requests;
CREATE TRIGGER trigger_sync_requests_employee_snapshot
    BEFORE INSERT OR UPDATE ON public.requests
    FOR EACH ROW
    EXECUTE FUNCTION public.sync_requests_employee_snapshot();

-- ----------------------------------------------------------------------------
-- 4. Schema Adjustments: public.employees (profile_id FK ON DELETE SET NULL)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
    v_fk_name TEXT;
BEGIN
    SELECT conname INTO v_fk_name
    FROM pg_constraint
    WHERE conrelid = 'public.employees'::regclass
      AND contype = 'f'
      AND confrelid = 'public.profiles'::regclass
    LIMIT 1;

    IF v_fk_name IS NOT NULL THEN
        EXECUTE format('ALTER TABLE public.employees DROP CONSTRAINT %I', v_fk_name);
    END IF;

    ALTER TABLE public.employees 
        ADD CONSTRAINT employees_profile_id_fkey 
        FOREIGN KEY (profile_id) 
        REFERENCES public.profiles(id) 
        ON DELETE SET NULL;
END $$;

-- ----------------------------------------------------------------------------
-- 5. RPC: public.delete_employee
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_employee(
    p_employee_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
#variable_conflict use_column
DECLARE
    v_caller_id UUID := auth.uid();
    v_caller_email TEXT;
    v_caller_role TEXT;
    v_emp RECORD;
    v_att_count INT := 0;
    v_req_count INT := 0;
BEGIN
    -- 1. Validate authentication
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Pengguna belum terautentikasi.';
    END IF;

    -- 2. Validate authorization (Super Admin or Admin only)
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles AS prof
        WHERE prof.id = v_caller_id
          AND prof.role IN ('admin', 'super_admin')
          AND prof.is_active = true
    ) THEN
        RAISE EXCEPTION 'Akses ditolak. Hanya Admin atau Super Admin aktif yang dapat menghapus data pegawai.';
    END IF;

    -- 3. Fetch caller identity for audit trail
    SELECT email INTO v_caller_email FROM auth.users WHERE id = v_caller_id;
    SELECT role::text INTO v_caller_role FROM public.profiles WHERE id = v_caller_id;

    -- 4. Validate target employee exists
    SELECT * INTO v_emp FROM public.employees WHERE id = p_employee_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Data pegawai dengan ID tersebut tidak ditemukan.';
    END IF;

    -- 5. Count existing transactions for audit metadata
    SELECT count(*) INTO v_att_count FROM public.attendance WHERE employee_id = p_employee_id;
    SELECT count(*) INTO v_req_count FROM public.requests WHERE employee_id = p_employee_id;

    -- 6. Guarantee snapshot on all related attendance and requests before unlinking
    UPDATE public.attendance
    SET employee_name_snapshot = COALESCE(employee_name_snapshot, v_emp.full_name),
        employee_id = NULL
    WHERE employee_id = p_employee_id;

    UPDATE public.requests
    SET employee_name_snapshot = COALESCE(employee_name_snapshot, v_emp.full_name),
        employee_id = NULL
    WHERE employee_id = p_employee_id;

    -- 7. Unlink profile_id relation without deleting user account
    IF v_emp.profile_id IS NOT NULL THEN
        UPDATE public.employees
        SET profile_id = NULL
        WHERE id = p_employee_id;
    END IF;

    -- 8. Delete employee record permanently
    DELETE FROM public.employees WHERE id = p_employee_id;

    -- 9. Insert immutable audit log entry
    INSERT INTO public.audit_logs (
        actor_user_id,
        actor_email,
        actor_role,
        action,
        target_type,
        target_id,
        reason,
        metadata
    ) VALUES (
        v_caller_id,
        v_caller_email,
        v_caller_role,
        'DELETE_EMPLOYEE',
        'employee',
        p_employee_id::text,
        p_reason,
        jsonb_build_object(
            'employee_name', v_emp.full_name,
            'nip', v_emp.nip,
            'nik', v_emp.nik,
            'had_linked_profile', v_emp.profile_id IS NOT NULL,
            'linked_profile_id', v_emp.profile_id,
            'preserved_attendance_count', v_att_count,
            'preserved_requests_count', v_req_count
        )
    );

    -- 10. Return structured response
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Data pegawai berhasil dihapus dan seluruh histori transaksi dipertahankan.',
        'employee_id', p_employee_id,
        'employee_name', v_emp.full_name,
        'preserved_attendance_count', v_att_count,
        'preserved_requests_count', v_req_count
    );
END;
$$;

REVOKE ALL ON FUNCTION public.delete_employee(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_employee(UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_employee(UUID, TEXT) TO authenticated;

-- ----------------------------------------------------------------------------
-- 6. RPC: public.delete_user
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.delete_user(
    p_user_id UUID,
    p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
#variable_conflict use_column
DECLARE
    v_caller_id UUID := auth.uid();
    v_caller_email TEXT;
    v_caller_role TEXT;
    v_target_prof RECORD;
    v_target_email TEXT;
    v_linked_emp_id UUID;
    v_linked_emp_name TEXT;
    v_active_super_admins INT;
BEGIN
    -- 1. Validate authentication
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Pengguna belum terautentikasi.';
    END IF;

    -- 2. Validate authorization (Super Admin or Admin only)
    IF NOT EXISTS (
        SELECT 1 FROM public.profiles AS prof
        WHERE prof.id = v_caller_id
          AND prof.role IN ('admin', 'super_admin')
          AND prof.is_active = true
    ) THEN
        RAISE EXCEPTION 'Akses ditolak. Hanya Admin atau Super Admin aktif yang dapat menghapus akun pengguna.';
    END IF;

    -- 3. Self-deletion protection
    IF p_user_id = v_caller_id THEN
        RAISE EXCEPTION 'Anda tidak dapat menghapus akun Anda sendiri.';
    END IF;

    -- 4. Validate target profile exists
    SELECT * INTO v_target_prof FROM public.profiles WHERE id = p_user_id;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pengguna dengan ID tersebut tidak ditemukan.';
    END IF;

    -- 5. Fetch target auth user email
    SELECT email INTO v_target_email FROM auth.users WHERE id = p_user_id;

    -- 6. Last active Super Admin protection
    IF v_target_prof.role = 'super_admin' AND v_target_prof.is_active = true THEN
        SELECT count(*) INTO v_active_super_admins 
        FROM public.profiles 
        WHERE role = 'super_admin' AND is_active = true;

        IF v_active_super_admins <= 1 THEN
            RAISE EXCEPTION 'Tidak dapat menghapus Super Admin terakhir yang masih aktif.';
        END IF;
    END IF;

    -- 7. Fetch caller identity for audit trail
    SELECT email INTO v_caller_email FROM auth.users WHERE id = v_caller_id;
    SELECT role::text INTO v_caller_role FROM public.profiles WHERE id = v_caller_id;

    -- 8. Unlink employee profile relation (preserve employee record)
    SELECT id, full_name INTO v_linked_emp_id, v_linked_emp_name
    FROM public.employees
    WHERE profile_id = p_user_id;

    IF v_linked_emp_id IS NOT NULL THEN
        UPDATE public.employees
        SET profile_id = NULL
        WHERE id = v_linked_emp_id;
    END IF;

    -- 9. Clean up request reviewer references
    UPDATE public.requests
    SET reviewed_by = NULL
    WHERE reviewed_by = p_user_id;

    -- 10. Write audit log before user deletion
    INSERT INTO public.audit_logs (
        actor_user_id,
        actor_email,
        actor_role,
        action,
        target_type,
        target_id,
        reason,
        metadata
    ) VALUES (
        v_caller_id,
        v_caller_email,
        v_caller_role,
        'DELETE_USER',
        'user',
        p_user_id::text,
        p_reason,
        jsonb_build_object(
            'user_id', p_user_id,
            'full_name', v_target_prof.full_name,
            'email', v_target_email,
            'role', v_target_prof.role,
            'had_linked_employee', v_linked_emp_id IS NOT NULL,
            'linked_employee_id', v_linked_emp_id,
            'linked_employee_name', v_linked_emp_name
        )
    );

    -- 11. Delete user from auth.users (cascades to public.profiles)
    DELETE FROM auth.users WHERE id = p_user_id;
    -- Explicit cleanup for profiles if cascade was severed
    DELETE FROM public.profiles WHERE id = p_user_id;

    -- 12. Return structured response
    RETURN jsonb_build_object(
        'success', true,
        'message', 'Akun pengguna berhasil dihapus secara permanen.',
        'user_id', p_user_id,
        'full_name', v_target_prof.full_name,
        'unlinked_employee_id', v_linked_emp_id,
        'unlinked_employee_name', v_linked_emp_name
    );
END;
$$;

REVOKE ALL ON FUNCTION public.delete_user(UUID, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.delete_user(UUID, TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.delete_user(UUID, TEXT) TO authenticated;
