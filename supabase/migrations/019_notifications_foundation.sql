-- ============================================================================
-- Migration: 019_notifications_foundation.sql
-- Module: PHASE 8B — DATABASE NOTIFICATION FOUNDATION
-- Description:
--   1. Creates public.notifications table for in-app user notifications.
--   2. Enforces data integrity:
--        - recipient_user_id FK to auth.users(id) ON DELETE CASCADE
--        - Non-empty title, message, and notification_type
--        - Read state consistency constraint (is_read vs read_at)
--   3. Sets up optimized composite indexes for inbox retrieval & unread counts.
--   4. Configures Row Level Security (RLS) policies:
--        - Own-recipient SELECT isolation (recipient_user_id = auth.uid())
--        - Strict protection against client-side arbitrary INSERT, UPDATE, DELETE
--   5. Creates atomic SECURITY DEFINER RPC functions:
--        - mark_notification_read(UUID)
--        - mark_all_notifications_read()
--        - get_unread_notification_count()
--   6. Configures minimal privilege execution grants (authenticated only).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. Table: public.notifications
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipient_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_type TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    related_entity_type TEXT NULL,
    related_entity_id UUID NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_read BOOLEAN NOT NULL DEFAULT false,
    read_at TIMESTAMPTZ NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

    -- Non-empty Title Constraint
    CONSTRAINT notifications_title_not_empty_check 
        CHECK (length(trim(title)) > 0),

    -- Non-empty Message Constraint
    CONSTRAINT notifications_message_not_empty_check 
        CHECK (length(trim(message)) > 0),

    -- Non-empty Notification Type Constraint
    CONSTRAINT notifications_type_not_empty_check 
        CHECK (length(trim(notification_type)) > 0),

    -- Read State Consistency Constraint
    CONSTRAINT notifications_read_state_check 
        CHECK (
            (is_read = false AND read_at IS NULL) OR
            (is_read = true AND read_at IS NOT NULL)
        )
);

-- ----------------------------------------------------------------------------
-- 2. Indexes: public.notifications
-- ----------------------------------------------------------------------------
-- Query latest notifications for a user (Inbox listing with pagination)
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created
    ON public.notifications (recipient_user_id, created_at DESC);

-- Query unread notifications and calculate unread counts quickly
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread
    ON public.notifications (recipient_user_id, is_read, created_at DESC);

-- General chronological index
CREATE INDEX IF NOT EXISTS idx_notifications_created_at
    ON public.notifications (created_at DESC);

-- ----------------------------------------------------------------------------
-- 3. Row Level Security (RLS)
-- ----------------------------------------------------------------------------
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Revoke all direct permissions from public/anon
REVOKE ALL ON public.notifications FROM PUBLIC;
REVOKE ALL ON public.notifications FROM anon;

-- Grant SELECT to authenticated users (evaluated through RLS)
GRANT SELECT ON public.notifications TO authenticated;

-- Policy: Authenticated users can only read their own notifications
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
CREATE POLICY "notifications_select_own" ON public.notifications
    FOR SELECT
    TO authenticated
    USING (recipient_user_id = auth.uid());

-- Note on INSERT, UPDATE, DELETE:
-- No direct INSERT, UPDATE, or DELETE policies are granted to authenticated users.
-- All mutations are strictly managed through atomic SECURITY DEFINER RPC functions
-- or trusted backend database events.

-- ----------------------------------------------------------------------------
-- 4. RPC: mark_notification_read
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_updated_rows INT;
BEGIN
    -- 1. Validate authenticated session
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Otentikasi diperlukan untuk menandai notifikasi.'
            USING ERRCODE = '42501';
    END IF;

    IF p_notification_id IS NULL THEN
        RAISE EXCEPTION 'ID notifikasi wajib disertakan.'
            USING ERRCODE = '22023';
    END IF;

    -- 2. Atomically mark notification as read strictly for caller
    UPDATE public.notifications
    SET 
        is_read = true,
        read_at = now()
    WHERE 
        id = p_notification_id
        AND recipient_user_id = v_caller_id
        AND is_read = false;

    GET DIAGNOSTICS v_updated_rows = ROW_COUNT;

    RETURN (v_updated_rows > 0);
END;
$$;

-- ----------------------------------------------------------------------------
-- 5. RPC: mark_all_notifications_read
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_updated_count INT;
BEGIN
    -- 1. Validate authenticated session
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RAISE EXCEPTION 'Otentikasi diperlukan untuk menandai notifikasi.'
            USING ERRCODE = '42501';
    END IF;

    -- 2. Atomically mark all unread notifications as read for caller
    UPDATE public.notifications
    SET 
        is_read = true,
        read_at = now()
    WHERE 
        recipient_user_id = v_caller_id
        AND is_read = false;

    GET DIAGNOSTICS v_updated_count = ROW_COUNT;

    RETURN v_updated_count;
END;
$$;

-- ----------------------------------------------------------------------------
-- 6. RPC: get_unread_notification_count
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_unread_notification_count()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_caller_id UUID;
    v_unread_count INT;
BEGIN
    -- 1. Validate authenticated session
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RETURN 0;
    END IF;

    -- 2. Count unread notifications strictly for caller
    SELECT COUNT(*)::INT
    INTO v_unread_count
    FROM public.notifications
    WHERE 
        recipient_user_id = v_caller_id
        AND is_read = false;

    RETURN COALESCE(v_unread_count, 0);
END;
$$;

-- ----------------------------------------------------------------------------
-- 7. Security & Grants Configuration
-- ----------------------------------------------------------------------------
-- Revoke execution from PUBLIC and anon
REVOKE ALL ON FUNCTION public.mark_notification_read(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_notification_read(UUID) FROM anon;

REVOKE ALL ON FUNCTION public.mark_all_notifications_read() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_all_notifications_read() FROM anon;

REVOKE ALL ON FUNCTION public.get_unread_notification_count() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_unread_notification_count() FROM anon;

-- Grant execution strictly to authenticated users
GRANT EXECUTE ON FUNCTION public.mark_notification_read(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_unread_notification_count() TO authenticated;

-- Migration 019 completed.
