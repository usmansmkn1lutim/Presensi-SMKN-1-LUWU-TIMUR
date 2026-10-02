-- ============================================================================
-- Migration: 004_departments.sql
-- Description: Create departments table, triggers, and Row Level Security
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger for auto updating updated_at
DROP TRIGGER IF EXISTS trigger_set_departments_updated_at ON public.departments;
CREATE TRIGGER trigger_set_departments_updated_at
    BEFORE UPDATE ON public.departments
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- Indexes
CREATE INDEX IF NOT EXISTS idx_departments_code ON public.departments(code);
CREATE INDEX IF NOT EXISTS idx_departments_is_active ON public.departments(is_active);

-- Row Level Security (RLS)
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

-- Policy 1: Authenticated users can read active departments
CREATE POLICY "departments_select_authenticated"
    ON public.departments
    FOR SELECT
    TO authenticated
    USING (is_active = true OR private.is_admin(auth.uid()));

-- Policy 2: Admins can insert, update, delete departments
CREATE POLICY "departments_all_admin"
    ON public.departments
    FOR ALL
    TO authenticated
    USING (private.is_admin(auth.uid()))
    WITH CHECK (private.is_admin(auth.uid()));
