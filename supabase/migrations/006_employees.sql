-- ============================================================================
-- Migration: 006_employees.sql
-- Description: Create employees table, indexes, foreign keys, triggers & RLS
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
    nip TEXT,
    nik TEXT,
    employee_number TEXT,
    full_name TEXT NOT NULL,
    gender TEXT CHECK (gender IN ('male', 'female')),
    employee_type employee_type NOT NULL DEFAULT 'teacher',
    position_id UUID REFERENCES public.positions(id) ON DELETE SET NULL,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    phone TEXT,
    email TEXT,
    photo_url TEXT,
    join_date DATE,
    status employee_status NOT NULL DEFAULT 'active',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger for auto updating updated_at
DROP TRIGGER IF EXISTS trigger_set_employees_updated_at ON public.employees;
CREATE TRIGGER trigger_set_employees_updated_at
    BEFORE UPDATE ON public.employees
    FOR EACH ROW
    EXECUTE FUNCTION set_updated_at();

-- Required Core Indexes for Performance & Search
CREATE INDEX IF NOT EXISTS idx_employees_profile_id ON public.employees(profile_id);
CREATE INDEX IF NOT EXISTS idx_employees_nip ON public.employees(nip);
CREATE INDEX IF NOT EXISTS idx_employees_nik ON public.employees(nik);
CREATE INDEX IF NOT EXISTS idx_employees_number ON public.employees(employee_number);
CREATE INDEX IF NOT EXISTS idx_employees_department_id ON public.employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_position_id ON public.employees(position_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON public.employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_full_name ON public.employees(full_name);

-- Trigram index for fuzzy text search on full_name if pg_trgm is available
DO $$
BEGIN
    CREATE INDEX IF NOT EXISTS idx_employees_name_trgm ON public.employees USING gin (full_name gin_trgm_ops);
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'pg_trgm gin index skipped or already exists.';
END $$;

-- Row Level Security (RLS)
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

-- Policy 1: Authenticated users can read active employee records (school directory)
CREATE POLICY "employees_select_authenticated"
    ON public.employees
    FOR SELECT
    TO authenticated
    USING (
        status = 'active'
        OR profile_id = auth.uid()
        OR private.has_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role, 'headmaster'::app_role])
    );

-- Policy 2: Employees can update their own personal contact information
CREATE POLICY "employees_update_own_contact"
    ON public.employees
    FOR UPDATE
    TO authenticated
    USING (profile_id = auth.uid())
    WITH CHECK (
        profile_id = auth.uid()
        -- Ensure employee cannot tamper with organizational fields
        AND status = (SELECT status FROM public.employees WHERE profile_id = auth.uid())
        AND department_id IS NOT DISTINCT FROM (SELECT department_id FROM public.employees WHERE profile_id = auth.uid())
        AND position_id IS NOT DISTINCT FROM (SELECT position_id FROM public.employees WHERE profile_id = auth.uid())
    );

-- Policy 3: Administrators and Headmaster can manage all employee records
CREATE POLICY "employees_all_admin"
    ON public.employees
    FOR ALL
    TO authenticated
    USING (
        private.has_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role, 'headmaster'::app_role])
    )
    WITH CHECK (
        private.has_role(auth.uid(), ARRAY['admin'::app_role, 'super_admin'::app_role, 'headmaster'::app_role])
    );
