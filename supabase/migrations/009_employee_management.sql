-- ============================================================================
-- Migration: 009_employee_management.sql
-- Module: PHASE 4A — EMPLOYEE MANAGEMENT
-- Description:
--   1. Schema helper functions for role checks (private.is_admin, private.is_headmaster).
--   2. Creates public.departments, updated_at trigger, indexes, RLS, and master data.
--   3. Creates public.positions, updated_at trigger, indexes, RLS, and master data.
--   4. Creates public.employees, updated_at trigger, indexes, foreign keys, and RLS.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 0. Security Helper Functions (Non-Recursive)
-- ----------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS private;

CREATE OR REPLACE FUNCTION private.is_admin(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = check_user_id
          AND role IN ('admin', 'super_admin')
          AND is_active = true
    );
$$;

CREATE OR REPLACE FUNCTION private.is_headmaster(check_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = check_user_id
          AND role = 'headmaster'
          AND is_active = true
    );
$$;

CREATE OR REPLACE FUNCTION private.get_user_role(check_user_id UUID)
RETURNS app_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    SELECT role FROM public.profiles WHERE id = check_user_id AND is_active = true LIMIT 1;
$$;

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

-- Trigger for auto updating updated_at on departments
DROP TRIGGER IF EXISTS trigger_set_departments_updated_at ON public.departments;
CREATE TRIGGER trigger_set_departments_updated_at
    BEFORE UPDATE ON public.departments
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Indexes for departments
CREATE INDEX IF NOT EXISTS idx_departments_is_active ON public.departments(is_active);

-- Row Level Security (RLS) for departments
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "departments_select_authenticated" ON public.departments;
DROP POLICY IF EXISTS "departments_all_admin" ON public.departments;

-- Policy: All authenticated users can read active departments
CREATE POLICY "departments_select_authenticated"
    ON public.departments
    FOR SELECT
    TO authenticated
    USING (is_active = true OR private.is_admin(auth.uid()) OR private.is_headmaster(auth.uid()));

-- Policy: Admin & Super Admin can manage all departments
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

-- Trigger for auto updating updated_at on positions
DROP TRIGGER IF EXISTS trigger_set_positions_updated_at ON public.positions;
CREATE TRIGGER trigger_set_positions_updated_at
    BEFORE UPDATE ON public.positions
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Indexes for positions
CREATE INDEX IF NOT EXISTS idx_positions_is_active ON public.positions(is_active);

-- Row Level Security (RLS) for positions
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "positions_select_authenticated" ON public.positions;
DROP POLICY IF EXISTS "positions_all_admin" ON public.positions;

-- Policy: All authenticated users can read active positions
CREATE POLICY "positions_select_authenticated"
    ON public.positions
    FOR SELECT
    TO authenticated
    USING (is_active = true OR private.is_admin(auth.uid()) OR private.is_headmaster(auth.uid()));

-- Policy: Admin & Super Admin can manage all positions
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
    profile_id UUID UNIQUE NULL REFERENCES public.profiles(id) ON DELETE SET NULL,
    nip TEXT UNIQUE NULL,
    nik TEXT UNIQUE NULL,
    employee_number TEXT UNIQUE NULL,
    full_name TEXT NOT NULL,
    gender TEXT CHECK (gender IN ('male', 'female')),
    employee_type TEXT,
    position_id UUID NULL REFERENCES public.positions(id) ON DELETE SET NULL,
    department_id UUID NULL REFERENCES public.departments(id) ON DELETE SET NULL,
    phone TEXT,
    email TEXT,
    photo_url TEXT,
    join_date DATE,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Trigger for auto updating updated_at on employees
DROP TRIGGER IF EXISTS trigger_set_employees_updated_at ON public.employees;
CREATE TRIGGER trigger_set_employees_updated_at
    BEFORE UPDATE ON public.employees
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Core Indexes for Employees
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

