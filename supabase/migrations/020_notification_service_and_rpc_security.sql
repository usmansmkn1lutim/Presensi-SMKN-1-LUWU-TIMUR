-- ============================================================================
-- Migration: 020_notification_service_and_rpc_security.sql
-- Module: PHASE 8C — NOTIFICATION SERVICE & RPC SECURITY
-- Description:
--   1. Creates trusted SECURITY DEFINER RPC public.create_notification():
--        - Strict role authorization (super_admin, admin, headmaster, or internal callers).
--        - Ordinary employees CANNOT inject arbitrary notifications to other users.
--        - Validates recipient existence in auth.users and active profile status.
--        - Enforces strict notification type whitelist.
--        - Enforces title & message trimming and length constraints.
--        - Validates metadata as a JSONB object.
--        - Built-in idempotency protection via metadata->>'idempotency_key'.
--        - Structured audit logging for administrative system announcements.
--   2. Enforces minimal execution privileges (REVOKE anon/PUBLIC, GRANT authenticated).
--   3. Maintains strict direct INSERT/UPDATE/DELETE protection on public.notifications table.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. RPC: public.create_notification
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_notification(
    p_recipient_user_id UUID,
    p_notification_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_related_entity_type TEXT DEFAULT NULL,
    p_related_entity_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
#variable_conflict use_column
DECLARE
    v_caller_id UUID := auth.uid();
    v_caller_role TEXT;
    v_caller_email TEXT;
    v_is_active BOOLEAN := false;
    v_recipient_exists BOOLEAN := false;
    v_recipient_active BOOLEAN := false;
    v_trimmed_title TEXT;
    v_trimmed_message TEXT;
    v_trimmed_type TEXT;
    v_clean_metadata JSONB;
    v_idempotency_key TEXT;
    v_existing_id UUID;
    v_existing_record RECORD;
    v_new_notification RECORD;
BEGIN
    -- =========================================================================
    -- 1. AUTHENTICATION & CALLER AUTHORIZATION
    -- =========================================================================
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Otentikasi diperlukan untuk membuat notifikasi.'
            USING ERRCODE = '42501';
    END IF;

    -- Fetch caller profile and verify active administrative / managerial role
    SELECT role::text, is_active 
    INTO v_caller_role, v_is_active
    FROM public.profiles
    WHERE id = v_caller_id;

    IF NOT FOUND OR v_is_active IS NOT TRUE THEN
        RAISE EXCEPTION 'Akun Anda tidak aktif atau tidak ditemukan.'
            USING ERRCODE = '42501';
    END IF;

    -- Only active super_admin, admin, and headmaster can call generic create_notification
    -- Ordinary employee roles are strictly forbidden from arbitrary notification injection
    IF v_caller_role NOT IN ('super_admin', 'admin', 'headmaster') THEN
        RAISE EXCEPTION 'Akses ditolak. Pengguna dengan peran % tidak diizinkan membuat notifikasi secara langsung.', v_caller_role
            USING ERRCODE = '42501';
    END IF;

    -- =========================================================================
    -- 2. RECIPIENT VALIDATION
    -- =========================================================================
    IF p_recipient_user_id IS NULL THEN
        RAISE EXCEPTION 'ID pengguna penerima (recipient_user_id) wajib diisi.'
            USING ERRCODE = '22023';
    END IF;

    -- Verify recipient exists in auth.users and public.profiles
    SELECT EXISTS (
        SELECT 1 FROM auth.users u
        JOIN public.profiles p ON p.id = u.id
        WHERE u.id = p_recipient_user_id
    ), 
    COALESCE((
        SELECT p.is_active FROM public.profiles p WHERE p.id = p_recipient_user_id
    ), false)
    INTO v_recipient_exists, v_recipient_active;

    IF NOT v_recipient_exists THEN
        RAISE EXCEPTION 'Pengguna penerima notifikasi tidak ditemukan di sistem.'
            USING ERRCODE = '22023';
    END IF;

    IF NOT v_recipient_active THEN
        RAISE EXCEPTION 'Pengguna penerima notifikasi berstatus non-aktif.'
            USING ERRCODE = '22023';
    END IF;

    -- =========================================================================
    -- 3. NOTIFICATION TYPE VALIDATION
    -- =========================================================================
    v_trimmed_type := lower(trim(COALESCE(p_notification_type, '')));
    IF v_trimmed_type = '' THEN
        RAISE EXCEPTION 'Jenis notifikasi (notification_type) tidak boleh kosong.'
            USING ERRCODE = '22023';
    END IF;

    -- Recognized application notification types whitelist
    IF v_trimmed_type NOT IN (
        'request_submitted',
        'request_approved',
        'request_rejected',
        'request_cancelled',
        'attendance_checkin',
        'attendance_late',
        'attendance_checkout',
        'account_linked',
        'account_unlinked',
        'role_updated',
        'system_announcement',
        'system_alert'
    ) THEN
        RAISE EXCEPTION 'Jenis notifikasi "%" tidak valid atau tidak didukung oleh sistem.', v_trimmed_type
            USING ERRCODE = '22023';
    END IF;

    -- =========================================================================
    -- 4. TITLE & MESSAGE VALIDATION
    -- =========================================================================
    v_trimmed_title := trim(COALESCE(p_title, ''));
    IF length(v_trimmed_title) < 2 THEN
        RAISE EXCEPTION 'Judul notifikasi minimal harus 2 karakter.'
            USING ERRCODE = '22023';
    END IF;
    IF length(v_trimmed_title) > 200 THEN
        RAISE EXCEPTION 'Judul notifikasi tidak boleh melebihi 200 karakter.'
            USING ERRCODE = '22023';
    END IF;

    v_trimmed_message := trim(COALESCE(p_message, ''));
    IF length(v_trimmed_message) < 2 THEN
        RAISE EXCEPTION 'Isi pesan notifikasi minimal harus 2 karakter.'
            USING ERRCODE = '22023';
    END IF;
    IF length(v_trimmed_message) > 2000 THEN
        RAISE EXCEPTION 'Isi pesan notifikasi tidak boleh melebihi 2000 karakter.'
            USING ERRCODE = '22023';
    END IF;

    -- =========================================================================
    -- 5. METADATA VALIDATION
    -- =========================================================================
    IF p_metadata IS NULL THEN
        v_clean_metadata := '{}'::jsonb;
    ELSE
        IF jsonb_typeof(p_metadata) != 'object' THEN
            RAISE EXCEPTION 'Metadata notifikasi harus berupa JSON object yang valid.'
                USING ERRCODE = '22023';
        END IF;
        v_clean_metadata := p_metadata;
    END IF;

    -- =========================================================================
    -- 6. RELATED ENTITY VALIDATION
    -- =========================================================================
    IF p_related_entity_type IS NOT NULL AND trim(p_related_entity_type) != '' THEN
        IF lower(trim(p_related_entity_type)) NOT IN ('request', 'attendance', 'employee', 'profile', 'location', 'system', 'announcement') THEN
            RAISE EXCEPTION 'Tipe entitas terkait "%" tidak valid.', p_related_entity_type
                USING ERRCODE = '22023';
        END IF;
    END IF;

    -- =========================================================================
    -- 7. IDEMPOTENCY / DEDUPLICATION CHECK
    -- =========================================================================
    v_idempotency_key := v_clean_metadata->>'idempotency_key';
    IF v_idempotency_key IS NOT NULL AND trim(v_idempotency_key) != '' THEN
        SELECT id, recipient_user_id, notification_type, title, message, 
               related_entity_type, related_entity_id, metadata, is_read, read_at, created_at
        INTO v_existing_record
        FROM public.notifications
        WHERE recipient_user_id = p_recipient_user_id
          AND notification_type = v_trimmed_type
          AND metadata->>'idempotency_key' = trim(v_idempotency_key)
          AND created_at > (now() - interval '24 hours')
        ORDER BY created_at DESC
        LIMIT 1;

        IF FOUND THEN
            -- Return existing notification gracefully without duplicate insertion
            RETURN jsonb_build_object(
                'success', true,
                'is_duplicate', true,
                'notification', jsonb_build_object(
                    'id', v_existing_record.id,
                    'recipient_user_id', v_existing_record.recipient_user_id,
                    'notification_type', v_existing_record.notification_type,
                    'title', v_existing_record.title,
                    'message', v_existing_record.message,
                    'related_entity_type', v_existing_record.related_entity_type,
                    'related_entity_id', v_existing_record.related_entity_id,
                    'metadata', v_existing_record.metadata,
                    'is_read', v_existing_record.is_read,
                    'read_at', v_existing_record.read_at,
                    'created_at', v_existing_record.created_at
                )
            );
        END IF;
    END IF;

    -- =========================================================================
    -- 8. ATOMIC INSERTION
    -- =========================================================================
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
        p_recipient_user_id,
        v_trimmed_type,
        v_trimmed_title,
        v_trimmed_message,
        NULLIF(trim(p_related_entity_type), ''),
        p_related_entity_id,
        v_clean_metadata,
        false,
        NULL,
        now()
    )
    RETURNING * INTO v_new_notification;

    -- =========================================================================
    -- 9. AUDIT LOGGING FOR ADMINISTRATIVE BROADCASTS / SYSTEM ALERTS
    -- =========================================================================
    IF v_trimmed_type IN ('system_announcement', 'system_alert') THEN
        SELECT email INTO v_caller_email FROM auth.users WHERE id = v_caller_id;

        INSERT INTO public.audit_logs (
            actor_user_id,
            actor_email,
            actor_role,
            action,
            target_type,
            target_id,
            reason,
            metadata,
            created_at
        ) VALUES (
            v_caller_id,
            v_caller_email,
            v_caller_role,
            'DISPATCH_SYSTEM_NOTIFICATION',
            'notification',
            v_new_notification.id::text,
            'Pengiriman notifikasi sistem/pengumuman oleh administrator',
            jsonb_build_object(
                'recipient_user_id', p_recipient_user_id,
                'notification_type', v_trimmed_type,
                'title', v_trimmed_title
            ),
            now()
        );
    END IF;

    -- =========================================================================
    -- 10. RETURN STRUCTURED SUCCESS RESPONSE
    -- =========================================================================
    RETURN jsonb_build_object(
        'success', true,
        'is_duplicate', false,
        'notification', jsonb_build_object(
            'id', v_new_notification.id,
            'recipient_user_id', v_new_notification.recipient_user_id,
            'notification_type', v_new_notification.notification_type,
            'title', v_new_notification.title,
            'message', v_new_notification.message,
            'related_entity_type', v_new_notification.related_entity_type,
            'related_entity_id', v_new_notification.related_entity_id,
            'metadata', v_new_notification.metadata,
            'is_read', v_new_notification.is_read,
            'read_at', v_new_notification.read_at,
            'created_at', v_new_notification.created_at
        )
    );
END;
$$;

-- ----------------------------------------------------------------------------
-- 2. Privileges & Execution Grants
-- ----------------------------------------------------------------------------
REVOKE ALL ON FUNCTION public.create_notification(UUID, TEXT, TEXT, TEXT, TEXT, UUID, JSONB) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_notification(UUID, TEXT, TEXT, TEXT, TEXT, UUID, JSONB) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_notification(UUID, TEXT, TEXT, TEXT, TEXT, UUID, JSONB) TO authenticated;

-- Migration 020 completed.
