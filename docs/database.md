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

### 5. `public.locations` (Phase 5A-1 — Master Lokasi Presensi)
Menyimpan master titik lokasi presensi sekolah yang extensible untuk multi-lokasi:
* `id` (`UUID PRIMARY KEY DEFAULT gen_random_uuid()`): Identifier lokasi.
* `name` (`TEXT NOT NULL`): Nama lokasi (misal: "Kantor/TU", "Ruang Guru", "Lab Komputer").
* `code` (`TEXT UNIQUE NOT NULL`): Kode singkat lokasi (misal: `OFFICE`, `LAB_KOMP`).
* `description` (`TEXT`): Deskripsi dan fungsi lokasi.
* `location_type` (`TEXT NOT NULL`): Jenis lokasi (`office`, `teacher_room`, `laboratory`, `other`).
* `latitude` (`NUMERIC`): Koordinat latitude GPS (-90 s/d 90).
* `longitude` (`NUMERIC`): Koordinat longitude GPS (-180 s/d 180).
* `radius_meters` (`NUMERIC NOT NULL DEFAULT 100`): Radius batas toleransi geofencing presensi (1 s/d 500 meter).
* `is_attendance_enabled` (`BOOLEAN DEFAULT false`): Status izin penggunaan lokasi sebagai titik presensi aktif. Wajib memiliki koordinat valid jika `true`.
* `is_active` (`BOOLEAN DEFAULT true`): Status keaktifan lokasi secara umum.
* `address` (`TEXT`): Alamat fisik / deskripsi petunjuk arah.
* `created_at`, `updated_at` (`TIMESTAMPTZ`): Otomatis diperbarui via `set_updated_at()`.
* **V1 Single Active Attendance Location Constraint**:
  Index unik parsial `idx_locations_single_active_attendance` menjamin maksimal hanya 1 lokasi yang dapat berstatus `is_active = true AND is_attendance_enabled = true` secara bersamaan.
* **RLS & Security**:
  * Admin / Super Admin: `SELECT`, `INSERT`, `UPDATE` (tanpa hak `DELETE`).
  * Headmaster & Pegawai Aktif: `SELECT` lokasi aktif.
  * Inactive user: Diblokir sepenuhnya.

### 6. `public.holidays` (Phase 5B-1 — Kalender & Hari Libur)
Menyimpan master data kalender kerja sekolah, hari libur nasional, cuti bersama, dan hari khusus:
* `id` (`UUID PRIMARY KEY DEFAULT gen_random_uuid()`): Identifier hari libur.
* `name` (`TEXT NOT NULL`): Nama hari libur / acara (CHECK: `length(trim(name)) > 0`).
* `holiday_date` (`DATE NOT NULL`): Tanggal hari libur. Mendukung data lampau dan masa depan.
* `holiday_type` (`TEXT NOT NULL`): Jenis libur (`national`, `collective_leave`, `school`, `special`, `other`).
* `description` (`TEXT`): Keterangan tambahan atau surat edaran.
* `is_active` (`BOOLEAN NOT NULL DEFAULT true`): Status keaktifan record (soft-deactivation).
* `created_at`, `updated_at` (`TIMESTAMPTZ`): Otomatis diperbarui via `set_updated_at()`.
* **Integrity Constraints**:
  * `UNIQUE (holiday_date, name)`: Mencegah duplikasi record identik namun tetap mengizinkan multi-event pada tanggal yang sama.
  * Tidak ada pembatasan tahun atau `holiday_date >= CURRENT_DATE`, memungkinkan data historis dan perancangan masa depan.
* **Fungsi Pembantu**:
  * `public.is_holiday(check_date DATE) RETURNS BOOLEAN`: Fungsi `SECURITY DEFINER` dengan `search_path = public, pg_temp` untuk memverifikasi apakah suatu tanggal berstatus libur aktif.
* **RLS & Security**:
  * Admin / Super Admin: `SELECT`, `INSERT`, `UPDATE` (tanpa hak `DELETE`).
  * Headmaster & Pegawai Aktif: `SELECT` data libur aktif.
  * Inactive user: Diblokir sepenuhnya.

