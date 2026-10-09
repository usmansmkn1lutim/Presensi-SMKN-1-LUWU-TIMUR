-- ============================================================================
-- Migration: 025_attendance_selfie_support.sql
-- Module: PHASE 1 — ATTENDANCE SELFIE SCHEMA EXTENSION
-- Description:
--   Adds optional, additive storage path columns to public.attendance to store
--   private bucket references for check-in and check-out selfie captures.
--   Strictly additive:
--     - check_in_photo_path TEXT NULL
--     - check_out_photo_path TEXT NULL
--   Does NOT modify existing constraints, indexes, RLS policies, RPCs, or triggers.
-- ============================================================================

-- Add check-in selfie storage path column
ALTER TABLE public.attendance
    ADD COLUMN IF NOT EXISTS check_in_photo_path TEXT NULL;

-- Add check-out selfie storage path column
ALTER TABLE public.attendance
    ADD COLUMN IF NOT EXISTS check_out_photo_path TEXT NULL;

-- Comment on columns for clear documentation
COMMENT ON COLUMN public.attendance.check_in_photo_path IS 'Relative storage object path in private attendance-selfies bucket for check-in photo';
COMMENT ON COLUMN public.attendance.check_out_photo_path IS 'Relative storage object path in private attendance-selfies bucket for check-out photo';
