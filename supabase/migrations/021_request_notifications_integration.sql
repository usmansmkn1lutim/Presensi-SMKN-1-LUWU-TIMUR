-- ============================================================================
-- Migration: 021_request_notifications_integration.sql
-- Module: PHASE 8E — NOTIFICATION BUSINESS EVENTS INTEGRATION
-- Description:
--   1. Integrates server-side in-app notifications into Request business events:
--        - create_my_request: dispatches 'request_submitted' notifications to active reviewers (super_admin, admin, headmaster).
--        - approve_request: dispatches 'request_approved' notification to the request owner.
--        - reject_request: dispatches 'request_rejected' notification to the request owner with reviewer note.
--        - cancel_my_request: dispatches 'request_cancelled' notifications to active reviewers.
--   2. Enforces Server-Side Recipient Resolution:
--        - No user can supply or tamper with recipient IDs.
--        - Recipients are determined strictly via profile roles & employee relationships.
--   3. Transaction & Side-Effect Safety:
--        - Notification creation is isolated so notification edge cases never roll back valid business decisions.
--        - Handles deleted / unlinked employee profiles (ON DELETE SET NULL) safely without runtime crash.
--        - Incorporates idempotency keys in metadata to prevent duplicate alerts.
--   4. Attendance Notification Policy:
--        - Normal check-in/check-out notifications are intentionally deferred to avoid notification spam and database bloat.
-- ============================================================================

-- Helper: Convert request_type code to user-friendly Indonesian label
CREATE OR REPLACE FUNCTION private.get_request_type_label(p_type TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
    SELECT CASE lower(trim(p_type))
        WHEN 'leave' THEN 'Cuti'
        WHEN 'sick' THEN 'Izin Sakit'
        WHEN 'official_duty' THEN 'Tugas Luar / Dinas'
        WHEN 'other' THEN 'Izin Lainnya'
        ELSE 'Pengajuan'
    END;
$$;

-- ----------------------------------------------------------------------------
-- 1. RPC: create_my_request (Updated with Reviewer Notification Side-Effect)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_my_request(
    p_request_type TEXT,
    p_start_date DATE,
    p_end_date DATE,
    p_reason TEXT,
    p_attachment_url TEXT DEFAULT NULL
)
RETURNS public.requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
#variable_conflict use_column
DECLARE
    v_user_id UUID := auth.uid();
    v_employee_id UUID;
    v_employee_name TEXT;
    v_new_request public.requests;
    v_type_label TEXT;
    v_reviewer_rec RECORD;
    v_idempotency_key TEXT;
    v_msg TEXT;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Pengguna belum terautentikasi.';
    END IF;

    -- Verify active profile
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id AND is_active = true) THEN
        RAISE EXCEPTION 'Akun Anda sedang tidak aktif.';
    END IF;

    -- Resolve employee_id from auth.uid()
    v_employee_id := private.get_employee_id(v_user_id);
    IF v_employee_id IS NULL THEN
        RAISE EXCEPTION 'Akun Anda belum terhubung dengan data pegawai.';
    END IF;

    -- Fetch employee name snapshot
    SELECT name INTO v_employee_name FROM public.employees WHERE id = v_employee_id;
    IF v_employee_name IS NULL THEN
        v_employee_name := 'Pegawai';
    END IF;

    -- Insert request record atomically
    INSERT INTO public.requests (
        employee_id,
        employee_name_snapshot,
        request_type,
        start_date,
        end_date,
        reason,
        attachment_url,
        status,
        submitted_at
    ) VALUES (
        v_employee_id,
        v_employee_name,
        p_request_type,
        p_start_date,
        p_end_date,
        trim(p_reason),
        p_attachment_url,
        'pending',
        now()
    )
    RETURNING * INTO v_new_request;

    -- SIDE EFFECT: Dispatch notification to active reviewers (Admin, Super Admin, Headmaster)
    BEGIN
        v_type_label := private.get_request_type_label(p_request_type);
        v_msg := format(
            'Pegawai %s telah mengajukan %s (%s s.d. %s). Memerlukan peninjauan dan persetujuan.',
            v_employee_name,
            v_type_label,
            to_char(p_start_date, 'DD/MM/YYYY'),
            to_char(p_end_date, 'DD/MM/YYYY')
        );

        FOR v_reviewer_rec IN
            SELECT p.id AS reviewer_user_id
            FROM public.profiles p
            WHERE p.role IN ('super_admin', 'admin', 'headmaster')
              AND p.is_active = true
              AND p.id != v_user_id
        LOOP
            v_idempotency_key := format('req_sub_%s_%s', v_new_request.id, v_reviewer_rec.reviewer_user_id);

            -- Avoid duplicate notification if already sent
            IF NOT EXISTS (
                SELECT 1 FROM public.notifications n
                WHERE n.recipient_user_id = v_reviewer_rec.reviewer_user_id
                  AND n.metadata->>'idempotency_key' = v_idempotency_key
            ) THEN
                INSERT INTO public.notifications (
                    recipient_user_id,
                    notification_type,
                    title,
                    message,
                    related_entity_type,
                    related_entity_id,
                    metadata,
                    is_read,
                    read_at,
                    created_at
                ) VALUES (
                    v_reviewer_rec.reviewer_user_id,
                    'request_submitted',
                    'Pengajuan Izin/Cuti Baru',
                    v_msg,
                    'request',
                    v_new_request.id,
                    jsonb_build_object(
                        'idempotency_key', v_idempotency_key,
                        'request_id', v_new_request.id,
                        'request_type', p_request_type,
                        'employee_name', v_employee_name
                    ),
                    false,
                    NULL,
                    now()
                );
            END IF;
        END LOOP;
    EXCEPTION WHEN OTHERS THEN
        -- Prevent notification errors from aborting the primary request submission
        RAISE WARNING 'Notification dispatch for request % failed: %', v_new_request.id, SQLERRM;
    END;

    RETURN v_new_request;