### 7. `public.work_schedules` (Phase 5C-1 — Jadwal Kerja)
Menyimpan konfigurasi jam kerja normal, jendela check-in, batas akhir, kepulangan operasional sekolah, dan jendela check-out:
* `id` (`UUID PRIMARY KEY DEFAULT gen_random_uuid()`): Identifier jadwal kerja.
* `name` (`TEXT NOT NULL`): Nama jadwal kerja (CHECK: `length(trim(name)) > 0`).
* `code` (`TEXT NOT NULL UNIQUE`): Kode unik jadwal kerja (CHECK: `length(trim(code)) > 0`).
* `description` (`TEXT`): Keterangan opsional.
* `check_in_start_time` (`TIME NOT NULL`): Awal jendela check-in (misal 06:30).
* `check_in_on_time_end` (`TIME NOT NULL`): Akhir jendela tepat waktu (misal 07:30).
* `check_in_end_time` (`TIME NOT NULL`): Batas akhir check-in / ditutup (misal 10:00).
* `work_start_time` (`TIME NOT NULL`): Jam kerja resmi masuk (misal 07:30).
* `operational_end_time` (`TIME NOT NULL`): Jam kepulangan operasional bus sekolah (misal 15:00).
* `work_end_time` (`TIME NOT NULL`): Jam kerja resmi selesai (misal 15:30).
* `check_out_start_time` (`TIME NOT NULL`): Awal jendela check-out (sama dengan `operational_end_time` = 15:00).
* `check_out_end_time` (`TIME NOT NULL`): Batas akhir check-out / ditutup (misal 17:00).
* `working_days` (`TEXT[] NOT NULL`): Array hari kerja (`monday`, `tuesday`, `wednesday`, `thursday`, `friday`, `saturday`, `sunday`).
* `is_active` (`BOOLEAN NOT NULL DEFAULT true`): Status aktif jadwal kerja (soft-deactivation).
* `created_at`, `updated_at` (`TIMESTAMPTZ`): Otomatis diperbarui via `set_updated_at()`.
* **Integrity Constraints**:
  * `work_schedules_time_sequence_check`: Memastikan konsistensi urutan waktu V1:
    `check_in_start_time < check_in_on_time_end < check_in_end_time`
    `check_in_on_time_end <= work_start_time`
    `work_start_time < operational_end_time < work_end_time`
    `check_out_start_time = operational_end_time`
    `operational_end_time < check_out_end_time`
  * `work_schedules_working_days_check`: Memvalidasi array hari kerja tidak kosong, hanya memuat 7 hari yang valid, dan tidak memiliki duplikasi via `public.validate_working_days()`.
* **Single Active Protection (Phase 5C-2)**:
  * `idx_work_schedules_single_active`: Partial unique index `UNIQUE (is_active) WHERE is_active = true` menjamin tepat 1 jadwal kerja aktif untuk seluruh sekolah (tanpa sistem shift dan tanpa tabel per-pegawai).
* **Fungsi Pembantu (Phase 5C-2)**:
  * `public.get_active_work_schedule()`: Fungsi `SECURITY DEFINER` dengan `search_path = public, pg_temp` untuk mengambil baris jadwal kerja sekolah yang sedang aktif.
* **RLS & Security**:
  * Admin / Super Admin: `SELECT`, `INSERT`, `UPDATE` (tanpa hak `DELETE`).
  * Headmaster & Pegawai Aktif: `SELECT` jadwal aktif.
  * Inactive user: Diblokir sepenuhnya dari mutasi.

---

### 8. Tabel Transaksi Presensi Pegawai (`public.attendance`) — Phase 6A-1

Tabel `public.attendance` menyimpan data transaksi harian presensi pegawai (1 pegawai = maksimal 1 record per tanggal kerja).

