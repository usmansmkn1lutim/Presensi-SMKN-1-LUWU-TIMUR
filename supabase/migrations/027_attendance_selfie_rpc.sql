-- ============================================================================
-- Migration: 027_attendance_selfie_rpc.sql
-- Module: PHASE 3B-2 — ATTENDANCE SELFIE RPC INTEGRATION
-- Description:
--   Integrates optional `user_photo_path` (text DEFAULT NULL) parameter into:
--     1. public.check_in(user_latitude, user_longitude, user_photo_path)
--     2. public.check_out(user_latitude, user_longitude, user_photo_path)
--
-- Security & Invariants:
--   - Wrapped in explicit BEGIN ... COMMIT transaction block for strict atomicity across all runners.
--   - Replaces 2-argument signatures with RESTRICT behavior after dependency audit.
--   - Preserves RETURNS TABLE columns, order, and types exactly as Migration 024.
--   - Retains SECURITY DEFINER and SET search_path TO 'public', 'private', 'pg_temp'.
--   - Retains all business validations: authentication, active employee, schedule,
--     work days, holidays, approved requests check, geofencing, sequence, etc.
--   - Enforces strict canonical path validation when user_photo_path IS NOT NULL:
--       Format: {employee_id}/{YYYY-MM-DD}/{check_in|check_out}_{uuid_v4}.{jpg|webp}
--       Root folder matches authenticated employee_id
--       Prefix strictly matches RPC operation ('check_in_' or 'check_out_')
--       Date is strictly validated against Gregorian calendar (anti-silent-normalization)
--       Date matches server WITA local date
--       Storage object exists in private 'attendance-selfies' bucket
--   - Applies least-privilege DCL:
--       REVOKE ALL FROM PUBLIC
--       GRANT EXECUTE TO authenticated
--   - Broadcasts PostgREST schema reload: NOTIFY pgrst, 'reload schema'
-- ============================================================================

BEGIN;

-- ----------------------------------------------------------------------------
-- 1. Drop Legacy 2-Argument Functions with RESTRICT Behavior
-- ----------------------------------------------------------------------------
-- Note: Audit confirmed no views, foreign keys, or triggers depend on these 2-arg signatures.
DROP FUNCTION IF EXISTS public.check_in(double precision, double precision) RESTRICT;
DROP FUNCTION IF EXISTS public.check_out(double precision, double precision) RESTRICT;

-- ----------------------------------------------------------------------------
-- 2. Function: public.check_in
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_in(
    user_latitude double precision,
    user_longitude double precision,
    user_photo_path text DEFAULT NULL
)
RETURNS TABLE(
    attendance_id uuid,
    attendance_date date,
    check_in_at timestamp with time zone,
    check_in_status text,
    location_id uuid,
    location_name text,
    distance_meters double precision,
    employee_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
DECLARE
    v_employee_id UUID;
    v_now TIMESTAMPTZ;
    v_local_date DATE;
    v_local_time TIME;
    v_day_name TEXT;

    v_schedule RECORD;
    v_approved_request RECORD;
    v_location RECORD;

    v_distance DOUBLE PRECISION;
    v_best_distance DOUBLE PRECISION := NULL;
    v_best_location_id UUID := NULL;
    v_best_location_name TEXT := NULL;

    v_check_in_status TEXT;
    v_new_attendance_id UUID;

    -- Path validation variables
    v_path_regex CONSTANT TEXT := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9]{4}-[0-9]{2}-[0-9]{2}/check_in_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|webp)$';
    v_path_emp_id_str TEXT;
    v_path_date_str TEXT;
    v_parsed_date DATE;
