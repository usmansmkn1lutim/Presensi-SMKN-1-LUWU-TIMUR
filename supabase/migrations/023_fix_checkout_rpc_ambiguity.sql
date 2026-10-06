-- ============================================================================
-- Migration: 023_fix_checkout_rpc_ambiguity.sql
-- Module: ATTENDANCE CHECK-OUT RPC FIX
-- Description:
--   Resolves PostgreSQL error 42702 (column reference "attendance_date" is ambiguous)
--   in public.check_out by using explicit table alias `a` on public.attendance
--   in both the SELECT (attendance lookup) and UPDATE (checkout update) statements.
--   Preserves all function signatures, business rules, return columns, and security configurations.
-- ============================================================================

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
    v_attendance RECORD;
    v_location RECORD;

    v_distance DOUBLE PRECISION;
    v_best_distance DOUBLE PRECISION := NULL;
    v_best_location_id UUID := NULL;
    v_best_location_name TEXT := NULL;

    v_check_out_status TEXT;
BEGIN
    -- =====================================================
    -- 1. VALIDASI USER
    -- =====================================================

    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Pengguna belum terautentikasi.';
    END IF;


    -- =====================================================
    -- 2. VALIDASI KOORDINAT
    -- =====================================================

    IF user_latitude IS NULL
       OR user_longitude IS NULL THEN
        RAISE EXCEPTION 'Koordinat lokasi wajib diisi.';
    END IF;

    IF user_latitude < -90
       OR user_latitude > 90 THEN
        RAISE EXCEPTION 'Latitude tidak valid.';
    END IF;

    IF user_longitude < -180
       OR user_longitude > 180 THEN
        RAISE EXCEPTION 'Longitude tidak valid.';
    END IF;


    -- =====================================================
    -- 3. RESOLVE EMPLOYEE
    -- =====================================================

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


    -- =====================================================
    -- 4. SERVER TIME — ASIA/MAKASSAR
    -- =====================================================

    v_now := NOW();
    v_local_date := (v_now AT TIME ZONE 'Asia/Makassar')::DATE;
    v_local_time := (v_now AT TIME ZONE 'Asia/Makassar')::TIME;

    v_day_name :=
        TRIM(
            LOWER(
                TO_CHAR(
                    v_local_date,
                    'Day'
                )
            )
        );


    -- =====================================================
    -- 5. AMBIL JADWAL AKTIF
    -- =====================================================

    SELECT *
    INTO v_schedule
    FROM public.work_schedules
    WHERE is_active = true
    ORDER BY created_at DESC
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Jadwal kerja aktif belum tersedia.';
    END IF;


    -- =====================================================
    -- 6. VALIDASI HARI KERJA
    -- =====================================================

    IF NOT (
        v_day_name = ANY(v_schedule.working_days)
    ) THEN
        RAISE EXCEPTION 'Hari ini bukan hari kerja.';
    END IF;


    -- =====================================================
    -- 7. VALIDASI HARI LIBUR
    -- =====================================================

    IF public.is_holiday(v_local_date) THEN
        RAISE EXCEPTION 'Hari ini merupakan hari libur.';
    END IF;


    -- =====================================================
    -- 8. AMBIL PRESENSI HARI INI
    -- =====================================================

    SELECT *
    INTO v_attendance
    FROM public.attendance AS a
    WHERE a.employee_id = v_employee_id
      AND a.attendance_date = v_local_date
    LIMIT 1;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Anda belum melakukan check-in hari ini.';
    END IF;


    -- =====================================================
    -- 9. CEK CHECK-OUT SUDAH ADA
    -- =====================================================

    IF v_attendance.check_out_at IS NOT NULL THEN
        RAISE EXCEPTION 'Anda sudah melakukan check-out hari ini.';
    END IF;


    -- =====================================================
    -- 10. VALIDASI JAM CHECK-OUT
    -- =====================================================

    IF v_local_time < v_schedule.check_out_start_time THEN
        RAISE EXCEPTION
            'Check-out belum dibuka. Check-out dimulai pukul %.',
            TO_CHAR(
                v_schedule.check_out_start_time,
                'HH24:MI'
            );
    END IF;

    IF v_local_time > v_schedule.check_out_end_time THEN
        RAISE EXCEPTION
            'Waktu check-out sudah ditutup pada pukul %.',
            TO_CHAR(
                v_schedule.check_out_end_time,
                'HH24:MI'
            );
    END IF;


    -- =====================================================
    -- 11. TENTUKAN STATUS CHECK-OUT
    -- =====================================================

    IF v_local_time <= v_schedule.work_end_time THEN
        v_check_out_status := 'operational';
    ELSE
        v_check_out_status := 'after_work';
    END IF;


    -- =====================================================
    -- 12. VALIDASI CHECK-OUT >= CHECK-IN
    -- =====================================================

    IF v_attendance.check_in_at IS NULL THEN
        RAISE EXCEPTION 'Data check-in tidak ditemukan.';
    END IF;

    IF v_now < v_attendance.check_in_at THEN
        RAISE EXCEPTION
            'Waktu check-out tidak boleh lebih awal dari check-in.';
    END IF;


    -- =====================================================
    -- 13. CARI TITIK PRESENSI TERDEKAT
    -- =====================================================

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
                    POWER(
                        SIN(
                            RADIANS(
                                v_location.latitude - user_latitude
                            ) / 2.0
                        ),
                        2
                    )
                    +
                    COS(RADIANS(user_latitude))
                    *
                    COS(RADIANS(v_location.latitude))
                    *
                    POWER(
                        SIN(
                            RADIANS(
                                v_location.longitude - user_longitude
                            ) / 2.0
                        ),
                        2
                    )
                )
            );

        IF v_distance <= v_location.radius_meters THEN

            IF v_best_distance IS NULL
               OR v_distance < v_best_distance THEN

                v_best_distance := v_distance;
                v_best_location_id := v_location.id;
                v_best_location_name := v_location.name;

            END IF;

        END IF;

    END LOOP;


    -- =====================================================
    -- 14. TIDAK ADA TITIK VALID
    -- =====================================================

    IF v_best_location_id IS NULL THEN
        RAISE EXCEPTION
            'Anda berada di luar radius seluruh titik presensi yang tersedia.';
    END IF;


    -- =====================================================
    -- 15. UPDATE CHECK-OUT
    -- =====================================================

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
        RAISE EXCEPTION
            'Check-out gagal. Data presensi mungkin sudah diperbarui.';
    END IF;


    -- =====================================================
    -- 16. RETURN HASIL
    -- =====================================================

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
