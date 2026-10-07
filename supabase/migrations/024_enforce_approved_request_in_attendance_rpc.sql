-- ============================================================================
-- Migration: 024_enforce_approved_request_in_attendance_rpc.sql
-- Module: ATTENDANCE SERVER-SIDE APPROVED REQUEST ENFORCEMENT
-- Description:
--   Ensures public.check_in and public.check_out RPCs strictly reject physical
--   attendance transactions if an employee has an active approved request
--   (sick, other/izin, official_duty, leave) for today's date in Asia/Makassar (WITA).
--   Preserves SECURITY DEFINER and strict search_path.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Function: public.check_in
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_in(user_latitude double precision, user_longitude double precision)
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
BEGIN
    -- 1. Validasi User
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Pengguna belum terautentikasi.';
    END IF;

    -- 2. Validasi Koordinat
    IF user_latitude IS NULL OR user_longitude IS NULL THEN
        RAISE EXCEPTION 'Koordinat lokasi wajib diisi.';
    END IF;

    IF user_latitude < -90 OR user_latitude > 90 THEN
        RAISE EXCEPTION 'Latitude tidak valid.';
    END IF;

    IF user_longitude < -180 OR user_longitude > 180 THEN
        RAISE EXCEPTION 'Longitude tidak valid.';
    END IF;

    -- 3. Resolve Employee
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

    -- 5. SERVER-SIDE ENFORCEMENT: Approved Request Check (Sick, Other/Izin, Official Duty, Leave)
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

    -- 6. Ambil Jadwal Kerja Aktif
    SELECT *
    INTO v_schedule
    FROM public.work_schedules
    WHERE is_active = true
    ORDER BY created_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Jadwal kerja aktif belum tersedia.';
    END IF;

    -- 7. Validasi Hari Kerja
    IF NOT (v_day_name = ANY(v_schedule.working_days)) THEN
        RAISE EXCEPTION 'Hari ini bukan hari kerja.';
    END IF;

    -- 8. Validasi Hari Libur
    IF public.is_holiday(v_local_date) THEN
        RAISE EXCEPTION 'Hari ini merupakan hari libur.';
    END IF;

    -- 9. Validasi Duplikasi Check-in
    IF EXISTS (
        SELECT 1
        FROM public.attendance
        WHERE employee_id = v_employee_id
          AND attendance_date = v_local_date
    ) THEN
        RAISE EXCEPTION 'Presensi masuk hari ini sudah tercatat.';
    END IF;

    -- 10. Validasi Jam Check-in
    IF v_local_time < v_schedule.check_in_start_time THEN
        RAISE EXCEPTION 'Check-in belum dibuka. Check-in dimulai pukul %.',
            TO_CHAR(v_schedule.check_in_start_time, 'HH24:MI');
    END IF;

    IF v_local_time > v_schedule.check_in_end_time THEN
        RAISE EXCEPTION 'Waktu check-in telah berakhir pada pukul %.',
            TO_CHAR(v_schedule.check_in_end_time, 'HH24:MI');
    END IF;

    -- 11. Tentukan Status Check-in (on_time vs late)
    IF v_local_time <= v_schedule.check_in_on_time_end THEN
        v_check_in_status := 'on_time';
    ELSE
        v_check_in_status := 'late';
    END IF;

    -- 12. Cari Titik Presensi Terdekat
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
        -- Haversine formula
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

    -- 13. Validasi Radius Lokasi
    IF v_best_location_id IS NULL THEN
        RAISE EXCEPTION 'Anda berada di luar radius seluruh titik presensi yang tersedia.';
    END IF;

    -- 14. Insert Transaksi Check-in
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
        v_now,
        v_now
    );

    -- 15. Return Hasil
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
-- 2. Function: public.check_out
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.check_out(user_latitude double precision, user_longitude double precision)
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
BEGIN
    -- 1. Validasi User
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Pengguna belum terautentikasi.';
    END IF;

    -- 2. Validasi Koordinat
    IF user_latitude IS NULL OR user_longitude IS NULL THEN
        RAISE EXCEPTION 'Koordinat lokasi wajib diisi.';
    END IF;

    IF user_latitude < -90 OR user_latitude > 90 THEN
        RAISE EXCEPTION 'Latitude tidak valid.';
    END IF;

    IF user_longitude < -180 OR user_longitude > 180 THEN
        RAISE EXCEPTION 'Longitude tidak valid.';
    END IF;

    -- 3. Resolve Employee
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

    -- 5. SERVER-SIDE ENFORCEMENT: Approved Request Check (Sick, Other/Izin, Official Duty, Leave)
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

    -- 6. Ambil Jadwal Aktif
    SELECT *
    INTO v_schedule
    FROM public.work_schedules
    WHERE is_active = true
    ORDER BY created_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Jadwal kerja aktif belum tersedia.';
    END IF;

    -- 7. Validasi Hari Kerja
    IF NOT (v_day_name = ANY(v_schedule.working_days)) THEN
        RAISE EXCEPTION 'Hari ini bukan hari kerja.';
    END IF;

    -- 8. Validasi Hari Libur
    IF public.is_holiday(v_local_date) THEN
        RAISE EXCEPTION 'Hari ini merupakan hari libur.';
    END IF;

    -- 9. Ambil Presensi Hari Ini
    SELECT *
    INTO v_attendance
    FROM public.attendance AS a
    WHERE a.employee_id = v_employee_id
      AND a.attendance_date = v_local_date
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Anda belum melakukan check-in hari ini.';
    END IF;

    -- 10. Cek Check-out Sudah Ada
    IF v_attendance.check_out_at IS NOT NULL THEN
        RAISE EXCEPTION 'Anda sudah melakukan check-out hari ini.';
    END IF;

    -- 11. Validasi Jam Check-out
    IF v_local_time < v_schedule.check_out_start_time THEN
        RAISE EXCEPTION 'Check-out belum dibuka. Check-out dimulai pukul %.',
            TO_CHAR(v_schedule.check_out_start_time, 'HH24:MI');
    END IF;

    IF v_local_time > v_schedule.check_out_end_time THEN
        RAISE EXCEPTION 'Waktu check-out sudah ditutup pada pukul %.',
            TO_CHAR(v_schedule.check_out_end_time, 'HH24:MI');
    END IF;

    -- 12. Tentukan Status Check-out
    IF v_local_time <= v_schedule.work_end_time THEN
        v_check_out_status := 'operational';
    ELSE
        v_check_out_status := 'after_work';
    END IF;

    -- 13. Validasi Check-out >= Check-in
    IF v_attendance.check_in_at IS NULL THEN
        RAISE EXCEPTION 'Data check-in tidak ditemukan.';
    END IF;

    IF v_now < v_attendance.check_in_at THEN
        RAISE EXCEPTION 'Waktu check-out tidak boleh lebih awal dari check-in.';
    END IF;

    -- 14. Cari Titik Presensi Terdekat
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
        -- Haversine formula
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

    -- 15. Validasi Titik
    IF v_best_location_id IS NULL THEN
        RAISE EXCEPTION 'Anda berada di luar radius seluruh titik presensi yang tersedia.';
    END IF;

    -- 16. Update Check-out
    UPDATE public.attendance AS a
    SET
        check_out_at = v_now,
        check_out_status = v_check_out_status,
        check_out_location_id = v_best_location_id,
        check_out_latitude = user_latitude,
        check_out_longitude = user_longitude,
        updated_at = NOW()
    WHERE a.id = v_attendance.id
      AND a.employee_id = v_employee_id
      AND a.check_out_at IS NULL;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Check-out gagal. Data presensi mungkin sudah diperbarui.';
    END IF;

    -- 17. Return Hasil
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