BEGIN
    -- 1. Validasi User Terautentikasi
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Pengguna belum terautentikasi.';
    END IF;

    -- 2. Validasi Koordinat Lokasi
    IF user_latitude IS NULL OR user_longitude IS NULL THEN
        RAISE EXCEPTION 'Koordinat lokasi wajib diisi.';
    END IF;

    IF user_latitude < -90 OR user_latitude > 90 THEN
        RAISE EXCEPTION 'Latitude tidak valid.';
    END IF;

    IF user_longitude < -180 OR user_longitude > 180 THEN
        RAISE EXCEPTION 'Longitude tidak valid.';
    END IF;

    -- 3. Resolve Identitas Pegawai
    v_employee_id := private.get_employee_id(auth.uid());

    IF v_employee_id IS NULL THEN
        RAISE EXCEPTION 'Akun pengguna belum terhubung dengan data pegawai.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.employees
        WHERE id = v_employee_id
          AND status = 'active'
    ) THEN
        RAISE EXCEPTION 'Status pegawai tidak aktif.';
    END IF;

    -- 4. Server Time — Asia/Makassar (WITA)
    v_now := NOW();
    v_local_date := (v_now AT TIME ZONE 'Asia/Makassar')::DATE;
    v_local_time := (v_now AT TIME ZONE 'Asia/Makassar')::TIME;
    v_day_name := TRIM(LOWER(TO_CHAR(v_local_date, 'Day')));

    -- 5. Validasi Integritas user_photo_path (Jika Disediakan)
    IF user_photo_path IS NOT NULL THEN
        -- a. Validasi format regex leksikal kanonis
        IF NOT (user_photo_path ~ v_path_regex) THEN
            RAISE EXCEPTION 'Format path foto presensi masuk tidak valid.';
        END IF;

        -- b. Validasi folder ID pegawai cocok dengan pegawai aktif saat ini
        v_path_emp_id_str := split_part(user_photo_path, '/', 1);
        IF v_path_emp_id_str <> v_employee_id::TEXT THEN
            RAISE EXCEPTION 'Path foto presensi tidak sesuai dengan identitas pegawai.';
        END IF;

        -- c. Validasi keabsahan kalender tanggal pada path (anti-silent-normalization & Gregorian check)
        v_path_date_str := split_part(user_photo_path, '/', 2);
        BEGIN
            v_parsed_date := v_path_date_str::DATE;
            -- Rekonstruksi kanonis: memastikan tanggal Gregorian valid dan menolak normalisasi diam-diam
            IF TO_CHAR(v_parsed_date, 'YYYY-MM-DD') <> v_path_date_str THEN
                RAISE EXCEPTION 'Tanggal pada path foto tidak valid.';
            END IF;
        EXCEPTION
            WHEN datetime_field_overflow OR invalid_datetime_format THEN
                RAISE EXCEPTION 'Tanggal pada path foto tidak valid.';
        END;

        -- d. Validasi kecocokan tanggal path dengan tanggal transaksi server WITA
        IF v_parsed_date <> v_local_date THEN
            RAISE EXCEPTION 'Tanggal path foto tidak sesuai dengan tanggal hari ini.';
        END IF;

        -- e. Validasi keberadaan objek fisik pada storage bucket privat 'attendance-selfies'
        IF NOT EXISTS (
            SELECT 1
            FROM storage.objects
            WHERE bucket_id = 'attendance-selfies'
              AND name = user_photo_path
        ) THEN
            RAISE EXCEPTION 'Berkas foto presensi tidak ditemukan pada sistem penyimpanan.';
        END IF;
    END IF;

    -- 6. Server-Side Enforcement: Pemeriksaan Pengajuan yang Disetujui
    SELECT *
    INTO v_approved_request
    FROM public.requests
    WHERE employee_id = v_employee_id
      AND status = 'approved'
      AND request_type IN ('sick', 'other', 'official_duty', 'leave')
      AND v_local_date >= start_date
      AND v_local_date <= end_date
    LIMIT 1;

    IF FOUND THEN
        RAISE EXCEPTION 'Anda memiliki pengajuan % yang telah disetujui untuk hari ini. Tidak perlu melakukan presensi.',
            CASE v_approved_request.request_type
                WHEN 'sick' THEN 'Sakit'
                WHEN 'other' THEN 'Izin'
                WHEN 'official_duty' THEN 'Dinas Luar'
                WHEN 'leave' THEN 'Cuti'
                ELSE 'Izin/Cuti'
            END;
    END IF;

    -- 7. Ambil Jadwal Kerja Aktif
    SELECT *
    INTO v_schedule
    FROM public.work_schedules
    WHERE is_active = true
    ORDER BY created_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Jadwal kerja aktif belum tersedia.';
    END IF;

    -- 8. Validasi Hari Kerja
    IF NOT (v_day_name = ANY(v_schedule.working_days)) THEN
        RAISE EXCEPTION 'Hari ini bukan hari kerja.';
    END IF;

    -- 9. Validasi Hari Libur
    IF public.is_holiday(v_local_date) THEN
        RAISE EXCEPTION 'Hari ini merupakan hari libur.';
    END IF;

    -- 10. Validasi Duplikasi Check-in Hari Ini
    IF EXISTS (
        SELECT 1
        FROM public.attendance
        WHERE employee_id = v_employee_id
          AND attendance_date = v_local_date
    ) THEN
        RAISE EXCEPTION 'Presensi masuk hari ini sudah tercatat.';
    END IF;

    -- 11. Validasi Batas Waktu Check-in
    IF v_local_time < v_schedule.check_in_start_time THEN
        RAISE EXCEPTION 'Check-in belum dibuka. Check-in dimulai pukul %.',
            TO_CHAR(v_schedule.check_in_start_time, 'HH24:MI');
    END IF;

    IF v_local_time > v_schedule.check_in_end_time THEN
        RAISE EXCEPTION 'Waktu check-in telah berakhir pada pukul %.',
            TO_CHAR(v_schedule.check_in_end_time, 'HH24:MI');
    END IF;

    -- 12. Tentukan Status Check-in (on_time vs late)
    IF v_local_time <= v_schedule.check_in_on_time_end THEN
        v_check_in_status := 'on_time';
    ELSE
        v_check_in_status := 'late';
    END IF;

    -- 13. Evaluasi Titik Presensi Terdekat (Geofence)
    FOR v_location IN
        SELECT
            l.id,
            l.name,
            l.latitude,
            l.longitude,
            l.radius_meters
        FROM public.locations l
        WHERE l.is_active = true
          AND l.is_attendance_enabled = true
          AND l.latitude IS NOT NULL
          AND l.longitude IS NOT NULL
    LOOP
        v_distance :=
            6371000.0 * 2.0 * ASIN(
                SQRT(
                    POWER(SIN(RADIANS(v_location.latitude - user_latitude) / 2.0), 2)
                    +
                    COS(RADIANS(user_latitude))
                    * COS(RADIANS(v_location.latitude))
                    * POWER(SIN(RADIANS(v_location.longitude - user_longitude) / 2.0), 2)
                )
            );

        IF v_distance <= v_location.radius_meters THEN
            IF v_best_distance IS NULL OR v_distance < v_best_distance THEN
                v_best_distance := v_distance;
                v_best_location_id := v_location.id;
                v_best_location_name := v_location.name;
            END IF;
        END IF;
    END LOOP;

    -- 14. Validasi Radius Lokasi Presensi
    IF v_best_location_id IS NULL THEN
        RAISE EXCEPTION 'Anda berada di luar radius seluruh titik presensi yang tersedia.';
    END IF;

    -- 15. Simpan Transaksi Check-in
    v_new_attendance_id := gen_random_uuid();

    INSERT INTO public.attendance (
        id,
        employee_id,
        attendance_date,
        check_in_at,
        check_in_status,
        check_in_location_id,
        check_in_latitude,
        check_in_longitude,
        check_in_photo_path,
        created_at,
        updated_at
    ) VALUES (
        v_new_attendance_id,
        v_employee_id,
        v_local_date,
        v_now,
        v_check_in_status,
        v_best_location_id,
        user_latitude,
        user_longitude,
        user_photo_path,
        v_now,
        v_now
    );

    -- 16. Return Hasil Sesuai Kontrak Presisi
    attendance_id := v_new_attendance_id;
    attendance_date := v_local_date;
    check_in_at := v_now;
    check_in_status := v_check_in_status;
    location_id := v_best_location_id;
    location_name := v_best_location_name;
    distance_meters := v_best_distance;
    employee_id := v_employee_id;

    RETURN NEXT;
