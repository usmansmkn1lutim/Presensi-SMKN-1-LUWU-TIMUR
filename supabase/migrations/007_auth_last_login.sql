-- ============================================================================
-- Migration: 007_auth_last_login.sql
-- Description: Security function to safely record user login timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION public.record_last_login()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    IF auth.uid() IS NOT NULL THEN
        UPDATE public.profiles
        SET
            last_login_at = now(),
            updated_at = now()
        WHERE id = auth.uid();
    END IF;
END;
$$;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.record_last_login() TO authenticated;
