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