END;
$function$;


-- ----------------------------------------------------------------------------
-- 3. Function: public.check_out
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_out(
    user_latitude double precision,
    user_longitude double precision,
    user_photo_path text DEFAULT NULL
)
RETURNS TABLE(
    attendance_id uuid,
    attendance_date date,
    check_in_at timestamp with time zone,
    check_out_at timestamp with time zone,
    check_out_status text,
    location_id uuid,
    location_name text,
    distance_meters double precision
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private', 'pg_temp'
AS $function$
DECLARE
    v_employee_id UUID;
    v_now TIMESTAMPTZ;
    v_local_date DATE;
    v_local_time TIME;
    v_day_name TEXT;

    v_schedule RECORD;
    v_approved_request RECORD;
    v_attendance RECORD;
    v_location RECORD;

    v_distance DOUBLE PRECISION;
    v_best_distance DOUBLE PRECISION := NULL;
    v_best_location_id UUID := NULL;
    v_best_location_name TEXT := NULL;

    v_check_out_status TEXT;

    -- Path validation variables
    v_path_regex CONSTANT TEXT := '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9]{4}-[0-9]{2}-[0-9]{2}/check_out_[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(jpg|webp)$';
    v_path_emp_id_str TEXT;
    v_path_date_str TEXT;
    v_parsed_date DATE;
BEGIN
    -- 1. Validasi User Terautentikasi
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Pengguna belum terautentikasi.';
    END IF;

    -- 2. Validasi Koordinat Lokasi
    IF user_latitude IS NULL OR user_longitude IS NULL THEN
        RAISE EXCEPTION 'Koordinat lokasi wajib diisi.';
    END IF;

    IF user_latitude < -90 OR user_latitude > 90 THEN
        RAISE EXCEPTION 'Latitude tidak valid.';
    END IF;

    IF user_longitude < -180 OR user_longitude > 180 THEN
        RAISE EXCEPTION 'Longitude tidak valid.';
    END IF;

    -- 3. Resolve Identitas Pegawai
    v_employee_id := private.get_employee_id(auth.uid());

    IF v_employee_id IS NULL THEN
        RAISE EXCEPTION 'Akun pengguna belum terhubung dengan data pegawai.';
    END IF;

    IF NOT EXISTS (
        SELECT 1
        FROM public.employees
        WHERE id = v_employee_id
          AND status = 'active'
    ) THEN
        RAISE EXCEPTION 'Status pegawai tidak aktif.';
    END IF;

    -- 4. Server Time — Asia/Makassar (WITA)
    v_now := NOW();
    v_local_date := (v_now AT TIME ZONE 'Asia/Makassar')::DATE;
    v_local_time := (v_now AT TIME ZONE 'Asia/Makassar')::TIME;
    v_day_name := TRIM(LOWER(TO_CHAR(v_local_date, 'Day')));

    -- 5. Validasi Integritas user_photo_path (Jika Disediakan)
    IF user_photo_path IS NOT NULL THEN
        -- a. Validasi format regex leksikal kanonis
        IF NOT (user_photo_path ~ v_path_regex) THEN
            RAISE EXCEPTION 'Format path foto presensi pulang tidak valid.';
        END IF;

        -- b. Validasi folder ID pegawai cocok dengan pegawai aktif saat ini
        v_path_emp_id_str := split_part(user_photo_path, '/', 1);
        IF v_path_emp_id_str <> v_employee_id::TEXT THEN
            RAISE EXCEPTION 'Path foto presensi tidak sesuai dengan identitas pegawai.';
        END IF;

        -- c. Validasi keabsahan kalender tanggal pada path (anti-silent-normalization & Gregorian check)
        v_path_date_str := split_part(user_photo_path, '/', 2);
        BEGIN
            v_parsed_date := v_path_date_str::DATE;
            -- Rekonstruksi kanonis: memastikan tanggal Gregorian valid dan menolak normalisasi diam-diam
            IF TO_CHAR(v_parsed_date, 'YYYY-MM-DD') <> v_path_date_str THEN
                RAISE EXCEPTION 'Tanggal pada path foto tidak valid.';
            END IF;
        EXCEPTION
            WHEN datetime_field_overflow OR invalid_datetime_format THEN
                RAISE EXCEPTION 'Tanggal pada path foto tidak valid.';
        END;

        -- d. Validasi kecocokan tanggal path dengan tanggal transaksi server WITA
        IF v_parsed_date <> v_local_date THEN
            RAISE EXCEPTION 'Tanggal path foto tidak sesuai dengan tanggal hari ini.';
        END IF;

        -- e. Validasi keberadaan objek fisik pada storage bucket privat 'attendance-selfies'
        IF NOT EXISTS (
            SELECT 1
            FROM storage.objects
            WHERE bucket_id = 'attendance-selfies'
              AND name = user_photo_path
        ) THEN
            RAISE EXCEPTION 'Berkas foto presensi tidak ditemukan pada sistem penyimpanan.';
        END IF;
    END IF;

    -- 6. Server-Side Enforcement: Pemeriksaan Pengajuan yang Disetujui
    SELECT *
    INTO v_approved_request
    FROM public.requests
    WHERE employee_id = v_employee_id
      AND status = 'approved'
      AND request_type IN ('sick', 'other', 'official_duty', 'leave')
      AND v_local_date >= start_date
      AND v_local_date <= end_date
    LIMIT 1;

    IF FOUND THEN
        RAISE EXCEPTION 'Anda memiliki pengajuan % yang telah disetujui untuk hari ini. Tidak perlu melakukan presensi.',
            CASE v_approved_request.request_type
                WHEN 'sick' THEN 'Sakit'
                WHEN 'other' THEN 'Izin'
                WHEN 'official_duty' THEN 'Dinas Luar'
                WHEN 'leave' THEN 'Cuti'
                ELSE 'Izin/Cuti'
            END;
    END IF;

    -- 7. Ambil Jadwal Kerja Aktif
    SELECT *
    INTO v_schedule
    FROM public.work_schedules
    WHERE is_active = true
    ORDER BY created_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Jadwal kerja aktif belum tersedia.';
    END IF;

    -- 8. Validasi Hari Kerja
    IF NOT (v_day_name = ANY(v_schedule.working_days)) THEN
        RAISE EXCEPTION 'Hari ini bukan hari kerja.';
    END IF;

    -- 9. Validasi Hari Libur
    IF public.is_holiday(v_local_date) THEN
        RAISE EXCEPTION 'Hari ini merupakan hari libur.';
    END IF;

    -- 10. Ambil Presensi Hari Ini (Check-in Harus Sudah Ada)
    SELECT *
    INTO v_attendance
    FROM public.attendance AS a
    WHERE a.employee_id = v_employee_id
      AND a.attendance_date = v_local_date
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Anda belum melakukan check-in hari ini.';
    END IF;

    -- 11. Validasi Check-out Duplikat
    IF v_attendance.check_out_at IS NOT NULL THEN
        RAISE EXCEPTION 'Anda sudah melakukan check-out hari ini.';
    END IF;

    -- 12. Validasi Batas Waktu Check-out
    IF v_local_time < v_schedule.check_out_start_time THEN
        RAISE EXCEPTION 'Check-out belum dibuka. Check-out dimulai pukul %.',
            TO_CHAR(v_schedule.check_out_start_time, 'HH24:MI');
    END IF;

    IF v_local_time > v_schedule.check_out_end_time THEN
        RAISE EXCEPTION 'Waktu check-out sudah ditutup pada pukul %.',
            TO_CHAR(v_schedule.check_out_end_time, 'HH24:MI');
    END IF;

    -- 13. Tentukan Status Check-out (operational vs after_work)
    IF v_local_time <= v_schedule.work_end_time THEN
        v_check_out_status := 'operational';
    ELSE
        v_check_out_status := 'after_work';
    END IF;

    -- 14. Validasi Kronologis Check-out >= Check-in
    IF v_attendance.check_in_at IS NULL THEN
        RAISE EXCEPTION 'Data check-in tidak valid.';
    END IF;

    IF v_now < v_attendance.check_in_at THEN
        RAISE EXCEPTION 'Waktu check-out tidak boleh lebih awal dari waktu check-in.';
    END IF;

    -- 15. Evaluasi Titik Presensi Terdekat (Geofence)
    FOR v_location IN
        SELECT
            l.id,
            l.name,
            l.latitude,
            l.longitude,
            l.radius_meters
        FROM public.locations l
        WHERE l.is_active = true
          AND l.is_attendance_enabled = true
          AND l.latitude IS NOT NULL
          AND l.longitude IS NOT NULL
    LOOP
        v_distance :=
            6371000.0 * 2.0 * ASIN(
                SQRT(
                    POWER(SIN(RADIANS(v_location.latitude - user_latitude) / 2.0), 2)
                    +
                    COS(RADIANS(user_latitude))
                    * COS(RADIANS(v_location.latitude))
                    * POWER(SIN(RADIANS(v_location.longitude - user_longitude) / 2.0), 2)
                )
            );

        IF v_distance <= v_location.radius_meters THEN
            IF v_best_distance IS NULL OR v_distance < v_best_distance THEN
                v_best_distance := v_distance;
                v_best_location_id := v_location.id;
                v_best_location_name := v_location.name;
            END IF;
        END IF;
    END LOOP;

    -- 16. Validasi Radius Lokasi Presensi
    IF v_best_location_id IS NULL THEN
        RAISE EXCEPTION 'Anda berada di luar radius seluruh titik presensi yang tersedia.';
    END IF;

    -- 17. Simpan Transaksi Check-out
    UPDATE public.attendance AS a
    SET
        check_out_at = v_now,
        check_out_status = v_check_out_status,
        check_out_location_id = v_best_location_id,
        check_out_latitude = user_latitude,
        check_out_longitude = user_longitude,
        check_out_photo_path = user_photo_path,
        updated_at = NOW()
    WHERE a.id = v_attendance.id
      AND a.employee_id = v_employee_id
      AND a.check_out_at IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Check-out gagal. Data presensi mungkin sudah diperbarui.';
    END IF;

    -- 18. Return Hasil Sesuai Kontrak Presisi
    attendance_id := v_attendance.id;
    attendance_date := v_local_date;
    check_in_at := v_attendance.check_in_at;
    check_out_at := v_now;
    check_out_status := v_check_out_status;
    location_id := v_best_location_id;
    location_name := v_best_location_name;
    distance_meters := v_best_distance;

    RETURN NEXT;
END;
$function$;


-- ----------------------------------------------------------------------------
-- 4. Access Control & Privilege Management (Least Privilege)
-- ----------------------------------------------------------------------------
-- Cabut seluruh akses default dari PUBLIC dan role anonim
REVOKE ALL ON FUNCTION public.check_in(double precision, double precision, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.check_out(double precision, double precision, text) FROM PUBLIC;

REVOKE ALL ON FUNCTION public.check_in(double precision, double precision, text) FROM anon;
REVOKE ALL ON FUNCTION public.check_out(double precision, double precision, text) FROM anon;

-- Berikan izin eksekusi hanya kepada authenticated users
GRANT EXECUTE ON FUNCTION public.check_in(double precision, double precision, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_out(double precision, double precision, text) TO authenticated;


-- ----------------------------------------------------------------------------
-- 5. Broadcast PostgREST Schema Reload
-- ----------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

COMMIT;
