-- ============================================================================
-- Migration: 009_employee_management.sql
-- Name: employee_management_tables_and_rls
-- Description: 
--   1. Creates 'public.departments' table and RLS policies.
--   2. Creates 'public.positions' table and RLS policies.
--   3. Creates 'public.employees' table with foreign keys, unique constraints,
--      indexes, and role-based RLS policies for Employee Management.
--   4. Attaches auto-update timestamp triggers using 'set_updated_at()'.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Table: public.departments
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger for updated_at on departments
DROP TRIGGER IF EXISTS trigger_set_departments_updated_at ON public.departments;
CREATE TRIGGER trigger_set_departments_updated_at
    BEFORE UPDATE ON public.departments
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Indexes for departments
CREATE INDEX IF NOT EXISTS idx_departments_is_active ON public.departments(is_active);

-- RLS for departments
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "departments_select_authenticated" ON public.departments;
DROP POLICY IF EXISTS "departments_all_admin" ON public.departments;

-- Policy: Authenticated users can read active departments (or admins read all)
CREATE POLICY "departments_select_authenticated"
    ON public.departments
    FOR SELECT
    TO authenticated
    USING (is_active = true OR private.is_admin(auth.uid()));

-- Policy: Admins can manage all departments
CREATE POLICY "departments_all_admin"
    ON public.departments
    FOR ALL
    TO authenticated
    USING (private.is_admin(auth.uid()))
    WITH CHECK (private.is_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- 2. Table: public.positions
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.positions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger for updated_at on positions
DROP TRIGGER IF EXISTS trigger_set_positions_updated_at ON public.positions;
CREATE TRIGGER trigger_set_positions_updated_at
    BEFORE UPDATE ON public.positions
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Indexes for positions
CREATE INDEX IF NOT EXISTS idx_positions_is_active ON public.positions(is_active);

-- RLS for positions
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "positions_select_authenticated" ON public.positions;
DROP POLICY IF EXISTS "positions_all_admin" ON public.positions;

-- Policy: Authenticated users can read active positions (or admins read all)
CREATE POLICY "positions_select_authenticated"
    ON public.positions
    FOR SELECT
    TO authenticated
    USING (is_active = true OR private.is_admin(auth.uid()));

-- Policy: Admins can manage all positions
CREATE POLICY "positions_all_admin"
    ON public.positions
    FOR ALL
    TO authenticated
    USING (private.is_admin(auth.uid()))
    WITH CHECK (private.is_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- 3. Table: public.employees
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID UNIQUE REFERENCES public.profiles(id) ON DELETE SET NULL,
    nip TEXT UNIQUE,
    nik TEXT UNIQUE,
    employee_number TEXT UNIQUE,
    full_name TEXT NOT NULL,
    gender TEXT CHECK (gender IN ('male', 'female')),
    employee_type TEXT,
    position_id UUID REFERENCES public.positions(id) ON DELETE SET NULL,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    phone TEXT,
    email TEXT,
    photo_url TEXT,
    join_date DATE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger for updated_at on employees
DROP TRIGGER IF EXISTS trigger_set_employees_updated_at ON public.employees;
CREATE TRIGGER trigger_set_employees_updated_at
    BEFORE UPDATE ON public.employees
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Indexes for employees
CREATE INDEX IF NOT EXISTS idx_employees_profile_id ON public.employees(profile_id);
CREATE INDEX IF NOT EXISTS idx_employees_nip ON public.employees(nip);
CREATE INDEX IF NOT EXISTS idx_employees_nik ON public.employees(nik);
CREATE INDEX IF NOT EXISTS idx_employees_number ON public.employees(employee_number);
CREATE INDEX IF NOT EXISTS idx_employees_department_id ON public.employees(department_id);
CREATE INDEX IF NOT EXISTS idx_employees_position_id ON public.employees(position_id);
CREATE INDEX IF NOT EXISTS idx_employees_status ON public.employees(status);
CREATE INDEX IF NOT EXISTS idx_employees_full_name ON public.employees(full_name);

-- ----------------------------------------------------------------------------
-- 4. Row Level Security (RLS) for public.employees
-- ----------------------------------------------------------------------------
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "employees_select_authenticated" ON public.employees;
DROP POLICY IF EXISTS "employees_insert_admin" ON public.employees;
DROP POLICY IF EXISTS "employees_update_admin" ON public.employees;
DROP POLICY IF EXISTS "employees_update_own_contact" ON public.employees;
DROP POLICY IF EXISTS "employees_delete_admin" ON public.employees;

-- Policy 1: SELECT
-- Active employees are visible to all authenticated school staff.
-- Inactive employees are visible to Admins, Super Admins, Headmaster, or the employee themselves.
CREATE POLICY "employees_select_authenticated"
    ON public.employees
    FOR SELECT
    TO authenticated
    USING (
        status = 'active'
        OR profile_id = auth.uid()
        OR private.is_admin(auth.uid())
        OR private.get_user_role(auth.uid()) IN ('headmaster', 'verifier')
    );

-- Policy 2: INSERT (Admin & Super Admin only)
CREATE POLICY "employees_insert_admin"
    ON public.employees
    FOR INSERT
    TO authenticated
    WITH CHECK (private.is_admin(auth.uid()));

-- Policy 3: UPDATE for Admin & Super Admin (Full management)
CREATE POLICY "employees_update_admin"
    ON public.employees
    FOR UPDATE
    TO authenticated
    USING (private.is_admin(auth.uid()))
    WITH CHECK (private.is_admin(auth.uid()));

-- Policy 4: UPDATE for Employee (Self contact info only)
CREATE POLICY "employees_update_own_contact"
    ON public.employees
    FOR UPDATE
    TO authenticated
    USING (profile_id = auth.uid())
    WITH CHECK (
        profile_id = auth.uid()
        AND status = (SELECT status FROM public.employees WHERE profile_id = auth.uid())
        AND department_id IS NOT DISTINCT FROM (SELECT department_id FROM public.employees WHERE profile_id = auth.uid())
        AND position_id IS NOT DISTINCT FROM (SELECT position_id FROM public.employees WHERE profile_id = auth.uid())
        AND nip IS NOT DISTINCT FROM (SELECT nip FROM public.employees WHERE profile_id = auth.uid())
        AND nik IS NOT DISTINCT FROM (SELECT nik FROM public.employees WHERE profile_id = auth.uid())
        AND employee_number IS NOT DISTINCT FROM (SELECT employee_number FROM public.employees WHERE profile_id = auth.uid())
    );

-- Policy 5: DELETE (Admin & Super Admin only)
CREATE POLICY "employees_delete_admin"
    ON public.employees
    FOR DELETE
    TO authenticated
    USING (private.is_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- 5. Optional Initial Master Data (Departments & Positions)
-- ----------------------------------------------------------------------------
INSERT INTO public.departments (name, description) VALUES
    ('Bagian Tata Usaha & IT', 'Administrasi surat menyurat, kepegawaian, dan sistem informasi sekolah'),
    ('Pimpinan Satuan Pendidikan', 'Kepala Sekolah dan Wakil Kepala Sekolah'),
    ('Teknik Komputer & Informatika', 'Program Keahlian RPL, TKJ, Multimedia, dan SIJA'),
    ('Teknik Mesin & Otomotif', 'Program Keahlian Teknik Kendaraan Ringan dan Permesinan'),
    ('Teknik Ketenagalistrikan', 'Program Keahlian Teknik Instalasi Tenaga Listrik'),
    ('Bimbingan & Konseling (BK)', 'Layanan pembinaan, konseling, dan pengembangan karakter siswa'),
    ('Perpustakaan & Literasi', 'Pengelolaan perpustakaan digital dan sumber belajar'),
    ('Sarana, Prasarana & Keamanan', 'Pemeliharaan fasilitas, laboratorium, dan keamanan sekolah')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.positions (name, description) VALUES
    ('Kepala Sekolah', 'Penanggung jawab utama satuan pendidikan'),
    ('Wakil Kepala Sekolah Bidang Kurikulum', 'Pengelolaan kurikulum dan proses belajar mengajar'),
    ('Wakil Kepala Sekolah Bidang Kesiswaan', 'Pengelolaan ketertiban dan kegiatan peserta didik'),
    ('Wakil Kepala Sekolah Bidang Sarpras & Humas', 'Pengelolaan fasilitas dan hubungan industri'),
    ('Guru Mata Pelajaran / Produktif', 'Tenaga pendidik pembelajaran kejuruan dan umum'),
    ('Guru Bimbingan Konseling (BK)', 'Guru pembimbing konseling peserta didik'),
    ('Kepala Tata Usaha', 'Koordinator administrasi dan ketatausahaan sekolah'),
    ('Staf Tata Usaha & Kepegawaian', 'Pelaksana administrasi kepegawaian dan kearsipan'),
    ('Laboran / Teknisi Komputer', 'Pengelola laboratorium praktik dan jaringan IT'),
    ('Pustakawan', 'Pengelola layanan perpustakaan'),
    ('Petugas Keamanan (Security)', 'Penjaga ketertiban dan keamanan lingkungan sekolah')
ON CONFLICT (name) DO NOTHING;
