-- ============================================================================
-- Migration: 022_write_audit_log_rpc_and_policies.sql
-- Module: PHASE 10B — AUDIT LOG BACKEND / FOUNDATION
-- Description:
--   1. Creates public.write_audit_log SECURITY DEFINER RPC function for append-only trusted logging.
--   2. Updates public.audit_logs RLS SELECT policy to include super_admin, admin, and headmaster roles.
--   3. Guarantees no UPDATE or DELETE are permitted on public.audit_logs via strict database triggers.
-- ============================================================================

-- 1. Create or replace secure writing function
CREATE OR REPLACE FUNCTION public.write_audit_log(
    p_action TEXT,
    p_target_type TEXT,
    p_target_id TEXT,
    p_reason TEXT DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID := auth.uid();
    v_caller_email TEXT;
    v_caller_role TEXT;
    v_log_id UUID;
BEGIN
    -- Validate authentication
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Pengguna belum terautentikasi.';
    END IF;

    -- Fetch caller details safely
    SELECT email INTO v_caller_email FROM auth.users WHERE id = v_caller_id;
    SELECT role::text INTO v_caller_role FROM public.profiles WHERE id = v_caller_id;

    -- Append audit entry
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
        p_action,
        p_target_type,
        p_target_id,
        p_reason,
        p_metadata
    )
    RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$;

-- Grant select execution permissions strictly
REVOKE ALL ON FUNCTION public.write_audit_log(TEXT, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.write_audit_log(TEXT, TEXT, TEXT, TEXT, JSONB) FROM anon;
GRANT EXECUTE ON FUNCTION public.write_audit_log(TEXT, TEXT, TEXT, TEXT, JSONB) TO authenticated;

-- 2. Update RLS policies to allow Super Admin, Admin, and Headmaster
DROP POLICY IF EXISTS "audit_logs_select_admin" ON public.audit_logs;
CREATE POLICY "audit_logs_select_admin"
    ON public.audit_logs
    FOR SELECT
    TO authenticated
    USING (
        private.is_admin(auth.uid()) OR
        private.has_role(auth.uid(), ARRAY['headmaster'::app_role])
    );

-- 3. Strict trigger at database level to ensure immutability
CREATE OR REPLACE FUNCTION public.prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Log audit bersifat immutable (append-only) dan tidak boleh diubah atau dihapus.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_prevent_audit_log_modification ON public.audit_logs;
CREATE TRIGGER trigger_prevent_audit_log_modification
    BEFORE UPDATE OR DELETE ON public.audit_logs
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_audit_log_modification();