END;
$$;

-- ----------------------------------------------------------------------------
-- 2. RPC: approve_request (Updated with Owner Notification Side-Effect)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.approve_request(
    p_request_id UUID,
    p_reviewer_note TEXT DEFAULT NULL
)
RETURNS public.requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
#variable_conflict use_column
DECLARE
    v_user_id UUID := auth.uid();
    v_request public.requests;
    v_owner_user_id UUID;
    v_owner_active BOOLEAN;
    v_type_label TEXT;
    v_idempotency_key TEXT;
    v_msg TEXT;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Pengguna belum terautentikasi.';
    END IF;

    -- Check authorization: active admin, super_admin, or headmaster
    IF NOT (private.is_admin(v_user_id) OR private.is_headmaster(v_user_id)) THEN
        RAISE EXCEPTION 'Anda tidak memiliki hak akses untuk menyetujui pengajuan.';
    END IF;

    -- Fetch request
    SELECT * INTO v_request
    FROM public.requests
    WHERE id = p_request_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pengajuan tidak ditemukan.';
    END IF;

    IF v_request.status != 'pending' THEN
        RAISE EXCEPTION 'Hanya pengajuan dengan status pending yang dapat disetujui.';
    END IF;

    -- Perform approval atomically
    UPDATE public.requests
    SET status = 'approved',
        reviewed_at = now(),
        reviewed_by = v_user_id,
        reviewer_note = NULLIF(trim(p_reviewer_note), ''),
        updated_at = now()
    WHERE id = p_request_id
    RETURNING * INTO v_request;

    -- SIDE EFFECT: Dispatch notification to request owner
    BEGIN
        -- Resolve employee's profile/user_id
        SELECT e.profile_id, p.is_active
        INTO v_owner_user_id, v_owner_active
        FROM public.employees e
        LEFT JOIN public.profiles p ON p.id = e.profile_id
        WHERE e.id = v_request.employee_id;

        IF v_owner_user_id IS NOT NULL AND v_owner_active IS TRUE THEN
            v_type_label := private.get_request_type_label(v_request.request_type);
            v_idempotency_key := format('req_app_%s', v_request.id);

            v_msg := format(
                'Pengajuan %s Anda untuk tanggal %s s.d. %s telah DISETUJUI.',
                v_type_label,
                to_char(v_request.start_date, 'DD/MM/YYYY'),
                to_char(v_request.end_date, 'DD/MM/YYYY')
            );
            IF p_reviewer_note IS NOT NULL AND length(trim(p_reviewer_note)) > 0 THEN
                v_msg := v_msg || format(' Catatan: %s', trim(p_reviewer_note));
            END IF;

            IF NOT EXISTS (
                SELECT 1 FROM public.notifications n
                WHERE n.recipient_user_id = v_owner_user_id
                  AND n.metadata->>'idempotency_key' = v_idempotency_key
            ) THEN
                INSERT INTO public.notifications (
                    recipient_user_id,
                    notification_type,
                    title,
                    message,
                    related_entity_type,
                    related_entity_id,
                    metadata,
                    is_read,
                    read_at,
                    created_at
                ) VALUES (
                    v_owner_user_id,
                    'request_approved',
                    'Pengajuan Izin/Cuti Disetujui',
                    v_msg,
                    'request',
                    v_request.id,
                    jsonb_build_object(
                        'idempotency_key', v_idempotency_key,
                        'request_id', v_request.id,
                        'request_type', v_request.request_type,
                        'status', 'approved'
                    ),
                    false,
                    NULL,
                    now()
                );
            END IF;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Notification dispatch for approval of request % failed: %', v_request.id, SQLERRM;
    END;

    RETURN v_request;
