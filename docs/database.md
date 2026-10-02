# Database Architecture & Core Schema Documentation
**Aplikasi Presensi Pegawai Sekolah — SMK Negeri 1 Luwu Timur**
*Phase 2: Supabase Backend Foundation & Database Core*

---

## 1. Arsitektur Database

Database backend dibangun di atas **PostgreSQL** yang diorkestrasi melalui **Supabase**. Seluruh hak akses, integritas data, dan identitas kepegawaian bersumber dari database (*database is the single source of truth*).

### Diagram Relasi Utama (1:1 & 1:N)

```text
auth.users (Supabase Managed Auth)
    │
    │ 1 : 1 (ON DELETE CASCADE)
    ▼
public.profiles
    │
    │ 1 : 1 (ON DELETE CASCADE)
    ▼
public.employees
    │
    ├── 1 : N ──► public.departments (ON DELETE SET NULL)
    │
    └── 1 : N ──► public.positions   (ON DELETE SET NULL)
```

---

## 2. Definisi Enum PostgreSQL

### A. `app_role`
Digunakan untuk menentukan tingkat otorisasi sistem:
* `super_admin`: Administrator sistem pusat / dinas.
* `admin`: Administrator SIM Presensi sekolah (pengelola data pegawai, lokasi, jadwal).
* `headmaster`: Kepala Sekolah (monitoring rekap & persetujuan dispensasi).
* `verifier`: Staf verifikator kehadiran & bukti izin / sakit / cuti.
* `employee`: Guru dan pegawai sekolah (pengguna presensi harian).

### B. `employee_status`
Status operasional pegawai di sekolah:
* `active`: Pegawai aktif bertugas.
* `inactive`: Pegawai mutasi, pensiun, atau dinonaktifkan.

### C. `employee_type`
Klasifikasi formasi tenaga kependidikan:
* `teacher` (Guru Pengajar)
* `education_staff` (Tenaga Kependidikan)
* `administrative_staff` (Staf Tata Usaha)
* `principal` (Kepala Sekolah)
* `vice_principal` (Wakil Kepala Sekolah)
* `laboratory_staff` (Laboran)
* `librarian` (Pustakawan)
* `technician` (Teknisi Jaringan & Sarpras)
* `security` (Satpam)
* `other` (Staf lainnya)

---

## 3. Deskripsi Tabel

### 1. `public.profiles`
Menyimpan profil dasar yang terikat langsung 1:1 dengan akun `auth.users`.
* `id` (`UUID PRIMARY KEY`): Merujuk ke `auth.users.id`.
* `full_name` (`TEXT`): Nama lengkap beserta gelar.
* `avatar_url` (`TEXT`): Tautan foto profil di Supabase Storage.
* `role` (`app_role`): Peran pengguna, default `'employee'`.
* `is_active` (`BOOLEAN`): Status akun aktif/nonaktif, default `true`.
* `last_login_at` (`TIMESTAMPTZ`): Catatan waktu login terakhir.
* `created_at` (`TIMESTAMPTZ`): Waktu pembuatan record (UTC).
* `updated_at` (`TIMESTAMPTZ`): Waktu pembaruan otomatis via trigger `set_updated_at()`.

### 2. `public.departments`
Menyimpan unit kerja dan divisi satuan pendidikan:
* `id` (`UUID PRIMARY KEY DEFAULT gen_random_uuid()`): Identifier unit.
* `name` (`TEXT NOT NULL`): Nama unit kerja (misal: "Guru", "Tata Usaha").
* `code` (`TEXT UNIQUE NOT NULL`): Kode singkat unit (misal: `GRU`, `TU`, `LAB`).
* `description` (`TEXT`): Keterangan bidang tugas.
* `is_active` (`BOOLEAN DEFAULT true`): Status keaktifan unit.
* `created_at`, `updated_at` (`TIMESTAMPTZ`).

### 3. `public.positions`
Menyimpan master jabatan fungsional dan struktural:
* `id` (`UUID PRIMARY KEY DEFAULT gen_random_uuid()`): Identifier jabatan.
* `name` (`TEXT NOT NULL`): Nama jabatan (misal: "Kepala Sekolah", "Guru").
* `code` (`TEXT UNIQUE NOT NULL`): Kode singkat jabatan (misal: `KS`, `GURU`).
* `description` (`TEXT`): Uraian tugas.
* `is_active` (`BOOLEAN DEFAULT true`): Status keaktifan jabatan.
* `created_at`, `updated_at` (`TIMESTAMPTZ`).

