
-- ============================================================================
-- Migration: 032_profile_photo_functions.sql
-- Purpose : Secure RPC functions for profile and employee photo references
-- Bucket  : profile-photos (private)
-- ============================================================================

-- ============================================================================
-- 1. UPDATE MY PROFILE PHOTO
-- Only active users without an employee link may update profiles.avatar_url.
-- Passing NULL clears the photo reference.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_my_profile_photo(
    p_photo_path text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private', 'storage', 'pg_temp'
AS $function$
DECLARE
    v_user_id uuid := auth.uid();
BEGIN
    -- Authentication
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Pengguna belum terautentikasi.';
    END IF;

    -- Active profile validation
    IF NOT EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = v_user_id
          AND p.is_active = true
    ) THEN
        RAISE EXCEPTION 'Akun tidak aktif atau tidak ditemukan.';
    END IF;

    -- Linked employees must use employees.photo_url
    IF private.get_employee_id(v_user_id) IS NOT NULL THEN
        RAISE EXCEPTION
            'Akun terhubung dengan data GTK. Gunakan foto GTK.';
    END IF;

    -- Validate profile photo path and Storage object
    IF p_photo_path IS NOT NULL THEN

        IF array_length(storage.foldername(p_photo_path), 1) IS DISTINCT FROM 2
           OR (storage.foldername(p_photo_path))[1] <> 'profiles'
           OR (storage.foldername(p_photo_path))[2] <> v_user_id::text
           OR storage.filename(p_photo_path) IS NULL
           OR storage.filename(p_photo_path) !~
              '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\.webp$'
        THEN
            RAISE EXCEPTION 'Path foto profil tidak valid.';
        END IF;

        IF NOT EXISTS (
            SELECT 1
            FROM storage.objects so
            WHERE so.bucket_id = 'profile-photos'
              AND so.name = p_photo_path
        ) THEN
            RAISE EXCEPTION 'File foto tidak ditemukan di Storage.';
        END IF;
    END IF;

    -- Update only the photo column
    UPDATE public.profiles
    SET avatar_url = p_photo_path
    WHERE id = v_user_id
      AND is_active = true;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Referensi foto akun berhasil diperbarui.',
        'photo_path', p_photo_path
    );
END;
$function$;


-- ============================================================================
-- 2. UPDATE EMPLOYEE PHOTO
-- Admin/Super Admin: may update any employee photo.
-- Headmaster/Employee: may update only their linked employee photo.
-- Passing NULL clears the photo reference.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_employee_photo(
    p_employee_id uuid,
    p_photo_path text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'private', 'storage', 'pg_temp'
AS $function$
DECLARE
    v_user_id uuid := auth.uid();
    v_employee_profile_id uuid;
    v_is_admin boolean;
BEGIN
    -- Authentication
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Pengguna belum terautentikasi.';
    END IF;

    -- Active profile validation
    IF NOT EXISTS (
        SELECT 1
        FROM public.profiles p
        WHERE p.id = v_user_id
          AND p.is_active = true
    ) THEN
        RAISE EXCEPTION 'Akun tidak aktif atau tidak ditemukan.';
    END IF;

    -- Validate employee ID
    IF p_employee_id IS NULL THEN
        RAISE EXCEPTION 'ID GTK wajib diisi.';
    END IF;

    -- Check target employee
    SELECT e.profile_id
    INTO v_employee_profile_id
    FROM public.employees e
    WHERE e.id = p_employee_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Data GTK tidak ditemukan.';
    END IF;

    -- Determine administrator permission
    v_is_admin := private.is_admin(v_user_id);

    -- Non-admin users may update only their linked employee photo
    IF NOT v_is_admin THEN

        IF NOT EXISTS (
            SELECT 1
            FROM public.profiles p
            WHERE p.id = v_user_id
              AND p.role::text IN ('employee', 'headmaster')
              AND p.is_active = true
        ) THEN
            RAISE EXCEPTION 'Akses ditolak.';
        END IF;

        IF v_employee_profile_id IS DISTINCT FROM v_user_id
           OR private.get_employee_id(v_user_id) IS DISTINCT FROM p_employee_id
        THEN
            RAISE EXCEPTION
                'Anda hanya dapat mengubah foto GTK milik sendiri.';
        END IF;
    END IF;

    -- Validate employee photo path and Storage object
    IF p_photo_path IS NOT NULL THEN

        IF array_length(storage.foldername(p_photo_path), 1) IS DISTINCT FROM 2
           OR (storage.foldername(p_photo_path))[1] <> 'employees'
           OR (storage.foldername(p_photo_path))[2] <> p_employee_id::text
           OR storage.filename(p_photo_path) IS NULL
           OR storage.filename(p_photo_path) !~
              '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\.webp$'
        THEN
            RAISE EXCEPTION 'Path foto GTK tidak valid.';
        END IF;

        IF NOT EXISTS (
            SELECT 1
            FROM storage.objects so
            WHERE so.bucket_id = 'profile-photos'
              AND so.name = p_photo_path
        ) THEN
            RAISE EXCEPTION 'File foto tidak ditemukan di Storage.';
        END IF;
    END IF;

    -- Update only the employee photo column
    UPDATE public.employees
    SET photo_url = p_photo_path
    WHERE id = p_employee_id;

    RETURN jsonb_build_object(
        'success', true,
        'message', 'Referensi foto GTK berhasil diperbarui.',
        'employee_id', p_employee_id,
        'photo_path', p_photo_path
    );
END;
$function$;


-- ============================================================================
-- 3. FUNCTION EXECUTION PRIVILEGES
-- Only authenticated application users and postgres may execute these RPCs.
-- ============================================================================

REVOKE ALL ON FUNCTION public.update_my_profile_photo(text)
FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.update_employee_photo(uuid, text)
FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.update_my_profile_photo(text)
TO authenticated, postgres;

GRANT EXECUTE ON FUNCTION public.update_employee_photo(uuid, text)
TO authenticated, postgres;


-- ============================================================================
-- END OF MIGRATION 032
-- ============================================================================
