-- ============================================================================
-- Supabase Database Seed File: Master Reference Data
-- Presensi Pegawai Sekolah - SMK Negeri 1 Luwu Timur
-- ============================================================================

-- 1. Seed Departments (Master Data Satuan Organisasi Sekolah)
INSERT INTO public.departments (name, code, description, is_active)
VALUES
    ('Pimpinan', 'PIM', 'Pimpinan Satuan Pendidikan dan Manajemen Sekolah', true),
    ('Guru', 'GRU', 'Tenaga Pendidik / Guru Mata Pelajaran & Produktif', true),
    ('Tata Usaha', 'TU', 'Tenaga Administrasi Sekolah dan Tata Usaha', true),
    ('Laboratorium', 'LAB', 'Pengelola dan Laboran Praktik Kejuruan', true),
    ('Perpustakaan', 'PERPUS', 'Unit Layanan Perpustakaan dan Sumber Belajar', true),
    ('Teknisi', 'TEK', 'Teknisi Sarana Prasarana & Jaringan IT Sekolah', true),
    ('Keamanan', 'SEC', 'Unit Keamanan Lingkungan dan Ketertiban Sekolah', true),
    ('Lainnya', 'OTH', 'Staf Pendukung dan Tenaga Non-Kependidikan', true)
ON CONFLICT (code) DO UPDATE
SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active,
    updated_at = now();

-- 2. Seed Positions (Master Data Jabatan Fungsional & Struktural)
INSERT INTO public.positions (name, code, description, is_active)
VALUES
    ('Kepala Sekolah', 'KS', 'Pimpinan Tertinggi Satuan Pendidikan', true),
    ('Wakil Kepala Sekolah', 'WKS', 'Wakil Kepala Sekolah Bidang Kurikulum / Kesiswaan / Humas / Sarpras', true),
    ('Guru', 'GURU', 'Guru Pegawai Negeri Sipil / PPPK / Guru Tetap Yayasan', true),
    ('Kepala Tata Usaha', 'KTU', 'Koordinator Urusan Administrasi Tata Usaha', true),
    ('Tenaga Administrasi', 'ADM', 'Staf Administrasi Kepegawaian, Kesiswaan, dan Keuangan', true),
    ('Laboran', 'LAB', 'Pengelola Laboratorium Komputer dan Praktik Kejuruan', true),
    ('Pustakawan', 'PUST', 'Pengelola Perpustakaan Sekolah', true),
    ('Teknisi', 'TEK', 'Teknisi Komputer, Jaringan, dan Pemeliharaan Sarana', true),
    ('Satpam', 'SATPAM', 'Petugas Keamanan dan Ketertiban Lingkungan Sekolah', true),
    ('Staf', 'STAF', 'Staf Pendukung Operasional Sekolah', true)
ON CONFLICT (code) DO UPDATE
SET
    name = EXCLUDED.name,
    description = EXCLUDED.description,
    is_active = EXCLUDED.is_active,
    updated_at = now();

-- 3. Seed Locations (Master Data Titik Lokasi Presensi Pegawai)
-- Sesuai Phase 5A-1: Lokasi awal Kantor/TU (OFFICE)
-- Koordinat tidak dikarang, is_attendance_enabled = false sampai admin menginput koordinat valid.
-- ON CONFLICT (code) DO NOTHING menjamin tidak pernah menimpa konfigurasi/koordinat existing.
INSERT INTO public.locations (
    name,
    code,
    description,
    location_type,
    latitude,
    longitude,
    radius_meters,
    is_attendance_enabled,
    is_active,
    address
) VALUES (
    'Kantor/TU',
    'OFFICE',
    'Lokasi utama presensi pegawai',
    'office',
    NULL,
    NULL,
    100,
    false,
    true,
    'SMK Negeri 1 Luwu Timur'
)
ON CONFLICT (code) DO NOTHING;

-- 4. Seed Default Work Schedule (Phase 5C-2: Jadwal Kerja Sekolah)
-- Sesuai Phase 5C-2: Jadwal kerja standar sekolah berlaku untuk seluruh pegawai (Single Active Schedule)
-- Waktu: 07:30 - 15:30, Operasional Bus: 15:00, Check-in: 06:30 - 10:00, Check-out: 15:00 - 17:00, Senin - Jumat.
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