### 4. `public.employees`
Menyimpan data identitas kepegawaian resmi:
* `id` (`UUID PRIMARY KEY DEFAULT gen_random_uuid()`).
* `profile_id` (`UUID UNIQUE REFERENCES profiles(id) ON DELETE CASCADE`).
* `nip` (`TEXT`): Nomor Induk Pegawai (ASN/PNS/PPPK).
* `nik` (`TEXT`): Nomor Induk Kependudukan (KTP).
* `employee_number` (`TEXT`): Nomor Induk Guru / Pegawai Yayasan/Honor.
* `full_name` (`TEXT NOT NULL`): Nama lengkap pegawai.
* `gender` (`TEXT CHECK (gender IN ('male', 'female'))`).
* `employee_type` (`employee_type`): Jenis formasi kepegawaian.
* `position_id` (`UUID REFERENCES positions(id) ON DELETE SET NULL`).
* `department_id` (`UUID REFERENCES departments(id) ON DELETE SET NULL`).
* `phone` (`TEXT`): Nomor telepon seluler / WhatsApp.
* `email` (`TEXT`): Email resmi kepegawaian.
* `photo_url` (`TEXT`): URL pasfoto resmi.
* `join_date` (`DATE`): Tanggal mulai bertugas di sekolah.
* `status` (`employee_status DEFAULT 'active'`).
* `notes` (`TEXT`): Catatan khusus kepegawaian.
* `created_at`, `updated_at` (`TIMESTAMPTZ`).

---

## 4. Keamanan & Row Level Security (RLS)

1. **Prinsip Hak Akses**:
   * Frontend tidak berwenang mendeklarasikan peran pengguna sebagai otorisasi mutlak.
   * Supabase RLS memverifikasi `auth.uid()` pada setiap request API.
2. **Fungsi Pembantu (Security Definer)**:
   * `private.is_admin(user_id)`: Memeriksa apakah `user_id` memiliki role `admin` atau `super_admin`.
   * `private.has_role(user_id, allowed_roles)`: Memeriksa apakah `user_id` terdaftar dalam daftar role yang diizinkan.
   * Seluruh fungsi pembantu dienkapsulasi dalam schema `private` dengan `SET search_path = public, pg_temp` untuk mencegah eksploitasi jalur pencarian.
3. **Pemberian Role Akun Baru**:
   * Trigger `handle_new_user()` pada `auth.users` selalu memberikan role `'employee'`.
   * Role administratif (`admin`, `headmaster`, `verifier`) wajib diberikan secara eksplisit melalui prosedur admin, bukan otomatis dari registrasi.

---

## 5. Storage Preparation

Arsitektur penyimpanan berkas dipersiapkan untuk bucket berikut di Supabase Storage:
1. `avatars` (Publik terbatas): Foto profil pengguna.
2. `attendance-selfies` (Privat): Swafoto verifikasi presensi (Phase 2 belum mengaktifkan alur unggah).
3. `request-attachments` (Privat): Lampiran surat dokter, surat tugas dinas, atau berkas cuti.
4. `school-assets` (Publik): Logo sekolah, stempel digital, dan aset publik.

---

## 6. Petunjuk Eksekusi Migrasi & Seed

Jika menggunakan **Supabase Dashboard**:
1. Buka project Supabase Anda.
2. Navigasi ke menu **SQL Editor**.
3. Jalankan file migrasi secara berurutan:
   * `supabase/migrations/001_extensions.sql`
   * `supabase/migrations/002_enums.sql`
   * `supabase/migrations/003_profiles.sql`
   * `supabase/migrations/004_departments.sql`
   * `supabase/migrations/005_positions.sql`
   * `supabase/migrations/006_employees.sql`
   * `supabase/migrations/007_auth_last_login.sql`
   * `supabase/migrations/008_create_profiles_and_auth_trigger.sql` (Khusus inisialisasi tabel profiles, trigger auth.users, dan sinkronisasi user existing)
4. Jalankan seed master data:
   * `supabase/seed.sql`

Jika menggunakan **Supabase CLI**:
```bash
supabase db reset
# atau
supabase migration up
```