END;
$$;

-- ----------------------------------------------------------------------------
-- 3. RPC: reject_request (Updated with Owner Notification Side-Effect)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.reject_request(
    p_request_id UUID,
    p_reviewer_note TEXT DEFAULT NULL
)
RETURNS public.requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
#variable_conflict use_column
DECLARE
    v_user_id UUID := auth.uid();
    v_request public.requests;
    v_owner_user_id UUID;
    v_owner_active BOOLEAN;
    v_type_label TEXT;
    v_idempotency_key TEXT;
    v_msg TEXT;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Pengguna belum terautentikasi.';
    END IF;

    -- Check authorization: active admin, super_admin, or headmaster
    IF NOT (private.is_admin(v_user_id) OR private.is_headmaster(v_user_id)) THEN
        RAISE EXCEPTION 'Anda tidak memiliki hak akses untuk menolak pengajuan.';
    END IF;

    -- Fetch request
    SELECT * INTO v_request
    FROM public.requests
    WHERE id = p_request_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pengajuan tidak ditemukan.';
    END IF;

    IF v_request.status != 'pending' THEN
        RAISE EXCEPTION 'Hanya pengajuan dengan status pending yang dapat ditolak.';
    END IF;

    -- Rejection requires a non-empty reviewer note
    IF p_reviewer_note IS NULL OR length(trim(p_reviewer_note)) = 0 THEN
        RAISE EXCEPTION 'Catatan penolakan wajib diisi.';
    END IF;

    -- Perform rejection atomically
    UPDATE public.requests
    SET status = 'rejected',
        reviewed_at = now(),
        reviewed_by = v_user_id,
        reviewer_note = trim(p_reviewer_note),
        updated_at = now()
    WHERE id = p_request_id
    RETURNING * INTO v_request;

    -- SIDE EFFECT: Dispatch notification to request owner
    BEGIN
        SELECT e.profile_id, p.is_active
        INTO v_owner_user_id, v_owner_active
        FROM public.employees e
        LEFT JOIN public.profiles p ON p.id = e.profile_id
        WHERE e.id = v_request.employee_id;

        IF v_owner_user_id IS NOT NULL AND v_owner_active IS TRUE THEN
            v_type_label := private.get_request_type_label(v_request.request_type);
            v_idempotency_key := format('req_rej_%s', v_request.id);

            v_msg := format(
                'Pengajuan %s Anda untuk tanggal %s s.d. %s telah DITOLAK. Alasan: %s',
                v_type_label,
                to_char(v_request.start_date, 'DD/MM/YYYY'),
                to_char(v_request.end_date, 'DD/MM/YYYY'),
                trim(p_reviewer_note)
            );

            IF NOT EXISTS (
                SELECT 1 FROM public.notifications n
                WHERE n.recipient_user_id = v_owner_user_id
                  AND n.metadata->>'idempotency_key' = v_idempotency_key
            ) THEN
                INSERT INTO public.notifications (
                    recipient_user_id,
                    notification_type,
                    title,
                    message,
                    related_entity_type,
                    related_entity_id,
                    metadata,
                    is_read,
                    read_at,
                    created_at
                ) VALUES (
                    v_owner_user_id,
                    'request_rejected',
                    'Pengajuan Izin/Cuti Ditolak',
                    v_msg,
                    'request',
                    v_request.id,
                    jsonb_build_object(
                        'idempotency_key', v_idempotency_key,
                        'request_id', v_request.id,
                        'request_type', v_request.request_type,
                        'status', 'rejected',
                        'reviewer_note', trim(p_reviewer_note)
                    ),
                    false,
                    NULL,
                    now()
                );
            END IF;
        END IF;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Notification dispatch for rejection of request % failed: %', v_request.id, SQLERRM;
    END;

    RETURN v_request;