DROP POLICY IF EXISTS "employees_select_policy" ON public.employees;
DROP POLICY IF EXISTS "employees_insert_policy" ON public.employees;
DROP POLICY IF EXISTS "employees_update_policy" ON public.employees;
DROP POLICY IF EXISTS "employees_delete_policy" ON public.employees;

-- SELECT Policy:
-- - Admin & Super Admin: can view all employee records
-- - Headmaster: can view all employee records (read-only)
-- - Employee: can ONLY view their own employee record (profile_id = auth.uid())
CREATE POLICY "employees_select_policy"
    ON public.employees
    FOR SELECT
    TO authenticated
    USING (
        private.is_admin(auth.uid())
        OR private.is_headmaster(auth.uid())
        OR profile_id = auth.uid()
    );

-- INSERT Policy:
-- - Admin & Super Admin only
CREATE POLICY "employees_insert_policy"
    ON public.employees
    FOR INSERT
    TO authenticated
    WITH CHECK (private.is_admin(auth.uid()));

-- UPDATE Policy:
-- - Admin & Super Admin only
CREATE POLICY "employees_update_policy"
    ON public.employees
    FOR UPDATE
    TO authenticated
    USING (private.is_admin(auth.uid()))
    WITH CHECK (private.is_admin(auth.uid()));

-- DELETE Policy:
-- - Admin & Super Admin only
CREATE POLICY "employees_delete_policy"
    ON public.employees
    FOR DELETE
    TO authenticated
    USING (private.is_admin(auth.uid()));

-- ----------------------------------------------------------------------------
-- 5. Master Data Awal (Departments & Positions)
-- ----------------------------------------------------------------------------
INSERT INTO public.departments (name, description) VALUES
    ('Bagian Tata Usaha & IT', 'Administrasi surat menyurat, kepegawaian, dan sistem IT sekolah'),
    ('Pimpinan Satuan Pendidikan', 'Kepala Sekolah dan jajaran Wakil Kepala Sekolah'),
    ('Teknik Komputer & Informatika', 'Program Keahlian RPL, TKJ, Multimedia, dan SIJA'),
    ('Teknik Mesin & Otomotif', 'Program Keahlian Teknik Kendaraan Ringan dan Permesinan'),
    ('Teknik Ketenagalistrikan', 'Program Keahlian Teknik Instalasi Tenaga Listrik'),
    ('Bimbingan & Konseling', 'Layanan bimbingan karir, konseling, dan pengembangan karakter siswa'),
    ('Perpustakaan & Literasi', 'Pengelolaan perpustakaan digital dan sumber referensi sekolah'),
    ('Sarana, Prasarana & Keamanan', 'Pemeliharaan fasilitas, laboratorium, dan lingkungan sekolah')
ON CONFLICT (name) DO NOTHING;

INSERT INTO public.positions (name, description) VALUES
    ('Kepala Sekolah', 'Penanggung jawab utama satuan pendidikan'),
    ('Wakil Kepala Sekolah Bidang Kurikulum', 'Pengelolaan kurikulum dan proses belajar mengajar'),
    ('Wakil Kepala Sekolah Bidang Kesiswaan', 'Pengelolaan ketertiban dan kegiatan peserta didik'),
    ('Wakil Kepala Sekolah Bidang Sarpras & Humas', 'Pengelolaan fasilitas dan hubungan industri'),
    ('Guru Mata Pelajaran / Produktif', 'Tenaga pendidik pembelajaran kejuruan dan umum'),
    ('Guru Bimbingan Konseling', 'Guru pembimbing konseling peserta didik'),
    ('Kepala Tata Usaha', 'Koordinator administrasi dan ketatausahaan sekolah'),
    ('Staf Tata Usaha & Kepegawaian', 'Pelaksana administrasi kepegawaian dan kearsipan'),
    ('Laboran / Teknisi Komputer', 'Pengelola laboratorium praktik dan jaringan IT'),
    ('Pustakawan', 'Pengelola layanan perpustakaan'),
    ('Petugas Keamanan', 'Penjaga ketertiban dan keamanan lingkungan sekolah')
ON CONFLICT (name) DO NOTHING;