* **Struktur Kolom**:
  * `id` (`UUID PRIMARY KEY DEFAULT gen_random_uuid()`)
  * `employee_id` (`UUID NOT NULL REFERENCES public.employees(id) ON DELETE RESTRICT`)
  * `attendance_date` (`DATE NOT NULL`)
  * `check_in_at` (`TIMESTAMPTZ NULL`)
  * `check_out_at` (`TIMESTAMPTZ NULL`)
  * `check_in_status` (`TEXT NULL`): Constraint CHECK (`'on_time'`, `'late'`)
  * `check_out_status` (`TEXT NULL`): Constraint CHECK (`'operational'`, `'after_work'`)
  * `check_in_location_id` (`UUID NULL REFERENCES public.locations(id) ON DELETE SET NULL`)
  * `check_out_location_id` (`UUID NULL REFERENCES public.locations(id) ON DELETE SET NULL`)
  * `check_in_latitude`, `check_in_longitude` (`NUMERIC NULL`)
  * `check_out_latitude`, `check_out_longitude` (`NUMERIC NULL`)
  * `notes` (`TEXT NULL`)
  * `created_at`, `updated_at` (`TIMESTAMPTZ NOT NULL DEFAULT now()`)
* **Integrity Constraints**:
  * `attendance_employee_date_key`: Constraint `UNIQUE(employee_id, attendance_date)` menjamin 1 pegawai tepat 1 record presensi per tanggal.
  * `attendance_check_in_status_check`: Membatasi status check-in ke `'on_time'` atau `'late'`.
  * `attendance_check_out_status_check`: Membatasi status check-out ke `'operational'` (15:00-15:30) atau `'after_work'` (15:31-17:00).
  * `attendance_check_in_lat_check`, `attendance_check_out_lat_check`: Rentang latitude valid (-90 sampai 90).
  * `attendance_check_in_lng_check`, `attendance_check_out_lng_check`: Rentang longitude valid (-180 sampai 180).
  * `attendance_time_order_check`: Memastikan `check_out_at >= check_in_at` jika keduanya terisi.
* **Fungsi Pembantu**:
  * `private.get_employee_id(check_user_id UUID)`: Mengambil `employee.id` yang terhubung dengan `profile_id` (auth.uid()).
* **RLS & Security**:
  * Admin & Super Admin: `SELECT`, `INSERT`, `UPDATE`.
  * Headmaster: `SELECT` seluruh presensi pegawai (read-only).
  * Pegawai Aktif: `SELECT` dan `INSERT` presensi milik sendiri.
  * Inactive user: Diblokir sepenuhnya dari mutasi.
  * Hard Delete: Diblokir (tidak ada policy DELETE).

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
2. `attendance-selfies` (Privat): Swafoto verifikasi presensi (Batas 1,5 MB, format JPEG/WebP, path kanonis `{employee_id}/*`, RLS append-only).
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
   * `supabase/migrations/008_create_profiles_and_auth_trigger.sql` (Inisialisasi tabel profiles, trigger auth.users, dan sinkronisasi user existing)
   * `supabase/migrations/009_employee_management.sql` (Tabel departments, positions, employees, relasi ke profiles, indexes, master data, dan RLS)
   * `supabase/migrations/010_linkable_profiles_rpc.sql` (RPC get_linkable_profiles untuk manajemen linking akun)
   * `supabase/migrations/011_locations.sql` (Phase 5A-1: Tabel locations, GPS & radius constraints, partial unique index single active attendance location, RLS, no delete, dan seed Kantor/TU)
   * `supabase/migrations/012_holidays.sql` (Phase 5B-1: Tabel holidays, holiday_type check, non-empty name, unique date+name, RLS, no delete, dan helper function is_holiday)
   * `supabase/migrations/013_work_schedules.sql` (Phase 5C-1: Tabel work_schedules, validasi working_days, time sequence constraint V1, RLS, no delete)
   * `supabase/migrations/014_default_work_schedule.sql` (Phase 5C-2: Index single active schedule, default seed Jadwal Kerja Sekolah, helper get_active_work_schedule)
   * `supabase/migrations/015_attendance.sql` (Phase 6A-1: Tabel attendance, unique employee+date, check_in_status/check_out_status constraints, RLS, no delete)
4. Jalankan seed master data:
   * `supabase/seed.sql` (Departments, Positions, Locations, dan Default Work Schedule)

Jika menggunakan **Supabase CLI**:
```bash
supabase db reset
# atau
supabase migration up
```