END;
$$;

-- ----------------------------------------------------------------------------
-- 4. RPC: cancel_my_request (Updated with Reviewer Notification Side-Effect)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.cancel_my_request(
    p_request_id UUID
)
RETURNS public.requests
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
#variable_conflict use_column
DECLARE
    v_user_id UUID := auth.uid();
    v_employee_id UUID;
    v_employee_name TEXT;
    v_request public.requests;
    v_type_label TEXT;
    v_reviewer_rec RECORD;
    v_idempotency_key TEXT;
    v_msg TEXT;
BEGIN
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Pengguna belum terautentikasi.';
    END IF;

    -- Resolve employee_id from auth.uid()
    v_employee_id := private.get_employee_id(v_user_id);
    IF v_employee_id IS NULL THEN
        RAISE EXCEPTION 'Akun Anda belum terhubung dengan data pegawai.';
    END IF;

    -- Fetch existing request
    SELECT * INTO v_request
    FROM public.requests
    WHERE id = p_request_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Pengajuan tidak ditemukan.';
    END IF;

    -- Verify ownership
    IF v_request.employee_id != v_employee_id THEN
        RAISE EXCEPTION 'Anda hanya dapat membatalkan pengajuan milik sendiri.';
    END IF;

    -- Verify status is pending
    IF v_request.status != 'pending' THEN
        RAISE EXCEPTION 'Hanya pengajuan dengan status pending yang dapat dibatalkan.';
    END IF;

    -- Perform cancellation
    UPDATE public.requests
    SET status = 'cancelled',
        updated_at = now()
    WHERE id = p_request_id
    RETURNING * INTO v_request;

    -- SIDE EFFECT: Dispatch notification to reviewers informing about cancellation
    BEGIN
        SELECT name INTO v_employee_name FROM public.employees WHERE id = v_employee_id;
        IF v_employee_name IS NULL THEN
            v_employee_name := coalesce(v_request.employee_name_snapshot, 'Pegawai');
        END IF;

        v_type_label := private.get_request_type_label(v_request.request_type);
        v_msg := format(
            'Pegawai %s telah MEMBATALKAN pengajuan %s (%s s.d. %s).',
            v_employee_name,
            v_type_label,
            to_char(v_request.start_date, 'DD/MM/YYYY'),
            to_char(v_request.end_date, 'DD/MM/YYYY')
        );

        FOR v_reviewer_rec IN
            SELECT p.id AS reviewer_user_id
            FROM public.profiles p
            WHERE p.role IN ('super_admin', 'admin', 'headmaster')
              AND p.is_active = true
              AND p.id != v_user_id
        LOOP
            v_idempotency_key := format('req_can_%s_%s', v_request.id, v_reviewer_rec.reviewer_user_id);

            IF NOT EXISTS (
                SELECT 1 FROM public.notifications n
                WHERE n.recipient_user_id = v_reviewer_rec.reviewer_user_id
                  AND n.metadata->>'idempotency_key' = v_idempotency_key
            ) THEN
                INSERT INTO public.notifications (
                    recipient_user_id,
                    notification_type,
                    title,
                    message,
                    related_entity_type,
                    related_entity_id,
                    metadata,
                    is_read,
                    read_at,
                    created_at
                ) VALUES (
                    v_reviewer_rec.reviewer_user_id,
                    'request_cancelled',
                    'Pengajuan Dibatalkan Pegawai',
                    v_msg,
                    'request',
                    v_request.id,
                    jsonb_build_object(
                        'idempotency_key', v_idempotency_key,
                        'request_id', v_request.id,
                        'request_type', v_request.request_type,
                        'status', 'cancelled'
                    ),
                    false,
                    NULL,
                    now()
                );
            END IF;
        END LOOP;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'Notification dispatch for cancellation of request % failed: %', v_request.id, SQLERRM;
    END;

    RETURN v_request;
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. Execution Grants
-- ----------------------------------------------------------------------------
GRANT EXECUTE ON FUNCTION private.get_request_type_label(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_my_request(TEXT, DATE, DATE, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_my_request(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_request(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_request(UUID, TEXT) TO authenticated;

-- Migration 021 completed.
