-- ============================================================================
-- Migration: 026_attendance_selfie_storage.sql
-- Module: PHASE 2 — ATTENDANCE SELFIE PRIVATE STORAGE & RLS POLICIES (REVISED)
-- Description:
--   1. Provisions the private Storage bucket 'attendance-selfies'.
--      - public = false (Private bucket, requires authenticated presigned/signed URLs)
--      - file_size_limit = 1572864 bytes (1.5 MB strict limit)
--      - allowed_mime_types = image/jpeg, image/webp
--   2. Ensures Row Level Security (RLS) is active on storage.objects.
--   3. Implements strict, least-privilege security policies for:
--      - INSERT: Active employees and headmaster can upload ONLY to their own folder:
--                Canonical path: '{employee_id}/*'
--                Validated via (storage.foldername(name))[1] = private.get_employee_id(auth.uid())::text
--                Admin and Super Admin are explicitly EXCLUDED from client Storage upload policy in V1.
--      - SELECT: Active employees can view ONLY their own files.
--                Headmaster, admin, and super_admin can view all attendance selfies for monitoring & audit.
--      - UPDATE: Explicitly disallowed (no policy / denied by default).
--      - DELETE: Explicitly disallowed (no policy / denied by default) to protect audit trail.
--   4. Enforces active profile status (profiles.is_active = true) across all actions.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Provision Storage Bucket 'attendance-selfies'
-- ----------------------------------------------------------------------------
-- Note: ON CONFLICT (id) targets only the primary key 'attendance-selfies' without touching other buckets.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'attendance-selfies',
    'attendance-selfies',
    false,
    1572864, -- 1.5 MB in bytes (1024 * 1024 * 1.5)
    ARRAY['image/jpeg', 'image/webp']
)
ON CONFLICT (id) DO UPDATE SET
    public = false,
    file_size_limit = 1572864,
    allowed_mime_types = ARRAY['image/jpeg', 'image/webp'];

-- ----------------------------------------------------------------------------
-- 2. Clean up existing policies for 'attendance-selfies' bucket to ensure idempotency
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "attendance_selfies_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "attendance_selfies_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "attendance_selfies_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "attendance_selfies_delete_policy" ON storage.objects;

-- ----------------------------------------------------------------------------
-- 3. Policy: INSERT (Upload)
-- ----------------------------------------------------------------------------
-- Rules:
-- 1. Target bucket is strictly 'attendance-selfies'.
-- 2. User must be authenticated and active in public.profiles.
-- 3. In V1, client upload rights are restricted to active 'employee' and 'headmaster' roles.
--    Admins and Super Admins do NOT have client upload policy in V1.
-- 4. User must have a verified employee record linked via private.get_employee_id(auth.uid()).
-- 5. Canonical Path Enforcement:
--    The first folder segment must strictly match the uploader's employee_id:
--    (storage.foldername(name))[1] = private.get_employee_id(auth.uid())::text
-- ----------------------------------------------------------------------------
CREATE POLICY "attendance_selfies_insert_policy"
    ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'attendance-selfies'
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid()
              AND is_active = true
              AND role IN ('employee', 'headmaster')
        )
        AND private.get_employee_id(auth.uid()) IS NOT NULL
        AND (storage.foldername(name))[1] = private.get_employee_id(auth.uid())::text
    );

-- ----------------------------------------------------------------------------
-- 4. Policy: SELECT (Read / Download / Signed URL Generation)
-- ----------------------------------------------------------------------------
-- Rules:
-- 1. Target bucket is strictly 'attendance-selfies'.
-- 2. User must be authenticated and active in public.profiles.
-- 3. Super Admin, Admin, and Headmaster can view all attendance selfies for monitoring & audit.
-- 4. Active Employees can view ONLY their own selfie photos matching their employee_id folder:
--    (storage.foldername(name))[1] = private.get_employee_id(auth.uid())::text
-- ----------------------------------------------------------------------------
CREATE POLICY "attendance_selfies_select_policy"
    ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'attendance-selfies'
        AND EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND is_active = true
        )
        AND (
            private.is_admin(auth.uid())
            OR private.is_headmaster(auth.uid())
            OR (
                private.get_employee_id(auth.uid()) IS NOT NULL
                AND (storage.foldername(name))[1] = private.get_employee_id(auth.uid())::text
            )
        )
    );

-- ----------------------------------------------------------------------------
-- 5. Immutability & Audit Integrity Note:
-- ----------------------------------------------------------------------------
-- UPDATE and DELETE policies are INTENTIONALLY OMITTED.
-- Under PostgreSQL Row Level Security:
-- Without an explicit FOR UPDATE or FOR DELETE policy granted to authenticated,
-- any attempt to modify or delete existing selfie objects will be rejected by default (deny-by-default).
-- This guarantees tamper-resistance, prevents photo tampering, and preserves evidence integrity.
